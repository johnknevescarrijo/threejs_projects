# MEMORY - Futebol de Botão 3D (Three.js)

## 📌 Visão Geral do Projeto
Jogo interativo 3D de **Futebol de Botão**, desenvolvido com Three.js (ES6 via CDN `importmap`), física 2.5D customizada, IA multi-nível, interface em 4 abas, 6 cores personalizáveis para os times, sistema de contas/ranking e **Multiplayer Online em tempo real** sobre Node.js + WebSocket com fallback transparente para Modo Offline.

---

## 🛠️ Stack Tecnológica & Dependências
- **Frontend:** HTML5, CSS3 (`css/ui.css`), JavaScript ES6 Modules (`js/*.js`), Three.js (`v0.160.0` via CDN), OrbitControls e Web Audio API nativa.
- **Backend:** Node.js ES Modules (`node:http`, `node:crypto`, `node:fs`, `node:path`, `node:url`) e `ws` (`WebSocketServer` em `/ws`).
- **Testes:** `node:test` + `node:assert/strict` (`npm test`).

---

## 📂 Estrutura de Arquivos
```text
jogo_fubetol/
├── AGENTS.md
├── MEMORY.md
├── README.md
├── package.json
├── .gitignore                        # Ignora node_modules/ e server/data/
├── index.html                        # Cena Three.js, física, IA, áudio, hooks window.FutebolBotaoApp
├── css/
│   └── ui.css                        # Estilos da UI 4 abas, HUD, power meter e modais
├── js/
│   ├── teamColors.js                 # 6 cores (red, blue, green, black, pink, yellow) + swap anti-colisão
│   ├── matchRules.js                 # Opções de meta de gols (3, 5, 7, Livre) e avaliação de vitória
│   ├── localProfile.js               # Contas, sessões, histórico (20) e ranking local em localStorage
│   ├── uiController.js               # Controlador da UI (abas, previews 3D, lobby, conta/ranking)
│   └── onlineClient.js               # Autodetecção /api/health, auth REST, WS client e sync de partida
├── server/
│   ├── index.js                      # Servidor HTTP estático seguro + REST /api/* + WS /ws
│   ├── store.js                      # Persistência JSON atômica, scrypt+salt, tokens e ranking global
│   └── rooms.js                      # Gerenciador de salas, chat, anti-colisão, turnos e W.O.
└── tests/
    ├── teamColors.test.mjs
    ├── localProfileAndRules.test.mjs
    └── serverMultiplayer.test.mjs
```

---

## ⚙️ Arquitetura & Decisões Implementadas

### 1. Personalização de Cores & Times (`js/teamColors.js`)
- Paleta com 6 cores (`red`, `blue`, `green`, `black`, `pink`, `yellow`), incluindo `pieceHex`, `rimHex`, `stickerBg`, `numberColor`, `gkHex`, `ringHex`, `cssPrimary`, `cssGlow` e `cssText`.
- `resolveTeamColorChange` realiza troca automática (swap) caso um time selecione a cor em uso pelo adversário nos modos locais, evitando conflito visual.
- Aplica atualização imediata na cena 3D (discos, aros, adesivos e goleiros), badges do placar, indicador de turno, labels de câmera e mini-peças de pré-visualização.

### 2. Interface em 4 Abas, Regras & Perfis Locais (`js/matchRules.js`, `js/localProfile.js`, `js/uiController.js`)
- **Menu em 4 Abas:** `Jogar`, `Cores & Times`, `Multiplayer Online` e `Conta & Ranking`.
- **Regras de Partida:** Meta configurável (`3`, `5`, `7` ou `0` para Livre), medidor de força em tempo real durante o arrasto e modal de fim de partida.
- **Fallback Offline:** Quando `/api/health` não responde ou é aberto via `file://`, `onlineClient.js` mantém o jogo em Modo Offline e `uiController.js` opera normalmente com `localProfile.js`.

### 3. Backend Multiplayer & Autenticação (`server/`)
- **`store.js`:**
  - Escrita JSON atômica (`writeFileSync` em arquivo temporário + `renameSync`) em `server/data/db.json` (ou `dataFile` configurável em testes).
  - Senhas com `crypto.scryptSync` + salt aleatório de 16 bytes e comparação com `crypto.timingSafeEqual`.
  - Tokens aleatórios de 32 bytes com TTL de 30 dias e histórico limitado às 20 últimas partidas por usuário.
- **`rooms.js`:**
  - Salas públicas e privadas com código de 6 caracteres sem ambiguidade (`0/O/1/I` excluídos).
  - Resolução automática de cor anti-colisão ao entrar na sala e bloqueio claro ao tentar escolher a cor do adversário na sala de espera.
  - Sincronização turn-based: `game_shot` dispara movimento imediato no adversário (`applyRemoteShot`), e `turn_settled` (aceito apenas do jogador ativo do turno após estabilização / reset pós-gol) distribui `state_sync` canônico para ambos sem drift.
  - Desconexão em partida ativa declara vitória por W.O. (`forfeit`), registra no ranking e remove a sala.
- **`index.js`:**
  - Bloqueio estrito contra path traversal e acesso a `server/`, `tests/`, `node_modules/` e arquivos de configuração.
  - Exporta `createGameServer` para execução programática e testes com `port: 0`.

---

## 🚀 Comandos Rápidos
- **Modo Online:** `cd jogo_fubetol && npm install && npm start` → `http://localhost:3000`
- **Modo Offline:** `cd jogo_fubetol && python3 -m http.server 8000` → `http://localhost:8000`
- **Testes:** `cd jogo_fubetol && npm test`
