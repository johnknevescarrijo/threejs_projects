import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

/**
 * ParticleSystem - Gerencia santinhos eleitorais voando, faíscas de impacto,
 * estrelas de desenho animado e efeitos de projéteis especiais.
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.projectiles = [];

    // Cache de texturas de santinhos
    this.santinhoTextures = {
      lula: TextureGenerator.createSantinhoTexture('lula', '13'),
      flavio: TextureGenerator.createSantinhoTexture('flavio', '22'),
      renan: TextureGenerator.createSantinhoTexture('renan', '44'),
      caiado: TextureGenerator.createSantinhoTexture('caiado', '25'),
      curry: TextureGenerator.createSantinhoTexture('curry', '30')
    };

    // Geometria reutilizável de santinho
    this.santinhoGeo = new THREE.PlaneGeometry(0.2, 0.28);

    // Textura da Urna para o especial do Curry
    this.urnaTexture = TextureGenerator.createUrnaTexture();
    this.picanhaTexture = TextureGenerator.createPicanhaTexture();
    this.bombomTexture = TextureGenerator.createBombomTexture();
  }

  /**
   * Dispara uma rajada de "Santinhos Eleitorais" voando do candidato golpeado
   */
  spawnSantinhos(pos, characterId, count = 8) {
    const tex = this.santinhoTextures[characterId] || this.santinhoTextures.lula;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.santinhoGeo, mat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.4,
        pos.y + (Math.random() - 0.5) * 0.6,
        pos.z + (Math.random() - 0.5) * 0.4
      );

      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 4.5,
          2.5 + Math.random() * 3.5,
          (Math.random() - 0.5) * 3
        ),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12
        ),
        gravity: -7.5,
        drag: 0.96,
        life: 1.0,
        decay: 0.4 + Math.random() * 0.3
      });
    }
  }

  /**
   * Faíscas de impacto / pancada
   */
  spawnHitSparks(pos, color = 0xffe600, count = 12) {
    const sparkGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const sparkMat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.5;

      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed + 1.5,
          (Math.random() - 0.5) * 2
        ),
        gravity: -10,
        drag: 0.92,
        life: 1.0,
        decay: 2.2 + Math.random() * 1.5
      });
    }
  }

  /**
   * Bloqueio com ondas de choque azuis
   */
  spawnBlockSparks(pos) {
    this.spawnHitSparks(pos, 0x00e5ff, 8);
  }

  /**
   * Cria Projétil de Especial Temático
   */
  spawnSpecialProjectile(characterId, fromPos, direction, targetFighter, onHitCallback) {
    let mesh;
    let projData = {
      characterId,
      direction,
      targetFighter,
      onHit: onHitCallback,
      active: true,
      time: 0
    };

    switch (characterId) {
      case 'lula':
        // Chuva de Picanha Cósmica: Picanha suculenta em 3D giratória com rastro de estrelas
        const picGeo = new THREE.PlaneGeometry(1.2, 0.9);
        const picMat = new THREE.MeshBasicMaterial({
          map: this.picanhaTexture,
          transparent: true,
          side: THREE.DoubleSide
        });
        mesh = new THREE.Mesh(picGeo, picMat);
        mesh.position.set(fromPos.x + direction * 1.2, fromPos.y + 1.2, fromPos.z);
        projData.vel = new THREE.Vector3(direction * 7.5, 0.2, 0);
        projData.maxLife = 2.2;
        break;

      case 'flavio':
        // Caixa de Bombom Explosiva
        const bonGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
        const bonMat = new THREE.MeshStandardMaterial({
          map: this.bombomTexture,
          metalness: 0.4,
          roughness: 0.3
        });
        mesh = new THREE.Mesh(bonGeo, bonMat);
        mesh.position.set(fromPos.x + direction * 1.2, fromPos.y + 1.2, fromPos.z);
        projData.vel = new THREE.Vector3(direction * 9.0, 0, 0);
        projData.maxLife = 2.0;
        break;

      case 'renan':
        // Tsunami de Cortes da Live: Onda de choque vertical amarela
        const waveGeo = new THREE.BoxGeometry(0.3, 2.5, 1.2);
        const waveMat = new THREE.MeshBasicMaterial({
          color: 0xffea00,
          transparent: true,
          opacity: 0.8
        });
        mesh = new THREE.Mesh(waveGeo, waveMat);
        mesh.position.set(fromPos.x + direction * 1.2, fromPos.y + 1.3, fromPos.z);
        projData.vel = new THREE.Vector3(direction * 10.0, 0, 0);
        projData.maxLife = 1.8;
        break;

      case 'caiado':
        // Trovão do Cerrado: Onda de choque telúrica no chão
        const shockGeo = new THREE.CylinderGeometry(1.5, 1.8, 0.4, 16);
        const shockMat = new THREE.MeshBasicMaterial({
          color: 0xd4af37,
          wireframe: true
        });
        mesh = new THREE.Mesh(shockGeo, shockMat);
        mesh.position.set(fromPos.x + direction * 1.5, 0.2, fromPos.z);
        projData.vel = new THREE.Vector3(direction * 8.0, 0, 0);
        projData.isGroundWave = true;
        projData.maxLife = 1.8;
        break;

      case 'curry':
        // Urna de 3 Pontos do Meio da Quadra: Urna Eletrônica arremessada em parábola flamejante!
        const urnaGeo = new THREE.BoxGeometry(1.0, 0.8, 0.8);
        const urnaMat = new THREE.MeshStandardMaterial({
          map: this.urnaTexture,
          roughness: 0.4
        });
        mesh = new THREE.Mesh(urnaGeo, urnaMat);
        mesh.position.set(fromPos.x + direction * 0.8, fromPos.y + 2.4, fromPos.z);
        projData.vel = new THREE.Vector3(direction * 6.5, 5.5, 0);
        projData.gravity = -12.0;
        projData.isParabola = true;
        projData.maxLife = 2.5;
        break;
    }

    if (mesh) {
      this.scene.add(mesh);
      projData.mesh = mesh;
      this.projectiles.push(projData);
    }
  }

  update(dt) {
    // Atualização de partículas comuns (santinhos, faíscas)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry?.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Física
      if (p.gravity) p.vel.y += p.gravity * dt;
      if (p.drag) p.vel.multiplyScalar(p.drag);

      p.mesh.position.addScaledVector(p.vel, dt);

      // Chão colisão sutil para santinhos
      if (p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.vel.set(0, 0, 0);
      }

      if (p.rotVel) {
        p.mesh.rotation.x += p.rotVel.x * dt;
        p.mesh.rotation.y += p.rotVel.y * dt;
        p.mesh.rotation.z += p.rotVel.z * dt;
      }

      if (p.mesh.material) {
        p.mesh.material.opacity = Math.max(0, p.life);
      }
    }

    // Atualização de Projéteis Especiais
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.time += dt;

      if (!pr.active || pr.time >= pr.maxLife) {
        this.scene.remove(pr.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (pr.gravity) {
        pr.vel.y += pr.gravity * dt;
      }

      pr.mesh.position.addScaledVector(pr.vel, dt);

      // Rotação visual dos projéteis
      if (pr.characterId === 'curry') {
        pr.mesh.rotation.x += 8 * dt;
        pr.mesh.rotation.z += 5 * dt;
        // Solta pequenas chamas
        this.spawnHitSparks(pr.mesh.position, 0xff7700, 1);
      } else if (pr.characterId === 'lula') {
        pr.mesh.rotation.z += 6 * dt;
        this.spawnHitSparks(pr.mesh.position, 0xffd600, 1);
      } else if (pr.characterId === 'flavio') {
        pr.mesh.rotation.y += 9 * dt;
        this.spawnHitSparks(pr.mesh.position, 0x2e7d32, 1);
      } else if (pr.characterId === 'caiado') {
        pr.mesh.scale.x += 2 * dt;
        pr.mesh.scale.z += 2 * dt;
      }

      // Detecção de colisão com o oponente
      if (pr.targetFighter && pr.active) {
        const targetPos = pr.targetFighter.getPosition();
        const dist = pr.mesh.position.distanceTo(targetPos);

        // Se acertar o defensor
        if (dist < 1.3 || (pr.isGroundWave && Math.abs(pr.mesh.position.x - targetPos.x) < 1.2 && targetPos.y < 0.5)) {
          pr.active = false;
          pr.onHit(pr.targetFighter);
          this.spawnHitSparks(pr.mesh.position, 0xffffff, 24);
          this.spawnSantinhos(targetPos, pr.targetFighter.characterData.id, 14);
          this.scene.remove(pr.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  clear() {
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.projectiles.forEach(pr => this.scene.remove(pr.mesh));
    this.particles = [];
    this.projectiles = [];
  }
}
