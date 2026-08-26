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

## 📜 Licença

Este projeto é desenvolvido para fins educacionais e de estudo sobre Three.js e desenvolvimento de jogos no navegador.
