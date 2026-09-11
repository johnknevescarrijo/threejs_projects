import { ITEM_PROPERTIES, TRACK_CONFIG } from '../core/constants.js';

export class HUD {
  constructor({ onToggleDebug, onToggleSound, onResetRace }) {
    this.onToggleDebug = onToggleDebug;
    this.onToggleSound = onToggleSound;
    this.onResetRace = onResetRace;

    this.posNumberEl = document.getElementById('pos-num');
    this.posSuffixEl = document.getElementById('pos-suf');
    this.posTotalEl = document.getElementById('pos-tot');
    this.lapNumEl = document.getElementById('lap-num');
    this.itemSlotEl = document.getElementById('item-slot');
    this.speedValEl = document.getElementById('speed-val');
    this.driftBarEl = document.getElementById('drift-bar-fill');
    this.notificationEl = document.getElementById('notification-banner');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    this.telemetryAIEl = document.getElementById('telemetry-ai-info');
    this.debugBtn = document.getElementById('btn-toggle-sensors');
    this.soundBtn = document.getElementById('btn-toggle-sound');
    this.restartBtn = document.getElementById('btn-restart');
    this.finishModal = document.getElementById('race-finish-modal');
    this.finishTitle = document.getElementById('finish-title');
    this.finishDetails = document.getElementById('finish-details');

    this.rouletteActive = false;
    this.rouletteTimer = 0;
    this.displayedItem = null;
    this.notificationTimer = 0;

    this.initEventListeners();
  }

  initEventListeners() {
    if (this.debugBtn) {
      this.debugBtn.addEventListener('click', () => {
        if (this.onToggleDebug) this.onToggleDebug();
      });
    }
    if (this.soundBtn) {
      this.soundBtn.addEventListener('click', () => {
        if (this.onToggleSound) this.onToggleSound();
      });
    }
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => {
        if (this.onResetRace) this.onResetRace();
      });
    }
  }

  showNotification(text, duration = 2.5) {
    if (!this.notificationEl) return;
    this.notificationEl.textContent = text;
    this.notificationEl.classList.add('active');
    this.notificationTimer = duration;
  }

  triggerItemRoulette(finalItem, onComplete) {
    this.rouletteActive = true;
    this.rouletteTimer = 1.2;
    this.itemSlotEl.classList.add('roulette');

    const icons = ['🍄', '🐢', '🎯', '🍌', '⚡', '👑'];
    let count = 0;

    const interval = setInterval(() => {
      if (!this.rouletteActive) {
        clearInterval(interval);
        return;
      }
      this.itemSlotEl.textContent = icons[count % icons.length];
      count++;
    }, 80);

    setTimeout(() => {
      this.rouletteActive = false;
      clearInterval(interval);
      this.itemSlotEl.classList.remove('roulette');
      this.displayedItem = finalItem;
      const prop = ITEM_PROPERTIES[finalItem];
      this.itemSlotEl.textContent = prop ? prop.icon : '❓';
      if (onComplete) onComplete();
    }, 1200);
  }

  clearItemSlot() {
    this.displayedItem = null;
    if (this.itemSlotEl) {
      this.itemSlotEl.textContent = '';
      this.itemSlotEl.classList.remove('roulette');
    }
  }

  update(deltaTime, playerKart, allKarts, aiControllers, track) {
    // 1. Position Suffix formatting (1st, 2nd, 3rd, 4th...)
    const pos = playerKart.racePosition || 1;
    let suffix = 'th';
    if (pos === 1) suffix = 'st';
    else if (pos === 2) suffix = 'nd';
    else if (pos === 3) suffix = 'rd';

    if (this.posNumberEl) this.posNumberEl.textContent = pos;
    if (this.posSuffixEl) this.posSuffixEl.textContent = suffix;
    if (this.posTotalEl) this.posTotalEl.textContent = `/ ${allKarts.length}`;

    // 2. Lap Display
    const currentLap = Math.min(playerKart.currentLap, TRACK_CONFIG.TOTAL_LAPS);
    if (this.lapNumEl) {
      this.lapNumEl.textContent = `${currentLap} / ${TRACK_CONFIG.TOTAL_LAPS}`;
    }

    // 3. Speedometer & Drift Bar
    const kmh = Math.round(Math.abs(playerKart.speed) * 3.6);
    if (this.speedValEl) this.speedValEl.textContent = kmh;

    if (this.driftBarEl) {
      if (playerKart.isDrifting) {
        const pct = Math.min(100, (playerKart.driftChargeTime / 2.4) * 100);
        this.driftBarEl.style.width = `${pct}%`;
        if (playerKart.driftStage === 1) {
          this.driftBarEl.style.background = '#38bdf8'; // Blue
        } else if (playerKart.driftStage === 2) {
          this.driftBarEl.style.background = '#f97316'; // Orange
        }
      } else {
        this.driftBarEl.style.width = '0%';
      }
    }

    // 4. Notifications fade
    if (this.notificationTimer > 0) {
      this.notificationTimer -= deltaTime;
      if (this.notificationTimer <= 0) {
        this.notificationEl.classList.remove('active');
      }
    }

    // 5. Render Minimap
    this.renderMinimap(track, allKarts, playerKart);

    // 6. Update AI Telemetry text
    if (this.telemetryAIEl && aiControllers.length > 0) {
      const leaderAI = aiControllers[0];
      const ddaStr = leaderAI.ddaActive ? `DDA Mod: ${leaderAI.ddaSpeedMod.toFixed(2)}x Vel` : 'Fair Play Lock (OFF)';
      this.telemetryAIEl.innerHTML = `
        <strong>${leaderAI.kart.name}</strong> (${leaderAI.archetype.name})<br/>
        <span>Pos: ${leaderAI.kart.racePosition}º | Lap ${leaderAI.kart.currentLap} | ${ddaStr}</span>
      `;
    }
  }

  renderMinimap(track, allKarts, playerKart) {
    if (!this.minimapCtx || !track.samples || track.samples.length === 0) return;

    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Track bounding box mapping to canvas coords
    // Circuit coordinates are roughly X: [-180, 230], Z: [-350, 220]
    const minX = -200, maxX = 240;
    const minZ = -360, maxZ = 240;

    const toCanvasX = (x) => ((x - minX) / (maxX - minX)) * (w - 24) + 12;
    const toCanvasY = (z) => ((z - minZ) / (maxZ - minZ)) * (h - 24) + 12;

    // Draw track path
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    track.samples.forEach((sample, idx) => {
      const cx = toCanvasX(sample.point.x);
      const cy = toCanvasY(sample.point.z);
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw off-road shortcut path in dashed orange
    if (track.shortcutCurve) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const pt = track.shortcutCurve.getPointAt(i / 20);
        const cx = toCanvasX(pt.x);
        const cy = toCanvasY(pt.z);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw AI racers dots
    allKarts.forEach(kart => {
      if (kart.isPlayer) return;
      const cx = toCanvasX(kart.position.x);
      const cy = toCanvasY(kart.position.z);
      ctx.fillStyle = '#' + kart.color.toString(16).padStart(6, '0');
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Player dot (larger, glowing cyan/yellow)
    const px = toCanvasX(playerKart.position.x);
    const py = toCanvasY(playerKart.position.z);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  showRaceFinish(finalPosition, allKarts) {
    if (!this.finishModal) return;
    this.finishModal.classList.add('active');

    const isWinner = finalPosition === 1;
    this.finishTitle.textContent = isWinner ? '🏆 VITÓRIA ÉPICA! 🏆' : `🏁 FIM DE CORRIDA: ${finalPosition}º LUGAR`;
    this.finishTitle.style.color = isWinner ? '#facc15' : '#38bdf8';

    let tableHtml = '<table style="width:100%; border-collapse:collapse; margin-top:14px; text-align:left;">';
    tableHtml += '<tr style="border-bottom:1px solid #64748b; color:#94a3b8;"><th>Pos</th><th>Piloto</th><th>Tipo</th></tr>';

    allKarts.forEach((k, idx) => {
      const archetypeName = k.archetype ? k.archetype.name : (k.isPlayer ? 'Jogador' : 'Piloto');
      const isPlayerRow = k.isPlayer ? 'style="color:#facc15; font-weight:bold;"' : '';
      tableHtml += `<tr ${isPlayerRow} style="border-bottom:1px solid #334155; height:28px;">
        <td>${idx + 1}º</td>
        <td>${k.name}</td>
        <td>${archetypeName}</td>
      </tr>`;
    });
    tableHtml += '</table>';

    this.finishDetails.innerHTML = tableHtml;
  }

  hideRaceFinish() {
    if (this.finishModal) {
      this.finishModal.classList.remove('active');
    }
  }
}
