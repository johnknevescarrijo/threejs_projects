# MEMORY.md - Memória e Registro Técnico do Projeto

Este arquivo preserva as decisões arquiteturais, constantes calibradas de jogabilidade, especificações técnicas e o roadmap futuro do projeto.

---

## 📌 Estado Atual do Projeto

- **Versão**: 1.0.0
- **Tecnologias**: Three.js (v0.183+), Vite (v8+), Web Audio API, HTML5/CSS3.
- **Status**: Funcional, testado com build de produção aprovado.

---

## 🧠 Decisões Arquiteturais

### 1. Modelagem e Texturização Procedural
- **Motivo**: Eliminar dependências de assets externos (arquivos `.obj`, `.gltf` ou texturas externas) que causam latência, problemas de carregamento assíncrono e falhas de CORS ao rodar localmente.
- **Implementação**:
  - Modelos das armas (AK-47 e Desert Eagle) e dos bots são montados a partir de primitivas Three.js com materiais `MeshStandardMaterial` calibrados (metalness, roughness).
  - Texturas de solo (arenito), paredes (tijolos) e caixas de madeira (com reforço metálico e rebites) são geradas dinamicamente via `CanvasRenderingContext2D` e aplicadas como `CanvasTexture`.

### 2. Efeitos de Áudio Procedurais (Web Audio API)
- Sem arquivos `.wav`/`.mp3` externos.
- Sons sintetizados em tempo real:
  - **AK-47**: Combinação de ruído filtrado em passa-faixa (1600Hz) + oscilador senoidal grave com decaimento exponencial rápido.
  - **Desert Eagle**: Ruído passa-alta (600Hz) + oscilador triangular encorpado (180Hz -> 30Hz).
  - **Headshot Dink**: Osciladores senoidais harmônicos duplos (2400Hz e 3600Hz) gerando o clássico anel metálico de capacete.
  - **Recarga, Passos e Tiros de Bots**: Sintetizados via pulsos e osciladores modulados.

### 3. Física e Movimentação Fiel ao CS:GO
- **Velocidades**:
  - Corrida padrão: `6.2 m/s`
  - Caminhada silenciosa (`Shift`): `3.2 m/s`
  - Agachamento (`Ctrl`/`C`): `2.0 m/s`
  - Força do pulo: `8.0 m/s`
  - Gravidade: `24.0 m/s²`
  - Atrito do solo: `10.0`
- **Controle de Recuo (Recoil & Spread)**:
  - Disparos consecutivos aumentam a dispersão (`currentSpread`).
  - Movimentação penaliza a precisão; agachar reduz a dispersão em 30%.
  - Recuperação suave do spread via interpolação (`lerp`) quando o jogador para de atirar.

### 4. Correção e Física dos Bots (Ground Clamping & Gravidade)
- **Problema anterior**: Bots flutuavam ou voavam no ar ao patrulharem para fora do Bombsite A (plataforma elevada a 1.2m) ou ao respawnarem em waypoints elevados sem gravidade vertical.
- **Solução Implementada**:
  - Método `_getGroundHeight(x, z)` adicionado à classe `Bot`, detectando de forma contínua a altura real do relevo (chão plano `y=0`, rampa do Bombsite A com interpolação `0.0 -> 1.2m`, plataforma `y=1.2m` e topos de caixas baixas).
  - Adicionada propriedade `velocityY` e aceleração gravitacional contínua (`22.0 m/s²`) com decaimento suave.
  - Alinhamento horizontal estrito no `lookAt` dos bots para evitar que inclinações corporais no eixo vertical alterem a posição dos modelos.
  - Correção na lógica de `respawn` e `die` para sempre ancorar os bots na superfície do solo atual.

### 5. Auto-Reload e Auto-Respawn Automatizados
- **Auto-Reload**:
  - Quando a munição no pente chega a `0`, se o jogador tiver balas na reserva, o recarregamento é acionado automaticamente após um delay natural de 0.25s (ou imediatamente ao clicar para atirar sem munição).
- **Auto-Respawn**:
  - Eliminação da necessidade de clicar em botões manuais na tela de morte.
  - Ao morrer, um banner não-intrusivo surge no topo com contador regressivo animado de `2.5s` e barra de progresso. Ao expirar o tempo, o jogador renasce na base com vida/colete cheios e mantém o controle de mira suavemente.

### 6. Aprimoramentos Gráficos & Efeitos Visuais
- **Texturas em Alta Resolução (1024x1024) com Bump Mapping**:
  - Solo de arenito com mapa de relevo (*bump map*) simulando pedras, ranhuras e fendas sob a luz do sol.
  - Paredes com tijolos texturizados, linhas de argamassa e marcas de desgaste do deserto.
  - Caixas de madeira com veios de madeira, reforços de cantoneira metálica, rebites 3D e stencils táticos do CS:GO.
- **Domo de Céu Atmosférico (Sky Dome)**:
  - Céu em gradiente simulando o horizonte ensolarado característico de Dust II com neblina volumétrica suave (`FogExp2`).
- **Iluminação & Cenário**:
  - Sombras suaves em alta definição (2048x2048 PCFSoftShadowMap), lanternas pontuais com luz quente nas áreas do Bombsite A e túnel Long.
  - Adição de barris metálicos industriais (vermelhos explosivos e amarelos tóxicos).
- **Partículas & Efeitos de Impacto**:
  - Puffs de poeira e fumaça ao acertar tiros nas paredes, faíscas brilhantes com decaimento gravitacional e traçantes luminosos aprimorados.

---

## 📊 Balanceamento das Armas

| Arma | Tipo | Dano Base | Multiplicador Headshot | Cadência (RPM) | Pente / Reserva | Tempo de Recarga |
|---|---|---|---|---|---|---|
| **AK-47** | Rifle | 36 | 4.0x (144 de dano) | 600 RPM (0.1s/tiro) | 30 / 90 | 2.2s |
| **Desert Eagle** | Pistola | 58 | 4.0x (232 de dano) | Semi-Auto (0.22s/tiro) | 7 / 35 | 1.8s |

---

## 🗺️ Elementos do Mapa (Dust 2 Mini)
- **Dimensões**: 70m x 70m com paredes perimétricas de 6m de altura.
- **Bombsite A**: Plataforma elevada a 1.2m com rampa de acesso, caixas empilhadas e grafite clássico com a letra "A".
- **Container Azul**: Cobertura industrial de metal.
- **Arco e Túnel ("Long")**: Ponto tático para trocação de tiros à distância.
- **Área Central ("Mid")**: Caixas e pilares para avanço tático e emboscadas.

---

## 🚀 Roadmap de Futuras Extensões
1. **Mais Armas**: AWP (Sniper com scope 2D/3D) e M4A4 / USP-S com silenciador.
2. **Granadas**: Granada de fumaça (Smoke), Flashbang (com efeito de cegueira na tela) e HE Grenade.
3. **Plantação da C4**: Timer de 40s da bomba no Bombsite A com kit de defuse para CTs.
4. **Multiplayer**: Suporte a salas multiplayer via WebSockets / WebRTC.
