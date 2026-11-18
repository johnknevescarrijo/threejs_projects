# ⚽ Futebol de Botão 3D (Three.js)

Um jogo interativo e completo de **Futebol de Botão 3D** construído com **Three.js** e **JavaScript ES6 Modules**, com interface moderna em 4 abas, 6 cores personalizáveis de peças, cadastro/ranking e **Modo Multiplayer Online em tempo real** via Node.js + WebSocket (com fallback automático para **Modo Offline**).

---

## 🎮 Modos de Jogo & Recursos

- **Modos de Jogo Locais & Online:**
  - 👤🤖 **1 Jogador (vs Bot):** Desafie a Inteligência Artificial em 4 níveis de dificuldade.
  - 👥 **2 Jogadores (Local):** Dispute com um amigo em turnos alternados no mesmo dispositivo.
  - 🤖🤖 **Assistir (Bot vs Bot):** Acompanhe uma partida simulada entre dois bots autônomos.
  - 🌐 **Multiplayer Online (Tempo Real):** Crie salas públicas ou privadas com código de 6 dígitos, personalize a cor do time na sala de espera (sem colisão), converse no chat rápido e jogue partidas sincronizadas turno a turno pela rede!
- **6 Cores de Peças & Customização de Times:**
  - Escolha entre **Vermelho**, **Azul**, **Verde**, **Preto**, **Rosa** e **Amarelo** (além de editar o nome dos dois times), com troca automática anti-colisão e atualização ao vivo nos discos 3D, goleiros e placar.
- **Interface Moderna em 4 Abas & HUD Redesenhado:**
  - Abas **Jogar**, **Cores & Times**, **Multiplayer Online** e **Conta & Ranking**.
  - **Meta de Gols configurável** (`3`, `5`, `7` gols ou `Livre`) com tela de fim de partida e revanche.
  - **Medidor de Força** ao vivo durante a puxada do estilingue.
- **Cadastro, Perfil, Histórico & Ranking:**
  - **Online (Node.js):** Cadastro e login com hash seguro `scrypt` + salt, edição de perfil, histórico das últimas 20 partidas e **Ranking Global** persistido em JSON atômico.
  - **Offline (Navegador):** Contas locais, histórico e ranking local salvos em `localStorage` quando executado sem servidor Node.js.
- **Inteligência Artificial (Bot):**
  - Quatro níveis: **🟢 Fácil**, **🟡 Médio**, **🔴 Craque** e **👑 Lendário (Extremo Master)** com simulação prospectiva de física, passes, bloqueios posicionais, raycasting e jogadas de tabela (bank shots).
- **Física 2.5D & Áudio:** Deslizamento com fricção, colisões elásticas círculo-círculo, rebotes nas tabelas, detecção automática de gol e efeitos sonoros sintetizados via **Web Audio API**.
- **Atalhos Úteis:** `ESC` (Menu), `C` (Câmera), `R` (Reiniciar), `M` (Mutar Áudio).

---

## 🚀 Como Executar

### Opção 1: Modo Completo com Multiplayer Online (Recomendado)

Requer **Node.js 18+** (testado em Node.js 22):

```bash
cd jogo_fubetol
npm install
npm start
```

Depois acesse no navegador:
👉 **`http://localhost:3000`**

Para testar ou jogar Multiplayer Online:
1. Abra **`http://localhost:3000`** em **duas abas** (ou dois dispositivos na mesma rede local).
2. Crie uma conta (ou faça login) em cada aba na aba **Conta & Ranking**.
3. Na aba **Multiplayer Online**, crie uma sala (pública ou privada) em uma aba e entre usando a lista de salas ou o código de 6 dígitos na outra.
4. Escolha a cor do time, clique em **Pronto / Iniciar** e jogue!

---

### Opção 2: Modo Offline (Fallback Transparente sem Node.js)

Caso queira rodar apenas os modos locais (**1P vs Bot**, **2P Local**, **Bot vs Bot** e **Contas/Ranking Locais**) sem iniciar o backend:

```bash
cd jogo_fubetol
python3 -m http.server 8000
```

Acesse **`http://localhost:8000`**. O jogo detecta automaticamente que não há servidor `/api/health` e opera em **Modo Offline** sem erros.

---

## ☁️ Publicar Grátis no Render + GitHub

Você pode hospedar o jogo completo (Frontend 3D + Backend REST + WebSocket Multiplayer) gratuitamente no **Render** conectado ao seu repositório **GitHub**:

### Passo 1: Enviar o código para o GitHub
1. Crie um repositório no GitHub (ou use o repositório existente, onde a configuração deste jogo fica isolada em `jogo_fubetol/render.yaml`).
2. Faça o push da branch principal com os commits atualizados:
   ```bash
   git push origin main
   ```

### Passo 2: Criar o serviço no Render

- **Opção A — Web Service Direto (`New → Web Service`) (Recomendado para monorepo com vários jogos):**
  1. Acesse o [Dashboard do Render](https://dashboard.render.com/) → **New + → Web Service** e conecte seu repositório GitHub.
  2. Preencha os campos:
     - **Root Directory:** `jogo_fubetol`
     - **Runtime:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Plan:** `Free`
     - **Health Check Path (Advanced):** `/api/health`
  3. Adicione a variável de ambiente `NODE_ENV=production` e clique em **Create Web Service**.

- **Opção B — Blueprint (`New → Blueprint`) usando `jogo_fubetol/render.yaml`:**
  1. Acesse **New + → Blueprint** e conecte seu repositório do GitHub.
  2. Aponte o **Blueprint Path** para `jogo_fubetol/render.yaml` (ele já define `rootDir: jogo_fubetol`, `plan: free`, `healthCheckPath: /api/health` e `NODE_ENV=production`) para criar o serviço Web `futebol-de-botao-3d` mantendo a raiz do monorepo limpa.

### Observações do Plano Gratuito (Render Free)
- **Hibernação por inatividade (spin-down):** Serviços gratuitos dormem após ~15 minutos sem tráfego. O primeiro acesso após hibernar pode levar cerca de **30 a 50 segundos** para acordar o container (o cliente já usa timeout tolerante de `12s` + retry automático em domínios remotos para evitar falso fallback offline).
- **Disco efêmero:** No plano `Free`, o sistema de arquivos é efêmero — o arquivo `server/data/db.json` (contas e ranking online) é reiniciado em novos deploys ou reinicializações do container. Caso adicione um Render Disk no futuro, basta apontar `DATA_FILE=/var/data/db.json` nas variáveis de ambiente.

---

## 🧪 Como Executar os Testes

A suíte automatizada utiliza `node:test` nativo e cobre paleta/cores, regras de partida, perfil offline, API REST de autenticação e multiplayer WebSocket ponta a ponta:

```bash
cd jogo_fubetol
npm test
```

---

## 📁 Estrutura do Projeto

```text
jogo_fubetol/
├── index.html                  # Cena 3D Three.js, física, IA, HUD e integração
├── css/
│   └── ui.css                  # Design glassmorphism esportivo, 4 abas, HUD e medidor de força
├── js/
│   ├── teamColors.js           # Paleta das 6 cores, sanitização de nomes e swap anti-colisão
│   ├── matchRules.js           # Metas de gols e avaliação de vencedor
│   ├── localProfile.js         # Contas, histórico e ranking offline (localStorage)
│   ├── uiController.js         # Controlador das 4 abas, modais, salas e feedback visual
│   └── onlineClient.js         # Cliente REST + WebSocket com fallback offline automático
├── server/
│   ├── index.js                # Servidor HTTP estático + REST API + WebSocket (/ws)
│   ├── store.js                # Persistência JSON atômica, scrypt auth e ranking global
│   └── rooms.js                # Salas (pública/privada), chat, anti-colisão e sync de turnos
├── tests/
│   ├── teamColors.test.mjs
│   ├── localProfileAndRules.test.mjs
│   └── serverMultiplayer.test.mjs
├── package.json
├── render.yaml
├── README.md
├── AGENTS.md
└── MEMORY.md
```

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3 (Glassmorphism), JavaScript ES6 Modules, Three.js (`v0.160.0` via CDN `importmap`), OrbitControls e Web Audio API.
- **Backend:** Node.js (ES Modules, `node:http`, `node:crypto`, `node:fs`, `node:path`) + `ws` (WebSocket).

Divirta-se jogando Futebol de Botão 3D! ⚽🏆
