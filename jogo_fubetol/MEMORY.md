# MEMORY - Futebol de Botão 3D (Three.js)

## 📌 Visão Geral do Projeto
Jogo interativo 3D no estilo clássico de **Futebol de Botão**, desenvolvido com Three.js (ES6 via CDN) e física 2.5D customizada. O jogo inclui mecânica de mira e tiro estilo estilingue ("drag and shoot"), sistema de turnos com alternância automática, detecção e celebração de gols com placar, efeitos sonoros sintetizados via Web Audio API, múltiplas câmeras, **Inteligência Artificial (Bot)** e **Menu de Modos de Jogo (1P vs Bot, 2P Local, Bot vs Bot)**.

---

## 🛠️ Stack Tecnológica & Dependências
- **Linguagem:** HTML5, CSS3, JavaScript (ES6 Modules).
- **Engine 3D:** Three.js (v0.160.0) carregada via CDN `importmap` (unpkg).
- **Controles de Câmera:** `OrbitControls` da extensão JSM do Three.js + presets de câmeras rápidas (Isométrica, Vista Superior, Atrás dos Times).
- **Áudio:** Web Audio API nativa (sem arquivos `.mp3/.wav` externos, 100% sintetizado em tempo real para impactos de acrílico/madeira, apito de juiz, disparos e fanfarra de gol).
- **Sem bundlers ou npm:** Roda diretamente no navegador ou via servidor HTTP local simples.

---

## 📂 Estrutura de Arquivos
```text
jogo_fubetol/
├── AGENTS.md      # Especificações e diretrizes do projeto de Futebol de Botão 3D
├── MEMORY.md      # Registro arquitetural, decisões de física, mecânicas e status
├── README.md      # Apresentação do projeto, modos de jogo e guia de execução
└── index.html     # Aplicação completa (HTML5, HUD, CSS, Three.js, Física, IA, Áudio e Controles)
```

---

## ⚙️ Arquitetura & Mecânicas Implementadas

### 1. Tabuleiro & Mesa de Jogo
- **Gramado:** Textura 2D de alta fidelidade desenhada proceduralmente em canvas com faixas de corte de grama e marcações de campo de botão.
- **Tabelas / Bordas de Madeira:** Laterais elevadas ao redor da mesa com abertura regulamentar para as balizas, permitindo jogadas de rebote clássicas.
- **Traves e Rede:** Balizas estilizadas em plástico branco com profundidade e rede translúcida.

### 2. Peças & Goleiros
- **Botões Circulares (10 de linha por time):** Modelados como cilindros achatados com chanfro plástico, adesivo circular texturizado com os números dos jogadores e anel de seleção luminoso.
- **Goleiros (1 por time):** Blocos retangulares de acrílico colorido translúcido, com maior massa e estabilidade para defender as traves.
- **Bolinha:** Esfera com propriedades de colisão e massa reduzida para velocidade e dinâmica realistas.

### 3. Motor de Física 2.5D Customizado
- **Integração de Movimento:** Atualização de posição e velocidade com atrito/fricção exponencial (`FRICTION = 0.983`).
- **Colisão Elástica (Círculo vs Círculo):** Resolução de sobreposição geométrica e conservação de momento linear com coeficiente de restituição (`RESTITUTION = 0.88`).
- **Colisão com Bordas & Traves:** Rebote nas tabelas de madeira e nas laterais dos gols.
- **Detecção de Gol:** Reconhecimento imediato quando a bola ultrapassa a linha e entra no interior das balizas.

### 4. Inteligência Artificial (Bot) & Tomada de Decisão
- **Algoritmo de Posicionamento Vetorial:**
  - Calcula a trajetória ideal bola $\to$ gol adversário.
  - Determina o ponto de contato ótimo atrás da bola.
  - Avalia todas as peças do time da IA com pontuação para proximidade, ângulo em relação à meta rival e bloqueio de recuo contra o próprio gol.
  - O goleiro da IA prioriza a proteção da meta, saindo apenas em lances de perigo na pequena área.
- **Níveis de Desafio:**
  - **Fácil:** Maior dispersão angular (desvio aleatório) e força variável.
  - **Médio:** Mira consistente no gol e força calibrada.
  - **Craque (Difícil):** Calcula a posição do goleiro adversário e busca os cantos livres da trave com precisão e força calibrada para a distância.
  - **Lendário (Extremo Master):** Inteligência analítica e preditiva completa:
    - **Simulador Físico Prospectivo (Forward Simulation):** Executa simulações virtuais de física em tempo real antes de disparar, prevendo a trajetória de todas as peças e confirmando gols ou paradas da bola.
    - **Passes & Assistências:** Identifica companheiros livres no ataque e toca a bola de forma calibrada para deixá-los na cara do gol.
    - **Jogadas Posicionais & Bloqueio Tático:** Quando não há chance de gol imediata, chuta para anular a linha de tiro do atacante humano mais perigoso ou colocar a bola em zona morta.
    - **Raycasting de Obstáculos:** Verifica se o caminho do botão até o ponto de impacto e da bola até o alvo estão 100% livres de interceptação.
    - **Tabelinhas / Bank Shots:** Se a linha direta para o gol estiver bloqueada, calcula ricochete perfeito nas tabelas/bordas de madeira.
    - **Defesa Ativa do Goleiro:** O goleiro da IA desliza automaticamente para cobrir a linha de tiro da bola a cada final de jogada.
    - **Velocidade e Potência Máxima:** Disparos com velocidade turbinada ($3.4\times$) e precisão milimétrica sem dispersão.
- **Feedback Visual & Temporal:**
  - Simulação de tempo de reação ("pensando..."), anel indicador no botão escolhido e linha de mira temporária antes do disparo.

### 5. Modos de Jogo & Menu de Opções
- **Modal Interativo:**
  - **1 Jogador (vs Bot):** Disputa contra a IA com escolha de time (Vermelho ou Azul) e dificuldade.
  - **2 Jogadores (Local):** Turnos alternados entre dois humanos no mesmo dispositivo.
  - **Assistir (Bot vs Bot):** Simulação autônoma de partida entre duas IAs.
- **Acesso:** Abre ao carregar o jogo ou via botão `⚙️ Modo de Jogo` no HUD inferior a qualquer momento.

### 6. Sistema de Mira & Disparo (Slingshot)
- Interação por `Raycaster` com clique no botão do time da vez (bloqueado durante os turnos da IA).
- Vetor de mira dinâmico desenhado no chão (linha e círculo indicador) ao arrastar o mouse para trás.
- Força proporcional à distância de puxada com limite máximo (`maxPull = 18`).

### 7. Interface (HUD) & Recursos Extras
- Placar com badges customizadas indicando quem está jogando ("VOCÊ", "BOT (Craque)", "JOGADOR 1/2").
- Indicador de turno contextual com status em tempo real.
- Botão para alternar entre 4 ângulos de câmera (Isométrica, Vista de Cima, Atrás do Vermelho e Atrás do Azul).
- Botão de reiniciar partida e botão de alternar efeitos sonoros.

---

## 🚀 Como Executar
Abra o arquivo [index.html](file:///home/john/Programacao/Estudos/threejs_projects/jogo_fubetol/index.html) no navegador ou inicie um servidor HTTP local:
```bash
python3 -m http.server 8000
```
E acesse `http://localhost:8000`.
