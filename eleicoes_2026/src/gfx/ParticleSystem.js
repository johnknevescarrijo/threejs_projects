import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';
import { FIGHTER_STATE } from '../characters/Fighter.js';
import { sounds } from '../sound/SoundManager.js';

/**
 * ParticleSystem - Gerencia santinhos eleitorais voando, faíscas de impacto,
 * ondas de choque, poeira de passos e projéteis especiais com colisão.
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.projectiles = [];
    this.shockwaves = [];

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
   * Anel de Onda de Choque Luminoso estilo Street Fighter IV/V
   */
  spawnShockwaveRing(pos, color = 0xffe600, scale = 1.0) {
    const ringGeo = new THREE.RingGeometry(0.3, 0.55, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.position.set(pos.x, pos.y, pos.z + 0.15);
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      life: 0.25,
      maxLife: 0.25,
      baseScale: scale
    });
  }

  /**
   * Poeira de Chão (disparada em Dash, pulo, aterrissagem e knockdown)
   */
  spawnDustCloud(pos, count = 6) {
    const dustGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xd2c29d,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(dustGeo, dustMat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.45,
        0.08 + Math.random() * 0.08,
        (Math.random() - 0.5) * 0.35
      );
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 3.8,
          0.6 + Math.random() * 1.4,
          (Math.random() - 0.5) * 1.5
        ),
        gravity: -1.2,
        drag: 0.88,
        life: 0.35,
        decay: 2.8
      });
    }
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
    // 1. Atualização de Ondas de Choque (Shockwave Rings)
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry?.dispose();
        sw.mesh.material?.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = 1.0 - (sw.life / sw.maxLife);
      const s = sw.baseScale * (0.6 + progress * 2.8);
      sw.mesh.scale.set(s, s, s);
      sw.mesh.material.opacity = (1.0 - progress) * 0.95;
    }

    // 2. Atualização de partículas comuns (santinhos, faíscas, poeira)
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

    // 3. Colisão Projétil vs Projétil (Projectile Clash)
    for (let i = 0; i < this.projectiles.length; i++) {
      for (let j = i + 1; j < this.projectiles.length; j++) {
        const prA = this.projectiles[i];
        const prB = this.projectiles[j];
        if (!prA.active || !prB.active) continue;
        if (prA.targetFighter === prB.targetFighter) continue;

        const dist = prA.mesh.position.distanceTo(prB.mesh.position);
        if (dist < 1.1) {
          const isASuper = prA.specialType === 'super';
          const isBSuper = prB.specialType === 'super';

          if ((!isASuper && !isBSuper) || (isASuper && isBSuper)) {
            // Ambos do mesmo nível: anulam-se mutuamente!
            prA.active = false;
            prB.active = false;
            const midPos = prA.mesh.position.clone().add(prB.mesh.position).multiplyScalar(0.5);
            this.spawnHitSparks(midPos, 0xffd700, 32);
            this.spawnShockwaveRing(midPos, 0xffd700, 1.8);
            sounds.playPunchHeavy();
          } else if (isASuper && !isBSuper) {
            // Super de A destrói projétil comum de B e segue em frente!
            prB.active = false;
            this.spawnHitSparks(prB.mesh.position, 0xffd700, 20);
            this.spawnShockwaveRing(prB.mesh.position, 0xffaa00, 1.3);
            sounds.playPunchHeavy();
          } else if (!isASuper && isBSuper) {
            // Super de B destrói projétil comum de A e segue em frente!
            prA.active = false;
            this.spawnHitSparks(prA.mesh.position, 0xffd700, 20);
            this.spawnShockwaveRing(prA.mesh.position, 0xffaa00, 1.3);
            sounds.playPunchHeavy();
          }
        }
      }
    }

    // 4. Atualização e movimentação de Projéteis Especiais
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

      // Detecção de colisão com o oponente (com checagem de bloqueio)
      if (pr.targetFighter && pr.active) {
        const defender = pr.targetFighter;
        const targetPos = defender.getPosition();
        const dist = pr.mesh.position.distanceTo(targetPos);

        const isHit = dist < 1.3 || (pr.isGroundWave && Math.abs(pr.mesh.position.x - targetPos.x) < 1.2 && targetPos.y < 0.5);

        if (isHit) {
          pr.active = false;

          const isStandingBlock = defender.state === FIGHTER_STATE.STAND_BLOCK;
          const isCrouchingBlock = defender.state === FIGHTER_STATE.CROUCH_BLOCK;
          let isBlocked = false;

          if (pr.isGroundWave) {
            // Onda sísmica no chão só pode ser defendida agachado!
            if (isCrouchingBlock) isBlocked = true;
          } else {
            if (isStandingBlock || isCrouchingBlock) isBlocked = true;
          }

          if (isBlocked) {
            // Bloqueio do projétil: Chip Damage, faíscas azuis e som de bloqueio!
            const chipDamage = pr.specialType === 'super' ? 10 : 6;
            defender.takeDamage(chipDamage, pr.direction, true, false);
            sounds.playBlock();
            this.spawnBlockSparks(pr.mesh.position);
            this.spawnShockwaveRing(pr.mesh.position, 0x00e5ff, 0.9);
          } else {
            // Acerto limpo: Dano cheio
            pr.onHit(defender);
            this.spawnHitSparks(pr.mesh.position, 0xffffff, 24);
            this.spawnShockwaveRing(pr.mesh.position, 0xff9900, 1.4);
            this.spawnSantinhos(targetPos, defender.characterData.id, 14);
          }

          this.scene.remove(pr.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  clear() {
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.projectiles.forEach(pr => this.scene.remove(pr.mesh));
    this.shockwaves.forEach(sw => this.scene.remove(sw.mesh));
    this.particles = [];
    this.projectiles = [];
    this.shockwaves = [];
  }
}
