import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLOR_ORDER, getColorPalette, sanitizeTeamName } from '../js/teamColors.js';
import { normalizeGoalLimit } from '../js/matchRules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DATA_FILE = path.join(__dirname, 'data', 'db.json');

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;
const MAX_DISPLAY_NAME_LENGTH = 24;
const MAX_HISTORY_PER_USER = 20;
const MAX_STORED_MATCHES = 200;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function sanitizeDisplayName(displayName, fallback) {
  const safeFallback =
    typeof fallback === 'string' && fallback.trim() ? fallback.trim().slice(0, MAX_DISPLAY_NAME_LENGTH) : 'Jogador';
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

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHashHex) {
  if (typeof password !== 'string' || typeof salt !== 'string' || typeof expectedHashHex !== 'string') {
    return false;
  }
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHashHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function toPublicUser(record) {
  if (!record || typeof record !== 'object') return null;
  const stats = normalizeStats(record.stats);
  const goalDiff = stats.goalsFor - stats.goalsAgainst;
  const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
  const palette = getColorPalette(record.favoriteColor, 'blue');

  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    favoriteColor: palette.id,
    defaultTeamName: sanitizeTeamName(record.defaultTeamName, palette.defaultTeamName),
    offline: false,
    createdAt: record.createdAt || null,
    stats: {
      ...stats,
      goalDiff,
      winRate,
    },
    history: Array.isArray(record.history) ? record.history.slice(0, MAX_HISTORY_PER_USER) : [],
  };
}

function createEmptyDb() {
  return {
    users: {},
    sessions: {},
    matches: [],
  };
}

export function createStore({ dataFile = DEFAULT_DATA_FILE } = {}) {
  const resolvedDataFile = path.resolve(dataFile);
  let db = loadFromDisk();

  function loadFromDisk() {
    try {
      if (!fs.existsSync(resolvedDataFile)) {
        return createEmptyDb();
      }
      const raw = fs.readFileSync(resolvedDataFile, 'utf8');
      if (!raw.trim()) return createEmptyDb();
      const parsed = JSON.parse(raw);
      return {
        users: parsed?.users && typeof parsed.users === 'object' ? parsed.users : {},
        sessions: parsed?.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
        matches: Array.isArray(parsed?.matches) ? parsed.matches : [],
      };
    } catch (err) {
      return createEmptyDb();
    }
  }

  function pruneExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of Object.entries(db.sessions)) {
      if (!session || !Number.isFinite(session.expiresAt) || session.expiresAt <= now) {
        delete db.sessions[token];
      }
    }
  }

  function saveToDisk() {
    pruneExpiredSessions();
    const dir = path.dirname(resolvedDataFile);
    fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${resolvedDataFile}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmpPath, resolvedDataFile);
  }

  function issueSession(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    db.sessions[token] = {
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: now + SESSION_TTL_MS,
    };
    return token;
  }

  function findUserByUsernameKey(usernameKey) {
    return Object.values(db.users).find((u) => u && u.usernameKey === usernameKey) || null;
  }

  /**
   * Cadastra um novo usuário, persiste senha com scrypt + salt e retorna sessão.
   */
  function registerUser({
    username,
    displayName,
    password,
    favoriteColor = 'blue',
    defaultTeamName,
  } = {}) {
    const cleanUsername = typeof username === 'string' ? username.trim() : '';
    if (!USERNAME_PATTERN.test(cleanUsername)) {
      throw createHttpError(
        400,
        'Usuário deve ter entre 3 e 20 caracteres (letras, números, _ ou -).'
      );
    }

    if (typeof password !== 'string' || password.length < 4 || password.length > 128) {
      throw createHttpError(400, 'A senha deve ter entre 4 e 128 caracteres.');
    }

    if (
      favoriteColor !== undefined &&
      favoriteColor !== null &&
      favoriteColor !== '' &&
      !COLOR_ORDER.includes(favoriteColor)
    ) {
      throw createHttpError(400, 'Cor favorita inválida.');
    }

    const usernameKey = cleanUsername.toLowerCase();
    if (findUserByUsernameKey(usernameKey)) {
      throw createHttpError(409, 'Este nome de usuário já está em uso.');
    }

    const palette = getColorPalette(favoriteColor || 'blue', 'blue');
    const { salt, hash } = hashPassword(password);
    const id = crypto.randomUUID();
    const record = {
      id,
      username: cleanUsername,
      usernameKey,
      displayName: sanitizeDisplayName(displayName, cleanUsername),
      passwordSalt: salt,
      passwordHash: hash,
      favoriteColor: palette.id,
      defaultTeamName: sanitizeTeamName(defaultTeamName, palette.defaultTeamName),
      createdAt: new Date().toISOString(),
      stats: createEmptyStats(),
      history: [],
    };

    db.users[id] = record;
    const token = issueSession(id);
    saveToDisk();

    return {
      token,
      user: toPublicUser(record),
    };
  }

  /**
   * Autentica um usuário existente com timingSafeEqual e retorna novo token.
   */
  function authenticateUser({ username, password } = {}) {
    const cleanUsername = typeof username === 'string' ? username.trim() : '';
    if (!cleanUsername || typeof password !== 'string' || !password) {
      throw createHttpError(401, 'Informe usuário e senha válidos.');
    }

    const record = findUserByUsernameKey(cleanUsername.toLowerCase());
    if (!record || !verifyPassword(password, record.passwordSalt, record.passwordHash)) {
      throw createHttpError(401, 'Usuário ou senha incorretos.');
    }

    const token = issueSession(record.id);
    saveToDisk();

    return {
      token,
      user: toPublicUser(record),
    };
  }

  /**
   * Recupera o usuário público associado a um token válido.
   */
  function getUserByToken(token) {
    if (typeof token !== 'string' || !token.trim()) return null;
    const session = db.sessions[token.trim()];
    if (!session) return null;

    if (!Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) {
      delete db.sessions[token.trim()];
      saveToDisk();
      return null;
    }

    const record = db.users[session.userId];
    if (!record) return null;
    return toPublicUser(record);
  }

  /**
   * Revoga um token de sessão existente.
   */
  function revokeToken(token) {
    if (typeof token !== 'string' || !token.trim()) return false;
    const key = token.trim();
    if (!Object.hasOwn(db.sessions, key)) return false;
    delete db.sessions[key];
    saveToDisk();
    return true;
  }

  /**
   * Atualiza nome de exibição, cor favorita e nome padrão do time do usuário.
   */
  function updateUserProfile(userId, { displayName, favoriteColor, defaultTeamName } = {}) {
    const record = db.users[userId];
    if (!record) {
      throw createHttpError(404, 'Usuário não encontrado.');
    }

    if (
      favoriteColor !== undefined &&
      favoriteColor !== null &&
      favoriteColor !== '' &&
      !COLOR_ORDER.includes(favoriteColor)
    ) {
      throw createHttpError(400, 'Cor favorita inválida.');
    }

    const nextPalette = getColorPalette(
      favoriteColor || record.favoriteColor,
      record.favoriteColor || 'blue'
    );

    if (displayName !== undefined) {
      record.displayName = sanitizeDisplayName(displayName, record.username);
    }
    if (favoriteColor !== undefined && favoriteColor !== null && favoriteColor !== '') {
      record.favoriteColor = nextPalette.id;
    }
    if (defaultTeamName !== undefined) {
      record.defaultTeamName = sanitizeTeamName(defaultTeamName, nextPalette.defaultTeamName);
    } else {
      record.defaultTeamName = sanitizeTeamName(record.defaultTeamName, nextPalette.defaultTeamName);
    }

    saveToDisk();
    return toPublicUser(record);
  }

  /**
   * Registra o resultado oficial de uma partida online para os dois jogadores autenticados.
   */
  function recordOnlineMatch({
    roomId,
    roomName,
    goalLimit = 5,
    redPlayer,
    bluePlayer,
    scoreRed = 0,
    scoreBlue = 0,
    winnerSide = null,
    reason = 'goal_limit',
  } = {}) {
    const safeRed = Number.isFinite(scoreRed) ? Math.max(0, Math.floor(scoreRed)) : 0;
    const safeBlue = Number.isFinite(scoreBlue) ? Math.max(0, Math.floor(scoreBlue)) : 0;
    const normalizedLimit = normalizeGoalLimit(goalLimit);

    let effectiveWinner = null;
    if (winnerSide === 'red' || winnerSide === 'blue') {
      effectiveWinner = winnerSide;
    } else if (safeRed > safeBlue) {
      effectiveWinner = 'red';
    } else if (safeBlue > safeRed) {
      effectiveWinner = 'blue';
    }

    const timestamp = new Date().toISOString();
    const matchId = crypto.randomUUID();

    const applySideStats = (side, playerInfo, opponentInfo) => {
      if (!playerInfo?.userId) return null;
      const record = db.users[playerInfo.userId];
      if (!record) return null;

      const goalsFor = side === 'blue' ? safeBlue : safeRed;
      const goalsAgainst = side === 'blue' ? safeRed : safeBlue;

      let outcome = 'draw';
      if (effectiveWinner === side) {
        outcome = 'win';
      } else if (effectiveWinner === 'red' || effectiveWinner === 'blue') {
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

      const entry = {
        id: matchId,
        timestamp,
        mode: 'online',
        roomId: roomId || null,
        roomName: roomName || null,
        playerSide: side,
        opponentName: opponentInfo?.displayName || opponentInfo?.username || 'Adversário',
        opponentUsername: opponentInfo?.username || null,
        scoreRed: safeRed,
        scoreBlue: safeBlue,
        goalsFor,
        goalsAgainst,
        winnerSide: effectiveWinner,
        outcome,
        reason,
        goalLimit: normalizedLimit,
      };

      const prevHistory = Array.isArray(record.history) ? record.history : [];
      record.history = [entry, ...prevHistory].slice(0, MAX_HISTORY_PER_USER);
      return toPublicUser(record);
    };

    const redUser = applySideStats('red', redPlayer, bluePlayer);
    const blueUser = applySideStats('blue', bluePlayer, redPlayer);

    db.matches = [
      {
        id: matchId,
        timestamp,
        roomId: roomId || null,
        roomName: roomName || null,
        goalLimit: normalizedLimit,
        scoreRed: safeRed,
        scoreBlue: safeBlue,
        winnerSide: effectiveWinner,
        reason,
        redUserId: redPlayer?.userId || null,
        blueUserId: bluePlayer?.userId || null,
      },
      ...(Array.isArray(db.matches) ? db.matches : []),
    ].slice(0, MAX_STORED_MATCHES);

    saveToDisk();
    return {
      matchId,
      winnerSide: effectiveWinner,
      redUser,
      blueUser,
    };
  }

  /**
   * Retorna o ranking global ordenado por pontos, vitórias, saldo de gols e gols pró.
   */
  function getLeaderboard(limit = 30) {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(100, Math.floor(limit)) : 30;
    return Object.values(db.users)
      .map((record) => {
        const pub = toPublicUser(record);
        return {
          id: pub.id,
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
          offline: false,
        };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.displayName.localeCompare(b.displayName);
      })
      .slice(0, safeLimit);
  }

  return {
    dataFile: resolvedDataFile,
    registerUser,
    authenticateUser,
    getUserByToken,
    revokeToken,
    updateUserProfile,
    recordOnlineMatch,
    getLeaderboard,
  };
}
