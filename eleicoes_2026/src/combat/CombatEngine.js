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
    this.comicWords = ['POW!', 'DIREITO DE RESPOSTA!', 'FAKE NEWS!', 'VOTO NULO!', 'URNA!', 'IMPUGNADO!', 'CASSADO!'];

    // Flags para controle de disparo único do projétil especial
    this.specialFired = { f1: false, f2: false };

    this.startRound(1);
  }

  startRound(roundNumber) {
    this.currentRound = roundNumber;
    this.roundTime = 99;
    this.isRoundOver = false;
    this.timeScale = 1.0;
    this.slowMoTimer = 0;
    this.specialFired = { f1: false, f2: false };

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
    // Aplica escala de tempo para slow-motion
    const effectiveDt = dt * this.timeScale;

    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) {
        this.timeScale = 1.0;
      }
    }

    if (!this.isRoundOver) {
      // Decrementa o tempo de debate
      this.roundTime -= effectiveDt;
      if (this.roundTime <= 0) {
        this.roundTime = 0;
        this.endRoundByTimeout();
      }
    }

    // Atualiza lutadores
    this.f1.update(effectiveDt, totalTime);
    this.f2.update(effectiveDt, totalTime);

    // Checa colisões de golpes normais
    this.checkHitboxes(this.f1, this.f2);
    this.checkHitboxes(this.f2, this.f1);

    // Checa disparo de especiais
    this.checkSpecialExecution(this.f1, this.f2, 'f1');
    this.checkSpecialExecution(this.f2, this.f1, 'f2');

    // Checa condição de K.O.
    if (!this.isRoundOver) {
      if (this.f1.health <= 0 || this.f2.health <= 0) {
        this.endRoundByKO();
      }
    }

    // Atualiza HUD
    this.hud.updateBars(this.f1, this.f2, Math.ceil(this.roundTime), this.p1Wins, this.p2Wins);
  }

  checkHitboxes(attacker, defender) {
    if (attacker.isHitboxActive && !attacker.hasHitCurrentAttack) {
      if (attacker.hitbox.intersectsBox(defender.hurtbox)) {
        attacker.hasHitCurrentAttack = true;

        const isDefending = defender.state === FIGHTER_STATE.CROUCH;
        const hitX = (attacker.position.x + defender.position.x) * 0.5;
        const hitY = attacker.attackData.height;
        const hitPos = new THREE.Vector3(hitX, hitY, 0);

        if (isDefending) {
          // Bloqueio com sucesso
          defender.takeDamage(attacker.attackData.damage, attacker.facing, true);
          sounds.playBlock();
          this.particles.spawnBlockSparks(hitPos);
          this.hud.showComicWord('DEFENDEU!', hitPos);
        } else {
          // Golpe acertado em cheio
          defender.takeDamage(attacker.attackData.damage, attacker.facing, false);
          attacker.specialMeter = Math.min(100, attacker.specialMeter + attacker.attackData.specialGain);

          // Som e partículas
          if (attacker.state === FIGHTER_STATE.ATTACK_HEAVY) {
            sounds.playPunchHeavy();
            this.particles.spawnHitSparks(hitPos, 0xff9100, 18);
            this.hud.showComicWord(this.comicWords[Math.floor(Math.random() * this.comicWords.length)], hitPos);
          } else if (attacker.state === FIGHTER_STATE.ATTACK_KICK) {
            sounds.playKick();
            this.particles.spawnHitSparks(hitPos, 0xffd600, 14);
            this.hud.showComicWord('DIREITO DE RESPOSTA!', hitPos);
          } else {
            sounds.playPunchLight();
            this.particles.spawnHitSparks(hitPos, 0xffffff, 8);
          }

          // Voam santinhos eleitorais do candidato golpeado!
          this.particles.spawnSantinhos(hitPos, defender.characterData.id, 9);
        }
      }
    }
  }

  checkSpecialExecution(attacker, target, flagKey) {
    if (attacker.state === FIGHTER_STATE.SPECIAL) {
      if (!this.specialFired[flagKey] && attacker.stateTimer >= 0.25) {
        this.specialFired[flagKey] = true;

        // Dispara o som temático do especial e fala a frase de campanha!
        sounds.playSpecial(attacker.characterData.id);
        sounds.playVocalCharge(attacker.characterData.voicePitch);

        // Exibe o balão estilizado com a frase icônica do candidato
        this.hud.showSpecialSpeech(attacker.characterData.name, attacker.characterData.specialQuote);

        // Cria o projétil correspondente no ParticleSystem
        this.particles.spawnSpecialProjectile(
          attacker.characterData.id,
          attacker.getPosition(),
          attacker.facing,
          target,
          (hitTarget) => {
            // Callback quando o especial atinge o adversário!
            hitTarget.takeDamage(35, attacker.facing, false);
            sounds.playPunchHeavy();
            this.hud.showComicWord('IMPUGNADO!', hitTarget.getPosition());
          }
        );
      }
    } else {
      this.specialFired[flagKey] = false;
    }
  }

  endRoundByKO() {
    this.isRoundOver = true;
    this.timeScale = 0.2; // Efeito dramático de Matrix / Street Fighter K.O.!
    this.slowMoTimer = 1.2;

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
      // Empate técnico
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
      // Próximo turno
      this.startRound(this.currentRound + 1);
    }
  }
}
