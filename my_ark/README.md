# 🦖 Sobrevivência Pré-Histórica (Cel-Shaded 3D)

Um jogo de sobrevivência em primeira pessoa em mundo aberto com temática de dinossauros, inspirado em *ARK: Survival Evolved*, desenvolvido inteiramente com **Three.js** e **Vite** em JavaScript moderno, com estilo visual **Cel-Shaded / Comic HQ AAA**.

![Estilo Visual](https://img.shields.io/badge/Estilo-Cel--Shaded%20Comic-orange?style=for-the-badge)
![Engine](https://img.shields.io/badge/Engine-Three.js%20(WebGL)-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Jogável%20%2F%20Completo-brightgreen?style=for-the-badge)

---

## 🎨 Características Visuais (Cel-Shaded AAA)

- **Toon Shading em Bandas**: Shaders de iluminação escalonada sem gradientes suaves e com *Rim Lighting* dinâmico.
- **Contornos Grossos de Tinta Preta (*Inverted Hull Outlines*)**: Traços marcantes em todos os modelos 3D (terreno, água, árvores, rochas, dinossauros, estruturas e viewmodel).
- **Céu e Nuvens 3D Fofas**: Nuvens arredondadas cel-shaded, sol e lua orbitais em disco e estrelas cintilantes.
- **Água Toon**: Superfície marítima com ondas estilizadas e anéis de espuma nas margens costeiras.
- **Partículas Planas**: Lascas de madeira, poeira de passos, faíscas ao minerar e folhas verdes.

---

## 🌴 Os 4 Biomas da Ilha

1. 🏖️ **Costa Tropical**: Praias de areia dourada e palmeiras, águas calmas e recursos iniciais.
2. 🌴 **Selva Densa**: Floresta tropical densa com luz solar dourada, palmeiras gigantes e rica em fibras.
3. 🌾 **Planícies Abertas**: Savana com acácias e pradarias amplas, território ideal para manadas de herbívoros.
4. ⛰️ **Terras Altas**: Picos rochosos imponentes envoltos em névoa fria azulada, ricos em minérios e lar do predador ápice.

---

## 🦕 Os Dinossauros e Comportamentos (IA)

| Espécie | Tipo | Destaque Visual | Comportamento & Habilidades |
| :--- | :--- | :--- | :--- |
| **Raptor** | Caçador de Matilha | Listras e Olhos Neon Vermelho/Laranja | Hostil, alta velocidade, perseguição e salto de ataque pounce. |
| **Parasauro** | Herbívoro Massivo | Crista e Chifres Neon Verde/Amarelo | Neutro, foge se atacado, **Domesticável por alimentação de Bagas** e **Montável com [E]**! |
| **T-Rex Ápice** | Predador Ápice | Espinhos Dorsais Neon Roxo/Azul Elétrico | Hostil solitário, **rugido aterrador com tremor de tela (*screen shake*)** e mordida devastadora. |

---

## 🕹️ Controles do Jogador

| Tecla / Botão | Ação |
| :--- | :--- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | Movimentação em primeira pessoa |
| <kbd>Mouse</kbd> | Controle de visão / câmera |
| <kbd>Shift Esquerdo</kbd> | Correr (consome estamina e ativa balanço vigoroso) |
| <kbd>Espaço</kbd> | Pular / Desmontar |
| <kbd>C</kbd> | Agachar |
| <kbd>Clique Esquerdo</kbd> | Atacar / Golpear Árvore ou Rocha / Colocar Estrutura |
| <kbd>Clique Direito</kbd> | Cancelar modo de construção |
| <kbd>E</kbd> | Interagir / Colher Arbustos / Alimentar Dinossauro / Montar e Desmontar |
| <kbd>1</kbd> até <kbd>6</kbd> | Selecionar item da Barra Rápida (Hotbar) |
| <kbd>TAB</kbd> ou <kbd>I</kbd> | Abrir Menu de Mochila & Blueprints de Criação (Crafting) |
| <kbd>H</kbd> | Abrir Guia de Ajuda na tela |

---

## 🔨 Sistemas de Gameplay

### 1. Coleta de Recursos
- **Árvores**: Golpear com o *Machado de Pedra* rende grande quantidade de Madeira e pouca Palha. Com a *Picareta*, rende mais Palha.
- **Rochas**: Golpear com a *Picareta de Pedra* rende Pedra e Sílex.
- **Arbustos**: Pressionar <kbd>E</kbd> colhe Fibras e Bagas nutritivas (*Amarberry*, *Mejoberry*).

### 2. Criação (Crafting)
Abra o menu com <kbd>TAB</kbd> para criar:
- **Ferramentas**: Machado de Pedra, Picareta de Pedra, Tocha de Fogo.
- **Armas**: Lança de Madeira (alto alcance).
- **Estruturas**: Fundação, Parede, Teto, Porta de Madeira e Fogueira.

### 3. Construção com Encaixe Holográfico (*Snapping*)
Ao selecionar uma estrutura na hotbar, uma pré-visualização holográfica (verde para válido, vermelho para inválido) é exibida:
- Fundações se alinham ao terreno ou aos cantos de fundações existentes.
- Paredes encaixam nas bordas das fundações ou sobre paredes.
- Tetos encaixam no topo das paredes.
- Fogueiras aquecem noites frias e fornecem luz.

### 4. Domesticação e Montaria
- Aproxime-se de um *Parasauro* tendo **Bagas (Mejoberry roxa)** na barra rápida ou mochila.
- Pressione <kbd>E</kbd> para alimentá-lo e acompanhar a barra de progresso.
- Ao atingir 100%, ele se tornará amigável, seguirá você e você poderá pressionar <kbd>E</kbd> para **montar e cavalgar velozmente pela ilha**!

### 5. Áudio Procedural
Sintetizado nativamente via **Web Audio API** sem arquivos externos pesados:
- Passos de acordo com o terreno (areia, grama, pedra).
- Sons de corte, mineração, rugidos dos dinossauros, fanfarra de domesticação e ambiência de vento e ondas.

---

## 📁 Estrutura de Arquivos

```
my_ark/
├── index.html                  # Interface HUD, Minimapa e Telas Modais
├── package.json                # Configuração e dependências (Three.js, Vite)
├── README.md                   # Documentação do projeto e instruções
├── MEMORY.md                   # Registro arquitetural do projeto
├── AGENTS.md                   # Especificações e regras do jogo
└── src/
    ├── main.js                 # Inicialização do loop de jogo
    ├── core/
    │   ├── Engine.js           # Three.js Renderer e Câmera
    │   ├── InputManager.js     # Pointer Lock, Teclado e Mouse
    │   ├── TimeManager.js      # Ciclo Dia/Noite 24h e Clima
    │   └── AudioManager.js     # Sintetizador de Som Web Audio API
    ├── world/
    │   ├── Terrain.js          # Terreno procedural e Água Toon
    │   ├── BiomeManager.js     # Regras dos 4 Biomas
    │   ├── SkyDome.js          # Céu cel-shaded, nuvens 3D e sol/lua
    │   └── FloraManager.js     # Árvores, Rochas e Arbustos colhíveis
    ├── player/
    │   ├── Player.js           # Física do jogador, stats e montaria
    │   ├── ViewModel.js        # Mãos e ferramentas 3D animadas em 1ª pessoa
    │   ├── Inventory.js        # Mochila, slots e hotbar
    │   ├── CraftingSystem.js   # Blueprints e criação
    │   └── BuildingSystem.js   # Construção holográfica com snap
    ├── entities/
    │   ├── Dinosaur.js         # Classe base e animação procedural dos dinos
    │   ├── PackHunter.js       # Raptor (Matilha, vermelho/laranja neon)
    │   ├── Herbivore.js        # Parasauro (Domesticável/Montável, verde/amarelo neon)
    │   ├── ApexPredator.js     # T-Rex (Ápice, roxo/azul elétrico neon)
    │   └── EntityManager.js    # População e IA dos dinos
    ├── shaders/
    │   └── CelShading.js       # Shaders Toon e Inverted Hull Outlines
    ├── ui/
    │   ├── HUD.js              # Barras de status, prompt e hotbar
    │   ├── Minimap.js          # Radar circular com biomas e detecção de ameaças
    │   ├── InventoryUI.js      # Modal de inventário e criação
    │   └── NotificationUI.js   # Popups de loot e combate
    └── vfx/
        └── ParticleSystem.js   # Partículas cel-shaded
```

---

## 🚀 Como Executar

### Pré-requisitos
- **Node.js** (versão 18+ ou 20+)
- **NPM**

### Instalação e Execução
1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Abra o link gerado no terminal (geralmente `http://localhost:5173`) no seu navegador.

### Gerar Build de Produção
```bash
npm run build
```
Os arquivos otimizados serão gerados na pasta `dist/`.
