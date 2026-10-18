import { CHARACTERS } from '../characters/CharacterData.js';
import { sounds } from '../sound/SoundManager.js';

/**
 * CharacterSelect - Tela interativa de Seleção de Candidatos
 * com cards estilizados, atributos eleitorais, frases e botão verde da Urna!
 */
export class CharacterSelect {
  constructor(container, onStartBattle) {
    this.container = container;
    this.onStartBattle = onStartBattle;

    this.selectedP1 = 'lula';
    this.selectedP2 = 'flavio';
    this.gameMode = 'pve'; // 'pve' ou 'pvp'
    this.selectionStep = 1; // 1: escolhendo P1, 2: escolhendo P2

    this.element = document.createElement('div');
    this.element.id = 'character-select-screen';
    this.render();
  }

  render() {
    this.element.innerHTML = `
      <style>
        #character-select-screen {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, #172554 0%, #090d16 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
          color: #ffffff;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          z-index: 500;
          user-select: none;
          overflow-y: auto;
        }

        .select-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .select-title {
          font-size: 42px;
          font-weight: 900;
          color: #facc15;
          text-shadow: 0 0 20px rgba(250, 204, 21, 0.5), 3px 3px 0 #000;
          letter-spacing: 2px;
          margin: 0;
        }

        .select-subtitle {
          font-size: 16px;
          color: #94a3b8;
          font-weight: bold;
          margin-top: 4px;
        }

        /* Seletor de Modo */
        .mode-toggle-container {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          background: rgba(15, 23, 42, 0.8);
          padding: 6px;
          border-radius: 30px;
          border: 2px solid #334155;
        }

        .mode-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 8px 24px;
          font-size: 15px;
          font-weight: 900;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-btn.active {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 0 12px rgba(37, 99, 235, 0.6);
        }

        /* Grade de Candidatos */
        .cards-grid {
          display: flex;
          justify-content: center;
          gap: 18px;
          flex-wrap: wrap;
          max-width: 1200px;
          margin-bottom: 28px;
        }

        .candidate-card {
          width: 210px;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border: 3px solid #334155;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s ease-out;
          position: relative;
        }

        .candidate-card:hover {
          transform: translateY(-8px);
          border-color: #facc15;
          box-shadow: 0 12px 24px rgba(250, 204, 21, 0.25);
        }

        .candidate-card.selected-p1 {
          border-color: #3b82f6;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
        }

        .candidate-card.selected-p2 {
          border-color: #ef4444;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
        }

        .card-number-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #facc15;
          color: #000;
          font-weight: 900;
          font-size: 16px;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .card-avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          margin: 12px 0 8px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          background: #334155;
        }

        .card-name {
          font-size: 20px;
          font-weight: 900;
          margin-bottom: 2px;
          text-align: center;
        }

        .card-title {
          font-size: 11px;
          color: #94a3b8;
          font-weight: bold;
          text-align: center;
          margin-bottom: 12px;
        }

        .stat-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .stat-bar-bg {
          width: 100px;
          height: 6px;
          background: #334155;
          border-radius: 3px;
          overflow: hidden;
        }

        .stat-bar-fill {
          height: 100%;
          background: #facc15;
        }

        /* Detalhe do Selecionado e Botão CONFIRMA da Urna */
        .select-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .selection-status {
          font-size: 18px;
          font-weight: 800;
          color: #e2e8f0;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .tag-p1 {
          background: #2563eb;
          padding: 4px 14px;
          border-radius: 20px;
        }

        .tag-p2 {
          background: #dc2626;
          padding: 4px 14px;
          border-radius: 20px;
        }

        /* O Lendário Botão CONFIRMA da Urna Eletrônica */
        .btn-confirma-urna {
          background: linear-gradient(180deg, #16a34a 0%, #15803d 100%);
          color: #ffffff;
          font-size: 24px;
          font-weight: 900;
          padding: 16px 48px;
          border: 4px solid #4ade80;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(22, 163, 74, 0.5);
          letter-spacing: 2px;
          transition: transform 0.1s, box-shadow 0.1s;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-confirma-urna:hover {
          transform: scale(1.05);
          box-shadow: 0 10px 30px rgba(74, 222, 128, 0.7);
        }

        .btn-confirma-urna:active {
          transform: scale(0.98);
        }
      </style>

      <div class="select-header">
        <h1 class="select-title">ELEIÇÕES 2026: DEBATE MORTAL</h1>
        <div class="select-subtitle">EDIÇÃO ESPECIAL CHARGE 3D • TRIBUNAL SUPERIOR DO K.O.</div>
      </div>

      <!-- Alternador de Modo -->
      <div class="mode-toggle-container">
        <button class="mode-btn ${this.gameMode === 'pve' ? 'active' : ''}" id="mode-pve-btn">1 JOGADOR vs CPU</button>
        <button class="mode-btn ${this.gameMode === 'pvp' ? 'active' : ''}" id="mode-pvp-btn">2 JOGADORES (LOCAL)</button>
      </div>

      <!-- Grade com os 5 Candidatos -->
      <div class="cards-grid" id="cards-container">
        ${Object.values(CHARACTERS).map(c => `
          <div class="candidate-card ${this.selectedP1 === c.id ? 'selected-p1' : ''} ${this.selectedP2 === c.id ? 'selected-p2' : ''}" data-id="${c.id}">
            <div class="card-number-badge">${c.number}</div>
            <div class="card-avatar" style="border-color:${c.themeColor};">
              ${this.getCandidateEmoji(c.id)}
            </div>
            <div class="card-name" style="color:${c.themeColor};">${c.name}</div>
            <div class="card-title">${c.title}</div>

            <div class="stat-row">
              <span>ATAQUE</span>
              <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${c.stats.ataque}%;"></div></div>
            </div>
            <div class="stat-row">
              <span>DEFESA</span>
              <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${c.stats.defesa}%;"></div></div>
            </div>
            <div class="stat-row">
              <span>VELOCIDADE</span>
              <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${c.stats.velocidade}%;"></div></div>
            </div>
            <div class="stat-row">
              <span>CARISMA</span>
              <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${c.stats.carisma}%;"></div></div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Rodapé de Confirmação -->
      <div class="select-footer">
        <div class="selection-status">
          <span class="tag-p1">P1: ${CHARACTERS[this.selectedP1].name.toUpperCase()}</span>
          <span>VS</span>
          <span class="tag-p2">${this.gameMode === 'pve' ? 'CPU' : 'P2'}: ${CHARACTERS[this.selectedP2].name.toUpperCase()}</span>
        </div>

        <button class="btn-confirma-urna" id="btn-confirma">
          🟢 CONFIRMA (INICIAR DEBATE)
        </button>
      </div>
    `;

    this.container.appendChild(this.element);
    this.bindEvents();
  }

  getCandidateEmoji(id) {
    switch (id) {
      case 'lula': return '🥩';
      case 'flavio': return '🍫';
      case 'renan': return '⚡';
      case 'caiado': return '🤠';
      case 'curry': return '🏀';
      default: return '🗳️';
    }
  }

  bindEvents() {
    // Alternar Modo
    document.getElementById('mode-pve-btn').addEventListener('click', () => {
      sounds.playUrnaClick();
      this.gameMode = 'pve';
      this.updateUI();
    });

    document.getElementById('mode-pvp-btn').addEventListener('click', () => {
      sounds.playUrnaClick();
      this.gameMode = 'pvp';
      this.updateUI();
    });

    // Seleção de cards
    const cards = this.element.querySelectorAll('.candidate-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        sounds.playUrnaClick();
        const cid = card.getAttribute('data-id');

        if (this.gameMode === 'pve') {
          // No modo 1P vs CPU, clicar muda o P1, e escolhe um oponente diferente aleatório se for igual
          this.selectedP1 = cid;
          if (this.selectedP2 === cid) {
            const others = Object.keys(CHARACTERS).filter(k => k !== cid);
            this.selectedP2 = others[Math.floor(Math.random() * others.length)];
          }
        } else {
          // No modo PvP, alternar escolha
          if (this.selectionStep === 1) {
            this.selectedP1 = cid;
            this.selectionStep = 2;
          } else {
            this.selectedP2 = cid;
            this.selectionStep = 1;
          }
        }

        this.updateUI();
      });
    });

    // Botão Confirma Urna
    document.getElementById('btn-confirma').addEventListener('click', () => {
      // O LENDÁRIO TOQUE DA URNA ELETRÔNICA!
      sounds.playUrnaSound();

      setTimeout(() => {
        this.element.style.display = 'none';
        if (this.onStartBattle) {
          this.onStartBattle({
            p1: CHARACTERS[this.selectedP1],
            p2: CHARACTERS[this.selectedP2],
            mode: this.gameMode
          });
        }
      }, 700);
    });
  }

  updateUI() {
    this.element.remove();
    this.render();
  }

  show() {
    this.element.style.display = 'flex';
  }
}
