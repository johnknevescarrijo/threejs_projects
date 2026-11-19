import * as THREE from 'three';
import { computeSurfaceHeight } from '../world/surfaceHeight.js';

export class DroppedWeaponManager {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.items = [];
    this.maxDropped = 8;

    this._createSharedAssets();
  }

  _createSharedAssets() {
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.ringGeo = new THREE.RingGeometry(0.28, 0.34, 16);
    this.ringGeo.rotateX(-Math.PI / 2);

    this.mats = {
      rifles: new THREE.MeshStandardMaterial({ color: 0x6b3a1e, roughness: 0.55, metalness: 0.4 }),
      snipers: new THREE.MeshStandardMaterial({ color: 0x3b4f30, roughness: 0.5, metalness: 0.45 }),
      smgs: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.65 }),
      shotguns: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.55 }),
      pistols: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 }),
      barrel: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.85 })
    };
  }

  _buildDroppedMesh(weaponSpec) {
    const group = new THREE.Group();
    const cat = weaponSpec.category || 'rifles';
    const bodyMat = this.mats[cat] || this.mats.rifles;

    const isPistol = cat === 'pistols';
    const isSniper = cat === 'snipers';
    const len = isPistol ? 0.24 : (isSniper ? 0.95 : 0.68);
    const height = isPistol ? 0.14 : 0.14;
    const width = 0.06;

    const body = new THREE.Mesh(this.boxGeo, bodyMat);
    body.scale.set(width, height, len);
    body.castShadow = true;
    group.add(body);

    const barrel = new THREE.Mesh(this.boxGeo, this.mats.barrel);
    barrel.scale.set(width * 0.45, height * 0.35, len * 0.55);
    barrel.position.set(0, height * 0.2, len * 0.45);
    group.add(barrel);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.position.y = -0.05;
    group.add(ring);

    return { group, ring, ringMat };
  }

  dropWeapon(weaponSpec, currentAmmo, reserveAmmo, origin, forwardDir) {
    if (!weaponSpec || weaponSpec.slot === 3 || weaponSpec.isMelee) return null;

    // Enforce FIFO cap
    if (this.items.length >= this.maxDropped) {
      const oldest = this.items[0];
      this.removeDropped(oldest);
    }

    const { group, ring, ringMat } = this._buildDroppedMesh(weaponSpec);
    group.position.copy(origin);
    group.rotation.y = Math.atan2(forwardDir.x, forwardDir.z);
    this.scene.add(group);

    const velocity = forwardDir.clone().normalize().multiplyScalar(5.2);
    velocity.y += 2.0;

    const item = {
      weaponId: weaponSpec.id,
      weaponSpec,
      currentAmmo,
      reserveAmmo,
      mesh: group,
      ring,
      ringMat,
      velocity,
      pickupCooldown: 0.65,
      resting: false
    };

    this.items.push(item);
    return item;
  }

  _getSurfaceHeight(x, z, currentY = Infinity, stepOffset = 0.2) {
    return computeSurfaceHeight(x, z, this.map, currentY, stepOffset);
  }

  update(delta, playerPos = null) {
    const r = 0.22;
    for (const item of this.items) {
      if (item.pickupCooldown > 0) {
        item.pickupCooldown = Math.max(0, item.pickupCooldown - delta);
      }

      if (!item.resting) {
        item.velocity.y -= 18.0 * delta;

        const nextX = item.mesh.position.x + item.velocity.x * delta;
        let hitX = false;
        for (const box of this.map.colliders) {
          if (
            nextX + r > box.min.x && nextX - r < box.max.x &&
            item.mesh.position.y + r > box.min.y && item.mesh.position.y - r < box.max.y &&
            item.mesh.position.z + r > box.min.z && item.mesh.position.z - r < box.max.z
          ) {
            hitX = true;
            break;
          }
        }
        if (hitX) item.velocity.x = -item.velocity.x * 0.35;
        else item.mesh.position.x = nextX;

        const nextZ = item.mesh.position.z + item.velocity.z * delta;
        let hitZ = false;
        for (const box of this.map.colliders) {
          if (
            item.mesh.position.x + r > box.min.x && item.mesh.position.x - r < box.max.x &&
            item.mesh.position.y + r > box.min.y && item.mesh.position.y - r < box.max.y &&
            nextZ + r > box.min.z && nextZ - r < box.max.z
          ) {
            hitZ = true;
            break;
          }
        }
        if (hitZ) item.velocity.z = -item.velocity.z * 0.35;
        else item.mesh.position.z = nextZ;

        const nextY = item.mesh.position.y + item.velocity.y * delta;
        const floorY = this._getSurfaceHeight(item.mesh.position.x, item.mesh.position.z, item.mesh.position.y, 0.2);

        if (nextY <= floorY + 0.08) {
          item.mesh.position.y = floorY + 0.08;
          if (Math.abs(item.velocity.y) > 0.9) {
            item.velocity.y = -item.velocity.y * 0.35;
            item.velocity.x *= 0.55;
            item.velocity.z *= 0.55;
          } else {
            item.velocity.set(0, 0, 0);
            item.resting = true;
          }
        } else {
          item.mesh.position.y = nextY;
        }
      }

      // Highlight ring when player is near
      if (playerPos) {
        const dx = item.mesh.position.x - playerPos.x;
        const dz = item.mesh.position.z - playerPos.z;
        const dist = Math.hypot(dx, dz);
        item.ringMat.opacity = dist < 2.6 ? 0.72 : 0.22;
      }
    }
  }

  findAutoPickup(playerPos, emptySlots) {
    if (!emptySlots || emptySlots.length === 0) return null;
    let best = null;
    let bestDist = 1.35;

    for (const item of this.items) {
      if (item.pickupCooldown > 0) continue;
      if (!emptySlots.includes(item.weaponSpec.slot)) continue;

      const dist = Math.hypot(
        item.mesh.position.x - playerPos.x,
        item.mesh.position.z - playerPos.z
      );
      const dy = Math.abs(item.mesh.position.y - (playerPos.y - 1.4));
      if (dist < bestDist && dy < 1.8) {
        bestDist = dist;
        best = item;
      }
    }
    return best;
  }

  findInteractTarget(playerPos, camera) {
    let best = null;
    let bestScore = Infinity;
    const camDir = new THREE.Vector3();
    if (camera) camera.getWorldDirection(camDir);

    for (const item of this.items) {
      if (item.pickupCooldown > 0) continue;
      const dx = item.mesh.position.x - playerPos.x;
      const dy = item.mesh.position.y - (playerPos.y - 1.4);
      const dz = item.mesh.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 2.4 || Math.abs(dy) > 2.0) continue;

      let score = dist;
      if (camera && dist > 0.05) {
        const toItem = new THREE.Vector3(
          item.mesh.position.x - playerPos.x,
          item.mesh.position.y - playerPos.y,
          item.mesh.position.z - playerPos.z
        ).normalize();
        const dot = camDir.dot(toItem);
        score -= dot * 0.8;
      }

      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    }
    return best;
  }

  removeDropped(item) {
    const idx = this.items.indexOf(item);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }
    if (item?.mesh) {
      this.scene.remove(item.mesh);
    }
    if (item?.ringMat) {
      item.ringMat.dispose();
    }
  }
}
