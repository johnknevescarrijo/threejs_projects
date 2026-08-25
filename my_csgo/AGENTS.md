# AGENTS.md - Diretrizes para Agentes de IA

Este documento contém todas as instruções, convenções e mapa da base de código do **CS:GO Three.js Clone** para agentes de IA que forem manter ou expandir o projeto.

---

## 🎯 Visão Geral do Projeto

O **CS:GO Three.js Clone** é uma réplica minimalista e funcional do Counter-Strike: Global Offensive no navegador, construída com **Three.js** e **Vite**, sem dependência de assets binários externos pesados (todos os modelos 3D, texturas, efeitos de partículas e áudios são gerados de forma procedural).

### 🔫 Recursos Principais
- **Mapa Tático (Dust 2 Mini)**: Bombsite A elevado, rampa de acesso, caixas de cobertura de madeira e metal, container, arco/túnel e pontos de estrangulamento.
- **2 Armas Ícones**:
  - `AK-47`: Rifle automático de alto dano, recuo com spray horizontal/vertical e tempo de reload de 2.2s.
  - `Desert Eagle`: Pistola semi-automática de alto impacto, precisão cirúrgica de primeiro tiro e recuo vertical pesado.
- **Movimentação estilo CS:GO**:
  - WASD + Aceleração e atrito no solo.
  - Pulo (Space) e agachamento suave (Ctrl/C) que reduz a altura da câmera e o spread dos disparos.
  - Caminhada silenciosa (Shift) que anula o som de passos e estabiliza a mira.
  - Bounding Box AABB para colisão com o mapa.
- **Bots com Inteligência Artificial**:
  - Estados: Patrulha entre waypoints e combate com detecção de linha de visão (Line-of-Sight raycast).
  - Hitbox distinta para Cabeça (Headshot com som de "Dink" e multiplicador 4x de dano) e Corpo.
  - Disparos em rajadas e respawn automático.
- **HUD & Feedback Visual/Sonoro CS:GO**:
  - Mira dinâmica (crosshair verde) que expande ao mover ou atirar.
  - Hitmarker com distinção visual/sonora para headshots.
  - Killfeed no canto superior direito com indicador de headshot.
  - Barras de Vida e Colete, contador de munição e tempo de partida.
  - Decais de impacto de bala (buracos na parede/caixas) e partículas de sangue e faíscas.
  - Síntese de áudio procedural via Web Audio API (tiros, cliques de reload, passos, impactos).

---

## 📁 Estrutura de Arquivos

```
my_csgo/
├── index.html                  # Estrutura HTML, HUD e telas de início/morte
├── package.json                # Dependências (three, vite) e scripts de build
├── AGENTS.md                   # Diretrizes para agentes de IA
├── MEMORY.md                   # Decisões de arquitetura e histórico do projeto
└── src/
    ├── main.js                 # Inicialização da cena, loop de render e disparo
    ├── style.css               # Estilos CSS modernos para o HUD CS:GO
    ├── audio/
    │   └── soundManager.js     # Sintetizador procedural Web Audio API (SFX)
    ├── entities/
    │   ├── player.js           # Controlador de primeira pessoa e física do jogador
    │   ├── bot.js              # Inteligência artificial, modelos 3D dos bots e hitboxes
    │   └── weapon.js           # Gerenciador de armas (AK-47 e Deagle), recuo e miras
    └── world/
        ├── map.js              # Geração do mapa Dust II, texturas canvas e colisores
        ├── decals.js           # Decais de impacto de bala nas paredes/caixas
        └── particles.js        # Faíscas, sangue e traçantes de projéteis
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
4. **Desempenho**:
   - Limite o número máximo de decais e partículas ativas simultâneas (o `DecalManager` já possui FIFO com limite de 60 decais).
   - Reutilize geometrias e materiais sempre que possível.
