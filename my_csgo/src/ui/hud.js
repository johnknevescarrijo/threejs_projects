import { WEAPONS, WEAPON_ORDER_BY_CATEGORY, CATEGORY_LABELS } from '../config/weapons.js';

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
      fireModeBadge: document.getElementById('fire-mode-badge'),
      slot1: document.getElementById('weapon-slot-1'),
      slot2: document.getElementById('weapon-slot-2'),
      slot3: document.getElementById('weapon-slot-3'),
      killfeed: document.getElementById('killfeed'),
      hitmarker: document.getElementById('hitmarker'),
      damageOverlay: document.getElementById('damage-overlay'),
      crosshair: document.getElementById('crosshair-container'),
      crossTop: document.getElementById('ch-top'),
      crossBottom: document.getElementById('ch-bottom'),
      crossLeft: document.getElementById('ch-left'),
      crossRight: document.getElementById('ch-right'),
      sniperScope: document.getElementById('sniper-scope'),
      scopeZoomBadge: document.getElementById('scope-zoom-badge'),
      arsenalMenu: document.getElementById('arsenal-menu'),
      arsenalCategories: document.getElementById('arsenal-categories'),
      scoreCT: document.getElementById('score-ct'),
      scoreT: document.getElementById('score-t'),
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
    this.isArsenalOpen = false;
  }

  showHitmarker(isHeadshot = false) {
    if (!this.dom.hitmarker) return;
    this.dom.hitmarker.classList.remove('headshot', 'active');
    void this.dom.hitmarker.offsetWidth;
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

  addKillfeedEntry(killer, weapon, victim, isHeadshot = false, killerTeam = 'CT', victimTeam = 'T') {
    if (!this.dom.killfeed) return;

    const entry = document.createElement('div');
    entry.className = 'killfeed-entry';

    const killerClass = (killerTeam === 'CT') ? 'kf-killer-ct' : 'kf-killer-t';
    const victimClass = (victimTeam === 'CT') ? 'kf-victim-ct' : 'kf-victim-t';
    const hsIcon = isHeadshot ? '<span class="kf-hs">🎯 HEADSHOT</span>' : '';

    entry.innerHTML = `
      <span class="${killerClass}">${killer}</span>
      <span class="kf-weapon">[${weapon}]</span>
      ${hsIcon}
      <span class="${victimClass}">${victim}</span>
    `;

    this.dom.killfeed.appendChild(entry);

    setTimeout(() => {
      if (entry.parentNode) {
        entry.style.opacity = '0';
        setTimeout(() => entry.remove(), 400);
      }
    }, 4500);
  }

  renderArsenalMenu(weaponManager, onSelectWeapon) {
    if (!this.dom.arsenalCategories) return;
    this.dom.arsenalCategories.innerHTML = '';

    const buyCategories = ['pistols', 'smgs', 'shotguns', 'rifles', 'snipers'];
    const equippedIds = new Set(Object.values(weaponManager.slots));

    for (const catKey of buyCategories) {
      const ids = WEAPON_ORDER_BY_CATEGORY[catKey] || [];
      const col = document.createElement('div');
      col.className = 'arsenal-category-col';

      const title = document.createElement('div');
      title.className = 'arsenal-cat-title';
      title.textContent = CATEGORY_LABELS[catKey] || catKey;
      col.appendChild(title);

      for (const id of ids) {
        const w = WEAPONS[id];
        if (!w) continue;

        const card = document.createElement('button');
        card.type = 'button';
        card.className = `arsenal-card${equippedIds.has(id) ? ' equipped' : ''}`;

        const teamLabel = w.team === 'BOTH' ? 'CT/T' : w.team;
        const teamClass = w.team === 'CT' ? 'ct' : (w.team === 'T' ? 't' : '');

        const dmgPct = Math.min(100, Math.round(((w.isShotgun ? w.damage * 4 : w.damage) / 115) * 100));
        const rpmPct = Math.min(100, Math.round((w.rpm / 900) * 100));
        const mobPct = Math.min(100, Math.round((w.moveSpeed / 6.5) * 100));

        card.innerHTML = `
          <div class="arsenal-card-top">
            <span class="arsenal-card-name">${w.name}</span>
            <span class="arsenal-card-tag ${teamClass}">${teamLabel} • Slot ${w.slot}</span>
          </div>
          <div class="arsenal-stat-row">
            <span>Dano ${w.isShotgun ? `${w.pellets}×${w.damage}` : w.damage}</span>
            <div class="stat-mini-track"><div class="stat-mini-fill" style="width:${dmgPct}%"></div></div>
          </div>
          <div class="arsenal-stat-row">
            <span>Cadência ${w.rpm}</span>
            <div class="stat-mini-track"><div class="stat-mini-fill" style="width:${rpmPct}%"></div></div>
          </div>
          <div class="arsenal-stat-row">
            <span>Pente ${w.magSize}/${w.maxReserve}</span>
            <span>Mob ${w.moveSpeed.toFixed(1)}</span>
          </div>
          <div class="arsenal-stat-row">
            <span>Mobilidade</span>
            <div class="stat-mini-track"><div class="stat-mini-fill" style="width:${mobPct}%"></div></div>
          </div>
        `;

        card.addEventListener('click', () => {
          onSelectWeapon(id);
        });

        col.appendChild(card);
      }

      this.dom.arsenalCategories.appendChild(col);
    }
  }

  setArsenalOpen(isOpen) {
    this.isArsenalOpen = isOpen;
    if (this.dom.arsenalMenu) {
      this.dom.arsenalMenu.style.display = isOpen ? 'flex' : 'none';
    }
  }

  update(delta, player, weaponManager, elapsedTime, scoreCT = 0, scoreT = 0) {
    // 1. Health & Armor
    if (this.dom.healthVal) {
      this.dom.healthVal.textContent = Math.max(0, player.health);
      this.dom.healthBar.style.width = `${Math.max(0, player.health)}%`;
    }
    if (this.dom.armorVal) {
      this.dom.armorVal.textContent = Math.max(0, player.armor);
      this.dom.armorBar.style.width = `${Math.max(0, player.armor)}%`;
    }

    if (player.health < this.lastHealth) {
      this.showDamageFlash();
    }
    this.lastHealth = player.health;

    // 2. Ammo, Weapon, Slots & Fire Mode Badge
    const curW = weaponManager.currentWeapon;
    if (this.dom.ammoVal && this.dom.reserveVal && this.dom.weaponName) {
      if (curW.isMelee) {
        this.dom.ammoVal.textContent = '--';
        this.dom.reserveVal.textContent = '--';
      } else if (weaponManager.isReloading) {
        this.dom.ammoVal.textContent = 'RELOAD...';
        this.dom.reserveVal.textContent = curW.reserveAmmo;
      } else {
        this.dom.ammoVal.textContent = curW.currentAmmo;
        this.dom.reserveVal.textContent = curW.reserveAmmo;
      }
      this.dom.weaponName.textContent = curW.name;
    }

    if (this.dom.fireModeBadge) {
      let label = curW.isAutomatic ? 'AUTO' : 'SEMI';
      let cls = 'fire-mode-badge';
      if (curW.isMelee) {
        label = 'MELEE';
      } else if (curW.fireMode === 'burst') {
        label = 'BURST 3x';
        cls += ' burst';
      } else if (curW.silenced) {
        label = 'SILENCIADA';
        cls += ' silenced';
      } else if (curW.isSniper) {
        label = weaponManager.scopeLevel > 0 ? `SCOPE ${weaponManager.scopeLevel === 1 ? '2x' : '4x'}` : 'BOLT';
      } else if (curW.isShotgun) {
        label = 'PUMP';
      }
      this.dom.fireModeBadge.textContent = label;
      this.dom.fireModeBadge.className = cls;
    }

    // Slot pills
    const slotEls = [
      [1, this.dom.slot1],
      [2, this.dom.slot2],
      [3, this.dom.slot3]
    ];
    for (const [slotNum, el] of slotEls) {
      if (!el) continue;
      const wId = weaponManager.slots[slotNum];
      const wCfg = weaponManager.weapons[wId];
      if (wCfg) {
        el.textContent = `[${slotNum}] ${wCfg.shortName}`;
      }
      el.classList.toggle('active', weaponManager.activeSlot === slotNum);
    }

    // 3. Sniper Scope & Dynamic Crosshair
    const isScoped = weaponManager.scopeLevel > 0;
    if (this.dom.sniperScope) {
      this.dom.sniperScope.classList.toggle('active', isScoped);
      if (isScoped && this.dom.scopeZoomBadge) {
        this.dom.scopeZoomBadge.textContent = weaponManager.scopeLevel === 1 ? '2x' : '4x';
      }
    }

    if (this.dom.crosshair) {
      if (isScoped) {
        this.dom.crosshair.style.display = 'none';
      } else {
        this.dom.crosshair.style.display = 'flex';
        this.dom.crosshair.style.opacity = curW.isSniper ? '0.22' : '1';
      }
    }

    const baseGap = 5;
    const spreadPx = baseGap + Math.round(weaponManager.currentSpread * 450);
    if (this.dom.crossTop && this.dom.crossBottom && this.dom.crossLeft && this.dom.crossRight) {
      this.dom.crossTop.style.transform = `translateY(-${spreadPx}px)`;
      this.dom.crossBottom.style.transform = `translateY(${spreadPx}px)`;
      this.dom.crossLeft.style.transform = `translateX(-${spreadPx}px)`;
      this.dom.crossRight.style.transform = `translateX(${spreadPx}px)`;
    }

    // 4. Hitmarker & Damage Timers (using real frame delta)
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= delta;
      if (this.hitmarkerTimer <= 0 && this.dom.hitmarker) {
        this.dom.hitmarker.classList.remove('active', 'headshot');
      }
    }

    if (this.damageOverlayTimer > 0) {
      this.damageOverlayTimer -= delta;
      if (this.damageOverlayTimer <= 0 && this.dom.damageOverlay) {
        this.dom.damageOverlay.style.opacity = '0';
      }
    }

    // 5. Team Score, Personal K/D & Timer
    if (this.dom.scoreCT) this.dom.scoreCT.textContent = scoreCT;
    if (this.dom.scoreT) this.dom.scoreT.textContent = scoreT;
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
