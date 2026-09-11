export const ARCHETYPE_IDS = {
  AGGRESSIVE: 'AGGRESSIVE',
  TECHNICAL: 'TECHNICAL',
  TACTICAL: 'TACTICAL'
};

export const ARCHETYPES = {
  [ARCHETYPE_IDS.AGGRESSIVE]: {
    id: ARCHETYPE_IDS.AGGRESSIVE,
    name: 'O Agressivo',
    title: 'Piloto Destemido',
    description: 'Prioriza ataque com projéteis, abalroa rivais e arrisca atalhos.',
    aggressiveness: 0.9,
    precision: 0.6,
    shortcutRisk: 0.8,
    defense: 0.25,
    driftEagerness: 0.75,
    rammingTendency: 0.85,
    reactionTime: 0.12, // Faster twitch reactions
    color: 0xd63031,     // Red / Crimson
    preferredLineOffset: 0.0 // Center or aggressive ramming line
  },
  [ARCHETYPE_IDS.TECHNICAL]: {
    id: ARCHETYPE_IDS.TECHNICAL,
    name: 'O Técnico',
    title: 'Mestre da Tangência',
    description: 'Traçado perfeito fora-dentro-fora, maximiza mini-turbos e evita colisões.',
    aggressiveness: 0.2,
    precision: 0.95,
    shortcutRisk: 0.4,
    defense: 0.45,
    driftEagerness: 0.95,
    rammingTendency: 0.05,
    reactionTime: 0.18,
    color: 0x0984e3,     // Blue / Precision
    preferredLineOffset: 0.0 // Dynamic optimal apex line
  },
  [ARCHETYPE_IDS.TACTICAL]: {
    id: ARCHETYPE_IDS.TACTICAL,
    name: 'O Tático / Defensivo',
    title: 'Estrategista da Pista',
    description: 'Mantém cascas na traseira como escudo e bloqueia linhas de ultrapassagem.',
    aggressiveness: 0.5,
    precision: 0.8,
    shortcutRisk: 0.5,
    defense: 0.95,
    driftEagerness: 0.8,
    rammingTendency: 0.3,
    reactionTime: 0.15,
    color: 0x00b894,     // Emerald / Mint
    preferredLineOffset: 0.0 // Dynamic lane blocking
  }
};

export const AI_RACER_PRESETS = [
  { name: 'Rex "Brutus"', archetypeId: ARCHETYPE_IDS.AGGRESSIVE, kartColor: 0xd63031, accentColor: 0x2d3436 },
  { name: 'Aria "Apex"', archetypeId: ARCHETYPE_IDS.TECHNICAL, kartColor: 0x0984e3, accentColor: 0x74b9ff },
  { name: 'Vance "Shield"', archetypeId: ARCHETYPE_IDS.TACTICAL, kartColor: 0x00b894, accentColor: 0x55efc4 },
  { name: 'Blaze "Drifter"', archetypeId: ARCHETYPE_IDS.TECHNICAL, kartColor: 0x6c5ce7, accentColor: 0xa29bfe },
  { name: 'Fang "Outlaw"', archetypeId: ARCHETYPE_IDS.AGGRESSIVE, kartColor: 0xe17055, accentColor: 0xfab1a0 },
  { name: 'Silas "Guardian"', archetypeId: ARCHETYPE_IDS.TACTICAL, kartColor: 0xfdcb6e, accentColor: 0xffeaa7 },
  { name: 'Nova "Challenger"', archetypeId: ARCHETYPE_IDS.TECHNICAL, kartColor: 0xe84393, accentColor: 0xfd79a8 }
];
