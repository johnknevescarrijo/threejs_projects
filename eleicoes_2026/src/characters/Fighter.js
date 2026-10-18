import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';

export const FIGHTER_STATE = {
  IDLE: 'IDLE',
  WALK: 'WALK',
  JUMP: 'JUMP',
  CROUCH: 'CROUCH',
  ATTACK_LIGHT: 'ATTACK_LIGHT',
  ATTACK_HEAVY: 'ATTACK_HEAVY',
  ATTACK_KICK: 'ATTACK_KICK',
  SPECIAL: 'SPECIAL',
  HURT: 'HURT',
  BLOCKED: 'BLOCKED',
  KNOCKED_DOWN: 'KNOCKED_DOWN',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT'
};

/**
 * Fighter - Gerencia estados, movimentos, colisões e saúde de um lutador
 */
export class Fighter {
  constructor(characterData, isPlayer2 = false) {
    this.characterData = characterData;
    this.isPlayer2 = isPlayer2;

    this.model = new CharacterModel(characterData);
    this.mesh = this.model.group;

    // Posição e Física
    this.position = new THREE.Vector3(isPlayer2 ? 4.5 : -4.5, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.mesh.position.copy(this.position);

    this.facing = isPlayer2 ? -1 : 1;
    this.mesh.rotation.y = this.facing === 1 ? Math.PI / 2 : -Math.PI / 2;

    // Atributos de Luta
    this.maxHealth = 100;
    this.health = 100;
    this.maxSpecial = 100;
    this.specialMeter = 0; // Fundo Eleitoral

    // Máquina de Estados
    this.state = FIGHTER_STATE.IDLE;
    this.stateTimer = 0;
    this.stateDuration = 0;

    // Configuração de golpes
    this.attackData = null;
    this.hasHitCurrentAttack = false;

    // Limites de Arena
    this.stageLimit = 10.5;

    // Caixa de colisão (Hurtbox)
    this.hurtbox = new THREE.Box3();
    this.hitbox = new THREE.Box3();
    this.isHitboxActive = false;
  }

  getPosition() {
    return this.position.clone();
  }

  setOpponent(opponent) {
    this.opponent = opponent;
  }

  reset(startX) {
    this.position.set(startX, 0, 0);
    this.velocity.set(0, 0, 0);
    this.mesh.position.copy(this.position);
    this.health = 100;
    this.specialMeter = 20; // Começa com um pouco de verba partidária
    this.state = FIGHTER_STATE.IDLE;
    this.stateTimer = 0;
    this.hasHitCurrentAttack = false;
    this.isHitboxActive = false;
    this.model.resetPose();
  }

  /**
   * Entradas de Comando (vindo de Teclado, IA ou Touch)
   */
  handleInput(input) {
    // Se estiver em animações travadas (levando golpe, caído, atacando, vitória), ignora
    if ([
      FIGHTER_STATE.HURT,
      FIGHTER_STATE.KNOCKED_DOWN,
      FIGHTER_STATE.VICTORY,
      FIGHTER_STATE.DEFEAT,
      FIGHTER_STATE.ATTACK_LIGHT,
      FIGHTER_STATE.ATTACK_HEAVY,
      FIGHTER_STATE.ATTACK_KICK,
      FIGHTER_STATE.SPECIAL
    ].includes(this.state)) {
      return;
    }

    // Ataque Especial (Super de Campanha)
    if (input.special && this.specialMeter >= 100) {
      this.executeSpecial();
      return;
    }

    // Ataque Forte / Gancho Eleitoral
    if (input.heavy) {
      this.executeAttack('heavy');
      return;
    }

    // Chute / Rasteira
    if (input.kick) {
      this.executeAttack('kick');
      return;
    }

    // Soco Rápido / Jab
    if (input.light) {
      this.executeAttack('light');
      return;
    }

    // Pulo
    if (input.up && this.position.y <= 0.01) {
      this.velocity.y = 11.5;
      this.state = FIGHTER_STATE.JUMP;
      return;
    }

    // Agachamento / Bloqueio
    if (input.down && this.position.y <= 0.01) {
      this.state = FIGHTER_STATE.CROUCH;
      this.velocity.x = 0;
      return;
    }

    // Movimentação Esquerda / Direita
    if (input.left) {
      const speed = (this.characterData.stats.velocidade / 100) * 6.5;
      this.velocity.x = -speed;
      if (this.position.y <= 0.01) this.state = FIGHTER_STATE.WALK;
    } else if (input.right) {
      const speed = (this.characterData.stats.velocidade / 100) * 6.5;
      this.velocity.x = speed;
      if (this.position.y <= 0.01) this.state = FIGHTER_STATE.WALK;
    } else {
      this.velocity.x = 0;
      if (this.position.y <= 0.01) this.state = FIGHTER_STATE.IDLE;
    }
  }

  executeAttack(type) {
    this.velocity.x = 0;
    this.hasHitCurrentAttack = false;
    this.stateTimer = 0;

    switch (type) {
      case 'light':
        this.state = FIGHTER_STATE.ATTACK_LIGHT;
        this.stateDuration = 0.28;
        this.attackData = {
          damage: 7,
          specialGain: 10,
          startup: 0.06,
          active: 0.16,
          reach: 1.4,
          height: 1.35,
          knockback: 1.2
        };
        break;

      case 'heavy':
        this.state = FIGHTER_STATE.ATTACK_HEAVY;
        this.stateDuration = 0.52;
        this.attackData = {
          damage: 16,
          specialGain: 20,
          startup: 0.16,
          active: 0.35,
          reach: 1.5,
          height: 1.4,
          knockback: 3.5
        };
        break;

      case 'kick':
        this.state = FIGHTER_STATE.ATTACK_KICK;
        this.stateDuration = 0.42;
        this.attackData = {
          damage: 12,
          specialGain: 15,
          startup: 0.12,
          active: 0.28,
          reach: 1.6,
          height: 0.7,
          knockback: 2.4
        };
        break;
    }
  }

  executeSpecial() {
    this.specialMeter = 0;
    this.velocity.x = 0;
    this.state = FIGHTER_STATE.SPECIAL;
    this.stateTimer = 0;
    this.stateDuration = 1.1;
    this.hasHitCurrentAttack = false;
  }

  takeDamage(amount, knockbackDir = 1, isBlocked = false) {
    if (this.state === FIGHTER_STATE.DEFEAT) return;

    if (isBlocked) {
      // Dano reduzido de chip damage
      this.health = Math.max(0, this.health - amount * 0.2);
      this.specialMeter = Math.min(100, this.specialMeter + 5);
      this.state = FIGHTER_STATE.BLOCKED;
      this.stateTimer = 0;
      this.stateDuration = 0.2;
      this.velocity.x = knockbackDir * 0.8;
      return;
    }

    this.health = Math.max(0, this.health - amount);
    // Ganha especial ao levar golpe
    this.specialMeter = Math.min(100, this.specialMeter + amount * 0.65);

    if (this.health <= 0) {
      this.state = FIGHTER_STATE.KNOCKED_DOWN;
      this.stateTimer = 0;
      this.stateDuration = 2.0;
      this.velocity.x = knockbackDir * 3.5;
      this.velocity.y = 4.0;
    } else {
      this.state = FIGHTER_STATE.HURT;
      this.stateTimer = 0;
      this.stateDuration = 0.35;
      this.velocity.x = knockbackDir * 2.2;
    }
  }

  update(dt, totalTime) {
    this.stateTimer += dt;

    // Atualização de Facing (Olhar para o oponente se não estiver em ataque travado)
    if (this.opponent && ![FIGHTER_STATE.HURT, FIGHTER_STATE.KNOCKED_DOWN, FIGHTER_STATE.VICTORY, FIGHTER_STATE.DEFEAT].includes(this.state)) {
      const dirToOpp = this.opponent.position.x > this.position.x ? 1 : -1;
      this.facing = dirToOpp;
      this.mesh.rotation.y = this.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
    }

    // Física e Gravidade
    if (this.position.y > 0 || this.velocity.y > 0) {
      this.velocity.y -= 26.0 * dt; // Gravidade ágil de fighting game
      this.position.y += this.velocity.y * dt;

      if (this.position.y <= 0) {
        this.position.y = 0;
        this.velocity.y = 0;
        if (this.state === FIGHTER_STATE.JUMP) {
          this.state = FIGHTER_STATE.IDLE;
        }
      }
    }

    // Movimento Horizontal
    this.position.x += this.velocity.x * dt;

    // Atrito no chão
    if (this.position.y <= 0.01 && this.state !== FIGHTER_STATE.WALK) {
      this.velocity.x *= 0.82;
    }

    // Limites da Arena
    this.position.x = Math.max(-this.stageLimit, Math.min(this.stageLimit, this.position.x));
    this.mesh.position.copy(this.position);

    // Atualiza Hurtbox
    const hHeight = this.state === FIGHTER_STATE.CROUCH ? 1.3 : 2.1;
    this.hurtbox.setFromCenterAndSize(
      new THREE.Vector3(this.position.x, this.position.y + hHeight * 0.5, this.position.z),
      new THREE.Vector3(0.9, hHeight, 0.8)
    );

    // Atualiza Hitbox de ataque
    this.isHitboxActive = false;
    if (this.attackData && [FIGHTER_STATE.ATTACK_LIGHT, FIGHTER_STATE.ATTACK_HEAVY, FIGHTER_STATE.ATTACK_KICK].includes(this.state)) {
      if (this.stateTimer >= this.attackData.startup && this.stateTimer <= this.attackData.active) {
        this.isHitboxActive = true;
        const hitX = this.position.x + this.facing * (this.attackData.reach * 0.6);
        this.hitbox.setFromCenterAndSize(
          new THREE.Vector3(hitX, this.position.y + this.attackData.height, this.position.z),
          new THREE.Vector3(this.attackData.reach, 0.7, 0.8)
        );
      }
    }

    // Transições de Fim de Estado
    if (this.stateDuration > 0 && this.stateTimer >= this.stateDuration) {
      if (this.state === FIGHTER_STATE.KNOCKED_DOWN) {
        this.state = FIGHTER_STATE.DEFEAT;
      } else if (![FIGHTER_STATE.VICTORY, FIGHTER_STATE.DEFEAT].includes(this.state)) {
        this.state = FIGHTER_STATE.IDLE;
        this.attackData = null;
      }
    }

    // Atualização das Animações no Modelo 3D
    this.updateAnimation(totalTime);
    this.model.updateBobblehead(dt);
  }

  updateAnimation(totalTime) {
    switch (this.state) {
      case FIGHTER_STATE.IDLE:
        this.model.animateIdle(totalTime);
        break;

      case FIGHTER_STATE.WALK:
        this.model.animateWalk(totalTime, Math.sign(this.velocity.x));
        break;

      case FIGHTER_STATE.JUMP:
        this.model.animateJump(this.velocity.y);
        break;

      case FIGHTER_STATE.CROUCH:
      case FIGHTER_STATE.BLOCKED:
        this.model.animateCrouch();
        break;

      case FIGHTER_STATE.ATTACK_LIGHT:
        this.model.animatePunchLight(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.ATTACK_HEAVY:
        this.model.animatePunchHeavy(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.ATTACK_KICK:
        this.model.animateKick(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.SPECIAL:
        this.model.animateSpecial(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.HURT:
        this.model.animateHurt(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.KNOCKED_DOWN:
      case FIGHTER_STATE.DEFEAT:
        this.model.animateKnockdown(Math.min(1.0, this.stateTimer / 0.8));
        break;

      case FIGHTER_STATE.VICTORY:
        this.model.animateVictory(totalTime);
        break;
    }
  }
}
