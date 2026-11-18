import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_GOAL_LIMIT,
  GOAL_LIMIT_OPTIONS,
  normalizeGoalLimit,
  formatGoalLimitLabel,
  evaluateMatchWinner,
} from '../js/matchRules.js';

import {
  MAX_LOCAL_HISTORY,
  registerLocalAccount,
  loginLocalAccount,
  logoutLocalAccount,
  getCurrentLocalAccount,
  updateLocalProfile,
  recordLocalMatchResult,
  getLocalLeaderboard,
} from '../js/localProfile.js';

function createMockStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

// ============================================================================
// matchRules.js
// ============================================================================

test('GOAL_LIMIT_OPTIONS and normalizeGoalLimit handle valid and fallback values', () => {
  assert.deepEqual(
    GOAL_LIMIT_OPTIONS.map((o) => o.value),
    [3, 5, 7, 0]
  );
  assert.equal(DEFAULT_GOAL_LIMIT, 5);

  assert.equal(normalizeGoalLimit(3), 3);
  assert.equal(normalizeGoalLimit('7'), 7);
  assert.equal(normalizeGoalLimit(0), 0);
  assert.equal(normalizeGoalLimit('0'), 0);
  assert.equal(normalizeGoalLimit(99), 5);
  assert.equal(normalizeGoalLimit(-2), 5);
  assert.equal(normalizeGoalLimit(null), 5);
  assert.equal(normalizeGoalLimit('livre'), 5);

  assert.equal(formatGoalLimitLabel(5, { short: true }), 'Até 5 gols');
  assert.equal(formatGoalLimitLabel(0), 'Livre');
  assert.equal(formatGoalLimitLabel(0, { short: true }), 'Sem limite');
});

test('evaluateMatchWinner detects winner on goal limit and never finishes in free mode', () => {
  assert.deepEqual(evaluateMatchWinner({ red: 2, blue: 1 }, 3), {
    finished: false,
    winnerSide: null,
    loserSide: null,
  });

  assert.deepEqual(evaluateMatchWinner({ red: 3, blue: 1 }, 3), {
    finished: true,
    winnerSide: 'red',
    loserSide: 'blue',
  });

  assert.deepEqual(evaluateMatchWinner({ red: 2, blue: 5 }, 5), {
    finished: true,
    winnerSide: 'blue',
    loserSide: 'red',
  });

  // Free mode (0) never finishes by score
  assert.deepEqual(evaluateMatchWinner({ red: 25, blue: 0 }, 0), {
    finished: false,
    winnerSide: null,
    loserSide: null,
  });
});

// ============================================================================
// localProfile.js
// ============================================================================

test('registerLocalAccount validates username, password and enforces case-insensitive uniqueness', () => {
  const storage = createMockStorage();

  const badUser = registerLocalAccount(
    { username: 'ab', password: '1234', displayName: 'Ab' },
    storage
  );
  assert.equal(badUser.ok, false);

  const badSpaces = registerLocalAccount(
    { username: 'user name', password: '1234' },
    storage
  );
  assert.equal(badSpaces.ok, false);

  const shortPass = registerLocalAccount(
    { username: 'craque_10', password: '123' },
    storage
  );
  assert.equal(shortPass.ok, false);

  const okRes = registerLocalAccount(
    {
      username: 'Craque_10',
      displayName: '  Pelé do Botão  ',
      password: 'segredo123',
      favoriteColor: 'green',
      defaultTeamName: 'Palestra',
    },
    storage
  );
  assert.equal(okRes.ok, true);
  assert.equal(okRes.account.username, 'Craque_10');
  assert.equal(okRes.account.displayName, 'Pelé do Botão');
  assert.equal(okRes.account.favoriteColor, 'green');
  assert.equal(okRes.account.defaultTeamName, 'Palestra');
  assert.equal(okRes.account.offline, true);
  assert.equal('passwordHash' in okRes.account, false);

  // Duplicate case-insensitive
  const dupRes = registerLocalAccount(
    { username: 'craque_10', password: 'outrasenha' },
    storage
  );
  assert.equal(dupRes.ok, false);

  // Active session started automatically
  const current = getCurrentLocalAccount(storage);
  assert.equal(current?.username, 'Craque_10');
});

test('loginLocalAccount, logoutLocalAccount and updateLocalProfile work properly', () => {
  const storage = createMockStorage();

  registerLocalAccount(
    {
      username: 'jogador1',
      displayName: 'João',
      password: 'abcd',
      favoriteColor: 'pink',
    },
    storage
  );

  logoutLocalAccount(storage);
  assert.equal(getCurrentLocalAccount(storage), null);

  const wrongPass = loginLocalAccount({ username: 'JOGADOR1', password: 'errada' }, storage);
  assert.equal(wrongPass.ok, false);

  const missingUser = loginLocalAccount({ username: 'ninguem', password: 'abcd' }, storage);
  assert.equal(missingUser.ok, false);

  const okLogin = loginLocalAccount({ username: 'JOGADOR1', password: 'abcd' }, storage);
  assert.equal(okLogin.ok, true);
  assert.equal(okLogin.account.username, 'jogador1');

  const updated = updateLocalProfile(
    {
      displayName: 'João Craque',
      favoriteColor: 'yellow',
      defaultTeamName: 'Canarinho',
    },
    storage
  );
  assert.equal(updated.ok, true);
  assert.equal(updated.account.displayName, 'João Craque');
  assert.equal(updated.account.favoriteColor, 'yellow');
  assert.equal(updated.account.defaultTeamName, 'Canarinho');
});

test('recordLocalMatchResult updates stats, caps history at 20 and feeds sorted leaderboard', () => {
  const storage = createMockStorage();

  // Sem usuário logado falha com segurança
  const guestRecord = recordLocalMatchResult(
    { mode: 'pve', playerSide: 'red', scoreRed: 3, scoreBlue: 1, winnerSide: 'red' },
    storage
  );
  assert.equal(guestRecord.ok, false);

  // Jogador A: 1 vitória (3 pts, saldo +2)
  registerLocalAccount(
    { username: 'alpha', displayName: 'Alpha', password: '1234', favoriteColor: 'red' },
    storage
  );
  recordLocalMatchResult(
    {
      mode: 'pve',
      playerSide: 'red',
      opponentName: 'Bot Médio',
      scoreRed: 5,
      scoreBlue: 3,
      winnerSide: 'red',
      goalLimit: 5,
    },
    storage
  );

  // Jogador B: 2 vitórias e várias partidas (testa limite de 20 no histórico)
  registerLocalAccount(
    { username: 'beta', displayName: 'Beta', password: '1234', favoriteColor: 'black' },
    storage
  );
  for (let i = 0; i < 24; i++) {
    recordLocalMatchResult(
      {
        mode: 'pve',
        playerSide: 'blue',
        opponentName: `Bot #${i + 1}`,
        scoreRed: i % 3 === 0 ? 5 : 2,
        scoreBlue: i % 3 === 0 ? 1 : 5,
        winnerSide: i % 3 === 0 ? 'red' : 'blue',
        goalLimit: 5,
      },
      storage
    );
  }

  const beta = getCurrentLocalAccount(storage);
  assert.equal(beta.stats.matches, 24);
  assert.equal(beta.stats.wins, 16);
  assert.equal(beta.stats.losses, 8);
  assert.equal(beta.stats.points, 48);
  assert.equal(beta.history.length, MAX_LOCAL_HISTORY);
  assert.equal(beta.history[0].opponentName, 'Bot #24');

  // Jogador C: 1 vitória com saldo maior que Alpha (+5)
  registerLocalAccount(
    { username: 'gamma', displayName: 'Gamma', password: '1234', favoriteColor: 'green' },
    storage
  );
  recordLocalMatchResult(
    {
      mode: 'pve',
      playerSide: 'red',
      opponentName: 'Bot Fácil',
      scoreRed: 5,
      scoreBlue: 0,
      winnerSide: 'red',
      goalLimit: 5,
    },
    storage
  );

  const leaderboard = getLocalLeaderboard(storage);
  assert.equal(leaderboard.length, 3);
  assert.equal(leaderboard[0].username, 'beta');
  assert.equal(leaderboard[1].username, 'gamma');
  assert.equal(leaderboard[2].username, 'alpha');
  assert.equal(leaderboard[1].goalDiff, 5);
  assert.equal(leaderboard[2].goalDiff, 2);
});
