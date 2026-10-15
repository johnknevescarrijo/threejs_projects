import { ITEM_PROPERTIES, TRACK_CONFIG } from '../core/constants.js';

export class HUD {
  constructor({ onToggleDebug, onToggleBloom, onToggleCamera, onToggleSound, onResetRace, onPlayAgain }) {
    this.onToggleDebug = onToggleDebug;
    this.onToggleBloom = onToggleBloom;
    this.onToggleCamera = onToggleCamera;
    this.onToggleSound = onToggleSound;
    this.onResetRace = onResetRace;
    this.onPlayAgain = onPlayAgain;

    this.posNumberEl = document.getElementById('pos-num');
    this.posSuffixEl = document.getElementById('pos-suf');
    this.posTotalEl = document.getElementById('pos-tot');
    this.raceTimerEl = document.getElementById('race-timer');
    this.lapNumEl = document.getElementById('lap-num');
    this.bestLapEl = document.getElementById('best-lap-text');
    this.itemSlotEl = document.getElementById('item-slot');

    this.gearBadgeEl = document.getElementById('gear-badge');
    this.speedValEl = document.getElementById('speed-val');
    this.speedTachEl = document.getElementById('speed-tach-fill');
    this.driftBarEl = document.getElementById('drift-bar-fill');
    this.driftLabelEl = document.getElementById('drift-stage-label');

    this.countdownOverlayEl = document.getElementById('countdown-overlay');
    this.countdownTextEl = document.getElementById('countdown-text');
    this.countdownSubEl = document.getElementById('countdown-sub');
    this.light1El = document.getElementById('light-1');
    this.light2El = document.getElementById('light-2');
    this.light3El = document.getElementById('light-3');

    this.notificationEl = document.getElementById('notification-banner');
    this.threatWarningEl = document.getElementById('threat-warning');
    this.standingsTowerEl = document.getElementById('standings-tower');

    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    this.telemetryAIEl = document.getElementById('telemetry-ai-info');
    this.debugBtn = document.getElementById('btn-toggle-sensors');
    this.bloomBtn = document.getElementById('btn-toggle-bloom');
    this.cameraBtn = document.getElementById('btn-toggle-camera');
    this.soundBtn = document.getElementById('btn-toggle-sound');
    this.restartBtn = document.getElementById('btn-restart');
    this.playAgainBtn = document.getElementById('btn-play-again');

    this.finishModal = document.getElementById('race-finish-modal');
    this.finishTitle = document.getElementById('finish-title');
    this.finishDetails = document.getElementById('finish-details');

    this.rouletteActive = false;
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
    if (this.bloomBtn) {
      this.bloomBtn.addEventListener('click', () => {
        if (this.onToggleBloom) this.onToggleBloom();
      });
    }
    if (this.cameraBtn) {
      this.cameraBtn.addEventListener('click', () => {
        if (this.onToggleCamera) this.onToggleCamera();
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
    if (this.playAgainBtn) {
      this.playAgainBtn.addEventListener('click', () => {
        if (this.onPlayAgain) this.onPlayAgain();
        else location.reload();
      });
    }
  }

  formatTime(seconds) {
    if (!seconds || seconds < 0) return '00:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  }

  updateCountdown(countdownTimer) {
    if (!this.countdownOverlayEl) return;

    if (countdownTimer <= -0.6) {
      this.countdownOverlayEl.classList.add('hidden');
      return;
    }

    this.countdownOverlayEl.classList.remove('hidden');
    this.light1El.className = 'light-bulb';
    this.light2El.className = 'light-bulb';
    this.light3El.className = 'light-bulb';

    if (countdownTimer > 2.0) {
      this.light1El.classList.add('red');
      this.countdownTextEl.textContent = '3';
      this.countdownTextEl.style.color = '#ef4444';
    } else if (countdownTimer > 1.0) {
      this.light1El.classList.add('red');
      this.light2El.classList.add('red');
      this.countdownTextEl.textContent = '2';
      this.countdownTextEl.style.color = '#f97316';
    } else if (countdownTimer > 0.0) {
      this.light1El.classList.add('red');
      this.light2El.classList.add('red');
      this.light3El.classList.add('red');
      this.countdownTextEl.textContent = '1';
      this.countdownTextEl.style.color = '#facc15';
    } else {
      this.light1El.classList.add('green');
      this.light2El.classList.add('green');
      this.light3El.classList.add('green');
      this.countdownTextEl.textContent = 'GO!';
      this.countdownTextEl.style.color = '#22c55e';
      if (this.countdownSubEl) this.countdownSubEl.textContent = 'ACELERE TUDO!';
    }
  }

  showNotification(text, duration = 2.2) {
    if (!this.notificationEl) return;
    this.notificationEl.textContent = text;
    this.notificationEl.classList.add('active');
    this.notificationTimer = duration;
  }

  triggerItemRoulette(finalItem, onComplete) {
    this.rouletteActive = true;
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
    }, 75);

    setTimeout(() => {
      this.rouletteActive = false;
      clearInterval(interval);
      this.itemSlotEl.classList.remove('roulette');
      this.displayedItem = finalItem;
      const prop = ITEM_PROPERTIES[finalItem];
      this.itemSlotEl.textContent = prop ? prop.icon : '❓';
      if (onComplete) onComplete();
    }, 1050);
  }

  clearItemSlot() {
    this.displayedItem = null;
    if (this.itemSlotEl) {
      this.itemSlotEl.innerHTML = '<span class="item-empty-hint">ITEM</span>';
      this.itemSlotEl.classList.remove('roulette');
    }
  }

  update(deltaTime, playerKart, allKarts, aiControllers, track, raceTime = 0, bestLapTime = null, incomingThreat = null, activeProjectiles = []) {
    // 1. Position Suffix formatting
    const pos = playerKart.racePosition || 1;
    let suffix = 'º';
    if (this.posNumberEl) this.posNumberEl.textContent = pos;
    if (this.posSuffixEl) this.posSuffixEl.textContent = suffix;
    if (this.posTotalEl) this.posTotalEl.textContent = `/ ${allKarts.length}`;

    // 2. Race Timer & Lap Display
    if (this.raceTimerEl) {
      this.raceTimerEl.textContent = this.formatTime(raceTime);
    }
    const currentLap = Math.min(playerKart.currentLap, TRACK_CONFIG.TOTAL_LAPS);
    if (this.lapNumEl) {
      this.lapNumEl.textContent = `${currentLap} / ${TRACK_CONFIG.TOTAL_LAPS}`;
    }
    if (this.bestLapEl && bestLapTime) {
      this.bestLapEl.textContent = `MELHOR: ${this.formatTime(bestLapTime)}`;
    }

    // 3. Speedometer, Gear, Tachometer & Drift Bar
    const kmh = Math.round(Math.abs(playerKart.speed) * 3.6);
    if (this.speedValEl) this.speedValEl.textContent = kmh;

    if (this.gearBadgeEl) {
      if (playerKart.speed < -1) this.gearBadgeEl.textContent = 'R';
      else if (kmh < 5) this.gearBadgeEl.textContent = 'N';
      else if (playerKart.isBoosting) this.gearBadgeEl.textContent = 'S';
      else {
        const gear = Math.min(6, Math.max(1, Math.ceil(kmh / 32)));
        this.gearBadgeEl.textContent = String(gear);
      }
    }

    if (this.speedTachEl) {
      const tachPct = Math.min(100, (kmh / 210) * 100);
      this.speedTachEl.style.width = `${tachPct}%`;
    }

    if (this.driftBarEl) {
      if (playerKart.isDrifting) {
        const pct = Math.min(100, (playerKart.driftChargeTime / 2.4) * 100);
        this.driftBarEl.style.width = `${pct}%`;
        if (playerKart.driftStage === 2) {
          this.driftBarEl.style.background = '#f97316';
          if (this.driftLabelEl) {
            this.driftLabelEl.textContent = '🔥 SUPER-TURBO PRONTO!';
            this.driftLabelEl.style.color = '#fb923c';
          }
        } else if (playerKart.driftStage === 1) {
          this.driftBarEl.style.background = '#38bdf8';
          if (this.driftLabelEl) {
            this.driftLabelEl.textContent = '⚡ MINI-TURBO PRONTO!';
            this.driftLabelEl.style.color = '#38bdf8';
          }
        } else {
          this.driftBarEl.style.background = '#94a3b8';
          if (this.driftLabelEl) {
            this.driftLabelEl.textContent = 'CARREGANDO DRIFT...';
            this.driftLabelEl.style.color = '#94a3b8';
          }
        }
      } else {
        this.driftBarEl.style.width = '0%';
        if (this.driftLabelEl) {
          this.driftLabelEl.textContent = 'TURBO DRIFT';
          this.driftLabelEl.style.color = '#64748b';
        }
      }
    }

    // 4. Incoming Homing Threat Warning
    if (this.threatWarningEl) {
      if (incomingThreat) {
        const name = incomingThreat.type === 'BLUE_SHELL' ? 'CASCO AZUL' : 'CASCO VERMELHO';
        this.threatWarningEl.textContent = `⚠️ ALERTA: ${name} A ${Math.round(incomingThreat.distance)}m! ⚠️`;
        this.threatWarningEl.classList.add('active');
      } else {
        this.threatWarningEl.classList.remove('active');
      }
    }

    // 5. Notifications fade
    if (this.notificationTimer > 0) {
      this.notificationTimer -= deltaTime;
      if (this.notificationTimer <= 0) {
        this.notificationEl.classList.remove('active');
      }
    }

    // 6. Live 8-Racer Standings Tower
    this.updateStandingsTower(allKarts);

    // 7. Render Minimap
    this.renderMinimap(track, allKarts, playerKart, activeProjectiles);

    // 8. Update AI Telemetry text (shows nearest or leading AI rival)
    if (this.telemetryAIEl && aiControllers.length > 0) {
      let focusAI = aiControllers[0];
      for (const ctrl of aiControllers) {
        if (ctrl.kart.racePosition === 1 || (playerKart.racePosition === 1 && ctrl.kart.racePosition === 2)) {
          focusAI = ctrl;
          break;
        }
      }
      const ddaStr = focusAI.ddaActive ? `DDA: ${(focusAI.ddaSpeedMod * 100).toFixed(0)}%` : 'Fair Play (300m)';
      const modeStr = focusAI.isTakingShortcut ? 'Atalho!' : (focusAI.kart.isDrifting ? 'Drift' : 'Racing Line');
      this.telemetryAIEl.innerHTML = `
        <strong>${focusAI.kart.name}</strong> • <span style="color:#38bdf8">${focusAI.archetype.name}</span><br/>
        <span>Pos: ${focusAI.kart.racePosition}º | ${modeStr} | ${ddaStr}</span>
      `;
    }
  }

  updateStandingsTower(allKarts) {
    if (!this.standingsTowerEl) return;
    let html = '';
    allKarts.forEach((kart, idx) => {
      const colorHex = '#' + kart.color.toString(16).padStart(6, '0');
      const itemIcon = kart.heldItem && ITEM_PROPERTIES[kart.heldItem] ? ITEM_PROPERTIES[kart.heldItem].icon : '';
      const shortName = kart.isPlayer ? 'VOCÊ (Player)' : kart.name.split(' ')[0];
      html += `
        <div class="standing-row ${kart.isPlayer ? 'is-player' : ''}">
          <div class="standing-left">
            <span class="standing-pos">${idx + 1}º</span>
            <span class="standing-dot" style="background:${colorHex}"></span>
            <span>${shortName}</span>
          </div>
          <span class="standing-item">${itemIcon}</span>
        </div>
      `;
    });
    this.standingsTowerEl.innerHTML = html;
  }

  renderMinimap(track, allKarts, playerKart, activeProjectiles = []) {
    if (!this.minimapCtx || !track.samples || track.samples.length === 0) return;

    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const minX = -205, maxX = 250;
    const minZ = -365, maxZ = 255;

    const toCanvasX = (x) => ((x - minX) / (maxX - minX)) * (w - 28) + 14;
    const toCanvasY = (z) => ((z - minZ) / (maxZ - minZ)) * (h - 28) + 14;

    // Track outline shadow
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 10;
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

    // Track road ribbon
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Off-road shortcut path in dashed orange
    if (track.shortcutCurve) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
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

    // Start/Finish marker
    const s0 = track.samples[0].point;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(toCanvasX(s0.x) - 5, toCanvasY(s0.z) - 2, 10, 4);

    // Active projectiles on minimap
    activeProjectiles.forEach(p => {
      const cx = toCanvasX(p.position.x);
      const cy = toCanvasY(p.position.z);
      ctx.fillStyle = p.isBlueShell ? '#00f2fe' : '#ef4444';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // AI racers dots
    allKarts.forEach(kart => {
      if (kart.isPlayer) return;
      const cx = toCanvasX(kart.position.x);
      const cy = toCanvasY(kart.position.z);
      ctx.fillStyle = '#' + kart.color.toString(16).padStart(6, '0');
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Player directional arrow / glowing marker
    const px = toCanvasX(playerKart.position.x);
    const py = toCanvasY(playerKart.position.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(playerKart.forward.x, -playerKart.forward.z));
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  showRaceFinish(finalPosition, allKarts, totalTime) {
    if (!this.finishModal) return;
    this.finishModal.classList.add('active');

    const isWinner = finalPosition === 1;
    this.finishTitle.textContent = isWinner ? '🏆 VITÓRIA ÉPICA! 🏆' : `🏁 ${finalPosition}º LUGAR FINAL`;
    this.finishTitle.style.color = isWinner ? '#facc15' : '#38bdf8';

    let tableHtml = `<div style="color:#94a3b8; font-size:14px; margin-bottom:10px;">Tempo Total: <b style="color:#fff">${this.formatTime(totalTime)}</b></div>`;
    tableHtml += '<table style="width:100%; border-collapse:collapse; margin-top:8px; text-align:left;">';
    tableHtml += '<tr style="border-bottom:1px solid #475569; color:#94a3b8; height:28px;"><th>Pos</th><th>Piloto</th><th>Arquétipo IA</th></tr>';

    allKarts.forEach((k, idx) => {
      const archetypeName = k.archetype ? k.archetype.name : (k.isPlayer ? 'Jogador Humano' : 'Piloto IA');
      const isPlayerRow = k.isPlayer ? 'style="color:#facc15; font-weight:bold; background:rgba(250,204,21,0.12);"' : '';
      tableHtml += `<tr ${isPlayerRow} style="border-bottom:1px solid #1e293b; height:32px;">
        <td style="padding-left:6px;">${idx + 1}º</td>
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
