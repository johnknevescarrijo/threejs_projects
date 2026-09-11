import * as THREE from 'three';
import { ITEM_TYPES, ITEM_PROPERTIES } from '../core/constants.js';

export class ItemManager {
  constructor(scene, soundSystem) {
    this.scene = scene;
    this.soundSystem = soundSystem;
    this.activeProjectiles = [];
    this.activeGroundTraps = [];
  }

  spawnItem({ type, shooterKart, direction = 'forward', allKarts, track }) {
    if (this.soundSystem) {
      this.soundSystem.playItemUse(type);
    }

    if (type === ITEM_TYPES.BOOST_MUSHROOM) {
      shooterKart.applyBoost(ITEM_PROPERTIES[ITEM_TYPES.BOOST_MUSHROOM].duration, ITEM_PROPERTIES[ITEM_TYPES.BOOST_MUSHROOM].boostSpeed);
      return;
    }

    if (type === ITEM_TYPES.LIGHTNING) {
      // Area Shock: hits all other karts
      allKarts.forEach(k => {
        if (k !== shooterKart) {
          k.triggerShock();
        }
      });
      return;
    }

    if (type === ITEM_TYPES.BANANA) {
      const trap = new GroundTrapBanana(shooterKart, direction, this.scene);
      this.activeGroundTraps.push(trap);
      return;
    }

    if (type === ITEM_TYPES.GREEN_SHELL) {
      const shell = new GreenShellProjectile(shooterKart, direction, this.scene, track);
      this.activeProjectiles.push(shell);
      return;
    }

    if (type === ITEM_TYPES.RED_SHELL) {
      // Find nearest target kart ahead
      let target = null;
      let minDistanceAhead = Infinity;
      allKarts.forEach(k => {
        if (k !== shooterKart && k.totalDistance > shooterKart.totalDistance) {
          const dist = k.totalDistance - shooterKart.totalDistance;
          if (dist < minDistanceAhead) {
            minDistanceAhead = dist;
            target = k;
          }
        }
      });

      const redShell = new RedShellProjectile(shooterKart, target, this.scene, track);
      this.activeProjectiles.push(redShell);
      return;
    }

    if (type === ITEM_TYPES.BLUE_SHELL) {
      // Targets leader (1st place)
      let leader = allKarts[0];
      allKarts.forEach(k => {
        if (k.totalDistance > leader.totalDistance) {
          leader = k;
        }
      });

      const blueShell = new BlueShellProjectile(shooterKart, leader, this.scene, track);
      this.activeProjectiles.push(blueShell);
      return;
    }
  }

  update(deltaTime, allKarts, track) {
    // Update and collide projectiles
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeProjectiles[i];
      p.update(deltaTime, track);

      // Check hit with karts
      let destroyed = false;
      for (const kart of allKarts) {
        if (kart === p.shooter && p.lifetime > 0.3) {
          // Allow shooting self only after bounce
          if (p.bounces === 0) continue;
        }

        const dist = p.position.distanceTo(kart.position);
        if (dist < 2.2) {
          kart.triggerSpinOut();
          destroyed = true;
          break;
        }
      }

      if (destroyed || p.isExpired) {
        p.destroy();
        this.activeProjectiles.splice(i, 1);
      }
    }

    // Update ground traps (Bananas)
    for (let i = this.activeGroundTraps.length - 1; i >= 0; i--) {
      const trap = this.activeGroundTraps[i];
      trap.update(deltaTime);

      let triggered = false;
      for (const kart of allKarts) {
        // Immunity for 0.4s to shooter
        if (kart === trap.shooter && trap.age < 0.4) continue;

        const dist = trap.position.distanceTo(kart.position);
        if (dist < 1.8) {
          kart.triggerSpinOut();
          triggered = true;
          break;
        }
      }

      if (triggered || trap.isExpired) {
        trap.destroy();
        this.activeGroundTraps.splice(i, 1);
      }
    }
  }
}

class GreenShellProjectile {
  constructor(shooter, direction, scene, track) {
    this.shooter = shooter;
    this.scene = scene;
    this.speed = ITEM_PROPERTIES[ITEM_TYPES.GREEN_SHELL].speed;
    this.bounces = 0;
    this.maxBounces = 4;
    this.lifetime = 0;
    this.maxLifetime = ITEM_PROPERTIES[ITEM_TYPES.GREEN_SHELL].lifetime;
    this.isExpired = false;

    this.position = shooter.position.clone().add(new THREE.Vector3(0, 0.5, 0));
    const dirSign = direction === 'forward' ? 1 : -1;
    this.velocity = shooter.forward.clone().multiplyScalar(dirSign * this.speed);
    // Offset spawn slightly in front/behind to avoid immediate self-collision
    this.position.addScaledVector(shooter.forward, dirSign * 2.8);

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.3, metalness: 0.5 })
    );
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(deltaTime, track) {
    this.lifetime += deltaTime;
    if (this.lifetime >= this.maxLifetime) {
      this.isExpired = true;
      return;
    }

    this.position.addScaledVector(this.velocity, deltaTime);

    // Track boundary bounce
    const proj = track.getSplineProjection(this.position);
    if (Math.abs(proj.lateralOffset) > track.halfWidth) {
      // Reflect velocity vector along normal
      const normal = proj.sample.binormal.clone().normalize();
      const dot = this.velocity.dot(normal);
      this.velocity.sub(normal.multiplyScalar(2 * dot));
      this.bounces++;
      if (this.bounces > this.maxBounces) {
        this.isExpired = true;
      }
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y += deltaTime * 20;
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

class RedShellProjectile {
  constructor(shooter, target, scene, track) {
    this.shooter = shooter;
    this.target = target;
    this.scene = scene;
    this.speed = ITEM_PROPERTIES[ITEM_TYPES.RED_SHELL].speed;
    this.lifetime = 0;
    this.maxLifetime = ITEM_PROPERTIES[ITEM_TYPES.RED_SHELL].lifetime;
    this.isExpired = false;

    this.position = shooter.position.clone().add(new THREE.Vector3(0, 0.5, 0)).addScaledVector(shooter.forward, 2.5);
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3, metalness: 0.6 })
    );
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(deltaTime, track) {
    this.lifetime += deltaTime;
    if (this.lifetime >= this.maxLifetime) {
      this.isExpired = true;
      return;
    }

    let targetPos = null;
    if (this.target) {
      targetPos = this.target.position;
    } else {
      // Default: seek next waypoint along track
      const proj = track.getSplineProjection(this.position);
      targetPos = track.getWaypointAtProgress(proj.t + 0.05, 0);
    }

    const seekDir = new THREE.Vector3().subVectors(targetPos, this.position).normalize();
    this.position.addScaledVector(seekDir, this.speed * deltaTime);

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y += deltaTime * 25;
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

class BlueShellProjectile {
  constructor(shooter, leader, scene, track) {
    this.shooter = shooter;
    this.leader = leader;
    this.scene = scene;
    this.speed = ITEM_PROPERTIES[ITEM_TYPES.BLUE_SHELL].speed;
    this.lifetime = 0;
    this.isExpired = false;

    this.position = shooter.position.clone().add(new THREE.Vector3(0, 2.5, 0));
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x2980b9, roughness: 0.2, metalness: 0.8 })
    );
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(deltaTime, track) {
    this.lifetime += deltaTime;
    if (this.lifetime > 15) {
      this.isExpired = true;
      return;
    }

    const targetPos = this.leader.position.clone().add(new THREE.Vector3(0, 1.0, 0));
    const toTarget = new THREE.Vector3().subVectors(targetPos, this.position);
    const dist = toTarget.length();

    if (dist < 3.0) {
      // Impact leader!
      this.leader.triggerSpinOut();
      this.isExpired = true;
      return;
    }

    toTarget.normalize();
    this.position.addScaledVector(toTarget, this.speed * deltaTime);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y += deltaTime * 30;
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

class GroundTrapBanana {
  constructor(shooter, direction, scene) {
    this.shooter = shooter;
    this.scene = scene;
    this.age = 0;
    this.lifetime = ITEM_PROPERTIES[ITEM_TYPES.BANANA].lifetime;
    this.isExpired = false;

    const offsetDir = direction === 'forward' ? 3.0 : -2.5;
    this.position = shooter.position.clone().addScaledVector(shooter.forward, offsetDir);
    this.position.y += 0.2;

    this.mesh = new THREE.Group();
    const peelGeo = new THREE.ConeGeometry(0.35, 0.6, 6);
    const peelMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 });
    const peel = new THREE.Mesh(peelGeo, peelMat);
    peel.position.y = 0.3;
    this.mesh.add(peel);

    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(deltaTime) {
    this.age += deltaTime;
    if (this.age >= this.lifetime) {
      this.isExpired = true;
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}
