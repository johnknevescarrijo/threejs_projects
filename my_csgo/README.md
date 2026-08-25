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

### 🔫 2 Armas Ícones com Auto-Reload
- **AK-47** (`Slot 1`):
  - Rifle de assalto automático (600 RPM).
  - Pente de 30 balas + 90 de reserva.
  - Recuo vertical e dispersão horizontal (*spray pattern*).
  - Dano: 36 (Headshot: 144 - eliminação instantânea).
- **Desert Eagle** (`Slot 2`):
  - Pistola semi-automática de alto impacto.
  - Pente de 7 balas + 35 de reserva.
  - Precisão cirúrgica de primeiro tiro com recuo pesado.
  - Dano: 58 (Headshot: 232 - eliminação instantânea).
- **Recarregamento Automático**: Ao esvaziar o pente (0 balas), a arma recarrega automaticamente se houver munição na reserva.
- Animações procedurais de recuo de arma (*kickback*), balanço ao andar (*weapon sway/bobbing*) e animação de recarga.

### 🏃 Movimentação & Respawn Automático
- **Respawn Automático e Fluido**: Ao ser eliminado, surge um banner superior com barra e contagem regressiva de `2.5s`, renascendo o jogador sem interrupções manuais.
- **Aceleração e Atrito no Solo**: Sensação clássica de peso e desaceleração.
- **Agachamento Suave** (`Ctrl` ou `C`): Reduz a altura dos olhos de 1.7m para 1.05m e melhora a precisão do disparo em 30%.
- **Caminhada Silenciosa** (`Shift`): Reduz a velocidade, estabiliza a mira e anula os sons de passos.
- **Pulo e Gravidade** (`Espaço`): Física de salto responsiva.

### 🤖 Bots com Inteligência Artificial
- **Patrulha e Navegação com Física no Solo**: Circulam estrategicamente entre waypoints com detecção de relevo (*ground clamping*) e gravidade, subindo e descendo rampas/plataformas sem flutuar.
- **Detecção por Linha de Visão (*Line-of-Sight Raycasting*)**: Detectam o jogador se estiverem no campo de visão e sem paredes obstruindo.
- **Combate em Rajadas**: Miram e disparam rajadas de 3 tiros com sons e traçantes.
- **Hitboxes Distintas**:
  - **Cabeça**: Acertos críticos ativam o som metálico de capacete (*Dink*), multiplicador 4x e notificação de **HEADSHOT**.
  - **Corpo/Pernas**: Dano padrão.
- **Sistema de Respawn**: Bots eliminados respawnam automaticamente no nível correto do solo após 4 segundos.

### 🖥️ HUD & Efeitos Audiovisuais
- **Mira Dinâmica (Crosshair Verde)**: Abre dinamicamente conforme você se move, pula ou dispara em sequência.
- **Hitmarkers**: Indicador visual 'X' com som de impacto (branco no corpo, vermelho com som metálico no headshot).
- **Killfeed em Tempo Real**: Notificações no canto superior direito no formato `Player [Arma] 🎯 HEADSHOT Bot`.
- **Efeitos de Impacto**: Decais de buracos de bala, faíscas metálicas, puffs de poeira e fumaça ao acertar paredes, e partículas de sangue nos inimigos.
- **Áudio Procedural (Web Audio API)**: Sintetizador interno para tiros, cliques de recarga, passos, impactos e dink de capacete.

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

## 📜 Licença

Este projeto é desenvolvido para fins educacionais e de estudo sobre Three.js e desenvolvimento de jogos no navegador.
