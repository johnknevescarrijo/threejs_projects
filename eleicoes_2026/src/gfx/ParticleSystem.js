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

    // Cache de texturas de santinhos oficiais
    this.santinhoTextures = {
      lula: TextureGenerator.createSantinhoTexture('lula', '13'),
      flavio: TextureGenerator.createSantinhoTexture('flavio', '22'),
      renan: TextureGenerator.createSantinhoTexture('renan', '14'),
      caiado: TextureGenerator.createSantinhoTexture('caiado', '44'),
      curry: TextureGenerator.createSantinhoTexture('curry', '22')
    };

    // Geometria reutilizável de santinho
    this.santinhoGeo = new THREE.PlaneGeometry(0.2, 0.28);

    // Texturas de Especiais
    this.urnaTexture = TextureGenerator.createUrnaTexture();
    this.picanhaTexture = TextureGenerator.createPicanhaTexture();
    this.bombomTexture = TextureGenerator.createBombomTexture();
    this.livroTexture = TextureGenerator.createLivroAmareloTexture();
    this.berranteTexture = TextureGenerator.createBerranteWaveTexture();
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
  spawnSpecialProjectile(characterId, fromPos, direction, targetFighter, onHitCallback, specialType = 'special1') {
    let mesh;
    let projData = {
      characterId,
      specialType,
      direction,
      targetFighter,
      onHit: onHitCallback,
      active: true,
      time: 0
    };

    switch (characterId) {
      case 'lula':
        // Picanha na Brasa Hadouken (special1) ou Chuva Cósmica (super)
        const picGeo = new THREE.PlaneGeometry(specialType === 'super' ? 1.5 : 1.1, specialType === 'super' ? 1.1 : 0.8);
        const picMat = new THREE.MeshBasicMaterial({
          map: this.picanhaTexture,
          transparent: true,
          side: THREE.DoubleSide
        });
        mesh = new THREE.Mesh(picGeo, picMat);
        mesh.position.set(fromPos.x + direction * 1.2, fromPos.y + 1.2, fromPos.z);
        projData.vel = new THREE.Vector3(direction * (specialType === 'super' ? 10.0 : 8.0), 0.1, 0);
        projData.maxLife = 2.2;
        break;

      case 'flavio':
        // Trufa / Bombom dourado estilo Sonic Boom
        const bonGeo = new THREE.BoxGeometry(specialType === 'super' ? 1.0 : 0.7, 0.45, 0.55);
        const bonMat = new THREE.MeshStandardMaterial({
          map: this.bombomTexture,
          metalness: 0.5,
          roughness: 0.25
        });
        mesh = new THREE.Mesh(bonGeo, bonMat);
        mesh.position.set(fromPos.x + direction * 1.2, fromPos.y + 1.2, fromPos.z);
        projData.vel = new THREE.Vector3(direction * (specialType === 'super' ? 11.0 : 9.5), 0, 0);
        projData.maxLife = 2.0;
        break;

      case 'renan':
        if (specialType === 'special1') {
          // O Livro Amarelo na cara do adversário rodopiando velozmente!
          const bookGeo = new THREE.PlaneGeometry(0.9, 1.15);
          const bookMat = new THREE.MeshBasicMaterial({
            map: this.livroTexture,
            side: THREE.DoubleSide
          });
          mesh = new THREE.Mesh(bookGeo, bookMat);
          mesh.position.set(fromPos.x + direction * 1.2, fromPos.y + 1.3, fromPos.z);
          projData.vel = new THREE.Vector3(direction * 9.5, 0, 0);
          projData.isBook = true;
          projData.maxLife = 1.9;
        } else {
          // Tsunami de Cortes da Live / Rugido da Onça 14
          const waveGeo = new THREE.BoxGeometry(0.35, 2.8, 1.4);
          const waveMat = new THREE.MeshBasicMaterial({
            color: 0xffea00,
            transparent: true,
            opacity: 0.85
          });
          mesh = new THREE.Mesh(waveGeo, waveMat);
          mesh.position.set(fromPos.x + direction * 1.2, fromPos.y + 1.3, fromPos.z);
          projData.vel = new THREE.Vector3(direction * 11.0, 0, 0);
          projData.maxLife = 1.8;
        }
        break;

      case 'caiado':
        if (specialType === 'special1') {
          // Onda Sonora do Berrante Goiano (onda acústica dourada)
          const berrGeo = new THREE.PlaneGeometry(1.4, 1.4);
          const berrMat = new THREE.MeshBasicMaterial({
            map: this.berranteTexture,
            transparent: true,
            side: THREE.DoubleSide
          });
          mesh = new THREE.Mesh(berrGeo, berrMat);
          mesh.position.set(fromPos.x + direction * 1.2, fromPos.y + 1.25, fromPos.z);
          projData.vel = new THREE.Vector3(direction * 8.5, 0, 0);
          projData.isSoundWave = true;
          projData.maxLife = 1.8;
        } else {
          // Trovão de Goiás: Pisão sísmico gigante
          const shockGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.45, 16);
          const shockMat = new THREE.MeshBasicMaterial({
            color: 0xd4af37,
            wireframe: true
          });
          mesh = new THREE.Mesh(shockGeo, shockMat);
          mesh.position.set(fromPos.x + direction * 1.5, 0.2, fromPos.z);
          projData.vel = new THREE.Vector3(direction * 8.5, 0, 0);
          projData.isGroundWave = true;
          projData.maxLife = 1.8;
        }
        break;

      case 'curry':
        // Urna de Passe de Peito (special1) ou Cesta de 3 Pontos parabólica (super)
        const urnaGeo = new THREE.BoxGeometry(0.9, 0.7, 0.7);
        const urnaMat = new THREE.MeshStandardMaterial({
          map: this.urnaTexture,
          roughness: 0.4
        });
        mesh = new THREE.Mesh(urnaGeo, urnaMat);
        if (specialType === 'special1') {
          // Arremesso de peito reto e rápido estilo Hadouken
          mesh.position.set(fromPos.x + direction * 1.1, fromPos.y + 1.2, fromPos.z);
          projData.vel = new THREE.Vector3(direction * 10.0, 0.3, 0);
          projData.maxLife = 1.8;
        } else {
          // Cesta de 3 Pontos em arco parabólico alto
          mesh.position.set(fromPos.x + direction * 0.8, fromPos.y + 2.4, fromPos.z);
          projData.vel = new THREE.Vector3(direction * 6.5, 5.8, 0);
          projData.gravity = -12.0;
          projData.isParabola = true;
          projData.maxLife = 2.5;
        }
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
        this.spawnHitSparks(pr.mesh.position, 0xff7700, 1);
      } else if (pr.characterId === 'lula') {
        pr.mesh.rotation.z += 7 * dt;
        this.spawnHitSparks(pr.mesh.position, 0xffd600, 1);
      } else if (pr.characterId === 'flavio') {
        pr.mesh.rotation.y += 9 * dt;
        pr.mesh.rotation.z += 4 * dt;
        this.spawnHitSparks(pr.mesh.position, 0x2e7d32, 1);
      } else if (pr.characterId === 'renan') {
        if (pr.isBook) {
          pr.mesh.rotation.z += 12 * dt;
          this.spawnHitSparks(pr.mesh.position, 0xffcc00, 1);
        } else {
          this.spawnHitSparks(pr.mesh.position, 0xffea00, 1);
        }
      } else if (pr.characterId === 'caiado') {
        if (pr.isSoundWave) {
          pr.mesh.scale.x += 1.8 * dt;
          pr.mesh.scale.y += 1.8 * dt;
          this.spawnHitSparks(pr.mesh.position, 0xd4af37, 1);
        } else {
          pr.mesh.scale.x += 2 * dt;
          pr.mesh.scale.z += 2 * dt;
        }
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
