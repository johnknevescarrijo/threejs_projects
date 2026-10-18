import * as THREE from 'three';
import { FIGHTER_STATE } from '../characters/Fighter.js';
import { sounds } from '../sound/SoundManager.js';

export class CombatEngine {
  constructor(fighter1, fighter2, particleSystem, hud, onMatchEnd) {
    this.f1 = fighter1;
    this.f2 = fighter2;
    this.particles = particleSystem;
    this.hud = hud;
    this.onMatchEnd = onMatchEnd;

    // Placar de Turnos ganhos
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.currentRound = 1;
    this.roundTime = 99;
    this.isRoundOver = false;
    this.isMatchOver = false;

    // Slow motion dramático ao finalizar o turno
    this.timeScale = 1.0;
    this.slowMoTimer = 0;

    // Cache de balões de charge cômicos
    this.comicWords = [
      'POW!',
      'DIREITO DE RESPOSTA!',
      'FAKE NEWS!',
      'VOTO NULO!',
      'URNA!',
      'IMPUGNADO!',
      'CASSADO!',
      'SPLASH!',
      'RASTEIRA!'
    ];

    // Flags para controle de disparo único de especiais
    this.specialFired = {
      f1_spec1: false,
      f1_super: false,
      f2_spec1: false,
      f2_super: false
    };

    this.startRound(1);
  }

  startRound(roundNumber) {
    this.currentRound = roundNumber;
    this.roundTime = 99;
    this.isRoundOver = false;
    this.timeScale = 1.0;
    this.slowMoTimer = 0;
    this.specialFired = {
      f1_spec1: false,
      f1_super: false,
      f2_spec1: false,
      f2_super: false
    };

    this.f1.reset(-4.5);
    this.f2.reset(4.5);
    this.f1.setOpponent(this.f2);
    this.f2.setOpponent(this.f1);

    let roundName = '1º TURNO';
    if (roundNumber === 2) roundName = '2º TURNO';
    if (roundNumber === 3) roundName = 'DECISÃO NO TSE!';

    this.hud.showRoundAnnouncement(roundName, () => {
      // Inicia combate após o anúncio
    });
  }

  update(dt, totalTime) {
    const effectiveDt = dt * this.timeScale;

    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) {
        this.timeScale = 1.0;
      }
    }

    if (!this.isRoundOver) {
      this.roundTime -= effectiveDt;
      if (this.roundTime <= 0) {
        this.roundTime = 0;
        this.endRoundByTimeout();
      }
    }

    // 1. Atualiza lutadores
    this.f1.update(effectiveDt, totalTime);
    this.f2.update(effectiveDt, totalTime);

    // 2. Colisão física de corpo (Pushbox sólida de Street Fighter II)
    this.handlePushbox(this.f1, this.f2);

    // 3. Checa colisões de ataques normais, rasteiras e voadoras
    this.checkHitboxes(this.f1, this.f2);
    this.checkHitboxes(this.f2, this.f1);

    // 4. Checa disparo de especiais (Hadouken e Super)
    this.checkSpecialExecution(this.f1, this.f2, 'f1');
    this.checkSpecialExecution(this.f2, this.f1, 'f2');

    // 5. Checa condição de K.O.
    if (!this.isRoundOver) {
      if (this.f1.health <= 0 || this.f2.health <= 0) {
        this.endRoundByKO();
      }
    }

    // 6. Atualiza HUD
    this.hud.updateBars(this.f1, this.f2, Math.ceil(this.roundTime), this.p1Wins, this.p2Wins);
  }

  /**
   * Pushbox Sólida Estilo Street Fighter II:
   * No chão, os dois bonecos se empurram fisicamente e não atravessam um ao outro.
   * Mas se um pular no ar, ele pode voar por cima (Cross-up)!
   */
  handlePushbox(f1, f2) {
    const bothGrounded = f1.position.y <= 0.15 && f2.position.y <= 0.15;
    if (bothGrounded) {
      const minDistance = 1.15;
      const dx = f2.position.x - f1.position.x;
      const dist = Math.abs(dx);

      if (dist < minDistance) {
        const overlap = (minDistance - dist) * 0.5;
        const pushDir = dx >= 0 ? 1 : -1;

        f1.position.x -= pushDir * overlap;
        f2.position.x += pushDir * overlap;

        // Mantém dentro dos limites da arena
        f1.position.x = Math.max(-f1.stageLimit, Math.min(f1.stageLimit, f1.position.x));
        f2.position.x = Math.max(-f2.stageLimit, Math.min(f2.stageLimit, f2.position.x));

        f1.mesh.position.copy(f1.position);
        f2.mesh.position.copy(f2.position);
      }
    }
  }

  /**
   * Sistema de Colisão e Dano de Street Fighter II:
   * - Overhead (Voadoras): quebra bloqueio agachado!
   * - Low (Rasteira): quebra bloqueio em pé e causa Knockdown!
   * - Mid: bloqueável por ambos.
   */
  checkHitboxes(attacker, defender) {
    if (attacker.isHitboxActive && !attacker.hasHitCurrentAttack) {
      if (attacker.hitbox.intersectsBox(defender.hurtbox)) {
        attacker.hasHitCurrentAttack = true;

        const attackLevel = attacker.attackData.attackLevel || 'mid';
        const isKnockdownAttack = attacker.attackData.isKnockdown || false;

        let isBlocked = false;
        if (defender.state === FIGHTER_STATE.STAND_BLOCK) {
          // Bloqueio alto defende overhead e mid, mas é vulnerável à Rasteira!
          if (attackLevel !== 'low') {
            isBlocked = true;
          }
        } else if (defender.state === FIGHTER_STATE.CROUCH_BLOCK) {
          // Bloqueio agachado defende low e mid, mas toma Voadora na cabeça!
          if (attackLevel !== 'overhead') {
            isBlocked = true;
          }
        }

        const hitX = (attacker.position.x + defender.position.x) * 0.5;
        const hitY = attacker.attackData.height;
        const hitPos = new THREE.Vector3(hitX, hitY, 0);

        if (isBlocked) {
          // Bloqueio bem sucedido
          defender.takeDamage(attacker.attackData.damage, attacker.facing, true, false);
          sounds.playBlock();
          this.particles.spawnBlockSparks(hitPos);
          this.hud.showComicWord('DEFENDEU!', hitPos);
        } else {
          // Golpe acertado em cheio!
          defender.takeDamage(attacker.attackData.damage, attacker.facing, false, isKnockdownAttack);
          attacker.specialMeter = Math.min(100, attacker.specialMeter + attacker.attackData.specialGain);

          // Sons e efeitos específicos
          if (attacker.state === FIGHTER_STATE.CROUCH_KICK) {
            // A RASTEIRA CLÁSSICA DERRUBOU!
            sounds.playKick();
            this.particles.spawnHitSparks(hitPos, 0xffd600, 20);
            this.hud.showComicWord('RASTEIRA!', hitPos);
          } else if (attacker.state === FIGHTER_STATE.JUMP_KICK) {
            // VOADORA CLÁSSICA!
            sounds.playKick();
            this.particles.spawnHitSparks(hitPos, 0xff3d00, 22);
            this.hud.showComicWord('VOADORA!', hitPos);
          } else if (attacker.state === FIGHTER_STATE.CROUCH_HEAVY) {
            // UPPERCUT ANTIAÉREO!
            sounds.playPunchHeavy();
            this.particles.spawnHitSparks(hitPos, 0xff9100, 24);
            this.hud.showComicWord('SHORYUKEN!', hitPos);
          } else if (attacker.state === FIGHTER_STATE.ATTACK_HEAVY) {
            sounds.playPunchHeavy();
            this.particles.spawnHitSparks(hitPos, 0xff9100, 18);
            this.hud.showComicWord(this.comicWords[Math.floor(Math.random() * this.comicWords.length)], hitPos);
          } else {
            sounds.playPunchLight();
            this.particles.spawnHitSparks(hitPos, 0xffffff, 10);
          }

          // Voam santinhos eleitorais do candidato atingido!
          this.particles.spawnSantinhos(hitPos, defender.characterData.id, 10);
        }
      }
    }
  }

  /**
   * Execução e disparo de Golpes Especiais temáticos
   */
  checkSpecialExecution(attacker, target, flagKey) {
    const charId = attacker.characterData.id;

    // 1. Especial 1 (Hadouken / Tiro de Campanha)
    if (attacker.state === FIGHTER_STATE.SPECIAL_1) {
      const key = `${flagKey}_spec1`;
      if (!this.specialFired[key] && attacker.stateTimer >= 0.16) {
        this.specialFired[key] = true;

        sounds.playPunchHeavy();
        sounds.playVocalCharge(attacker.characterData.voicePitch);

        // Balão de fala com frases sorteadas autênticas de 2026!
        const quotes = attacker.characterData.quotes || [attacker.characterData.specialQuote];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        this.hud.showSpecialSpeech(attacker.characterData.name, randomQuote);

        this.particles.spawnSpecialProjectile(
          charId,
          attacker.getPosition(),
          attacker.facing,
          target,
          (hitTarget) => {
            hitTarget.takeDamage(24, attacker.facing, false, false);
            sounds.playPunchHeavy();
            this.hud.showComicWord('ACERTOU!', hitTarget.getPosition());
          },
          'special1'
        );
      }
    } else {
      this.specialFired[`${flagKey}_spec1`] = false;
    }

    // 2. Super Especial (Barra cheia 100% de Fundo Eleitoral)
    if (attacker.state === FIGHTER_STATE.SPECIAL_SUPER) {
      const key = `${flagKey}_super`;
      if (!this.specialFired[key] && attacker.stateTimer >= 0.25) {
        this.specialFired[key] = true;

        sounds.playSpecial(charId);
        sounds.playVocalCharge(attacker.characterData.voicePitch * 1.1);

        this.hud.showSpecialSpeech(attacker.characterData.name, attacker.characterData.specialQuote);

        this.particles.spawnSpecialProjectile(
          charId,
          attacker.getPosition(),
          attacker.facing,
          target,
          (hitTarget) => {
            hitTarget.takeDamage(38, attacker.facing, false, true); // Causa Knockdown devastador!
            sounds.playPunchHeavy();
            this.hud.showComicWord('IMPUGNADO!', hitTarget.getPosition());
          },
          'super'
        );
      }
    } else {
      this.specialFired[`${flagKey}_super`] = false;
    }
  }

  endRoundByKO() {
    this.isRoundOver = true;
    this.timeScale = 0.18; // Efeito de câmera lenta Capcom no K.O.!
    this.slowMoTimer = 1.4;

    // Toca o autêntico som de encerramento da Urna Eletrônica!
    sounds.playUrnaSound();

    let winnerName = '';
    if (this.f1.health > 0) {
      this.p1Wins++;
      winnerName = this.f1.characterData.name;
      this.f1.state = FIGHTER_STATE.VICTORY;
    } else {
      this.p2Wins++;
      winnerName = this.f2.characterData.name;
      this.f2.state = FIGHTER_STATE.VICTORY;
    }

    setTimeout(() => {
      this.checkMatchProgress(winnerName);
    }, 2500);
  }

  endRoundByTimeout() {
    this.isRoundOver = true;
    sounds.playUrnaSound();

    let winnerName = '';
    if (this.f1.health > this.f2.health) {
      this.p1Wins++;
      winnerName = this.f1.characterData.name;
      this.f1.state = FIGHTER_STATE.VICTORY;
      this.f2.state = FIGHTER_STATE.DEFEAT;
    } else if (this.f2.health > this.f1.health) {
      this.p2Wins++;
      winnerName = this.f2.characterData.name;
      this.f2.state = FIGHTER_STATE.VICTORY;
      this.f1.state = FIGHTER_STATE.DEFEAT;
    } else {
      winnerName = 'EMPATE TÉCNICO';
    }

    setTimeout(() => {
      this.checkMatchProgress(winnerName);
    }, 2500);
  }

  checkMatchProgress(roundWinner) {
    if (this.p1Wins >= 2 || this.p2Wins >= 2) {
      this.isMatchOver = true;
      const champion = this.p1Wins >= 2 ? this.f1 : this.f2;
      this.hud.showWinnerScreen(champion.characterData, () => {
        if (this.onMatchEnd) this.onMatchEnd(champion);
      });
    } else {
      this.startRound(this.currentRound + 1);
    }
  }
}
