import * as THREE from 'three';
import {
  PRESET_ORDER,
  getGraphicsPreset,
  heightMapToNormalRGBA,
  computeBakedVertexAO,
  computeFocusedShadowBox,
  detectRenderCapabilities
} from './graphicsConfig.js';

export class GraphicsPipeline {
  constructor(renderer, scene, viewmodelScene = null, initialPresetId = 'low') {
    this.renderer = renderer;
    this.scene = scene;
    this.viewmodelScene = viewmodelScene;

    this.preset = getGraphicsPreset(initialPresetId);
    this.presetId = this.preset.id;
    this.capabilities = detectRenderCapabilities(typeof navigator !== 'undefined' ? navigator : null);

    if (this.renderer?.info) {
      this.renderer.info.autoReset = false;
    }

    this._pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    if (typeof this._pmremGenerator.compileEquirectangularShader === 'function') {
      this._pmremGenerator.compileEquirectangularShader();
    }

    this._envRT = null;
    this._currentTheme = null;
    this._smoothedFps = this.preset.targetFps;
    this._smoothedMs = 1000 / this.preset.targetFps;
  }

  getMaxAnisotropy() {
    return this.renderer?.capabilities?.getMaxAnisotropy?.() || 1;
  }

  setEnvironmentTheme(theme = 'desert') {
    if (this._currentTheme === theme && this._envRT) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    if (theme === 'pool') {
      grad.addColorStop(0.0, '#e0f2fe');
      grad.addColorStop(0.38, '#bae6fd');
      grad.addColorStop(0.5, '#e2e8f0');
      grad.addColorStop(0.56, '#38bdf8');
      grad.addColorStop(1.0, '#0369a1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 128);

      // Overhead skylight panels for crisp specular highlights on tiles/weapons
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(42, 14, 48, 16);
      ctx.fillRect(156, 14, 48, 16);
    } else {
      grad.addColorStop(0.0, '#2d6aa3');
      grad.addColorStop(0.34, '#79bce8');
      grad.addColorStop(0.49, '#f3ddbf');
      grad.addColorStop(0.52, '#cca472');
      grad.addColorStop(0.75, '#a17b50');
      grad.addColorStop(1.0, '#6b4f32');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 128);

      // Sun disc glow
      const sunGrad = ctx.createRadialGradient(184, 34, 2, 184, 34, 32);
      sunGrad.addColorStop(0.0, 'rgba(255, 250, 224, 1.0)');
      sunGrad.addColorStop(0.35, 'rgba(255, 232, 175, 0.55)');
      sunGrad.addColorStop(1.0, 'rgba(255, 220, 150, 0.0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(148, 0, 72, 72);
    }

    const eqTex = new THREE.CanvasTexture(canvas);
    eqTex.mapping = THREE.EquirectangularReflectionMapping;
    eqTex.colorSpace = THREE.SRGBColorSpace;

    const nextRT = this._pmremGenerator.fromEquirectangular(eqTex);
    eqTex.dispose();

    if (this._envRT) {
      this._envRT.dispose();
    }
    this._envRT = nextRT;
    this._currentTheme = theme;

    if (this.scene) {
      this.scene.environment = nextRT.texture;
    }
    if (this.viewmodelScene) {
      this.viewmodelScene.environment = nextRT.texture;
    }
  }

  createNormalTextureFromCanvas(canvas, strength = 2.0, anisotropy = null) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, w, h).data;
    const lum = new Uint8Array(w * h);

    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      lum[i] = Math.round(0.299 * imgData[o] + 0.587 * imgData[o + 1] + 0.114 * imgData[o + 2]);
    }

    const rgba = heightMapToNormalRGBA(lum, w, h, strength);
    const tex = new THREE.DataTexture(rgba, w, h, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = Math.min(this.getMaxAnisotropy(), anisotropy ?? this.preset.anisotropy);
    tex.needsUpdate = true;
    return tex;
  }

  createRoughnessTextureFromCanvas(canvas, minRoughness = 0.58, maxRoughness = 0.94, anisotropy = null) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, w, h).data;
    const rgba = new Uint8ClampedArray(w * h * 4);
    const span = maxRoughness - minRoughness;

    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const lum = (0.299 * imgData[o] + 0.587 * imgData[o + 1] + 0.114 * imgData[o + 2]) / 255;
      const rough = maxRoughness - lum * span;
      const val = Math.round(Math.max(0, Math.min(1, rough)) * 255);
      rgba[o] = val;
      rgba[o + 1] = val;
      rgba[o + 2] = val;
      rgba[o + 3] = 255;
    }

    const tex = new THREE.DataTexture(rgba, w, h, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = Math.min(this.getMaxAnisotropy(), anisotropy ?? this.preset.anisotropy);
    tex.needsUpdate = true;
    return tex;
  }

  applyBakedAO(geometry, options = {}) {
    const posAttr = geometry?.attributes?.position;
    if (!posAttr) return geometry;
    const normAttr = geometry.attributes.normal;
    const colors = computeBakedVertexAO(posAttr.array, normAttr ? normAttr.array : null, options);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }

  updateFocusedShadow(sunLight, playerPos) {
    if (!sunLight || !playerPos) return;
    const sunOffset = sunLight.userData?.sunOffset || { x: 42, y: 68, z: -28 };
    const box = computeFocusedShadowBox(
      playerPos,
      sunOffset,
      this.preset.shadowFrustumRadius,
      this.preset.shadowMapSize
    );

    if (sunLight.target) {
      sunLight.target.position.set(box.targetX, 0, box.targetZ);
      sunLight.target.updateMatrixWorld();
    }
    sunLight.position.set(box.lightX, box.lightY, box.lightZ);
  }

  applyPreset(presetId, map = null) {
    const preset = getGraphicsPreset(presetId);
    this.presetId = preset.id;
    this.preset = preset;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    if (this.renderer) {
      this.renderer.setPixelRatio(Math.min(dpr, preset.pixelRatioCap));
      this.renderer.toneMappingExposure = preset.exposure;
    }

    const targetAniso = Math.min(this.getMaxAnisotropy(), preset.anisotropy);

    if (map) {
      if (map.sunLight?.shadow) {
        const shadow = map.sunLight.shadow;
        const r = preset.shadowFrustumRadius;
        if (shadow.camera) {
          shadow.camera.left = -r;
          shadow.camera.right = r;
          shadow.camera.top = r;
          shadow.camera.bottom = -r;
          shadow.camera.updateProjectionMatrix();
        }
        if (shadow.mapSize.x !== preset.shadowMapSize || shadow.mapSize.y !== preset.shadowMapSize) {
          shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
          if (shadow.map) {
            shadow.map.dispose();
            shadow.map = null;
          }
        }
      }

      if (map.mats) {
        for (const mat of Object.values(map.mats)) {
          if (mat && mat.isMeshStandardMaterial) {
            mat.envMapIntensity = preset.envMapIntensity;
          }
        }
      }

      for (const prop of Object.values(map)) {
        if (prop && prop.isTexture) {
          prop.anisotropy = targetAniso;
          prop.needsUpdate = true;
        }
      }
    }

    if (this.viewmodelScene) {
      this.viewmodelScene.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (m && m.isMeshStandardMaterial) {
              m.envMapIntensity = preset.envMapIntensity;
            }
          }
        }
      });
    }

    return preset;
  }

  cyclePreset(map = null) {
    const idx = PRESET_ORDER.indexOf(this.presetId);
    const nextId = PRESET_ORDER[(idx + 1) % PRESET_ORDER.length];
    return this.applyPreset(nextId, map);
  }

  beginFrame() {
    if (this.renderer?.info && !this.renderer.info.autoReset) {
      this.renderer.info.reset();
    }
  }

  sampleTelemetry(delta) {
    const safeDelta = Math.max(0.0005, Math.min(0.5, Number(delta) || 1 / 60));
    const instFps = 1 / safeDelta;
    const alpha = 1 - Math.exp(-safeDelta * 6);
    this._smoothedFps += (instFps - this._smoothedFps) * alpha;
    this._smoothedMs += (safeDelta * 1000 - this._smoothedMs) * alpha;

    const render = this.renderer?.info?.render || {};
    const memory = this.renderer?.info?.memory || {};

    return {
      fps: Math.round(this._smoothedFps),
      frameMs: this._smoothedMs,
      drawCalls: render.calls ?? 0,
      triangles: render.triangles ?? 0,
      textures: memory.textures ?? 0,
      geometries: memory.geometries ?? 0,
      presetId: this.preset.id,
      presetLabel: this.preset.label,
      drawCallBudget: this.preset.drawCallBudget,
      targetFps: this.preset.targetFps,
      backendLabel: this.capabilities.backendLabel
    };
  }

  dispose() {
    if (this._envRT) {
      this._envRT.dispose();
      this._envRT = null;
    }
    if (this._pmremGenerator) {
      this._pmremGenerator.dispose();
    }
  }
}
