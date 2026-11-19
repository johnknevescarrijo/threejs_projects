import { WEAPONS, WEAPON_ORDER_BY_CATEGORY, CATEGORY_LABELS } from '../config/weapons.js';
import { UTILITY_ITEMS } from '../combat/tactical.js';

export class HUD {
  constructor() {
    this.dom = {
      moneyVal: document.getElementById('money-val'),
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
      slot4: document.getElementById('weapon-slot-4'),
      slot5: document.getElementById('weapon-slot-5'),
      kitBadge: document.getElementById('kit-badge'),
      killfeed: document.getElementById('killfeed'),
      hitmarker: document.getElementById('hitmarker'),
      damageOverlay: document.getElementById('damage-overlay'),
      flashOverlay: document.getElementById('flash-overlay'),
      pickupPrompt: document.getElementById('pickup-prompt'),
      objectivePrompt: document.getElementById('objective-prompt'),
      actionProgressWrap: document.getElementById('action-progress-wrap'),
      actionProgressLabel: document.getElementById('action-progress-label'),
      actionProgressFill: document.getElementById('action-progress-fill'),
      crosshair: document.getElementById('crosshair-container'),
      crossTop: document.getElementById('ch-top'),
      crossBottom: document.getElementById('ch-bottom'),
      crossLeft: document.getElementById('ch-left'),
      crossRight: document.getElementById('ch-right'),
      sniperScope: document.getElementById('sniper-scope'),
      scopeZoomBadge: document.getElementById('scope-zoom-badge'),
      arsenalMenu: document.getElementById('arsenal-menu'),
      arsenalMoneyVal: document.getElementById('arsenal-money-val'),
      btnSandboxToggle: document.getElementById('btn-sandbox-toggle'),
      arsenalCategories: document.getElementById('arsenal-categories'),
      scoreCT: document.getElementById('score-ct'),
      scoreT: document.getElementById('score-t'),
      scoreKills: document.getElementById('score-kills'),
      scoreDeaths: document.getElementById('score-deaths'),
      timer: document.getElementById('match-timer'),
      roundBadge: document.getElementById('round-badge'),
      zoneBadge: document.getElementById('zone-badge'),
      roundBanner: document.getElementById('round-banner'),
      deathScreen: document.getElementById('death-screen'),
      deathStatusText: document.getElementById('death-status-text'),
      deathTimerVal: document.getElementById('death-timer-val'),
      deathBarContainer: document.getElementById('death-bar-container'),
      deathBarFill: document.getElementById('death-bar-fill'),
      netGraph: document.getElementById('net-graph'),
      ngFps: document.getElementById('ng-fps'),
      ngMs: document.getElementById('ng-ms'),
      ngDc: document.getElementById('ng-dc'),
      ngTris: document.getElementById('ng-tris'),
      ngPreset: document.getElementById('ng-preset'),
      ngBackend: document.getElementById('ng-backend')
    };

    this.hitmarkerTimer = 0;
    this.damageOverlayTimer = 0;
    this.lastHealth = 100;
    this.isArsenalOpen = false;
    this.netGraphVisible = true;
    this._netGraphTimer = 0.2;
    this._last = {};
  }

  _setText(key, el, value) {
    if (!el) return;
    const str = String(value);
    if (this._last[key] !== str) {
      this._last[key] = str;
      el.textContent = str;
    }
  }

  _setStyle(key, el, prop, value) {
    if (!el) return;
    if (this._last[key] !== value) {
      this._last[key] = value;
      el.style[prop] = value;
    }
  }

  _setClassName(key, el, value) {
    if (!el) return;
    if (this._last[key] !== value) {
      this._last[key] = value;
      el.className = value;
    }
  }

  _setClassToggle(key, el, className, force) {
    if (!el) return;
    const flag = Boolean(force);
    if (this._last[key] !== flag) {
      this._last[key] = flag;
      el.classList.toggle(className, flag);
    }
  }

  _formatMoney(val) {
    return `$${Math.max(0, Math.floor(val)).toLocaleString('en-US')}`;
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

  renderArsenalMenu(weaponManager, economy, playerArmor, callbacks = {}, extras = {}) {
    if (!this.dom.arsenalCategories) return;
    this.dom.arsenalCategories.innerHTML = '';

    const { onSelectWeapon, onBuyUtility, onToggleSandbox } = callbacks;
    const { playerTeam = 'CT', hasDefuseKit = false } = extras;

    if (this.dom.arsenalMoneyVal) {
      this.dom.arsenalMoneyVal.textContent = economy?.sandboxFree
        ? `${this._formatMoney(economy.money)} (GRÁTIS)`
        : this._formatMoney(economy?.money ?? 0);
    }

    if (this.dom.btnSandboxToggle) {
      const isFree = Boolean(economy?.sandboxFree);
      this.dom.btnSandboxToggle.textContent = `Modo Treino (Grátis: ${isFree ? 'ON' : 'OFF'})`;
      this.dom.btnSandboxToggle.classList.toggle('active', isFree);
      this.dom.btnSandboxToggle.onclick = () => {
        if (onToggleSandbox) onToggleSandbox();
      };
    }

    const buyCategories = ['pistols', 'smgs', 'shotguns', 'rifles', 'snipers'];
    const equippedIds = new Set(Object.values(weaponManager.slots).filter(Boolean));
    const canAfford = (price) => Boolean(economy?.sandboxFree) || (economy?.money ?? 0) >= price;

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

        const isEquipped = equippedIds.has(id);
        const affordable = canAfford(w.price);

        const card = document.createElement('button');
        card.type = 'button';
        card.className = `arsenal-card${isEquipped ? ' equipped' : ''}${!affordable && !isEquipped ? ' unaffordable' : ''}`;

        const teamLabel = w.team === 'BOTH' ? 'CT/T' : w.team;
        const teamClass = w.team === 'CT' ? 'ct' : (w.team === 'T' ? 't' : '');

        const dmgPct = Math.min(100, Math.round(((w.isShotgun ? w.damage * 4 : w.damage) / 115) * 100));
        const rpmPct = Math.min(100, Math.round((w.rpm / 900) * 100));
        const mobPct = Math.min(100, Math.round((w.moveSpeed / 6.5) * 100));
        const priceText = economy?.sandboxFree ? 'GRÁTIS' : this._formatMoney(w.price);

        card.innerHTML = `
          <div class="arsenal-card-top">
            <span class="arsenal-card-name">${w.name}</span>
            <span class="arsenal-card-price">${priceText}</span>
          </div>
          <div class="arsenal-stat-row">
            <span class="arsenal-card-tag ${teamClass}">${teamLabel} • Slot ${w.slot}</span>
            <span>Pente ${w.magSize}/${w.maxReserve}</span>
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
            <span>Mob ${w.moveSpeed.toFixed(1)}</span>
            <div class="stat-mini-track"><div class="stat-mini-fill" style="width:${mobPct}%"></div></div>
          </div>
        `;

        card.addEventListener('click', () => {
          if (onSelectWeapon) onSelectWeapon(id);
        });

        col.appendChild(card);
      }

      this.dom.arsenalCategories.appendChild(col);
    }

    // Equipamento & Granadas Column
    const utilCol = document.createElement('div');
    utilCol.className = 'arsenal-category-col';
    const utilTitle = document.createElement('div');
    utilTitle.className = 'arsenal-cat-title';
    utilTitle.textContent = 'Equipamento & Granadas';
    utilCol.appendChild(utilTitle);

    const utilityOrder = playerTeam === 'CT'
      ? ['he', 'flash', 'smoke', 'kevlar', 'defuse_kit']
      : ['he', 'flash', 'smoke', 'kevlar'];
    for (const uId of utilityOrder) {
      const item = UTILITY_ITEMS[uId];
      if (!item) continue;

      let price = item.price;
      let isMaxed = false;
      let ownedText = '';

      if (item.type === 'armor') {
        if (playerArmor >= 100) {
          isMaxed = true;
          ownedText = '100 / 100';
        } else if (playerArmor > 0) {
          price = item.repairPrice;
          ownedText = `Reparar (${playerArmor} → 100)`;
        } else {
          ownedText = 'Colete + Capacete';
        }
      } else if (item.type === 'kit') {
        isMaxed = Boolean(hasDefuseKit);
        ownedText = isMaxed ? 'EQUIPADO (5s)' : 'Defuse em 5.0s';
      } else {
        const count = weaponManager.grenades[item.id] || 0;
        isMaxed = count >= item.maxCarry;
        ownedText = `${count} / ${item.maxCarry}`;
      }

      const affordable = canAfford(price);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `arsenal-card${isMaxed ? ' maxed' : ''}${!affordable && !isMaxed ? ' unaffordable' : ''}`;

      const priceText = isMaxed ? 'MÁX' : (economy?.sandboxFree ? 'GRÁTIS' : this._formatMoney(price));
      const tagText = item.type === 'armor' ? 'PROTEÇÃO' : (item.type === 'kit' ? 'CT KIT' : 'SLOT 4');

      card.innerHTML = `
        <div class="arsenal-card-top">
          <span class="arsenal-card-name">${item.name}</span>
          <span class="arsenal-card-price">${priceText}</span>
        </div>
        <div class="arsenal-stat-row">
          <span class="arsenal-card-tag">${tagText}</span>
          <span>${ownedText}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        if (onBuyUtility) onBuyUtility(item.id);
      });

      utilCol.appendChild(card);
    }

    this.dom.arsenalCategories.appendChild(utilCol);
  }

  setArsenalOpen(isOpen) {
    this.isArsenalOpen = isOpen;
    if (this.dom.arsenalMenu) {
      this.dom.arsenalMenu.style.display = isOpen ? 'flex' : 'none';
    }
  }

  update(delta, player, weaponManager, elapsedTime, scoreCT = 0, scoreT = 0, extras = {}) {
    const {
      economy = null,
      flashIntensity = 0,
      pickupTarget = null,
      zoneName = null,
      roundManager = null,
      objectivePrompt = null,
      actionProgress = null
    } = extras;

    // 1. Money, Health & Armor (dirty-checked)
    if (this.dom.moneyVal && economy) {
      const moneyKey = `${Math.floor(economy.money)}|${Boolean(economy.sandboxFree)}`;
      if (this._last.moneyKey !== moneyKey) {
        this._last.moneyKey = moneyKey;
        this.dom.moneyVal.textContent = economy.sandboxFree
          ? `${this._formatMoney(economy.money)} ★`
          : this._formatMoney(economy.money);
      }
    }

    const clampedHealth = Math.max(0, player.health);
    if (this._last.health !== clampedHealth) {
      this._last.health = clampedHealth;
      if (this.dom.healthVal) this.dom.healthVal.textContent = String(clampedHealth);
      if (this.dom.healthBar) this.dom.healthBar.style.width = `${clampedHealth}%`;
    }

    const clampedArmor = Math.max(0, player.armor);
    if (this._last.armor !== clampedArmor) {
      this._last.armor = clampedArmor;
      if (this.dom.armorVal) this.dom.armorVal.textContent = String(clampedArmor);
      if (this.dom.armorBar) this.dom.armorBar.style.width = `${clampedArmor}%`;
    }

    if (this.dom.kitBadge) {
      this._setStyle('kitDisplay', this.dom.kitBadge, 'display', player.hasDefuseKit ? 'inline-block' : 'none');
    }

    if (player.health < this.lastHealth) {
      this.showDamageFlash();
    }
    this.lastHealth = player.health;

    // 2. Ammo, Weapon, Slots & Fire Mode Badge (dirty-checked)
    const curW = weaponManager.currentWeapon;
    if (this.dom.ammoVal && this.dom.reserveVal && this.dom.weaponName) {
      let ammoValText;
      let reserveValText;
      if (curW.isMelee) {
        ammoValText = '--';
        reserveValText = '--';
      } else if (curW.isC4) {
        ammoValText = 'C4';
        reserveValText = 'OBJ';
      } else if (curW.isGrenade) {
        ammoValText = curW.count;
        reserveValText = weaponManager.getTotalGrenades();
      } else if (weaponManager.isReloading) {
        ammoValText = 'RELOAD...';
        reserveValText = curW.reserveAmmo;
      } else {
        ammoValText = curW.currentAmmo;
        reserveValText = curW.reserveAmmo;
      }
      this._setText('ammo', this.dom.ammoVal, ammoValText);
      this._setText('reserve', this.dom.reserveVal, reserveValText);
      this._setText('weaponName', this.dom.weaponName, curW.name);
    }

    if (this.dom.fireModeBadge) {
      let label = curW.isAutomatic ? 'AUTO' : 'SEMI';
      let cls = 'fire-mode-badge';
      if (curW.isMelee) {
        label = 'MELEE';
      } else if (curW.isC4) {
        label = 'EXPLOSIVO';
      } else if (curW.isGrenade) {
        label = 'GRANADA';
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
      this._setText('badgeText', this.dom.fireModeBadge, label);
      this._setClassName('badgeCls', this.dom.fireModeBadge, cls);
    }

    // Slot pills 1, 2, 3 (safely handle empty slots)
    const slotEls = [
      [1, this.dom.slot1],
      [2, this.dom.slot2],
      [3, this.dom.slot3]
    ];
    for (const [slotNum, el] of slotEls) {
      if (!el) continue;
      const wId = weaponManager.slots[slotNum];
      const wCfg = wId ? weaponManager.weapons[wId] : null;
      const text = wCfg ? `[${slotNum}] ${wCfg.shortName}` : `[${slotNum}] VAZIO`;
      this._setText(`slot${slotNum}Text`, el, text);
      this._setClassToggle(`slot${slotNum}Empty`, el, 'empty', !wCfg);
      this._setClassToggle(`slot${slotNum}Active`, el, 'active', weaponManager.activeSlot === slotNum);
    }

    // Slot 4 pill (Grenades)
    if (this.dom.slot4) {
      const g = weaponManager.grenades;
      const totalG = weaponManager.getTotalGrenades();
      const activeShort = UTILITY_ITEMS[weaponManager.activeGrenadeType]?.shortName || 'GRAN';
      const slot4Text = `[4] ${activeShort} • ${g.he || 0}/${g.flash || 0}/${g.smoke || 0}`;
      this._setText('slot4Text', this.dom.slot4, slot4Text);
      this._setClassToggle('slot4Empty', this.dom.slot4, 'empty', totalG === 0);
      this._setClassToggle('slot4Active', this.dom.slot4, 'active', weaponManager.activeSlot === 4);
    }

    // Slot 5 pill (C4)
    if (this.dom.slot5) {
      this._setStyle('slot5Display', this.dom.slot5, 'display', weaponManager.hasC4 ? 'block' : 'none');
      this._setClassToggle('slot5Active', this.dom.slot5, 'active', weaponManager.activeSlot === 5);
    }

    // Objective prompt & plant/defuse progress bar
    if (this.dom.objectivePrompt) {
      if (objectivePrompt && player.isAlive && !this.isArsenalOpen) {
        this._setText('objPromptText', this.dom.objectivePrompt, objectivePrompt);
        this._setStyle('objPromptDisplay', this.dom.objectivePrompt, 'display', 'block');
      } else {
        this._setStyle('objPromptDisplay', this.dom.objectivePrompt, 'display', 'none');
      }
    }

    if (this.dom.actionProgressWrap) {
      if (actionProgress && player.isAlive) {
        const pct = Math.max(0, Math.min(100, actionProgress.progress * 100));
        this._setStyle('actionWrapDisplay', this.dom.actionProgressWrap, 'display', 'block');
        this._setText('actionLabel', this.dom.actionProgressLabel, actionProgress.label);
        this._setStyle('actionFillWidth', this.dom.actionProgressFill, 'width', `${pct.toFixed(1)}%`);
      } else {
        this._setStyle('actionWrapDisplay', this.dom.actionProgressWrap, 'display', 'none');
      }
    }

    // 3. Sniper Scope, Flashbang Overlay & Dynamic Crosshair
    if (this.dom.flashOverlay) {
      const clampedFlash = Math.max(0, Math.min(1, flashIntensity));
      const flashStr = clampedFlash === 0 ? '0' : clampedFlash.toFixed(3);
      this._setStyle('flashOpacity', this.dom.flashOverlay, 'opacity', flashStr);
    }

    if (this.dom.pickupPrompt) {
      if (pickupTarget && player.isAlive && !this.isArsenalOpen) {
        const targetSlot = pickupTarget.weaponSpec.slot;
        const hasExisting = Boolean(weaponManager.slots[targetSlot]);
        const verb = hasExisting ? 'Trocar por' : 'Pegar';
        const promptText = `[E] ${verb} ${pickupTarget.weaponSpec.name} (${pickupTarget.currentAmmo}/${pickupTarget.reserveAmmo})`;
        this._setText('pickupText', this.dom.pickupPrompt, promptText);
        this._setStyle('pickupDisplay', this.dom.pickupPrompt, 'display', 'block');
      } else {
        this._setStyle('pickupDisplay', this.dom.pickupPrompt, 'display', 'none');
      }
    }

    const isScoped = weaponManager.scopeLevel > 0;
    if (this.dom.sniperScope) {
      this._setClassToggle('scopeActive', this.dom.sniperScope, 'active', isScoped);
      if (isScoped && this.dom.scopeZoomBadge) {
        this._setText('scopeZoom', this.dom.scopeZoomBadge, weaponManager.scopeLevel === 1 ? '2x' : '4x');
      }
    }

    if (this.dom.crosshair) {
      if (isScoped) {
        this._setStyle('crosshairDisplay', this.dom.crosshair, 'display', 'none');
      } else {
        this._setStyle('crosshairDisplay', this.dom.crosshair, 'display', 'flex');
        this._setStyle('crosshairOpacity', this.dom.crosshair, 'opacity', curW.isSniper ? '0.22' : '1');
      }
    }

    const baseGap = 5;
    const spreadPx = baseGap + Math.round(weaponManager.currentSpread * 450);
    if (
      this._last.spreadPx !== spreadPx &&
      this.dom.crossTop &&
      this.dom.crossBottom &&
      this.dom.crossLeft &&
      this.dom.crossRight
    ) {
      this._last.spreadPx = spreadPx;
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

    // 5. Team Score, Personal K/D, Zone Callout, Round Banner & Timer (dirty-checked)
    this._setText('scoreCT', this.dom.scoreCT, scoreCT);
    this._setText('scoreT', this.dom.scoreT, scoreT);
    this._setText('scoreKills', this.dom.scoreKills, player.kills);
    this._setText('scoreDeaths', this.dom.scoreDeaths, player.deaths);

    if (this.dom.zoneBadge && zoneName) {
      this._setText('zoneBadge', this.dom.zoneBadge, `📍 ${zoneName}`);
    }

    if (roundManager) {
      if (this.dom.roundBadge) {
        const badgeText = roundManager.mode === 'deathmatch'
          ? 'DEATHMATCH'
          : `ROUND ${roundManager.roundNumber}`;
        this._setText('roundBadge', this.dom.roundBadge, badgeText);
      }

      if (this.dom.roundBanner) {
        let bannerText = '';
        let bannerCls = '';
        if (roundManager.mode === 'bomb_defusal') {
          if (roundManager.phase === 'FREEZETIME') {
            bannerText = `FREEZETIME • COMPRE ARMAS [B] (${roundManager.phaseTimer.toFixed(1)}s)`;
          } else if (roundManager.phase === 'BOMB_PLANTED') {
            bannerText = `💣 BOMB PLANTED AT ${roundManager.bombSite} (${Math.ceil(roundManager.bombTimer)}s)`;
            bannerCls = 'c4-alert';
          } else if (roundManager.phase === 'ROUND_END') {
            const reasonMap = {
              elimination: 'ELIMINAÇÃO',
              bomb_defused: 'C4 DESARMADA',
              target_bombed: 'ALVO DESTRUÍDO',
              time_expired: 'TEMPO ESGOTADO'
            };
            const rLabel = reasonMap[roundManager.lastReason] || 'FIM DE ROUND';
            bannerText = `${roundManager.lastWinner} VENCEU • ${rLabel}`;
            bannerCls = roundManager.lastWinner === 'CT' ? 'win-ct' : 'win-t';
          }
        }
        if (bannerText) {
          this._setText('roundBannerText', this.dom.roundBanner, bannerText);
          this._setClassName('roundBannerCls', this.dom.roundBanner, bannerCls);
          this._setStyle('roundBannerDisplay', this.dom.roundBanner, 'display', 'block');
        } else {
          this._setStyle('roundBannerDisplay', this.dom.roundBanner, 'display', 'none');
        }
      }
    }

    if (this.dom.timer) {
      let timerValue = elapsedTime;
      let isBombC4 = false;
      if (roundManager) {
        if (roundManager.mode === 'deathmatch') {
          timerValue = roundManager.matchElapsed;
        } else if (roundManager.phase === 'BOMB_PLANTED') {
          timerValue = roundManager.bombTimer;
          isBombC4 = true;
        } else {
          timerValue = roundManager.phaseTimer;
        }
      }

      if (isBombC4) {
        const c4Sec = Math.max(0, timerValue).toFixed(1);
        this._setText('timerText', this.dom.timer, `C4 ${c4Sec}s`);
        this._setStyle('timerColor', this.dom.timer, 'color', '#f87171');
      } else {
        const totalSeconds = Math.max(0, Math.ceil(timerValue));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        this._setText('timerText', this.dom.timer, formatted);
        this._setStyle('timerColor', this.dom.timer, 'color', '#e2e8f0');
      }
    }

    // 6. Death Screen
    if (this.dom.deathScreen) {
      if (!player.isAlive) {
        this._setStyle('deathDisplay', this.dom.deathScreen, 'display', 'flex');
        if (player.allowAutoRespawn) {
          this._setStyle('deathBarVis', this.dom.deathBarContainer, 'display', 'block');
          if (this.dom.deathStatusText) {
            const remainingSec = `${Math.max(0, player.autoRespawnTimer).toFixed(1)}s`;
            this._setText('deathStatus', this.dom.deathStatusText, `Respawn automático em ${remainingSec}`);
          }
          if (this.dom.deathBarFill) {
            const pct = Math.max(0, Math.min(100, (player.autoRespawnTimer / player.maxRespawnTime) * 100));
            this._setStyle('deathBarWidth', this.dom.deathBarFill, 'width', `${pct.toFixed(1)}%`);
          }
        } else {
          this._setStyle('deathBarVis', this.dom.deathBarContainer, 'display', 'none');
          if (this.dom.deathStatusText) {
            this._setText('deathStatus', this.dom.deathStatusText, 'Aguardando próximo round...');
          }
        }
      } else {
        this._setStyle('deathDisplay', this.dom.deathScreen, 'display', 'none');
      }
    }
  }

  setNetGraphVisible(visible) {
    this.netGraphVisible = Boolean(visible);
    if (this.dom.netGraph) {
      this._setStyle('ngDisplay', this.dom.netGraph, 'display', this.netGraphVisible ? 'flex' : 'none');
    }
  }

  toggleNetGraph() {
    this.setNetGraphVisible(!this.netGraphVisible);
    return this.netGraphVisible;
  }

  updateNetGraph(telemetry, delta = 0) {
    if (!this.dom.netGraph || !telemetry) return;

    this._setStyle('ngDisplay', this.dom.netGraph, 'display', this.netGraphVisible ? 'flex' : 'none');
    if (!this.netGraphVisible) return;

    const presetChanged = this._last.ngPreset !== telemetry.presetLabel;
    this._netGraphTimer += delta;
    if (!presetChanged && this._netGraphTimer < 0.15) return;
    this._netGraphTimer = 0;

    this._setText('ngFps', this.dom.ngFps, telemetry.fps);
    const fpsCls = telemetry.fps < 30 ? 'bad' : (telemetry.fps < 55 ? 'warn' : '');
    this._setClassName('ngFpsCls', this.dom.ngFps, fpsCls);

    this._setText('ngMs', this.dom.ngMs, telemetry.frameMs.toFixed(1));

    const dcBudget = telemetry.drawCallBudget || 180;
    this._setText('ngDc', this.dom.ngDc, `${telemetry.drawCalls}/${dcBudget}`);
    const dcCls = telemetry.drawCalls > dcBudget * 1.25 ? 'bad' : (telemetry.drawCalls > dcBudget ? 'warn' : '');
    this._setClassName('ngDcCls', this.dom.ngDc, dcCls);

    const trisText = telemetry.triangles >= 1000
      ? `${(telemetry.triangles / 1000).toFixed(1)}k`
      : String(telemetry.triangles);
    this._setText('ngTris', this.dom.ngTris, trisText);

    this._setText('ngPreset', this.dom.ngPreset, telemetry.presetLabel);
    this._setText('ngBackend', this.dom.ngBackend, telemetry.backendLabel);
  }
}
