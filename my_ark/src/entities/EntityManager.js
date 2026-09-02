import * as THREE from 'three';
import { PackHunter } from './PackHunter.js';
import { Herbivore } from './Herbivore.js';
import { ApexPredator } from './ApexPredator.js';

/**
 * EntityManager - Manages population, spawning, and biome distribution of dinosaurs
 */

export class EntityManager {
  constructor(scene, terrain, particleSystem, audioManager) {
    this.scene = scene;
    this.terrain = terrain;
    this.particles = particleSystem;
    this.audio = audioManager;

    this.dinosaurs = [];
    this.spawnPopulations();
  }

  spawnPopulations() {
    // 1. Spawn Herbivore Herds (Plains & Coast)
    const herbivoreCount = 6;
    for (let i = 0; i < herbivoreCount; i++) {
      const angle = (i / herbivoreCount) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 30 + Math.random() * 50;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = this.terrain.getHeight(x, z);

      if (y > 1.5) {
        const dino = new Herbivore(this.scene, this.terrain, this.particles, this.audio, {
          name: `Parasauro #${i + 1}`
        });
        dino.group.position.set(x, y, z);
        dino.group.rotation.y = Math.random() * Math.PI * 2;
        this.dinosaurs.push(dino);
      }
    }

    // 2. Spawn Raptor Packs (Jungle & Plains borders)
    const raptorCount = 5;
    for (let i = 0; i < raptorCount; i++) {
      const angle = 1.0 + (i / raptorCount) * 2.5 + (Math.random() - 0.5) * 0.4;
      const dist = 45 + Math.random() * 40;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = this.terrain.getHeight(x, z);

      if (y > 1.5) {
        const raptor = new PackHunter(this.scene, this.terrain, this.particles, this.audio, {
          name: `Raptor #${i + 1}`
        });
        raptor.group.position.set(x, y, z);
        raptor.group.rotation.y = Math.random() * Math.PI * 2;
        this.dinosaurs.push(raptor);
      }
    }

    // 3. Spawn Apex Predator T-Rex (Highlands / Central Crag)
    const apexPos = [
      { x: 15, z: 25 },
      { x: -30, z: -35 }
    ];

    apexPos.forEach((p, idx) => {
      const y = this.terrain.getHeight(p.x, p.z);
      const trex = new ApexPredator(this.scene, this.terrain, this.particles, this.audio, {
        name: `T-Rex Ápice #${idx + 1}`
      });
      trex.group.position.set(p.x, y, p.z);
      trex.group.rotation.y = Math.random() * Math.PI * 2;
      this.dinosaurs.push(trex);
    });
  }

  getClosestDinosaur(position, maxDistance = 6.0) {
    let closest = null;
    let minDist = maxDistance;

    for (const dino of this.dinosaurs) {
      if (dino.state === 'DEAD') continue;
      const d = dino.group.position.distanceTo(position);
      if (d < minDist) {
        minDist = d;
        closest = dino;
      }
    }

    return closest;
  }

  getDinosInRadius(position, radius = 5.0) {
    return this.dinosaurs.filter(dino => {
      return dino.state !== 'DEAD' && dino.group.position.distanceTo(position) <= radius;
    });
  }

  update(delta, player) {
    for (let i = this.dinosaurs.length - 1; i >= 0; i--) {
      const dino = this.dinosaurs[i];
      if (dino.state === 'DEAD' && !dino.group.parent) {
        this.dinosaurs.splice(i, 1);
        continue;
      }
      dino.update(delta, player);
    }
  }
}
