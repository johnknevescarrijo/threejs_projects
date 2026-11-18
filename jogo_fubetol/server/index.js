import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { createStore, DEFAULT_DATA_FILE } from './store.js';
import { createRoomManager } from './rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STATIC_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const BLOCKED_PREFIXES = ['/server', '/tests', '/node_modules', '/.git'];
const BLOCKED_EXACT = new Set([
  '/package.json',
  '/package-lock.json',
  '/.gitignore',
]);

function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readJsonBody(req, maxBytes = 65536) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        const err = new Error('Payload muito grande.');
        err.status = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        const parseErr = new Error('JSON inválido no corpo da requisição.');
        parseErr.status = 400;
        reject(parseErr);
      }
    });
    req.on('error', reject);
  });
}

function extractBearerToken(req, body) {
  const authHeader = req.headers.authorization || '';
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (body && typeof body.token === 'string') {
    return body.token.trim();
  }
  return '';
}

export function createGameServer({
  port = 3000,
  host = undefined,
  dataFile = DEFAULT_DATA_FILE,
  staticDir = DEFAULT_STATIC_DIR,
} = {}) {
  const normalizedHost = typeof host === 'string' && host.trim() ? host.trim() : undefined;
  const resolvedStaticDir = path.resolve(staticDir);
  const store = createStore({ dataFile });
  const roomManager = createRoomManager({ store });
  const clientsById = new Map();

  function sendWs(ws, type, payload = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type, ...payload }));
  }

  function broadcastAll(type, payload = {}) {
    for (const client of clientsById.values()) {
      sendWs(client.ws, type, payload);
    }
  }

  function sendToRoom(room, type, payload = {}, excludeClientId = null) {
    if (!room?.players) return;
    for (const side of ['red', 'blue']) {
      const p = room.players[side];
      if (!p || p.clientId === excludeClientId) continue;
      const client = clientsById.get(p.clientId);
      if (client) {
        sendWs(client.ws, type, payload);
      }
    }
  }

  function broadcastRoomsUpdated() {
    broadcastAll('rooms_updated', { rooms: roomManager.listPublicRooms() });
  }

  function handleClientDeparture(client) {
    const result = roomManager.leaveOrDisconnect(client.id);
    client.roomId = null;
    client.side = null;

    if (!result) return null;

    if (result.type === 'forfeit') {
      const remaining = clientsById.get(result.remainingPlayer?.clientId);
      if (remaining) {
        remaining.roomId = null;
        remaining.side = null;
        sendWs(remaining.ws, 'opponent_disconnected', {
          reason: 'forfeit',
          winnerSide: result.remainingSide,
          leavingPlayer: result.leavingPlayer,
          message: `${result.leavingPlayer?.displayName || 'Adversário'} desconectou. Vitória por W.O.!`,
        });
        sendWs(remaining.ws, 'match_ended', result.matchEnded);
      }
      broadcastRoomsUpdated();
      return result;
    }

    if (result.type === 'closed_after_match') {
      const remaining = clientsById.get(result.remainingPlayer?.clientId);
      if (remaining) {
        remaining.roomId = null;
        remaining.side = null;
        sendWs(remaining.ws, 'room_state', { room: null });
      }
      broadcastRoomsUpdated();
      return result;
    }

    if (result.type === 'updated' && result.room) {
      if (result.room.players.red) {
        const hostClient = clientsById.get(result.room.players.red.clientId);
        if (hostClient) hostClient.side = 'red';
      }
      sendToRoom(result.room, 'room_state', { room: result.room });
      broadcastRoomsUpdated();
      return result;
    }

    if (result.type === 'closed') {
      broadcastRoomsUpdated();
      return result;
    }

    return result;
  }

  async function handleHttpRequest(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    let pathname = '/';
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      pathname = decodeURIComponent(url.pathname);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: 'URL inválida.' });
      return;
    }

    // REST API Routes
    if (pathname.startsWith('/api/')) {
      try {
        if (method === 'GET' && pathname === '/api/health') {
          sendJson(res, 200, {
            ok: true,
            mode: 'online',
            roomsCount: roomManager.listPublicRooms().length,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (method === 'POST' && pathname === '/api/auth/register') {
          const body = await readJsonBody(req);
          const result = store.registerUser(body);
          sendJson(res, 201, { ok: true, ...result });
          return;
        }

        if (method === 'POST' && pathname === '/api/auth/login') {
          const body = await readJsonBody(req);
          const result = store.authenticateUser(body);
          sendJson(res, 200, { ok: true, ...result });
          return;
        }

        if (method === 'POST' && pathname === '/api/auth/logout') {
          const body = await readJsonBody(req);
          const token = extractBearerToken(req, body);
          store.revokeToken(token);
          sendJson(res, 200, { ok: true });
          return;
        }

        if (method === 'GET' && pathname === '/api/auth/me') {
          const token = extractBearerToken(req);
          const user = store.getUserByToken(token);
          if (!user) {
            sendJson(res, 401, { ok: false, error: 'Sessão inválida ou expirada.' });
            return;
          }
          sendJson(res, 200, { ok: true, user });
          return;
        }

        if (method === 'PUT' && pathname === '/api/profile') {
          const token = extractBearerToken(req);
          const currentUser = store.getUserByToken(token);
          if (!currentUser) {
            sendJson(res, 401, { ok: false, error: 'Autenticação necessária.' });
            return;
          }
          const body = await readJsonBody(req);
          const updatedUser = store.updateUserProfile(currentUser.id, body);
          for (const client of clientsById.values()) {
            if (client.user?.id === updatedUser.id) {
              client.user = updatedUser;
            }
          }
          sendJson(res, 200, { ok: true, user: updatedUser });
          return;
        }

        if (method === 'GET' && pathname === '/api/leaderboard') {
          sendJson(res, 200, {
            ok: true,
            leaderboard: store.getLeaderboard(30),
          });
          return;
        }

        if (method === 'GET' && pathname === '/api/rooms') {
          sendJson(res, 200, {
            ok: true,
            rooms: roomManager.listPublicRooms(),
          });
          return;
        }

        sendJson(res, 404, { ok: false, error: 'Rota de API não encontrada.' });
      } catch (err) {
        const status = Number.isInteger(err?.status) ? err.status : 500;
        sendJson(res, status, {
          ok: false,
          error: err?.message || 'Erro interno no servidor.',
        });
      }
      return;
    }

    // Static files serving (with strict path traversal and server/tests protection)
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    if (pathname.includes('\0') || pathname.includes('..') || pathname.includes('\\')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const normalizedPath = path.posix.normalize(pathname === '/' ? '/index.html' : pathname);
    if (
      normalizedPath.startsWith('/..') ||
      BLOCKED_PREFIXES.some(
        (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
      ) ||
      BLOCKED_EXACT.has(normalizedPath) ||
      normalizedPath.split('/').some((seg) => seg.startsWith('.') && seg !== '.')
    ) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const relativeFile = normalizedPath.replace(/^\/+/, '');
    const candidatePath = path.resolve(resolvedStaticDir, relativeFile);
    if (
      candidatePath !== resolvedStaticDir &&
      !candidatePath.startsWith(`${resolvedStaticDir}${path.sep}`)
    ) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (normalizedPath === '/favicon.ico' && !fs.existsSync(candidatePath)) {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const stat = fs.statSync(candidatePath);
      if (!stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }

      const realFile = fs.realpathSync(candidatePath);
      const realStatic = fs.realpathSync(resolvedStaticDir);
      if (realFile !== realStatic && !realFile.startsWith(`${realStatic}${path.sep}`)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      const ext = path.extname(realFile).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
      });

      if (method === 'HEAD') {
        res.end();
        return;
      }

      fs.createReadStream(realFile).pipe(res);
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    }
  }

  const server = http.createServer((req, res) => {
    handleHttpRequest(req, res).catch((err) => {
      if (!res.headersSent) {
        sendJson(res, 500, { ok: false, error: err?.message || 'Erro interno.' });
      }
    });
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  // Evita crash por EventEmitter unhandled 'error' quando o http.Server emite EADDRINUSE durante start()
  wss.on('error', () => {});

  wss.on('connection', (ws) => {
    const client = {
      id: crypto.randomUUID(),
      ws,
      user: null,
      roomId: null,
      side: null,
    };
    clientsById.set(client.id, client);

    sendWs(ws, 'welcome', {
      clientId: client.id,
      serverTime: new Date().toISOString(),
    });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString('utf8'));
      } catch (err) {
        sendWs(ws, 'error', { error: 'Mensagem WebSocket inválida (JSON esperado).' });
        return;
      }

      const type = msg?.type;
      try {
        if (type === 'ping') {
          sendWs(ws, 'pong', { ts: msg.ts || Date.now() });
          return;
        }

        if (type === 'auth') {
          const token = typeof msg.token === 'string' ? msg.token.trim() : '';
          if (!token) {
            client.user = null;
            sendWs(ws, 'auth_error', { error: 'Token não informado.' });
            return;
          }
          const user = store.getUserByToken(token);
          if (!user) {
            client.user = null;
            sendWs(ws, 'auth_error', { error: 'Sessão inválida ou expirada.' });
            return;
          }
          client.user = user;
          sendWs(ws, 'auth_ok', { user });
          sendWs(ws, 'rooms_updated', { rooms: roomManager.listPublicRooms() });
          return;
        }

        if (type === 'list_rooms') {
          sendWs(ws, 'rooms_updated', { rooms: roomManager.listPublicRooms() });
          return;
        }

        if (!client.user) {
          sendWs(ws, 'error', {
            code: 'AUTH_REQUIRED',
            error: 'Entre em uma conta online antes de usar salas multiplayer.',
          });
          return;
        }

        if (type === 'create_room') {
          const room = roomManager.createRoom({
            name: msg.name,
            isPrivate: Boolean(msg.isPrivate),
            goalLimit: msg.goalLimit,
            hostClient: client,
          });
          sendWs(ws, 'room_state', { room });
          broadcastRoomsUpdated();
          return;
        }

        if (type === 'join_room') {
          const room = roomManager.joinRoom({
            roomId: msg.roomId,
            code: msg.code,
            client,
          });
          sendToRoom(room, 'room_state', { room });
          broadcastRoomsUpdated();
          return;
        }

        if (type === 'leave_room') {
          handleClientDeparture(client);
          sendWs(ws, 'room_state', { room: null });
          return;
        }

        const activeRoomId = msg.roomId || client.roomId;
        if (!activeRoomId) {
          sendWs(ws, 'error', { error: 'Você não está em nenhuma sala.' });
          return;
        }

        if (type === 'update_team') {
          const room = roomManager.updatePlayerTeam(activeRoomId, client.id, {
            colorId: msg.colorId,
            teamName: msg.teamName,
          });
          sendToRoom(room, 'room_state', { room });
          return;
        }

        if (type === 'toggle_ready') {
          const room = roomManager.setReady(activeRoomId, client.id, msg.ready);
          sendToRoom(room, 'room_state', { room });
          return;
        }

        if (type === 'start_match') {
          const room = roomManager.startMatch(activeRoomId, client.id);
          sendToRoom(room, 'match_started', {
            room,
            roomId: room.id,
            roomCode: room.code,
            goalLimit: room.goalLimit,
            initialTurn: room.currentTurn,
            teams: room.teams,
          });
          broadcastRoomsUpdated();
          return;
        }

        if (type === 'room_chat') {
          const { room, message } = roomManager.sendChat(activeRoomId, client.id, msg.text);
          sendToRoom(room, 'room_chat', {
            roomId: room.id,
            message,
            room,
          });
          return;
        }

        if (type === 'game_shot') {
          const { room, shot } = roomManager.handleShot(activeRoomId, client.id, msg);
          sendToRoom(room, 'game_shot', shot, client.id);
          return;
        }

        if (type === 'turn_settled') {
          const { room, stateSync, matchEnded } = roomManager.handleTurnSettled(
            activeRoomId,
            client.id,
            msg.snapshot || msg
          );
          sendToRoom(room, 'state_sync', { snapshot: stateSync, room });
          if (matchEnded) {
            sendToRoom(room, 'match_ended', matchEnded);
          }
          return;
        }

        if (type === 'rematch_request') {
          const res = roomManager.requestRematch(activeRoomId, client.id);
          if (res.started) {
            sendToRoom(res.room, 'match_started', {
              room: res.room,
              roomId: res.room.id,
              roomCode: res.room.code,
              goalLimit: res.room.goalLimit,
              initialTurn: res.room.currentTurn,
              teams: res.room.teams,
            });
          } else {
            sendToRoom(res.room, 'room_state', { room: res.room });
          }
          return;
        }

        sendWs(ws, 'error', { error: `Tipo de mensagem desconhecido: ${type}` });
      } catch (err) {
        sendWs(ws, 'error', {
          status: err?.status || 400,
          error: err?.message || 'Erro ao processar solicitação.',
        });
      }
    });

    ws.on('close', () => {
      handleClientDeparture(client);
      clientsById.delete(client.id);
    });
  });

  function start() {
    return new Promise((resolve, reject) => {
      const onError = (err) => {
        server.off('listening', onListening);
        reject(err);
      };
      const onListening = () => {
        server.off('error', onError);
        const addr = server.address();
        resolve({
          port: typeof addr === 'object' && addr ? addr.port : port,
          host: typeof addr === 'object' && addr ? addr.address : normalizedHost || '::',
        });
      };
      server.once('error', onError);
      server.once('listening', onListening);
      if (normalizedHost) {
        server.listen(port, normalizedHost);
      } else {
        server.listen(port);
      }
    });
  }

  function close() {
    return new Promise((resolve) => {
      for (const client of clientsById.values()) {
        try {
          client.ws.terminate();
        } catch (err) {}
      }
      clientsById.clear();
      wss.close(() => {
        server.close(() => resolve());
      });
    });
  }

  return {
    server,
    wss,
    store,
    roomManager,
    start,
    close,
  };
}

export function getLanIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const entries of Object.values(interfaces)) {
    if (!Array.isArray(entries)) continue;
    for (const info of entries) {
      if (info && (info.family === 'IPv4' || info.family === 4) && !info.internal && info.address) {
        addresses.push(info.address);
      }
    }
  }
  return [...new Set(addresses)];
}

export async function startServerWithFallback({
  port = 3000,
  explicitPort = false,
  host = undefined,
  maxFallbackSteps = 10,
  dataFile = DEFAULT_DATA_FILE,
  staticDir = DEFAULT_STATIC_DIR,
  logger = console,
} = {}) {
  const normalizedHost = typeof host === 'string' && host.trim() ? host.trim() : undefined;
  const lastPort = explicitPort ? port : port + maxFallbackSteps;

  for (let candidatePort = port; candidatePort <= lastPort; candidatePort += 1) {
    const gameServer = createGameServer({
      port: candidatePort,
      host: normalizedHost,
      dataFile,
      staticDir,
    });
    try {
      const bound = await gameServer.start();
      if (candidatePort > port && logger?.warn) {
        logger.warn(`⚠️ Porta ${port} em uso, iniciando na porta ${bound.port}...`);
      }
      return { gameServer, ...bound };
    } catch (err) {
      await gameServer.close().catch(() => {});
      if (err?.code === 'EADDRINUSE') {
        if (explicitPort) {
          const suggestedPort = candidatePort === 3000 ? 3001 : candidatePort + 1;
          err.friendlyMessage =
            `A porta ${candidatePort} já está em uso. ` +
            `Escolha outra porta executando: PORT=${suggestedPort} npm start`;
          throw err;
        }
        if (candidatePort === lastPort) {
          err.friendlyMessage =
            `Nenhuma porta livre encontrada entre ${port} e ${lastPort}. ` +
            `Escolha outra porta manualmente executando: PORT=${lastPort + 1} npm start`;
          throw err;
        }
        continue;
      }
      throw err;
    }
  }
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  const rawPort = process.env.PORT !== undefined ? String(process.env.PORT).trim() : '';
  const explicitPort = rawPort !== '';
  const port = explicitPort ? Number(rawPort) : 3000;
  const host = process.env.HOST ? process.env.HOST.trim() || undefined : undefined;

  if (explicitPort && (!Number.isInteger(port) || port < 0 || port > 65535)) {
    console.error(
      `❌ Porta inválida em PORT="${rawPort}". Informe um número entre 0 e 65535 (ex: PORT=3001 npm start).`
    );
    process.exit(1);
  }

  startServerWithFallback({ port, explicitPort, host })
    .then(({ port: boundPort, host: boundHost }) => {
      console.log('⚽ Futebol de Botão 3D Online pronto! Abra no navegador:');
      console.log(`   • Local (IPv4/IPv6): http://localhost:${boundPort}`);
      if (!host || host !== '::1') {
        console.log(`   • IPv4 direto:       http://127.0.0.1:${boundPort}`);
      }
      if (!host || host === '0.0.0.0' || host === '::') {
        for (const lanIp of getLanIPv4Addresses()) {
          console.log(`   • Rede local (LAN):  http://${lanIp}:${boundPort}`);
        }
      }
      console.log(`   (Escutando em ${boundHost}:${boundPort} · Ctrl+C para encerrar)`);
    })
    .catch((err) => {
      if (err?.friendlyMessage) {
        console.error(`❌ ${err.friendlyMessage}`);
      } else {
        console.error('❌ Falha ao iniciar servidor:', err);
      }
      process.exit(1);
    });
}
