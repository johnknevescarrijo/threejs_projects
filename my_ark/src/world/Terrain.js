import * as THREE from 'three';
import { createToonWaterMaterial, createOutlineMaterial } from '../shaders/CelShading.js';
import { BiomeManager } from './BiomeManager.js';

// Self-contained fast 2D Noise Generator (Permutation-based Simplex-like Noise)
class FastNoise {
  constructor(seed = 42) {
    this.p = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    
    // Seeded shuffle
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const temp = perm[i];
      perm[i] = perm[j];
      perm[j] = temp;
    }

    for (let i = 0; i < 512; i++) {
      this.p[i] = perm[i & 255];
    }
  }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.p[this.p[X] + Y];
    const ab = this.p[this.p[X] + Y + 1];
    const ba = this.p[this.p[X + 1] + Y];
    const bb = this.p[this.p[X + 1] + Y + 1];

    const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
    const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));
    return this.lerp(v, x1, x2);
  }

  fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }
}

export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.biomeManager = new BiomeManager();
    this.noise = new FastNoise(1337);

    // Island configuration
    this.size = 360; // Island diameter in units
    this.segments = 160;
    this.islandRadius = 140;

    this.mesh = null;
    this.waterMesh = null;
    this.waterMaterial = null;

    this.initTerrain();
    this.initWater();
  }

  // Calculate raw terrain elevation at world coordinates (x, z)
  getHeight(x, z) {
    const distFromCenter = Math.sqrt(x * x + z * z);
    
    // Island mask: falloff curve outside radius
    if (distFromCenter > this.islandRadius + 30) {
      return -8.0;
    }

    const normDist = distFromCenter / this.islandRadius;
    let mask = 1.0 - Math.pow(normDist, 2.2);
    mask = Math.max(0.0, mask);

    // Multi-layered octave noise for organic hills, plateaus, and jagged peaks
    const baseNoise = this.noise.fbm(x * 0.008, z * 0.008, 4, 0.55, 2.0);
    const detailNoise = this.noise.fbm(x * 0.03, z * 0.03, 3, 0.45, 2.1) * 0.35;
    const highlandRidge = Math.pow(Math.max(0, this.noise.noise2D(x * 0.015 + 10, z * 0.015 - 10)), 2.0) * 18.0;

    let height = (baseNoise * 26.0 + detailNoise * 8.0 + highlandRidge) * mask;

    // Stepped terraces for comic cel-shaded styling
    if (height > 1.5) {
      height += Math.sin(height * 0.8) * 0.4;
    } else {
      // Beach gentle slope
      height = Math.max(-6.0, height * 0.7);
    }

    return height;
  }

  getNormal(x, z) {
    const eps = 0.5;
    const hL = this.getHeight(x - eps, z);
    const hR = this.getHeight(x + eps, z);
    const hD = this.getHeight(x, z - eps);
    const hU = this.getHeight(x, z + eps);
    const normal = new THREE.Vector3(hL - hR, 2.0 * eps, hD - hU).normalize();
    return normal;
  }

  initTerrain() {
    const geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const count = positions.count;
    const colors = new Float32Array(count * 3);

    const colorCoast = new THREE.Color(0xd4ab65);
    const colorJungle = new THREE.Color(0x2d8033);
    const colorPlains = new THREE.Color(0x9caa38);
    const colorHighlands = new THREE.Color(0x4c5b6a);
    const colorPeak = new THREE.Color(0x8291a0);

    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = this.getHeight(x, z);
      positions.setY(i, y);

      // Biome-based stepped vertex coloring
      const biome = this.biomeManager.getBiomeAt(x, z, y);
      
      if (y < 2.5) {
        tempColor.copy(colorCoast);
      } else if (y > 18.0) {
        tempColor.copy(colorPeak);
      } else if (biome.id === 'highlands') {
        tempColor.copy(colorHighlands);
      } else if (biome.id === 'jungle') {
        tempColor.copy(colorJungle);
      } else {
        tempColor.copy(colorPlains);
      }

      // Add subtle comic faceted contrast
      const tint = (this.noise.noise2D(x * 0.1, z * 0.1) + 1.0) * 0.08;
      tempColor.r = Math.min(1.0, tempColor.r + tint);
      tempColor.g = Math.min(1.0, tempColor.g + tint);
      tempColor.b = Math.min(1.0, tempColor.b + tint);

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.85,
      metalness: 0.05
    });

    this.mesh = new THREE.Mesh(geometry, terrainMaterial);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.scene.add(this.mesh);

    // Terrain outline mesh for stylized ink edge silhouettes
    const outlineMat = createOutlineMaterial(0.045, 0x050608);
    const terrainOutline = new THREE.Mesh(geometry, outlineMat);
    this.mesh.add(terrainOutline);
  }

  initWater() {
    const waterGeom = new THREE.PlaneGeometry(this.size * 1.6, this.size * 1.6, 96, 96);
    waterGeom.rotateX(-Math.PI / 2);
    
    this.waterMaterial = createToonWaterMaterial();
    this.waterMesh = new THREE.Mesh(waterGeom, this.waterMaterial);
    this.waterMesh.position.y = 0.0;
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);
  }

  update(delta) {
    if (this.waterMaterial && this.waterMaterial.uniforms) {
      this.waterMaterial.uniforms.uTime.value += delta;
    }
  }
}
