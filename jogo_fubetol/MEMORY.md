# MEMORY - Futebol de Botão 3D (Three.js)

## 📌 Visão Geral do Projeto
Jogo interativo 3D no estilo clássico de **Futebol de Botão**, desenvolvido com Three.js (ES6 via CDN) e física 2.5D customizada. O jogo inclui mecânica de mira e tiro estilo estilingue ("drag and shoot"), sistema de turnos com alternância automática, detecção e celebração de gols com placar, efeitos sonoros sintetizados via Web Audio API e múltiplas câmeras.

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
└── index.html     # Aplicação completa (HTML5, HUD, CSS, Three.js, Física, Áudio e Controles)
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

### 4. Sistema de Mira & Disparo (Slingshot)
- Interação por `Raycaster` com clique no botão do time da vez.
- Vetor de mira dinâmico desenhado no chão (linha e círculo indicador) ao arrastar o mouse para trás.
- Força proporcional à distância de puxada com limite máximo (`maxPull = 18`).
- Bloqueio de cliques quando as peças estão em movimento ou no turno do adversário.

### 5. Sistema de Turnos & Regras
- Alternância de turno (Vermelho ↔ Azul) disparada automaticamente assim que todas as peças no campo atingem repouso (`vel < threshold`).
- Ao marcar gol:
  - Exibição de banner comemorativo animado (*GOOOOOL!*).
  - Fanfarra sonora.
  - Atualização do placar no HUD.
  - Reposicionamento suave e apito inicial para reinício.

### 6. Interface (HUD) & Recursos Extras
- Placar e indicador de turno atual com cores correspondentes.
- Botão para alternar entre 4 ângulos de câmera (Isométrica, Vista de Cima, Atrás do Vermelho e Atrás do Azul).
- Botão de reiniciar partida (zera placar e reseta posições).
- Botão de alternar efeitos sonoros (Liga/Desliga).

---

## 🚀 Como Executar
Abra o arquivo [index.html](file:///home/john/Programacao/Estudos/threejs_projects/jogo_fubetol/index.html) no navegador ou inicie um servidor HTTP local:
```bash
python3 -m http.server 8000
```
E acesse `http://localhost:8000`.
