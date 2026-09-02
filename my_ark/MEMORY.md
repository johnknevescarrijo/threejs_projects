# MEMORY.md - Sobrevivência Pré-Histórica (Cel-Shaded)

## 🦖 Visão Geral do Projeto
Jogo de sobrevivência em primeira pessoa em mundo aberto com temática de dinossauros inspirado em ARK: Survival Evolved.
Construído com **Three.js + Vite** em JavaScript ES Modules.
Estilo visual exclusivo: **Cel-shaded pintado à mão com traços grossos de tinta preta (estilo HQ/Comic AAA)**, blocos de cor planos sem gradientes suaves e iluminação escalonada.

---

## 🎨 Diretrizes Visuais Implementadas (Não Negociáveis)
1. **Shading**: Cel-shading com bandas de iluminação discretas (Toon stepped lighting) e realces rim light nítidos.
2. **Contornos (Outlines)**: Traços de tinta preta grossos gerados via técnica Inverted Hull + normal extrusion em TODOS os objetos (terreno, água, árvores, rochas, dinossauros, estruturas, viewmodel).
3. **Céu**: Nuvens fofas 3D arredondadas toon, sol e lua estilizados em disco e transições dinâmicas dia/noite.
4. **Legibilidade de Dinossauros**:
   - *Caçador de Matilha (Raptor)*: Silhueta ágil + Faixas e olhos neon vermelho/laranja brilhante.
   - *Herbívoro (Parasauro/Triceratops)*: Silhueta massiva + Crista e chifres neon verde/amarelo brilhante.
   - *Predador Ápice (T-Rex)*: Silhueta colossal + Espinhos dorsais elétricos em roxo/azul brilhante.
5. **Partículas**: Planas, grossas e estilizadas (lascas de madeira, poeira de passos, faíscas de pedra, sangue estilizado).
6. **4 Biomas Contrastantes**:
   - Costa Tropical (praia de areia dourada, mar azul com espuma plana)
   - Selva Densa (floresta tropical densa, luz dourada quente)
   - Planícies Abertas (savana com acácias e pradarias para herbívoros)
   - Terras Altas (picos rochosos imponentes com névoa fria azulada)

---

## 🕹️ Mecânicas de Gameplay Concluídas
- **Controles em Primeira Pessoa**: Movimento fluido WASD, corrida com consumo de estamina, pulo, balanço de cabeça (head bob) sutil ao andar e dinâmico ao correr, FOV kick no sprint e screenshake ao sofrer dano.
- **Viewmodel em 1ª Pessoa**: Mãos e ferramentas na tela (Punhos, Machado de Pedra, Picareta de Pedra, Lança de Madeira, Tocha de Fogo, Martelo/Holograma de Construção) com animações dinâmicas de golpe, estocada e idle.
- **Coleta de Recursos**: Coleta interativa de Árvores (madeira, palha), Rochas (pedra, sílex), Arbustos (fibra, bagas) com detecção de ferramenta adequada, efeito de impacto e partículas cel-shaded.
- **Sistema de Criação (Crafting)**: Menu completo [TAB / I] com blueprints de ferramentas, armas, estruturas, fogueira e consumíveis.
- **Sistema de Construção com Snapping**: Pré-visualização holográfica (verde se válido, vermelho se inválido) para colocação de Fundações, Paredes, Tetos, Portas e Fogueiras.
- **IA e Domesticação de Dinossauros**:
  - *Raptor*: Comportamento de matilha, detecção de presas, perseguição veloz e salto de ataque.
  - *Herbívoro*: Pastagem pacífica, fuga ao ser atacado, sistema de alimentação com bagas para domesticação. Quando domesticado, segue o jogador lealmente e **pode ser Montado e Cavalgado com [E]** em alta velocidade!
  - *T-Rex*: Predador ápice solitário nas terras altas, rugido com tremor de tela (screenshake), ataque devastador.
- **Ciclo Dia / Noite**: 24h com sol e lua orbitais, tocha dinâmica para iluminar a escuridão.
- **Interface / HUD AAA**: Painéis escuros arredondados com detalhes âmbar/dourado, barras de status (Vida, Estamina, Fome, Sede), barra de atalhos (Hotbar 1-6), Minimapa/Radar com biomas e detecção de dinos, e notificações pop-up.
- **Áudio Procedural**: Web Audio API sintetiza passos, golpes, cortes de árvore, mineração, rugidos de dinossauros, fanfarras e efeitos ambientais.

---

## 📁 Estrutura do Projeto
```
my_ark/
├── index.html                  # Interface HTML/CSS com HUD Âmbar/Dark e telas modais
├── package.json                # Dependências (three, vite)
├── MEMORY.md                   # Documento de memória viva e arquitetura
├── AGENTS.md                   # Regras e especificação do projeto
└── src/
    ├── main.js                 # Inicialização do loop de jogo e orquestração de sistemas
    ├── core/
    │   ├── Engine.js           # Three.js Renderer, WebGL2 pipeline e câmera
    │   ├── InputManager.js     # Pointer Lock, Teclado, Mouse e vetores de movimento
    │   ├── TimeManager.js      # Ciclo Dia/Noite 24h e iluminação atmosférica
    │   └── AudioManager.js     # Sintetizador de efeitos sonoros Web Audio API
    ├── world/
    │   ├── Terrain.js          # Terreno procedural da ilha com 4 biomas e água toon
    │   ├── BiomeManager.js     # Detecção de biomas e climatização
    │   ├── SkyDome.js          # Céu cel-shaded, nuvens volumétricas toon, sol e lua
    │   └── FloraManager.js     # Árvores, rochas e arbustos com contornos pretos
    ├── player/
    │   ├── Player.js           # Física, movimento, stats (Vida, Estamina, Fome, Sede) e montaria
    │   ├── ViewModel.js        # Mãos e ferramentas em 1ª pessoa com animações
    │   ├── Inventory.js        # Sistema de itens, slots e hotbar
    │   ├── CraftingSystem.js   # Blueprints e lógica de criação de itens
    │   └── BuildingSystem.js   # Sistema de construção com encaixe holográfico
    ├── entities/
    │   ├── Dinosaur.js         # Classe base para dinossauros articulados cel-shaded
    │   ├── PackHunter.js       # Raptor (Matilha, ágil, faixas neon vermelho/laranja)
    │   ├── Herbivore.js        # Parasauro (Neutro, domesticável, montável, verde/amarelo)
    │   ├── ApexPredator.js     # T-Rex (Predador solitário, rugido com tremor, azul/roxo)
    │   └── EntityManager.js    # Gerenciador de população e IA dos dinossauros
    ├── shaders/
    │   └── CelShading.js       # Shaders Toon customizados, Inverted Hull e Water Foam
    ├── ui/
    │   ├── HUD.js              # Barras de status, prompt de interação, hotbar
    │   ├── Minimap.js          # Radar do mapa com biomas e detecção de dinos
    │   ├── InventoryUI.js      # Modal de inventário e menu de receitas de crafting
    │   └── NotificationUI.js   # Popups de coleta e alertas de combate
    └── vfx/
        └── ParticleSystem.js   # Partículas estilizadas planas (lascas, fumaça, poeira)
```

---

## ⚡ Como Rodar o Jogo
1. Iniciar o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
2. Ou gerar a versão de produção:
   ```bash
   npm run build
   ```
