# Projeto: Futebol de Botão 3D (Three.js)

## 1. Objetivo
Desenvolver um jogo completo e interativo de **Futebol de Botão 3D** utilizando a biblioteca Three.js, com física customizada de deslizamento e colisão, mecânica de mira/tiro estilo "arrastar e soltar" (slingshot/drag-and-release), sistema de turnos, placar, detecção de gols, **Inteligência Artificial (Bot adversário com múltiplos níveis de dificuldade)** e **Menu de Seleção de Modos de Jogo**.

## 2. Stack Tecnológica
- **Linguagem:** JavaScript (ES6 Modules), HTML5 e CSS3.
- **Biblioteca 3D:** Three.js (via CDN / importmap).
- **Controles:** OrbitControls e Raycaster para seleção e disparo de botões.
- **Áudio:** Web Audio API nativa para efeitos sonoros sintetizados (impactos, apito, chutes e fanfarra de gol).
- **Dependências externas:** Apenas Three.js via CDN (sem npm/bundlers).

## 3. Elementos Visuais & Cenário
- **Mesa de Jogo:**
  - Campo verde estilizado de futebol de botão com marcações clássicas e texturas procedurais.
  - Bordas/tabelas de madeira elevadas ao redor do campo para jogadas de rebote.
  - Balizas/Gols clássicos de plástico com rede.
- **Botões (Jogadores):**
  - Discos estilizados com chanfro, cores e números dos times (Vermelho vs Azul).
  - Goleiros em formato retangular clássico de futebol de botão com material de acrílico.
- **Bolinha:**
  - Esfera leve de plástico ou feltro no centro do campo.
- **Interface de Mira & Força:**
  - Seta/vetor indicador no chão mostrando a direção e intensidade do disparo enquanto o jogador ou bot puxa.
- **HUD & UI:**
  - Placar estilizado com placar dos times, badges com indicação do jogador/bot e indicador de turno atual.
  - Modal de seleção de modos de jogo com design glassmorphism moderno.
  - Mensagens de celebração ao marcar Gol e reposicionamento automático.

## 4. Modos de Jogo & Inteligência Artificial (Bot)
- **Modos de Jogo:**
  - **1 Jogador vs Bot (PvE):** Escolha de time (Vermelho ou Azul) e disputa individual contra a máquina.
  - **2 Jogadores Local (PvP):** Partida clássica revezando turnos no mesmo teclado/mouse.
  - **Bot vs Bot (EvE / Simulação):** Modo espectador com dois bots duelando.
- **Inteligência Artificial (Bot):**
  - Avaliação vetorial de melhor peça (posicionamento ofensivo, distância até o ponto de impacto atrás da bola em direção ao gol).
  - Cálculo de ângulo e intensidade de chute.
  - Proteção de meta para o goleiro.
  - Níveis de Dificuldade:
    - **Fácil:** Dispersão angular maior e força reduzida/aleatória.
    - **Médio:** Mira consistente no gol e força calibrada.
    - **Craque (Difícil):** Mira precisa nos cantos do gol desviando do goleiro adversário e força otimizada.

## 5. Mecânicas de Jogo (Física & Interação)
- **Seleção & Disparo:** O jogador clica em um botão do seu time no seu turno, arrasta para trás para dosar a força e direção, e solta para impulsionar o botão.
- **Física 2.5D:**
  - Deslizamento com fricção e desaceleração suave (inércia).
  - Colisões elásticas círculo-círculo entre botões.
  - Colisão botão-bola transferindo momento linear.
  - Rebote nas bordas/tabelas laterais da mesa.
  - Colisão com as traves e área interna do gol.
- **Sistema de Turnos:**
  - Alternância de turno entre Time Vermelho e Time Azul após cada jogada estabilizar (quando todas as peças pararem).
  - Detecção automática de GOL com reset das posições ao centro.

## 6. Boas Práticas
- Código modular e bem documentado.
- Física determinística e sem dependência de bibliotecas pesadas de física externa.
- Responsividade total para diferentes resoluções de tela.
