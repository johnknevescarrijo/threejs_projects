import { COLOR_ORDER, TEAM_COLORS, getColorPalette } from './teamColors.js';
import { formatGoalLimitLabel } from './matchRules.js';
import {
  registerLocalAccount,
  loginLocalAccount,
  logoutLocalAccount,
  getCurrentLocalAccount,
  updateLocalProfile,
  getLocalLeaderboard,
} from './localProfile.js';

function getInitials(name) {
  const clean = typeof name === 'string' ? name.trim() : '';
  if (!clean) return 'CV';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function createFavoriteColorSwatches(container, selectedColorId, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  COLOR_ORDER.forEach((colorId) => {
    const palette = TEAM_COLORS[colorId];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch';
    if (colorId === selectedColorId) {
      btn.classList.add('active');
    }
    btn.dataset.color = colorId;
    btn.setAttribute('aria-pressed', String(colorId === selectedColorId));

    const disc = document.createElement('span');
    disc.className = 'swatch-disc';
    disc.style.background = palette.pieceHex;
    disc.style.border = `2px solid ${palette.rimHex}`;

    const label = document.createElement('span');
    label.textContent = palette.name;

    btn.appendChild(disc);
    btn.appendChild(label);
    btn.addEventListener('click', () => onSelect(colorId));
    container.appendChild(btn);
  });
}

export function createUIController({
  emit,
  onUseProfileTeam,
  onPlayAgain,
  onRestartFromMenu,
} = {}) {
  const safeEmit = typeof emit === 'function' ? emit : () => {};

  const els = {
    overlay: document.getElementById('mode-modal-overlay'),
    btnClose: document.getElementById('btn-modal-close'),
    btnResume: document.getElementById('btn-modal-resume'),
    headerProfileChip: document.getElementById('header-profile-chip'),
    headerAvatar: document.getElementById('header-profile-avatar'),
    headerName: document.getElementById('header-profile-name'),
    headerBadge: document.getElementById('header-online-badge'),
    tabs: Array.from(document.querySelectorAll('.menu-tab')),
    panels: Array.from(document.querySelectorAll('.tab-panel')),

    // Aba 1: Jogar
    playDotRed: document.getElementById('play-preview-dot-red'),
    playNameRed: document.getElementById('play-preview-name-red'),
    playDotBlue: document.getElementById('play-preview-dot-blue'),
    playNameBlue: document.getElementById('play-preview-name-blue'),
    btnGotoTeams: document.getElementById('btn-goto-teams'),

    // Aba 2: Cores & Times preview
    previewDiscRed: document.getElementById('preview-disc-red'),
    previewDiscInnerRed: document.getElementById('preview-disc-inner-red'),
    previewGkRed: document.getElementById('preview-gk-red'),
    previewTitleRed: document.getElementById('preview-title-red'),
    previewDiscBlue: document.getElementById('preview-disc-blue'),
    previewDiscInnerBlue: document.getElementById('preview-disc-inner-blue'),
    previewGkBlue: document.getElementById('preview-gk-blue'),
    previewTitleBlue: document.getElementById('preview-title-blue'),
    customDotRed: document.getElementById('custom-dot-red'),
    customDotBlue: document.getElementById('custom-dot-blue'),

    // Aba 3: Multiplayer Online
    onlineStatusPill: document.getElementById('online-status-pill'),
    onlineServerInfo: document.getElementById('online-server-info'),
    onlineOfflineBanner: document.getElementById('online-offline-banner'),
    onlineLobbyView: document.getElementById('online-lobby-view'),
    onlineRoomPanel: document.getElementById('online-room-panel'),
    formCreateRoom: document.getElementById('form-create-room'),
    inputRoomName: document.getElementById('input-room-name'),
    selectRoomVisibility: document.getElementById('select-room-visibility'),
    selectRoomGoalLimit: document.getElementById('select-room-goal-limit'),
    formJoinCode: document.getElementById('form-join-code'),
    inputRoomCode: document.getElementById('input-room-code'),
    btnRefreshRooms: document.getElementById('btn-refresh-rooms'),
    onlineRoomsList: document.getElementById('online-rooms-list'),
    roomTitleDisplay: document.getElementById('room-title-display'),
    roomCodeDisplay: document.getElementById('room-code-display'),
    btnCopyRoomCode: document.getElementById('btn-copy-room-code'),
    btnLeaveRoom: document.getElementById('btn-leave-room'),
    roomSlotRed: document.getElementById('room-slot-red'),
    roomSlotBlue: document.getElementById('room-slot-blue'),
    btnRoomReady: document.getElementById('btn-room-ready'),
    roomChatFeed: document.getElementById('room-chat-feed'),
    formRoomChat: document.getElementById('form-room-chat'),
    inputRoomChat: document.getElementById('input-room-chat'),

    // Aba 4: Conta & Ranking
    accountModeBadge: document.getElementById('account-mode-badge'),
    accountFeedback: document.getElementById('account-feedback'),
    accountAuthView: document.getElementById('account-auth-view'),
    accountProfileView: document.getElementById('account-profile-view'),
    btnAuthModeLogin: document.getElementById('btn-auth-mode-login'),
    btnAuthModeRegister: document.getElementById('btn-auth-mode-register'),
    formLocalLogin: document.getElementById('form-local-login'),
    inputLoginUsername: document.getElementById('input-login-username'),
    inputLoginPassword: document.getElementById('input-login-password'),
    formLocalRegister: document.getElementById('form-local-register'),
    inputRegUsername: document.getElementById('input-reg-username'),
    inputRegDisplayName: document.getElementById('input-reg-displayname'),
    inputRegPassword: document.getElementById('input-reg-password'),
    inputRegTeamName: document.getElementById('input-reg-teamname'),
    regFavoriteColorSwatches: document.getElementById('reg-favorite-color-swatches'),
    btnContinueGuest: document.getElementById('btn-continue-guest'),
    profileAvatar: document.getElementById('profile-avatar'),
    profileDisplayName: document.getElementById('profile-displayname'),
    profileUsername: document.getElementById('profile-username'),
    profileModeTag: document.getElementById('profile-mode-tag'),
    btnLogout: document.getElementById('btn-logout'),
    formProfileEdit: document.getElementById('form-profile-edit'),
    inputProfileDisplayName: document.getElementById('input-profile-displayname'),
    inputProfileTeamName: document.getElementById('input-profile-teamname'),
    profileColorSwatches: document.getElementById('profile-color-swatches'),
    btnApplyProfileTeam: document.getElementById('btn-apply-profile-team'),
    statMatches: document.getElementById('stat-matches'),
    statWins: document.getElementById('stat-wins'),
    statGoalsFor: document.getElementById('stat-goals-for'),
    statWinrate: document.getElementById('stat-winrate'),
    statPoints: document.getElementById('stat-points'),
    profileHistoryList: document.getElementById('profile-history-list'),
    leaderboardSubtitle: document.getElementById('leaderboard-subtitle'),
    leaderboardBody: document.getElementById('leaderboard-body'),

    // HUD & Fim de Partida
    hudMatchBadge: document.getElementById('hud-match-badge'),
    hudGoalLimit: document.getElementById('hud-goal-limit'),
    powerMeter: document.getElementById('power-meter'),
    powerMeterValue: document.getElementById('power-meter-value'),
    powerMeterFill: document.getElementById('power-meter-fill'),
    matchOverOverlay: document.getElementById('match-over-overlay'),
    matchOverBadge: document.getElementById('match-over-badge'),
    matchOverTitle: document.getElementById('match-over-title'),
    matchOverSubtitle: document.getElementById('match-over-subtitle'),
    matchOverNameRed: document.getElementById('match-over-name-red'),
    matchOverNameBlue: document.getElementById('match-over-name-blue'),
    matchOverScore: document.getElementById('match-over-score'),
    matchOverSummary: document.getElementById('match-over-summary'),
    btnRematch: document.getElementById('btn-rematch'),
    btnGameoverMenu: document.getElementById('btn-gameover-menu'),
  };

  let activeTab = 'play';
  let hasActiveMatch = false;
  let regSelectedColor = 'green';
  let profileSelectedColor = 'blue';
  let onlineState = {
    connected: false,
    connecting: false,
    label: 'Modo Offline',
    serverInfo: 'Servidor Node.js não conectado',
    account: null,
  };
  let currentRoom = null;

  function setActiveTab(tabName = 'play') {
    const validTabs = ['play', 'teams', 'online', 'account'];
    activeTab = validTabs.includes(tabName) ? tabName : 'play';

    els.tabs.forEach((btn) => {
      const isSelected = btn.dataset.tab === activeTab;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', String(isSelected));
    });

    els.panels.forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.tabPanel === activeTab);
    });
  }

  function openMenu(tabName) {
    if (tabName) {
      setActiveTab(tabName);
    }
    if (els.btnClose) {
      els.btnClose.style.display = hasActiveMatch ? 'inline-flex' : 'none';
    }
    if (els.btnResume) {
      els.btnResume.style.display = hasActiveMatch ? 'inline-flex' : 'none';
    }
    refreshAccountView();
    if (els.overlay) {
      els.overlay.classList.add('active');
    }
  }

  function closeMenu() {
    hasActiveMatch = true;
    if (els.overlay) {
      els.overlay.classList.remove('active');
    }
  }

  function markMatchStarted() {
    hasActiveMatch = true;
  }

  function setAccountFeedback(message = '', type = '') {
    if (!els.accountFeedback) return;
    els.accountFeedback.className = 'feedback-banner';
    if (!message) {
      els.accountFeedback.textContent = '';
      return;
    }
    els.accountFeedback.classList.add(type === 'success' ? 'success' : 'error');
    els.accountFeedback.textContent = message;
  }

  function getActiveAccount() {
    if (onlineState.connected && onlineState.account) {
      return onlineState.account;
    }
    return getCurrentLocalAccount();
  }

  function updateHeaderProfileChip() {
    const account = getActiveAccount();
    if (els.headerAvatar) {
      if (account) {
        const palette = getColorPalette(account.favoriteColor, 'blue');
        els.headerAvatar.textContent = getInitials(account.displayName || account.username);
        els.headerAvatar.style.background = palette.pieceHex;
        els.headerAvatar.style.color = palette.numberColor;
      } else {
        els.headerAvatar.textContent = 'CV';
        els.headerAvatar.style.background = '#334155';
        els.headerAvatar.style.color = '#f8fafc';
      }
    }
    if (els.headerName) {
      els.headerName.textContent = account ? account.displayName || account.username : 'Convidado';
    }
    if (els.headerBadge) {
      els.headerBadge.className = 'status-badge';
      if (onlineState.connected) {
        els.headerBadge.classList.add('online');
        els.headerBadge.textContent = 'Online';
      } else if (onlineState.connecting) {
        els.headerBadge.classList.add('connecting');
        els.headerBadge.textContent = 'Conectando';
      } else {
        els.headerBadge.textContent = 'Offline';
      }
    }
  }

  function updateHUDMeta({ gameMode, goalLimit, onlineRoomCode } = {}) {
    const account = getActiveAccount();
    const userLabel = account ? account.displayName || account.username : 'Convidado';
    if (els.hudMatchBadge) {
      if (gameMode === 'online') {
        els.hudMatchBadge.textContent = onlineRoomCode
          ? `Online · Sala ${onlineRoomCode}`
          : 'Partida Online';
      } else if (gameMode === 'pvp') {
        els.hudMatchBadge.textContent = `2P Local · ${userLabel}`;
      } else if (gameMode === 'eve') {
        els.hudMatchBadge.textContent = 'Bot vs Bot · Espectador';
      } else {
        els.hudMatchBadge.textContent = `1P vs Bot · ${userLabel}`;
      }
    }

    if (els.hudGoalLimit) {
      els.hudGoalLimit.textContent = `Meta: ${formatGoalLimitLabel(goalLimit, { short: true })}`;
    }
  }

  function updateTeamPreviews(redPalette, bluePalette, redName, blueName) {
    if (els.playDotRed) {
      els.playDotRed.style.background = redPalette.cssPrimary;
      els.playDotRed.style.boxShadow = `0 0 10px ${redPalette.cssGlow}`;
    }
    if (els.playNameRed) els.playNameRed.textContent = redName;
    if (els.playDotBlue) {
      els.playDotBlue.style.background = bluePalette.cssPrimary;
      els.playDotBlue.style.boxShadow = `0 0 10px ${bluePalette.cssGlow}`;
    }
    if (els.playNameBlue) els.playNameBlue.textContent = blueName;

    if (els.customDotRed) {
      els.customDotRed.style.background = redPalette.cssPrimary;
      els.customDotRed.style.boxShadow = `0 0 10px ${redPalette.cssGlow}`;
    }
    if (els.customDotBlue) {
      els.customDotBlue.style.background = bluePalette.cssPrimary;
      els.customDotBlue.style.boxShadow = `0 0 10px ${bluePalette.cssGlow}`;
    }

    // Mini peças na Aba 2
    if (els.previewDiscRed && els.previewDiscInnerRed) {
      els.previewDiscRed.style.background = redPalette.pieceHex;
      els.previewDiscRed.style.border = `3px solid ${redPalette.rimHex}`;
      els.previewDiscInnerRed.style.borderColor = redPalette.ringHex;
      els.previewDiscInnerRed.style.background = redPalette.stickerBg;
      els.previewDiscInnerRed.style.color = redPalette.numberColor;
    }
    if (els.previewGkRed) {
      els.previewGkRed.style.background = redPalette.gkHex;
      els.previewGkRed.style.color = redPalette.numberColor;
    }
    if (els.previewTitleRed) els.previewTitleRed.textContent = redName;

    if (els.previewDiscBlue && els.previewDiscInnerBlue) {
      els.previewDiscBlue.style.background = bluePalette.pieceHex;
      els.previewDiscBlue.style.border = `3px solid ${bluePalette.rimHex}`;
      els.previewDiscInnerBlue.style.borderColor = bluePalette.ringHex;
      els.previewDiscInnerBlue.style.background = bluePalette.stickerBg;
      els.previewDiscInnerBlue.style.color = bluePalette.numberColor;
    }
    if (els.previewGkBlue) {
      els.previewGkBlue.style.background = bluePalette.gkHex;
      els.previewGkBlue.style.color = bluePalette.numberColor;
    }
    if (els.previewTitleBlue) els.previewTitleBlue.textContent = blueName;
  }

  function renderProfileHistory(history) {
    if (!els.profileHistoryList) return;
    els.profileHistoryList.innerHTML = '';

    if (!Array.isArray(history) || history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Nenhuma partida registrada ainda. Conclua uma partida para gerar histórico!';
      els.profileHistoryList.appendChild(empty);
      return;
    }

    history.slice(0, 10).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'history-item';

      const left = document.createElement('div');
      const opponent = document.createElement('strong');
      opponent.textContent = `vs ${item.opponentName || 'Adversário'}`;
      const meta = document.createElement('span');
      meta.style.color = 'var(--text-muted)';
      meta.style.marginLeft = '8px';
      meta.textContent = `${item.goalsFor} x ${item.goalsAgainst}`;
      left.appendChild(opponent);
      left.appendChild(meta);

      const pill = document.createElement('span');
      const outcome = item.outcome === 'win' ? 'win' : item.outcome === 'draw' ? 'draw' : 'loss';
      pill.className = `outcome-pill ${outcome}`;
      pill.textContent = outcome === 'win' ? 'Vitória' : outcome === 'draw' ? 'Empate' : 'Derrota';

      row.appendChild(left);
      row.appendChild(pill);
      els.profileHistoryList.appendChild(row);
    });
  }

  function renderLeaderboard(entries, { isOnline = false } = {}) {
    if (els.leaderboardSubtitle) {
      els.leaderboardSubtitle.textContent = isOnline ? 'Ranking Global Online' : 'Ranking Local';
    }
    if (!els.leaderboardBody) return;
    els.leaderboardBody.innerHTML = '';

    const list = Array.isArray(entries) ? entries : [];
    if (list.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.style.textAlign = 'center';
      td.style.color = 'var(--text-muted)';
      td.style.padding = '14px';
      td.textContent = 'Crie uma conta e jogue partidas para aparecer no ranking.';
      tr.appendChild(td);
      els.leaderboardBody.appendChild(tr);
      return;
    }

    list.slice(0, 15).forEach((entry, idx) => {
      const tr = document.createElement('tr');
      const palette = getColorPalette(entry.favoriteColor, 'blue');

      const tdPos = document.createElement('td');
      tdPos.textContent = `#${idx + 1}`;

      const tdPlayer = document.createElement('td');
      const playerWrap = document.createElement('span');
      playerWrap.style.display = 'inline-flex';
      playerWrap.style.alignItems = 'center';
      playerWrap.style.gap = '6px';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.width = '10px';
      dot.style.height = '10px';
      dot.style.background = palette.pieceHex;
      const nameSpan = document.createElement('span');
      nameSpan.textContent = entry.displayName || entry.username;
      playerWrap.appendChild(dot);
      playerWrap.appendChild(nameSpan);
      tdPlayer.appendChild(playerWrap);

      const tdMatches = document.createElement('td');
      tdMatches.textContent = String(entry.matches ?? 0);

      const tdWins = document.createElement('td');
      tdWins.textContent = String(entry.wins ?? 0);

      const tdGd = document.createElement('td');
      const gd = Number(entry.goalDiff ?? (entry.goalsFor ?? 0) - (entry.goalsAgainst ?? 0));
      tdGd.textContent = gd > 0 ? `+${gd}` : String(gd);

      const tdPts = document.createElement('td');
      const strongPts = document.createElement('strong');
      strongPts.textContent = String(entry.points ?? 0);
      tdPts.appendChild(strongPts);

      tr.appendChild(tdPos);
      tr.appendChild(tdPlayer);
      tr.appendChild(tdMatches);
      tr.appendChild(tdWins);
      tr.appendChild(tdGd);
      tr.appendChild(tdPts);
      els.leaderboardBody.appendChild(tr);
    });
  }

  function refreshAccountView() {
    const account = getActiveAccount();
    updateHeaderProfileChip();

    if (els.accountModeBadge) {
      els.accountModeBadge.className = 'status-badge';
      if (onlineState.connected) {
        els.accountModeBadge.classList.add('online');
        els.accountModeBadge.textContent = 'Conta Online';
      } else {
        els.accountModeBadge.textContent = 'Conta Local (Offline)';
      }
    }

    if (account) {
      if (els.accountAuthView) els.accountAuthView.style.display = 'none';
      if (els.accountProfileView) els.accountProfileView.style.display = 'block';

      const palette = getColorPalette(account.favoriteColor, 'blue');
      profileSelectedColor = palette.id;

      if (els.profileAvatar) {
        els.profileAvatar.textContent = getInitials(account.displayName || account.username);
        els.profileAvatar.style.background = palette.pieceHex;
        els.profileAvatar.style.color = palette.numberColor;
      }
      if (els.profileDisplayName) {
        els.profileDisplayName.textContent = account.displayName || account.username;
      }
      if (els.profileUsername) {
        els.profileUsername.textContent = `@${account.username}`;
      }
      if (els.profileModeTag) {
        els.profileModeTag.textContent = account.offline !== false && !onlineState.connected ? 'Offline' : 'Online';
      }
      if (els.inputProfileDisplayName) {
        els.inputProfileDisplayName.value = account.displayName || account.username;
      }
      if (els.inputProfileTeamName) {
        els.inputProfileTeamName.value = account.defaultTeamName || palette.defaultTeamName;
      }

      refreshProfileColorPicker();

      const stats = account.stats || {};
      if (els.statMatches) els.statMatches.textContent = String(stats.matches ?? 0);
      if (els.statWins) els.statWins.textContent = String(stats.wins ?? 0);
      if (els.statGoalsFor) els.statGoalsFor.textContent = String(stats.goalsFor ?? 0);
      if (els.statWinrate) els.statWinrate.textContent = `${stats.winRate ?? 0}%`;
      if (els.statPoints) els.statPoints.textContent = String(stats.points ?? 0);

      renderProfileHistory(account.history || []);
    } else {
      if (els.accountAuthView) els.accountAuthView.style.display = 'block';
      if (els.accountProfileView) els.accountProfileView.style.display = 'none';
    }

    if (!onlineState.connected) {
      renderLeaderboard(getLocalLeaderboard(), { isOnline: false });
    }
  }

  function refreshProfileColorPicker() {
    createFavoriteColorSwatches(els.profileColorSwatches, profileSelectedColor, (colorId) => {
      profileSelectedColor = colorId;
      refreshProfileColorPicker();
    });
  }

  function refreshRegColorPicker() {
    createFavoriteColorSwatches(els.regFavoriteColorSwatches, regSelectedColor, (colorId) => {
      regSelectedColor = colorId;
      refreshRegColorPicker();
    });
  }

  function setOnlineState(nextState = {}) {
    onlineState = {
      ...onlineState,
      ...nextState,
    };

    if (els.onlineStatusPill) {
      els.onlineStatusPill.className = 'status-badge';
      if (onlineState.connected) {
        els.onlineStatusPill.classList.add('online');
        els.onlineStatusPill.textContent = onlineState.label || 'Conectado';
      } else if (onlineState.connecting) {
        els.onlineStatusPill.classList.add('connecting');
        els.onlineStatusPill.textContent = onlineState.label || 'Conectando...';
      } else {
        els.onlineStatusPill.textContent = onlineState.label || 'Modo Offline';
      }
    }

    if (els.onlineServerInfo) {
      els.onlineServerInfo.textContent =
        onlineState.serverInfo ||
        (onlineState.connected ? 'Servidor multiplayer ativo' : 'Servidor Node.js não conectado');
    }

    if (els.onlineOfflineBanner) {
      els.onlineOfflineBanner.style.display = onlineState.connected ? 'none' : 'block';
    }

    refreshAccountView();
  }

  function renderOnlineRooms(rooms) {
    if (!els.onlineRoomsList) return;
    els.onlineRoomsList.innerHTML = '';

    const list = Array.isArray(rooms) ? rooms : [];
    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = onlineState.connected
        ? 'Nenhuma sala pública aberta no momento. Crie uma nova sala!'
        : 'Conecte-se ao servidor online (npm start) para listar e entrar em salas ao vivo.';
      els.onlineRoomsList.appendChild(empty);
      return;
    }

    list.forEach((room) => {
      const row = document.createElement('div');
      row.className = 'room-row';

      const info = document.createElement('div');
      info.className = 'room-row-info';
      const title = document.createElement('strong');
      title.textContent = room.name || `Sala ${room.code}`;
      const sub = document.createElement('span');
      const count = `${room.playerCount ?? 1}/2 jogadores`;
      const goalTxt = formatGoalLimitLabel(room.goalLimit, { short: true });
      sub.textContent = `Código ${room.code} · ${count} · ${goalTxt}`;
      info.appendChild(title);
      info.appendChild(sub);

      const joinBtn = document.createElement('button');
      joinBtn.type = 'button';
      joinBtn.className = 'btn-link-subtle';
      joinBtn.textContent = 'Entrar';
      joinBtn.addEventListener('click', () => {
        safeEmit('roomAction', { action: 'joinRoom', payload: { code: room.code } });
      });

      row.appendChild(info);
      row.appendChild(joinBtn);
      els.onlineRoomsList.appendChild(row);
    });
  }

  function renderRoomSlot(slotEl, playerData, sideLabel) {
    if (!slotEl) return;
    slotEl.innerHTML = '';

    const left = document.createElement('div');
    const nameEl = document.createElement('strong');
    nameEl.style.display = 'block';
    nameEl.style.fontSize = '13px';
    nameEl.textContent = playerData ? playerData.displayName || playerData.username : `Aguardando ${sideLabel}...`;

    const subEl = document.createElement('span');
    subEl.style.fontSize = '11px';
    subEl.style.color = 'var(--text-muted)';
    subEl.textContent = playerData
      ? `${playerData.teamName || sideLabel} (${getColorPalette(playerData.colorId, 'red').name})`
      : 'Vaga aberta';

    left.appendChild(nameEl);
    left.appendChild(subEl);

    const badge = document.createElement('span');
    badge.className = 'status-badge';
    if (playerData?.ready) {
      badge.classList.add('online');
      badge.textContent = 'Pronto';
    } else if (playerData) {
      badge.textContent = 'Preparando';
    } else {
      badge.textContent = 'Livre';
    }

    slotEl.appendChild(left);
    slotEl.appendChild(badge);
  }

  function renderOnlineRoom(room) {
    currentRoom = room || null;
    if (!room) {
      if (els.onlineLobbyView) els.onlineLobbyView.style.display = 'block';
      if (els.onlineRoomPanel) els.onlineRoomPanel.style.display = 'none';
      return;
    }

    if (els.onlineLobbyView) els.onlineLobbyView.style.display = 'none';
    if (els.onlineRoomPanel) els.onlineRoomPanel.style.display = 'block';

    if (els.roomTitleDisplay) {
      els.roomTitleDisplay.textContent = room.name || `Sala ${room.code}`;
    }
    if (els.roomCodeDisplay) {
      els.roomCodeDisplay.textContent = room.code || '------';
    }

    const players = room.players || {};
    renderRoomSlot(els.roomSlotRed, players.red || room.host || null, 'Time 1');
    renderRoomSlot(els.roomSlotBlue, players.blue || room.guest || null, 'Time 2');

    if (Array.isArray(room.messages) && els.roomChatFeed) {
      els.roomChatFeed.innerHTML = '';
      room.messages.slice(-30).forEach((msg) => {
        const line = document.createElement('div');
        const sender = document.createElement('strong');
        sender.textContent = `${msg.sender || 'Sistema'}: `;
        const body = document.createElement('span');
        body.textContent = msg.text || '';
        line.appendChild(sender);
        line.appendChild(body);
        els.roomChatFeed.appendChild(line);
      });
      els.roomChatFeed.scrollTop = els.roomChatFeed.scrollHeight;
    }
  }

  function setPowerMeter(ratio = 0, visible = false) {
    if (!els.powerMeter) return;
    els.powerMeter.classList.toggle('visible', Boolean(visible));
    const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
    const pct = Math.round(clamped * 100);
    if (els.powerMeterValue) els.powerMeterValue.textContent = `${pct}%`;
    if (els.powerMeterFill) els.powerMeterFill.style.width = `${pct}%`;
  }

  function showMatchOver({
    winnerSide,
    redName,
    blueName,
    scoreRed,
    scoreBlue,
    goalLimit,
    savedToProfile = false,
  }) {
    if (!els.matchOverOverlay) return;
    const winnerName = winnerSide === 'red' ? redName : blueName;
    if (els.matchOverBadge) {
      els.matchOverBadge.textContent = winnerSide ? '🏆' : '🤝';
    }
    if (els.matchOverTitle) {
      els.matchOverTitle.textContent = winnerSide
        ? `Vitória de ${winnerName}!`
        : 'Fim de Partida!';
    }
    if (els.matchOverSubtitle) {
      els.matchOverSubtitle.textContent = `Meta atingida: ${formatGoalLimitLabel(goalLimit, { short: true })}`;
    }
    if (els.matchOverNameRed) els.matchOverNameRed.textContent = redName;
    if (els.matchOverNameBlue) els.matchOverNameBlue.textContent = blueName;
    if (els.matchOverScore) els.matchOverScore.textContent = `${scoreRed} - ${scoreBlue}`;
    if (els.matchOverSummary) {
      els.matchOverSummary.textContent = savedToProfile
        ? 'Resultado registrado automaticamente nas suas estatísticas e ranking local.'
        : 'Entre em uma conta na aba Perfil para salvar seu histórico e pontuação no ranking.';
    }
    els.matchOverOverlay.classList.add('active');
  }

  function hideMatchOver() {
    if (els.matchOverOverlay) {
      els.matchOverOverlay.classList.remove('active');
    }
  }

  // Event bindings
  els.tabs.forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  if (els.headerProfileChip) {
    els.headerProfileChip.addEventListener('click', () => setActiveTab('account'));
  }

  if (els.btnGotoTeams) {
    els.btnGotoTeams.addEventListener('click', () => setActiveTab('teams'));
  }

  if (els.btnClose) {
    els.btnClose.addEventListener('click', () => closeMenu());
  }

  if (els.btnResume) {
    els.btnResume.addEventListener('click', () => closeMenu());
  }

  // Auth switcher
  function setAuthMode(mode) {
    const isReg = mode === 'register';
    if (els.btnAuthModeLogin) els.btnAuthModeLogin.classList.toggle('active', !isReg);
    if (els.btnAuthModeRegister) els.btnAuthModeRegister.classList.toggle('active', isReg);
    if (els.formLocalLogin) els.formLocalLogin.style.display = isReg ? 'none' : 'flex';
    if (els.formLocalRegister) els.formLocalRegister.style.display = isReg ? 'flex' : 'none';
    setAccountFeedback('');
  }

  if (els.btnAuthModeLogin) {
    els.btnAuthModeLogin.addEventListener('click', () => setAuthMode('login'));
  }
  if (els.btnAuthModeRegister) {
    els.btnAuthModeRegister.addEventListener('click', () => setAuthMode('register'));
  }

  if (els.formLocalLogin) {
    els.formLocalLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = els.inputLoginUsername?.value || '';
      const password = els.inputLoginPassword?.value || '';
      safeEmit('authSubmit', { action: 'login', payload: { username, password } });

      if (onlineState.connected) return;

      const res = loginLocalAccount({ username, password });
      if (!res.ok) {
        setAccountFeedback(res.error, 'error');
        return;
      }
      if (els.inputLoginPassword) els.inputLoginPassword.value = '';
      setAccountFeedback(`Bem-vindo de volta, ${res.account.displayName}!`, 'success');
      refreshAccountView();
      if (typeof onRestartFromMenu === 'function') {
        onRestartFromMenu({ syncMetaOnly: true });
      }
    });
  }

  if (els.formLocalRegister) {
    els.formLocalRegister.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        username: els.inputRegUsername?.value || '',
        displayName: els.inputRegDisplayName?.value || '',
        password: els.inputRegPassword?.value || '',
        favoriteColor: regSelectedColor,
        defaultTeamName: els.inputRegTeamName?.value || '',
      };
      safeEmit('authSubmit', { action: 'register', payload });

      if (onlineState.connected) return;

      const res = registerLocalAccount(payload);
      if (!res.ok) {
        setAccountFeedback(res.error, 'error');
        return;
      }
      if (els.inputRegPassword) els.inputRegPassword.value = '';
      setAccountFeedback(`Conta local "${res.account.username}" criada com sucesso!`, 'success');
      refreshAccountView();
      if (typeof onRestartFromMenu === 'function') {
        onRestartFromMenu({ syncMetaOnly: true });
      }
    });
  }

  if (els.btnContinueGuest) {
    els.btnContinueGuest.addEventListener('click', () => {
      setActiveTab('play');
    });
  }

  if (els.btnLogout) {
    els.btnLogout.addEventListener('click', () => {
      safeEmit('authSubmit', { action: 'logout', payload: {} });
      if (!onlineState.connected) {
        logoutLocalAccount();
      } else {
        onlineState.account = null;
      }
      setAccountFeedback('Sessão encerrada. Jogando como convidado.', 'success');
      refreshAccountView();
      if (typeof onRestartFromMenu === 'function') {
        onRestartFromMenu({ syncMetaOnly: true });
      }
    });
  }

  if (els.formProfileEdit) {
    els.formProfileEdit.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        displayName: els.inputProfileDisplayName?.value || '',
        favoriteColor: profileSelectedColor,
        defaultTeamName: els.inputProfileTeamName?.value || '',
      };
      safeEmit('authSubmit', { action: 'updateProfile', payload });

      if (onlineState.connected) return;

      const res = updateLocalProfile(payload);
      if (!res.ok) {
        setAccountFeedback(res.error, 'error');
        return;
      }
      setAccountFeedback('Perfil local atualizado!', 'success');
      refreshAccountView();
      if (typeof onRestartFromMenu === 'function') {
        onRestartFromMenu({ syncMetaOnly: true });
      }
    });
  }

  if (els.btnApplyProfileTeam) {
    els.btnApplyProfileTeam.addEventListener('click', () => {
      const account = getActiveAccount();
      if (!account || typeof onUseProfileTeam !== 'function') return;
      onUseProfileTeam(account);
      setAccountFeedback('Cor e nome do seu perfil aplicados ao Time 1!', 'success');
    });
  }

  // Online lobby actions (emitted for Feature 3)
  if (els.formCreateRoom) {
    els.formCreateRoom.addEventListener('submit', (e) => {
      e.preventDefault();
      safeEmit('roomAction', {
        action: 'createRoom',
        payload: {
          name: (els.inputRoomName?.value || '').trim(),
          visibility: els.selectRoomVisibility?.value || 'public',
          goalLimit: Number(els.selectRoomGoalLimit?.value ?? 5),
        },
      });
    });
  }

  if (els.formJoinCode) {
    els.formJoinCode.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = (els.inputRoomCode?.value || '').trim().toUpperCase();
      if (!code) return;
      safeEmit('roomAction', {
        action: 'joinRoom',
        payload: { code },
      });
    });
  }

  if (els.btnRefreshRooms) {
    els.btnRefreshRooms.addEventListener('click', () => {
      safeEmit('roomAction', { action: 'refreshRooms', payload: {} });
    });
  }

  if (els.btnCopyRoomCode) {
    els.btnCopyRoomCode.addEventListener('click', async () => {
      const code = currentRoom?.code || els.roomCodeDisplay?.textContent || '';
      if (!code) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(code);
        }
      } catch (err) {}
      safeEmit('roomAction', { action: 'copyCode', payload: { code } });
    });
  }

  if (els.btnLeaveRoom) {
    els.btnLeaveRoom.addEventListener('click', () => {
      safeEmit('roomAction', {
        action: 'leaveRoom',
        payload: { code: currentRoom?.code || null },
      });
    });
  }

  if (els.btnRoomReady) {
    els.btnRoomReady.addEventListener('click', () => {
      safeEmit('roomAction', {
        action: 'toggleReady',
        payload: { code: currentRoom?.code || null },
      });
    });
  }

  if (els.formRoomChat) {
    els.formRoomChat.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = (els.inputRoomChat?.value || '').trim();
      if (!text) return;
      safeEmit('roomAction', {
        action: 'sendChat',
        payload: { code: currentRoom?.code || null, text },
      });
      if (els.inputRoomChat) els.inputRoomChat.value = '';
    });
  }

  if (els.btnRematch) {
    els.btnRematch.addEventListener('click', () => {
      hideMatchOver();
      if (typeof onPlayAgain === 'function') onPlayAgain();
    });
  }

  if (els.btnGameoverMenu) {
    els.btnGameoverMenu.addEventListener('click', () => {
      hideMatchOver();
      openMenu('play');
    });
  }

  // Inicialização visual dos seletores
  refreshRegColorPicker();
  setOnlineState(onlineState);
  renderOnlineRooms([]);
  renderOnlineRoom(null);

  return {
    openMenu,
    closeMenu,
    markMatchStarted,
    setActiveTab,
    setOnlineState,
    renderOnlineRooms,
    renderOnlineRoom,
    renderLeaderboard,
    refreshAccountView,
    setAccountFeedback,
    getActiveAccount,
    updateHUDMeta,
    updateTeamPreviews,
    setPowerMeter,
    showMatchOver,
    hideMatchOver,
  };
}
