export const TEAM_CUSTOMIZATION_STORAGE_KEY = 'futebolBotao.teamCustomization.v1';
export const MAX_TEAM_NAME_LENGTH = 18;

export const COLOR_ORDER = ['red', 'blue', 'green', 'black', 'pink', 'yellow'];

export const TEAM_COLORS = Object.freeze({
  red: Object.freeze({
    id: 'red',
    name: 'Vermelho',
    defaultTeamName: 'Vermelho',
    hex: '#dc2626',
    pieceHex: '#dc2626',
    rimHex: '#991b1b',
    stickerBg: 'rgba(0, 0, 0, 0.24)',
    numberColor: '#ffffff',
    gkHex: '#f59e0b',
    ringHex: '#ffffff',
    cssPrimary: '#ef4444',
    cssGlow: 'rgba(239, 68, 68, 0.45)',
    cssText: '#f87171',
  }),
  blue: Object.freeze({
    id: 'blue',
    name: 'Azul',
    defaultTeamName: 'Azul',
    hex: '#2563eb',
    pieceHex: '#2563eb',
    rimHex: '#1e40af',
    stickerBg: 'rgba(0, 0, 0, 0.24)',
    numberColor: '#ffffff',
    gkHex: '#0ea5e9',
    ringHex: '#ffffff',
    cssPrimary: '#3b82f6',
    cssGlow: 'rgba(59, 130, 246, 0.45)',
    cssText: '#60a5fa',
  }),
  green: Object.freeze({
    id: 'green',
    name: 'Verde',
    defaultTeamName: 'Verde',
    hex: '#10b981',
    pieceHex: '#10b981',
    rimHex: '#047857',
    stickerBg: 'rgba(6, 78, 59, 0.5)',
    numberColor: '#ffffff',
    gkHex: '#34d399',
    ringHex: '#ecfdf5',
    cssPrimary: '#10b981',
    cssGlow: 'rgba(16, 185, 129, 0.45)',
    cssText: '#34d399',
  }),
  black: Object.freeze({
    id: 'black',
    name: 'Preto',
    defaultTeamName: 'Preto',
    hex: '#111827',
    pieceHex: '#111827',
    rimHex: '#cbd5e1',
    stickerBg: 'rgba(255, 255, 255, 0.14)',
    numberColor: '#ffffff',
    gkHex: '#334155',
    ringHex: '#f8fafc',
    cssPrimary: '#334155',
    cssGlow: 'rgba(226, 232, 240, 0.4)',
    cssText: '#e2e8f0',
  }),
  pink: Object.freeze({
    id: 'pink',
    name: 'Rosa',
    defaultTeamName: 'Rosa',
    hex: '#ec4899',
    pieceHex: '#ec4899',
    rimHex: '#be185d',
    stickerBg: 'rgba(131, 24, 67, 0.35)',
    numberColor: '#ffffff',
    gkHex: '#f472b6',
    ringHex: '#ffffff',
    cssPrimary: '#ec4899',
    cssGlow: 'rgba(236, 72, 153, 0.45)',
    cssText: '#f472b6',
  }),
  yellow: Object.freeze({
    id: 'yellow',
    name: 'Amarelo',
    defaultTeamName: 'Amarelo',
    hex: '#eab308',
    pieceHex: '#facc15',
    rimHex: '#ca8a04',
    stickerBg: 'rgba(254, 249, 195, 0.45)',
    numberColor: '#0f172a',
    gkHex: '#fde047',
    ringHex: '#0f172a',
    cssPrimary: '#eab308',
    cssGlow: 'rgba(250, 204, 21, 0.45)',
    cssText: '#fde047',
  }),
});

export const DEFAULT_TEAM_CONFIG = Object.freeze({
  red: Object.freeze({ colorId: 'red', name: 'Vermelho' }),
  blue: Object.freeze({ colorId: 'blue', name: 'Azul' }),
});

/**
 * Retorna a paleta de cores para o identificador informado, com fallback seguro.
 */
export function getColorPalette(colorId, fallbackId = 'red') {
  if (typeof colorId === 'string' && Object.hasOwn(TEAM_COLORS, colorId)) {
    return TEAM_COLORS[colorId];
  }
  if (typeof fallbackId === 'string' && Object.hasOwn(TEAM_COLORS, fallbackId)) {
    return TEAM_COLORS[fallbackId];
  }
  return TEAM_COLORS.red;
}

/**
 * Limpa espaços extras, limita o tamanho máximo e aplica fallback seguro ao nome do time.
 */
export function sanitizeTeamName(name, fallbackName = 'Time') {
  const safeFallback =
    typeof fallbackName === 'string' && fallbackName.trim().length > 0
      ? fallbackName.trim().replace(/\s+/g, ' ').slice(0, MAX_TEAM_NAME_LENGTH).trim()
      : 'Time';

  if (typeof name !== 'string') {
    return safeFallback;
  }

  const normalized = name.trim().replace(/\s+/g, ' ').slice(0, MAX_TEAM_NAME_LENGTH).trim();
  return normalized.length > 0 ? normalized : safeFallback;
}

function isDefaultColorName(name, colorId) {
  const palette = getColorPalette(colorId);
  const cleaned = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  return cleaned === '' || cleaned.toLowerCase() === palette.defaultTeamName.toLowerCase();
}

function firstUnusedColor(excludedColorId) {
  return COLOR_ORDER.find((id) => id !== excludedColorId) || 'red';
}

/**
 * Normaliza e garante integridade (sem cores repetidas) de uma configuração de times.
 */
export function normalizeTeamConfig(rawConfig) {
  const source = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
  const rawRed = source.red && typeof source.red === 'object' ? source.red : {};
  const rawBlue = source.blue && typeof source.blue === 'object' ? source.blue : {};

  const redColorId = getColorPalette(rawRed.colorId, 'red').id;
  let blueColorId = getColorPalette(rawBlue.colorId, 'blue').id;

  if (blueColorId === redColorId) {
    blueColorId = redColorId === 'blue' ? 'red' : firstUnusedColor(redColorId);
  }

  const redPalette = getColorPalette(redColorId);
  const bluePalette = getColorPalette(blueColorId);

  return {
    red: {
      colorId: redColorId,
      name: sanitizeTeamName(rawRed.name, redPalette.defaultTeamName),
    },
    blue: {
      colorId: blueColorId,
      name: sanitizeTeamName(rawBlue.name, bluePalette.defaultTeamName),
    },
  };
}

/**
 * Atualiza a cor de um lado ('red' ou 'blue'), fazendo swap automático caso a cor
 * escolhida já esteja em uso pelo lado adversário.
 */
export function resolveTeamColorChange(currentConfig, side, nextColorId) {
  const safeConfig = normalizeTeamConfig(currentConfig);
  if (side !== 'red' && side !== 'blue') {
    return safeConfig;
  }

  const otherSide = side === 'red' ? 'blue' : 'red';
  const currentSide = safeConfig[side];
  const currentOther = safeConfig[otherSide];
  const targetColorId = getColorPalette(nextColorId, currentSide.colorId).id;

  if (targetColorId === currentSide.colorId) {
    return safeConfig;
  }

  const nextTargetPalette = getColorPalette(targetColorId);
  const sideUsedDefaultName = isDefaultColorName(currentSide.name, currentSide.colorId);

  let nextOtherColorId = currentOther.colorId;
  let nextOtherName = currentOther.name;

  if (targetColorId === currentOther.colorId) {
    nextOtherColorId = currentSide.colorId;
    const nextOtherPalette = getColorPalette(nextOtherColorId);
    if (isDefaultColorName(currentOther.name, currentOther.colorId)) {
      nextOtherName = nextOtherPalette.defaultTeamName;
    }
  }

  const nextSideName = sideUsedDefaultName
    ? nextTargetPalette.defaultTeamName
    : sanitizeTeamName(currentSide.name, nextTargetPalette.defaultTeamName);

  return {
    ...safeConfig,
    [side]: {
      colorId: targetColorId,
      name: nextSideName,
    },
    [otherSide]: {
      colorId: nextOtherColorId,
      name: sanitizeTeamName(nextOtherName, getColorPalette(nextOtherColorId).defaultTeamName),
    },
  };
}

/**
 * Atualiza o nome de um lado ('red' ou 'blue') com sanitização e fallback para o nome da cor.
 */
export function resolveTeamNameChange(currentConfig, side, nextName) {
  const safeConfig = normalizeTeamConfig(currentConfig);
  if (side !== 'red' && side !== 'blue') {
    return safeConfig;
  }

  const palette = getColorPalette(safeConfig[side].colorId);
  return {
    ...safeConfig,
    [side]: {
      ...safeConfig[side],
      name: sanitizeTeamName(nextName, palette.defaultTeamName),
    },
  };
}
