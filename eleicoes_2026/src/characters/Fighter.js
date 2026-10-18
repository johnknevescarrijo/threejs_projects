import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';

export const FIGHTER_STATE = {
  IDLE: 'IDLE',
  WALK: 'WALK',
  DASH_FORWARD: 'DASH_FORWARD',
  DASH_BACKWARD: 'DASH_BACKWARD',
  JUMP: 'JUMP',
  CROUCH: 'CROUCH',
  STAND_BLOCK: 'STAND_BLOCK',
  CROUCH_BLOCK: 'CROUCH_BLOCK',

  // Golpes em Pé
  ATTACK_LIGHT: 'ATTACK_LIGHT',      // Soco Rápido (Jab)
  ATTACK_HEAVY: 'ATTACK_HEAVY',      // Soco Forte (Gancho pesado)
  ATTACK_KICK: 'ATTACK_KICK',        // Chute Médio/Alto

  // Golpes Agachado
  CROUCH_LIGHT: 'CROUCH_LIGHT',      // Cutucão baixo
  CROUCH_HEAVY: 'CROUCH_HEAVY',      // Uppercut Antiaéreo / Shoryuken agachado
  CROUCH_KICK: 'CROUCH_KICK',        // A RASTEIRA CLÁSSICA (Sweep Knockdown!)

  // Golpes no Ar
  JUMP_KICK: 'JUMP_KICK',            // VOADORA CLÁSSICA DE STREET FIGHTER
  JUMP_PUNCH: 'JUMP_PUNCH',          // Soco aéreo Overhead

  // Agarrão
  THROW: 'THROW',                    // Throw clássico (Frente + Soco Forte colado)

  // Golpes Especiais
  SPECIAL_1: 'SPECIAL_1',            // Projétil Hadouken / Tiro de Campanha
  SPECIAL_2: 'SPECIAL_2',            // Golpe de Avanço / Antiaéreo
  SPECIAL_SUPER: 'SPECIAL_SUPER',    // Super Especial de 100% da Barra

  // Reações
  HURT: 'HURT',
  BLOCKED: 'BLOCKED',
  KNOCKED_DOWN: 'KNOCKED_DOWN',      // Queda estatelada no chão
  WAKEUP: 'WAKEUP',                  // Levantando com invencibilidade
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT'
};

/**
 * Fighter - Física, Mecânicas e Comandos de Street Fighter II Clássico Arcade
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
    this.specialMeter = 20; // Fundo Eleitoral

    // Máquina de Estados
    this.state = FIGHTER_STATE.IDLE;
    this.stateTimer = 0;
    this.stateDuration = 0;

    // Configuração de pulo comprometido estilo SF2
    this.jumpType = 'neutral'; // 'neutral', 'forward', 'backward'
    this.jumpAirTime = 0;

    // Double tap para Dash e Backdash
    this.lastTapDir = null;
    this.lastTapTime = 0;

    // Input Buffer de Street Fighter (histórico dos últimos comandos)
    this.inputBuffer = [];

    // Configuração de golpes
    this.attackData = null;
    this.hasHitCurrentAttack = false;

    // Hitstop (congelamento Capcom de impacto)
    this.hitstopTimer = 0;
    this.shakeOffset = new THREE.Vector3();

    // Invencibilidade temporária (ex: Wake-up)
    this.invincibilityTimer = 0;

    // Limites de Arena
    this.stageLimit = 10.5;

    // Hurtbox e Hitbox
    this.hurtbox = new THREE.Box3();
    this.hitbox = new THREE.Box3();
    this.isHitboxActive = false;

    // Oponente
    this.opponent = null;
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
    this.specialMeter = 25;
    this.state = FIGHTER_STATE.IDLE;
    this.stateTimer = 0;
    this.stateDuration = 0;
    this.hasHitCurrentAttack = false;
    this.isHitboxActive = false;
    this.jumpType = 'neutral';
    this.jumpAirTime = 0;
    this.hitstopTimer = 0;
    this.invincibilityTimer = 0;
    this.inputBuffer = [];
    this.model.resetPose();
  }

  /**
   * Adiciona entrada ao buffer de movimentos estilo Street Fighter
   */
  recordInput(dirName, button) {
    const now = performance.now() * 0.001;
    this.inputBuffer.push({ dir: dirName, btn: button, time: now });
    // Mantém apenas comandos recentes (< 0.55s)
    while (this.inputBuffer.length > 0 && now - this.inputBuffer[0].time > 0.55) {
      this.inputBuffer.shift();
    }
  }

  /**
   * Verifica se o buffer contém comando clássico de Hadouken (↓ ↘ → + Soco)
   */
  checkMotionHadouken() {
    if (this.inputBuffer.length < 3) return false;
    let foundDown = false;
    let foundForward = false;
    for (let i = 0; i < this.inputBuffer.length; i++) {
      const e = this.inputBuffer[i];
      if (e.dir === 'down' || e.dir === 'down_forward') foundDown = true;
      if (foundDown && (e.dir === 'forward' || e.dir === 'down_forward')) foundForward = true;
    }
    return foundDown && foundForward;
  }

  /**
   * Verifica se o buffer contém comando de Shoryuken (→ ↓ ↘ + Soco)
   */
  checkMotionShoryuken() {
    if (this.inputBuffer.length < 3) return false;
    let step = 0;
    for (let i = 0; i < this.inputBuffer.length; i++) {
      const e = this.inputBuffer[i];
      if (step === 0 && e.dir === 'forward') step = 1;
      else if (step === 1 && (e.dir === 'down' || e.dir === 'down_forward')) step = 2;
      else if (step === 2 && (e.dir === 'forward' || e.dir === 'down_forward')) return true;
    }
    return false;
  }

  /**
   * Entradas de Comando com Física de Street Fighter II Arcade
   */
  handleInput(input) {
    // Se estiver em hitstop, ignora comandos
    if (this.hitstopTimer > 0) return;

    // Se estiver em animações travadas (levando golpe, caído, comemorando, etc.), não processa
    if ([
      FIGHTER_STATE.HURT,
      FIGHTER_STATE.KNOCKED_DOWN,
      FIGHTER_STATE.WAKEUP,
      FIGHTER_STATE.VICTORY,
      FIGHTER_STATE.DEFEAT,
      FIGHTER_STATE.THROW,
      FIGHTER_STATE.SPECIAL_SUPER
    ].includes(this.state)) {
      return;
    }

    const isGrounded = this.position.y <= 0.01;
    const isAttackingGrounded = [
      FIGHTER_STATE.ATTACK_LIGHT,
      FIGHTER_STATE.ATTACK_HEAVY,
      FIGHTER_STATE.ATTACK_KICK,
      FIGHTER_STATE.CROUCH_LIGHT,
      FIGHTER_STATE.CROUCH_HEAVY,
      FIGHTER_STATE.CROUCH_KICK,
      FIGHTER_STATE.SPECIAL_1,
      FIGHTER_STATE.SPECIAL_2
    ].includes(this.state);

    if (isAttackingGrounded) return;

    // Direcionais relativos ao oponente (Frente e Trás de SF2)
    const isHoldingForward = (this.facing === 1 && input.right) || (this.facing === -1 && input.left);
    const isHoldingBack = (this.facing === 1 && input.left) || (this.facing === -1 && input.right);
    const isHoldingDown = input.down;

    // Registra no buffer
    let currentDir = 'neutral';
    if (isHoldingDown && isHoldingForward) currentDir = 'down_forward';
    else if (isHoldingDown && isHoldingBack) currentDir = 'down_back';
    else if (isHoldingDown) currentDir = 'down';
    else if (isHoldingForward) currentDir = 'forward';
    else if (isHoldingBack) currentDir = 'back';
    this.recordInput(currentDir, null);

    // ==========================================
    // 1. GOLPES ESPECIAIS (Super, Especial 1, Especial 2)
    // ==========================================
    if (isGrounded) {
      // Super Especial (Espaço com Fundo Eleitoral 100%)
      if (input.special && this.specialMeter >= 100) {
        this.executeSpecial('super');
        return;
      }

      // Atalhos ou Comandos de Especial 1 (Hadouken: U ou ↓ ↘ → + Soco)
      if (input.special1 || (input.light && this.checkMotionHadouken())) {
        this.executeSpecial('special1');
        return;
      }

      // Atalhos ou Comandos de Especial 2 (Shoryuken/Avanço: I ou → ↓ ↘ + Soco)
      if (input.special2 || (input.heavy && this.checkMotionShoryuken())) {
        this.executeSpecial('special2');
        return;
      }
    }

    // ==========================================
    // 2. GOLPES NO AR (Voadora e Soco Aéreo)
    // ==========================================
    if (!isGrounded) {
      if (this.state !== FIGHTER_STATE.JUMP_KICK && this.state !== FIGHTER_STATE.JUMP_PUNCH) {
        if (input.kick) {
          // A VOADORA CLÁSSICA DE STREET FIGHTER!
          this.executeJumpAttack('kick');
          return;
        }
        if (input.light || input.heavy) {
          // Soco aéreo Overhead
          this.executeJumpAttack('punch');
          return;
        }
      }
      return; // No ar, movimentação é travada no arco do pulo!
    }

    // ==========================================
    // 3. AGARRÃO CLÁSSICO DE STREET FIGHTER II (Frente + Soco Forte Colado)
    // ==========================================
    if (isGrounded && isHoldingForward && input.heavy && this.opponent) {
      const dist = Math.abs(this.position.x - this.opponent.position.x);
      if (dist < 1.35 && this.opponent.position.y <= 0.1) {
        this.executeThrow();
        return;
      }
    }

    // ==========================================
    // 4. GOLPES AGACHADO (Cutucão, Uppercut e A CLÁSSICA RASTEIRA!)
    // ==========================================
    if (isHoldingDown && isGrounded) {
      if (input.kick) {
        // A RASTEIRA CLÁSSICA DO STREET FIGHTER (Sweep Kick Knockdown!)
        this.executeCrouchAttack('kick');
        return;
      }
      if (input.heavy) {
        // Uppercut Antiaéreo / Shoryuken agachado
        this.executeCrouchAttack('heavy');
        return;
      }
      if (input.light) {
        // Cutucão baixo
        this.executeCrouchAttack('light');
        return;
      }
    }

    // ==========================================
    // 5. GOLPES EM PÉ (Standing Light, Heavy, Kick)
    // ==========================================
    if (!isHoldingDown && isGrounded) {
      if (input.heavy) {
        this.executeAttack('heavy');
        return;
      }
      if (input.kick) {
        this.executeAttack('kick');
        return;
      }
      if (input.light) {
        this.executeAttack('light');
        return;
      }
    }

    // ==========================================
    // 6. PULOS COMPROMETIDOS ESTILO SF2 (Neutral, Forward, Backward)
    // ==========================================
    if (input.up && isGrounded) {
      this.velocity.y = 12.2;
      this.state = FIGHTER_STATE.JUMP;
      this.jumpAirTime = 0;

      if (isHoldingForward) {
        this.jumpType = 'forward';
        this.velocity.x = this.facing * 5.4;
      } else if (isHoldingBack) {
        this.jumpType = 'backward';
        this.velocity.x = -this.facing * 4.4;
      } else {
        this.jumpType = 'neutral';
        this.velocity.x = 0;
      }
      return;
    }

    // ==========================================
    // 7. DOUBLE-TAP PARA DASH E BACKDASH
    // ==========================================
    const now = performance.now();
    const pressedDir = input.right ? 'right' : (input.left ? 'left' : null);

    if (pressedDir && pressedDir !== this.lastTapDir) {
      if (now - this.lastTapTime < 240) {
        // Double tap detectado!
        const isDoubleForward = (this.facing === 1 && pressedDir === 'right') || (this.facing === -1 && pressedDir === 'left');
        if (isDoubleForward) {
          // Dash Ofensivo
          this.state = FIGHTER_STATE.DASH_FORWARD;
          this.stateTimer = 0;
          this.stateDuration = 0.22;
          this.velocity.x = this.facing * 9.2;
          this.lastTapDir = null;
          return;
        } else {
          // Backdash de Esquiva
          this.state = FIGHTER_STATE.DASH_BACKWARD;
          this.stateTimer = 0;
          this.stateDuration = 0.25;
          this.velocity.x = -this.facing * 7.5;
          this.velocity.y = 3.2;
          this.lastTapDir = null;
          return;
        }
      }
      this.lastTapDir = pressedDir;
      this.lastTapTime = now;
    }

    // ==========================================
    // 8. DEFESA CLÁSSICA DE STREET FIGHTER II (Segurar Trás / Baixo-Trás)
    // ==========================================
    if (this.opponent && this.opponent.isHitboxActive && isGrounded) {
      if (isHoldingBack) {
        if (isHoldingDown) {
          this.state = FIGHTER_STATE.CROUCH_BLOCK;
          this.velocity.x = 0;
          return;
        } else {
          this.state = FIGHTER_STATE.STAND_BLOCK;
          this.velocity.x = -this.facing * 0.5;
          return;
        }
      }
    }

    // ==========================================
    // 9. AGACHAMENTO NORMAL (Crouch)
    // ==========================================
    if (isHoldingDown && isGrounded) {
      this.state = FIGHTER_STATE.CROUCH;
      this.velocity.x = 0;
      return;
    }

    // ==========================================
    // 10. CAMINHADA FRONTAL vs RECUO
    // ==========================================
    if (input.left || input.right) {
      const isMovingForward = isHoldingForward;
      const baseSpeed = (this.characterData.stats.velocidade / 100) * 6.5;
      // No SF2: andar para frente é mais rápido; andar para trás é mais lento e cauteloso!
      const finalSpeed = isMovingForward ? baseSpeed : baseSpeed * 0.68;
      const moveDir = input.right ? 1 : -1;

      this.velocity.x = moveDir * finalSpeed;
      this.state = FIGHTER_STATE.WALK;
    } else {
      this.velocity.x = 0;
      this.state = FIGHTER_STATE.IDLE;
    }
  }

  // ==========================================
  // EXECUÇÃO DE ATAQUES COM HITBOXES PRECISAS
  // ==========================================

  executeAttack(type) {
    this.velocity.x = 0;
    this.hasHitCurrentAttack = false;
    this.stateTimer = 0;

    switch (type) {
      case 'light':
        this.state = FIGHTER_STATE.ATTACK_LIGHT;
        this.stateDuration = 0.24;
        this.attackData = {
          damage: 6,
          specialGain: 10,
          startup: 0.04,
          active: 0.14,
          reach: 1.45,
          height: 1.4,
          knockback: 1.0,
          isKnockdown: false,
          attackLevel: 'mid'
        };
        break;

      case 'heavy':
        this.state = FIGHTER_STATE.ATTACK_HEAVY;
        this.stateDuration = 0.48;
        this.attackData = {
          damage: 16,
          specialGain: 18,
          startup: 0.14,
          active: 0.32,
          reach: 1.55,
          height: 1.45,
          knockback: 3.5,
          isKnockdown: false,
          attackLevel: 'mid'
        };
        break;

      case 'kick':
        this.state = FIGHTER_STATE.ATTACK_KICK;
        this.stateDuration = 0.38;
        this.attackData = {
          damage: 12,
          specialGain: 14,
          startup: 0.1,
          active: 0.25,
          reach: 1.65,
          height: 0.95,
          knockback: 2.2,
          isKnockdown: false,
          attackLevel: 'mid'
        };
        break;
    }
  }

  executeCrouchAttack(type) {
    this.velocity.x = 0;
    this.hasHitCurrentAttack = false;
    this.stateTimer = 0;

    switch (type) {
      case 'light':
        this.state = FIGHTER_STATE.CROUCH_LIGHT;
        this.stateDuration = 0.22;
        this.attackData = {
          damage: 5,
          specialGain: 8,
          startup: 0.04,
          active: 0.13,
          reach: 1.35,
          height: 0.55,
          knockback: 0.8,
          isKnockdown: false,
          attackLevel: 'low'
        };
        break;

      case 'heavy':
        // Uppercut Antiaéreo (Crouch Heavy / Shoryuken agachado)
        this.state = FIGHTER_STATE.CROUCH_HEAVY;
        this.stateDuration = 0.5;
        this.attackData = {
          damage: 18,
          specialGain: 22,
          startup: 0.1,
          active: 0.32,
          reach: 1.3,
          height: 1.9, // Alto para interceptar voadoras!
          knockback: 3.8,
          isKnockdown: true, // Lança oponente no ar
          attackLevel: 'mid'
        };
        break;

      case 'kick':
        // A RASTEIRA CLÁSSICA DO STREET FIGHTER II (Crouching Sweep)
        this.state = FIGHTER_STATE.CROUCH_KICK;
        this.stateDuration = 0.44;
        this.attackData = {
          damage: 14,
          specialGain: 16,
          startup: 0.09,
          active: 0.26,
          reach: 1.85, // Grande alcance rente ao chão
          height: 0.25,
          knockback: 3.2,
          isKnockdown: true, // DERRUBA O OPONENTE NO CHÃO!
          attackLevel: 'low' // Só pode ser bloqueado agachado!
        };
        break;
    }
  }

  executeJumpAttack(type) {
    this.hasHitCurrentAttack = false;
    this.stateTimer = 0;

    if (type === 'kick') {
      // A VOADORA CLÁSSICA DE STREET FIGHTER
      this.state = FIGHTER_STATE.JUMP_KICK;
      this.stateDuration = 1.2; // Permanece ativa durante o salto
      this.attackData = {
        damage: 15,
        specialGain: 18,
        startup: 0.06,
        active: 0.9,
        reach: 1.6,
        height: 1.1,
        knockback: 2.8,
        isKnockdown: false,
        attackLevel: 'overhead' // Bloqueio em pé obrigatório!
      };
    } else {
      // Soco Aéreo Overhead
      this.state = FIGHTER_STATE.JUMP_PUNCH;
      this.stateDuration = 0.4;
      this.attackData = {
        damage: 12,
        specialGain: 15,
        startup: 0.08,
        active: 0.3,
        reach: 1.4,
        height: 1.3,
        knockback: 2.0,
        isKnockdown: false,
        attackLevel: 'overhead'
      };
    }
  }

  executeThrow() {
    this.velocity.x = 0;
    this.state = FIGHTER_STATE.THROW;
    this.stateTimer = 0;
    this.stateDuration = 0.65;
    this.hasHitCurrentAttack = false;

    // Arremessa oponente
    if (this.opponent) {
      this.opponent.takeDamage(22, this.facing, false, true);
    }
  }

  executeSpecial(kind = 'special1') {
    this.velocity.x = 0;
    this.hasHitCurrentAttack = false;
    this.stateTimer = 0;

    if (kind === 'super') {
      this.specialMeter = 0;
      this.state = FIGHTER_STATE.SPECIAL_SUPER;
      this.stateDuration = 1.3;
    } else if (kind === 'special1') {
      // Projétil Hadouken / Tiro
      this.state = FIGHTER_STATE.SPECIAL_1;
      this.stateDuration = 0.55;
    } else if (kind === 'special2') {
      // Shoryuken / Avanço
      this.state = FIGHTER_STATE.SPECIAL_2;
      this.stateDuration = 0.65;
      // Avança durante o golpe
      this.velocity.x = this.facing * 6.5;
      this.velocity.y = 4.0;
      this.attackData = {
        damage: 20,
        specialGain: 15,
        startup: 0.08,
        active: 0.45,
        reach: 1.5,
        height: 1.6,
        knockback: 4.2,
        isKnockdown: true,
        attackLevel: 'mid'
      };
    }
  }

  /**
   * Recebe dano com suporte a Hitstop e Knockdown de Street Fighter
   */
  takeDamage(amount, knockbackDir = 1, isBlocked = false, isKnockdown = false) {
    if (this.state === FIGHTER_STATE.DEFEAT || this.invincibilityTimer > 0) return;

    if (isBlocked) {
      // Dano reduzido de chip damage
      this.health = Math.max(0, this.health - amount * 0.18);
      this.specialMeter = Math.min(100, this.specialMeter + 6);
      this.state = FIGHTER_STATE.BLOCKED;
      this.stateTimer = 0;
      this.stateDuration = 0.18;
      this.velocity.x = knockbackDir * 0.9;
      this.applyHitstop(0.06);
      return;
    }

    this.health = Math.max(0, this.health - amount);
    this.specialMeter = Math.min(100, this.specialMeter + amount * 0.7);

    // Hitstop Capcom
    this.applyHitstop(0.08);

    if (this.health <= 0 || isKnockdown) {
      // Cai no chão estatelado (Knockdown)
      this.state = FIGHTER_STATE.KNOCKED_DOWN;
      this.stateTimer = 0;
      this.stateDuration = this.health <= 0 ? 3.0 : 1.1; // Se zerou vida é derrota, senão acorda
      this.velocity.x = knockbackDir * 4.0;
      this.velocity.y = 5.2;
    } else {
      // Hit Stun normal
      this.state = FIGHTER_STATE.HURT;
      this.stateTimer = 0;
      this.stateDuration = 0.32;
      this.velocity.x = knockbackDir * 2.5;
    }
  }

  applyHitstop(duration = 0.07) {
    this.hitstopTimer = duration;
  }

  update(dt, totalTime) {
    // 1. Processa Hitstop (congelamento temporário)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      // Tremor visual da Capcom
      const shakeAmp = 0.08;
      this.shakeOffset.set((Math.random() - 0.5) * shakeAmp, (Math.random() - 0.5) * shakeAmp, 0);
      this.mesh.position.copy(this.position).add(this.shakeOffset);
      return;
    } else {
      this.shakeOffset.set(0, 0, 0);
    }

    this.stateTimer += dt;
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= dt;
    }

    // 2. Auto-Facing Estilo Street Fighter II:
    // No chão, SEMPRE olha para o oponente se não estiver em ataque travado ou knockdown!
    const isGrounded = this.position.y <= 0.01;
    if (this.opponent && isGrounded && ![
      FIGHTER_STATE.HURT,
      FIGHTER_STATE.KNOCKED_DOWN,
      FIGHTER_STATE.WAKEUP,
      FIGHTER_STATE.VICTORY,
      FIGHTER_STATE.DEFEAT,
      FIGHTER_STATE.SPECIAL_SUPER,
      FIGHTER_STATE.THROW
    ].includes(this.state)) {
      const dirToOpp = this.opponent.position.x > this.position.x ? 1 : -1;
      this.facing = dirToOpp;
      this.mesh.rotation.y = this.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
    }

    // 3. Gravidade e Física Aérea
    if (this.position.y > 0 || this.velocity.y > 0) {
      this.velocity.y -= 27.0 * dt; // Gravidade ágil de arcade
      this.position.y += this.velocity.y * dt;
      this.jumpAirTime += dt;

      if (this.position.y <= 0) {
        this.position.y = 0;
        this.velocity.y = 0;
        this.jumpAirTime = 0;

        // Se aterrissou de um pulo ou ataque aéreo, volta ao IDLE e ajusta facing imediatamente!
        if ([FIGHTER_STATE.JUMP, FIGHTER_STATE.JUMP_KICK, FIGHTER_STATE.JUMP_PUNCH, FIGHTER_STATE.DASH_BACKWARD].includes(this.state)) {
          this.state = FIGHTER_STATE.IDLE;
          this.jumpType = 'neutral';
          if (this.opponent) {
            this.facing = this.opponent.position.x > this.position.x ? 1 : -1;
            this.mesh.rotation.y = this.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
          }
        }
      }
    }

    // 4. Movimento Horizontal
    this.position.x += this.velocity.x * dt;

    // Atrito no solo
    if (isGrounded && this.state !== FIGHTER_STATE.WALK && this.state !== FIGHTER_STATE.DASH_FORWARD) {
      this.velocity.x *= 0.8;
    }

    // 5. Limites da Arena
    this.position.x = Math.max(-this.stageLimit, Math.min(this.stageLimit, this.position.x));
    this.mesh.position.copy(this.position);

    // 6. Atualiza Hurtbox de acordo com agachado, em pé ou no ar
    let hHeight = 2.1;
    let hCenterY = 1.05;
    if (this.state === FIGHTER_STATE.CROUCH || this.state === FIGHTER_STATE.CROUCH_BLOCK || this.state === FIGHTER_STATE.CROUCH_KICK) {
      hHeight = 1.15;
      hCenterY = 0.58;
    } else if (this.state === FIGHTER_STATE.KNOCKED_DOWN) {
      hHeight = 0.5;
      hCenterY = 0.25;
    }

    this.hurtbox.setFromCenterAndSize(
      new THREE.Vector3(this.position.x, this.position.y + hCenterY, this.position.z),
      new THREE.Vector3(0.85, hHeight, 0.8)
    );

    // 7. Atualiza Hitbox de Ataque
    this.isHitboxActive = false;
    if (this.attackData) {
      const activeWindow = this.stateTimer >= this.attackData.startup && this.stateTimer <= this.attackData.active;
      if (activeWindow && !this.hasHitCurrentAttack) {
        this.isHitboxActive = true;
        const hitX = this.position.x + this.facing * (this.attackData.reach * 0.55);
        this.hitbox.setFromCenterAndSize(
          new THREE.Vector3(hitX, this.position.y + this.attackData.height, this.position.z),
          new THREE.Vector3(this.attackData.reach, 0.75, 0.85)
        );
      }
    }

    // 8. Transições de Fim de Estado
    if (this.stateDuration > 0 && this.stateTimer >= this.stateDuration) {
      if (this.state === FIGHTER_STATE.KNOCKED_DOWN) {
        if (this.health <= 0) {
          this.state = FIGHTER_STATE.DEFEAT;
        } else {
          // Levanta com invencibilidade (Wake-up!)
          this.state = FIGHTER_STATE.WAKEUP;
          this.stateTimer = 0;
          this.stateDuration = 0.35;
          this.invincibilityTimer = 0.45;
        }
      } else if (this.state === FIGHTER_STATE.WAKEUP) {
        this.state = FIGHTER_STATE.IDLE;
        this.attackData = null;
      } else if (![FIGHTER_STATE.VICTORY, FIGHTER_STATE.DEFEAT, FIGHTER_STATE.JUMP, FIGHTER_STATE.JUMP_KICK].includes(this.state)) {
        this.state = FIGHTER_STATE.IDLE;
        this.attackData = null;
      }
    }

    // 9. Atualização das Animações no Modelo 3D
    this.updateAnimation(totalTime);
    this.model.updateBobblehead(dt);
  }

  updateAnimation(totalTime) {
    const isBackWalk = (this.facing === 1 && this.velocity.x < -0.1) || (this.facing === -1 && this.velocity.x > 0.1);

    switch (this.state) {
      case FIGHTER_STATE.IDLE:
        this.model.animateIdle(totalTime);
        break;

      case FIGHTER_STATE.WALK:
        this.model.animateWalk(totalTime, isBackWalk);
        break;

      case FIGHTER_STATE.DASH_FORWARD:
        this.model.animateDash(false);
        break;

      case FIGHTER_STATE.DASH_BACKWARD:
        this.model.animateDash(true);
        break;

      case FIGHTER_STATE.JUMP:
        {
          const flipProg = Math.min(1.0, this.jumpAirTime / 0.85);
          this.model.animateJump(this.velocity.y, this.jumpType, flipProg);
        }
        break;

      case FIGHTER_STATE.CROUCH:
        this.model.animateCrouch();
        break;

      case FIGHTER_STATE.STAND_BLOCK:
        this.model.animateBlock(false);
        break;

      case FIGHTER_STATE.CROUCH_BLOCK:
      case FIGHTER_STATE.BLOCKED:
        this.model.animateBlock(true);
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

      case FIGHTER_STATE.CROUCH_LIGHT:
        this.model.animateCrouchPunch(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.CROUCH_HEAVY:
        this.model.animateUppercut(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.CROUCH_KICK:
        // RASTEIRA SWEEP
        this.model.animateSweep(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.JUMP_KICK:
        // VOADORA CLÁSSICA
        this.model.animateJumpKick(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.JUMP_PUNCH:
        this.model.animateJumpPunch(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.THROW:
        this.model.animateThrow(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.SPECIAL_1:
        this.model.animateHadouken(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.SPECIAL_2:
        this.model.animateTatsumaki(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.SPECIAL_SUPER:
        this.model.animateSpecial(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.HURT:
        this.model.animateHurt(this.stateTimer / this.stateDuration);
        break;

      case FIGHTER_STATE.KNOCKED_DOWN:
        this.model.animateKnockdown(Math.min(1.0, this.stateTimer / 0.8), false);
        break;

      case FIGHTER_STATE.WAKEUP:
        this.model.animateKnockdown(this.stateTimer / this.stateDuration, true);
        break;

      case FIGHTER_STATE.VICTORY:
        this.model.animateVictory(totalTime);
        break;

      case FIGHTER_STATE.DEFEAT:
        this.model.animateKnockdown(1.0, false);
        break;
    }
  }
}
