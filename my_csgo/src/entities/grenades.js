import * as THREE from 'three';
import { sounds } from '../audio/soundManager.js';
import {
  computeHEDamage,
  computeFlashIntensity,
  doesSegmentIntersectSphere
} from '../combat/tactical.js';
import { classifySurfacePenetration } from '../combat/ballistics.js';

const _TMP_DIR = new THREE.Vector3();
const _CAM_FWD = new THREE.Vector3();

export class GrenadeManager {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.activeProjectiles = [];
    this.activeEffects = [];
    this.activeSmokes = [];

    this._initAssets();
  }

  _initAssets() {
    // Procedural radial smoke sprite texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, 'rgba(225, 228, 232, 0.96)');
    grad.addColorStop(0.45, 'rgba(195, 200, 206, 0.85)');
    grad.addColorStop(0.78, 'rgba(160, 166, 174, 0.42)');
    grad.addColorStop(1, 'rgba(140, 145, 152, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    this.smokeTexture = new THREE.CanvasTexture(canvas);
    this.smokeTexture.colorSpace = THREE.SRGBColorSpace;

    // Reusable projectile geometries & materials
    this.heGeo = new THREE.SphereGeometry(0.075, 10, 10);
    this.canisterGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.16, 10);
    this.bandGeo = new THREE.CylinderGeometry(0.051, 0.051, 0.025, 10);
    this.effectSphereGeo = new THREE.SphereGeometry(1, 16, 12);

    this.mats = {
      he: new THREE.MeshStandardMaterial({ color: 0x3b4d2b, roughness: 0.6, metalness: 0.3 }),
      heBand: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.2 }),
      flash: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.7 }),
      flashBand: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4, metalness: 0.2 }),
      smoke: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.55, metalness: 0.35 }),
      smokeBand: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4, metalness: 0.1 })
    };
  }

  _createProjectileMesh(type) {
    const group = new THREE.Group();
    if (type === 'he') {
      const body = new THREE.Mesh(this.heGeo, this.mats.he);
      const band = new THREE.Mesh(this.bandGeo, this.mats.heBand);
      group.add(body, band);
    } else if (type === 'flash') {
      const body = new THREE.Mesh(this.canisterGeo, this.mats.flash);
      const band = new THREE.Mesh(this.bandGeo, this.mats.flashBand);
      group.add(body, band);
    } else {
      const body = new THREE.Mesh(this.canisterGeo, this.mats.smoke);
      const band = new THREE.Mesh(this.bandGeo, this.mats.smokeBand);
      group.add(body, band);
    }
    return group;
  }

  throwGrenade(type, origin, direction, playerVelocity, isUnderhand = false) {
    const speed = isUnderhand ? 8.5 : 16.5;
    const upBoost = isUnderhand ? 2.2 : 3.2;

    const dir = direction.clone().normalize();
    const velocity = dir.multiplyScalar(speed);
    velocity.y += upBoost;
    if (playerVelocity) {
      velocity.x += playerVelocity.x * 0.35;
      velocity.z += playerVelocity.z * 0.35;
    }

    const fuseMap = { he: 1.6, flash: 1.45, smoke: 1.5 };
    const mesh = this._createProjectileMesh(type);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.activeProjectiles.push({
      type,
      mesh,
      velocity,
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14
      ),
      fuse: fuseMap[type] ?? 1.5,
      bounceCooldown: 0
    });
  }

  _getSurfaceHeight(x, z) {
    let groundY = 0;
    if (x >= 10 && x <= 26 && z >= 10 && z <= 26) {
      groundY = 1.2;
    } else if (x >= 16 && x <= 20 && z >= 2 && z <= 10) {
      groundY = THREE.MathUtils.clamp((z - 2) / 8, 0, 1) * 1.2;
    } else if (x >= 6.4 && x <= 10.6 && z >= 0.2 && z <= 6.2) {
      groundY = THREE.MathUtils.clamp((z - 0.2) / 6, 0, 1) * 1.2;
    } else if (x >= 6.4 && x <= 14.5 && z >= 6.2 && z <= 15) {
      groundY = 1.2;
    }
    return groundY;
  }

  _stepProjectile(p, delta) {
    const radius = 0.08;
    p.velocity.y -= 18.0 * delta;
    p.bounceCooldown = Math.max(0, p.bounceCooldown - delta);

    let bounced = false;
    let impactSpeed = 0;

    // Horizontal X
    const nextX = p.mesh.position.x + p.velocity.x * delta;
    let hitX = false;
    for (const box of this.map.colliders) {
      if (
        nextX + radius > box.min.x && nextX - radius < box.max.x &&
        p.mesh.position.y + radius > box.min.y && p.mesh.position.y - radius < box.max.y &&
        p.mesh.position.z + radius > box.min.z && p.mesh.position.z - radius < box.max.z
      ) {
        hitX = true;
        break;
      }
    }
    if (hitX) {
      impactSpeed = Math.max(impactSpeed, Math.abs(p.velocity.x));
      p.velocity.x = -p.velocity.x * 0.48;
      p.velocity.z *= 0.85;
      bounced = true;
    } else {
      p.mesh.position.x = nextX;
    }

    // Horizontal Z
    const nextZ = p.mesh.position.z + p.velocity.z * delta;
    let hitZ = false;
    for (const box of this.map.colliders) {
      if (
        p.mesh.position.x + radius > box.min.x && p.mesh.position.x - radius < box.max.x &&
        p.mesh.position.y + radius > box.min.y && p.mesh.position.y - radius < box.max.y &&
        nextZ + radius > box.min.z && nextZ - radius < box.max.z
      ) {
        hitZ = true;
        break;
      }
    }
    if (hitZ) {
      impactSpeed = Math.max(impactSpeed, Math.abs(p.velocity.z));
      p.velocity.z = -p.velocity.z * 0.48;
      p.velocity.x *= 0.85;
      bounced = true;
    } else {
      p.mesh.position.z = nextZ;
    }

    // Vertical Y (colliders + terrain/ramps)
    const nextY = p.mesh.position.y + p.velocity.y * delta;
    let floorY = this._getSurfaceHeight(p.mesh.position.x, p.mesh.position.z);
    for (const box of this.map.colliders) {
      if (
        p.mesh.position.x + radius > box.min.x && p.mesh.position.x - radius < box.max.x &&
        p.mesh.position.z + radius > box.min.z && p.mesh.position.z - radius < box.max.z &&
        p.mesh.position.y >= box.max.y - 0.2
      ) {
        floorY = Math.max(floorY, box.max.y);
      }
    }

    if (nextY <= floorY + radius) {
      impactSpeed = Math.max(impactSpeed, Math.abs(p.velocity.y));
      p.mesh.position.y = floorY + radius;
      if (Math.abs(p.velocity.y) > 0.7) {
        p.velocity.y = -p.velocity.y * 0.48;
        p.velocity.x *= 0.75;
        p.velocity.z *= 0.75;
        p.spin.multiplyScalar(0.7);
        bounced = true;
      } else {
        p.velocity.y = 0;
        p.velocity.x *= 0.86;
        p.velocity.z *= 0.86;
      }
    } else {
      p.mesh.position.y = nextY;
    }

    if (bounced && impactSpeed > 1.2 && p.bounceCooldown <= 0) {
      sounds.playGrenadeBounce();
      p.bounceCooldown = 0.08;
    }

    p.mesh.rotation.x += p.spin.x * delta;
    p.mesh.rotation.y += p.spin.y * delta;
    p.mesh.rotation.z += p.spin.z * delta;
  }

  _isOccludedBySolidWall(fromPos, toPos) {
    _TMP_DIR.copy(toPos).sub(fromPos);
    const dist = _TMP_DIR.length();
    if (dist < 0.15) return false;
    _TMP_DIR.divideScalar(dist);

    const raycaster = new THREE.Raycaster(fromPos, _TMP_DIR, 0.05, dist);
    const hits = raycaster.intersectObjects(this.map.raycastMeshes, false);

    for (const h of hits) {
      if (h.distance >= dist - 0.18) break;
      if (classifySurfacePenetration(h.object) === 0) {
        return true;
      }
    }
    return false;
  }

  _spawnExplosionEffect(pos) {
    const fireballMat = new THREE.MeshBasicMaterial({
      color: 0xff7722,
      transparent: true,
      opacity: 0.9
    });
    const fireball = new THREE.Mesh(this.effectSphereGeo, fireballMat);
    fireball.position.copy(pos);
    fireball.scale.setScalar(0.3);
    this.scene.add(fireball);

    this.activeEffects.push({
      mesh: fireball,
      life: 0.42,
      maxLife: 0.42,
      startScale: 0.3,
      endScale: 4.5
    });

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95
    });
    const core = new THREE.Mesh(this.effectSphereGeo, coreMat);
    core.position.copy(pos);
    core.scale.setScalar(0.2);
    this.scene.add(core);

    this.activeEffects.push({
      mesh: core,
      life: 0.24,
      maxLife: 0.24,
      startScale: 0.2,
      endScale: 2.5
    });
  }

  _spawnFlashEffect(pos) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0
    });
    const sphere = new THREE.Mesh(this.effectSphereGeo, mat);
    sphere.position.copy(pos);
    sphere.scale.setScalar(0.35);
    this.scene.add(sphere);

    this.activeEffects.push({
      mesh: sphere,
      life: 0.2,
      maxLife: 0.2,
      startScale: 0.35,
      endScale: 2.2
    });
  }

  _spawnSmokeCloud(pos) {
    sounds.playSmokeBloom();
    const cluster = new THREE.Group();
    cluster.position.copy(pos);
    const sprites = [];

    const puffOffsets = [
      [0, 1.3, 0, 5.2],
      [1.4, 1.1, 0.9, 4.6],
      [-1.4, 1.1, -0.8, 4.6],
      [0.9, 1.2, -1.4, 4.5],
      [-1.1, 1.2, 1.3, 4.5],
      [0, 2.5, 0.3, 4.4],
      [1.7, 1.7, -0.4, 4.0],
      [-1.7, 1.7, 0.4, 4.0],
      [0.4, 1.9, 1.7, 4.0],
      [-0.4, 1.9, -1.7, 4.0],
      [2.1, 0.9, 0.2, 3.6],
      [-2.1, 0.9, -0.2, 3.6],
      [0.2, 0.9, 2.1, 3.6],
      [-0.2, 0.9, -2.1, 3.6]
    ];

    for (const [ox, oy, oz, size] of puffOffsets) {
      const mat = new THREE.SpriteMaterial({
        map: this.smokeTexture,
        color: 0xd1d5db,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(ox, oy, oz);
      sprite.scale.set(size * 0.4, size * 0.4, 1);
      cluster.add(sprite);
      sprites.push({ sprite, mat, targetSize: size, basePos: new THREE.Vector3(ox, oy, oz), phase: Math.random() * Math.PI * 2 });
    }

    this.scene.add(cluster);

    this.activeSmokes.push({
      cluster,
      center: pos.clone().add(new THREE.Vector3(0, 1.5, 0)),
      radius: 3.8,
      age: 0,
      duration: 14.0,
      sprites
    });
  }

  _detonate(p, player, bots, callbacks) {
    const detPos = p.mesh.position.clone().add(new THREE.Vector3(0, 0.2, 0));

    if (p.type === 'he') {
      sounds.playExplosion();
      this._spawnExplosionEffect(detPos);

      // Damage enemy Terrorist bots (respect solid wall occlusion)
      for (const bot of bots) {
        if (!bot.isAlive || bot.team === 'CT') continue;
        const botCenter = bot.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
        const dist = detPos.distanceTo(botCenter);
        if (dist >= 7.5) continue;
        if (this._isOccludedBySolidWall(detPos, botCenter)) continue;

        const { healthDamage, armorDamage } = computeHEDamage(dist, { armor: bot.armor });
        if (healthDamage > 0) {
          const killed = bot.takeDamage(healthDamage, false, armorDamage);
          if (killed && callbacks?.onBotKilledByGrenade) {
            callbacks.onBotKilledByGrenade(bot, 'HE Grenade');
          }
        }
      }

      // Reduced self-damage on player
      if (player && player.isAlive) {
        const playerPos = player.camera.position;
        const dist = detPos.distanceTo(playerPos);
        if (dist < 7.5 && !this._isOccludedBySolidWall(detPos, playerPos)) {
          const { healthDamage } = computeHEDamage(dist, { armor: player.armor });
          const selfDmg = Math.round(healthDamage * 0.55);
          if (selfDmg > 0) {
            player.takeDamage(selfDmg);
          }
        }
      }
    } else if (p.type === 'flash') {
      this._spawnFlashEffect(detPos);

      let playerIntensity = 0;
      if (player && player.isAlive) {
        const pPos = player.camera.position;
        const dist = detPos.distanceTo(pPos);
        const occluded = this._isOccludedBySolidWall(detPos, pPos);
        player.camera.getWorldDirection(_CAM_FWD);
        const res = computeFlashIntensity(detPos, pPos, _CAM_FWD, dist, occluded);
        playerIntensity = res.intensity;
        if (res.duration > 0.05 && callbacks?.onPlayerFlash) {
          callbacks.onPlayerFlash(res.intensity, res.duration);
        }
      }
      sounds.playFlashbang(playerIntensity);

      // Blind nearby bots
      for (const bot of bots) {
        if (!bot.isAlive) continue;
        const botEye = bot.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const dist = detPos.distanceTo(botEye);
        if (dist > 28) continue;
        const occluded = this._isOccludedBySolidWall(detPos, botEye);
        const res = computeFlashIntensity(detPos, botEye, bot.getForwardVector(), dist, occluded);
        if (res.duration > 0.1) {
          bot.applyFlash(res.duration);
        }
      }
    } else if (p.type === 'smoke') {
      this._spawnSmokeCloud(p.mesh.position.clone());
    }
  }

  isLineBlockedBySmoke(pointA, pointB) {
    for (const s of this.activeSmokes) {
      let scale = 1.0;
      if (s.age < 0.6) {
        scale = 0.35 + (s.age / 0.6) * 0.65;
      } else if (s.age > s.duration - 2.5) {
        const rem = Math.max(0, s.duration - s.age);
        scale = 0.25 + (rem / 2.5) * 0.75;
      }
      if (doesSegmentIntersectSphere(pointA, pointB, s.center, s.radius * scale)) {
        return true;
      }
    }
    return false;
  }

  update(delta, player, bots, callbacks = {}) {
    // 1. Update flying/bouncing projectiles
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeProjectiles[i];
      this._stepProjectile(p, delta);
      p.fuse -= delta;

      if (p.fuse <= 0) {
        this._detonate(p, player, bots, callbacks);
        this.scene.remove(p.mesh);
        this.activeProjectiles.splice(i, 1);
      }
    }

    // 2. Update explosion & flash sphere effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const fx = this.activeEffects[i];
      fx.life -= delta;
      if (fx.life <= 0) {
        this.scene.remove(fx.mesh);
        fx.mesh.material.dispose();
        this.activeEffects.splice(i, 1);
        continue;
      }
      const progress = 1 - fx.life / fx.maxLife;
      const scale = THREE.MathUtils.lerp(fx.startScale, fx.endScale, progress);
      fx.mesh.scale.setScalar(scale);
      fx.mesh.material.opacity = (1 - progress) * 0.9;
    }

    // 3. Update active smoke clouds
    for (let i = this.activeSmokes.length - 1; i >= 0; i--) {
      const s = this.activeSmokes[i];
      s.age += delta;
      if (s.age >= s.duration) {
        this.scene.remove(s.cluster);
        for (const item of s.sprites) {
          item.mat.dispose();
        }
        this.activeSmokes.splice(i, 1);
        continue;
      }

      let grow = 1.0;
      let alpha = 0.92;
      if (s.age < 0.6) {
        grow = 0.35 + (s.age / 0.6) * 0.65;
        alpha = (s.age / 0.6) * 0.92;
      } else if (s.age > s.duration - 2.5) {
        const rem = Math.max(0, s.duration - s.age);
        alpha = (rem / 2.5) * 0.92;
      }

      for (const item of s.sprites) {
        const sz = item.targetSize * grow;
        item.sprite.scale.set(sz, sz, 1);
        item.sprite.position.set(
          item.basePos.x * grow + Math.sin(s.age * 0.9 + item.phase) * 0.14,
          item.basePos.y * grow + Math.cos(s.age * 0.7 + item.phase) * 0.08,
          item.basePos.z * grow
        );
        item.mat.opacity = alpha;
      }
    }
  }
}
