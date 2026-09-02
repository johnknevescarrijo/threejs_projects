import * as THREE from 'three';
import { createCelMaterial, attachOutline } from '../shaders/CelShading.js';

/**
 * BuildingSystem - Holographic structure preview, intelligent grid-snapping, and construction
 */

export class BuildingSystem {
  constructor(scene, terrain, inventory, particleSystem, audioManager) {
    this.scene = scene;
    this.terrain = terrain;
    this.inventory = inventory;
    this.particles = particleSystem;
    this.audio = audioManager;

    this.structures = [];
    this.isBuildingMode = false;
    this.currentStructureType = null; // 'foundation', 'wall', 'ceiling', 'door', 'campfire'
    this.hologramGroup = new THREE.Group();
    this.scene.add(this.hologramGroup);
    this.hologramGroup.visible = false;

    this.isValidPlacement = false;
    this.buildDistance = 7.0;

    // Materials
    this.hologramValidMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    this.hologramInvalidMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });

    this.woodMat = createCelMaterial({ color: 0x734822, flatShading: true });
    this.plankMat = createCelMaterial({ color: 0x8f5c2c, flatShading: true });
    this.stoneMat = createCelMaterial({ color: 0x64748b, flatShading: true });
  }

  // Structure Mesh Builders
  createFoundationMesh(isHologram = false) {
    const group = new THREE.Group();
    const mat = isHologram ? this.hologramValidMat : this.woodMat;
    const geom = new THREE.BoxGeometry(3.0, 0.4, 3.0);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.2;
    group.add(mesh);

    if (!isHologram) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      attachOutline(mesh, 0.04, 0x1f1105);

      // Wood plank details
      for (let p = 0; p < 4; p++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 2.9), this.plankMat);
        plank.position.set(-1.05 + p * 0.7, 0.42, 0);
        attachOutline(plank, 0.02, 0x1f1105);
        group.add(plank);
      }
    }
    group.userData.structureType = 'foundation';
    return group;
  }

  createWallMesh(isHologram = false) {
    const group = new THREE.Group();
    const mat = isHologram ? this.hologramValidMat : this.woodMat;
    const geom = new THREE.BoxGeometry(3.0, 2.8, 0.3);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 1.4;
    group.add(mesh);

    if (!isHologram) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      attachOutline(mesh, 0.04, 0x1f1105);

      // Horizontal logs
      for (let l = 0; l < 4; l++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.95, 5), this.plankMat);
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0.4 + l * 0.65, 0);
        attachOutline(log, 0.02, 0x1f1105);
        group.add(log);
      }
    }
    group.userData.structureType = 'wall';
    return group;
  }

  createCeilingMesh(isHologram = false) {
    const group = new THREE.Group();
    const mat = isHologram ? this.hologramValidMat : this.plankMat;
    const geom = new THREE.BoxGeometry(3.0, 0.25, 3.0);
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    if (!isHologram) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      attachOutline(mesh, 0.04, 0x1f1105);
    }
    group.userData.structureType = 'ceiling';
    return group;
  }

  createDoorMesh(isHologram = false) {
    const group = new THREE.Group();
    const mat = isHologram ? this.hologramValidMat : this.woodMat;
    
    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.8, 0.3), mat);
    frame.position.y = 1.4;
    group.add(frame);

    // Opening cutout / door
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.2), this.plankMat);
    door.position.set(0, 1.1, 0.05);
    group.add(door);

    if (!isHologram) {
      frame.castShadow = true;
      attachOutline(frame, 0.04, 0x1f1105);
      attachOutline(door, 0.03, 0x1f1105);
    }
    group.userData.structureType = 'door';
    return group;
  }

  createCampfireMesh(isHologram = false) {
    const group = new THREE.Group();
    const mat = isHologram ? this.hologramValidMat : this.stoneMat;

    // Stone ring
    for (let r = 0; r < 7; r++) {
      const angle = (r / 7) * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), mat);
      rock.position.set(Math.cos(angle) * 0.65, 0.15, Math.sin(angle) * 0.65);
      if (!isHologram) attachOutline(rock, 0.02, 0x11161d);
      group.add(rock);
    }

    // Wood logs
    for (let w = 0; w < 3; w++) {
      const angle = (w / 3) * Math.PI;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 5), this.woodMat);
      log.rotation.z = Math.PI / 3;
      log.rotation.y = angle;
      log.position.set(0, 0.25, 0);
      if (!isHologram) attachOutline(log, 0.02, 0x1f1105);
      group.add(log);
    }

    if (!isHologram) {
      // Fire flame
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.6, 5),
        new THREE.MeshBasicMaterial({ color: 0xff6600 })
      );
      flame.position.y = 0.45;
      attachOutline(flame, 0.02, 0x4a1800);
      group.add(flame);

      const light = new THREE.PointLight(0xff7722, 2.0, 14);
      light.position.y = 0.6;
      group.add(light);
    }

    group.userData.structureType = 'campfire';
    return group;
  }

  // Set active structure to build
  startBuilding(structureType) {
    this.isBuildingMode = true;
    this.currentStructureType = structureType;
    this.rebuildHologram();
    this.hologramGroup.visible = true;
  }

  stopBuilding() {
    this.isBuildingMode = false;
    this.currentStructureType = null;
    this.hologramGroup.visible = false;
  }

  rebuildHologram() {
    // Clear old hologram meshes
    while (this.hologramGroup.children.length > 0) {
      this.hologramGroup.remove(this.hologramGroup.children[0]);
    }

    let mesh = null;
    switch (this.currentStructureType) {
      case 'foundation': mesh = this.createFoundationMesh(true); break;
      case 'wall': mesh = this.createWallMesh(true); break;
      case 'ceiling': mesh = this.createCeilingMesh(true); break;
      case 'door': mesh = this.createDoorMesh(true); break;
      case 'campfire': mesh = this.createCampfireMesh(true); break;
      default: return;
    }

    this.hologramGroup.add(mesh);
  }

  updateHologram(cameraRay, player) {
    if (!this.isBuildingMode || !this.currentStructureType) {
      this.hologramGroup.visible = false;
      return;
    }

    this.hologramGroup.visible = true;

    // Raycast forward from camera to find build position
    const origin = cameraRay.origin;
    const dir = cameraRay.direction;
    const targetPos = origin.clone().addScaledVector(dir, this.buildDistance);

    // Snap to existing structures first
    let snapped = false;
    const snapDistance = 1.8;

    for (const struct of this.structures) {
      const sPos = struct.position;
      const sType = struct.userData.structureType;

      if (this.currentStructureType === 'foundation' && sType === 'foundation') {
        const dx = targetPos.x - sPos.x;
        const dz = targetPos.z - sPos.z;
        if (Math.abs(dx) < 3.5 && Math.abs(dz) < 3.5) {
          // Snap adjacent to foundation
          if (Math.abs(dx) > Math.abs(dz)) {
            this.hologramGroup.position.set(sPos.x + (dx > 0 ? 3.0 : -3.0), sPos.y, sPos.z);
          } else {
            this.hologramGroup.position.set(sPos.x, sPos.y, sPos.z + (dz > 0 ? 3.0 : -3.0));
          }
          this.hologramGroup.rotation.y = 0;
          snapped = true;
          break;
        }
      } else if (this.currentStructureType === 'wall' && sType === 'foundation') {
        const dx = targetPos.x - sPos.x;
        const dz = targetPos.z - sPos.z;
        if (Math.abs(dx) < 2.0 && Math.abs(dz) < 2.0) {
          // Snap wall to one of 4 edges of foundation
          if (Math.abs(dx) > Math.abs(dz)) {
            this.hologramGroup.position.set(sPos.x + (dx > 0 ? 1.5 : -1.5), sPos.y, sPos.z);
            this.hologramGroup.rotation.y = Math.PI / 2;
          } else {
            this.hologramGroup.position.set(sPos.x, sPos.y, sPos.z + (dz > 0 ? 1.5 : -1.5));
            this.hologramGroup.rotation.y = 0;
          }
          snapped = true;
          break;
        }
      } else if (this.currentStructureType === 'ceiling' && sType === 'wall') {
        const dist = targetPos.distanceTo(sPos);
        if (dist < 3.5) {
          this.hologramGroup.position.set(sPos.x, sPos.y + 2.8, sPos.z);
          this.hologramGroup.rotation.y = 0;
          snapped = true;
          break;
        }
      }
    }

    if (!snapped) {
      // Free placement on terrain ground
      const groundH = this.terrain.getHeight(targetPos.x, targetPos.z);
      this.hologramGroup.position.set(targetPos.x, groundH, targetPos.z);
      // Align with player view yaw
      this.hologramGroup.rotation.y = Math.round(player.cameraYaw / (Math.PI / 2)) * (Math.PI / 2);
    }

    this.isValidPlacement = this.hologramGroup.position.y > 0.5;

    // Update hologram material color (green = valid, red = invalid)
    this.hologramGroup.traverse(child => {
      if (child.isMesh) {
        child.material = this.isValidPlacement ? this.hologramValidMat : this.hologramInvalidMat;
      }
    });
  }

  // Commit structure placement
  placeStructure() {
    if (!this.isBuildingMode || !this.isValidPlacement || !this.currentStructureType) return false;

    const itemId = `structure_${this.currentStructureType}`;
    if (!this.inventory.removeItem(itemId, 1)) {
      return false;
    }

    let realMesh = null;
    switch (this.currentStructureType) {
      case 'foundation': realMesh = this.createFoundationMesh(false); break;
      case 'wall': realMesh = this.createWallMesh(false); break;
      case 'ceiling': realMesh = this.createCeilingMesh(false); break;
      case 'door': realMesh = this.createDoorMesh(false); break;
      case 'campfire': realMesh = this.createCampfireMesh(false); break;
    }

    if (realMesh) {
      realMesh.position.copy(this.hologramGroup.position);
      realMesh.rotation.copy(this.hologramGroup.rotation);
      this.scene.add(realMesh);
      this.structures.push(realMesh);

      this.audio.playBuildPlacement();
      this.particles.spawnWoodChips(realMesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 10);
    }

    // Stop building if ran out of item
    if (this.inventory.getItemCount(itemId) <= 0) {
      this.stopBuilding();
    }

    return true;
  }
}
