# MEMORY.md — Memória de Projeto: My Kart (Three.js Arcade Racing)

Este arquivo documenta o contexto, decisões de arquitetura, parâmetros matemáticos, histórico de implementação e diretrizes de evolução contínua para o jogo de kart arcade 3D construído em **Three.js**, com fidelidade à especificação formal de IA definida em [`AGENTS.MD`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/AGENTS.MD).

---

## 1. Visão e Objetivos do Projeto

* **Gênero:** Arcade Kart Racing 3D (estilo *Mario Kart* / *Crash Team Racing*).
* **Foco Principal:** Implementação e visualização em tempo real de agentes autônomos inteligentes com tomada de decisão não-onisciente, baseada em sensores espaciais, personalidades distintas, FSM de itens e sistema de dificuldade dinâmica (DDA / Rubber Banding).
* **Stack Tecnológico:**
  * **Renderização 3D:** Three.js (WebGL com sombras suaves PCF, ACES Filmic Tone Mapping e iluminação mista).
  * **Pipeline de Build:** Vite (ES Modules modernos).
  * **Áudio:** Web Audio API sintético procedural (sem dependência de arquivos externos `.wav` ou `.mp3`, 100% offline).
  * **UI/HUD:** DOM/CSS moderno integrado a Canvas 2D de alta performance para o minimapa vetorial em tempo real.

---

## 2. Decisões Estruturais de Arquitetura

### 2.1. Pipeline Desacoplado de IA em 4 Camadas (Per Physics Tick)
Conforme estipulado no [`AGENTS.MD`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/AGENTS.MD):
1. **Camada 1 — Percepção e Sensores (Context Awareness):**
   * *Spline Ribbon Projection:* Determina progresso linear $t \in [0, 1]$, deslocamento lateral (*lateral offset*), normal e binormal da pista.
   * *Raycasts de Proximidade:*
     * Frontal longo (15m–25m): detecta karts lentos, cascas de banana e obstáculos.
     * Diagonais e laterais (3m–6m): prevê fechadas de curva e ultrapassagens laterais.
     * Traseiro (10m): alerta contra projéteis e tentativas de vácuo (*slipstream*).
   * *Scan de Colecionáveis e Ameaças:* Esfera de 14m em busca de caixas de itens e perigos ativos.
2. **Camada 2 — Navegação e Linha Adaptativa (Steering & Racing Line):**
   * Alterna entre Traçado Ideal (fora-dentro-fora calculado via curvatura da spline), Traçado Defensivo (bloqueio do centro quando perseguido) e Traçado de Coleta (desvio para caixas de itens).
   * Reavaliação de atalhos (*shortcut evaluation*): habilita rota off-road quando munido de Turbo/Cogumelo.
3. **Camada 3 — Árvore de Decisão de Itens (Item FSM):**
   * Avaliação tática executada a 12.5 Hz (intervalo de ~0.08s).
   * Disparo frontal oportuno vs. arremesso defensivo para trás vs. retenção de escudo na traseira.
4. **Camada 4 — Atuação Motora (Actuation):**
   * Executada no loop estrito de física a 60 Hz.
   * Aplica vetores de esterçamento com suavização, contraesterço em drift, aceleração e frenagem inteligente.

---

## 3. Estado Atual dos Módulos do Sistema

| Módulo | Caminho do Arquivo | Status | Descrição |
| :--- | :--- | :--- | :--- |
| **Constantes Globais** | [`src/core/constants.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/core/constants.js) | ✅ Concluído | Configurações de física, sensores, DDA, itens e parâmetros da pista. |
| **Geometria da Pista & Spline** | [`src/core/track.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/core/track.js) | ✅ Concluído | Spline CatmullRom 3D, ribbon de asfalto, zebras zebradas, elevações, atalho off-road e árvores. |
| **Câmera de Acompanhamento** | [`src/core/camera.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/core/camera.js) | ✅ Concluído | Câmera em 3ª pessoa suave com FOV dinâmico, screen-shake e alternância para visão do capô (tecla `C`). |
| **Entidade Kart 3D** | [`src/entities/kart.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/entities/kart.js) | ✅ Concluído | Modelo 3D com chassi, rodas giratórias, esterço dianteiro, chamas de nitro, faíscas de drift e suporte a itens. |
| **Caixas de Itens** | [`src/entities/itemBox.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/entities/itemBox.js) | ✅ Concluído | Blocos translúcidos flutuantes com animação contínua e temporizador de respawn (3.0s). |
| **Gerenciador de Itens** | [`src/entities/item.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/entities/item.js) | ✅ Concluído | Casco Verde (quica nas bordas), Casco Vermelho (teleguiado), Banana (armadilha de solo), Cogumelo e Raio/Azul. |
| **Sensores Espaciais** | [`src/ai/sensors.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/ai/sensors.js) | ✅ Concluído | Emissão de raios frontais, laterais e traseiros com renderizador de debug visual ativável pela tecla `B`. |
| **Controlador de IA** | [`src/ai/aiController.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/ai/aiController.js) | ✅ Concluído | Pipeline de 4 camadas, DDA com trava de fair play nos últimos 300m, LOD e FSM de itens. |
| **Arquétipos de Piloto** | [`src/ai/archetypes.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/ai/archetypes.js) | ✅ Concluído | O Agressivo (Rex), O Técnico (Aria) e O Tático/Defensivo (Vance) com parâmetros calibrados. |
| **Sistema de Som** | [`src/audio/sound.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/audio/sound.js) | ✅ Concluído | Sintetizador procedural com Web Audio API para motor, turbo, drift, caixas de itens e rodopios. |
| **HUD & UI Arcade** | [`src/ui/hud.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/ui/hud.js) & [`src/ui/style.css`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/ui/style.css) | ✅ Concluído | Posição, voltas, velocímetro, barra de drift, roleta de itens animada, telemetria de IA e minimapa vetorial. |
| **Loop Principal da Aplicação** | [`src/main.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/main.js) | ✅ Concluído | Inicialização de cena Three.js, grid de 8 karts (1 player + 7 IA), colisões mútuas e ranking. |

---

## 4. Parâmetros e Regras do Sistema

### 4.1. Drift e Mini-Turbo
* **Gatilho de Drift:** Ângulo de curva à frente $\ge 35^\circ$ ($\approx 0.61 \text{ rad}$) e velocidade instantânea $\ge 70\%$ da velocidade máxima.
* **Estágio 1 (Azul):** Atingido após 1.2 segundos contínuos de drift sob contraesterço. Concede impulso de +18 km/h por 0.9s.
* **Estágio 2 (Laranja):** Atingido após 2.4 segundos contínuos de drift. Concede superimpulso de +30 km/h por 1.8s.

### 4.2. Sistema de DDA / Rubber Banding
* **Agente Muito à Frente (+4.0s de vantagem sobre o jogador):**
  * Redução da velocidade máxima em **4%**.
  * Frequência reduzida de uso de drift em curvas de raio médio.
  * Precisão de tiro para trás degradada.
* **Agente Muito Atrás (-4.0s de desvantagem sobre o jogador):**
  * Aumento da aceleração em **6%** e velocidade máxima em **3%**.
  * Absorção otimizada de vácuo (*slipstream*).
  * Probabilidade majoritária de rolar itens de alto impacto (Casco Azul, Raio, Super Cogumelo).
* **Trava de Fair Play (Anti-Rubber Banding Final):**
  * Nos últimos 300 metros da 3ª (última) volta, todos os modificadores de DDA são desativados de forma determinística, garantindo que o jogador vença ou perca estritamente por mérito de pilotagem.

### 4.3. LOD de IA (Level of Detail)
* **Karts Próximos ($< 35\text{m}$ do jogador):** Executam raycasting completo, detecção estocástica de micro-colisão e rotações completas de direção das rodas dianteiras.
* **Karts Distantes ($> 80\text{m}$ do jogador):** Avaliação de steering orientada por interpolação direta na spline central, liberando tempo de CPU para o rendering a 60 FPS estáveis.

### 4.4. Sistema de Desbloqueio e Recuperação de IA (Anti-Stuck & Recovery)
* **Projeção Localizada de Spline:** A busca do ponto mais próximo na spline utiliza uma janela deslizante em torno do progresso atual do kart ($t \pm 45$ amostras), eliminando saltos falsos para trechos paralelos em grampos e chicanes.
* **Autoridade de Esterço em Baixa Velocidade:** Karts parados ou lentos mantêm capacidade de esterçamento mínimo ($40\%$), permitindo girar e manobrar para longe das barreiras.
* **Máquina de Recuperação Ativa:**
  * Se a velocidade for $< 3.5 \text{ m/s}$ por $> 1.2\text{s}$, a IA engata marcha à ré e contraesterço por 1.2s.
  * Se persistir travada por $> 3.0\text{s}$, aciona o *Failsafe Auto-Respawn*, recolocando o kart suavemente no centro da pista com velocidade frontal orientada à tangente.
* **Deflexão Dinâmica de Muros:** Ao atingir os limites da barreira, o kart sofre impulso lateral corretivo e alinhamento de guinada (*yaw*), preservando o fluxo de corrida.

### 4.5. Upgrades Gráficos e de Jogabilidade
* **Domo Celeste Atmosférico:** Esfera com gradiente procedural dinâmico (azul profundo, ciano claro e névoa dourada no horizonte).
* **Cenários Ricos:** Arquibancadas detalhadas com blocos de espectadores coloridos e placas de chevron luminoso nas curvas acentuadas.
* **Suspensão Arcade Dinâmica:** Inclinação do chassi (*body roll*) em curvas e afundamento (*pitch*) em arrancadas e frenagens.
* **Efeitos de Velocidade:** Linhas de vento 3D em alta velocidade, marcas de borracha na pista durante drift e ativação tática de vácuo (*slipstream*).
* **Respawn Rápido do Jogador:** Tecla `[R]` executa o reposicionamento instantâneo do kart na pista.

---

## 5. Diretrizes para Manutenção e Próximos Passos

1. **Adição de Novos Circuitos:**
   * Basta definir uma nova lista de pontos de controle para `CatmullRomCurve3` e instanciar em [`Track`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/core/track.js).
2. **Multiplayer Online / WebSocket:**
   * A arquitetura desacoplada do [`Kart`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/entities/kart.js) recebe um objeto simples de `inputs: { accelerate, brake, steerLeft, steerRight, drift }`, permitindo transmissão em rede serializada por WebSocket sem alterações no modelo de física.
3. **Novas Armas e Efeitos:**
   * Estender [`ITEM_TYPES`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/core/constants.js) e a classe [`ItemManager`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/entities/item.js).
