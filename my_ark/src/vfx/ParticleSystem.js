import * as THREE from 'three';
import { createCelMaterial, attachOutline } from '../shaders/CelShading.js';

/**
 * ParticleSystem - Flat, chunky comic/cel-shaded particles (Wood chips, Stone sparks, Foliage, Dust puffs).
 */

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  // Spawn bursting wood chips
  spawnWoodChips(pos, count = 8) {
    const chipMat = createCelMaterial({ color: 0x8a5229, flatShading: true });
    for (let i = 0; i < count; i++) {
      const geom = new THREE.BoxGeometry(0.12, 0.25, 0.05);
      const mesh = new THREE.Mesh(geom, chipMat);
      mesh.position.copy(pos);
      attachOutline(mesh, 0.02, 0x2e1809);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4.0,
        Math.random() * 3.5 + 2.0,
        (Math.random() - 0.5) * 4.0
      );
      const rotSpeed = new THREE.Vector3(
        Math.random() * 12 - 6,
        Math.random() * 12 - 6,
        Math.random() * 12 - 6
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel,
        rotSpeed,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        gravity: 9.8
      });
    }
  }

  // Spawn stone debris & sparks
  spawnStoneDebris(pos, count = 8) {
    const stoneMat = createCelMaterial({ color: 0x7a8288, flatShading: true });
    for (let i = 0; i < count; i++) {
      const geom = new THREE.DodecahedronGeometry(0.12, 0);
      const mesh = new THREE.Mesh(geom, stoneMat);
      mesh.position.copy(pos);
      attachOutline(mesh, 0.02, 0x1a1e24);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5.0,
        Math.random() * 4.0 + 2.5,
        (Math.random() - 0.5) * 5.0
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel,
        rotSpeed: new THREE.Vector3(8, 8, 8),
        life: 0.7 + Math.random() * 0.3,
        maxLife: 1.0,
        gravity: 12.0
      });
    }
  }

  // Spawn green foliage leaves on bush gather
  spawnFoliage(pos, count = 10) {
    const leafMat = createCelMaterial({ color: 0x38a143, flatShading: true });
    for (let i = 0; i < count; i++) {
      const geom = new THREE.PlaneGeometry(0.2, 0.2);
      const mesh = new THREE.Mesh(geom, leafMat);
      mesh.position.copy(pos);
      attachOutline(mesh, 0.02, 0x0f3e14);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3.0,
        Math.random() * 2.5 + 1.5,
        (Math.random() - 0.5) * 3.0
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel,
        rotSpeed: new THREE.Vector3(5, 5, 5),
        life: 0.9,
        maxLife: 0.9,
        gravity: 4.5
      });
    }
  }

  // Spawn comic stylized hit spark / star
  spawnHitStar(pos, isCrit = false) {
    const starColor = isCrit ? 0xff3b30 : 0xffcc00;
    const starMat = new THREE.MeshBasicMaterial({ color: starColor, side: THREE.DoubleSide });
    
    // Cross/Star shape
    const group = new THREE.Group();
    const g1 = new THREE.PlaneGeometry(0.5, 0.12);
    const g2 = new THREE.PlaneGeometry(0.12, 0.5);
    const m1 = new THREE.Mesh(g1, starMat);
    const m2 = new THREE.Mesh(g2, starMat);
    group.add(m1, m2);
    group.position.copy(pos);
    attachOutline(m1, 0.03, 0x000000);
    attachOutline(m2, 0.03, 0x000000);

    this.scene.add(group);
    this.particles.push({
      mesh: group,
      vel: new THREE.Vector3(0, 0.8, 0),
      rotSpeed: new THREE.Vector3(0, 0, 15),
      life: 0.35,
      maxLife: 0.35,
      gravity: 0,
      scaleDown: true
    });
  }

  // Dust puff on heavy footstep / landing
  spawnDustPuff(pos, radius = 0.6) {
    const puffMat = new THREE.MeshBasicMaterial({
      color: 0xdfd3b8,
      transparent: true,
      opacity: 0.75
    });
    const geom = new THREE.CircleGeometry(radius, 12);
    geom.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geom, puffMat);
    mesh.position.copy(pos);
    mesh.position.y += 0.05;

    this.scene.add(mesh);
    this.particles.push({
      mesh,
      vel: new THREE.Vector3(0, 0.1, 0),
      rotSpeed: new THREE.Vector3(0, 0, 0),
      life: 0.45,
      maxLife: 0.45,
      expand: true,
      gravity: 0
    });
  }

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.vel.y -= p.gravity * delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.rotation.x += p.rotSpeed.x * delta;
      p.mesh.rotation.y += p.rotSpeed.y * delta;
      p.mesh.rotation.z += p.rotSpeed.z * delta;

      // Scaling / Fading
      if (p.scaleDown) {
        const s = p.life / p.maxLife;
        p.mesh.scale.set(s, s, s);
      } else if (p.expand) {
        const factor = 1.0 + (1.0 - p.life / p.maxLife) * 1.5;
        p.mesh.scale.set(factor, factor, factor);
        if (p.mesh.material) {
          p.mesh.material.opacity = (p.life / p.maxLife) * 0.75;
        }
      }
    }
  }
}
