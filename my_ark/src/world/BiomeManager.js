/**
 * BiomeManager - Defines 4 distinct biomes with climate, colors, and vegetation rules
 */

export const BIOMES = {
  COAST: {
    id: 'coast',
    name: 'Costa Tropical',
    color: '#e6c280',
    waterColor: '#1ab3b8',
    temperature: 'Quente',
    description: 'Praias de areia dourada e águas calmas.',
    primaryResource: 'Palha & Sílex',
    floraDensity: 0.35,
    dominantColorHex: 0xd9b36c
  },
  JUNGLE: {
    id: 'jungle',
    name: 'Selva Densa',
    color: '#2d7f36',
    waterColor: '#107a68',
    temperature: 'Úmido / Quente',
    description: 'Florestas tropicais densas e samambaias gigantes.',
    primaryResource: 'Madeira & Fibras',
    floraDensity: 0.9,
    dominantColorHex: 0x2e7d32
  },
  PLAINS: {
    id: 'plains',
    name: 'Planícies Abertas',
    color: '#a3a83b',
    waterColor: '#2b908f',
    temperature: 'Ameno',
    description: 'Savanas e pradarias ideais para pastagem de herbívoros.',
    primaryResource: 'Bagas & Madeira',
    floraDensity: 0.45,
    dominantColorHex: 0x939c38
  },
  HIGHLANDS: {
    id: 'highlands',
    name: 'Terras Altas',
    color: '#5a6b7c',
    waterColor: '#2c4b63',
    temperature: 'Frio / Nebuloso',
    description: 'Picos rochosos imponentes envoltos em névoa azul fria.',
    primaryResource: 'Pedra & Metal',
    floraDensity: 0.25,
    dominantColorHex: 0x475569
  }
};

export class BiomeManager {
  constructor() {
    this.currentBiome = BIOMES.COAST;
  }

  // Returns the biome based on island height and 2D world position
  getBiomeAt(x, z, height) {
    if (height < 2.8) {
      return BIOMES.COAST;
    }

    if (height > 14.0) {
      return BIOMES.HIGHLANDS;
    }

    // Distinguish Jungle vs Plains by quadrant and moisture noise
    // North-West / West is Dense Jungle, South / East is Open Plains
    const angle = Math.atan2(z, x);
    const noiseFactor = Math.sin(x * 0.02) * Math.cos(z * 0.02);

    if (angle > -0.5 && angle < 2.0 + noiseFactor * 0.5) {
      return BIOMES.JUNGLE;
    } else {
      return BIOMES.PLAINS;
    }
  }

  getBiomeColor(biomeId) {
    switch (biomeId) {
      case 'coast': return 0xd9b36c;
      case 'jungle': return 0x2e7d32;
      case 'plains': return 0x939c38;
      case 'highlands': return 0x475569;
      default: return 0x2e7d32;
    }
  }
}
