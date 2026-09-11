# AGENTS.md — Sistema de IA e Agentes Autônomos (Estilo Kart Racing)

Este documento descreve a arquitetura, máquinas de estado, comportamentos e balanceamento dinâmico dos agentes autônomos (pilotos controlados por IA) para o jogo de corrida arcade.

---

## 1. Visão Geral da Arquitetura

Cada kart autônomo opera sob um pipeline desacoplado em 4 camadas de decisão executadas por tick de física:

---
## 2. Percepção e Sensores (Context Awareness)

Os agentes não leem a memória do jogo de forma onisciente; eles utilizam sensores espaciais para reagir naturalmente ao ambiente:

* **Waypoint Ribbon / Spline:** Linha central e largura da pista, identificando curvatura à frente, atalhos e zonas de velocidade.
* **Raycasts de Proximidade:**
  * Frontal longo (15m–25m): detecção de obstáculos estáticos, cascas e karts lentos.
  * Diagonais e laterais (3m–6m): detecção de ultrapassagens e risco de colisão lateral.
  * Traseiro (10m): alerta contra projéteis se aproximando ou tentativas de vácuo.
* **Scan de Colecionáveis / Ameaças:** Esfera de detecção em raio ajustável para caixas de itens, moedas e projéteis teleguiados.

---

## 3. Comportamento de Direção e Navegação (Steering)

A movimentação combina interpolação de splines com comportamentos de steering (Reynolds):

* **Racing Line Adaptativa:** O kart não segue o centro fixo da pista. O nó-alvo varia entre:
  * Traçado ideal (tangenciamento clássico: fora-dentro-fora).
  * Traçado defensivo (bloqueio do centro quando sob pressão).
  * Traçado de coleta (desvio em direção a caixas de itens/moedas).
* **Mecânica de Drift e Mini-Turbo:**
  * Se o ângulo da curva à frente for superior a **35°** e a velocidade exceder **70%** da máxima, o agente inicia um drift.
  * O ângulo do contraesterço é recalculado dinamicamente para manter o raio de giro.
  * O drift é encerrado assim que o estágio de Mini-Turbo desejado (Azul/Laranja) for carregado e a pista se alinhar.
* **Atalhos e Superfícies (Off-road):**
  * Superfícies de desaceleração (grama, areia) são tratadas como bloqueios de custo alto na malha de navegação.
  * **Exceção de Atalho:** Se o agente possuir um item de impulso (ex: cogumelo/turbo) ou invulnerabilidade (estrela), a navegação reavalia o atalho off-road como rota primária.

---

## 4. Árvore de Decisão de Itens (Item Usage FSM)

O uso de itens segue critérios de oportunidade, risco e contexto de corrida:

| Categoria de Item | Gatilho de Uso Primário | Gatilho Alternativo / Defesa |
| :--- | :--- | :--- |
| **Projétil Direto** (ex: Casco Verde) | Alvo visível em linha reta frontal desobstruída (distância < 20m). | Arremesso para trás se um rival tentar ultrapassagem próxima. |
| **Projétil Teleguiado** (ex: Casco Vermelho) | Rival diretamente à frente em alcance sem escudo defensivo. | Manter equipado como cauda defensiva se for alvo de alerta sonoro. |
| **Item de Solo** (ex: Casca de Banana, Bomba) | Soltar em passagens estreitas, ápice de curvas ou logo atrás de caixas de itens. | Arremesso frontal preventivo contra líderes agrupados. |
| **Impulso Instantâneo** (ex: Turbo / Cogumelo) | Entrada de retas longas, rampas com acrobacia ou corte de curvas em terreno ruim. | Recuperação imediata após colisão, rodopio ou queda. |
| **Itens de Choque em Área** (ex: Raio / Azul) | Disparo imediato se o agente estiver entre as posições P8–P12. | Atraso intencional caso o líder esteja a ponto de cruzar um abismo. |

---

## 5. Sistema de Rubber Banding / Catch-Up (DDA)

Para garantir corridas disputadas sem parecer injusto ao jogador, o sistema de ajuste dinâmico de dificuldade modula as propriedades do agente com base na distância até o jogador humano:

* **Agente muito à frente (+4s de vantagem):**
  * Redução da velocidade máxima em até **4%**.
  * Frequência reduzida de uso de drifts em curvas médias.
  * Menor precisão de pontaria ao atirar projéteis não-guiados para trás.
* **Agente muito atrás (-4s de desvantagem):**
  * Aumento da aceleração em **6%** e velocidade máxima em **3%**.
  * Precisão perfeita no aproveitamento de vácuo (slipstream).
  * Probabilidade elevada de rolagem de itens de alto impacto.
* **Trava de Fair Play:** O DDA é desligado nos últimos 300 metros da volta final para preservar a integridade da vitória do jogador.

---

## 6. Personalidades dos Pilotos (Archetypes)

Cada piloto recebe modificadores numéricos aplicados sobre a IA base:

* **O Agressivo:**
  * Prioriza uso ofensivo de itens; tenta abalroar rivais mais leves; esterça agressivamente em disputas de curva.
  * *Stats:* Agressividade 0.9 | Precisão 0.6 | Risco de Atalho 0.8.
* **O Técnico:**
  * Traçado limpo quase perfeito; maximiza Mini-Turbos em todas as curvas; evita contato físico.
  * *Stats:* Agressividade 0.2 | Precisão 0.95 | Risco de Atalho 0.4.
* **O Tático / Defensivo:**
  * Retém cascas e itens de escudo na traseira para proteção; bloqueia ativamente linhas de ultrapassagem.
  * *Stats:* Agressividade 0.5 | Precisão 0.8 | Defesa 0.95.

---

## 7. Critérios de Performance e Otimização

* **Tick Rate de Decisão:** 10 Hz a 20 Hz para avaliação de itens e táticas; 60 Hz estrito apenas para steering e física imediata.
* **LOD de IA (Level of Detail):**
  * *Karts Próximos (<30m):* Raycasting completo, física detalhada de colisão e micro-correções de volante.
  * *Karts Distantes (>80m):* Movimentação orientada diretamente pela spline central com interpolação geométrica simplificada e consumo reduzido de CPU.
