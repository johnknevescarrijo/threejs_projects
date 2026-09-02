/**
 * Inventory & Item System - Resource management, item definitions, and hotbar
 */

export const ITEMS = {
  // Resources
  wood: { id: 'wood', name: 'Madeira', icon: '🪵', type: 'resource', maxStack: 100, desc: 'Coletado de árvores com machado.' },
  thatch: { id: 'thatch', name: 'Palha', icon: '🌾', type: 'resource', maxStack: 100, desc: 'Coletado de árvores com picareta.' },
  stone: { id: 'stone', name: 'Pedra', icon: '🪨', type: 'resource', maxStack: 100, desc: 'Minerado de rochas com picareta.' },
  flint: { id: 'flint', name: 'Sílex', icon: '💎', type: 'resource', maxStack: 100, desc: 'Extraído de rochas com picareta.' },
  fiber: { id: 'fiber', name: 'Fibra', icon: '🌿', type: 'resource', maxStack: 100, desc: 'Colhido de arbustos selvagens.' },
  berry_red: { id: 'berry_red', name: 'Amarberry (Baga)', icon: '🍒', type: 'food', maxStack: 50, foodVal: 15, thirstVal: 8, desc: 'Fruta vermelha suculenta e nutritiva.' },
  berry_purple: { id: 'berry_purple', name: 'Mejoberry (Baga)', icon: '🍇', type: 'food', maxStack: 50, foodVal: 20, thirstVal: 10, desc: 'Fruta roxa adorada por herbívoros para domesticação.' },
  raw_meat: { id: 'raw_meat', name: 'Carne Crua', icon: '🥩', type: 'food', maxStack: 20, foodVal: 5, healthLoss: 10, desc: 'Carne crua de dinossauro. Pode fazer mal se não cozida.' },
  cooked_meat: { id: 'cooked_meat', name: 'Carne Assada', icon: '🍖', type: 'food', maxStack: 30, foodVal: 45, healthGain: 20, desc: 'Deliciosa carne assada na fogueira.' },

  // Tools & Weapons
  pickaxe: { id: 'pickaxe', name: 'Picareta de Pedra', icon: '⛏️', type: 'tool', toolType: 'pickaxe', maxStack: 1, desc: 'Ideal para minerar pedra, sílex e extrair palha.' },
  axe: { id: 'axe', name: 'Machado de Pedra', icon: '🪓', type: 'tool', toolType: 'axe', maxStack: 1, desc: 'Ideal para cortar madeira pesada e cortar carne.' },
  spear: { id: 'spear', name: 'Lança de Madeira', icon: '🗡️', type: 'weapon', toolType: 'spear', maxStack: 5, desc: 'Arma de longo alcance para combate contra dinossauros.' },
  torch: { id: 'torch', name: 'Tocha de Fogo', icon: '🔥', type: 'tool', toolType: 'torch', maxStack: 1, desc: 'Ilumina a escuridão da noite pré-histórica.' },

  // Structures & Placeables
  structure_foundation: { id: 'structure_foundation', name: 'Fundação de Madeira', icon: '🪵', type: 'structure', structureType: 'foundation', maxStack: 10, desc: 'Base sólida de madeira para construir sua cabana.' },
  structure_wall: { id: 'structure_wall', name: 'Parede de Madeira', icon: '🧱', type: 'structure', structureType: 'wall', maxStack: 10, desc: 'Parede resistente para proteger contra predadores.' },
  structure_ceiling: { id: 'structure_ceiling', name: 'Teto de Madeira', icon: '🏠', type: 'structure', structureType: 'ceiling', maxStack: 10, desc: 'Teto protetor contra chuva e sol quente.' },
  structure_door: { id: 'structure_door', name: 'Porta de Madeira', icon: '🚪', type: 'structure', structureType: 'door', maxStack: 5, desc: 'Porta de entrada para sua base.' },
  structure_campfire: { id: 'structure_campfire', name: 'Fogueira', icon: '🏕️', type: 'structure', structureType: 'campfire', maxStack: 2, desc: 'Aquece a noite fria e assa carnes cruas.' }
};

export class Inventory {
  constructor() {
    this.slots = {}; // { itemId: count }
    this.hotbar = [
      'axe',
      'pickaxe',
      'spear',
      'torch',
      'structure_foundation',
      'berry_purple'
    ];
    this.activeHotbarIndex = 0; // 0-5

    // Starting items for great onboarding experience
    this.addItem('wood', 30);
    this.addItem('thatch', 25);
    this.addItem('stone', 20);
    this.addItem('flint', 10);
    this.addItem('fiber', 25);
    this.addItem('berry_purple', 15);
    this.addItem('axe', 1);
    this.addItem('pickaxe', 1);
    this.addItem('spear', 1);
    this.addItem('torch', 1);
    this.addItem('structure_foundation', 2);
  }

  addItem(itemId, count = 1) {
    if (!ITEMS[itemId]) return;
    this.slots[itemId] = (this.slots[itemId] || 0) + count;
  }

  removeItem(itemId, count = 1) {
    if (!this.slots[itemId] || this.slots[itemId] < count) return false;
    this.slots[itemId] -= count;
    if (this.slots[itemId] <= 0) {
      delete this.slots[itemId];
    }
    return true;
  }

  getItemCount(itemId) {
    return this.slots[itemId] || 0;
  }

  hasResources(requirements) {
    for (const [resId, reqCount] of Object.entries(requirements)) {
      if (this.getItemCount(resId) < reqCount) {
        return false;
      }
    }
    return true;
  }

  consumeResources(requirements) {
    if (!this.hasResources(requirements)) return false;
    for (const [resId, reqCount] of Object.entries(requirements)) {
      this.removeItem(resId, reqCount);
    }
    return true;
  }

  getActiveItem() {
    const itemId = this.hotbar[this.activeHotbarIndex];
    if (!itemId) return null;
    if (this.getItemCount(itemId) <= 0) return null;
    return ITEMS[itemId];
  }

  setActiveHotbarIndex(index) {
    if (index >= 0 && index < 6) {
      this.activeHotbarIndex = index;
    }
  }

  setHotbarSlot(slotIndex, itemId) {
    if (slotIndex >= 0 && slotIndex < 6) {
      this.hotbar[slotIndex] = itemId;
    }
  }
}
