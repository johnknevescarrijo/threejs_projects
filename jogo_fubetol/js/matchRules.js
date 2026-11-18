export const DEFAULT_GOAL_LIMIT = 5;

export const GOAL_LIMIT_OPTIONS = Object.freeze([
  Object.freeze({ value: 3, label: '3 Gols', shortLabel: 'Até 3 gols' }),
  Object.freeze({ value: 5, label: '5 Gols', shortLabel: 'Até 5 gols' }),
  Object.freeze({ value: 7, label: '7 Gols', shortLabel: 'Até 7 gols' }),
  Object.freeze({ value: 0, label: 'Livre', shortLabel: 'Sem limite' }),
]);

const VALID_GOAL_LIMITS = new Set(GOAL_LIMIT_OPTIONS.map((opt) => opt.value));

/**
 * Normaliza a meta de gols para uma das opções válidas (3, 5, 7 ou 0 para Livre).
 */
export function normalizeGoalLimit(limit) {
  if (limit === 0 || limit === '0') {
    return 0;
  }

  const parsed = typeof limit === 'number' ? limit : Number.parseInt(String(limit ?? ''), 10);
  if (Number.isInteger(parsed) && VALID_GOAL_LIMITS.has(parsed)) {
    return parsed;
  }

  return DEFAULT_GOAL_LIMIT;
}

/**
 * Retorna um rótulo amigável para exibição no HUD e nos seletores.
 */
export function formatGoalLimitLabel(limit, { short = false } = {}) {
  const normalized = normalizeGoalLimit(limit);
  const option = GOAL_LIMIT_OPTIONS.find((opt) => opt.value === normalized);
  if (!option) return short ? 'Até 5 gols' : '5 Gols';
  return short ? option.shortLabel : option.label;
}

/**
 * Avalia se a partida atingiu a meta de gols e determina vencedor/perdedor.
 */
export function evaluateMatchWinner(scores, goalLimit = DEFAULT_GOAL_LIMIT) {
  const normalizedLimit = normalizeGoalLimit(goalLimit);
  if (normalizedLimit === 0) {
    return { finished: false, winnerSide: null, loserSide: null };
  }

  const safeScores = scores && typeof scores === 'object' ? scores : {};
  const red = Number.isFinite(safeScores.red)
    ? Math.max(0, Math.floor(safeScores.red))
    : Number.isFinite(safeScores.scoreRed)
      ? Math.max(0, Math.floor(safeScores.scoreRed))
      : 0;
  const blue = Number.isFinite(safeScores.blue)
    ? Math.max(0, Math.floor(safeScores.blue))
    : Number.isFinite(safeScores.scoreBlue)
      ? Math.max(0, Math.floor(safeScores.scoreBlue))
      : 0;

  if (red >= normalizedLimit && red > blue) {
    return { finished: true, winnerSide: 'red', loserSide: 'blue' };
  }

  if (blue >= normalizedLimit && blue > red) {
    return { finished: true, winnerSide: 'blue', loserSide: 'red' };
  }

  return { finished: false, winnerSide: null, loserSide: null };
}
