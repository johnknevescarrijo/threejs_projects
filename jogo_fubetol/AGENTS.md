# Projeto: Futebol de Botão 3D (Three.js)

## 1. Objetivo
Desenvolver um jogo completo e interativo de **Futebol de Botão 3D** utilizando a biblioteca Three.js, com física customizada de deslizamento e colisão, mecânica de mira/tiro estilo "arrastar e soltar" (slingshot/drag-and-release), sistema de turnos, placar e detecção de gols.

## 2. Stack Tecnológica
- **Linguagem:** JavaScript (ES6 Modules), HTML5 e CSS3.
- **Biblioteca 3D:** Three.js (via CDN / importmap).
- **Controles:** OrbitControls e Raycaster para seleção e disparo de botões.
- **Áudio:** Web Audio API nativa para efeitos sonoros sintetizados (impactos, apito e gol).
- **Dependências externas:** Apenas Three.js via CDN (sem npm/bundlers).

## 3. Elementos Visuais & Cenário
- **Mesa de Jogo:**
  - Campo verde estilizado de futebol de botão com marcações clássicas.
  - Bordas/tabelas de madeira ou acrílico elevadas ao redor do campo para rebote.
  - Balizas/Gols clássicos de plástico com rede.
- **Botões (Jogadores):**
  - Discos estilizados com chanfro, cores e números dos times (Vermelho vs Azul).
  - Goleiros em formato retangular clássico de futebol de botão.
- **Bolinha:**
  - Esfera leve de plástico ou feltro no centro do campo.
- **Interface de Mira & Força:**
  - Seta/vetor indicador no chão mostrando a direção e intensidade do disparo enquanto o jogador puxa.
- **HUD & UI:**
  - Placar estilizado com placar dos times, indicador de turno atual e botão de reset.
  - Mensagens de celebração ao marcar Gol e reposicionamento automático.

## 4. Mecânicas de Jogo (Física & Interação)
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

## 5. Boas Práticas
- Código modular e bem documentado.
- Física determinística e sem dependência de bibliotecas pesadas de física externa.
- Responsividade total para diferentes resoluções de tela.
