# MEMORY.md - Mini Militia 2D (Doodle Strike 2026)

## 📌 Visão Geral do Projeto
**Mini Militia 2D** é um jogo de tiro em arena 2D multiplayer (vs IA) inspirado no clássico *Mini Militia / Doodle Army 2*, recriado com uma estética moderna nostálgica ("Doodle 2026"), alta fidelidade visual vetorial, efeitos de partículas fluidos, áudio procedural sintetizado via Web Audio API e comportamento de inteligência artificial tática avançada.

---

## 🛠️ Stack Tecnológica & Arquitetura
- **Framework & UI:** React 19 + TypeScript + Tailwind CSS (via `@tailwindcss/vite`).
- **Renderização Gráfica:** HTML5 Canvas 2D com transformações de matriz, interpolação suave de câmera, renderização vetorial de soldados estilizados, rastros balísticos, miras laser e camadas de paralaxe.
- **Engine de Áudio:** Web Audio API 100% procedural (sem dependência de assets de áudio externos; sintetizadores para disparos, ricochetes, jatos do jetpack, explosões em cascata, recargas e fanfarras).
- **Gerenciamento de Estado & Ciclo:** Game Loop de alta precisão (delta time com requestAnimationFrame) integrado reativamente com React para HUD, minimapa e modais.

---

## 📂 Estrutura de Arquivos

```
mini_militia/
├── index.html                   # HTML com fontes Orbitron, Press Start 2P e Inter
├── package.json                 # Dependências e scripts de build/dev
├── tsconfig.json                # Configuração TypeScript ES2020/Bundler
├── vite.config.ts               # Vite com suporte a React e Tailwind v4
├── AGENTS.MD                    # Documento de especificação original
├── MEMORY.md                    # Memória de desenvolvimento e documentação técnica
└── src/
    ├── main.tsx                 # Ponto de entrada React
    ├── App.tsx                  # Componente raiz que conecta Canvas, Menus e HUD
    ├── index.css                # Estilos base e animações de interface
    ├── game/
    │   ├── types.ts             # Tipos, interfaces de armas, estatísticas e entidades
    │   ├── audio/
    │   │   └── SoundManager.ts  # Sintetizador procedural Web Audio API para todos os SFX
    │   ├── core/
    │   │   ├── GameEngine.ts    # Loop de jogo, colisões, pontuação, kill feed e estados
    │   │   ├── Camera.ts        # Câmera 2D com lerp, limites de mapa e tremor de tela
    │   │   └── InputManager.ts  # Captura de teclado (WASD/Espaço), mouse e atalhos
    │   ├── entities/
    │   │   ├── Entity.ts        # Entidade física base com resolução AABB de plataformas
    │   │   ├── Player.ts        # Controlador do jogador, mira 360°, jetpack e inventário
    │   │   ├── Bot.ts           # IA tática com árvores de decisão e 5 personalidades
    │   │   ├── Projectile.ts    # Projéteis balísticos, balins, raios de sniper e foguetes
    │   │   ├── Grenade.ts       # Granada de fragmentação com física parabólica e quiques
    │   │   ├── ExplosiveBarrel.ts # Barris explosivos com reações em cadeia
    │   │   └── ItemPickup.ts    # Pedestais de armas, vida, combustível e granadas
    │   ├── map/
    │   │   ├── MapData.ts       # Layout da arena (2600x1500), plataformas e spawns
    │   │   └── MapRenderer.ts   # Paralaxe de selva, pontes de madeira e folhagens
    │   ├── weapons/
    │   │   └── WeaponDefinitions.ts # Especificações das 5 armas do arsenal
    │   └── effects/
    │       ├── ParticleSystem.ts # Fumaça, chamas, faíscas, sangue, cápsulas e ondas de choque
    │       └── FloatingText.ts  # Indicadores visuais de dano e headshot
    └── ui/
        ├── hud/
        │   ├── HUD.tsx          # Barra de vida, jetpack, munição, tempo e placar
        │   ├── Minimap.tsx      # Radar circular tático em tempo real
        │   ├── KillFeed.tsx     # Feed animado de eliminações com ícones de armas
        │   ├── ScoreboardModal.tsx # Placar completo exibido ao segurar TAB
        │   ├── RespawnOverlay.tsx  # Tela de ressurgimento com contagem regressiva
        │   └── AnnouncementBanner.tsx # Banners (Double Kill, Killing Spree, etc.)
        ├── menu/
        │   ├── MainMenu.tsx     # Menu principal estilo 2026
        │   ├── LoadoutModal.tsx # Escolha de arma inicial com gráfico comparativo
        │   ├── CharacterModal.tsx # Personalização visual do soldado (cores/pele/visor)
        │   └── SettingsModal.tsx # Volume, sensibilidade e dificuldade dos bots
        └── results/
            └── ResultsModal.tsx # Tela de vitória/derrota com resumo estatístico e revanche
```

---

## 🎮 Mecânicas Implementadas & Recursos

### 1. Sistema de Movimentação & Jetpack
- **Movimento Direcional:** WASD ou Setas direcionais com física de atrito no chão e arrasto no ar.
- **Jetpack com Propulsão:** Barra de combustível azul (100% máx). Ao segurar `Espaço` ou `W`, o jetpack aciona empuxo vertical com emissão contínua de partículas de chama e fumaça, acompanhado de áudio contínuo.
- **Recarga de Combustível:** O combustível se regenera automaticamente ao pisar no chão ou instantaneamente ao coletar tambores de combustível (`+50%`).

### 2. Arsenal de Armas & Granadas
1. **🔫 Pistola 9mm:** 10 de dano, cadência média, 12 tiros, alta precisão.
2. **💥 Espingarda Tática:** 8x6 (48 de dano potencial), 6 cartuchos, dispersão devastadora a curta distância.
3. **⚡ Fuzil de Assalto:** 8 de dano por tiro, 10.5 tiros/s em disparo automático contínuo, 30 tiros.
4. **🎯 Sniper .50:** 50 de dano (com multiplicador de Headshot para 75), raio laser perfurante, alcance de 1800m.
5. **🚀 Lança-Foguetes RPG:** 80 de dano máximo em área (AoE), foguete com rastro de fumaça e empuxo de impacto.
6. **💣 Granadas de Fragmentação (Tecla G):** Arremesso com física parabólica, quiques sonoros em plataformas e detonação por tempo com raio de 140px.

### 3. Inteligência Artificial (5 Bots Únicos)
- **Sgt. Rex:** Combatente agressivo focado em flanquear com espingarda e fuzil.
- **Ghost Sniper:** Especialista em atirar à longa distância com sniper de plataformas altas.
- **Viper:** Acrobata aéreo que usa jetpack continuamente e arremessa granadas.
- **Tanker:** Especialista em armas pesadas e explosivos.
- **Shadow:** Atirador furtivo que busca kits médicos assim que a vida cai abaixo de 50%.
- **Comportamentos Gerais:** Perseguição, fuga tática para cobertura, busca por vida e combustível, coleta de armas nos pedestais, mira com compensação de distância e liderança de tiro.

### 4. Arena & Elementos Interativos
- Dimensões expandidas: `2600 x 1500` com 3 camadas verticais de altura, pontes suspensas, caverna subterrânea e pontos de cobertura.
- **Barris Explosivos:** Barris vermelhos de combustível militar destrutíveis que explodem e causam reações em cadeia devastadoras.
- **Pedestais de Coletáveis:** Temporizadores de respawn visíveis em anéis holográficos.

### 5. Interface, HUD & Feedback Visual
- Barra de vida com gradiente verde-amarelo-vermelho e exibição numérica.
- Barra de energia do jetpack com brilho ciano.
- Radar circular tático (Minimap) com detecção em tempo real de aliados, inimigos e itens.
- Feed de abates estilizado com ícones de armas.
- Tabela de classificação em tempo real acessível via tecla `TAB`.
- Efeitos de tela: Tremor suave (Screen Shake), marcas vermelhas de acerto e números de dano flutuantes coloridos.
- Celebração de vitória com confetes (`canvas-confetti`) e fanfarra sonoro sintetizada.

---

## 🚀 Como Executar o Projeto

1. **Instalar Dependências:**
   ```bash
   npm install
   ```

2. **Iniciar o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação no navegador em `http://localhost:3000`.

3. **Compilar para Produção:**
   ```bash
   npm run build
   ```

---

## 🎯 Controles do Jogo
| Tecla / Ação | Função |
| :--- | :--- |
| **W, A, S, D** ou **Setas** | Mover soldado |
| **Espaço** ou **W** | Ativar Jetpack (voar) |
| **Mouse (Ponteiro)** | Mirar em 360° |
| **Botão Esquerdo do Mouse** | Atirar com a arma equipada |
| **Tecla R** | Recarregar arma |
| **Tecla G** ou **Botão Direito** | Lançar granada de fragmentação |
| **Teclas 1, 2, 3** ou **Scroll** | Trocar de arma no inventário |
| **TAB (Segurar)** | Exibir placar da arena em tempo real |
| **Botão Ajustes** | Modificar volume, tremor e dificuldade |
