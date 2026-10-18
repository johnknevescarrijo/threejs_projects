import { FIGHTER_STATE } from '../characters/Fighter.js';

/**
 * AIController - Inteligência Artificial inspirada no Arcade de Street Fighter II
 * Adapta decisões táticas: antiaéreo contra voadoras, rasteiras, bloqueio alto/baixo e especiais.
 */
export class AIController {
  constructor(fighter, opponent) {
    this.fighter = fighter;
    this.opponent = opponent;

    this.decisionTimer = 0;
    this.decisionInterval = 0.11; // 110ms para reflexos arcade naturais
    this.currentInput = {
      left: false,
      right: false,
      up: false,
      down: false,
      light: false,
      heavy: false,
      kick: false,
      special1: false,
      special2: false,
      special: false
    };
  }

  update(dt) {
    this.decisionTimer += dt;
    if (this.decisionTimer >= this.decisionInterval) {
      this.decisionTimer = 0;
      this.makeDecision();
    }

    return this.currentInput;
  }

  makeDecision() {
    // Reseta comandos de botões
    this.currentInput.light = false;
    this.currentInput.heavy = false;
    this.currentInput.kick = false;
    this.currentInput.special1 = false;
    this.currentInput.special2 = false;
    this.currentInput.special = false;

    if (!this.opponent || this.fighter.state === FIGHTER_STATE.DEFEAT) {
      this.resetMovement();
      return;
    }

    const myPos = this.fighter.getPosition();
    const oppPos = this.opponent.getPosition();
    const dist = Math.abs(myPos.x - oppPos.x);
    const charId = this.fighter.characterData.id;
    const isOppInAir = oppPos.y > 0.6;
    const amInAir = myPos.y > 0.3;

    // ==========================================
    // 1. COMPORTAMENTO NO AR (Voadora ou Soco Aéreo)
    // ==========================================
    if (amInAir) {
      if (Math.random() < 0.65) {
        this.currentInput.kick = true; // VOADORA CLÁSSICA!
      } else {
        this.currentInput.heavy = true;
      }
      return;
    }

    // ==========================================
    // 2. RESPOSTA ANTIAÉREA (Se o oponente pular em cima!)
    // ==========================================
    if (isOppInAir && dist < 2.4) {
      if (Math.random() < 0.68) {
        // Shoryuken / Uppercut Antiaéreo!
        this.currentInput.down = true;
        this.currentInput.heavy = true;
        return;
      } else {
        // Defende em pé (Stand Block contra voadora!)
        const backDir = oppPos.x > myPos.x ? 'left' : 'right';
        this.currentInput.left = (backDir === 'left');
        this.currentInput.right = (backDir === 'right');
        this.currentInput.down = false;
        return;
      }
    }

    // ==========================================
    // 3. PRIORIDADE: SUPER ESPECIAL SE A BARRA ESTIVER CHEIA
    // ==========================================
    if (this.fighter.specialMeter >= 100) {
      if (dist < 8.0 && Math.random() < 0.7) {
        this.currentInput.special = true;
        this.resetMovement();
        return;
      }
    }

    // ==========================================
    // 4. DEFESA DINÂMICA DE STREET FIGHTER II
    // ==========================================
    if (this.opponent.isHitboxActive && dist < 2.5) {
      const blockChance = charId === 'caiado' ? 0.8 : 0.62;
      if (Math.random() < blockChance) {
        const backDir = oppPos.x > myPos.x ? 'left' : 'right';
        this.currentInput.left = (backDir === 'left');
        this.currentInput.right = (backDir === 'right');

        // Se o oponente estiver agachado, defende baixo (Crouch Block)
        if (this.opponent.state === FIGHTER_STATE.CROUCH_KICK || this.opponent.state === FIGHTER_STATE.CROUCH) {
          this.currentInput.down = true;
        } else {
          this.currentInput.down = false; // Stand Block contra golpes altos
        }
        return;
      }
    } else {
      this.currentInput.down = false;
    }

    // ==========================================
    // 5. COMBATE À DISTÂNCIA E MEIA-DISTÂNCIA
    // ==========================================
    if (dist > 4.2) {
      // Longe: Soltar Hadouken (Especial 1) ou se aproximar
      if (Math.random() < 0.35) {
        this.currentInput.special1 = true;
        this.resetMovement();
        return;
      }

      // Aproximação
      const moveTowards = oppPos.x > myPos.x ? 'right' : 'left';
      this.currentInput.left = (moveTowards === 'left');
      this.currentInput.right = (moveTowards === 'right');

      // Pulo ofensivo ocasional (Forward Jump)
      if (Math.random() < 0.08 && myPos.y <= 0.01) {
        this.currentInput.up = true;
      }
    } else if (dist <= 4.2 && dist >= 1.7) {
      // Meia-distância: Zona de finta, Especial 2 (Avanço) ou Chute longo
      const roll = Math.random();
      if (roll < 0.28) {
        // Golpe de avanço / Especial 2
        this.currentInput.special2 = true;
      } else if (roll < 0.52) {
        // Chute em pé de alcance
        this.currentInput.kick = true;
      } else if (roll < 0.72) {
        // Hadouken rápido
        this.currentInput.special1 = true;
      } else {
        // Aproximação cautelosa
        const moveTowards = oppPos.x > myPos.x ? 'right' : 'left';
        this.currentInput.left = (moveTowards === 'left');
        this.currentInput.right = (moveTowards === 'right');
      }
    } else {
      // ==========================================
      // 6. CORPO A CORPO (< 1.7)
      // ==========================================
      this.resetMovement();
      const closeRoll = Math.random();

      if (closeRoll < 0.32) {
        // RASTEIRA CLÁSSICA (Sweep Knockdown!)
        this.currentInput.down = true;
        this.currentInput.kick = true;
      } else if (closeRoll < 0.58) {
        // Jab rápido em pé
        this.currentInput.light = true;
      } else if (closeRoll < 0.78) {
        // Gancho pesado
        this.currentInput.heavy = true;
      } else if (closeRoll < 0.9) {
        // Agarrão (Frente + Soco Forte colado!)
        const forwardDir = oppPos.x > myPos.x ? 'right' : 'left';
        this.currentInput.left = (forwardDir === 'left');
        this.currentInput.right = (forwardDir === 'right');
        this.currentInput.heavy = true;
      } else {
        // Backstep / Esquiva para trás
        const backDir = oppPos.x > myPos.x ? 'left' : 'right';
        this.currentInput.left = (backDir === 'left');
        this.currentInput.right = (backDir === 'right');
      }
    }
  }

  resetMovement() {
    this.currentInput.left = false;
    this.currentInput.right = false;
    this.currentInput.up = false;
    this.currentInput.down = false;
  }
}
