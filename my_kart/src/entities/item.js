import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ITEM_TYPES, ITEM_PROPERTIES } from '../core/constants.js';
import { ProceduralTextures } from '../core/textures.js';

export class ItemMeshFactory {
  static createShellMesh(colorHex, hasSpikes = false) {
    const group = new THREE.Group();

    // Carapace Dome
    const domeGeo = new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: 0.2,
      metalness: 0.35,
      clearcoat: 0.9
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.castShadow = true;
    group.add(dome);

    // White Belt Rim
    const rimGeo = new THREE.TorusGeometry(0.39, 0.075, 10, 20);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = 0.08;
    group.add(rim);

    // Underside Belly
    const bellyGeo = new THREE.CylinderGeometry(0.36, 0.28, 0.14, 14);
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.y = 0.02;
    group.add(belly);

    if (hasSpikes) {
      const spikeGeo = new THREE.ConeGeometry(0.1, 0.32, 8);
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      const spikeOffsets = [
        { x: 0, y: 0.5, z: 0, rx: 0, rz: 0 },
        { x: 0.22, y: 0.38, z: 0.15, rx: 0.3, rz: -0.4 },
        { x: -0.22, y: 0.38, z: 0.15, rx: 0.3, rz: 0.4 },
        { x: 0.22, y: 0.38, z: -0.15, rx: -0.3, rz: -0.4 },
        { x: -0.22, y: 0.38, z: -0.15, rx: -0.3, rz: 0.4 }
      ];
      spikeOffsets.forEach(s => {
        const sp = new THREE.Mesh(spikeGeo, spikeMat);
        sp.position.set(s.x, s.y, s.z);
        sp.rotation.set(s.rx, 0, s.rz);
        group.add(sp);
      });
    }

    return group;
  }

  static createBananaMesh() {
    const group = new THREE.Group();
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.8 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });

    // Central banana body
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.68, 10), yellowMat);
    core.position.y = 0.34;
    core.castShadow = true;
    group.add(core);

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.35, 8), innerMat);
    inner.position.y = 0.22;
    group.add(inner);

    // Brown top stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.14, 6), tipMat);
    stem.position.y = 0.7;
    group.add(stem);

    // 3 Splayed peel strips on ground
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const peel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.42), yellowMat);
      peel.position.set(Math.sin(angle) * 0.25, 0.06, Math.cos(angle) * 0.25);
      peel.rotation.y = angle;
      peel.rotation.x = 0.25;
      group.add(peel);
    }

    return group;
  }

  static createMushroomMesh() {
    const group = new THREE.Group();
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
    const capMat = new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.25, clearcoat: 0.7 });
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.36, 12), stemMat);
    stem.position.y = 0.18;
    group.add(stem);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), capMat);
    cap.position.y = 0.28;
    group.add(cap);

    const spotGeo = new THREE.SphereGeometry(0.1, 8, 8);
    [
      [0, 0.62, 0],
      [0.26, 0.46, 0.12],
      [-0.26, 0.46, 0.12],
      [0, 0.46, -0.28]
    ].forEach(([x, y, z]) => {
      const s = new THREE.Mesh(spotGeo, spotMat);
      s.position.set(x, y, z);
      group.add(s);
    });

    return group;
  }

  static createLightningMesh() {
    const group = new THREE.Group();
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.12), boltMat);
    seg1.position.set(0.06, 0.48, 0);
    seg1.rotation.z = -0.35;
    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.12), boltMat);
    seg2.position.set(-0.06, 0.22, 0);
    seg2.rotation.z = -0.35;
    group.add(seg1, seg2);
    return group;
  }

  static createStarMesh() {
    const group = new THREE.Group();

    // 5-Pointed Star Shape
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.52;
    const innerRadius = 0.25;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
      depth: 0.16,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.06
    };

    const starGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    starGeo.center();

    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.18,
      metalness: 0.4,
      emissive: 0xca8a04,
      emissiveIntensity: 0.45
    });

    const starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.castShadow = true;
    group.add(starMesh);

    // Iconic Mario Kart Star black oval vertical eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
    const eyeGeo = new THREE.CapsuleGeometry(0.028, 0.10, 4, 8);

    const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
    eyeLeft.position.set(-0.085, -0.01, 0.14);
    const eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
    eyeRight.position.set(0.085, -0.01, 0.14);
    group.add(eyeLeft, eyeRight);

    const eyeLeftBack = new THREE.Mesh(eyeGeo, eyeMat);
    eyeLeftBack.position.set(-0.085, -0.01, -0.14);
    const eyeRightBack = new THREE.Mesh(eyeGeo, eyeMat);
    eyeRightBack.position.set(0.085, -0.01, -0.14);
    group.add(eyeLeftBack, eyeRightBack);

    group.position.y = 0.42;
    return group;
  }

  static createGoldenMushroomMesh() {
    const group = new THREE.Group();
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.35, metalness: 0.6 });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.15,
      metalness: 0.9,
      emissive: 0xd97706,
      emissiveIntensity: 0.45
    });
    const spotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.85 });

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.36, 12), stemMat);
    stem.position.y = 0.18;
    group.add(stem);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), capMat);
    cap.position.y = 0.28;
    group.add(cap);

    const spotGeo = new THREE.SphereGeometry(0.1, 8, 8);
    [
      [0, 0.62, 0],
      [0.26, 0.46, 0.12],
      [-0.26, 0.46, 0.12],
      [0, 0.46, -0.28]
    ].forEach(([x, y, z]) => {
      const s = new THREE.Mesh(spotGeo, spotMat);
      s.position.set(x, y, z);
      group.add(s);
    });

    // Golden Imperial Crown on top
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0xb45309,
      emissiveIntensity: 0.5
    });
    const crownRing = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.1, 8), crownMat);
    crownRing.position.y = 0.66;
    group.add(crownRing);

    for (let c = 0; c < 4; c++) {
      const crownSpike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), crownMat);
      const angle = (c / 4) * Math.PI * 2;
      crownSpike.position.set(Math.cos(angle) * 0.14, 0.74, Math.sin(angle) * 0.14);
      group.add(crownSpike);
    }

    return group;
  }

  static createFakeItemBoxMesh() {
    const group = new THREE.Group();
    const fakeTex = ProceduralTextures.createFakeItemBoxTexture();
    const outerGeo = new RoundedBoxGeometry(1.4, 1.4, 1.4, 3, 0.14);
    const outerMat = new THREE.MeshPhysicalMaterial({
      map: fakeTex,
      roughness: 0.15,
      metalness: 0.25,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.92,
      emissive: 0xef4444,
      emissiveIntensity: 0.35
    });
    const cube = new THREE.Mesh(outerGeo, outerMat);
    cube.position.y = 0.7;
    group.add(cube);

    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff4444, wireframe: true });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), coreMat);
    core.position.y = 0.7;
    group.add(core);

    return group;
  }

  static createItemMesh(type) {
    switch (type) {
      case ITEM_TYPES.GREEN_SHELL:
        return this.createShellMesh(0x22c55e, false);
      case ITEM_TYPES.RED_SHELL:
        return this.createShellMesh(0xef4444, false);
      case ITEM_TYPES.BLUE_SHELL:
        return this.createShellMesh(0x0ea5e9, true);
      case ITEM_TYPES.BANANA:
        return this.createBananaMesh();
      case ITEM_TYPES.BOOST_MUSHROOM:
        return this.createMushroomMesh();
      case ITEM_TYPES.GOLDEN_MUSHROOM:
        return this.createGoldenMushroomMesh();
      case ITEM_TYPES.SUPER_STAR:
        return this.createStarMesh();
      case ITEM_TYPES.FAKE_ITEM_BOX:
        return this.createFakeItemBoxMesh();
      case ITEM_TYPES.LIGHTNING:
        return this.createLightningMesh();
      default:
        return this.createShellMesh(0xfacc15, false);
    }
  }
}

export class ItemManager {
  constructor(scene, soundSystem, particleSystem = null) {
    this.scene = scene;
    this.soundSystem = soundSystem;
    this.particleSystem = particleSystem;
    this.activeProjectiles = [];
    this.activeGroundTraps = [];
    this.lightningBolts = [];
  }

  spawnItem({ type, shooterKart, direction = 'forward', allKarts, track }) {
    if (this.soundSystem) {
      this.soundSystem.playItemUse(type);
    }

    if (type === ITEM_TYPES.BOOST_MUSHROOM) {
      shooterKart.applyBoost(
        ITEM_PROPERTIES[ITEM_TYPES.BOOST_MUSHROOM].duration,
        ITEM_PROPERTIES[ITEM_TYPES.BOOST_MUSHROOM].boostSpeed
      );
      if (this.particleSystem) {
        this.particleSystem.emitBurst(shooterKart.position, 0xff3344, 18, 10);
      }
      return;
    }

    if (type === ITEM_TYPES.SUPER_STAR) {
      shooterKart.activateStar(ITEM_PROPERTIES[ITEM_TYPES.SUPER_STAR].duration);
      if (this.particleSystem) {
        this.particleSystem.emitBurst(shooterKart.position, 0xfacc15, 24, 12);
      }
      return;
    }

    if (type === ITEM_TYPES.GOLDEN_MUSHROOM) {
      shooterKart.activateGoldenMushroom(ITEM_PROPERTIES[ITEM_TYPES.GOLDEN_MUSHROOM].duration);
      shooterKart.applyBoost(
        1.3,
        ITEM_PROPERTIES[ITEM_TYPES.GOLDEN_MUSHROOM].boostSpeed
      );
      if (this.particleSystem) {
        this.particleSystem.emitBurst(shooterKart.position, 0xfbbf24, 20, 10);
      }
      return;
    }

    if (type === ITEM_TYPES.FAKE_ITEM_BOX) {
      const trap = new GroundTrapFakeBox(shooterKart, direction, this.scene, track);
      this.activeGroundTraps.push(trap);
      return;
    }

    if (type === ITEM_TYPES.LIGHTNING) {
      allKarts.forEach(k => {
        if (k !== shooterKart) {
          k.triggerShock();
          this.spawnSkyLightningStrike(k.position);
        }
      });
      return;
    }

    if (type === ITEM_TYPES.BANANA) {
      const trap = new GroundTrapBanana(shooterKart, direction, this.scene, track);
      this.activeGroundTraps.push(trap);
      return;
    }

    if (type === ITEM_TYPES.GREEN_SHELL) {
      const shell = new GreenShellProjectile(shooterKart, direction, this.scene, track, this.particleSystem);
      this.activeProjectiles.push(shell);
      return;
    }

    if (type === ITEM_TYPES.RED_SHELL) {
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

      const redShell = new RedShellProjectile(shooterKart, target, this.scene, track, this.particleSystem);
      this.activeProjectiles.push(redShell);
      return;
    }

    if (type === ITEM_TYPES.BLUE_SHELL) {
      let leader = allKarts[0];
      allKarts.forEach(k => {
        if (k.totalDistance > leader.totalDistance) {
          leader = k;
        }
      });

      const blueShell = new BlueShellProjectile(shooterKart, leader, this.scene, track, this.particleSystem, allKarts);
      this.activeProjectiles.push(blueShell);
      return;
    }
  }

  spawnSkyLightningStrike(worldPos) {
    const geo = new THREE.CylinderGeometry(0.35, 0.85, 45, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95
    });
    const bolt = new THREE.Mesh(geo, mat);
    bolt.position.copy(worldPos);
    bolt.position.y += 22.5;
    this.scene.add(bolt);
    this.lightningBolts.push({ mesh: bolt, age: 0, duration: 0.45 });
  }

  /**
   * Returns incoming homing threat info if a Red or Blue shell is targeting targetKart
   */
  getIncomingThreat(targetKart) {
    for (const p of this.activeProjectiles) {
      if (p.target === targetKart || p.leader === targetKart) {
        const dist = p.position.distanceTo(targetKart.position);
        if (dist < 85) {
          return {
            type: p.leader === targetKart ? ITEM_TYPES.BLUE_SHELL : ITEM_TYPES.RED_SHELL,
            distance: dist
          };
        }
      }
    }
    return null;
  }

  update(deltaTime, allKarts, track) {
    // Update lightning strike visual pillars
    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      const b = this.lightningBolts[i];
      b.age += deltaTime;
      if (b.age >= b.duration) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.lightningBolts.splice(i, 1);
      } else {
        b.mesh.material.opacity = (1.0 - b.age / b.duration) * (Math.random() > 0.3 ? 1 : 0.3);
      }
    }

    // Update and collide projectiles
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeProjectiles[i];
      p.update(deltaTime, track);

      let destroyed = false;
      for (const kart of allKarts) {
        if (kart === p.shooter && p.lifetime < 0.35 && (p.bounces || 0) === 0) {
          continue;
        }

        const dist = p.position.distanceTo(kart.position);
        if (dist < 2.2) {
          if (p.isBlueShell) {
            // Area explosion hitting nearby karts
            if (this.particleSystem) {
              this.particleSystem.spawnShockwave(kart.position, 0x00f2fe, 9.5);
              this.particleSystem.emitBurst(kart.position, 0x00f2fe, 28, 14);
            }
            allKarts.forEach(other => {
              if (other.position.distanceTo(kart.position) <= ITEM_PROPERTIES[ITEM_TYPES.BLUE_SHELL].explosionRadius) {
                if (!other.isStarred) {
                  other.triggerSpinOut();
                }
              }
            });
          } else {
            if (!kart.isStarred) {
              kart.triggerSpinOut();
            }
            if (this.particleSystem) {
              this.particleSystem.emitBurst(p.position, p.trailColor || 0x22c55e, 18, 10);
            }
          }
          destroyed = true;
          break;
        }
      }

      if (destroyed || p.isExpired) {
        p.destroy();
        this.activeProjectiles.splice(i, 1);
      }
    }

    // Update ground traps (Bananas and Fake Item Boxes)
    for (let i = this.activeGroundTraps.length - 1; i >= 0; i--) {
      const trap = this.activeGroundTraps[i];
      trap.update(deltaTime);

      let triggered = false;
      for (const kart of allKarts) {
        if (kart === trap.shooter && trap.age < 0.45) continue;

        const dist = trap.position.distanceTo(kart.position);
        if (dist < 1.85) {
          if (!kart.isStarred) {
            kart.triggerSpinOut();
          }
          if (this.particleSystem) {
            const burstColor = trap.isFakeBox ? 0xef4444 : 0xfacc15;
            this.particleSystem.emitBurst(trap.position, burstColor, 18, 10);
          }
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
  constructor(shooter, direction, scene, track, particleSystem) {
    this.shooter = shooter;
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.speed = ITEM_PROPERTIES[ITEM_TYPES.GREEN_SHELL].speed;
    this.bounces = 0;
    this.maxBounces = 5;
    this.lifetime = 0;
    this.maxLifetime = ITEM_PROPERTIES[ITEM_TYPES.GREEN_SHELL].lifetime;
    this.isExpired = false;
    this.trailColor = 0x22c55e;

    const dirSign = direction === 'forward' ? 1 : -1;
    this.position = shooter.position.clone().addScaledVector(shooter.forward, dirSign * 2.8);
    this.position.y += 0.35;
    this.velocity = shooter.forward.clone().multiplyScalar(dirSign * this.speed);

    this.mesh = ItemMeshFactory.createItemMesh(ITEM_TYPES.GREEN_SHELL);
    this.mesh.scale.setScalar(1.25);
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

    const proj = track.getSplineProjection(this.position);
    // Follow track height!
    this.position.y = proj.sample.point.y + 0.35;

    if (Math.abs(proj.lateralOffset) > track.halfWidth) {
      const normal = proj.sample.binormal.clone().normalize();
      const dot = this.velocity.dot(normal);
      this.velocity.sub(normal.multiplyScalar(2 * dot));
      // Push inside track boundary
      const sign = Math.sign(proj.lateralOffset);
      this.position.addScaledVector(normal, -sign * (Math.abs(proj.lateralOffset) - track.halfWidth + 0.2));
      this.bounces++;
      if (this.bounces > this.maxBounces) {
        this.isExpired = true;
      }
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y += deltaTime * 22;
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

class RedShellProjectile {
  constructor(shooter, target, scene, track, particleSystem) {
    this.shooter = shooter;
    this.target = target;
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.speed = ITEM_PROPERTIES[ITEM_TYPES.RED_SHELL].speed;
    this.lifetime = 0;
    this.maxLifetime = ITEM_PROPERTIES[ITEM_TYPES.RED_SHELL].lifetime;
    this.isExpired = false;
    this.trailColor = 0xef4444;

    this.position = shooter.position.clone().addScaledVector(shooter.forward, 2.8);
    this.position.y += 0.35;
    this.mesh = ItemMeshFactory.createItemMesh(ITEM_TYPES.RED_SHELL);
    this.mesh.scale.setScalar(1.25);
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(deltaTime, track) {
    this.lifetime += deltaTime;
    if (this.lifetime >= this.maxLifetime) {
      this.isExpired = true;
      return;
    }

    const proj = track.getSplineProjection(this.position);
    let targetPos = null;
    if (this.target && this.position.distanceTo(this.target.position) < 42) {
      targetPos = this.target.position;
    } else {
      // Navigate along spline centerline until close to target
      targetPos = track.getWaypointAtProgress(proj.t + 0.04, 0);
    }

    const seekDir = new THREE.Vector3().subVectors(targetPos, this.position);
    seekDir.y = 0;
    seekDir.normalize();

    this.position.addScaledVector(seekDir, this.speed * deltaTime);
    this.position.y = proj.sample.point.y + 0.35;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y += deltaTime * 25;
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

class BlueShellProjectile {
  constructor(shooter, leader, scene, track, particleSystem, allKarts) {
    this.shooter = shooter;
    this.leader = leader;
    this.allKarts = allKarts;
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.speed = ITEM_PROPERTIES[ITEM_TYPES.BLUE_SHELL].speed;
    this.lifetime = 0;
    this.isExpired = false;
    this.isBlueShell = true;
    this.trailColor = 0x00f2fe;

    this.position = shooter.position.clone().add(new THREE.Vector3(0, 2.5, 0));
    this.mesh = ItemMeshFactory.createItemMesh(ITEM_TYPES.BLUE_SHELL);
    this.mesh.scale.setScalar(1.45);
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(deltaTime, track) {
    this.lifetime += deltaTime;
    if (this.lifetime > 15) {
      this.isExpired = true;
      return;
    }

    const proj = track.getSplineProjection(this.position);
    const distToLeader = this.position.distanceTo(this.leader.position);

    let targetPos;
    if (distToLeader < 38) {
      // Dive down directly onto the leader!
      targetPos = this.leader.position.clone().add(new THREE.Vector3(0, 0.6, 0));
    } else {
      // Cruise high along the spline centerline
      targetPos = track.getWaypointAtProgress(proj.t + 0.05, 0);
      targetPos.y += 2.6;
    }

    const toTarget = new THREE.Vector3().subVectors(targetPos, this.position);
    if (toTarget.length() < 2.2) {
      if (this.particleSystem) {
        this.particleSystem.spawnShockwave(this.leader.position, 0x00f2fe, 9.5);
        this.particleSystem.emitBurst(this.leader.position, 0x00f2fe, 28, 14);
      }
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
  constructor(shooter, direction, scene, track) {
    this.shooter = shooter;
    this.scene = scene;
    this.age = 0;
    this.lifetime = ITEM_PROPERTIES[ITEM_TYPES.BANANA].lifetime;
    this.isExpired = false;

    const offsetDir = direction === 'forward' ? 3.2 : -2.6;
    this.position = shooter.position.clone().addScaledVector(shooter.forward, offsetDir);
    if (track) {
      const proj = track.getSplineProjection(this.position);
      this.position.y = proj.sample.point.y + 0.08;
    }

    this.mesh = ItemMeshFactory.createItemMesh(ITEM_TYPES.BANANA);
    this.mesh.scale.setScalar(1.25);
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(deltaTime) {
    this.age += deltaTime;
    this.mesh.rotation.y += deltaTime * 1.5;
    if (this.age >= this.lifetime) {
      this.isExpired = true;
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}

class GroundTrapFakeBox {
  constructor(shooter, direction, scene, track) {
    this.shooter = shooter;
    this.scene = scene;
    this.age = 0;
    this.lifetime = ITEM_PROPERTIES[ITEM_TYPES.FAKE_ITEM_BOX].lifetime || 50;
    this.isExpired = false;
    this.isFakeBox = true;

    const offsetDir = direction === 'forward' ? 3.6 : -2.8;
    this.position = shooter.position.clone().addScaledVector(shooter.forward, offsetDir);
    if (track) {
      const proj = track.getSplineProjection(this.position);
      this.position.y = proj.sample.point.y + 0.08;
    }

    this.mesh = ItemMeshFactory.createItemMesh(ITEM_TYPES.FAKE_ITEM_BOX);
    this.mesh.scale.setScalar(1.15);
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(deltaTime) {
    this.age += deltaTime;
    this.mesh.rotation.y += deltaTime * 2.5;
    this.mesh.position.y = this.position.y + Math.sin(this.age * 3.0) * 0.12;
    if (this.age >= this.lifetime) {
      this.isExpired = true;
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}
