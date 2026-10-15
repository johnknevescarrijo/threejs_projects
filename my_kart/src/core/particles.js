import * as THREE from 'three';

/**
 * High-performance pooled 3D particle system using InstancedMesh
 * for drift sparks, nitro flames, exhaust smoke, dirt kickup, and explosions.
 */
export class ParticleSystem {
  constructor(scene, maxParticles = 500) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.particles = [];

    const geo = new THREE.OctahedronGeometry(0.18, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.frustumCulled = false;
    this.scene.add(this.instancedMesh);

    this.dummy = new THREE.Object3D();
    this.colorHelper = new THREE.Color();

    // Initialize pool
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        scale: 1,
        initialScale: 1,
        age: 0,
        lifetime: 0.5,
        gravity: 0,
        color: new THREE.Color(0xffffff)
      });
      this.dummy.position.set(0, -9999, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, this.colorHelper);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    this.cursor = 0;
    this.shockwaves = [];
  }

  spawn({
    position,
    velocity,
    color = 0xffffff,
    scale = 1.0,
    lifetime = 0.4,
    gravity = 9.8
  }) {
    const p = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % this.maxParticles;

    p.active = true;
    p.position.copy(position);
    p.velocity.copy(velocity);
    p.scale = scale;
    p.initialScale = scale;
    p.age = 0;
    p.lifetime = lifetime;
    p.gravity = gravity;
    p.color.setHex(color);
  }

  emitDriftSparks(worldPos, kartRight, kartForward, stage) {
    const color = stage === 2 ? (Math.random() > 0.35 ? 0xff7b00 : 0xffd000) : (Math.random() > 0.35 ? 0x00d2ff : 0x70e1f5);
    for (let i = 0; i < 2; i++) {
      const vel = new THREE.Vector3()
        .addScaledVector(kartForward, -4 - Math.random() * 5)
        .addScaledVector(kartRight, (Math.random() - 0.5) * 6)
        .add(new THREE.Vector3(0, 2.0 + Math.random() * 3.5, 0));

      this.spawn({
        position: worldPos,
        velocity: vel,
        color,
        scale: stage === 2 ? 0.95 : 0.7,
        lifetime: 0.22 + Math.random() * 0.14,
        gravity: 16
      });
    }
  }

  emitExhaustFlame(worldPos, kartForward) {
    const colors = [0x00f2fe, 0x38bdf8, 0xfacc15, 0xf97316];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const vel = new THREE.Vector3()
      .addScaledVector(kartForward, -12 - Math.random() * 8)
      .add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.5 + Math.random() * 1.4, (Math.random() - 0.5) * 1.6));

    this.spawn({
      position: worldPos,
      velocity: vel,
      color,
      scale: 1.15 + Math.random() * 0.5,
      lifetime: 0.16 + Math.random() * 0.1,
      gravity: -2
    });
  }

  emitOffroadDust(worldPos, kartForward) {
    const color = Math.random() > 0.45 ? 0x8b5a2b : 0x2e7d32;
    const vel = new THREE.Vector3()
      .addScaledVector(kartForward, -3 - Math.random() * 4)
      .add(new THREE.Vector3((Math.random() - 0.5) * 3.5, 1.8 + Math.random() * 2.5, (Math.random() - 0.5) * 3.5));

    this.spawn({
      position: worldPos,
      velocity: vel,
      color,
      scale: 0.9 + Math.random() * 0.6,
      lifetime: 0.35 + Math.random() * 0.15,
      gravity: 12
    });
  }

  emitBurst(worldPos, colorHex = 0xfacc15, count = 18, speed = 10) {
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.4 + 0.2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.7));

      this.spawn({
        position: worldPos,
        velocity: dir,
        color: colorHex,
        scale: 1.2 + Math.random() * 0.8,
        lifetime: 0.45 + Math.random() * 0.25,
        gravity: 14
      });
    }
  }

  spawnShockwave(worldPos, colorHex = 0x00d2ff, maxRadius = 10) {
    const geo = new THREE.SphereGeometry(1, 20, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.65,
      wireframe: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(worldPos);
    this.scene.add(mesh);
    this.shockwaves.push({
      mesh,
      age: 0,
      duration: 0.55,
      maxRadius
    });
  }

  update(deltaTime) {
    let dirty = false;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.age += deltaTime;
      if (p.age >= p.lifetime) {
        p.active = false;
        this.dummy.position.set(0, -9999, 0);
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
        dirty = true;
        continue;
      }

      p.velocity.y -= p.gravity * deltaTime;
      p.position.addScaledVector(p.velocity, deltaTime);

      const lifeRatio = 1.0 - p.age / p.lifetime;
      p.scale = p.initialScale * lifeRatio;

      this.dummy.position.copy(p.position);
      this.dummy.rotation.x += deltaTime * 8;
      this.dummy.rotation.y += deltaTime * 10;
      this.dummy.scale.setScalar(Math.max(0.01, p.scale));
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, p.color);
      dirty = true;
    }

    if (dirty) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
      }
    }

    // Update expanding shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += deltaTime;
      const t = sw.age / sw.duration;
      if (t >= 1.0) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
      } else {
        const radius = 0.5 + sw.maxRadius * Math.sin(t * Math.PI * 0.5);
        sw.mesh.scale.setScalar(radius);
        sw.mesh.material.opacity = 0.65 * (1.0 - t);
      }
    }
  }
}
