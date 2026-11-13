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
| **Texturas Procedurais** | [`src/core/textures.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/core/textures.js) | ✅ Concluído | Gerador de `CanvasTexture` para asfalto, linha de chegada, boost pads, grama, terra, caixas `?` e banners. |
| **Sistema de Partículas 3D** | [`src/core/particles.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/core/particles.js) | ✅ Concluído | Pool de partículas `InstancedMesh` para faíscas de drift, chamas de nitro, poeira off-road e ondas de choque. |
| **Geometria da Pista & Spline** | [`src/core/track.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/core/track.js) | ✅ Concluído | Spline CatmullRom 3D, asfalto texturizado, guardrails 3D, boost pads luminosos, lago central, nuvens e pórtico com semáforo. |
| **Câmera de Acompanhamento** | [`src/core/camera.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/core/camera.js) | ✅ Concluído | Câmera com intro no grid, 3 modos (`[C]`), visão traseira (`[Q]`), FOV dinâmico e inclinação lateral em drift. |
| **Entidade Kart 3D** | [`src/entities/kart.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/entities/kart.js) | ✅ Concluído | Modelo 3D detalhado (`RoundedBoxGeometry`, pintura automotiva `clearcoat`), piloto animado, pulo de drift (*hop*) e *slip angle*. |
| **Caixas de Itens** | [`src/entities/itemBox.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/entities/itemBox.js) | ✅ Concluído | Cubos translúcidos arco-íris com textura `?`, núcleo cristalino giratório e respawn suave. |
| **Gerenciador de Itens** | [`src/entities/item.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/entities/item.js) | ✅ Concluído | Modelos 3D detalhados de Cascos (Verde, Vermelho, Azul com espinhos), Banana, Cogumelo e Raio com feixe do céu. |
| **Sensores Espaciais** | [`src/ai/sensors.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/ai/sensors.js) | ✅ Concluído | Emissão de raios frontais, laterais, traseiros e scan de boost pads com debug visual (`[B]`). |
| **Controlador de IA** | [`src/ai/aiController.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/ai/aiController.js) | ✅ Concluído | Pipeline de 4 camadas, direção proporcional suave, DDA com trava de fair play nos últimos 300m, LOD e FSM de itens. |
| **Arquétipos de Piloto** | [`src/ai/archetypes.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/ai/archetypes.js) | ✅ Concluído | O Agressivo (Rex), O Técnico (Aria) e O Tático/Defensivo (Vance) com parâmetros calibrados. |
| **Sistema de Som** | [`src/audio/sound.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/audio/sound.js) | ✅ Concluído | Sintetizador procedural duplo com Web Audio API para motor, contagem de largada, turbo, drift e itens. |
| **HUD & UI Arcade** | [`src/ui/hud.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/ui/hud.js) & [`src/ui/style.css`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/ui/style.css) | ✅ Concluído | Torre de classificação ao vivo, semáforo de largada, alerta de ameaça teleguiada, velocímetro com marchas e minimapa. |
| **Loop Principal da Aplicação** | [`src/main.js`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/main.js) | ✅ Concluído | Cena Three.js com `RoomEnvironment` PBR, pós-processamento `UnrealBloomPass` (`[G]`), sombra dinâmica e largada turbo. |

---

## 4. Parâmetros e Regras do Sistema

### 4.1. Drift e Mini-Turbo
* **Gatilho de Drift:** Ângulo de curva à frente $\ge 35^\circ$ ($\approx 0.61 \text{ rad}$) e velocidade instantânea $\ge 70\%$ da velocidade máxima, iniciando com um pulo físico (*hop*) e ângulo de deslizamento (*slip angle*).
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
* **Autoridade de Esterço em Baixa Velocidade:** Karts parados ou lentos mantêm capacidade de esterçamento mínimo ($42\%$), permitindo girar e manobrar para longe das barreiras.
* **Máquina de Recuperação Ativa:**
  * Se a velocidade for $< 3.5 \text{ m/s}$ por $> 1.2\text{s}$, a IA engata marcha à ré e contraesterço por 1.1s.
  * Se persistir travada por $> 3.0\text{s}$, aciona o *Failsafe Auto-Respawn*, recolocando o kart suavemente no centro da pista com velocidade frontal orientada à tangente.
* **Deflexão Dinâmica de Muros:** Ao atingir os limites da barreira, o kart sofre impulso lateral corretivo e alinhamento de guinada (*yaw*) pelo menor arco angular (`lerpAngle`), preservando o fluxo de corrida.

### 4.5. Upgrades Gráficos, Pós-Processamento e Jogabilidade
* **Iluminação PBR & Pós-Processamento:** Mapa de ambiente `RoomEnvironment` via `PMREMGenerator` para reflexos metálicos e verniz automotivo (`clearcoat`), aliado a `EffectComposer` + `UnrealBloomPass` (alternável com `[G]`) e câmera de sombra `2048x2048` que acompanha o jogador.
* **Texturas Procedurais de Alta Nitidez:** Asfalto granulado com trilho de borracha, faixas laterais, linha tracejada, faixa quadriculada de chegada, *Boost Pads* animados em neon, grama com listras de corte e banners de patrocinadores.
* **Sistema de Partículas 3D (`InstancedMesh`):** Faíscas físicas de drift (azul/laranja), labaredas nos escapamentos duplos, poeira/grama no off-road, ondas de choque do Casco Azul e raios caindo do céu.
* **Largada 3-2-1-GO! e Arrancada Turbo (*Rocket Start*):** Semáforo 3D no pórtico sincronizado com a contagem regressiva e bônus de turbo ao segurar o acelerador no tempo certo.

### 4.6. Sistema de Moedas, Slot Duplo de Itens e Escudo Traseiro (Feature 1)
* **Moedas na Pista (0–10):** Coletar moedas adiciona +1.2% de velocidade máxima contínua (máximo de +12%) e confere um micro-boost instantâneo de velocidade. Ao sofrer impacto de armas ou obstáculos, o piloto perde até 3 moedas físicas.
* **Slot Duplo de Itens & Caixas 2X:** Suporte a dois slots de armazenamento de power-ups simultâneos (Primário e Secundário), com roleta dupla de itens e caixas duplas douradas (`2X`) posicionadas estrategicamente na pista e atalhos.
* **Escudo Traseiro Ativo:** Segurar a tecla de disparo (**`E`**) ou pressionar **`F`** trava cascas de banana ou cascos na traseira do chassi do kart, absorvendo impactos diretos de projéteis rivais (Cascos Verdes e Vermelhos).
* **Novos Itens de Combate:**
  * `SUPER_STAR`: Efeito rainbow estroboscópico, velocidade extra (+18 km/h), aceleração multiplicada por 1.4x e imunidade completa a danos e obstáculos.
  * `GOLDEN_MUSHROOM`: Dispara rajadas turbo repetidas ilimitadas por 5.5s.
  * `FAKE_ITEM_BOX`: Caixa armadilha vermelha/alaranjada com ponto de interrogação `?` invertido.

### 4.7. Balística Vertical, Rampas de Salto, Manobras Aéreas e Ultra Mini-Turbo (Feature 2)
* **Gravidade e Física Vertical:** Implementação de velocidade vertical $v_y$, gravidade ($g = 25\text{ m/s}^2$) e rotação de arqueamento balístico (*pitch*) em voo.
* **Quatro Rampas de Salto 3D:** Construídas com chevrons direcionais de impulsão e lips de neon pulsantes nos trechos $t = 0.12, 0.38, 0.85$ e no atalho off-road.
* **Sistema de Manobras Aéreas (*Trick Stunts*):** Pressionar a tecla de salto/drift ao passar pela crista da rampa ou em voo ativa acrobacias 3D dinâmicas (giro 360° em Y ou *barrel roll* helicoidal em X/Z), concedendo **Trick Boost** com efeito de partículas ao aterrissar.
* **Ultra Mini-Turbo (Estágio 3 - Roxo/Magenta):** Estágio superior de drift carregado aos 3.4s, concedendo surto de 2.7s a +42 km/h.
* **Caixas e Moedas Aéreas:** Colecionáveis suspensos em arcos verticais pós-rampa acessíveis apenas via salto perfeitamente alinhado.

### 4.8. Redesign de Pista, Banking 3D, Túnel Neon, Perigos e Seletor de 3 Circuitos (Feature 3)
* **Banking 3D nas Curvas:** Cálculo automático da curvatura transversal suave com peralte lateral de até $\approx 9.2^\circ$ ($0.16\text{ rad}$), orientando asfalto, zebras, guardrails e a física de inclinação (*roll*) dos karts.
* **Túnel Iluminado em Neon ($t \in [0.44, 0.53]$):** Arcos estruturais octogonais com anéis de néon multicoloridos em onda senoidal de intensidade luminosa e teto aerodinâmico escuro translúcido.
* **Pilares de Viaduto Estruturais:** Suportes arquitetônicos duplos de concreto armado e anéis de aço que descem das seções elevadas da pista ($y > 2.8\text{m}$) até o solo, eliminando qualquer visual de estrada flutuante.
* **Zonas Especiais de Superfície:**
  * **Gelo (`ICE`):** 2 trechos azul-translúcidos reflexivos que concedem +5% de top speed e reduzem o grip lateral, permitindo longos drifts controlados.
  * **Lama (`MUD`):** 3 manchas viscosas nas chicanes que reduzem velocidade e aceleração em ~50%, a menos que o piloto utilize turbo ou estrela.
* **Obstáculos Dinâmicos da Pista (`this.hazards`):** 4 pilares/martelos oscilantes suspensos por pórticos de trilho com textura diagonal de advertência amarelo/preto e núcleo neon vermelho pulsante, com evasão ativa pela IA e colisão que causa spin-out.
* **Seletor de 3 Circuitos Temáticos (`CIRCUITS`):**
  * Alternância via botão **`PISTA [T]`** ou atalho de teclado **`T`**, salvo com persistência em `sessionStorage`:
    1. `GRAND_PRIX`: Copa Solar clássica ensolarada, grama verde, lago central e montanhas.
    2. `SUNSET_DUNES`: Deserto ao pôr-do-sol crepúsculo com areia dourada, 3 grandes pirâmides egípcias 3D no horizonte, oásis de água turquesa e palmeiras.
    3. `CYBER_NEON`: Metrópole noturna cyberpunk synthwave com mais de 40 arranha-céus 3D iluminados por faixas neon cyan/magenta, asfalto digital e iluminação retrowave.

---

## 5. Diretrizes para Manutenção e Próximos Passos

1. **Adição de Novos Circuitos:**
   * Basta definir uma nova lista de pontos de controle para `CatmullRomCurve3` e instanciar em [`Track`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/core/track.js).
2. **Multiplayer Online / WebSocket:**
   * A arquitetura desacoplada do [`Kart`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/entities/kart.js) recebe um objeto simples de `inputs: { accelerate, brake, steerLeft, steerRight, drift }`, permitindo transmissão em rede serializada por WebSocket sem alterações no modelo de física.
3. **Novas Armas e Efeitos:**
   * Estender [`ITEM_TYPES`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/core/constants.js) e a classe [`ItemManager`](file:///home/john/Programacao/Estudos/threejs_projects/my_kart/src/entities/item.js).
