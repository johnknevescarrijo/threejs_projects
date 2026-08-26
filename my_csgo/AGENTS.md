# AGENTS.md - Diretrizes para Agentes de IA

Este documento contém todas as instruções, convenções e mapa da base de código do **CS:GO Three.js Clone** para agentes de IA que forem manter ou expandir o projeto.

---

## 🎯 Visão Geral do Projeto

O **CS:GO Three.js Clone** é uma réplica minimalista e funcional do Counter-Strike: Global Offensive no navegador, construída com **Three.js** e **Vite**, sem dependência de assets binários externos pesados (todos os modelos 3D, texturas, efeitos de partículas e áudios são gerados de forma procedural).

### 🔫 Recursos Principais
- **Mapa Tático (Dust 2 Mini)**: Bombsite A elevado, rampa de acesso, caixas de cobertura de madeira e metal, container, arco/túnel e pontos de estrangulamento.
- **2 Armas Ícones com Gráficos em Alta Resolução (Viewmodel HD)**:
  - `AK-47`: Textura procedural de madeira nobre, receptor de aço estampado, ferrolho móvel, cartuchos de latão ejetados e recuo com spray padrão.
  - `Desert Eagle`: Acabamento em cromo escovado com serrilhas, trilho Picatinny, painéis de empunhadura zigrinados com medalhão, animação de blowback do slide e recuo potente.
  - **Braços e Luvas Táticas**: Braços em primeira pessoa com mangas SAS/CT e luvas táticas de combate com placas de carbono nos nós dos dedos e empunhadura anatômica.
- **Sistema de Times (CT vs Terroristas)**:
  - Jogador e Bots Aliados no time **CT** (`CT_Alpha`, `CT_Bravo`) contra Bots Inimigos no time **T** (`T_Phoenix`, `T_Leet`, `T_Balkan`).
  - Modelos 3D distintos para CTs (farda azul marinho, colete balístico, capacete com visor azul e marcador holográfico `▲`) e Terroristas (camuflado do deserto, colete marrom, bandanas vermelhas/máscaras e óculos escuros).
  - Inteligência artificial de combate tático Bot-vs-Bot com eliminação mútua, proteção a fogo amigo e registro no killfeed.
- **HUD & Feedback Visual/Sonoro CS:GO**:
  - Placar de equipes **[CT 0] [Timer] [0 T]** com contadores individuais de K/D.
  - Mira dinâmica (crosshair verde) que expande ao mover ou atirar.
  - Hitmarker com distinção visual/sonora para headshots.
  - Killfeed colorido com indicação de time e headshots.
  - Ejeção física de cartuchos de latão (*brass bullet casings*), buracos de bala (decais), faíscas e sangue.
  - Síntese de áudio procedural via Web Audio API.

---

## 📁 Estrutura de Arquivos

```
my_csgo/
├── index.html                  # Estrutura HTML, HUD e telas de início/morte
├── package.json                # Dependências (three, vite) e scripts de build
├── AGENTS.md                   # Diretrizes para agentes de IA
├── MEMORY.md                   # Decisões de arquitetura e histórico do projeto
├── README.md                   # Documentação do projeto
└── src/
    ├── main.js                 # Inicialização da cena, loop de render, combate e times
    ├── style.css               # Estilos CSS modernos para o HUD CS:GO e placar
    ├── audio/
    │   └── soundManager.js     # Sintetizador procedural Web Audio API (SFX)
    ├── entities/
    │   ├── player.js           # Controlador de primeira pessoa e física do jogador
    │   ├── bot.js              # IA de equipes (CT e T), modelos 3D, combate e hitboxes
    │   └── weapon.js           # Gerenciador de armas HD, braços táticos, recuo e ejeção de cápsulas
    └── world/
        ├── map.js              # Geração do mapa Dust II, texturas canvas e colisores
        ├── decals.js           # Decais de impacto de bala nas paredes/caixas
        └── particles.js        # Faíscas, sangue, traçantes e cápsulas de balas
```

---

## 🛠️ Comandos de Desenvolvimento

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento Vite local |
| `npm run build` | Compila o projeto otimizado para produção na pasta `dist/` |
| `npm run preview` | Executa o preview do bundle gerado |

---

## 🤖 Regras & Convenções para Agentes

1. **Procedural First**:
   - Evite adicionar dependências pesadas de arquivos `.gltf` ou `.mp3` externos se puderem ser sintetizados ou gerados proceduralmente, garantindo carregamento instantâneo e sem problemas de CORS.
2. **Sistema de Coordenadas & Escala**:
   - 1 unidade Three.js = 1 metro.
   - Altura padrão do jogador em pé: `1.7m`.
   - Altura do jogador agachado: `1.05m`.
3. **Mecânica de Tiro & Raycasting**:
   - Sempre faça o raycast combinando a posição da câmera e o desvio da mira (`weaponManager.currentSpread`).
   - Verifique sempre colisões com as hitboxes dos bots antes dos objetos do cenário para priorizar acertos.
   - Respeite as equipes: bots aliados (CT) possuem marcador holográfico e não devem sofrer dano letal de fogo amigo.
4. **Desempenho**:
   - Limite o número máximo de decais e partículas ativas simultâneas (o `DecalManager` já possui FIFO com limite de 60 decais; cartuchos de bala possuem ciclo de vida curto com descarte automático).
   - Reutilize geometrias e materiais sempre que possível.
