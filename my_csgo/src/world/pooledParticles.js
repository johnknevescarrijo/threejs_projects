import * as THREE from 'three';
import { computeSurfaceHeight } from './surfaceHeight.js';

const _TMP_POS = new THREE.Vector3();
const _TMP_EULER = new THREE.Euler();
const _TMP_QUAT = new THREE.Quaternion();
const _TMP_SCALE = new THREE.Vector3(1, 1, 1);
const _TMP_MAT4 = new THREE.Matrix4();
const _TMP_COLOR = new THREE.Color();

export class PooledParticleSystem {
  constructor(scene, map = null) {
    this.scene = scene;
    this.map = map;

    // Shared procedural textures (created once)
    this.bloodTexture = this._createCircleTexture('#dc2626');
    this.sparkTexture = this._createSparkTexture();
    this.dustTexture = this._createSmokeTexture();

    // 1. Pre-allocated Point Pools (1 draw call per category, zero gunfight allocations)
    this.sparksMat = new THREE.PointsMaterial({
      color: 0xffe680,
      size: 0.14,
      map: this.sparkTexture,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sparksPool = this._createPointPool(256, this.sparksMat, -14);

    this.bloodMat = new THREE.PointsMaterial({
      color: 0x991b1b,
      size: 0.19,
      map: this.bloodTexture,
      transparent: true,
      opacity: 0.88,
      depthWrite: false
    });
    this.bloodPool = this._createPointPool(256, this.bloodMat, -15);

    this.dustMat = new THREE.PointsMaterial({
      color: 0xecd9c6,
      size: 0.35,
      map: this.dustTexture,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    this.dustPool = this._createPointPool(128, this.dustMat, -1.5);

    // 2. Pre-allocated Bullet Tracers (single LineSegments draw call, max 32)
    this.maxTracers = 32;
    this.activeTracers = 0;
    this.tracerCursor = 0;
    this.tracerPositions = new Float32Array(this.maxTracers * 2 * 3);
    this.tracerData = Array.from({ length: this.maxTracers }, () => ({
      fromX: 0,
      fromY: 0,
      fromZ: 0,
      toX: 0,
      toY: 0,
      toZ: 0,
      progress: 0,
      speed: 4.8
    }));
    this.tracerGeo = new THREE.BufferGeometry();
    this.tracerPosAttr = new THREE.BufferAttribute(this.tracerPositions, 3);
    this.tracerPosAttr.setUsage(THREE.DynamicDrawUsage);
    this.tracerGeo.setAttribute('position', this.tracerPosAttr);
    this.tracerGeo.setDrawRange(0, 0);
    this.tracerMat = new THREE.LineBasicMaterial({
      color: 0xfff5aa,
      transparent: true,
      opacity: 0.9
    });
    this.tracerMesh = new THREE.LineSegments(this.tracerGeo, this.tracerMat);
    this.tracerMesh.frustumCulled = false;
    this.scene.add(this.tracerMesh);

    // 3. Pre-allocated Physical Casings (single InstancedMesh draw call, max 64)
    this.maxCasings = 64;
    this.activeCasings = 0;
    this.casingCursor = 0;
    this.casingGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.024, 6);
    this.casingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.25
    });
    this.casingMesh = new THREE.InstancedMesh(this.casingGeo, this.casingMat, this.maxCasings);
    this.casingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.casingMesh.frustumCulled = false;
    this.casingMesh.castShadow = false;

    _TMP_COLOR.setHex(0xe5a93c);
    for (let i = 0; i < this.maxCasings; i++) {
      this.casingMesh.setColorAt(i, _TMP_COLOR);
      this.casingMesh.setMatrixAt(i, _TMP_MAT4);
    }
    this.casingMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.casingMesh.instanceColor.needsUpdate = true;
    this.casingMesh.instanceMatrix.needsUpdate = true;
    this.casingMesh.count = 0;
    this.scene.add(this.casingMesh);

    this.casingData = Array.from({ length: this.maxCasings }, () => ({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      rvx: 0,
      rvy: 0,
      rvz: 0,
      life: 0,
      bounced: 0,
      colorHex: 0xe5a93c
    }));

    // 4. Ambient floating desert dust motes (1 draw call)
    this._initAmbientDust();
  }

  _createPointPool(capacity, material, gravity) {
    const positions = new Float32Array(capacity * 3);
    const velocities = new Float32Array(capacity * 3);
    const lives = new Float32Array(capacity);

    const geometry = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', posAttr);
    geometry.setDrawRange(0, 0);

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.scene.add(points);

    return {
      capacity,
      activeCount: 0,
      overwriteCursor: 0,
      gravity,
      positions,
      velocities,
      lives,
      posAttr,
      geometry,
      points
    };
  }

  _spawnPoint(pool, x, y, z, vx, vy, vz, life) {
    let idx;
    if (pool.activeCount < pool.capacity) {
      idx = pool.activeCount++;
    } else {
      idx = pool.overwriteCursor;
      pool.overwriteCursor = (pool.overwriteCursor + 1) % pool.capacity;
    }

    const i3 = idx * 3;
    pool.positions[i3] = x;
    pool.positions[i3 + 1] = y;
    pool.positions[i3 + 2] = z;
    pool.velocities[i3] = vx;
    pool.velocities[i3 + 1] = vy;
    pool.velocities[i3 + 2] = vz;
    pool.lives[idx] = life;
  }

  _commitPointPool(pool) {
    pool.geometry.setDrawRange(0, pool.activeCount);
    pool.posAttr.needsUpdate = true;
  }

  _updatePointPool(pool, delta) {
    if (pool.activeCount === 0) return;

    const { positions, velocities, lives, gravity } = pool;
    for (let i = pool.activeCount - 1; i >= 0; i--) {
      lives[i] -= delta;
      if (lives[i] <= 0) {
        const last = pool.activeCount - 1;
        if (i !== last) {
          const i3 = i * 3;
          const l3 = last * 3;
          positions[i3] = positions[l3];
          positions[i3 + 1] = positions[l3 + 1];
          positions[i3 + 2] = positions[l3 + 2];
          velocities[i3] = velocities[l3];
          velocities[i3 + 1] = velocities[l3 + 1];
          velocities[i3 + 2] = velocities[l3 + 2];
          lives[i] = lives[last];
        }
        pool.activeCount--;
        continue;
      }

      const i3 = i * 3;
      velocities[i3 + 1] += gravity * delta;
      positions[i3] += velocities[i3] * delta;
      positions[i3 + 1] += velocities[i3 + 1] * delta;
      positions[i3 + 2] += velocities[i3 + 2] * delta;
    }

    this._commitPointPool(pool);
  }

  createShellEject(position, rightDir, upDir, forwardDir, isPistol = false, colorHex = 0xe5a93c) {
    let idx;
    if (this.activeCasings < this.maxCasings) {
      idx = this.activeCasings++;
    } else {
      idx = this.casingCursor;
      this.casingCursor = (this.casingCursor + 1) % this.maxCasings;
    }

    const c = this.casingData[idx];
    const speed = isPistol ? 2.2 : 2.8;
    const rightMag = speed + (Math.random() - 0.5) * 0.4;
    const upMag = 1.4 + Math.random() * 0.6;
    const fwdMag = -0.4 + (Math.random() - 0.5) * 0.3;

    c.x = position.x;
    c.y = position.y;
    c.z = position.z;
    c.vx = rightDir.x * rightMag + upDir.x * upMag + forwardDir.x * fwdMag;
    c.vy = rightDir.y * rightMag + upDir.y * upMag + forwardDir.y * fwdMag;
    c.vz = rightDir.z * rightMag + upDir.z * upMag + forwardDir.z * fwdMag;
    c.rx = Math.random() * Math.PI;
    c.ry = Math.random() * Math.PI;
    c.rz = Math.random() * Math.PI;
    c.rvx = (Math.random() - 0.5) * 25;
    c.rvy = (Math.random() - 0.5) * 25;
    c.rvz = (Math.random() - 0.5) * 25;
    c.life = 1.8;
    c.bounced = 0;
    c.colorHex = colorHex ?? 0xe5a93c;

    _TMP_POS.set(c.x, c.y, c.z);
    _TMP_EULER.set(c.rx, c.ry, c.rz);
    _TMP_QUAT.setFromEuler(_TMP_EULER);
    _TMP_MAT4.compose(_TMP_POS, _TMP_QUAT, _TMP_SCALE);
    this.casingMesh.setMatrixAt(idx, _TMP_MAT4);

    _TMP_COLOR.setHex(c.colorHex);
    this.casingMesh.setColorAt(idx, _TMP_COLOR);
    this.casingMesh.count = this.activeCasings;
    this.casingMesh.instanceMatrix.needsUpdate = true;
    if (this.casingMesh.instanceColor) {
      this.casingMesh.instanceColor.needsUpdate = true;
    }
  }

  createSparks(position, normal, count = 14) {
    const spread = 0.9;
    for (let i = 0; i < count; i++) {
      const speed = 3.5 + Math.random() * 5.5;
      const vx = (normal.x + (Math.random() - 0.5) * spread) * speed;
      const vy = (normal.y + (Math.random() - 0.5) * spread + 0.4) * speed;
      const vz = (normal.z + (Math.random() - 0.5) * spread) * speed;
      this._spawnPoint(this.sparksPool, position.x, position.y, position.z, vx, vy, vz, 0.28);
    }
    this._commitPointPool(this.sparksPool);

    // Also spawn a small puff of dust/smoke
    this.createSmokePuff(position, normal);
  }

  createSmokePuff(position, normal, count = 6) {
    for (let i = 0; i < count; i++) {
      const px = position.x + (Math.random() - 0.5) * 0.05;
      const py = position.y + (Math.random() - 0.5) * 0.05;
      const pz = position.z + (Math.random() - 0.5) * 0.05;
      const vx = normal.x * 0.8 + (Math.random() - 0.5) * 0.6;
      const vy = normal.y * 0.8 + Math.random() * 0.5;
      const vz = normal.z * 0.8 + (Math.random() - 0.5) * 0.6;
      this._spawnPoint(this.dustPool, px, py, pz, vx, vy, vz, 0.45);
    }
    this._commitPointPool(this.dustPool);
  }

  createBlood(position, normal, count = 18) {
    const spread = 1.1;
    for (let i = 0; i < count; i++) {
      const speed = 2.2 + Math.random() * 3.5;
      const vx = (normal.x * 0.5 + (Math.random() - 0.5) * spread) * speed;
      const vy = (normal.y * 0.5 + (Math.random() - 0.5) * spread + 0.4) * speed;
      const vz = (normal.z * 0.5 + (Math.random() - 0.5) * spread) * speed;
      this._spawnPoint(this.bloodPool, position.x, position.y, position.z, vx, vy, vz, 0.42);
    }
    this._commitPointPool(this.bloodPool);
  }

  createTracer(fromPos, toPos) {
    let idx;
    if (this.activeTracers < this.maxTracers) {
      idx = this.activeTracers++;
    } else {
      idx = this.tracerCursor;
      this.tracerCursor = (this.tracerCursor + 1) % this.maxTracers;
    }

    const t = this.tracerData[idx];
    t.fromX = fromPos.x;
    t.fromY = fromPos.y;
    t.fromZ = fromPos.z;
    t.toX = toPos.x;
    t.toY = toPos.y;
    t.toZ = toPos.z;
    t.progress = 0;
    t.speed = 4.8;

    const i6 = idx * 6;
    this.tracerPositions[i6] = t.fromX;
    this.tracerPositions[i6 + 1] = t.fromY;
    this.tracerPositions[i6 + 2] = t.fromZ;
    this.tracerPositions[i6 + 3] = t.fromX + (t.toX - t.fromX) * 0.2;
    this.tracerPositions[i6 + 4] = t.fromY + (t.toY - t.fromY) * 0.2;
    this.tracerPositions[i6 + 5] = t.fromZ + (t.toZ - t.fromZ) * 0.2;

    this.tracerGeo.setDrawRange(0, this.activeTracers * 2);
    this.tracerPosAttr.needsUpdate = true;
  }

  update(delta) {
    // 1. Pooled point particles
    this._updatePointPool(this.sparksPool, delta);
    this._updatePointPool(this.bloodPool, delta);
    this._updatePointPool(this.dustPool, delta);

    // 2. Pooled tracers (1 draw call)
    if (this.activeTracers > 0) {
      for (let i = this.activeTracers - 1; i >= 0; i--) {
        const t = this.tracerData[i];
        t.progress += t.speed * delta * 10;

        if (t.progress >= 1.0) {
          const last = this.activeTracers - 1;
          if (i !== last) {
            const tmp = this.tracerData[i];
            this.tracerData[i] = this.tracerData[last];
            this.tracerData[last] = tmp;
          }
          this.activeTracers--;
          continue;
        }

        const startP = Math.max(0, t.progress - 0.35);
        const endP = Math.min(1.0, t.progress);
        const dx = t.toX - t.fromX;
        const dy = t.toY - t.fromY;
        const dz = t.toZ - t.fromZ;

        const i6 = i * 6;
        this.tracerPositions[i6] = t.fromX + dx * startP;
        this.tracerPositions[i6 + 1] = t.fromY + dy * startP;
        this.tracerPositions[i6 + 2] = t.fromZ + dz * startP;
        this.tracerPositions[i6 + 3] = t.fromX + dx * endP;
        this.tracerPositions[i6 + 4] = t.fromY + dy * endP;
        this.tracerPositions[i6 + 5] = t.fromZ + dz * endP;
      }

      this.tracerGeo.setDrawRange(0, this.activeTracers * 2);
      this.tracerPosAttr.needsUpdate = true;
    }

    // 3. Instanced physical casings bouncing on real ramp/deck/floor height
    if (this.activeCasings > 0) {
      let colorDirty = false;
      for (let i = this.activeCasings - 1; i >= 0; i--) {
        const c = this.casingData[i];
        c.life -= delta;

        if (c.life <= 0) {
          const last = this.activeCasings - 1;
          if (i !== last) {
            const tmp = this.casingData[i];
            this.casingData[i] = this.casingData[last];
            this.casingData[last] = tmp;
            _TMP_COLOR.setHex(this.casingData[i].colorHex);
            this.casingMesh.setColorAt(i, _TMP_COLOR);
            colorDirty = true;
          }
          this.activeCasings--;
          continue;
        }

        c.vy -= 18.0 * delta;
        c.x += c.vx * delta;
        c.y += c.vy * delta;
        c.z += c.vz * delta;

        c.rx += c.rvx * delta;
        c.ry += c.rvy * delta;
        c.rz += c.rvz * delta;

        const surfaceY = computeSurfaceHeight(c.x, c.z, this.map, c.y, 0.25) + 0.02;
        if (c.y <= surfaceY && c.bounced < 2) {
          c.y = surfaceY;
          c.vy = -c.vy * 0.4;
          c.vx *= 0.6;
          c.vz *= 0.6;
          c.rvx *= 0.5;
          c.rvy *= 0.5;
          c.rvz *= 0.5;
          c.bounced++;
        } else if (c.y < surfaceY) {
          c.y = surfaceY;
          c.vy = 0;
          c.vx *= 0.85;
          c.vz *= 0.85;
        }

        _TMP_POS.set(c.x, c.y, c.z);
        _TMP_EULER.set(c.rx, c.ry, c.rz);
        _TMP_QUAT.setFromEuler(_TMP_EULER);
        _TMP_MAT4.compose(_TMP_POS, _TMP_QUAT, _TMP_SCALE);
        this.casingMesh.setMatrixAt(i, _TMP_MAT4);
      }

      this.casingMesh.count = this.activeCasings;
      this.casingMesh.instanceMatrix.needsUpdate = true;
      if (colorDirty && this.casingMesh.instanceColor) {
        this.casingMesh.instanceColor.needsUpdate = true;
      }
    }

    // 4. Ambient atmospheric dust motes
    if (this.ambientDustMesh) {
      this.ambientTime += delta;
      const posAttr = this.ambientDustGeo.attributes.position;
      const arr = posAttr.array;

      for (let i = 0; i < this.ambientDustData.length; i++) {
        const d = this.ambientDustData[i];

        arr[i * 3] += (d.speedX + Math.sin(this.ambientTime * d.freq + d.phase) * 0.08) * delta;
        arr[i * 3 + 1] = d.origY + Math.sin(this.ambientTime * d.freq * 0.7 + d.phase) * d.ampY;
        arr[i * 3 + 2] += (d.speedZ + Math.cos(this.ambientTime * d.freq + d.phase) * 0.08) * delta;

        if (arr[i * 3] > 34) arr[i * 3] = -34;
        else if (arr[i * 3] < -34) arr[i * 3] = 34;

        if (arr[i * 3 + 2] > 34) arr[i * 3 + 2] = -34;
        else if (arr[i * 3 + 2] < -34) arr[i * 3 + 2] = 34;
      }

      posAttr.needsUpdate = true;
    }
  }

  getPoolStats() {
    return {
      sparks: { active: this.sparksPool.activeCount, capacity: this.sparksPool.capacity },
      blood: { active: this.bloodPool.activeCount, capacity: this.bloodPool.capacity },
      dust: { active: this.dustPool.activeCount, capacity: this.dustPool.capacity },
      tracers: { active: this.activeTracers, capacity: this.maxTracers },
      casings: { active: this.activeCasings, capacity: this.maxCasings },
      ambientDust: this.ambientDustData.length
    };
  }

  _createCircleTexture(colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, colorHex);
    grad.addColorStop(0.6, colorHex);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  _createSparkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#ffea75');
    grad.addColorStop(0.7, '#ff9900');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  _createSmokeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(230, 215, 195, 0.65)');
    grad.addColorStop(0.4, 'rgba(200, 180, 160, 0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  _initAmbientDust(count = 240) {
    this.ambientDustGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.ambientDustData = [];

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 68;
      const y = 0.3 + Math.random() * 5.5;
      const z = (Math.random() - 0.5) * 68;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.ambientDustData.push({
        origY: y,
        speedX: 0.12 + Math.random() * 0.22,
        speedZ: 0.08 + Math.random() * 0.16,
        phase: Math.random() * Math.PI * 2,
        freq: 0.8 + Math.random() * 1.2,
        ampY: 0.12 + Math.random() * 0.24
      });
    }

    this.ambientDustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.ambientDustMat = new THREE.PointsMaterial({
      color: 0xfde68a,
      size: 0.16,
      map: this.dustTexture,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.ambientDustMesh = new THREE.Points(this.ambientDustGeo, this.ambientDustMat);
    this.scene.add(this.ambientDustMesh);
    this.ambientTime = 0;
  }
}
