import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.tracers = [];

    // Blood texture
    this.bloodTexture = this._createCircleTexture('#dc2626');
    // Spark texture (hot yellow-white)
    this.sparkTexture = this._createSparkTexture();
    // Smoke / dust texture (soft radial fade)
    this.dustTexture = this._createSmokeTexture();
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

  // Create sparks when hitting metal or stone walls
  createSparks(position, normal, count = 14) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Bounce velocity along normal with spread
      const spread = 0.9;
      const speed = 3.5 + Math.random() * 5.5;
      const vx = (normal.x + (Math.random() - 0.5) * spread) * speed;
      const vy = (normal.y + (Math.random() - 0.5) * spread + 0.4) * speed;
      const vz = (normal.z + (Math.random() - 0.5) * spread) * speed;
      velocities.push(new THREE.Vector3(vx, vy, vz));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffe680,
      size: 0.14,
      map: this.sparkTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      points,
      velocities,
      positions,
      life: 0.28,
      maxLife: 0.28,
      gravity: -14
    });

    // Also spawn a small puff of dust/smoke
    this.createSmokePuff(position, normal);
  }

  // Create dust puff on impact
  createSmokePuff(position, normal, count = 6) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.05;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.05;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.05;

      const vx = normal.x * 0.8 + (Math.random() - 0.5) * 0.6;
      const vy = normal.y * 0.8 + Math.random() * 0.5;
      const vz = normal.z * 0.8 + (Math.random() - 0.5) * 0.6;
      velocities.push(new THREE.Vector3(vx, vy, vz));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xecd9c6,
      size: 0.35,
      map: this.dustTexture,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      points,
      velocities,
      positions,
      life: 0.45,
      maxLife: 0.45,
      gravity: -1.5 // slow gentle rise
    });
  }

  // Create blood spray when hitting bots
  createBlood(position, normal, count = 18) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const spread = 1.1;
      const speed = 2.2 + Math.random() * 3.5;
      const vx = (normal.x * 0.5 + (Math.random() - 0.5) * spread) * speed;
      const vy = (normal.y * 0.5 + (Math.random() - 0.5) * spread + 0.4) * speed;
      const vz = (normal.z * 0.5 + (Math.random() - 0.5) * spread) * speed;
      velocities.push(new THREE.Vector3(vx, vy, vz));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x991b1b,
      size: 0.19,
      map: this.bloodTexture,
      transparent: true,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      points,
      velocities,
      positions,
      life: 0.42,
      maxLife: 0.42,
      gravity: -15
    });
  }

  // Create fast bullet tracer line
  createTracer(fromPos, toPos) {
    const material = new THREE.LineBasicMaterial({
      color: 0xfff5aa,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });

    const points = [fromPos.clone(), fromPos.clone().lerp(toPos, 0.2)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, material);

    this.scene.add(line);

    this.tracers.push({
      line,
      from: fromPos.clone(),
      to: toPos.clone(),
      progress: 0,
      speed: 4.8
    });
  }

  update(delta) {
    // Update particles (sparks, blood, smoke)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.points);
        p.points.geometry.dispose();
        p.points.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      p.points.material.opacity = alpha;

      const posAttr = p.points.geometry.attributes.position;
      const arr = posAttr.array;

      for (let j = 0; j < p.velocities.length; j++) {
        p.velocities[j].y += p.gravity * delta;
        arr[j * 3] += p.velocities[j].x * delta;
        arr[j * 3 + 1] += p.velocities[j].y * delta;
        arr[j * 3 + 2] += p.velocities[j].z * delta;
      }

      posAttr.needsUpdate = true;
    }

    // Update bullet tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.progress += t.speed * delta * 10;

      if (t.progress >= 1.0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        this.tracers.splice(i, 1);
        continue;
      }

      const startProgress = Math.max(0, t.progress - 0.35);
      const head = t.from.clone().lerp(t.to, Math.min(1.0, t.progress));
      const tail = t.from.clone().lerp(t.to, startProgress);

      const positions = new Float32Array([
        tail.x, tail.y, tail.z,
        head.x, head.y, head.z
      ]);

      t.line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      t.line.geometry.attributes.position.needsUpdate = true;
    }
  }
}
