export const ONLINE_TOKEN_STORAGE_KEY = 'futebolBotao.onlineToken.v1';

function readStoredToken() {
  try {
    return window.localStorage.getItem(ONLINE_TOKEN_STORAGE_KEY) || '';
  } catch (err) {
    return '';
  }
}

function saveStoredToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(ONLINE_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(ONLINE_TOKEN_STORAGE_KEY);
    }
  } catch (err) {}
}

async function fetchJson(url, { method = 'GET', body, token, timeoutMs = 5000 } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer =
    controller && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller ? controller.signal : undefined,
    });
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok && data?.ok !== false,
      status: response.status,
      data,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isLocalHostEnvironment(
  locationLike = typeof window !== 'undefined' ? window.location : null
) {
  const protocol = String(locationLike?.protocol || '').toLowerCase();
  const hostname = String(locationLike?.hostname || '').toLowerCase();
  if (protocol === 'https:') return false;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]'
  );
}

export function getHealthCheckConfig(
  locationLike = typeof window !== 'undefined' ? window.location : null
) {
  const isLocal = isLocalHostEnvironment(locationLike);
  return isLocal
    ? { isRemote: false, timeoutMs: 2500, maxAttempts: 1, retryDelayMs: 0 }
    : { isRemote: true, timeoutMs: 12000, maxAttempts: 2, retryDelayMs: 1500 };
}

export function initOnlineClient(app) {
  if (!app || typeof app.on !== 'function') return null;

  let onlineAvailable = false;
  let token = readStoredToken();
  let currentUser = null;
  let currentRoom = null;
  let mySide = null;
  let ws = null;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let reconnectDelayMs = 2000;
  let lastShooterWasMe = false;
  let autoStartPending = false;
  let isDisposed = false;

  function resolveMySide(room) {
    if (!room?.players || !currentUser?.id) return null;
    if (room.players.red?.userId === currentUser.id) return 'red';
    if (room.players.blue?.userId === currentUser.id) return 'blue';
    return null;
  }

  function sendWs(payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    ws.send(JSON.stringify(payload));
    return true;
  }

  function clearHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  async function refreshLeaderboard() {
    if (!onlineAvailable) return;
    try {
      const res = await fetchJson('/api/leaderboard');
      if (res.ok && Array.isArray(res.data?.leaderboard)) {
        app.renderLeaderboard(res.data.leaderboard, { isOnline: true });
      }
    } catch (err) {}
  }

  async function refreshCurrentUser() {
    if (!onlineAvailable || !token) return null;
    try {
      const res = await fetchJson('/api/auth/me', { token });
      if (res.ok && res.data?.user) {
        currentUser = res.data.user;
        app.setOnlineState({
          connected: true,
          connecting: false,
          label: 'Conectado',
          serverInfo: 'Servidor Multiplayer Ativo',
          account: currentUser,
        });
        return currentUser;
      }
      if (res.status === 401) {
        token = '';
        saveStoredToken('');
        currentUser = null;
      }
    } catch (err) {}
    return null;
  }

  async function refreshPublicRooms() {
    if (!onlineAvailable) return;
    if (sendWs({ type: 'list_rooms' })) return;
    try {
      const res = await fetchJson('/api/rooms');
      if (res.ok && Array.isArray(res.data?.rooms)) {
        app.renderOnlineRooms(res.data.rooms);
      }
    } catch (err) {}
  }

  function renderRoomWithSide(room) {
    currentRoom = room || null;
    mySide = resolveMySide(currentRoom);
    if (!currentRoom) {
      autoStartPending = false;
      app.renderOnlineRoom(null);
      return;
    }
    app.renderOnlineRoom({
      ...currentRoom,
      mySide,
    });
  }

  function scheduleReconnect() {
    if (isDisposed || !onlineAvailable || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectWebSocket();
    }, reconnectDelayMs);
    reconnectDelayMs = Math.min(10000, reconnectDelayMs * 1.5);
  }

  function connectWebSocket() {
    if (isDisposed || !onlineAvailable) return;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws`;

    app.setOnlineState({
      connected: true,
      connecting: true,
      label: 'Conectando...',
      serverInfo: 'Estabelecendo canal WebSocket...',
      account: currentUser,
    });

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      scheduleReconnect();
      return;
    }

    ws.addEventListener('open', () => {
      reconnectDelayMs = 2000;
      clearHeartbeat();
      heartbeatTimer = setInterval(() => {
        sendWs({ type: 'ping', ts: Date.now() });
      }, 25000);

      app.setOnlineState({
        connected: true,
        connecting: false,
        label: 'Conectado',
        serverInfo: 'Servidor Multiplayer Ativo',
        account: currentUser,
      });
    });

    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (err) {
        return;
      }

      const type = msg?.type;
      if (type === 'welcome') {
        if (token) {
          sendWs({ type: 'auth', token });
        } else {
          sendWs({ type: 'list_rooms' });
        }
        return;
      }

      if (type === 'auth_ok') {
        currentUser = msg.user || currentUser;
        app.setOnlineState({
          connected: true,
          connecting: false,
          label: 'Conectado',
          serverInfo: 'Servidor Multiplayer Ativo',
          account: currentUser,
        });
        return;
      }

      if (type === 'auth_error') {
        token = '';
        saveStoredToken('');
        currentUser = null;
        renderRoomWithSide(null);
        app.setOnlineState({
          connected: true,
          connecting: false,
          label: 'Conectado',
          serverInfo: 'Servidor Multiplayer Ativo',
          account: null,
        });
        return;
      }

      if (type === 'rooms_updated') {
        app.renderOnlineRooms(msg.rooms || []);
        return;
      }

      if (type === 'room_state') {
        app.setOnlineFeedback('');
        renderRoomWithSide(msg.room || null);
        if (
          currentRoom &&
          currentRoom.status === 'waiting' &&
          mySide === 'red' &&
          currentRoom.players?.red?.ready &&
          currentRoom.players?.blue?.ready &&
          !autoStartPending
        ) {
          autoStartPending = true;
          sendWs({ type: 'start_match', roomId: currentRoom.id });
        }
        return;
      }

      if (type === 'room_chat') {
        if (msg.room) {
          renderRoomWithSide(msg.room);
        }
        return;
      }

      if (type === 'match_started') {
        autoStartPending = false;
        currentRoom = msg.room || currentRoom;
        mySide = resolveMySide(currentRoom);
        lastShooterWasMe = false;
        app.setOnlineFeedback('');

        const initialTurn = msg.initialTurn || currentRoom?.currentTurn || 'red';
        const isMyTurn = mySide === initialTurn;
        app.startOnlineMatch({
          playerSide: mySide,
          roomCode: msg.roomCode || currentRoom?.code || null,
          goalLimit: msg.goalLimit ?? currentRoom?.goalLimit ?? 5,
          initialTurn,
          teams: msg.teams || currentRoom?.teams,
          turnLocked: !isMyTurn,
          turnLockLabel: isMyTurn ? '' : '⏳ Vez do adversário...',
        });
        return;
      }

      if (type === 'game_shot') {
        lastShooterWasMe = false;
        app.setTurnLock(true, '⏳ Jogada do adversário...');
        app.applyRemoteShot(msg);
        return;
      }

      if (type === 'state_sync') {
        if (msg.room) {
          currentRoom = msg.room;
          mySide = resolveMySide(currentRoom);
        }
        app.applyRemoteStateSync(msg.snapshot);
        if (msg.snapshot?.isMatchFinished) {
          app.setTurnLock(true, '🏁 Partida encerrada');
        } else if (msg.snapshot?.currentTurn === mySide) {
          app.setTurnLock(false);
        } else {
          app.setTurnLock(true, '⏳ Aguardando adversário...');
        }
        return;
      }

      if (type === 'match_ended') {
        if (currentRoom) {
          currentRoom = { ...currentRoom, status: 'finished' };
        }
        refreshCurrentUser();
        refreshLeaderboard();
        app.showMatchOver({
          winnerSide: msg.winnerSide,
          redName: msg.redName || app.getTeamName('red'),
          blueName: msg.blueName || app.getTeamName('blue'),
          scoreRed: msg.scoreRed ?? 0,
          scoreBlue: msg.scoreBlue ?? 0,
          goalLimit: msg.goalLimit ?? 5,
          savedToProfile: true,
          isOnline: true,
          reason: msg.reason || 'goal_limit',
        });
        return;
      }

      if (type === 'opponent_disconnected') {
        app.setOnlineFeedback(
          msg.message || 'O adversário desconectou. Vitória por W.O.!',
          'success'
        );
        return;
      }

      if (type === 'error') {
        autoStartPending = false;
        const message = msg.error || 'Erro ao comunicar com o servidor.';
        app.setOnlineFeedback(message, 'error');
        if (msg.code === 'AUTH_REQUIRED') {
          app.setAccountFeedback(message, 'error');
          app.setActiveTab('account');
        }
      }
    });

    ws.addEventListener('close', () => {
      clearHeartbeat();
      ws = null;
      if (onlineAvailable && !isDisposed) {
        app.setOnlineState({
          connected: true,
          connecting: true,
          label: 'Reconectando...',
          serverInfo: 'Conexão WebSocket perdida. Reconectando...',
          account: currentUser,
        });
        scheduleReconnect();
      }
    });
  }

  function requireOnlineAuth() {
    if (currentUser) return true;
    const msg = 'Entre ou crie uma conta online antes de jogar em salas multiplayer.';
    app.setOnlineFeedback(msg, 'error');
    app.setAccountFeedback(msg, 'error');
    app.setActiveTab('account');
    return false;
  }

  // Assina eventos de autenticação do UIController
  app.on('authSubmit', async ({ action, payload } = {}) => {
    if (!onlineAvailable) return;

    try {
      if (action === 'login') {
        const res = await fetchJson('/api/auth/login', {
          method: 'POST',
          body: payload,
        });
        if (!res.ok) {
          app.setAccountFeedback(res.data?.error || 'Falha ao entrar.', 'error');
          return;
        }
        token = res.data.token;
        currentUser = res.data.user;
        saveStoredToken(token);
        const pwInput = document.getElementById('input-login-password');
        if (pwInput) pwInput.value = '';

        app.setOnlineState({
          connected: true,
          connecting: false,
          label: 'Conectado',
          serverInfo: 'Servidor Multiplayer Ativo',
          account: currentUser,
        });
        sendWs({ type: 'auth', token });
        await refreshLeaderboard();
        app.setAccountFeedback(`Bem-vindo de volta, ${currentUser.displayName}!`, 'success');
        app.setOnlineFeedback('');
        return;
      }

      if (action === 'register') {
        const res = await fetchJson('/api/auth/register', {
          method: 'POST',
          body: payload,
        });
        if (!res.ok) {
          app.setAccountFeedback(res.data?.error || 'Falha ao cadastrar.', 'error');
          return;
        }
        token = res.data.token;
        currentUser = res.data.user;
        saveStoredToken(token);
        const pwInput = document.getElementById('input-reg-password');
        if (pwInput) pwInput.value = '';

        app.setOnlineState({
          connected: true,
          connecting: false,
          label: 'Conectado',
          serverInfo: 'Servidor Multiplayer Ativo',
          account: currentUser,
        });
        sendWs({ type: 'auth', token });
        await refreshLeaderboard();
        app.setAccountFeedback(
          `Conta online "${currentUser.username}" criada com sucesso!`,
          'success'
        );
        app.setOnlineFeedback('');
        return;
      }

      if (action === 'logout') {
        const activeToken = token;
        token = '';
        saveStoredToken('');
        currentUser = null;
        if (currentRoom) {
          sendWs({ type: 'leave_room' });
        }
        renderRoomWithSide(null);
        sendWs({ type: 'auth', token: '' });
        if (activeToken) {
          await fetchJson('/api/auth/logout', {
            method: 'POST',
            token: activeToken,
            body: { token: activeToken },
          }).catch(() => {});
        }
        app.setOnlineState({
          connected: true,
          connecting: false,
          label: 'Conectado',
          serverInfo: 'Servidor Multiplayer Ativo',
          account: null,
        });
        await refreshLeaderboard();
        return;
      }

      if (action === 'updateProfile') {
        if (!token) {
          app.setAccountFeedback('Sessão expirada. Entre novamente.', 'error');
          return;
        }
        const res = await fetchJson('/api/profile', {
          method: 'PUT',
          token,
          body: payload,
        });
        if (!res.ok) {
          app.setAccountFeedback(res.data?.error || 'Falha ao atualizar perfil.', 'error');
          return;
        }
        currentUser = res.data.user;
        app.setOnlineState({
          connected: true,
          connecting: false,
          label: 'Conectado',
          serverInfo: 'Servidor Multiplayer Ativo',
          account: currentUser,
        });
        await refreshLeaderboard();
        app.setAccountFeedback('Perfil online atualizado!', 'success');
      }
    } catch (err) {
      app.setAccountFeedback('Erro de rede ao comunicar com o servidor.', 'error');
    }
  });

  // Assina ações de lobby e sala online
  app.on('roomAction', ({ action, payload } = {}) => {
    if (action === 'copyCode') {
      if (payload?.code) {
        app.setOnlineFeedback(`Código ${payload.code} copiado!`, 'success');
      }
      return;
    }

    if (!onlineAvailable) {
      app.setOnlineFeedback(
        'Servidor offline. Execute "npm start" na pasta jogo_fubetol para jogar online.',
        'error'
      );
      return;
    }

    if (action === 'refreshRooms') {
      refreshPublicRooms();
      return;
    }

    if (action === 'leaveRoom') {
      sendWs({ type: 'leave_room' });
      renderRoomWithSide(null);
      app.setOnlineFeedback('');
      return;
    }

    if (!requireOnlineAuth()) return;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      app.setOnlineFeedback('Conexão WebSocket ainda está estabelecendo. Tente novamente.', 'error');
      connectWebSocket();
      return;
    }

    if (action === 'createRoom') {
      app.setOnlineFeedback('');
      sendWs({
        type: 'create_room',
        name: payload?.name || '',
        isPrivate: payload?.visibility === 'private',
        goalLimit: payload?.goalLimit ?? 5,
      });
      return;
    }

    if (action === 'joinRoom') {
      app.setOnlineFeedback('');
      sendWs({
        type: 'join_room',
        code: payload?.code || '',
        roomId: payload?.roomId || null,
      });
      return;
    }

    if (action === 'updateTeam') {
      if (!currentRoom) return;
      sendWs({
        type: 'update_team',
        roomId: currentRoom.id,
        colorId: payload?.colorId,
        teamName: payload?.teamName,
      });
      return;
    }

    if (action === 'toggleReady') {
      if (!currentRoom) return;
      const blueReady = Boolean(currentRoom.players?.blue?.ready);
      const redReady = Boolean(currentRoom.players?.red?.ready);
      if (mySide === 'red' && blueReady && !redReady) {
        autoStartPending = true;
        sendWs({ type: 'start_match', roomId: currentRoom.id });
      } else {
        sendWs({ type: 'toggle_ready', roomId: currentRoom.id });
      }
      return;
    }

    if (action === 'sendChat') {
      if (!currentRoom || !payload?.text) return;
      sendWs({
        type: 'room_chat',
        roomId: currentRoom.id,
        text: payload.text,
      });
      return;
    }

    if (action === 'rematch') {
      if (!currentRoom) return;
      sendWs({ type: 'rematch_request', roomId: currentRoom.id });
      app.setTurnLock(true, '⏳ Aguardando adversário aceitar revanche...');
      return;
    }

    if (action === 'requestReset') {
      app.setOnlineFeedback(
        'Em partidas online, aguarde o fim da partida para pedir revanche ou clique em Sair.',
        'error'
      );
    }
  });

  // Assina disparos e estabilização de turno para sincronizar com o servidor
  app.on('shot', (payload) => {
    if (!onlineAvailable || !currentRoom || currentRoom.status !== 'playing') return;
    if (!mySide || payload?.side !== mySide) return;

    lastShooterWasMe = true;
    app.setTurnLock(true, '⏳ Sincronizando jogada...');
    sendWs({
      type: 'game_shot',
      roomId: currentRoom.id,
      side: payload.side,
      pieceIndex: payload.pieceIndex,
      pieceNumber: payload.pieceNumber,
      pieceType: payload.pieceType,
      vx: payload.vx,
      vz: payload.vz,
      powerRatio: payload.powerRatio,
    });
  });

  app.on('turnSettled', ({ nextTurn, snapshot } = {}) => {
    if (!onlineAvailable || !currentRoom || currentRoom.status !== 'playing') return;
    if (!lastShooterWasMe) return;

    lastShooterWasMe = false;
    sendWs({
      type: 'turn_settled',
      roomId: currentRoom.id,
      snapshot: {
        ...(snapshot || {}),
        nextTurn: nextTurn || snapshot?.currentTurn,
      },
    });
  });

  async function checkHealthWithRetry() {
    const { isRemote, timeoutMs, maxAttempts, retryDelayMs } = getHealthCheckConfig(window.location);

    if (isRemote) {
      app.setOnlineState({
        connected: false,
        connecting: true,
        label: 'Conectando...',
        serverInfo: 'Acordando servidor online (Render)...',
        account: null,
      });
    }

    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (isDisposed) return null;
      try {
        const health = await fetchJson('/api/health', { timeoutMs });
        if (health.ok && health.data?.ok) {
          return health;
        }
        const shouldRetry = isRemote && attempt < maxAttempts && health.status >= 500;
        if (!shouldRetry) {
          return health;
        }
      } catch (err) {
        lastError = err;
        if (attempt >= maxAttempts) {
          throw err;
        }
      }

      if (attempt < maxAttempts && retryDelayMs > 0) {
        app.setOnlineState({
          connected: false,
          connecting: true,
          label: 'Conectando...',
          serverInfo: 'Servidor acordando do spin-down... tentando novamente...',
          account: null,
        });
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    if (lastError) throw lastError;
    return null;
  }

  async function bootstrap() {
    if (window.location.protocol === 'file:') {
      app.setOnlineState({
        connected: false,
        connecting: false,
        label: 'Modo Offline',
        serverInfo: 'Aberto via arquivo local (file://) · Modos locais ativos',
        account: null,
      });
      return;
    }

    try {
      const health = await checkHealthWithRetry();
      if (isDisposed) return;
      if (!health?.ok || !health.data?.ok) {
        app.setOnlineState({
          connected: false,
          connecting: false,
          label: 'Modo Offline',
          serverInfo: 'Servidor Node.js não conectado (modo offline ativo)',
          account: null,
        });
        return;
      }

      onlineAvailable = true;
      await refreshCurrentUser();
      await Promise.all([refreshLeaderboard(), refreshPublicRooms()]);
      app.setOnlineState({
        connected: true,
        connecting: false,
        label: 'Conectado',
        serverInfo: 'Servidor Multiplayer Ativo',
        account: currentUser,
      });
      connectWebSocket();
    } catch (err) {
      onlineAvailable = false;
      app.setOnlineState({
        connected: false,
        connecting: false,
        label: 'Modo Offline',
        serverInfo: 'Servidor Node.js não conectado (modo offline ativo)',
        account: null,
      });
    }
  }

  bootstrap();

  return {
    isOnlineAvailable: () => onlineAvailable,
    refreshPublicRooms,
    refreshLeaderboard,
    dispose: () => {
      isDisposed = true;
      clearHeartbeat();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close();
        } catch (err) {}
      }
    },
  };
}
