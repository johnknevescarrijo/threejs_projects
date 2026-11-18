import crypto from 'node:crypto';
import { COLOR_ORDER, getColorPalette, sanitizeTeamName } from '../js/teamColors.js';
import { evaluateMatchWinner, normalizeGoalLimit } from '../js/matchRules.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const MAX_ROOM_NAME_LENGTH = 28;
const MAX_CHAT_LENGTH = 140;
const MAX_CHAT_HISTORY = 30;

function createRoomError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function sanitizeRoomName(name, fallback) {
  const safeFallback =
    typeof fallback === 'string' && fallback.trim()
      ? fallback.trim().slice(0, MAX_ROOM_NAME_LENGTH)
      : 'Sala Clássica';
  if (typeof name !== 'string') return safeFallback;
  const cleaned = name.trim().replace(/\s+/g, ' ').slice(0, MAX_ROOM_NAME_LENGTH).trim();
  return cleaned || safeFallback;
}

function sanitizeChatText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[\r\n]+/g, ' ').trim().replace(/\s+/g, ' ').slice(0, MAX_CHAT_LENGTH).trim();
}

function pickNonCollidingColor(preferredColorId, takenColorId) {
  const preferred = getColorPalette(preferredColorId, 'blue').id;
  if (preferred !== takenColorId) {
    return preferred;
  }
  return COLOR_ORDER.find((id) => id !== takenColorId) || 'blue';
}

export function createRoomManager({ store } = {}) {
  const rooms = new Map(); // roomId -> room

  function generateUniqueCode() {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[crypto.randomInt(ROOM_CODE_ALPHABET.length)];
      }
      const collision = Array.from(rooms.values()).some((r) => r.code === code);
      if (!collision) return code;
    }
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  function findRoomByIdOrCode({ roomId, code } = {}) {
    if (roomId && rooms.has(roomId)) {
      return rooms.get(roomId);
    }
    if (typeof code === 'string' && code.trim()) {
      const normalized = code.trim().toUpperCase();
      for (const room of rooms.values()) {
        if (room.code === normalized) return room;
      }
    }
    return null;
  }

  function findRoomByClientId(clientId) {
    if (!clientId) return null;
    for (const room of rooms.values()) {
      if (room.players.red?.clientId === clientId) {
        return { room, side: 'red' };
      }
      if (room.players.blue?.clientId === clientId) {
        return { room, side: 'blue' };
      }
    }
    return null;
  }

  function getSideForClient(room, clientId) {
    if (room.players.red?.clientId === clientId) return 'red';
    if (room.players.blue?.clientId === clientId) return 'blue';
    return null;
  }

  function appendSystemMessage(room, text) {
    room.messages = [
      ...room.messages,
      {
        id: crypto.randomUUID(),
        sender: 'Sistema',
        side: 'system',
        text,
        timestamp: new Date().toISOString(),
      },
    ].slice(-MAX_CHAT_HISTORY);
  }

  function serializePlayer(player) {
    if (!player) return null;
    return {
      clientId: player.clientId,
      userId: player.userId,
      username: player.username,
      displayName: player.displayName,
      colorId: player.colorId,
      teamName: player.teamName,
      ready: Boolean(player.ready),
    };
  }

  function serializeRoom(room) {
    if (!room) return null;
    const red = serializePlayer(room.players.red);
    const blue = serializePlayer(room.players.blue);
    return {
      id: room.id,
      code: room.code,
      name: room.name,
      isPrivate: room.isPrivate,
      goalLimit: room.goalLimit,
      status: room.status,
      hostClientId: room.hostClientId,
      currentTurn: room.currentTurn,
      turnLocked: room.turnLocked,
      scores: { ...room.scores },
      playerCount: (red ? 1 : 0) + (blue ? 1 : 0),
      rematchVotes: room.rematchVotes.size,
      players: {
        red,
        blue,
      },
      teams: {
        red: red ? { colorId: red.colorId, name: red.teamName } : null,
        blue: blue ? { colorId: blue.colorId, name: blue.teamName } : null,
      },
      messages: room.messages.slice(-MAX_CHAT_HISTORY),
    };
  }

  function createRoom({ name, isPrivate = false, goalLimit = 5, hostClient } = {}) {
    if (!hostClient?.user || !hostClient?.id) {
      throw createRoomError(401, 'Faça login para criar uma sala.');
    }

    const existing = findRoomByClientId(hostClient.id);
    if (existing) {
      if (existing.room.status === 'playing') {
        throw createRoomError(409, 'Você já está em uma partida ativa.');
      }
      leaveOrDisconnect(hostClient.id);
    }

    const roomId = crypto.randomUUID();
    const code = generateUniqueCode();
    const roomName = sanitizeRoomName(name, `Sala de ${hostClient.user.displayName}`);
    const normalizedGoal = normalizeGoalLimit(goalLimit);
    const colorId = getColorPalette(hostClient.user.favoriteColor, 'red').id;
    const palette = getColorPalette(colorId);
    const teamName = sanitizeTeamName(hostClient.user.defaultTeamName, palette.defaultTeamName);

    const room = {
      id: roomId,
      code,
      name: roomName,
      isPrivate: Boolean(isPrivate),
      goalLimit: normalizedGoal,
      status: 'waiting',
      hostClientId: hostClient.id,
      currentTurn: 'red',
      turnLocked: false,
      activeShooterSide: null,
      scores: { red: 0, blue: 0 },
      rematchVotes: new Set(),
      players: {
        red: {
          clientId: hostClient.id,
          userId: hostClient.user.id,
          username: hostClient.user.username,
          displayName: hostClient.user.displayName,
          colorId,
          teamName,
          ready: false,
        },
        blue: null,
      },
      messages: [],
      createdAt: new Date().toISOString(),
    };

    appendSystemMessage(room, `Sala "${roomName}" criada. Código: ${code}.`);
    rooms.set(roomId, room);
    hostClient.roomId = roomId;
    hostClient.side = 'red';

    return serializeRoom(room);
  }

  function listPublicRooms() {
    const list = [];
    for (const room of rooms.values()) {
      if (room.isPrivate || room.status !== 'waiting') continue;
      list.push({
        id: room.id,
        code: room.code,
        name: room.name,
        goalLimit: room.goalLimit,
        status: room.status,
        playerCount: (room.players.red ? 1 : 0) + (room.players.blue ? 1 : 0),
        hostName: room.players.red?.displayName || room.players.red?.username || 'Host',
        createdAt: room.createdAt,
      });
    }
    return list;
  }

  function joinRoom({ roomId, code, client } = {}) {
    if (!client?.user || !client?.id) {
      throw createRoomError(401, 'Faça login para entrar em uma sala.');
    }

    const room = findRoomByIdOrCode({ roomId, code });
    if (!room) {
      throw createRoomError(404, 'Sala não encontrada. Verifique o código informado.');
    }

    const existingSide = getSideForClient(room, client.id);
    if (existingSide) {
      return serializeRoom(room);
    }

    if (room.status !== 'waiting' || room.players.blue !== null) {
      throw createRoomError(409, 'Esta sala já está cheia ou em partida.');
    }

    const otherMembership = findRoomByClientId(client.id);
    if (otherMembership) {
      if (otherMembership.room.status === 'playing') {
        throw createRoomError(409, 'Saia da partida atual antes de entrar em outra sala.');
      }
      leaveOrDisconnect(client.id);
    }

    const redColorId = room.players.red?.colorId || 'red';
    const preferredColorId = getColorPalette(client.user.favoriteColor, 'blue').id;
    const assignedColorId = pickNonCollidingColor(preferredColorId, redColorId);
    const preferredPalette = getColorPalette(preferredColorId);
    const assignedPalette = getColorPalette(assignedColorId);

    const rawTeamName = client.user.defaultTeamName;
    const usedDefaultPreferredName =
      typeof rawTeamName !== 'string' ||
      rawTeamName.trim() === '' ||
      rawTeamName.trim().toLowerCase() === preferredPalette.defaultTeamName.toLowerCase();

    const teamName =
      assignedColorId !== preferredColorId && usedDefaultPreferredName
        ? assignedPalette.defaultTeamName
        : sanitizeTeamName(rawTeamName, assignedPalette.defaultTeamName);

    room.players.blue = {
      clientId: client.id,
      userId: client.user.id,
      username: client.user.username,
      displayName: client.user.displayName,
      colorId: assignedColorId,
      teamName,
      ready: false,
    };

    client.roomId = room.id;
    client.side = 'blue';

    if (assignedColorId !== preferredColorId) {
      appendSystemMessage(
        room,
        `${client.user.displayName} entrou na sala (cor ajustada para ${assignedPalette.name} para evitar colisão).`
      );
    } else {
      appendSystemMessage(room, `${client.user.displayName} entrou na sala.`);
    }

    return serializeRoom(room);
  }

  function updatePlayerTeam(roomId, clientId, { colorId, teamName } = {}) {
    const room = rooms.get(roomId);
    if (!room) throw createRoomError(404, 'Sala não encontrada.');
    if (room.status === 'playing') {
      throw createRoomError(409, 'Não é possível mudar a cor durante a partida.');
    }

    const side = getSideForClient(room, clientId);
    if (!side) throw createRoomError(403, 'Você não faz parte desta sala.');

    const player = room.players[side];
    const opponent = room.players[side === 'red' ? 'blue' : 'red'];
    const prevColorId = player.colorId;
    const prevPalette = getColorPalette(prevColorId);

    if (colorId !== undefined && colorId !== null && colorId !== '') {
      if (!COLOR_ORDER.includes(colorId)) {
        throw createRoomError(400, 'Cor de time inválida.');
      }
      if (opponent && opponent.colorId === colorId) {
        throw createRoomError(409, 'Essa cor já está em uso pelo adversário na sala.');
      }
      player.colorId = colorId;
    }

    const nextPalette = getColorPalette(player.colorId);
    if (teamName !== undefined) {
      player.teamName = sanitizeTeamName(teamName, nextPalette.defaultTeamName);
    } else if (
      player.colorId !== prevColorId &&
      player.teamName.toLowerCase() === prevPalette.defaultTeamName.toLowerCase()
    ) {
      player.teamName = nextPalette.defaultTeamName;
    }

    return serializeRoom(room);
  }

  function setReady(roomId, clientId, ready) {
    const room = rooms.get(roomId);
    if (!room) throw createRoomError(404, 'Sala não encontrada.');
    if (room.status !== 'waiting') {
      throw createRoomError(409, 'A sala já iniciou ou foi finalizada.');
    }

    const side = getSideForClient(room, clientId);
    if (!side) throw createRoomError(403, 'Você não faz parte desta sala.');

    const player = room.players[side];
    player.ready = ready === undefined ? !player.ready : Boolean(ready);
    return serializeRoom(room);
  }

  function startMatch(roomId, clientId) {
    const room = rooms.get(roomId);
    if (!room) throw createRoomError(404, 'Sala não encontrada.');
    if (room.status === 'playing') {
      throw createRoomError(409, 'A partida já está em andamento.');
    }
    if (room.hostClientId !== clientId) {
      throw createRoomError(403, 'Apenas o anfitrião da sala pode iniciar a partida.');
    }
    if (!room.players.red || !room.players.blue) {
      throw createRoomError(400, 'Aguarde o segundo jogador entrar na sala.');
    }
    if (!room.players.blue.ready) {
      throw createRoomError(400, 'Aguarde o adversário marcar que está pronto.');
    }

    room.players.red.ready = true;
    room.status = 'playing';
    room.currentTurn = 'red';
    room.turnLocked = false;
    room.activeShooterSide = null;
    room.scores = { red: 0, blue: 0 };
    room.rematchVotes.clear();
    appendSystemMessage(room, 'Partida iniciada! Bola rolando.');

    return serializeRoom(room);
  }

  function sendChat(roomId, clientId, text) {
    const room = rooms.get(roomId);
    if (!room) throw createRoomError(404, 'Sala não encontrada.');
    const side = getSideForClient(room, clientId);
    if (!side) throw createRoomError(403, 'Você não faz parte desta sala.');

    const cleanText = sanitizeChatText(text);
    if (!cleanText) {
      throw createRoomError(400, 'Digite uma mensagem antes de enviar.');
    }

    const player = room.players[side];
    const message = {
      id: crypto.randomUUID(),
      sender: player.displayName || player.username,
      side,
      text: cleanText,
      timestamp: new Date().toISOString(),
    };
    room.messages = [...room.messages, message].slice(-MAX_CHAT_HISTORY);

    return {
      room: serializeRoom(room),
      message,
    };
  }

  function handleShot(roomId, clientId, payload = {}) {
    const room = rooms.get(roomId);
    if (!room) throw createRoomError(404, 'Sala não encontrada.');
    if (room.status !== 'playing') {
      throw createRoomError(409, 'A partida não está em andamento.');
    }

    const side = getSideForClient(room, clientId);
    if (!side) throw createRoomError(403, 'Você não faz parte desta sala.');
    if (side !== room.currentTurn) {
      throw createRoomError(403, 'Não é a sua vez de jogar.');
    }
    if (room.turnLocked) {
      throw createRoomError(409, 'Aguarde a jogada anterior estabilizar.');
    }

    const pieceIndex = Number.isInteger(payload.pieceIndex) ? payload.pieceIndex : -1;
    const vx = Number(payload.vx);
    const vz = Number(payload.vz);
    if (pieceIndex < 0 || pieceIndex > 21 || !Number.isFinite(vx) || !Number.isFinite(vz)) {
      throw createRoomError(400, 'Dados de disparo inválidos.');
    }
    if (Math.hypot(vx, vz) > 12) {
      throw createRoomError(400, 'Velocidade de disparo fora do limite permitido.');
    }

    room.turnLocked = true;
    room.activeShooterSide = side;

    const shot = {
      side,
      pieceIndex,
      pieceNumber: payload.pieceNumber ?? null,
      pieceType: payload.pieceType || 'button',
      vx,
      vz,
      powerRatio: Number.isFinite(Number(payload.powerRatio))
        ? Math.max(0, Math.min(1, Number(payload.powerRatio)))
        : 0.7,
    };

    return {
      room: serializeRoom(room),
      shot,
    };
  }

  function handleTurnSettled(roomId, clientId, snapshot = {}) {
    const room = rooms.get(roomId);
    if (!room) throw createRoomError(404, 'Sala não encontrada.');
    if (room.status !== 'playing') {
      throw createRoomError(409, 'A partida não está em andamento.');
    }

    const side = getSideForClient(room, clientId);
    if (!side) throw createRoomError(403, 'Você não faz parte desta sala.');
    if (!room.turnLocked || room.activeShooterSide !== side) {
      throw createRoomError(403, 'Apenas o jogador ativo do turno pode confirmar a estabilização.');
    }

    const scoreRed = Number.isFinite(snapshot.scoreRed)
      ? Math.max(0, Math.floor(snapshot.scoreRed))
      : room.scores.red;
    const scoreBlue = Number.isFinite(snapshot.scoreBlue)
      ? Math.max(0, Math.floor(snapshot.scoreBlue))
      : room.scores.blue;

    const candidateTurn = snapshot.nextTurn || snapshot.currentTurn;
    const nextTurn =
      candidateTurn === 'red' || candidateTurn === 'blue'
        ? candidateTurn
        : room.currentTurn === 'red'
          ? 'blue'
          : 'red';

    room.scores = { red: scoreRed, blue: scoreBlue };
    room.turnLocked = false;
    room.activeShooterSide = null;

    const matchEval = evaluateMatchWinner(room.scores, room.goalLimit);
    if (matchEval.finished) {
      room.status = 'finished';
      room.currentTurn = nextTurn;
    } else {
      room.currentTurn = nextTurn;
    }

    const stateSync = {
      currentTurn: room.currentTurn,
      scoreRed,
      scoreBlue,
      goalLimit: room.goalLimit,
      isMoving: false,
      isMatchFinished: matchEval.finished,
      teamCustomization: {
        red: { colorId: room.players.red.colorId, name: room.players.red.teamName },
        blue: { colorId: room.players.blue.colorId, name: room.players.blue.teamName },
      },
      ball: snapshot.ball || null,
      pieces: Array.isArray(snapshot.pieces) ? snapshot.pieces : null,
    };

    let matchEnded = null;
    if (matchEval.finished) {
      let recorded = null;
      if (store && typeof store.recordOnlineMatch === 'function') {
        recorded = store.recordOnlineMatch({
          roomId: room.id,
          roomName: room.name,
          goalLimit: room.goalLimit,
          redPlayer: room.players.red,
          bluePlayer: room.players.blue,
          scoreRed,
          scoreBlue,
          winnerSide: matchEval.winnerSide,
          reason: 'goal_limit',
        });
      }

      matchEnded = {
        roomId: room.id,
        roomCode: room.code,
        winnerSide: matchEval.winnerSide,
        loserSide: matchEval.loserSide,
        scoreRed,
        scoreBlue,
        goalLimit: room.goalLimit,
        reason: 'goal_limit',
        redName: room.players.red.teamName,
        blueName: room.players.blue.teamName,
        recorded: Boolean(recorded),
      };
    }

    return {
      room: serializeRoom(room),
      stateSync,
      matchEnded,
    };
  }

  function requestRematch(roomId, clientId) {
    const room = rooms.get(roomId);
    if (!room) throw createRoomError(404, 'Sala não encontrada.');
    if (room.status !== 'finished') {
      throw createRoomError(409, 'A revanche só pode ser solicitada após o fim da partida.');
    }

    const side = getSideForClient(room, clientId);
    if (!side) throw createRoomError(403, 'Você não faz parte desta sala.');
    if (!room.players.red || !room.players.blue) {
      throw createRoomError(409, 'O adversário não está mais na sala.');
    }

    room.rematchVotes.add(clientId);
    if (room.rematchVotes.size >= 2) {
      room.status = 'playing';
      room.currentTurn = 'red';
      room.turnLocked = false;
      room.activeShooterSide = null;
      room.scores = { red: 0, blue: 0 };
      room.rematchVotes.clear();
      appendSystemMessage(room, 'Revanche aceita! Nova partida iniciada.');
      return {
        started: true,
        room: serializeRoom(room),
      };
    }

    const player = room.players[side];
    appendSystemMessage(room, `${player.displayName} solicitou revanche (1/2).`);
    return {
      started: false,
      votes: room.rematchVotes.size,
      room: serializeRoom(room),
    };
  }

  function leaveOrDisconnect(clientId) {
    const found = findRoomByClientId(clientId);
    if (!found) return null;

    const { room, side: leavingSide } = found;
    const remainingSide = leavingSide === 'red' ? 'blue' : 'red';
    const leavingPlayer = room.players[leavingSide];
    const remainingPlayer = room.players[remainingSide];

    if (room.status === 'playing' && remainingPlayer) {
      room.status = 'finished';
      let recorded = null;
      if (store && typeof store.recordOnlineMatch === 'function') {
        recorded = store.recordOnlineMatch({
          roomId: room.id,
          roomName: room.name,
          goalLimit: room.goalLimit,
          redPlayer: room.players.red,
          bluePlayer: room.players.blue,
          scoreRed: room.scores.red,
          scoreBlue: room.scores.blue,
          winnerSide: remainingSide,
          reason: 'forfeit',
        });
      }

      const matchEnded = {
        roomId: room.id,
        roomCode: room.code,
        winnerSide: remainingSide,
        loserSide: leavingSide,
        scoreRed: room.scores.red,
        scoreBlue: room.scores.blue,
        goalLimit: room.goalLimit,
        reason: 'forfeit',
        redName: room.players.red?.teamName || 'Vermelho',
        blueName: room.players.blue?.teamName || 'Azul',
        recorded: Boolean(recorded),
      };

      rooms.delete(room.id);
      return {
        type: 'forfeit',
        roomId: room.id,
        code: room.code,
        leavingSide,
        remainingSide,
        leavingPlayer: serializePlayer(leavingPlayer),
        remainingPlayer: serializePlayer(remainingPlayer),
        matchEnded,
      };
    }

    room.players[leavingSide] = null;
    room.rematchVotes.delete(clientId);

    if (!remainingPlayer) {
      rooms.delete(room.id);
      return {
        type: 'closed',
        roomId: room.id,
        code: room.code,
      };
    }

    if (room.status === 'finished') {
      rooms.delete(room.id);
      return {
        type: 'closed_after_match',
        roomId: room.id,
        code: room.code,
        remainingPlayer: serializePlayer(remainingPlayer),
        leavingPlayer: serializePlayer(leavingPlayer),
      };
    }

    if (leavingSide === 'red' && room.players.blue) {
      room.players.red = {
        ...room.players.blue,
        ready: false,
      };
      room.players.blue = null;
      room.hostClientId = room.players.red.clientId;
      appendSystemMessage(
        room,
        `${leavingPlayer.displayName} saiu. ${room.players.red.displayName} agora é o anfitrião.`
      );
    } else if (room.players.red) {
      room.players.red.ready = false;
      appendSystemMessage(room, `${leavingPlayer.displayName} saiu da sala.`);
    }

    room.status = 'waiting';
    return {
      type: 'updated',
      roomId: room.id,
      code: room.code,
      room: serializeRoom(room),
    };
  }

  function getRoomByClientId(clientId) {
    const found = findRoomByClientId(clientId);
    return found ? serializeRoom(found.room) : null;
  }

  function getRoomById(roomId) {
    const room = rooms.get(roomId);
    return room ? serializeRoom(room) : null;
  }

  return {
    createRoom,
    listPublicRooms,
    joinRoom,
    updatePlayerTeam,
    setReady,
    startMatch,
    sendChat,
    handleShot,
    handleTurnSettled,
    requestRematch,
    leaveOrDisconnect,
    getRoomByClientId,
    getRoomById,
  };
}
