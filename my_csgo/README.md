# 🎯 CS:GO Three.js Clone

Um clone minimalista, rápido e funcional do **Counter-Strike: Global Offensive** desenvolvido diretamente para o navegador utilizando **Three.js** e **Vite**.

O projeto adota uma filosofia **100% procedural**: todos os modelos 3D das armas e personagens, texturas do mapa, sistemas de partículas e efeitos sonoros são sintetizados e gerados em tempo de execução via código, eliminando dependências de assets binários externos pesados e garantindo carregamento instantâneo.

---

## 🌟 Funcionalidades Principais

### 🗺️ Mapa Tático (Dust II Mini)
- **Bombsite A**: Plataforma elevada com rampa de acesso tático e demarcações "A".
- **Cover Spots**: Caixas de madeira empilhadas no estilo clássico CS, container industrial de metal, arco/túnel e pontos de estrangulamento.
- **Texturas Procedurais em Canvas**: Arenito, blocos de tijolo desgastados e caixas com tiras metálicas e rebites gerados em tempo real.
- **Sistema de Colisão Sólida**: Bounding Boxes (AABB) impedem atravessar paredes/caixas e permitem subir em plataformas e rampas.
- **Gráficos & Iluminação em Alta Definição**: Domo de céu atmosférico com horizonte do deserto, iluminação dinâmica com sombras suaves (PCFSoftShadowMap), texturas em alta resolução (1024x1024) com relevo em *bump map*, barris metálicos industriais e lanternas táticas.

### 🔫 Armas Ícones em Alta Resolução (Viewmodel HD) com Braços Táticos
- **Braços e Luvas em Primeira Pessoa**:
  - Modelagem procedural de braços com farda SAS/CT e luvas táticas de combate com reforço em fibra de carbono nos nós dos dedos e aderência na palma.
  - Empunhadura realista e anatômica específica para cada arma (empunhadura de duas mãos na Desert Eagle e empunhadura tática no guarda-mão da AK-47).
- **Texturas Procedurais Detalhadas**:
  - Madeira nobre cerejeira com veios envernizados na coronha, punho e guarda-mão da AK-47.
  - Aço estampado/fosfatizado (*gunmetal*) no corpo e pente curvo 30 tiros.
  - Cromo escovado com serrilhas de manobra e trilho Picatinny na Desert Eagle.
  - Painéis de empunhadura da Deagle com acabamento em zigrinado (*diamond checkering*) e medalhão com a águia clássica.
- **Efeitos Cinéticos e Animações Dinâmicas**:
  - **Blowback & Recoil**: Recuo da culatra/slide da Deagle e do ferrolho da AK-47 ao disparar.
  - **Ejeção Física de Cartuchos**: Cápsulas douradas de latão ejetadas lateralmente a cada tiro com física tridimensional, rotação e quique no chão.
  - **Recarregamento Automático**: Ao esvaziar o pente (0 balas), a arma recarrega automaticamente com inclinação fluida se houver reserva.

### 🤖 Sistema de Times: Bots Aliados (CT) & Bots Inimigos (Terroristas)
- **Modo Tático CT vs Terroristas (3v3)**:
  - **Jogador + Bots Aliados CT** (`CT_Alpha`, `CT_Bravo`) contra **Bots Terroristas** (`T_Phoenix`, `T_Leet`, `T_Balkan`).
- **Modelos 3D Específicos por Time**:
  - **Time CT (Aliados)**: Fardamento azul marinho, colete balístico, capacete Kevlar com visor tático e marcador holográfico de aliado 3D sobre a cabeça (`▲ CT_Alpha`).
  - **Time Terrorista (Inimigos)**: Fardamento camuflado do deserto, colete marrom, bandanas vermelhas/máscaras e óculos táticos escuros.
- **Inteligência Artificial de Combate & Combate Bot-vs-Bot**:
  - Aliados CT patrulham e atacam apenas inimigos Terroristas.
  - Terroristas caçam o jogador e os bots aliados CT.
  - Bots podem se enfrentar e se eliminar reciprocamente com traçantes, sangue e registros no placar.
  - Proteção contra fogo amigo para manter a integridade da equipe aliada.
- **Hitboxes Críticas**: Cabeça (Headshot com som de *Dink* metálico e 4x de dano) e Corpo/Pernas.
- **Respawn Automático**: Renascimento em waypoints seguros após 4 segundos.

### 🖥️ HUD & Placar de Equipes
- **Placar de Equipes Dinâmico**: Top HUD moderno com contador de rodadas **[CT 0] [Timer] [0 T]** e estatísticas pessoais de Kills e Deaths.
- **Killfeed Colorido com Identificação de Time**: Notificações no canto superior direito no formato `CT_Alpha [M4A1] T_Phoenix` e `Player [AK-47] 🎯 HEADSHOT T_Leet` com cores azul (CT) e vermelho (T).
- **Mira Dinâmica (Crosshair Verde)**: Expansão proporcional ao recuo e velocidade.
- **Hitmarkers e Efeitos de Impacto**: Decais de buracos de bala nas paredes, faíscas metálicas, puffs de poeira e ejeção contínua de cartuchos.

---

## 🎮 Controles

| Tecla / Ação | Função |
|---|---|
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | Mover o jogador |
| <kbd>Mouse</kbd> | Olhar / Mirar (com Pointer Lock) |
| <kbd>Botão Esquerdo do Mouse</kbd> | Disparar |
| <kbd>R</kbd> | Recarregar a arma |
| <kbd>1</kbd> | Selecionar AK-47 |
| <kbd>2</kbd> | Selecionar Desert Eagle |
| <kbd>Scroll do Mouse</kbd> | Alternar entre armas |
| <kbd>Espaço</kbd> | Pular |
| <kbd>Ctrl</kbd> ou <kbd>C</kbd> | Agachar |
| <kbd>Shift</kbd> | Caminhar silenciosamente |
| <kbd>Esc</kbd> | Liberar o cursor do mouse |

---

## 📂 Estrutura do Projeto

```
my_csgo/
├── index.html                  # Estrutura HTML, HUD tático e telas de menu
├── package.json                # Configuração do Vite e Three.js
├── README.md                   # Documentação geral do projeto
├── AGENTS.md                   # Guia e convenções para desenvolvimento com IA
├── MEMORY.md                   # Decisões de arquitetura, balanceamento e roadmap
└── src/
    ├── main.js                 # Inicialização da cena, loop de render e combate
    ├── style.css               # Tema visual do CS:GO para HUD e overlays
    ├── audio/
    │   └── soundManager.js     # Sintetizador procedural Web Audio API (SFX)
    ├── entities/
    │   ├── player.js           # Controlador em 1ª pessoa, física e colisões
    │   ├── bot.js              # IA dos inimigos, modelo 3D e hitboxes
    │   └── weapon.js           # Gerenciador de armas, modelos 3D, spray e recoil
    └── world/
        ├── map.js              # Mapa Dust II mini, texturas procedurais e colisores
        ├── decals.js           # Gerenciador de furos de bala nas paredes/caixas
        └── particles.js        # Sistema de partículas (sangue, faíscas, traçantes)
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior instalado.

### Passo a Passo

1. **Instale as dependências**:
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

3. **Acesse no seu navegador**:
   Abra o endereço indicado no terminal (normalmente `http://localhost:5173`).

4. **Compilação para Produção (Build)**:
   ```bash
   npm run build
   ```
   Os arquivos otimizados serão gerados na pasta `dist/`.

---

## ⚙️ Tecnologias Utilizadas

- **[Three.js](https://threejs.org/)**: Renderização 3D WebGL, iluminação sombreada em tempo real (PCFSoftShadowMap) e gerenciamento de cenas.
- **[Vite](https://vitejs.dev/)**: Ferramenta de build e desenvolvimento ultra-rápida.
- **Web Audio API**: Geração e síntese procedural de efeitos sonoros sem arquivos de áudio externos.
- **HTML5 Canvas API**: Criação dinâmica de mapas de textura procedural.

---

## 🧭 Plano de Análise Técnica e Evolução Arquitetural

Esta seção documenta o diagnóstico detalhado da base de código atual do `my_csgo` e define o plano técnico para evoluir o projeto rumo a uma experiência completa inspirada no **CS 1.6 / CS:GO**, com meta de qualidade visual equivalente ao **CS:GO em 1080p no Low (60–144 FPS)**.

---

### 1. Análise Técnica do Código Atual (`my_csgo`)

O projeto atual é construído em **JavaScript Vanilla (ES Modules)** sobre **Three.js `^0.185.1`** e **Vite `^8.2.2`** (`package.json`), mantendo todos os assets 100% procedurais sem arquivos externos.

#### 1.1 Diagnóstico Módulo a Módulo

| Módulo / Arquivo | Implementação Atual Observada | Pontos de Atenção & Limitações Técnicas |
|---|---|---|
| **`src/main.js`** (`Game`) | Inicializa `WebGLRenderer` (`antialias: true`, `PCFSoftShadowMap`, `ACESFilmicToneMapping` com exposição `1.05`, `pixelRatio <= 2`) e uma única `PerspectiveCamera(75, ..., 0.05, 1000)`. Executa `setAnimationLoop` com `delta = Math.min(clock.getDelta(), 0.1)`. Gerencia spawn fixo de 5 bots (2 CT, 3 T), raycast de tiro e placar de kills. | Loop físico acoplado ao framerate (sem *fixed timestep*, tornando pulos e colisões sensíveis a FPS variável). Câmera única para cenário e viewmodel sem camada de profundidade separada (risco de a arma atravessar paredes de perto). Registra listener para `#btn-respawn` inexistente em `index.html` e limita `wheel` a alternar apenas `ak47`/`deagle`. |
| **`src/world/map.js`** (`DustMap`) | Constrói arena 70×70m proceduralmente via primitivas (`BoxGeometry`, `CylinderGeometry`, `PlaneGeometry`, `ConeGeometry`, `SphereGeometry`) e gera 9 texturas em `CanvasTexture` (incluindo `groundTexture` e `wallTexture` 1024×1024 + `bumpMap` 512×512). Usa 1 `HemisphereLight`, 1 `DirectionalLight` (shadow map `2048x2048`, frustum `[-45, 45]`), 4 `PointLight`s e `FogExp2`. | Cada parede, caixa, barril, saco de areia (`7` meshes × 3 barricadas) e palmeira (`~34` meshes por árvore) é um `THREE.Mesh` individual — alto número de draw calls sem batching/instancing. Texturas `CanvasTexture` não configuram `colorSpace = THREE.SRGBColorSpace` nem possuem mapas PBR completos (`normalMap`, `roughnessMap`, `metalnessMap`, `aoMap`). Não há `PMREMGenerator`/EnvMap para reflexos reais em metais. `_addBoxCollider` usa `Box3().setFromObject()`, inflando AABBs de objetos rotacionados (ex: Double Doors), e `rampMesh`/`cwRampMesh` estão em `raycastMeshes` mas **fora** de `colliders`. |
| **`src/entities/player.js`** (`Player`) | Controlador FPS com `YXZ`, Pointer Lock, corrida (`6.2 m/s`), walk (`3.2 m/s`), agachamento (`2.0 m/s`, altura `1.7m` → `1.05m`), pulo (`8.0 m/s`) e gravidade (`24.0 m/s²`). Colisão separada por eixos X/Z contra `map.colliders` (`radius = 0.45m`) e auto-respawn em `2.5s`. | Diferente de `Bot`, `Player` não possui `_getGroundHeight()` contínuo para rampas: como `rampMesh` e `cwRampMesh` não estão em `colliders`, o jogador não sobe rampas inclinadas suavemente. Não há colisão contínua (*swept collision*) contra tunneling em quedas de FPS, nem *step-offset* para degraus. `respawn()` usa posição fixa `(0, 1.7, -20)`. |
| **`src/entities/bot.js`** (`Bot`) | IA com 3 estados (`PATROL`, `ENGAGE`, `DEAD`), 5 bots com nomes/times fixos, hitboxes separadas (`body` e `head`), animação simples de pernas (`walkCycle`), oclusão via `Raycaster` em `_canSeeTarget` (alcance `35m`) e `_botShoot` com 3-round burst. | `_getGroundHeight(x, z)` tem coordenadas **hardcoded** apenas para a plataforma A (`x: 10..26, z: 10..26`) e rampa A (`x: 16..20, z: 2..10`), ignorando a rampa do Catwalk (`x: 8.5, z: 3.2`). Navegação é apenas uma lista cíclica de 16 `waypoints` (sem pathfinding/NavMesh; `stuckTimer > 0.8s` só avança o índice). Cada bot adiciona uma `PointLight` (`muzzleLight`) à cena (custo de shader por luz) e usa `setTimeout` fora do loop do jogo; acertos usam probabilidade fixa (`Math.random() < 0.65`) e `weaponName` hardcoded (`M4A1`/`AK-47`). |
| **`src/entities/weapon.js`** (`WeaponManager`) | Dicionário com `ak47` e `deagle`, viewmodels procedurais + braços/luvas táticas acoplados por arma, texturas `CanvasTexture` (`512x512`/`256x256`), blowback de ferrolho/slide, draw animation e auto-reload. | Estrutura acoplada a 2 armas e geometria de braços duplicada por arma (sem rig esquelético compartilhado). Dispersão usa `Math.random()` uniforme dentro de `currentSpread` (sem *spray pattern* determinístico) e recuo inclina apenas `weaponRoot`, sem *viewpunch* real na câmera. `update()` aloca `new THREE.Vector3(0, 0, 0)` todo frame (`lerp`). |
| **`src/world/particles.js`** (`ParticleSystem`) & **`src/world/decals.js`** (`DecalManager`) | `DecalManager` mantém fila FIFO com `maxDecals = 60` reutilizando `PlaneGeometry(0.18, 0.18)`. `ParticleSystem` gerencia faíscas, poeira, sangue, traçantes, cápsulas de latão (`CylinderGeometry`) e 240 partículas de poeira ambiente. | **Gargalo de GC e GPU**: `ParticleSystem` cria e descarta `BufferGeometry` + `PointsMaterial` / `LineBasicMaterial` a cada impacto ou tiro (e recria `BufferAttribute` dos traçantes a cada frame). `DecalManager` instancia um `new MeshBasicMaterial` por furo de bala e não faz *clipping* em quinas. Cápsulas quicam hardcoded em `y <= 0.02` (ignoram plataformas elevadas como Bombsite A a `1.2m`) e geram draw calls individuais. |
| **`src/audio/soundManager.js`** (`SoundManager`) | Sintetizador Web Audio API procedural (`playAK47`, `playDeagle`, `playBotShot`, `playHeadshot`, `playHitmarker`, `playReload`, `playFootstep`, `playWeaponSwitch`, `playDryFire`). | Áudio 100% 2D (sem `PannerNode` / atenuação espacial 3D para localizar passos e tiros por direção e distância). `playAK47` e `playDeagle` alocam e preenchem um novo `AudioBuffer` de ruído a cada disparo em vez de reutilizar buffers pré-gerados. |
| **`src/ui/hud.js`** (`HUD`) & **`index.html` / `src/style.css`** | HUD tático completo com placar CT/T, K/D, timer, vida/colete, munição, crosshair dinâmica, hitmarker e killfeed animado. | `hud.js` busca `#crosshair` (enquanto `index.html` usa `#crosshair-container`), decrementa timers de hitmarker/dano usando `0.016` fixo em vez do `delta` real e atualiza textos/estilos do DOM todo frame sem *dirty-checking*. |

#### 1.2 Pontos Fortes vs. Gargalos e Limitações

| Dimensão | Pontos Fortes Atuais | Gargalos / Limitações para Evolução |
|---|---|---|
| **Renderização & Visual** | Carregamento instantâneo (zero assets pesados), ACES Filmic Tone Mapping ativo e identidade visual coerente de deserto. | Ausência de Lightmaps/AO pré-calculados, falta de EnvMap/IBL para metais, shadow map único cobrindo 90×90m (~22 px/m, serrilhado de perto) e ausência de modelos/animações esqueléticas `.glb`. |
| **Física & Colisões** | Movimentação responsiva inspirada no CS (`run`/`walk`/`crouch`), colisão X/Z separada funcional em caixas ortogonais. | `Box3` não suporta rampas reais, geometrias anguladas ou degraus suaves (*step-up*); acoplamento ao FPS do render; `Player` não lê altura de rampas. |
| **Mapas & IA** | Layout compacto que valida rapidamente combate 3v3 Bot-vs-Bot com proteção de fogo amigo e oclusão por raycast. | Geometria e altura de solo hardcoded em `map.js`/`bot.js`; IA sem NavMesh (apenas waypoints lineares), sem campo de visão (visão 360° no raio) e sem objetivo de round (C4). |
| **Balística & Armas** | Troca de armas sem sobreposição, blowback mecânico, ejeção de cápsulas e diferenciação clara AK vs Deagle. | Apenas 2 armas; sem sistema de slots (1–5), faca, granadas, spray pattern determinístico, queda de dano por distância (*falloff*) ou penetração em madeira (*wallbang*). |
| **Performance & Memória (GC)** | Cena pequena atual roda leve na maioria das GPUs integradas. | Alocação contínua de geometrias/materiais em partículas, traçantes e decais; dezenas de draw calls separados para props repetidos e palmeiras; `PointLight` dinâmica por bot. |

---

### 2. Plano de Melhoria de Mapa (Inspirado no CS 1.6)

#### 2.1 Comparativo Técnico de Mapas Clássicos do CS 1.6

| Mapa (CS 1.6) | Dimensões / Escala Aprox. | Características Táticas | Adequação Técnica para o `my_csgo` |
|---|---|---|---|
| **`de_dust2` (Completo)** | ~100m × 100m (3 rotas principais) | Clareza visual máxima, linhas de visão limpas (Long A, Mid/Catwalk, Túneis B), verticalidade moderada e 2 Bombsites icônicos. | **Alta (Recomendado como mapa principal)**. Evolução natural do *Dust II Mini* atual; permite entrega incremental por setores e exige baixo orçamento de polígonos. |
| **`de_inferno`** | ~95m × 90m | Corredores estreitos (*Banana*, *Apartments*), muitos cantos cegos, interiores de casas e forte dependência de granadas para limpar ângulos. | **Média**. Exige alta densidade de props/interiores, iluminação interna bem assada (lightmaps obrigatórios) e NavMesh muito refinado para bots não travarem em portas. |
| **`de_nuke`** | ~90m × 80m (2 andares sobrepostos) | Verticalidade extrema (Site A sobre Site B, dutos, rampas externas). | **Baixa no curto prazo**. Sobreposição vertical exige áudio 3D HRTF vertical impecável, NavMesh multi-camada e PVS/culling rigoroso. |
| **`fy_pool_day`** | ~28m × 28m | Arena pequena simétrica com piscina central, combate imediato e armas no chão. | **Alta como mapa secundário/benchmark**. Ideal para testar arsenal, respawn rápido, shaders de água/azulejo e performance de tiroteio intenso antes do `de_dust2` completo. |

#### 2.2 Recomendação e Escopo Progressivo do Mapa Alvo (`de_dust2` 1.6)

- **Estratégia em 2 Níveis**: usar **`fy_pool_day`** como arena de validação rápida (armas, física e VFX) e evoluir o cenário principal para o **`de_dust2` clássico do CS 1.6** completo em escala real (`1m ≈ 52.5 Hammer Units`, jogador em pé `1.7m` / agachado `1.05m`, aberturas de portas duplas `~3.4m`).
- **Zonas, Callouts e Fluxo**:
  - **Lado A**: *T Spawn* → *Long Doors* (porta dupla + quartinho escuro) → *Long A* + *Pit* (depressão para AWP) → *A Ramp* → *Bombsite A* (*Goose*, *A Boxes*, *Car*).
  - **Centro / Short**: *Suicide* → *Mid* → *Mid Doors* → *Xbox* (caixa para *self-boost*/salto para *Catwalk*) → *Short A / Catwalk* → *Bombsite A*.
  - **Lado B**: *Upper/Lower Tunnels* → *Bombsite B* (*B Doors*, *B Window*, *Back Plat*, *Closet*) ← *CT Mid* ← *CT Spawn*.
- **Design de Cover e Linhas de Visão**: caixas padronizadas em `1.0m` (cobertura agachado), `1.4m` (head-peek) e `2.0m+` (cobertura total / boost em dupla); linhas longas de `35–55m` (Long A, Mid) balanceadas por pontos de smoke e pilares.

#### 2.3 Evolução da Arquitetura de Mapas (Fim do Hardcode)

1. **Pipeline de Produção (Level Design)**:
   - Sair de `BoxGeometry` hardcoded em `map.js` para um fluxo **TrenchBroom (`.map` CSG)** → **Blender** (limpeza, UV2 para lightmap, colocação de props modulares e entidades via *custom properties*) → exportação **`.glb` comprimido (Meshopt/Draco)**.
   - Entidades (spawns CT/T, zonas `bombsite_a`/`bombsite_b`, `buy_zone`, pontos de luz, superfícies de penetração `wood`/`concrete`/`metal`) passam a vir nos metadados (`userData`) do `.glb` ou de um manifesto JSON do mapa.
2. **Física & Colisões Precisas**:
   - **Opção A (Leve/Browser-first)**: **`three-mesh-bvh`** para raycasting acelerado em BVH e colisão cápsula-triângulo (resolve rampas, arcos e portas anguladas sem inflar `Box3`).
   - **Opção B (Recomendada para FPS completo)**: **Rapier3D WASM (`@dimforge/rapier3d-compat`)** com `KinematicCharacterController` (suporte nativo a *slope limit*, *auto-step* em escadas/degraus, *capsule sweep* anti-tunneling, além de corpos rígidos para granadas e armas dropadas).
3. **Otimização Espacial**:
   - **Static Batching**: unir geometrias estáticas por material via `BufferGeometryUtils.mergeGeometries` após carregar o `.glb` (reduzindo centenas de paredes/pisos a `~10–20` draw calls).
   - **Instancing**: usar `THREE.InstancedMesh` para caixas padrão, barris, sacos de areia e luminárias.
   - **Setorização / PVS Simples**: dividir o mapa em zonas (`Long`, `Mid`, `SiteA`, `SiteB`, `Tunnels`, `CTSpawn`) com portal/frustum culling para evitar desenhar ou testar oclusão em áreas completamente isoladas.
4. **NavMesh para Bots**:
   - Substituir `this.map.waypoints` por **NavMesh real** via **`@recast-navigation/core` + `@recast-navigation/three` (WASM)** gerado sobre a geometria caminhável do mapa, permitindo *pathfinding* contínuo (A*), navegação em rampas/Catwalk/B Window, áreas com custo tático (evitar Mid aberto) e busca por *cover points*.
5. **Sistema de Objetivo C4 (Bomb Defusal)**:
   - Loop de rounds completo (`FREEZETIME 5s` → `LIVE 115s` → `BOMB_PLANTED 40s` → `ROUND_END 5s`), zonas de plant A/B, canalização de plant (`3.2s`) e defuse (`10s` padrão / `5s` com Defuse Kit), bipe progressivo da C4 e dano radial na detonação.

---

### 3. Plano de Melhoria Gráfica (Alvo: Nível CS:GO em 1080p no Low, 60–144 FPS)

#### 3.1 O que Define Tecnicamente o Visual "CS:GO 1080p Low"

O visual característico do CS:GO (Source Engine) em **1080p Low** não depende de efeitos caros em tempo real (como Ray Tracing, SSR ou Volumetric Fog pesado), mas sim de **iluminação global pré-calculada de alta fidelidade**, **materiais PBR/especulares bem calibrados**, **alta legibilidade competitiva** e **custo mínimo por pixel**.

#### 3.2 Pilares Técnicos da Evolução Gráfica

1. **Baked Lightmaps + Ambient Occlusion (O maior salto visual com custo ~0 de GPU)**:
   - Assar (*bake*) iluminação direta, *radiosity* (luz quente refletida da areia nas paredes), sombras suaves e *Ambient Occlusion* de cantos no **Blender (Cycles)** para um canal `uv1` (`lightMap` no `MeshStandardMaterial`).
   - Elimina as múltiplas `PointLight`s dinâmicas em túneis e arcos, garantindo túneis sombrios com contraste realista e zero custo de sombra dinâmica extra por frame.
2. **Materiais PBR Reais & Texturas Comprimidas (`KTX2` / Basis Universal)**:
   - Substituir `CanvasTexture` sem mapas físicos por conjuntos PBR completos com **`SRGBColorSpace`** no Albedo, **Normal Map** (substituindo `bumpMap` simples), e textura **ORM empacotada** (R = AO, G = Roughness, B = Metalness).
   - Comprimir texturas para **`.ktx2` (UASTC/ETC1S)** via `KTX2Loader` (Basis Universal), reduzindo uso de VRAM em **4x–6x** e evitando engasgos de decodificação/upload na GPU.
3. **IBL com `PMREMGenerator` (EnvMap por Cena/Zona)**:
   - Gerar `scene.environment` pré-filtrado via `THREE.PMREMGenerator` a partir de um mapa HDRI leve do deserto, dando reflexos metálicos críveis à Desert Eagle cromada, recipientes metálicos e visores dos CTs.
4. **Modelos `.glb` Rigged (Viewmodel, Armas e Agentes)**:
   - Substituir primitivas geométricas por malhas low-to-mid poly otimizadas com esqueletos (`SkinnedMesh`) e `AnimationMixer`:
     - **Viewmodel + Braços**: ~6.000–12.000 triângulos, animações dedicadas de *draw*, *idle*, *fire*, *reload* (troca real de carregador) e *inspect* (`F`).
     - **Agentes CT/T**: ~4.000–8.000 triângulos por personagem com animações de *idle*, *walk/run*, *crouch*, *aim*, *reload* e colapso/ragdoll leve na morte.
5. **Sombras Dinâmicas Focadas & Luz Principal Única**:
   - Manter **apenas 1 `DirectionalLight`** (sol) com sombra dinâmica. Trocar o frustum estático `[-45, 45]` por sombra dinâmica centrada no jogador ou **`CSM` (Cascaded Shadow Maps)** com 2 cascatas leves (`1024×1024`), garantindo sombras nítidas perto da arma/personagens sem estourar orçamento.
6. **Pós-Processamento Mínimo & Legibilidade Competitiva**:
   - Manter `ACESFilmicToneMapping` + `SRGBColorSpace`; usar **MSAA 2x nativo** ou **FXAA** barato (sem Bloom pesado, Depth of Field ou Motion Blur que prejudicam mira e FPS).
   - Garantir separação de silhueta (contraste controlado entre albedo de agentes CT/T e paredes de arenito).
7. **VFX com Pooling e `InstancedMesh`**:
   - Refatorar `ParticleSystem` e `DecalManager` para **Object Pooling estático** (zero `new BufferGeometry()` / `new Material()` durante combate): `InstancedMesh` para cápsulas de latão (com quique usando altura real da física/BVH), atlas de sprites em shader único para faíscas/sangue/fumaça e pool fixo de decais compartilhando 1 material.

#### 3.3 Orçamento Técnico Alvo (1080p Low @ 60–144 FPS)

| Métrica | Estado Atual (`Dust II Mini`) | Alvo CS:GO 1080p Low | Estratégia para Atingir |
|---|---|---|---|
| **Draw Calls / Frame** | ~90–140 (cresce rápido ao expandir mapa) | **`80 – 180`** (mapa completo) | Static batching por material + `InstancedMesh` + pools de VFX |
| **Triângulos Visíveis** | ~15k – 30k | **`150k – 350k tris`** | Low-to-mid poly `.glb` + LODs em props distantes + culling de zonas |
| **VRAM (Texturas + Buffers)** | ~40 MB (Canvas sem compressão) | **`< 350 MB`** | Texturas `.ktx2` (Basis) + ORM empacotado + lightmaps 1024/2048 |
| **Frame Time (GPU + CPU)** | ~2–5 ms (cenário simples) | **`<= 6.9 ms` (144 FPS) / `<= 16.6 ms` (60 FPS)** | Baked lightmaps + 1 sombra direcional + 0 alocações JS no loop |
| **Renderer Backend** | WebGL2 | **WebGL2 (baseline) → WebGPU (`WebGPURenderer`)** | `WebGPURenderer` (Three.js `0.185+`) com fallback WebGL2 para menor overhead de driver |

---

### 4. Linguagens, Engine e Plataforma: Continuar no Browser ou Virar App Nativo?

#### 4.1 Resposta Objetiva

**Sim, é totalmente possível atingir qualidade visual e desempenho de CS:GO 1080p Low (60–144 FPS) rodando diretamente no navegador**, desde que o projeto evolua para **TypeScript + Three.js (WebGL2/WebGPU) + módulos WASM (Rapier3D / Recast)** com lightmaps assados, texturas KTX2 e zero alocações no loop de render. Entretanto, o browser impõe limites estruturais em **rede UDP pura, entrada de mouse e teto de assets** que determinam quando vale empacotar ou migrar para um aplicativo desktop nativo.

#### 4.2 Análise das Abordagens

1. **Continuar no Browser (TypeScript + Three.js + WASM)**
   - **Stack sugerida**: **TypeScript** (tipagem rigorosa para armas, rede e estado), **Three.js** (`WebGLRenderer` / `WebGPURenderer`), **Rapier3D WASM** (ou `three-mesh-bvh`), **Recast WASM** (NavMesh), **Web Audio API com `PannerNode` HRTF** e **WebRTC DataChannels / WebTransport** para multiplayer estilo UDP.
   - **Prós**: Acesso instantâneo por URL sem instalação, distribuição zero-friction, multiplataforma e aproveitamento de 100% da base já construída em `my_csgo`.
   - **Limitações Reais**:
     - *Pointer Lock*: sofre pequenas limitações de UX (`ESC` obrigatório, aceleração/polling rate dependente do navegador e do SO).
     - *Stutter de GC e Compilação de Shaders*: mitigável com *object pooling* estrito e `renderer.compile()` na tela de carregamento.
     - *Multiplayer*: WebSockets usa TCP (sofre *head-of-line blocking* em perda de pacotes); FPS tático exige **WebRTC DataChannels (`ordered: false, maxRetransmits: 0`)** ou **WebTransport**.
     - *Memória & Anti-cheat*: Teto prático de ~1–2 GB por aba e validação exclusivamente *server-authoritative* (sem proteção local de processo).

2. **Empacotamento Desktop Híbrido (Tauri / Electron)**
   - **Como funciona**: Mantém o frontend Three.js/TypeScript dentro de uma WebView nativa (**Tauri** usa backend em **Rust**, gerando binários de ~10–20 MB; Electron embarca Chromium inteiro, ~120+ MB).
   - **Ganho real**: O backend em **Rust (Tauri)** permite sockets **UDP nativos** para netcode competitivo, cache em disco para mapas grandes e launcher local, embora a renderização e o Pointer Lock continuem passando pela WebView.

3. **Migração para App Desktop Nativo (Engine Dedicada)**
   - **Godot 4 (GDScript / C# + Vulkan + `FuncGodot`)**: Melhor alternativa nativa para este projeto. Importa mapas `.map` do **TrenchBroom** diretamente via *FuncGodot*, possui `LightmapGI` integrado, áudio 3D nativo, multiplayer **ENet (UDP)** pronto e entrega 1080p a 144+ FPS facilmente.
   - **Unity (C# + URP) / Unreal Engine 5 (C++)**: Teto gráfico e ecossistema FPS/Netcode máximos, porém com curva e peso de projeto bem maiores para um time pequeno/estudo.
   - **Rust + Bevy / `wgpu`**: Desempenho nativo máximo, zero GC e compilação cruzada para Desktop + WebGPU/WASM, mas exige construir manualmente editor de mapas, pipeline de animação e UI.

#### 4.3 Matriz Comparativa e Gatilhos de Decisão

| Critério | Browser (TS + Three.js + WASM) | Híbrido (Tauri + Three.js) | Nativo (Godot 4 / C# / GDScript) | Nativo (Rust + Bevy / `wgpu`) |
|---|---|---|---|---|
| **1080p Low @ 60–144 FPS** | Sim (com lightmaps + KTX2 + pooling) | Sim (mesmo renderer da WebView) | Sim (folga ampla via Vulkan) | Sim (folga máxima, zero GC) |
| **Velocidade de Evolução** | **Muito Alta** (reaproveita `my_csgo`) | Alta | Alta (ferramentas FPS/3D prontas) | Média/Baixa (ecossistema mais cru) |
| **Input de Mouse (FPS)** | Pointer Lock (bom, limitado pelo browser) | Pointer Lock da WebView | **Raw Input nativo** (zero latência extra) | **Raw Input nativo** |
| **Netcode Competitivo (UDP)** | WebRTC DataChannel / WebTransport | **UDP nativo via Rust** | **ENet UDP integrado** | **UDP nativo (`renet`/`lightyear`)** |
| **Tamanho / Distribuição** | **URL instantânea** (~15–60 MB por mapa) | Instalador ~20 MB + assets | Executável ~40–80 MB + packs | Executável pequeno (~15–30 MB) |

- **Recomendação Prática**:
  - **Manter no Browser (TypeScript + Three.js + WASM)** nas próximas fases de evolução (mapa `de_dust2` 1.6, arsenal completo, gráficos 1080p Low e partidas 5v5 contra bots ou salas WebRTC).
  - **Gatilhos para virar App Nativo (Godot 4 ou Tauri+UDP)**: migrar apenas se o projeto passar a exigir **servidores competitivos 128-tick em UDP puro**, **múltiplos mapas pesados (> 300 MB de lightmaps/texturas)**, **raw mouse input livre de browser** ou **anti-cheat em cliente desktop dedicado**.

---

### 5. Expansão do Conjunto de Armas (Arsenal Tático CS 1.6 / CS:GO)

#### 5.1 Arquitetura Data-Driven, Slots e Economia

Substituir a estrutura fixa em `WeaponManager` por definições declarativas em `src/config/weapons.js` (ou `.ts`), organizando o inventário em **5 Slots** clássicos:
- **Slot 1 (Primária)**: Rifles, SMGs, Snipers e Shotguns.
- **Slot 2 (Secundária)**: Pistolas.
- **Slot 3 (Melee)**: Faca (velocidade máxima de movimento).
- **Slot 4 (Utilitários)**: Granadas (HE, Flashbang, Smoke, Molotov/Incendiary).
- **Slot 5 (Objetivo)**: C4 (exclusiva de um Terrorista por round).

Acoplar a um **Buy Menu (`B`)** nos primeiros 15–20s de cada round (dinheiro inicial `$800`, máximo `$16.000`, recompensas por abate, *loss bonus* e *plant/defuse*) e mecânica de **Drop (`G`) / Pickup** por colisão no solo.

#### 5.2 Tabela de Balanceamento do Arsenal Proposto

| Categoria | Arma | Time / Preço | Dano Base | Cadência (RPM) | Pente / Reserva | Penetração de Colete | Papel Tático / Mecânica Especial |
|---|---|---|---|---|---|---|---|
| **Rifle** | **AK-47** | T (`$2700`) | `36` (HS 4x) | `600 RPM` | `30 / 90` | `77.5%` | Letal com 1 headshot mesmo contra capacete; spray forte em "7" invertido. |
| **Rifle** | **M4A4** | CT (`$3100`) | `33` (HS 4x) | `666 RPM` | `30 / 90` | `70.0%` | Alta cadência e spray controlável para segurar *chokes* em média distância. |
| **Rifle** | **M4A1-S** | CT (`$2900`) | `38` (HS 4x) | `600 RPM` | `20 / 80` | `70.0%` | Silenciada: sem traçantes visíveis e áudio atenuado; ideal para *flanks* e *smokes*. |
| **Rifle Eco** | **FAMAS / Galil AR** | CT (`$2050`) / T (`$1800`) | `30` / `30` | `666 RPM` | `25/90` / `35/90` | `70%` / `77.5%` | Rifles de round forçado; FAMAS com modo *Burst* de 3 tiros no RMB. |
| **Sniper** | **AWP** | Ambos (`$4750`) | `115` | `41 RPM` (bolt) | `5 / 30` | `97.5%` | Scope 2x/4x (RMB), 1 tiro fatal do torso para cima, movimentação lenta (`~4.8 m/s`). |
| **Sniper** | **SSG 08 (Scout)** | Ambos (`$1700`) | `88` | `48 RPM` (bolt) | `10 / 90` | `85.0%` | Alta velocidade de movimento e precisão no ápice do pulo (*jump-shot*). |
| **SMG** | **MP5 / MP5-SD** | Ambos (`$1500`) | `27` | `750 RPM` | `30 / 120` | `62.5%` | Tributo clássico ao CS 1.6; ótima precisão em movimento e controle fácil. |
| **SMG** | **MP9 / MAC-10** | CT (`$1250`) / T (`$1050`) | `26` / `29` | `857` / `800 RPM` | `30/120` / `30/100` | `60%` / `57.5%` | Rush anti-eco com bônus de `$600` por kill e mínima penalidade em corrida. |
| **SMG** | **P90** | Ambos (`$2350`) | `26` | `857 RPM` | `50 / 100` | `69.0%` | Pente de 50 balas e supressão pesada em curta distância. |
| **Shotgun** | **Nova / XM1014** | Ambos (`$1050` / `$2000`) | `9×26` / `6×20` | `68` / `171 RPM` | `8/32` / `7/32` | `50%` / `80%` | Múltiplos *pellets* por disparo, controle de corredores curtos e `$900` por kill. |
| **Pistola** | **USP-S** | CT (Inicial / `$200`) | `35` | `352 RPM` | `12 / 24` | `50.5%` | Silenciada e cirúrgica no 1º tiro para *pistol rounds* à distância. |
| **Pistola** | **Glock-18** | T (Inicial / `$200`) | `30` | `400 RPM` | `20 / 120` | `47.0%` | Modo *Semi* ou *Burst-fire* (3 tiros) para rush curto. |
| **Pistola** | **P250** | Ambos (`$300`) | `38` | `400 RPM` | `13 / 26` | `64.0%` | Opção barata de round econômico capaz de punir capacetes de perto. |
| **Pistola** | **Desert Eagle** | Ambos (`$700`) | `53–58` | `267 RPM` | `7 / 35` | `93.2%` | Canhão de mão com *1-tap* headshot em longa distância e alto tempo de recuperação. |
| **Melee** | **Faca (Knife)** | Ambos (Slot 3) | `40` (LMB) / `65` (RMB) | — | — | `85.0%` | Velocidade máxima (`6.5 m/s`); **180 de dano (hitkill)** em *backstab* com RMB. |
| **Utilitário** | **HE / Flash / Smoke / Molotov** | `$300` / `$200` / `$300` / `$400–600` | Radial / Cegueira / Oclusão / Fogo | — | `1` un. (máx 4 granadas) | — | Smoke bloqueia raycast de visão da IA (`_canSeeTarget`) e Flash verifica ângulo + parede. |

#### 5.3 Evolução da Balística

1. **Spray Patterns Determinísticos + Viewpunch**: substituir o desvio puramente aleatório por tabelas de recuo `(dx, dy)` indexadas pelo disparo contínuo no pente, combinadas com retorno real de pitch/yaw da câmera e imprecisão controlada por movimento/salto.
2. **Damage Falloff & Armadura Real**: aplicar atenuação por distância (`damage * Math.pow(rangeModifier, dist / 12.7)`) e cálculo fiel de `armorRatio` + proteção de capacete na hitbox `head`.
3. **Wallbang (Penetração de Materiais)**: converter o raycast único em `intersectObjects(..., false)` ordenado por distância; cada material do mapa (`wood_crate`, `double_door`, `sheet_metal`, `sandstone`) define um custo de penetração que reduz o dano restante do projétil e cria decais de entrada e saída.

---

### 6. Roadmap de Implementação por Fases

| Fase | Branch Sugerida | Escopo & Entregáveis Principais | Critério de Aceite |
|---|---|---|---|
| **Fase 0 — Saneamento & Pooling** | `feature/core-timestep-and-pooling` | Fixed timestep (64 Hz) desacoplado do render; correção da rampa do `Player` e Catwalk dos bots; remoção de `#btn-respawn` morto; `Object Pooling` + `InstancedMesh` em `ParticleSystem`/`DecalManager`; remoção de alocações no `update()`. | 0 alocações de `BufferGeometry`/`Material` durante tiroteios; player e bots sobem todas as rampas suavemente; `npm run build` limpo. |
| **Fase 1 — Arsenal Base & Balística CS** | `feature/weapon-arsenal-and-spray` | Config data-driven (`src/config/weapons.js`), Slots 1–3 (`Faca`, `USP-S`, `Glock-18`, `Deagle`, `AK-47`, `M4A4`, `MP5`, `AWP` com scope), spray patterns determinísticos, wallbang e câmera/layer dedicada para viewmodel (sem clipping em paredes). | Todas as armas funcionam por config, sem sobreposição, com falloff, wallbang em madeira e scope funcional na AWP. |
| **Fase 2 — Física WASM, Economia & Granadas** | `feature/physics-utilities-economy` | Integração `Rapier3D` WASM (ou `three-mesh-bvh`), granadas físicas (HE, Flashbang, Smoke bloqueando visão de bots, Molotov), Buy Menu (`B`), economia de round e drop/pickup (`G`). | Compra, drop, física de granadas e oclusão de bots por Smoke validados em jogo. |
| **Fase 3 — Mapa `de_dust2` 1.6 & Modo C4** | `feature/dust2-complete-and-c4` | Pipeline TrenchBroom/Blender → `.glb`, layout completo do `de_dust2` 1.6 (A, B, Mid, Tunnels, Long) com static batching, NavMesh (`recast-navigation`) para bots e máquina de estados de round com plant/defuse da C4 (40s). | Bots navegam entre A/B/Mid sem travar; ciclo completo de rounds CT vs T com plant e defuse operacional. |
| **Fase 4 — Salto Gráfico (1080p Low CS:GO)** | `feature/csgo-low-graphics-pipeline` | Lightmaps + AO assados no Blender, texturas ORM comprimidas em `.ktx2`, `PMREMGenerator` IBL, modelos `.glb` rigged para viewmodels e agentes CT/T, `CSM` leve (2 cascatas) e suporte opcional a `WebGPURenderer`. | `80–180` draw calls, `< 350 MB` VRAM e `60–144 FPS` estáveis em 1080p no perfil Low. |
| **Fase 5 — Áudio 3D & Multiplayer (ou Decisão Nativa)** | `feature/spatial-audio-and-netcode` | Áudio posicional 3D HRTF (`PannerNode`), cache de buffers no `SoundManager` e netcode autoritativo via WebRTC DataChannels; avaliação de gatilhos para Tauri (UDP) ou Godot 4. | Localização sonora 3D precisa de passos/tiros e sincronização multiplayer de baixa latência funcional. |

---

## 📜 Licença

Este projeto é desenvolvido para fins educacionais e de estudo sobre Three.js e desenvolvimento de jogos no navegador.
