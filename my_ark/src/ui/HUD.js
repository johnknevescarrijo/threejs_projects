import { ITEMS } from '../player/Inventory.js';

/**
 * HUD - Rounded dark panels with amber/gold accents, status bars, hotbar, and interaction tooltip
 */

export class HUD {
  constructor(player, timeManager, minimap) {
    this.player = player;
    this.time = timeManager;
    this.minimap = minimap;

    // DOM Elements
    this.hpBar = document.getElementById('hud-hp-bar');
    this.hpVal = document.getElementById('hud-hp-val');
    this.stamBar = document.getElementById('hud-stam-bar');
    this.stamVal = document.getElementById('hud-stam-val');
    this.hungerBar = document.getElementById('hud-hunger-bar');
    this.thirstBar = document.getElementById('hud-thirst-bar');

    this.hotbarContainer = document.getElementById('hud-hotbar');
    this.promptEl = document.getElementById('hud-interaction-prompt');
    this.timeEl = document.getElementById('hud-time-display');
    this.biomeEl = document.getElementById('hud-biome-display');
    this.damageVignette = document.getElementById('damage-vignette');
  }

  update() {
    const p = this.player;

    // 1. Status Bars (Bottom-Left)
    if (this.hpBar) {
      const hpPct = Math.max(0, (p.health / p.maxHealth) * 100);
      this.hpBar.style.width = `${hpPct}%`;
      if (this.hpVal) this.hpVal.textContent = Math.round(p.health);
    }

    if (this.stamBar) {
      const stamPct = Math.max(0, (p.stamina / p.maxStamina) * 100);
      this.stamBar.style.width = `${stamPct}%`;
      if (this.stamVal) this.stamVal.textContent = Math.round(p.stamina);
    }

    if (this.hungerBar) {
      this.hungerBar.style.width = `${Math.max(0, (p.hunger / p.maxHunger) * 100)}%`;
    }

    if (this.thirstBar) {
      this.thirstBar.style.width = `${Math.max(0, (p.thirst / p.maxThirst) * 100)}%`;
    }

    // 2. Hotbar Slots (Bottom-Center)
    if (this.hotbarContainer) {
      const slots = this.hotbarContainer.querySelectorAll('.hotbar-slot');
      p.inventory.hotbar.forEach((itemId, idx) => {
        if (slots[idx]) {
          const count = p.inventory.getItemCount(itemId);
          const def = ITEMS[itemId];
          const slot = slots[idx];

          if (idx === p.inventory.activeHotbarIndex) {
            slot.classList.add('active');
          } else {
            slot.classList.remove('active');
          }

          if (def && count > 0) {
            slot.innerHTML = `
              <span class="slot-num">${idx + 1}</span>
              <span class="slot-icon">${def.icon}</span>
              <span class="slot-count">${count > 1 ? count : ''}</span>
            `;
          } else {
            slot.innerHTML = `<span class="slot-num">${idx + 1}</span>`;
          }
        }
      });
    }

    // 3. Interaction Tooltip Prompt (Center)
    if (this.promptEl) {
      if (p.interactPrompt) {
        this.promptEl.textContent = p.interactPrompt;
        this.promptEl.style.opacity = '1';
      } else {
        this.promptEl.style.opacity = '0';
      }
    }

    // 4. Time of Day & Biome
    if (this.timeEl) {
      this.timeEl.textContent = `⏰ ${this.time.getFormattedTime()} ${this.time.isNight() ? '🌙 (Noite)' : '☀️ (Dia)'}`;
    }

    if (this.biomeEl) {
      const groundH = p.terrain.getHeight(p.position.x, p.position.z);
      const biome = p.terrain.biomeManager.getBiomeAt(p.position.x, p.position.z, groundH);
      this.biomeEl.textContent = `📍 ${biome.name}`;
    }

    // 5. Damage Vignette Flash
    if (this.damageVignette) {
      this.damageVignette.style.opacity = p.damageFlash.toString();
    }

    // 6. Update Minimap
    if (this.minimap) {
      this.minimap.update(p);
    }
  }
}
