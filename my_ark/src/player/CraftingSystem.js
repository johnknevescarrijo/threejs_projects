import { ITEMS } from './Inventory.js';

/**
 * CraftingSystem - Blueprints, resource cost calculations, and item crafting
 */

export const RECIPES = [
  {
    id: 'pickaxe',
    name: 'Picareta de Pedra',
    category: 'Ferramentas',
    result: { id: 'pickaxe', count: 1 },
    cost: { stone: 1, wood: 1, thatch: 10 },
    desc: 'Essencial para extrair pedra, sílex e palha.'
  },
  {
    id: 'axe',
    name: 'Machado de Pedra',
    category: 'Ferramentas',
    result: { id: 'axe', count: 1 },
    cost: { flint: 1, wood: 10, thatch: 10 },
    desc: 'Essencial para cortar toras de madeira.'
  },
  {
    id: 'spear',
    name: 'Lança de Madeira',
    category: 'Armas',
    result: { id: 'spear', count: 1 },
    cost: { flint: 2, wood: 8, fiber: 12 },
    desc: 'Arma afiada de estocada com alto alcance.'
  },
  {
    id: 'torch',
    name: 'Tocha de Fogo',
    category: 'Ferramentas',
    result: { id: 'torch', count: 1 },
    cost: { flint: 1, wood: 1, thatch: 5, fiber: 3 },
    desc: 'Ilumina o caminho e espanta o frio noturno.'
  },
  {
    id: 'structure_campfire',
    name: 'Fogueira',
    category: 'Sobrevivência',
    result: { id: 'structure_campfire', count: 1 },
    cost: { stone: 12, wood: 4, thatch: 8, flint: 1 },
    desc: 'Permite cozinhar carne crua e aquece a noite.'
  },
  {
    id: 'structure_foundation',
    name: 'Fundação de Madeira',
    category: 'Construção',
    result: { id: 'structure_foundation', count: 1 },
    cost: { wood: 40, thatch: 15, fiber: 10 },
    desc: 'Base de madeira para apoiar paredes e tetos.'
  },
  {
    id: 'structure_wall',
    name: 'Parede de Madeira',
    category: 'Construção',
    result: { id: 'structure_wall', count: 1 },
    cost: { wood: 25, thatch: 10, fiber: 7 },
    desc: 'Parede de encaixe para construir abrigos seguros.'
  },
  {
    id: 'structure_ceiling',
    name: 'Teto de Madeira',
    category: 'Construção',
    result: { id: 'structure_ceiling', count: 1 },
    cost: { wood: 20, thatch: 8, fiber: 5 },
    desc: 'Teto para cobrir e fechar sua cabana.'
  },
  {
    id: 'structure_door',
    name: 'Porta de Madeira',
    category: 'Construção',
    result: { id: 'structure_door', count: 1 },
    cost: { wood: 20, thatch: 10, fiber: 8 },
    desc: 'Porta de acesso para sua casa.'
  }
];

export class CraftingSystem {
  constructor(inventory, audioManager, notificationUI = null) {
    this.inventory = inventory;
    this.audio = audioManager;
    this.notifications = notificationUI;
  }

  getRecipes() {
    return RECIPES;
  }

  canCraft(recipeId) {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;
    return this.inventory.hasResources(recipe.cost);
  }

  craft(recipeId) {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;

    if (!this.inventory.consumeResources(recipe.cost)) {
      return false;
    }

    this.inventory.addItem(recipe.result.id, recipe.result.count);

    if (this.audio) {
      this.audio.playCraftSuccess();
    }

    if (this.notifications) {
      this.notifications.show(`Criado: ${recipe.name}`, 'craft');
    }

    return true;
  }
}
