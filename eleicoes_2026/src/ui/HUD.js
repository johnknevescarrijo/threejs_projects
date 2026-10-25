import { sounds } from '../sound/SoundManager.js';

/**
 * HUD - Interface de Usuário estilo Transmissão de TV de Debate Político
 */
export class HUD {
  constructor(container) {
    this.container = container;
    this.element = document.createElement('div');
    this.element.id = 'debate-hud';
    this.element.innerHTML = `
      <style>
        #debate-hud {
          position: absolute;
          inset: 0;
          pointer-events: none;
          user-select: none;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          overflow: hidden;
        }

        /* Top Bar de TV */
        .tv-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 110px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 12px 24px;
          background: linear-gradient(180deg, rgba(10, 16, 26, 0.95) 0%, rgba(10, 16, 26, 0) 100%);
        }

        /* Barra de Vida / Intenção de Voto */
        .fighter-hud {
          width: 38%;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .fighter-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 900;
          color: #ffffff;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }

        .fighter-name {
          font-size: 24px;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fighter-number {
          background: #ffd600;
          color: #111;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 16px;
        }

        .health-bar-container {
          position: relative;
          height: 26px;
          background: #1a202c;
          border: 3px solid #ffffff;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          overflow: hidden;
        }

        .health-bar-fill {
          height: 100%;
          width: 100%;
          background: linear-gradient(90deg, #ff1744, #ffeb3b, #00e676);
          transition: width 0.15s ease-out;
        }

        .p2-hud .health-bar-fill {
          background: linear-gradient(270deg, #ff1744, #ffeb3b, #00e676);
          float: right;
        }

        .health-pct {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
          color: #ffffff;
          text-shadow: 1px 1px 2px #000000;
        }

        /* Fundo Eleitoral / Especial Meter */
        .special-bar-container {
          position: relative;
          height: 14px;
          background: #0f172a;
          border: 2px solid #64748b;
          border-radius: 4px;
          overflow: hidden;
        }

        .special-bar-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #0284c7, #38bdf8, #e0e7ff);
          transition: width 0.1s ease-out;
        }

        .special-ready {
          animation: specialPulse 0.5s infinite alternate;
          background: linear-gradient(90deg, #f59e0b, #fbbf24, #fffbeb) !important;
        }

        @keyframes specialPulse {
          from { filter: drop-shadow(0 0 4px #fbbf24); }
          to { filter: drop-shadow(0 0 14px #f59e0b); }
        }

        .special-label {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: #ffffff;
          text-shadow: 1px 1px 2px #000;
        }

        /* Cronômetro Central de Debate */
        .timer-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #111827;
          border: 3px solid #f59e0b;
          border-radius: 8px;
          padding: 6px 18px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.6);
        }

        .timer-label {
          font-size: 10px;
          font-weight: 900;
          color: #fbbf24;
          letter-spacing: 1px;
        }

        .timer-digits {
          font-size: 38px;
          font-weight: 900;
          color: #ffffff;
          line-height: 1;
        }

        .rounds-tracker {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }

        .urn-icon {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #374151;
          border: 1px solid #9ca3af;
        }

        .urn-won {
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
        }

        /* Letreiro Inferior de Notícias de TV */
        .tv-ticker {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 38px;
          background: #b91c1c;
          border-top: 2px solid #facc15;
          display: flex;
          align-items: center;
          color: #ffffff;
          font-weight: 800;
          font-size: 14px;
          overflow: hidden;
        }

        .ticker-badge {
          background: #facc15;
          color: #000;
          padding: 0 16px;
          height: 100%;
          display: flex;
          align-items: center;
          font-weight: 900;
          letter-spacing: 1px;
          flex-shrink: 0;
        }

        .ticker-marquee {
          white-space: nowrap;
          animation: marquee 30s linear infinite;
          padding-left: 100%;
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-200%); }
        }

        /* Balões de HQ e Discursos */
        .comic-pop {
          position: absolute;
          pointer-events: none;
          font-weight: 900;
          font-size: 32px;
          color: #ffeb3b;
          text-shadow: 3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000;
          transform: translate(-50%, -50%) scale(0.5);
          animation: popComic 0.65s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          z-index: 100;
        }

        @keyframes popComic {
          0% { transform: translate(-50%, -50%) scale(0.2) rotate(-8deg); opacity: 0; }
          40% { transform: translate(-50%, -50%) scale(1.3) rotate(6deg); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(1.0) rotate(-2deg); opacity: 1; }
          100% { transform: translate(-50%, -70%) scale(0.8) rotate(0); opacity: 0; }
        }

        .special-speech-balloon {
          position: absolute;
          top: 140px;
          left: 50%;
          transform: translateX(-50%);
          background: #ffffff;
          color: #000000;
          padding: 16px 28px;
          border-radius: 20px;
          border: 4px solid #111827;
          box-shadow: 0 8px 30px rgba(0,0,0,0.6);
          font-size: 26px;
          font-weight: 900;
          text-align: center;
          animation: popSpeech 1.6s forwards;
          z-index: 120;
        }

        @keyframes popSpeech {
          0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
          15% { transform: translateX(-50%) scale(1.1); opacity: 1; }
          85% { transform: translateX(-50%) scale(1.0); opacity: 1; }
          100% { transform: translateX(-50%) scale(0.8); opacity: 0; }
        }

        /* Anúncio Central de Round */
        .round-announcement {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0;
          pointer-events: none;
          z-index: 200;
        }

        .round-active {
          animation: announceRound 1.8s forwards;
        }

        @keyframes announceRound {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
          20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          75% { transform: translate(-50%, -50%) scale(1.0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
        }

        .round-text-main {
          font-size: 72px;
          font-weight: 900;
          color: #facc15;
          text-shadow: 4px 4px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000;
          letter-spacing: 2px;
        }

        .round-text-sub {
          font-size: 32px;
          font-weight: 900;
          color: #ffffff;
          text-shadow: 2px 2px 4px #000;
        }

        /* Tela de Vitória / Eleito 2026 */
        .winner-modal {
          position: absolute;
          inset: 0;
          background: rgba(10, 16, 26, 0.92);
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
          z-index: 300;
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .winner-card {
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border: 4px solid #f59e0b;
          border-radius: 16px;
          padding: 32px 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 0 50px rgba(245, 158, 11, 0.4);
          text-align: center;
          max-width: 500px;
        }

        .winner-badge {
          background: #22c55e;
          color: #ffffff;
          padding: 6px 18px;
          border-radius: 20px;
          font-weight: 900;
          font-size: 16px;
          margin-bottom: 12px;
        }

        .winner-name {
          font-size: 42px;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .winner-slogan {
          font-size: 18px;
          color: #cbd5e1;
          font-style: italic;
          margin-bottom: 24px;
        }

        .btn-rematch {
          background: linear-gradient(180deg, #22c55e, #16a34a);
          color: #ffffff;
          font-size: 20px;
          font-weight: 900;
          padding: 14px 36px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.4);
          transition: transform 0.1s, box-shadow 0.1s;
        }

        .btn-rematch:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(34, 197, 94, 0.6);
        }

        /* Botão Mudo */
        .btn-audio {
          position: absolute;
          top: 14px;
          right: 14px;
          background: rgba(30, 41, 59, 0.85);
          border: 2px solid #64748b;
          color: #ffffff;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          pointer-events: auto;
        }

        /* Guia de Controles no Canto Inferior */
        .controls-hint {
          position: absolute;
          bottom: 46px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 16px;
          background: rgba(15, 23, 42, 0.85);
          padding: 6px 16px;
          border-radius: 20px;
          border: 1px solid #475569;
          font-size: 12px;
          color: #e2e8f0;
          font-weight: bold;
        }

        .key-badge {
          background: #334155;
          padding: 2px 6px;
          border-radius: 4px;
          color: #facc15;
        }

        /* Botão Guia de Golpes & Combos */
        .btn-guide {
          position: absolute;
          top: 14px;
          right: 140px;
          background: rgba(30, 41, 59, 0.9);
          border: 2px solid #f59e0b;
          color: #fbbf24;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 2px 10px rgba(245, 158, 11, 0.3);
          transition: transform 0.1s, background 0.1s;
        }

        .btn-guide:hover {
          transform: scale(1.05);
          background: rgba(245, 158, 11, 0.2);
        }

        /* Modal do Guia de Golpes e Combos */
        .guide-modal {
          position: absolute;
          inset: 0;
          background: rgba(10, 16, 26, 0.88);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 500;
          pointer-events: auto;
          animation: fadeIn 0.2s ease-out;
        }

        .guide-card {
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border: 3px solid #f59e0b;
          border-radius: 16px;
          padding: 24px 32px;
          max-width: 680px;
          width: 90%;
          color: #ffffff;
          box-shadow: 0 0 40px rgba(0,0,0,0.8);
        }

        .guide-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #334155;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }

        .guide-header h2 {
          margin: 0;
          color: #fbbf24;
          font-size: 24px;
          letter-spacing: 1px;
        }

        .guide-close {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 24px;
          font-weight: 900;
          cursor: pointer;
        }

        .guide-close:hover {
          color: #ffffff;
        }

        .guide-section {
          margin-bottom: 16px;
        }

        .guide-section h3 {
          margin: 0 0 6px 0;
          color: #38bdf8;
          font-size: 16px;
          letter-spacing: 0.5px;
        }

        .guide-section p {
          margin: 4px 0;
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.4;
        }

        /* Contador de Combo Estilizado */
        .combo-counter-hud {
          position: absolute;
          top: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
          z-index: 150;
          animation: comboPop 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .combo-counter-p1 {
          left: 14%;
        }

        .combo-counter-p2 {
          right: 14%;
        }

        .combo-hits-number {
          font-size: 56px;
          font-weight: 900;
          font-style: italic;
          color: #fbbf24;
          text-shadow: 4px 4px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000;
          line-height: 0.9;
        }

        .combo-hits-title {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 1px;
          color: #ffffff;
          background: rgba(0, 0, 0, 0.75);
          padding: 3px 12px;
          border-radius: 6px;
          border-left: 4px solid #f59e0b;
          text-shadow: 2px 2px 4px #000;
          margin-top: 4px;
        }

        @keyframes comboPop {
          0% { transform: scale(0.6); opacity: 0.5; }
          60% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1.0); opacity: 1; }
        }

        /* Banner de Counter Hit & First Attack */
        .mechanic-banner {
          position: absolute;
          pointer-events: none;
          font-weight: 900;
          font-size: 24px;
          color: #ffffff;
          padding: 6px 18px;
          border-radius: 8px;
          text-shadow: 2px 2px 4px #000;
          z-index: 140;
          animation: bannerAnim 0.85s forwards;
        }

        .banner-counter {
          background: linear-gradient(90deg, #dc2626, #b91c1c);
          border: 2px solid #f87171;
          box-shadow: 0 0 16px rgba(220, 38, 38, 0.7);
        }

        .banner-first-attack {
          background: linear-gradient(90deg, #d97706, #b45309);
          border: 2px solid #fcd34d;
          box-shadow: 0 0 16px rgba(217, 119, 6, 0.7);
        }

        @keyframes bannerAnim {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          20% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
          80% { transform: translate(-50%, -50%) scale(1.0); opacity: 1; }
          100% { transform: translate(-50%, -80%) scale(0.85); opacity: 0; }
        }
      </style>

      <div class="tv-header">
        <!-- Lutador 1 -->
        <div class="fighter-hud p1-hud">
          <div class="fighter-info">
            <div class="fighter-name">
              <span id="p1-name">LULA</span>
              <span class="fighter-number" id="p1-number">13</span>
            </div>
            <div class="rounds-tracker" id="p1-rounds">
              <div class="urn-icon"></div>
              <div class="urn-icon"></div>
            </div>
          </div>
          <div class="health-bar-container">
            <div class="health-bar-fill" id="p1-health" style="width: 100%;"></div>
            <div class="health-pct" id="p1-pct">100% INTENÇÃO DE VOTOS</div>
          </div>
          <div class="special-bar-container">
            <div class="special-bar-fill" id="p1-special" style="width: 20%;"></div>
            <div class="special-label" id="p1-special-label">FUNDO ELEITORAL: 20%</div>
          </div>
        </div>

        <!-- Cronômetro Central -->
        <div class="timer-box">
          <span class="timer-label">TEMPO DE FALA</span>
          <span class="timer-digits" id="timer-digits">99</span>
        </div>

        <!-- Lutador 2 -->
        <div class="fighter-hud p2-hud">
          <div class="fighter-info">
            <div class="rounds-tracker" id="p2-rounds">
              <div class="urn-icon"></div>
              <div class="urn-icon"></div>
            </div>
            <div class="fighter-name">
              <span class="fighter-number" id="p2-number">22</span>
              <span id="p2-name">FLÁVIO</span>
            </div>
          </div>
          <div class="health-bar-container">
            <div class="health-bar-fill" id="p2-health" style="width: 100%;"></div>
            <div class="health-pct" id="p2-pct">100% INTENÇÃO DE VOTOS</div>
          </div>
          <div class="special-bar-container">
            <div class="special-bar-fill" id="p2-special" style="width: 20%;"></div>
            <div class="special-label" id="p2-special-label">FUNDO ELEITORAL: 20%</div>
          </div>
        </div>
      </div>

      <!-- Letreiro de Notícias de TV -->
      <div class="tv-ticker">
        <div class="ticker-badge">🔴 PLANTÃO ELEIÇÕES 2026</div>
        <div class="ticker-marquee">
          DATA-FOLHA: Clássico do Arcade no Debate 2026! ⚡ Lula dispara Hadouken de picanha cósmica: "Faz o L, companheiro!" ⚡ Flávio Bolsonaro pede questão de ordem e lança trufas de chocolate direto do Senado ⚡ Renan Santos dispara o Livro Amarelo e invoca a Onça da Missão 14 ⚡ Ronaldo Caiado racha o plenário com o berrante: "Aqui em Goiás bandido muda de profissão ou muda de estado!" ⚡ Eduardo Cury arremessa urnas eletrônicas de 3 pontos do meio da quadra! ⚡ TSE declara: Rasteiras e Voadoras liberadas na corrida eleitoral!
        </div>
      </div>

      <!-- Guia de Controles Rápidos Estilo Street Fighter II -->
      <div class="controls-hint">
        <span>🎮 P1: <span class="key-badge">A/D</span> Mover (Dash: duplo toque)</span>
        <span><span class="key-badge">S</span> Agachar (Segure Trás = Defender)</span>
        <span><span class="key-badge">W + H</span> VOADORA!</span>
        <span><span class="key-badge">S + H</span> RASTEIRA!</span>
        <span><span class="key-badge">F / G</span> Jab / Gancho</span>
        <span><span class="key-badge">U</span> Especial 1 (Hadouken)</span>
        <span><span class="key-badge">I</span> Especial 2</span>
        <span><span class="key-badge">ESPAÇO</span> SUPER ESPECIAL!</span>
      </div>

      <!-- Botão Guia de Comandos e Combos -->
      <button class="btn-guide" id="btn-toggle-guide">📜 GOLPES & COMBOS [TAB]</button>

      <!-- Botão de Áudio -->
      <button class="btn-audio" id="btn-toggle-audio">🔊 SOM: ON</button>

      <!-- Guia Modal de Comandos e Combos -->
      <div class="guide-modal" id="guide-modal" style="display: none;">
        <div class="guide-card">
          <div class="guide-header">
            <h2>🥋 GUIA DE GOLPES & TARGET COMBOS</h2>
            <button class="guide-close" id="btn-close-guide">✕</button>
          </div>
          <div class="guide-body">
            <div class="guide-section">
              <h3>⚡ COMBOS FLUIDOS & CANCELAMENTOS</h3>
              <p>• <b>Target Combo Básico:</b> <span class="key-badge">F</span> (Soco Rápido) ➔ <span class="key-badge">G</span> (Gancho) ➔ <span class="key-badge">H</span> (Chute)</p>
              <p>• <b>Target Combo Baixo:</b> <span class="key-badge">S + F</span> (Cutucão) ➔ <span class="key-badge">S + H</span> (Rasteira Knockdown!)</p>
              <p>• <b>Special Cancel:</b> Qualquer soco ou chute que conecte no adversário pode ser cancelado imediatamente em <span class="key-badge">U</span> (Hadouken), <span class="key-badge">I</span> (Especial 2) ou <span class="key-badge">ESPAÇO</span> (Super)!</p>
            </div>
            <div class="guide-section">
              <h3>🕹️ GOLPES CLÁSSICOS DE STREET FIGHTER</h3>
              <p>• <b>Voadora Clássica (Overhead):</b> <span class="key-badge">W + H</span> (Salto + Chute — quebra defesa agachada!)</p>
              <p>• <b>A Rasteira (Low Knockdown):</b> <span class="key-badge">S + H</span> (Quebra defesa em pé e derruba no chão!)</p>
              <p>• <b>Shoryuken / Uppercut Antiaéreo:</b> <span class="key-badge">S + G</span> ou comando arcade <span class="key-badge">→ ↓ ↘ + G</span></p>
              <p>• <b>Hadouken / Projétil:</b> <span class="key-badge">U</span> ou comando arcade <span class="key-badge">↓ ↘ → + F</span></p>
              <p>• <b>Agarrão (Throw):</b> <span class="key-badge">→ + G</span> colado no adversário</p>
              <p>• <b>Dash / Backdash:</b> Toque duplo rápido em <span class="key-badge">A</span> ou <span class="key-badge">D</span></p>
            </div>
            <div class="guide-section">
              <h3>💥 MECÂNICAS AVANÇADAS</h3>
              <p>• <b>Counter Hit (+20% Dano):</b> Intercepte o início de um golpe inimigo!</p>
              <p>• <b>First Attack:</b> Primeiro acerto do round ganha +15% de Fundo Eleitoral!</p>
              <p>• <b>Clash de Projéteis:</b> Especiais de mesmo nível colidem e se anulam no ar com choque sísmico!</p>
              <p>• <b>Super Especial:</b> Com 100% de Fundo Eleitoral, pressione <span class="key-badge">ESPAÇO</span> para ativar a Aura Cósmica!</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Anúncio de Turno -->
      <div class="round-announcement" id="round-box">
        <div class="round-text-main" id="round-title">1º TURNO</div>
        <div class="round-text-sub">LUTA PELO BRASIL!</div>
      </div>

      <!-- Modal de Campeão Eleito -->
      <div class="winner-modal" id="winner-modal">
        <div class="winner-card">
          <div class="winner-badge">⭐ ELEITO PRESIDENTE DO BRASIL 2026 ⭐</div>
          <div class="winner-name" id="winner-name-text">LULA</div>
          <div class="winner-slogan" id="winner-slogan-text">"Faz o L, Companheiro!"</div>
          <button class="btn-rematch" id="btn-rematch-action">NOVO DEBATE ELEITORAL (CONFIRMA 🟢)</button>
        </div>
      </div>
    `;

    this.container.appendChild(this.element);

    // Eventos de Botão
    document.getElementById('btn-toggle-audio').addEventListener('click', () => {
      const isMuted = sounds.toggleMute();
      document.getElementById('btn-toggle-audio').innerText = isMuted ? '🔇 SOM: OFF' : '🔊 SOM: ON';
    });

    document.getElementById('btn-toggle-guide').addEventListener('click', () => {
      this.toggleGuideModal();
    });

    document.getElementById('btn-close-guide').addEventListener('click', () => {
      this.toggleGuideModal(false);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleGuideModal();
      }
    });
  }

  setupFighters(f1Data, f2Data) {
    document.getElementById('p1-name').innerText = f1Data.name.toUpperCase();
    document.getElementById('p1-number').innerText = f1Data.number;
    document.getElementById('p2-name').innerText = f2Data.name.toUpperCase();
    document.getElementById('p2-number').innerText = f2Data.number;
  }

  updateBars(f1, f2, timeLeft, p1Wins, p2Wins) {
    // P1 Health
    const p1Hp = Math.max(0, f1.health);
    document.getElementById('p1-health').style.width = `${p1Hp}%`;
    document.getElementById('p1-pct').innerText = `${Math.ceil(p1Hp)}% INTENÇÃO`;

    // P1 Special
    const p1Sp = Math.min(100, f1.specialMeter);
    const p1SpBar = document.getElementById('p1-special');
    p1SpBar.style.width = `${p1Sp}%`;
    if (p1Sp >= 100) {
      p1SpBar.classList.add('special-ready');
      document.getElementById('p1-special-label').innerText = '✨ SUPER PRONTO! [ESPAÇO] ✨';
    } else {
      p1SpBar.classList.remove('special-ready');
      document.getElementById('p1-special-label').innerText = `FUNDO ELEITORAL: ${Math.ceil(p1Sp)}%`;
    }

    // P2 Health
    const p2Hp = Math.max(0, f2.health);
    document.getElementById('p2-health').style.width = `${p2Hp}%`;
    document.getElementById('p2-pct').innerText = `${Math.ceil(p2Hp)}% INTENÇÃO`;

    // P2 Special
    const p2Sp = Math.min(100, f2.specialMeter);
    const p2SpBar = document.getElementById('p2-special');
    p2SpBar.style.width = `${p2Sp}%`;
    if (p2Sp >= 100) {
      p2SpBar.classList.add('special-ready');
      document.getElementById('p2-special-label').innerText = '✨ SUPER PRONTO! ✨';
    } else {
      p2SpBar.classList.remove('special-ready');
      document.getElementById('p2-special-label').innerText = `FUNDO ELEITORAL: ${Math.ceil(p2Sp)}%`;
    }

    // Timer
    document.getElementById('timer-digits').innerText = timeLeft;

    // Marcadores de Turnos (Urnas)
    this.updateUrnMarkers('p1-rounds', p1Wins);
    this.updateUrnMarkers('p2-rounds', p2Wins);
  }

  updateUrnMarkers(elementId, wins) {
    const container = document.getElementById(elementId);
    if (!container) return;
    const icons = container.querySelectorAll('.urn-icon');
    icons.forEach((icon, idx) => {
      if (idx < wins) {
        icon.classList.add('urn-won');
      } else {
        icon.classList.remove('urn-won');
      }
    });
  }

  showRoundAnnouncement(title, onFinish) {
    const box = document.getElementById('round-box');
    document.getElementById('round-title').innerText = title;
    box.classList.remove('round-active');
    void box.offsetWidth; // Trigger reflow
    box.classList.add('round-active');

    setTimeout(() => {
      if (onFinish) onFinish();
    }, 1800);
  }

  showComicWord(text, worldPos) {
    // Projeção simples na tela
    const el = document.createElement('div');
    el.className = 'comic-pop';
    el.innerText = text;

    const screenX = window.innerWidth * 0.5 + worldPos.x * 40;
    const screenY = window.innerHeight * 0.5 - worldPos.y * 40;

    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    this.element.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 650);
  }

  showSpecialSpeech(candidateName, quote) {
    const el = document.createElement('div');
    el.className = 'special-speech-balloon';
    el.innerHTML = `<span style="color:#d32f2f;">${candidateName}:</span> "${quote}"`;
    this.element.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 1600);
  }

  showWinnerScreen(winnerData, onRematch) {
    const modal = document.getElementById('winner-modal');
    document.getElementById('winner-name-text').innerText = winnerData.fullName.toUpperCase();
    document.getElementById('winner-slogan-text').innerText = `"${winnerData.slogan}"`;
    modal.style.display = 'flex';

    const btn = document.getElementById('btn-rematch-action');
    btn.onclick = () => {
      sounds.playUrnaSound();
      modal.style.display = 'none';
      if (onRematch) onRematch();
    };
  }

  toggleGuideModal(forceState = null) {
    const modal = document.getElementById('guide-modal');
    if (!modal) return;
    const isVisible = modal.style.display === 'flex';
    const newState = forceState !== null ? forceState : !isVisible;
    modal.style.display = newState ? 'flex' : 'none';
  }

  showComboCount(hits, worldPos, isP2 = false) {
    const id = isP2 ? 'combo-box-p2' : 'combo-box-p1';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = `combo-counter-hud ${isP2 ? 'combo-counter-p2' : 'combo-counter-p1'}`;
      this.element.appendChild(el);
    }

    let title = `${hits} HITS COMBO!`;
    if (hits === 3) title = '3 HITS - CPI INSTALADA! 📋';
    else if (hits === 4) title = '4 HITS - IMPEACHMENT! ⚖️';
    else if (hits >= 5) title = `${hits} HITS - MAIORIA ABSOLUTA! 🗳️`;

    el.innerHTML = `
      <span class="combo-hits-number">${hits}</span>
      <span class="combo-hits-title">${title}</span>
    `;

    // Reinicia animação de escala
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'comboPop 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.remove();
    }, 1100);
  }

  showCounterHit(worldPos) {
    const el = document.createElement('div');
    el.className = 'mechanic-banner banner-counter';
    el.innerText = '💥 COUNTER HIT! (+20% DANO)';

    const screenX = window.innerWidth * 0.5 + worldPos.x * 38;
    const screenY = window.innerHeight * 0.5 - worldPos.y * 38 - 35;

    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    this.element.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 850);
  }

  showFirstAttack(worldPos) {
    const el = document.createElement('div');
    el.className = 'mechanic-banner banner-first-attack';
    el.innerText = '⚡ FIRST ATTACK! (+15% FUNDO ELEITORAL)';

    const screenX = window.innerWidth * 0.5 + worldPos.x * 38;
    const screenY = window.innerHeight * 0.5 - worldPos.y * 38 - 65;

    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    this.element.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 950);
  }
}
