import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { createGameServer, startServerWithFallback } from '../server/index.js';

function createWsHelper(url) {
  const ws = new WebSocket(url);
  const queue = [];
  const waiters = [];

  ws.on('message', (raw) => {
    const parsed = JSON.parse(raw.toString('utf8'));
    const idx = waiters.findIndex((w) => w.predicate(parsed));
    if (idx !== -1) {
      const [waiter] = waiters.splice(idx, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(parsed);
    } else {
      queue.push(parsed);
    }
  });

  function waitForOpen() {
    if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });
  }

  function nextMessage(predicate = () => true, timeoutMs = 4000) {
    const qIdx = queue.findIndex(predicate);
    if (qIdx !== -1) {
      const [msg] = queue.splice(qIdx, 1);
      return Promise.resolve(msg);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const wIdx = waiters.indexOf(waiter);
        if (wIdx !== -1) waiters.splice(wIdx, 1);
        reject(new Error(`Timeout aguardando mensagem WS (${timeoutMs}ms)`));
      }, timeoutMs);
      const waiter = { predicate, resolve, timer };
      waiters.push(waiter);
    });
  }

  function send(payload) {
    ws.send(JSON.stringify(payload));
  }

  async function close() {
    if (ws.readyState === WebSocket.CLOSED) return;
    await new Promise((resolve) => {
      ws.once('close', resolve);
      ws.close();
    });
  }

  return { ws, waitForOpen, nextMessage, send, close };
}

async function setupTestServer(t) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fubetol-server-test-'));
  const dataFile = path.join(tmpDir, 'db.json');
  const gameServer = createGameServer({ port: 0, host: '127.0.0.1', dataFile });
  const { port } = await gameServer.start();
  const baseUrl = `http://127.0.0.1:${port}`;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  t.after(async () => {
    await gameServer.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  return { gameServer, baseUrl, wsUrl, dataFile };
}

test('GET /api/health, static files, and path traversal protection', async (t) => {
  const { baseUrl } = await setupTestServer(t);

  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthRes.status, 200);
  const healthJson = await healthRes.json();
  assert.equal(healthJson.ok, true);
  assert.equal(healthJson.mode, 'online');

  const indexRes = await fetch(`${baseUrl}/`);
  assert.equal(indexRes.status, 200);
  const html = await indexRes.text();
  assert.match(html, /Futebol de Botão 3D/);

  const clientJsRes = await fetch(`${baseUrl}/js/onlineClient.js`);
  assert.equal(clientJsRes.status, 200);

  // Bloqueios de path traversal e diretórios internos
  for (const blockedPath of [
    '/../package.json',
    '/%2e%2e/package.json',
    '/server/index.js',
    '/server/store.js',
    '/tests/serverMultiplayer.test.mjs',
    '/package.json',
  ]) {
    const res = await fetch(`${baseUrl}${blockedPath}`);
    assert.ok(
      res.status === 403 || res.status === 404,
      `Esperado 403/404 para ${blockedPath}, recebido ${res.status}`
    );
  }
});

test('Auth REST API: register, duplicate 409, login, wrong password 401, me, profile, logout', async (t) => {
  const { baseUrl } = await setupTestServer(t);

  // Cadastro válido
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Craque_10',
      displayName: 'Craque Dez',
      password: 'segredo123',
      favoriteColor: 'green',
      defaultTeamName: 'Palestra',
    }),
  });
  assert.equal(regRes.status, 201);
  const regData = await regRes.json();
  assert.equal(regData.ok, true);
  assert.ok(regData.token);
  assert.equal(regData.user.username, 'Craque_10');
  assert.equal(regData.user.favoriteColor, 'green');
  assert.equal(regData.user.defaultTeamName, 'Palestra');
  assert.equal(regData.user.passwordHash, undefined);
  assert.equal(regData.user.passwordSalt, undefined);

  // Duplicidade case-insensitive -> 409
  const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'craque_10',
      password: 'outrasenha',
      favoriteColor: 'pink',
    }),
  });
  assert.equal(dupRes.status, 409);

  // Senha errada -> 401
  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Craque_10', password: 'errada' }),
  });
  assert.equal(badLogin.status, 401);

  // Login válido
  const okLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'craque_10', password: 'segredo123' }),
  });
  assert.equal(okLogin.status, 200);
  const loginData = await okLogin.json();
  assert.ok(loginData.token);

  // /api/auth/me
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.user.username, 'Craque_10');

  // PUT /api/profile
  const profRes = await fetch(`${baseUrl}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginData.token}`,
    },
    body: JSON.stringify({
      displayName: 'Rei do Botão',
      favoriteColor: 'yellow',
      defaultTeamName: 'Canarinho',
    }),
  });
  assert.equal(profRes.status, 200);
  const profData = await profRes.json();
  assert.equal(profData.user.displayName, 'Rei do Botão');
  assert.equal(profData.user.favoriteColor, 'yellow');
  assert.equal(profData.user.defaultTeamName, 'Canarinho');

  // Logout revoga token
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  assert.equal(logoutRes.status, 200);

  const meAfterLogout = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  assert.equal(meAfterLogout.status, 401);
});

test('Multiplayer E2E: rooms, anti-collision color, chat, ready, turn sync, goal limit & leaderboard', async (t) => {
  const { baseUrl, wsUrl } = await setupTestServer(t);

  // Registra 2 jogadores com a MESMA cor favorita ('pink') para testar anti-colisão
  const r1 = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'host_rosa',
      displayName: 'Host Rosa',
      password: '1234',
      favoriteColor: 'pink',
      defaultTeamName: 'Rosa FC',
    }),
  });
  const u1 = await r1.json();

  const r2 = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'guest_rosa',
      displayName: 'Guest Rosa',
      password: '1234',
      favoriteColor: 'pink',
    }),
  });
  const u2 = await r2.json();

  const c1 = createWsHelper(wsUrl);
  const c2 = createWsHelper(wsUrl);
  t.after(async () => {
    await c1.close();
    await c2.close();
  });

  await Promise.all([c1.waitForOpen(), c2.waitForOpen()]);
  await c1.nextMessage((m) => m.type === 'welcome');
  await c2.nextMessage((m) => m.type === 'welcome');

  c1.send({ type: 'auth', token: u1.token });
  c2.send({ type: 'auth', token: u2.token });
  const auth1 = await c1.nextMessage((m) => m.type === 'auth_ok');
  const auth2 = await c2.nextMessage((m) => m.type === 'auth_ok');
  assert.equal(auth1.user.username, 'host_rosa');
  assert.equal(auth2.user.username, 'guest_rosa');

  // Jogador 1 cria sala pública com meta de 3 gols
  c1.send({
    type: 'create_room',
    name: 'Copa Teste',
    isPrivate: false,
    goalLimit: 3,
  });
  const createdState = await c1.nextMessage((m) => m.type === 'room_state');
  const room = createdState.room;
  assert.equal(room.name, 'Copa Teste');
  assert.equal(room.goalLimit, 3);
  assert.equal(room.code.length, 6);
  assert.equal(room.players.red.colorId, 'pink');

  // Conferir GET /api/rooms
  const roomsHttp = await (await fetch(`${baseUrl}/api/rooms`)).json();
  assert.equal(roomsHttp.rooms.length, 1);
  assert.equal(roomsHttp.rooms[0].code, room.code);

  // Jogador 2 entra pelo código de 6 dígitos
  c2.send({ type: 'join_room', code: room.code });
  const joined1 = await c1.nextMessage(
    (m) => m.type === 'room_state' && m.room?.players?.blue !== null
  );
  const joined2 = await c2.nextMessage(
    (m) => m.type === 'room_state' && m.room?.players?.blue !== null
  );
  assert.equal(joined1.room.players.blue.username, 'guest_rosa');
  assert.notEqual(
    joined2.room.players.blue.colorId,
    joined2.room.players.red.colorId,
    'Cor do convidado não pode colidir com a do host'
  );

  // Tentativa de escolher a mesma cor do host deve ser bloqueada com erro claro
  c2.send({ type: 'update_team', roomId: room.id, colorId: 'pink' });
  const colErr = await c2.nextMessage((m) => m.type === 'error');
  assert.match(colErr.error, /em uso/i);

  // Troca válida para Preto + nome customizado
  c2.send({ type: 'update_team', roomId: room.id, colorId: 'black', teamName: 'Panteras' });
  const updatedTeam = await c1.nextMessage(
    (m) => m.type === 'room_state' && m.room?.players?.blue?.colorId === 'black'
  );
  assert.equal(updatedTeam.room.players.blue.teamName, 'Panteras');

  // Chat rápido
  c1.send({ type: 'room_chat', roomId: room.id, text: 'Bom jogo!' });
  const chat2 = await c2.nextMessage((m) => m.type === 'room_chat');
  assert.equal(chat2.message.text, 'Bom jogo!');
  assert.equal(chat2.message.sender, 'Host Rosa');

  // Ready check e início da partida
  c2.send({ type: 'toggle_ready', roomId: room.id, ready: true });
  await c1.nextMessage((m) => m.type === 'room_state' && m.room?.players?.blue?.ready === true);
  c1.send({ type: 'start_match', roomId: room.id });

  const start1 = await c1.nextMessage((m) => m.type === 'match_started');
  const start2 = await c2.nextMessage((m) => m.type === 'match_started');
  assert.equal(start1.initialTurn, 'red');
  assert.equal(start2.teams.red.colorId, 'pink');
  assert.equal(start2.teams.blue.colorId, 'black');

  // Jogador 2 tenta chutar fora da vez -> erro 403
  c2.send({ type: 'game_shot', roomId: room.id, pieceIndex: 11, vx: -1, vz: 0 });
  const outOfTurnErr = await c2.nextMessage((m) => m.type === 'error');
  assert.match(outOfTurnErr.error, /sua vez/i);

  // Jogador 1 chuta -> Jogador 2 recebe game_shot
  c1.send({
    type: 'game_shot',
    roomId: room.id,
    pieceIndex: 5,
    pieceNumber: '6',
    pieceType: 'button',
    vx: 1.8,
    vz: -0.4,
    powerRatio: 0.75,
  });
  const remoteShot = await c2.nextMessage((m) => m.type === 'game_shot');
  assert.equal(remoteShot.side, 'red');
  assert.equal(remoteShot.pieceIndex, 5);
  assert.equal(remoteShot.vx, 1.8);

  // Jogador 1 envia turn_settled (1x0 e passa a vez para blue)
  c1.send({
    type: 'turn_settled',
    roomId: room.id,
    snapshot: {
      scoreRed: 1,
      scoreBlue: 0,
      nextTurn: 'blue',
      ball: { x: 0, z: 0, vx: 0, vz: 0 },
      pieces: [],
    },
  });
  const sync1 = await c1.nextMessage((m) => m.type === 'state_sync');
  const sync2 = await c2.nextMessage((m) => m.type === 'state_sync');
  assert.equal(sync1.snapshot.currentTurn, 'blue');
  assert.equal(sync2.snapshot.scoreRed, 1);

  // Jogador 2 agora chuta e fecha partida com 3 gols para red (ou blue)
  c2.send({
    type: 'game_shot',
    roomId: room.id,
    pieceIndex: 12,
    vx: -1.5,
    vz: 0.2,
  });
  await c1.nextMessage((m) => m.type === 'game_shot');

  c2.send({
    type: 'turn_settled',
    roomId: room.id,
    snapshot: {
      scoreRed: 1,
      scoreBlue: 3,
      nextTurn: 'red',
      ball: { x: 0, z: 0, vx: 0, vz: 0 },
      pieces: [],
    },
  });

  const ended1 = await c1.nextMessage((m) => m.type === 'match_ended');
  const ended2 = await c2.nextMessage((m) => m.type === 'match_ended');
  assert.equal(ended1.winnerSide, 'blue');
  assert.equal(ended2.scoreBlue, 3);
  assert.equal(ended2.recorded, true);

  // Verifica leaderboard atualizado
  const lbRes = await (await fetch(`${baseUrl}/api/leaderboard`)).json();
  assert.equal(lbRes.leaderboard[0].username, 'guest_rosa');
  assert.equal(lbRes.leaderboard[0].points, 3);
  assert.equal(lbRes.leaderboard[0].wins, 1);
  assert.equal(lbRes.leaderboard[1].username, 'host_rosa');
  assert.equal(lbRes.leaderboard[1].losses, 1);

  // Verifica histórico em /api/auth/me
  const me2 = await (
    await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${u2.token}` },
    })
  ).json();
  assert.equal(me2.user.history.length, 1);
  assert.equal(me2.user.history[0].outcome, 'win');
  assert.equal(me2.user.history[0].opponentName, 'Host Rosa');
});

test('Multiplayer disconnect during active match declares W.O. forfeit and cleans up room', async (t) => {
  const { baseUrl, wsUrl } = await setupTestServer(t);

  const u1 = await (
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'wo_host', password: '1234', favoriteColor: 'red' }),
    })
  ).json();
  const u2 = await (
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'wo_guest', password: '1234', favoriteColor: 'blue' }),
    })
  ).json();

  const c1 = createWsHelper(wsUrl);
  const c2 = createWsHelper(wsUrl);
  t.after(async () => {
    await c1.close();
    await c2.close();
  });

  await Promise.all([c1.waitForOpen(), c2.waitForOpen()]);
  await c1.nextMessage((m) => m.type === 'welcome');
  await c2.nextMessage((m) => m.type === 'welcome');

  c1.send({ type: 'auth', token: u1.token });
  c2.send({ type: 'auth', token: u2.token });
  await c1.nextMessage((m) => m.type === 'auth_ok');
  await c2.nextMessage((m) => m.type === 'auth_ok');

  c1.send({ type: 'create_room', name: 'Sala WO', goalLimit: 5 });
  const { room } = await c1.nextMessage((m) => m.type === 'room_state');

  c2.send({ type: 'join_room', code: room.code });
  await c2.nextMessage((m) => m.type === 'room_state' && m.room?.players?.blue);

  c2.send({ type: 'toggle_ready', roomId: room.id, ready: true });
  await c1.nextMessage((m) => m.type === 'room_state' && m.room?.players?.blue?.ready);
  c1.send({ type: 'start_match', roomId: room.id });
  await c1.nextMessage((m) => m.type === 'match_started');
  await c2.nextMessage((m) => m.type === 'match_started');

  // Jogador 2 desconecta abruptamente durante a partida
  await c2.close();

  const discMsg = await c1.nextMessage((m) => m.type === 'opponent_disconnected');
  const forfeitEnd = await c1.nextMessage((m) => m.type === 'match_ended');
  assert.equal(discMsg.reason, 'forfeit');
  assert.equal(discMsg.winnerSide, 'red');
  assert.equal(forfeitEnd.reason, 'forfeit');
  assert.equal(forfeitEnd.winnerSide, 'red');

  // Sala deve ter sido removida
  const roomsAfter = await (await fetch(`${baseUrl}/api/rooms`)).json();
  assert.equal(roomsAfter.rooms.length, 0);

  // Vitória por W.O. deve contar no ranking
  const lb = await (await fetch(`${baseUrl}/api/leaderboard`)).json();
  const hostEntry = lb.leaderboard.find((e) => e.username === 'wo_host');
  assert.equal(hostEntry.wins, 1);
  assert.equal(hostEntry.points, 3);
});

test('Dual-stack default bind responds 200 OK via IPv4, IPv6 (::1), and localhost', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fubetol-dualstack-test-'));
  const dataFile = path.join(tmpDir, 'db.json');
  const gameServer = createGameServer({ port: 0, dataFile });
  const { port } = await gameServer.start();

  t.after(async () => {
    await gameServer.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const [ipv4Res, ipv6Res, localhostRes] = await Promise.all([
    fetch(`http://127.0.0.1:${port}/api/health`),
    fetch(`http://[::1]:${port}/api/health`),
    fetch(`http://localhost:${port}/api/health`),
  ]);

  assert.equal(ipv4Res.status, 200);
  assert.equal(ipv6Res.status, 200);
  assert.equal(localhostRes.status, 200);

  const [ipv4Json, ipv6Json, localhostJson] = await Promise.all([
    ipv4Res.json(),
    ipv6Res.json(),
    localhostRes.json(),
  ]);
  assert.equal(ipv4Json.ok, true);
  assert.equal(ipv6Json.ok, true);
  assert.equal(localhostJson.ok, true);

  // Também valida WebSocket via IPv6 (::1) e localhost
  const ws6 = createWsHelper(`ws://[::1]:${port}/ws`);
  const wsLocal = createWsHelper(`ws://localhost:${port}/ws`);
  t.after(async () => {
    await ws6.close();
    await wsLocal.close();
  });

  await Promise.all([ws6.waitForOpen(), wsLocal.waitForOpen()]);
  const [welcome6, welcomeLocal] = await Promise.all([
    ws6.nextMessage((m) => m.type === 'welcome'),
    wsLocal.nextMessage((m) => m.type === 'welcome'),
  ]);
  assert.ok(welcome6.clientId);
  assert.ok(welcomeLocal.clientId);
});

test('startServerWithFallback switches to next free port when PORT is not explicit and fails clearly when explicit', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fubetol-fallback-test-'));
  const firstData = path.join(tmpDir, 'db1.json');
  const secondData = path.join(tmpDir, 'db2.json');

  const firstServer = createGameServer({ port: 0, dataFile: firstData });
  const { port: occupiedPort } = await firstServer.start();

  const warnings = [];
  const silentLogger = {
    warn: (msg) => warnings.push(msg),
  };

  let fallbackResult = null;
  t.after(async () => {
    if (fallbackResult?.gameServer) {
      await fallbackResult.gameServer.close();
    }
    await firstServer.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Fallback automático quando explicitPort=false
  fallbackResult = await startServerWithFallback({
    port: occupiedPort,
    explicitPort: false,
    maxFallbackSteps: 5,
    dataFile: secondData,
    logger: silentLogger,
  });

  assert.ok(fallbackResult.port > occupiedPort);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], new RegExp(`Porta ${occupiedPort} em uso`));

  // Verifica que o servidor em fallback responde normalmente
  const healthRes = await fetch(`http://localhost:${fallbackResult.port}/api/health`);
  assert.equal(healthRes.status, 200);

  // Quando explicitPort=true, não faz fallback e informa como trocar a porta
  await assert.rejects(
    () =>
      startServerWithFallback({
        port: occupiedPort,
        explicitPort: true,
        dataFile: secondData,
        logger: silentLogger,
      }),
    (err) => {
      assert.equal(err.code, 'EADDRINUSE');
      assert.match(err.friendlyMessage, /PORT=\d+ npm start/);
      return true;
    }
  );
});
