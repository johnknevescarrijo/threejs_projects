export class HUD {
  constructor() {
    this.dom = {
      healthVal: document.getElementById('health-val'),
      healthBar: document.getElementById('health-bar-fill'),
      armorVal: document.getElementById('armor-val'),
      armorBar: document.getElementById('armor-bar-fill'),
      ammoVal: document.getElementById('ammo-val'),
      reserveVal: document.getElementById('reserve-val'),
      weaponName: document.getElementById('weapon-name'),
      killfeed: document.getElementById('killfeed'),
      hitmarker: document.getElementById('hitmarker'),
      damageOverlay: document.getElementById('damage-overlay'),
      crosshair: document.getElementById('crosshair'),
      crossTop: document.getElementById('ch-top'),
      crossBottom: document.getElementById('ch-bottom'),
      crossLeft: document.getElementById('ch-left'),
      crossRight: document.getElementById('ch-right'),
      scoreKills: document.getElementById('score-kills'),
      scoreDeaths: document.getElementById('score-deaths'),
      timer: document.getElementById('match-timer'),
      deathScreen: document.getElementById('death-screen'),
      deathTimerVal: document.getElementById('death-timer-val'),
      deathBarFill: document.getElementById('death-bar-fill')
    };

    this.hitmarkerTimer = 0;
    this.damageOverlayTimer = 0;
    this.lastHealth = 100;
  }

  showHitmarker(isHeadshot = false) {
    if (!this.dom.hitmarker) return;
    this.dom.hitmarker.classList.remove('headshot', 'active');
    void this.dom.hitmarker.offsetWidth; // Force reflow
    if (isHeadshot) {
      this.dom.hitmarker.classList.add('headshot');
    }
    this.dom.hitmarker.classList.add('active');
    this.hitmarkerTimer = 0.2;
  }

  showDamageFlash() {
    if (!this.dom.damageOverlay) return;
    this.dom.damageOverlay.style.opacity = '0.65';
    this.damageOverlayTimer = 0.35;
  }

  addKillfeedEntry(killer, weapon, victim, isHeadshot = false) {
    if (!this.dom.killfeed) return;

    const entry = document.createElement('div');
    entry.className = 'killfeed-entry';
    
    const hsIcon = isHeadshot ? '<span class="kf-hs">🎯 HEADSHOT</span>' : '';
    entry.innerHTML = `
      <span class="kf-killer">${killer}</span>
      <span class="kf-weapon">[${weapon}]</span>
      ${hsIcon}
      <span class="kf-victim">${victim}</span>
    `;

    this.dom.killfeed.appendChild(entry);

    // Auto remove after 4.5s
    setTimeout(() => {
      if (entry.parentNode) {
        entry.style.opacity = '0';
        setTimeout(() => entry.remove(), 400);
      }
    }, 4500);
  }

  update(player, weaponManager, elapsedTime) {
    // 1. Health & Armor
    if (this.dom.healthVal) {
      this.dom.healthVal.textContent = Math.max(0, player.health);
      this.dom.healthBar.style.width = `${Math.max(0, player.health)}%`;
    }
    if (this.dom.armorVal) {
      this.dom.armorVal.textContent = Math.max(0, player.armor);
      this.dom.armorBar.style.width = `${Math.max(0, player.armor)}%`;
    }

    // Damage flash check
    if (player.health < this.lastHealth) {
      this.showDamageFlash();
      this.lastHealth = player.health;
    }

    // 2. Ammo & Weapon
    const curW = weaponManager.currentWeapon;
    if (this.dom.ammoVal && this.dom.reserveVal && this.dom.weaponName) {
      if (weaponManager.isReloading) {
        this.dom.ammoVal.textContent = 'RELOAD...';
      } else {
        this.dom.ammoVal.textContent = curW.currentAmmo;
      }
      this.dom.reserveVal.textContent = curW.reserveAmmo;
      this.dom.weaponName.textContent = curW.name;
    }

    // Weapon slot active highlight
    const tabAK = document.getElementById('weapon-slot-1');
    const tabDeagle = document.getElementById('weapon-slot-2');
    if (tabAK && tabDeagle) {
      tabAK.classList.toggle('active', curW.id === 'ak47');
      tabDeagle.classList.toggle('active', curW.id === 'deagle');
    }

    // 3. Dynamic Crosshair Spread
    const baseGap = 5;
    const spreadPx = baseGap + Math.round(weaponManager.currentSpread * 450);

    if (this.dom.crossTop && this.dom.crossBottom && this.dom.crossLeft && this.dom.crossRight) {
      this.dom.crossTop.style.transform = `translateY(-${spreadPx}px)`;
      this.dom.crossBottom.style.transform = `translateY(${spreadPx}px)`;
      this.dom.crossLeft.style.transform = `translateX(-${spreadPx}px)`;
      this.dom.crossRight.style.transform = `translateX(${spreadPx}px)`;
    }

    // 4. Hitmarker & Damage Timers
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= 0.016;
      if (this.hitmarkerTimer <= 0 && this.dom.hitmarker) {
        this.dom.hitmarker.classList.remove('active', 'headshot');
      }
    }

    if (this.damageOverlayTimer > 0) {
      this.damageOverlayTimer -= 0.016;
      if (this.damageOverlayTimer <= 0 && this.dom.damageOverlay) {
        this.dom.damageOverlay.style.opacity = '0';
      }
    }

    // 5. Score & Timer
    if (this.dom.scoreKills) this.dom.scoreKills.textContent = player.kills;
    if (this.dom.scoreDeaths) this.dom.scoreDeaths.textContent = player.deaths;

    if (this.dom.timer) {
      const minutes = Math.floor(elapsedTime / 60);
      const seconds = Math.floor(elapsedTime % 60);
      this.dom.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // 6. Death Screen with Auto-Respawn Countdown
    if (this.dom.deathScreen) {
      if (!player.isAlive) {
        this.dom.deathScreen.style.display = 'flex';
        const remainingSec = Math.max(0, player.autoRespawnTimer).toFixed(1);
        if (this.dom.deathTimerVal) {
          this.dom.deathTimerVal.textContent = `${remainingSec}s`;
        }
        if (this.dom.deathBarFill) {
          const pct = Math.max(0, Math.min(100, (player.autoRespawnTimer / player.maxRespawnTime) * 100));
          this.dom.deathBarFill.style.width = `${pct}%`;
        }
      } else {
        this.dom.deathScreen.style.display = 'none';
      }
    }
  }
}
