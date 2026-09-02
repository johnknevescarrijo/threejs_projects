import { ITEMS } from '../player/Inventory.js';
import { RECIPES } from '../player/CraftingSystem.js';

/**
 * InventoryUI - Full-screen modal for managing inventory items and crafting recipes
 */

export class InventoryUI {
  constructor(inventory, craftingSystem, inputManager) {
    this.inventory = inventory;
    this.crafting = craftingSystem;
    this.input = inputManager;

    this.modal = document.getElementById('inventory-modal');
    this.inventoryList = document.getElementById('inventory-items-grid');
    this.craftingList = document.getElementById('crafting-recipes-grid');
    this.isOpen = false;

    this.setupListeners();
  }

  setupListeners() {
    // Open/Close with TAB or I
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'KeyI') {
        e.preventDefault();
        this.toggle();
      } else if (e.code === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    const closeBtn = document.getElementById('close-inventory-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    if (this.modal) {
      this.modal.classList.add('active');
    }
    this.input.exitLock();
    this.render();
  }

  close() {
    this.isOpen = false;
    if (this.modal) {
      this.modal.classList.remove('active');
    }
    this.input.requestLock();
  }

  render() {
    this.renderInventory();
    this.renderCrafting();
  }

  renderInventory() {
    if (!this.inventoryList) return;
    this.inventoryList.innerHTML = '';

    const items = Object.entries(this.inventory.slots);
    if (items.length === 0) {
      this.inventoryList.innerHTML = '<div class="empty-inv-msg">Mochila vazia. Colete madeira, pedra e bagas pela ilha!</div>';
      return;
    }

    items.forEach(([itemId, count]) => {
      const def = ITEMS[itemId] || { name: itemId, icon: '📦', desc: '' };
      const card = document.createElement('div');
      card.className = 'inv-item-card ui-interactive';
      card.innerHTML = `
        <div class="inv-item-icon">${def.icon}</div>
        <div class="inv-item-info">
          <div class="inv-item-name">${def.name}</div>
          <div class="inv-item-desc">${def.desc || ''}</div>
        </div>
        <div class="inv-item-count">x${count}</div>
      `;

      // Click to add to active hotbar slot
      card.addEventListener('click', () => {
        this.inventory.setHotbarSlot(this.inventory.activeHotbarIndex, itemId);
        this.render();
      });

      this.inventoryList.appendChild(card);
    });
  }

  renderCrafting() {
    if (!this.craftingList) return;
    this.craftingList.innerHTML = '';

    RECIPES.forEach(recipe => {
      const canCraft = this.crafting.canCraft(recipe.id);
      const card = document.createElement('div');
      card.className = `craft-recipe-card ui-interactive ${canCraft ? 'craftable' : 'locked'}`;

      // Build requirement badges
      let reqHtml = '';
      for (const [resId, reqCount] of Object.entries(recipe.cost)) {
        const hasCount = this.inventory.getItemCount(resId);
        const isSufficient = hasCount >= reqCount;
        const resDef = ITEMS[resId] || { name: resId, icon: '' };
        reqHtml += `
          <span class="recipe-cost-badge ${isSufficient ? 'cost-met' : 'cost-missing'}">
            ${resDef.icon} ${resDef.name}: ${hasCount}/${reqCount}
          </span>
        `;
      }

      const resDef = ITEMS[recipe.result.id] || { icon: '🔨' };

      card.innerHTML = `
        <div class="recipe-header">
          <span class="recipe-icon">${resDef.icon}</span>
          <div class="recipe-title-group">
            <span class="recipe-name">${recipe.name}</span>
            <span class="recipe-desc">${recipe.desc}</span>
          </div>
        </div>
        <div class="recipe-requirements">${reqHtml}</div>
        <button class="craft-btn ui-interactive" ${canCraft ? '' : 'disabled'}>
          ${canCraft ? '⚡ CRIAR' : '🔒 FALTAM RECURSOS'}
        </button>
      `;

      const craftBtn = card.querySelector('.craft-btn');
      craftBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.crafting.craft(recipe.id)) {
          this.render();
        }
      });

      this.craftingList.appendChild(card);
    });
  }
}
