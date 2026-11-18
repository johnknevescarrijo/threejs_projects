import { getColorPalette, sanitizeTeamName } from './teamColors.js';
import { normalizeGoalLimit } from './matchRules.js';

export const LOCAL_ACCOUNTS_STORAGE_KEY = 'futebolBotao.localAccounts.v1';
export const LOCAL_SESSION_STORAGE_KEY = 'futebolBotao.localSession.v1';
export const MAX_LOCAL_HISTORY = 20;

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;
const MAX_DISPLAY_NAME_LENGTH = 24;

const fallbackMemoryStore = new Map();
const fallbackStorage = {
  getItem(key) {
    return fallbackMemoryStore.has(key) ? fallbackMemoryStore.get(key) : null;
  },
  setItem(key, value) {
    fallbackMemoryStore.set(key, String(value));
  },
  removeItem(key) {
    fallbackMemoryStore.delete(key);
  },
};

function resolveStorage(storage) {
  if (
    storage &&
    typeof storage.getItem === 'function' &&
    typeof storage.setItem === 'function' &&
    typeof storage.removeItem === 'function'
  ) {
    return storage;
  }

  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {
    // Fallback para memória se localStorage estiver bloqueado
  }

  return fallbackStorage;
}

function hashLocalPassword(usernameKey, password) {
  const input = `${usernameKey}::${password}::futebolBotaoLocal`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + ((h1 >>> 5) & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `local:${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function sanitizeDisplayName(displayName, fallback) {
  const safeFallback = typeof fallback === 'string' && fallback.trim() ? fallback.trim() : 'Jogador';
  if (typeof displayName !== 'string') return safeFallback;
  const cleaned = displayName.trim().replace(/\s+/g, ' ').slice(0, MAX_DISPLAY_NAME_LENGTH).trim();
  return cleaned || safeFallback;
}

function createEmptyStats() {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  };
}

function normalizeStats(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    matches: Number.isFinite(s.matches) ? Math.max(0, Math.floor(s.matches)) : 0,
    wins: Number.isFinite(s.wins) ? Math.max(0, Math.floor(s.wins)) : 0,
    losses: Number.isFinite(s.losses) ? Math.max(0, Math.floor(s.losses)) : 0,
    draws: Number.isFinite(s.draws) ? Math.max(0, Math.floor(s.draws)) : 0,
    goalsFor: Number.isFinite(s.goalsFor) ? Math.max(0, Math.floor(s.goalsFor)) : 0,
    goalsAgainst: Number.isFinite(s.goalsAgainst) ? Math.max(0, Math.floor(s.goalsAgainst)) : 0,
    points: Number.isFinite(s.points) ? Math.max(0, Math.floor(s.points)) : 0,
  };
}

function toPublicAccount(record) {
  if (!record || typeof record !== 'object') return null;
  const stats = normalizeStats(record.stats);
  const goalDiff = stats.goalsFor - stats.goalsAgainst;
  const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
  const palette = getColorPalette(record.favoriteColor, 'blue');

  return {
    username: record.username,
    displayName: record.displayName,
    favoriteColor: palette.id,
    defaultTeamName: sanitizeTeamName(record.defaultTeamName, palette.defaultTeamName),
    offline: true,
    createdAt: record.createdAt || null,
    stats: {
      ...stats,
      goalDiff,
      winRate,
    },
    history: Array.isArray(record.history) ? record.history.slice(0, MAX_LOCAL_HISTORY) : [],
  };
}

function loadAccountsMap(storage) {
  const store = resolveStorage(storage);
  try {
    const raw = store.getItem(LOCAL_ACCOUNTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveAccountsMap(accountsMap, storage) {
  const store = resolveStorage(storage);
  store.setItem(LOCAL_ACCOUNTS_STORAGE_KEY, JSON.stringify(accountsMap));
}

function getSessionUsernameKey(storage) {
  const store = resolveStorage(storage);
  try {
    const raw = store.getItem(LOCAL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.usernameKey === 'string' ? parsed.usernameKey : null;
  } catch (e) {
    return null;
  }
}

function setSessionUsernameKey(usernameKey, storage) {
  const store = resolveStorage(storage);
  if (!usernameKey) {
    store.removeItem(LOCAL_SESSION_STORAGE_KEY);
    return;
  }
  store.setItem(
    LOCAL_SESSION_STORAGE_KEY,
    JSON.stringify({ usernameKey, updatedAt: new Date().toISOString() })
  );
}

/**
 * Cadastra uma nova conta local offline, valida credenciais e inicia sessão.
 */
export function registerLocalAccount(
  { username, displayName, password, favoriteColor = 'blue', defaultTeamName } = {},
  storage
) {
  const cleanUsername = typeof username === 'string' ? username.trim() : '';
  if (!USERNAME_PATTERN.test(cleanUsername)) {
    return {
      ok: false,
      error: 'Usuário deve ter entre 3 e 20 caracteres (letras, números, _ ou -).',
    };
  }

  if (typeof password !== 'string' || password.length < 4) {
    return {
      ok: false,
      error: 'A senha deve ter pelo menos 4 caracteres.',
    };
  }

  const usernameKey = cleanUsername.toLowerCase();
  const accounts = loadAccountsMap(storage);
  if (Object.hasOwn(accounts, usernameKey)) {
    return {
      ok: false,
      error: 'Este nome de usuário já está cadastrado localmente.',
    };
  }

  const palette = getColorPalette(favoriteColor, 'blue');
  const safeDisplayName = sanitizeDisplayName(displayName, cleanUsername);
  const safeTeamName = sanitizeTeamName(defaultTeamName, palette.defaultTeamName);

  const record = {
    username: cleanUsername,
    usernameKey,
    displayName: safeDisplayName,
    passwordHash: hashLocalPassword(usernameKey, password),
    favoriteColor: palette.id,
    defaultTeamName: safeTeamName,
    offline: true,
    createdAt: new Date().toISOString(),
    stats: createEmptyStats(),
    history: [],
  };

  accounts[usernameKey] = record;
  saveAccountsMap(accounts, storage);
  setSessionUsernameKey(usernameKey, storage);

  return {
    ok: true,
    account: toPublicAccount(record),
  };
}

/**
 * Autentica uma conta local existente e inicia a sessão.
 */
export function loginLocalAccount({ username, password } = {}, storage) {
  const cleanUsername = typeof username === 'string' ? username.trim() : '';
  if (!cleanUsername || typeof password !== 'string' || !password) {
    return {
      ok: false,
      error: 'Informe usuário e senha para entrar.',
    };
  }

  const usernameKey = cleanUsername.toLowerCase();
  const accounts = loadAccountsMap(storage);
  const record = Object.hasOwn(accounts, usernameKey) ? accounts[usernameKey] : null;
  if (!record) {
    return {
      ok: false,
      error: 'Conta local não encontrada.',
    };
  }

  const expectedHash = hashLocalPassword(usernameKey, password);
  if (record.passwordHash !== expectedHash) {
    return {
      ok: false,
      error: 'Senha incorreta.',
    };
  }

  setSessionUsernameKey(usernameKey, storage);
  return {
    ok: true,
    account: toPublicAccount(record),
  };
}

/**
 * Encerra a sessão local atual.
 */
export function logoutLocalAccount(storage) {
  setSessionUsernameKey(null, storage);
  return { ok: true };
}

/**
 * Retorna a conta local logada no momento ou null se estiver como convidado.
 */
export function getCurrentLocalAccount(storage) {
  const usernameKey = getSessionUsernameKey(storage);
  if (!usernameKey) return null;

  const accounts = loadAccountsMap(storage);
  const record = Object.hasOwn(accounts, usernameKey) ? accounts[usernameKey] : null;
  if (!record) {
    setSessionUsernameKey(null, storage);
    return null;
  }

  return toPublicAccount(record);
}

/**
 * Atualiza dados de personalização do perfil local logado.
 */
export function updateLocalProfile(
  { displayName, favoriteColor, defaultTeamName } = {},
  storage
) {
  const usernameKey = getSessionUsernameKey(storage);
  if (!usernameKey) {
    return { ok: false, error: 'Faça login para atualizar o perfil.' };
  }

  const accounts = loadAccountsMap(storage);
  const record = Object.hasOwn(accounts, usernameKey) ? accounts[usernameKey] : null;
  if (!record) {
    return { ok: false, error: 'Conta local não encontrada.' };
  }

  const nextPalette = getColorPalette(favoriteColor ?? record.favoriteColor, record.favoriteColor || 'blue');
  if (displayName !== undefined) {
    record.displayName = sanitizeDisplayName(displayName, record.username);
  }
  if (favoriteColor !== undefined) {
    record.favoriteColor = nextPalette.id;
  }
  if (defaultTeamName !== undefined) {
    record.defaultTeamName = sanitizeTeamName(defaultTeamName, nextPalette.defaultTeamName);
  } else {
    record.defaultTeamName = sanitizeTeamName(record.defaultTeamName, nextPalette.defaultTeamName);
  }

  accounts[usernameKey] = record;
  saveAccountsMap(accounts, storage);

  return {
    ok: true,
    account: toPublicAccount(record),
  };
}

/**
 * Registra o resultado de uma partida nas estatísticas e histórico do usuário local logado.
 */
export function recordLocalMatchResult(
  {
    mode = 'pve',
    playerSide = 'red',
    opponentName = 'Adversário',
    scoreRed = 0,
    scoreBlue = 0,
    winnerSide = null,
    goalLimit = 5,
  } = {},
  storage
) {
  const usernameKey = getSessionUsernameKey(storage);
  if (!usernameKey) {
    return { ok: false, error: 'Nenhuma conta local logada.' };
  }

  const accounts = loadAccountsMap(storage);
  const record = Object.hasOwn(accounts, usernameKey) ? accounts[usernameKey] : null;
  if (!record) {
    return { ok: false, error: 'Conta local não encontrada.' };
  }

  const side = playerSide === 'blue' ? 'blue' : 'red';
  const safeRed = Number.isFinite(scoreRed) ? Math.max(0, Math.floor(scoreRed)) : 0;
  const safeBlue = Number.isFinite(scoreBlue) ? Math.max(0, Math.floor(scoreBlue)) : 0;
  const goalsFor = side === 'blue' ? safeBlue : safeRed;
  const goalsAgainst = side === 'blue' ? safeRed : safeBlue;

  let outcome = 'draw';
  if (winnerSide === side) {
    outcome = 'win';
  } else if (winnerSide === 'red' || winnerSide === 'blue') {
    outcome = 'loss';
  } else if (goalsFor > goalsAgainst) {
    outcome = 'win';
  } else if (goalsFor < goalsAgainst) {
    outcome = 'loss';
  }

  const stats = normalizeStats(record.stats);
  stats.matches += 1;
  stats.goalsFor += goalsFor;
  stats.goalsAgainst += goalsAgainst;
  if (outcome === 'win') {
    stats.wins += 1;
    stats.points += 3;
  } else if (outcome === 'draw') {
    stats.draws += 1;
    stats.points += 1;
  } else {
    stats.losses += 1;
  }
  record.stats = stats;

  const cleanOpponent =
    typeof opponentName === 'string' && opponentName.trim()
      ? opponentName.trim().slice(0, 32)
      : 'Adversário';

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    mode,
    playerSide: side,
    opponentName: cleanOpponent,
    scoreRed: safeRed,
    scoreBlue: safeBlue,
    goalsFor,
    goalsAgainst,
    winnerSide: winnerSide ?? (outcome === 'draw' ? null : outcome === 'win' ? side : side === 'red' ? 'blue' : 'red'),
    outcome,
    goalLimit: normalizeGoalLimit(goalLimit),
  };

  const prevHistory = Array.isArray(record.history) ? record.history : [];
  record.history = [entry, ...prevHistory].slice(0, MAX_LOCAL_HISTORY);

  accounts[usernameKey] = record;
  saveAccountsMap(accounts, storage);

  return {
    ok: true,
    account: toPublicAccount(record),
    entry,
  };
}

/**
 * Retorna o ranking local ordenado por pontos, vitórias, saldo de gols e gols pró.
 */
export function getLocalLeaderboard(storage) {
  const accounts = loadAccountsMap(storage);
  return Object.values(accounts)
    .map((record) => {
      const pub = toPublicAccount(record);
      return {
        username: pub.username,
        displayName: pub.displayName,
        favoriteColor: pub.favoriteColor,
        matches: pub.stats.matches,
        wins: pub.stats.wins,
        losses: pub.stats.losses,
        draws: pub.stats.draws,
        goalsFor: pub.stats.goalsFor,
        goalsAgainst: pub.stats.goalsAgainst,
        goalDiff: pub.stats.goalDiff,
        points: pub.stats.points,
        winRate: pub.stats.winRate,
        offline: true,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.displayName.localeCompare(b.displayName);
    });
}
