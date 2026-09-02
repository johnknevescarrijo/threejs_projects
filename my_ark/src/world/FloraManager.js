import * as THREE from 'three';
import { createCelMaterial, attachOutline } from '../shaders/CelShading.js';

/**
 * FloraManager - Generates cel-shaded harvestable trees, boulders, and berry bushes
 */

export class FloraManager {
  constructor(scene, terrain, particleSystem, audioManager) {
    this.scene = scene;
    this.terrain = terrain;
    this.particles = particleSystem;
    this.audio = audioManager;

    this.props = [];
    this.initProps();
  }

  // --- MESH BUILDERS ---

  // Build a stylized Jungle Palm Tree
  createPalmTree() {
    const group = new THREE.Group();
    group.userData.type = 'tree_palm';
    group.userData.resource = 'wood';
    group.userData.maxHp = 100;
    group.userData.hp = 100;

    const trunkMat = createCelMaterial({ color: 0x8b5a2b, flatShading: true });
    const leafMat = createCelMaterial({ color: 0x2e8540, flatShading: true });

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.35, 0.6, 6.5, 7);
    trunkGeom.translate(0, 3.25, 0);
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    attachOutline(trunk, 0.045, 0x1c1005);
    group.add(trunk);

    // Palm Fronds / Leaves
    const frondCount = 7;
    for (let i = 0; i < frondCount; i++) {
      const angle = (i / frondCount) * Math.PI * 2;
      const leafGeom = new THREE.ConeGeometry(1.6, 4.2, 5);
      leafGeom.rotateX(Math.PI / 3);
      leafGeom.translate(0, 0, 1.8);
      const leaf = new THREE.Mesh(leafGeom, leafMat);
      leaf.position.set(0, 6.2, 0);
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      attachOutline(leaf, 0.04, 0x09260e);
      group.add(leaf);
    }

    return group;
  }

  // Build a stylized Savanna Acacia Tree
  createAcaciaTree() {
    const group = new THREE.Group();
    group.userData.type = 'tree_acacia';
    group.userData.resource = 'wood';
    group.userData.maxHp = 100;
    group.userData.hp = 100;

    const trunkMat = createCelMaterial({ color: 0x754e24, flatShading: true });
    const leafMat = createCelMaterial({ color: 0x889c2c, flatShading: true });

    // Main Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.4, 0.7, 5.0, 6);
    trunkGeom.translate(0, 2.5, 0);
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.castShadow = true;
    attachOutline(trunk, 0.045, 0x1c1005);
    group.add(trunk);

    // Wide flat umbrella canopy
    const canopyGeom = new THREE.CylinderGeometry(4.5, 2.5, 1.2, 8);
    canopyGeom.translate(0, 5.2, 0);
    const canopy = new THREE.Mesh(canopyGeom, leafMat);
    canopy.castShadow = true;
    attachOutline(canopy, 0.05, 0x1f2605);
    group.add(canopy);

    const topTuft = new THREE.CylinderGeometry(2.8, 3.8, 0.8, 7);
    topTuft.translate(0, 6.0, 0);
    const tuft = new THREE.Mesh(topTuft, leafMat);
    attachOutline(tuft, 0.04, 0x1f2605);
    group.add(tuft);

    return group;
  }

  // Build a stylized Highland Pine Tree
  createPineTree() {
    const group = new THREE.Group();
    group.userData.type = 'tree_pine';
    group.userData.resource = 'wood';
    group.userData.maxHp = 100;
    group.userData.hp = 100;

    const trunkMat = createCelMaterial({ color: 0x543b22, flatShading: true });
    const leafMat = createCelMaterial({ color: 0x224838, flatShading: true });

    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 5.5, 6);
    trunkGeom.translate(0, 2.75, 0);
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    attachOutline(trunk, 0.04, 0x120a03);
    group.add(trunk);

    // 3 Conical Tiers
    const tiers = [
      { r: 2.8, h: 2.5, y: 3.5 },
      { r: 2.1, h: 2.2, y: 5.0 },
      { r: 1.3, h: 2.0, y: 6.5 }
    ];

    tiers.forEach(tier => {
      const coneGeom = new THREE.ConeGeometry(tier.r, tier.h, 6);
      coneGeom.translate(0, tier.y, 0);
      const cone = new THREE.Mesh(coneGeom, leafMat);
      cone.castShadow = true;
      attachOutline(cone, 0.04, 0x071710);
      group.add(cone);
    });

    return group;
  }

  // Build a stylized Low-Poly Boulder / Rock
  createRock() {
    const group = new THREE.Group();
    group.userData.type = 'rock';
    group.userData.resource = 'stone';
    group.userData.maxHp = 120;
    group.userData.hp = 120;

    const rockMat = createCelMaterial({ color: 0x6e7682, flatShading: true, roughness: 0.9 });
    const rockGeom = new THREE.DodecahedronGeometry(1.6, 0);
    
    // Deform vertices for natural faceted boulder look
    const pos = rockGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      pos.setXYZ(i, vx * (0.8 + Math.random() * 0.4), vy * (0.6 + Math.random() * 0.3), vz * (0.8 + Math.random() * 0.4));
    }
    rockGeom.computeVertexNormals();

    const rock = new THREE.Mesh(rockGeom, rockMat);
    rock.position.y = 1.0;
    rock.castShadow = true;
    rock.receiveShadow = true;
    attachOutline(rock, 0.045, 0x11161d);
    group.add(rock);

    return group;
  }

  // Build a stylized Berry Bush
  createBush() {
    const group = new THREE.Group();
    group.userData.type = 'bush';
    group.userData.resource = 'fiber';
    group.userData.maxHp = 40;
    group.userData.hp = 40;

    const bushMat = createCelMaterial({ color: 0x3da849, flatShading: true });
    const berryMat1 = createCelMaterial({ color: 0xde3140, flatShading: true }); // Amarberry/Tintoberry
    const berryMat2 = createCelMaterial({ color: 0x8a38b5, flatShading: true }); // Mejoberry

    // Foliage clusters
    const clusterGeom = new THREE.IcosahedronGeometry(1.1, 1);
    const m1 = new THREE.Mesh(clusterGeom, bushMat);
    m1.position.set(0, 0.9, 0);
    m1.scale.set(1.4, 0.9, 1.2);
    attachOutline(m1, 0.035, 0x0e2e12);
    group.add(m1);

    // Berries dotted on bush
    for (let b = 0; b < 8; b++) {
      const bGeom = new THREE.SphereGeometry(0.16, 5, 4);
      const bMesh = new THREE.Mesh(bGeom, b % 2 === 0 ? berryMat1 : berryMat2);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      bMesh.position.set(
        Math.sin(theta) * 1.1,
        0.8 + Math.cos(phi) * 0.5,
        Math.cos(theta) * 1.1
      );
      attachOutline(bMesh, 0.02, 0x110205);
      group.add(bMesh);
    }

    return group;
  }

  // Populate Island with organic flora
  initProps() {
    const propCount = 180;
    const islandRadius = 120;

    for (let i = 0; i < propCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.7) * islandRadius;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = this.terrain.getHeight(x, z);

      if (y < 1.0) continue; // Don't spawn under ocean

      const biome = this.terrain.biomeManager.getBiomeAt(x, z, y);
      let prop = null;
      const roll = Math.random();

      if (biome.id === 'coast') {
        if (roll < 0.45) prop = this.createPalmTree();
        else if (roll < 0.75) prop = this.createBush();
        else prop = this.createRock();
      } else if (biome.id === 'jungle') {
        if (roll < 0.55) prop = this.createPalmTree();
        else if (roll < 0.8) prop = this.createBush();
        else prop = this.createRock();
      } else if (biome.id === 'plains') {
        if (roll < 0.35) prop = this.createAcaciaTree();
        else if (roll < 0.7) prop = this.createBush();
        else prop = this.createRock();
      } else {
        // Highlands
        if (roll < 0.4) prop = this.createPineTree();
        else if (roll < 0.85) prop = this.createRock();
        else prop = this.createBush();
      }

      if (prop) {
        prop.position.set(x, y, z);
        prop.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.85 + Math.random() * 0.4;
        prop.scale.set(scale, scale, scale);

        prop.userData.initialScale = scale;
        prop.userData.wobble = 0;
        prop.userData.respawnTimer = 0;
        prop.userData.isAlive = true;

        this.scene.add(prop);
        this.props.push(prop);
      }
    }
  }

  // Interactive Harvesting hit
  hitProp(prop, toolType = 'fists') {
    if (!prop || !prop.userData.isAlive) return null;

    let damage = 20;
    const type = prop.userData.type;
    let yieldData = {};

    if (type.startsWith('tree')) {
      if (toolType === 'axe') {
        damage = 35;
        yieldData = { wood: 12 + Math.floor(Math.random() * 6), thatch: 3 };
      } else if (toolType === 'pickaxe') {
        damage = 30;
        yieldData = { wood: 3, thatch: 12 + Math.floor(Math.random() * 6) };
      } else {
        damage = 15;
        yieldData = { wood: 2, thatch: 2 };
      }
      this.audio.playChop();
      this.particles.spawnWoodChips(prop.position.clone().add(new THREE.Vector3(0, 2, 0)), 8);
    } else if (type === 'rock') {
      if (toolType === 'pickaxe') {
        damage = 35;
        yieldData = { stone: 14 + Math.floor(Math.random() * 6), flint: 5 + Math.floor(Math.random() * 4) };
      } else if (toolType === 'axe') {
        damage = 25;
        yieldData = { stone: 5, flint: 1 };
      } else {
        damage = 10;
        yieldData = { stone: 1 };
      }
      this.audio.playMine();
      this.particles.spawnStoneDebris(prop.position.clone().add(new THREE.Vector3(0, 1, 0)), 9);
    } else if (type === 'bush') {
      damage = 40;
      yieldData = {
        fiber: 8 + Math.floor(Math.random() * 5),
        berry_red: 2 + Math.floor(Math.random() * 3),
        berry_purple: 2 + Math.floor(Math.random() * 3)
      };
      this.audio.playHarvestBush();
      this.particles.spawnFoliage(prop.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 12);
    }

    prop.userData.hp -= damage;
    prop.userData.wobble = 0.35; // Trigger wobble visual feedback

    if (prop.userData.hp <= 0) {
      // Destroy prop
      prop.userData.isAlive = false;
      prop.visible = false;
      prop.userData.respawnTimer = 60.0; // 60s respawn
    }

    return yieldData;
  }

  // Quick harvest bush with [E]
  harvestBushDirect(prop) {
    if (!prop || prop.userData.type !== 'bush' || !prop.userData.isAlive) return null;
    return this.hitProp(prop, 'fists');
  }

  update(delta) {
    this.props.forEach(prop => {
      // Animate wobble on impact
      if (prop.userData.wobble > 0) {
        prop.userData.wobble -= delta * 2.5;
        const w = Math.sin(prop.userData.wobble * 25) * prop.userData.wobble * 0.15;
        prop.rotation.z = w;
        if (prop.userData.wobble <= 0) {
          prop.rotation.z = 0;
          prop.userData.wobble = 0;
        }
      }

      // Respawn timer
      if (!prop.userData.isAlive) {
        prop.userData.respawnTimer -= delta;
        if (prop.userData.respawnTimer <= 0) {
          prop.userData.isAlive = true;
          prop.userData.hp = prop.userData.maxHp;
          prop.visible = true;
        }
      }
    });
  }
}
