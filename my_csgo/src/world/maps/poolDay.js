import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NavGraph } from '../../ai/navigation.js';
import {
  POOLDAY_BLUEPRINT,
  getBlueprintGroundHeight,
  getBlueprintZoneName,
  getBlueprintBombsite
} from './mapBlueprints.js';

function createBoxPart(w, h, d, cx, cy, cz, rx = 0, ry = 0, rz = 0, uvScale = 0.45) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (nx > 0.5) {
      uv.setXY(i, (z + d * 0.5) * uvScale, (y + h * 0.5) * uvScale);
    } else if (ny > 0.5) {
      uv.setXY(i, (x + w * 0.5) * uvScale, (z + d * 0.5) * uvScale);
    } else {
      uv.setXY(i, (x + w * 0.5) * uvScale, (y + h * 0.5) * uvScale);
    }
  }
  uv.needsUpdate = true;
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  if (rz) geo.rotateZ(rz);
  geo.translate(cx, cy, cz);
  return geo;
}

export class PoolDayMap {
  constructor(scene, graphicsPipeline = null) {
    this.scene = scene;
    this.graphicsPipeline = graphicsPipeline;
    this.theme = 'pool';
    this.blueprint = POOLDAY_BLUEPRINT;
    this.id = this.blueprint.id;
    this.name = this.blueprint.name;
    this.defaultMode = this.blueprint.defaultMode;
    this.spawns = this.blueprint.spawns;
    this.bombsites = this.blueprint.bombsites;

    this.colliders = [];
    this.raycastMeshes = [];
    this.navGraph = new NavGraph(this.blueprint.navNodes);
    this.waypoints = this.navGraph.nodes.map((n) => new THREE.Vector3(n.x, n.y, n.z));

    this._sceneObjects = [];
    this._disposables = [];
    this.sunLight = null;

    this._createTextures();
    this._createMaterials();
    this._buildLightingAndSky();
    this._buildPoolGeometry();
    this._buildPillarsAndProps();
  }

  getGroundHeight(x, z) {
    return getBlueprintGroundHeight(this.blueprint, x, z);
  }

  getZoneName(x, z) {
    return getBlueprintZoneName(this.blueprint, x, z);
  }

  getBombsiteAt(x, z) {
    return getBlueprintBombsite(this.blueprint, x, z);
  }

  _trackObject(obj) {
    this.scene.add(obj);
    this._sceneObjects.push(obj);
    return obj;
  }

  _trackDisposable(res) {
    this._disposables.push(res);
    return res;
  }

  _addColliderBox(minX, minY, minZ, maxX, maxY, maxZ) {
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(minX, minY, minZ),
        new THREE.Vector3(maxX, maxY, maxZ)
      )
    );
  }

  _createTextures() {
    // 1. Classic Pool Ceramic Tiles (White + Sky Blue mosaic)
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 256;
    tCanvas.height = 256;
    const tCtx = tCanvas.getContext('2d');
    tCtx.fillStyle = '#e0f2fe';
    tCtx.fillRect(0, 0, 256, 256);
    const cell = 32;
    for (let x = 0; x < 256; x += cell) {
      for (let y = 0; y < 256; y += cell) {
        const accent = ((x / cell + y / cell) % 4 === 0);
        tCtx.fillStyle = accent ? '#bae6fd' : '#f0f9ff';
        tCtx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      }
    }
    tCtx.strokeStyle = '#7dd3fc';
    tCtx.lineWidth = 2;
    for (let i = 0; i <= 256; i += cell) {
      tCtx.beginPath(); tCtx.moveTo(i, 0); tCtx.lineTo(i, 256); tCtx.stroke();
      tCtx.beginPath(); tCtx.moveTo(0, i); tCtx.lineTo(256, i); tCtx.stroke();
    }
    this.tileTex = this._trackDisposable(new THREE.CanvasTexture(tCanvas));
    this.tileTex.wrapS = THREE.RepeatWrapping;
    this.tileTex.wrapT = THREE.RepeatWrapping;
    this.tileTex.colorSpace = THREE.SRGBColorSpace;

    // 2. Locker Wall Tiles (Teal/Blue gradient tiles)
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 256;
    wCanvas.height = 256;
    const wCtx = wCanvas.getContext('2d');
    wCtx.fillStyle = '#bae6fd';
    wCtx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) {
      for (let y = 0; y < 256; y += 32) {
        wCtx.fillStyle = y < 128 ? '#38bdf8' : '#e2e8f0';
        wCtx.fillRect(x + 2, y + 2, 28, 28);
      }
    }
    this.wallTileTex = this._trackDisposable(new THREE.CanvasTexture(wCanvas));
    this.wallTileTex.wrapS = THREE.RepeatWrapping;
    this.wallTileTex.wrapT = THREE.RepeatWrapping;
    this.wallTileTex.colorSpace = THREE.SRGBColorSpace;

    if (this.graphicsPipeline) {
      const targetAniso = Math.min(
        this.graphicsPipeline.getMaxAnisotropy(),
        this.graphicsPipeline.preset.anisotropy
      );
      this.tileTex.anisotropy = targetAniso;
      this.wallTileTex.anisotropy = targetAniso;

      this.tileNormalTex = this._trackDisposable(
        this.graphicsPipeline.createNormalTextureFromCanvas(tCanvas, 2.0)
      );
      this.tileRoughTex = this._trackDisposable(
        this.graphicsPipeline.createRoughnessTextureFromCanvas(tCanvas, 0.28, 0.62)
      );
      this.wallTileNormalTex = this._trackDisposable(
        this.graphicsPipeline.createNormalTextureFromCanvas(wCanvas, 2.2)
      );
      this.wallTileRoughTex = this._trackDisposable(
        this.graphicsPipeline.createRoughnessTextureFromCanvas(wCanvas, 0.32, 0.68)
      );
    }
  }

  _createMaterials() {
    const hasPipeline = Boolean(this.graphicsPipeline);
    const envIntensity = this.graphicsPipeline?.preset?.envMapIntensity ?? 0.78;

    this.mats = {
      floor: this._trackDisposable(new THREE.MeshStandardMaterial({
        map: this.tileTex,
        normalMap: this.tileNormalTex || null,
        normalScale: new THREE.Vector2(0.75, 0.75),
        roughnessMap: this.tileRoughTex || null,
        roughness: this.tileRoughTex ? 1.0 : 0.45,
        metalness: 0.08,
        vertexColors: hasPipeline,
        envMapIntensity: envIntensity
      })),
      wall: this._trackDisposable(new THREE.MeshStandardMaterial({
        map: this.wallTileTex,
        normalMap: this.wallTileNormalTex || null,
        normalScale: new THREE.Vector2(0.8, 0.8),
        roughnessMap: this.wallTileRoughTex || null,
        roughness: this.wallTileRoughTex ? 1.0 : 0.5,
        metalness: 0.1,
        vertexColors: hasPipeline,
        envMapIntensity: envIntensity
      })),
      locker: this._trackDisposable(new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.55,
        metalness: 0.15,
        vertexColors: hasPipeline,
        envMapIntensity: envIntensity
      })),
      water: this._trackDisposable(new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide,
        envMapIntensity: envIntensity
      })),
      sky: this._trackDisposable(new THREE.MeshBasicMaterial({
        color: 0xbae6fd, side: THREE.BackSide
      }))
    };
  }

  _buildLightingAndSky() {
    this._prevFog = this.scene.fog;
    this.scene.fog = new THREE.FogExp2(0xdbeafe, 0.008);

    const skyGeo = this._trackDisposable(new THREE.SphereGeometry(140, 20, 14));
    this._trackObject(new THREE.Mesh(skyGeo, this.mats.sky));

    const hemi = new THREE.HemisphereLight(0xf0f9ff, 0x38bdf8, 1.15);
    this._trackObject(hemi);

    const shadowSize = this.graphicsPipeline?.preset?.shadowMapSize ?? 1024;
    const shadowRadius = this.graphicsPipeline?.preset?.shadowFrustumRadius ?? 28;
    const sunOffset = { x: 14, y: 34, z: -10 };

    const sun = new THREE.DirectionalLight(0xffffff, 1.35);
    sun.position.set(sunOffset.x, sunOffset.y, sunOffset.z);
    sun.userData.sunOffset = sunOffset;
    sun.castShadow = true;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 85;
    sun.shadow.camera.left = -shadowRadius;
    sun.shadow.camera.right = shadowRadius;
    sun.shadow.camera.top = shadowRadius;
    sun.shadow.camera.bottom = -shadowRadius;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.025;
    this._trackObject(sun);
    this._trackObject(sun.target);
    this.sunLight = sun;
  }

  _buildPoolGeometry() {
    const floorGeos = [];
    const wallGeos = [];
    const lockerGeos = [];

    const addDeck = (minX, maxX, minZ, maxZ, topY = 0, thickness = 0.8) => {
      const w = maxX - minX;
      const d = maxZ - minZ;
      floorGeos.push(createBoxPart(w, thickness, d, (minX + maxX) * 0.5, topY - thickness * 0.5, (minZ + maxZ) * 0.5));
    };

    const addWall = (minX, maxX, minY, maxY, minZ, maxZ, target = wallGeos) => {
      target.push(
        createBoxPart(
          maxX - minX,
          maxY - minY,
          maxZ - minZ,
          (minX + maxX) * 0.5,
          (minY + maxY) * 0.5,
          (minZ + maxZ) * 0.5
        )
      );
      this._addColliderBox(minX, minY, minZ, maxX, maxY, maxZ);
    };

    const addRamp = (minX, maxX, minZ, maxZ, startY, endY) => {
      const w = maxX - minX;
      const d = maxZ - minZ;
      const rise = endY - startY;
      const len = Math.hypot(w, rise);
      const angle = Math.atan2(rise, w);
      floorGeos.push(createBoxPart(len, 0.2, d, (minX + maxX) * 0.5, (startY + endY) * 0.5 - 0.1, (minZ + maxZ) * 0.5, 0, 0, angle));
    };

    // Pool Floor (-6..6, y=-0.8) + Surrounding Decks (y=0)
    addDeck(-6, 6, -6, 6, -0.8, 0.4);
    addDeck(-17, 17, -17, -6, 0, 0.8);
    addDeck(-17, 17, 6, 17, 0, 0.8);
    addDeck(-17, -6, -6, 6, 0, 0.8);
    addDeck(6, 17, -6, 6, 0, 0.8);

    // Pool Exit Ramps (West x:-8..-6 -> -0.8..0, East x:6..8 -> -0.8..0)
    addRamp(-8, -6, -2, 2, 0, -0.8);
    addRamp(6, 8, -2, 2, -0.8, 0);

    // Outer Perimeter Walls
    addWall(-17.5, 17.5, 0, 4.8, -17.5, -16.5); // North
    addWall(-17.5, 17.5, 0, 4.8, 16.5, 17.5);  // South
    addWall(-17.5, -16.5, 0, 4.8, -17.5, 17.5); // West
    addWall(16.5, 17.5, 0, 4.8, -17.5, 17.5);   // East

    // Locker Room Stalls / Dividers (CT North z:-16.5..-12, T South z:12..16.5)
    for (const sx of [-9, -3, 3, 9]) {
      addWall(sx - 0.25, sx + 0.25, 0, 2.4, -16.5, -13.0, lockerGeos);
      addWall(sx - 0.25, sx + 0.25, 0, 2.4, 13.0, 16.5, lockerGeos);
    }

    // Translucent Water Plane (y = -0.25)
    const waterGeo = this._trackDisposable(new THREE.PlaneGeometry(12, 12));
    const water = new THREE.Mesh(waterGeo, this.mats.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.25, 0);
    this._trackObject(water);

    const addBatch = (geos, mat, surfaceType, castShadow = true) => {
      if (geos.length === 0) return;
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (this.graphicsPipeline) {
        this.graphicsPipeline.applyBakedAO(merged, {
          roofBoxes: [],
          groundY: 0,
          bounceTint: [0.95, 0.98, 1.0]
        });
      }
      this._trackDisposable(merged);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.userData = { surfaceType };
      this._trackObject(mesh);
      this.raycastMeshes.push(mesh);
    };

    addBatch(floorGeos, this.mats.floor, 'floor', false);
    addBatch(wallGeos, this.mats.wall, 'wall', true);
    addBatch(lockerGeos, this.mats.locker, 'wall', true);
  }

  _buildPillarsAndProps() {
    // 4 Iconic Tiled Pool Pillars at (±8.5, ±8.5) via InstancedMesh
    const pillarGeo = this._trackDisposable(new THREE.BoxGeometry(1.6, 4.8, 1.6));
    if (this.graphicsPipeline) {
      this.graphicsPipeline.applyBakedAO(pillarGeo, {
        roofBoxes: [],
        groundY: -2.4,
        bounceTint: [0.95, 0.98, 1.0]
      });
    }
    const pillarCoords = [
      [-8.5, -8.5],
      [8.5, -8.5],
      [-8.5, 8.5],
      [8.5, 8.5]
    ];

    const pillarInst = new THREE.InstancedMesh(pillarGeo, this.mats.wall, pillarCoords.length);
    pillarInst.castShadow = true;
    pillarInst.receiveShadow = true;
    pillarInst.userData = { surfaceType: 'pillar' };

    const mat4 = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    pillarCoords.forEach(([px, pz], idx) => {
      pos.set(px, 2.4, pz);
      mat4.compose(pos, quat, scale);
      pillarInst.setMatrixAt(idx, mat4);
      this._addColliderBox(px - 0.8, 0, pz - 0.8, px + 0.8, 4.8, pz + 0.8);
    });
    pillarInst.instanceMatrix.needsUpdate = true;
    this._trackObject(pillarInst);
    this.raycastMeshes.push(pillarInst);
  }

  dispose() {
    if (this._prevFog !== undefined) {
      this.scene.fog = this._prevFog;
    }
    for (const obj of this._sceneObjects) {
      this.scene.remove(obj);
    }
    this._sceneObjects.length = 0;

    for (const res of this._disposables) {
      if (typeof res?.dispose === 'function') {
        res.dispose();
      }
    }
    this._disposables.length = 0;
    this.colliders.length = 0;
    this.raycastMeshes.length = 0;
  }
}
