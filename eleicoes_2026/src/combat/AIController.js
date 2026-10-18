import { FIGHTER_STATE } from '../characters/Fighter.js';

/**
 * AIController - Inteligência Artificial para o modo 1 Jogador vs CPU
 * Gera comandos dinâmicos adaptados à distância, barra de especial e estilo de cada candidato.
 */
export class AIController {
  constructor(fighter, opponent) {
    this.fighter = fighter;
    this.opponent = opponent;

    this.decisionTimer = 0;
    this.decisionInterval = 0.12; // Reavalia a cada 120ms para reflexos naturais
    this.currentInput = {
      left: false,
      right: false,
      up: false,
      down: false,
      light: false,
      heavy: false,
      kick: false,
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
    // Reseta comandos pontuais de ataque
    this.currentInput.light = false;
    this.currentInput.heavy = false;
    this.currentInput.kick = false;
    this.currentInput.special = false;

    if (!this.opponent || this.fighter.state === FIGHTER_STATE.DEFEAT) {
      this.resetMovement();
      return;
    }

    const myPos = this.fighter.getPosition();
    const oppPos = this.opponent.getPosition();
    const dist = Math.abs(myPos.x - oppPos.x);
    const charId = this.fighter.characterData.id;

    // 1. Prioridade Máxima: Usar Golpe Especial se Fundo Eleitoral estiver cheio!
    if (this.fighter.specialMeter >= 100) {
      // Se tiver linha de visão favorável
      if (dist < 8.0 && Math.random() < 0.75) {
        this.currentInput.special = true;
        this.resetMovement();
        return;
      }
    }

    // 2. Reação de Defesa: Se o oponente estiver atacando e próximo
    if (this.opponent.isHitboxActive && dist < 2.0) {
      const blockChance = charId === 'caiado' ? 0.75 : 0.55;
      if (Math.random() < blockChance) {
        this.currentInput.down = true; // Bloqueia agachado
        this.currentInput.left = false;
        this.currentInput.right = false;
        return;
      }
    } else {
      this.currentInput.down = false;
    }

    // 3. Tomada de Decisão baseada na Distância
    if (dist > 3.8) {
      // Longe: Aproximar do oponente
      const moveTowards = oppPos.x > myPos.x ? 'right' : 'left';
      this.currentInput.left = (moveTowards === 'left');
      this.currentInput.right = (moveTowards === 'right');

      // Pulo ocasional de aproximação (especialmente Renan e Curry)
      const jumpChance = (charId === 'curry' || charId === 'renan') ? 0.08 : 0.03;
      if (Math.random() < jumpChance && myPos.y <= 0.01) {
        this.currentInput.up = true;
      } else {
        this.currentInput.up = false;
      }
    } else if (dist <= 3.8 && dist >= 1.6) {
      // Meia-distância: Zona de finta ou preparação de golpe
      if (Math.random() < 0.35) {
        // Chute de alcance
        this.currentInput.kick = true;
      } else if (Math.random() < 0.3) {
        // Soco forte de avanço
        this.currentInput.heavy = true;
      } else {
        // Continua se aproximando com cautela
        const moveTowards = oppPos.x > myPos.x ? 'right' : 'left';
        this.currentInput.left = (moveTowards === 'left');
        this.currentInput.right = (moveTowards === 'right');
      }
    } else {
      // Corpo a corpo (< 1.6): Ataque fulminante
      this.resetMovement();

      const roll = Math.random();
      if (roll < 0.45) {
        // Soco leve rápido (comboável)
        this.currentInput.light = true;
      } else if (roll < 0.75) {
        // Soco forte / Gancho
        this.currentInput.heavy = true;
      } else if (roll < 0.92) {
        // Chute
        this.currentInput.kick = true;
      } else {
        // Passo para trás para esquiva
        const retreatDir = oppPos.x > myPos.x ? 'left' : 'right';
        this.currentInput.left = (retreatDir === 'left');
        this.currentInput.right = (retreatDir === 'right');
      }
    }
  }

  resetMovement() {
    this.currentInput.left = false;
    this.currentInput.right = false;
    this.currentInput.up = false;
  }
}
