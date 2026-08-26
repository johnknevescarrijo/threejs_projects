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
### 7. Overhaul dos Gráficos das Armas & Braços em Primeira Pessoa (Viewmodel HD)
- **Braços e Luvas Táticas Procedurais**:
  - Adicionados braços em primeira pessoa com mangas táticas SAS/CT (`#263345`) e luvas de combate com placas de fibra de carbono nos nós dos dedos e palma antiderrapante.
  - Empunhadura realista:
    - **AK-47**: Mão esquerda sustentando o guarda-mão de madeira inferior; mão direita empunhando o cabo anatômico com dedo indicador no guarda-mato.
    - **Desert Eagle**: Empunhadura de combate tática com as duas mãos (postura Isósceles moderna / *support hand* reforçando os dedos da mão principal).
- **Texturas Procedurais e Acabamento das Armas**:
  - Textura de madeira nobre envernizada com veios e nós laminados aplicada na coronha, guarda-mão duplo e punho da AK-47.
  - Textura de aço estampado/fosfatizado (*gunmetal*) com ranhuras de reforço no corpo da culatra e no carregador curvo estilo banana (30 tiros).
  - Textura de cromo escovado com serrilhas de manobra (*cocking serrations*) e trilho Picatinny superior para a Desert Eagle.
  - Painéis de empunhadura da Deagle com zigrinado antiderrapante (*diamond checkering*) e medalhão com a águia do CS.
- **Animações de Blowback & Ejeção Física de Cartuchos**:
  - Animação de recuo do ferrolho (*bolt carrier*) na AK-47 e da culatra/slide na Deagle a cada disparo.
  - Sistema de partículas com física para cartuchos de latão (*brass bullet casings*): a cada tiro, uma cápsula dourada é ejetada com velocidade lateral, rotação tridimensional e quique dinâmico no solo.

### 8. Sistema de Times (CT vs Terroristas) & Bots Aliados (Friendly Bots)
- **Estrutura de Times e Combate Tático**:
  - O jogador faz parte do time **CT** (Contraterrorista).
  - Adicionados **Bots Aliados CT** (`CT_Alpha`, `CT_Bravo`) que cooperam com o jogador.
  - Adicionados **Bots Inimigos T** (`T_Phoenix`, `T_Leet`, `T_Balkan`).
- **Modelagem Visual Distinta por Time**:
  - **CT (Aliados)**: Farda tática azul marinho, colete balístico SWAT, capacete de Kevlar com visor tático azul e marcador holográfico 3D de aliado sobre a cabeça (`▲ CT_Alpha`).
  - **Terroristas (Inimigos)**: Jaquetas camufladas do deserto, coletes táticos marrons, bandanas vermelhas/máscaras e óculos escuros de assalto.
- **IA de Combate Tático e Dano Entre Bots**:
  - Bots CT patrulham e engajam apenas bots Terroristas visíveis.
  - Bots T perseguem e disparam contra o Jogador e contra os Bots CT aliados.
  - Combate dinâmico Bot-vs-Bot com rastros balísticos, sangue e eliminações mútuas.
  - Proteção contra fogo amigo: disparos do jogador em aliados CT não causam dano letal à equipe.
- **Placar de Equipes & Killfeed Colorido**:
  - Top HUD exibe o placar de rodadas/eliminações: **[CT 0] [Timer] [0 T]**, além do K/D individual.
  - Killfeed estilizado com destaque de cores azul para CTs (Jogador e aliados) e vermelho/laranja para Terroristas, além de ícones de Headshot.

### 9. Correção de Física dos Bots, Colisões Sólidas e Oclusão de Paredes
- **Física e Colisões Sólidas dos Bots**:
  - Implementado sistema de caixas delimitadoras AABB (`radius = 0.42m`) para os bots contra `this.map.colliders`, impedindo que atravessem paredes, caixas ou containers.
  - Adicionado deslizamento de parede (*wall sliding*) e temporizador de desvencilhamento (*unstuck timer*) caso fiquem bloqueados em esquinas estreitas.
  - Animação de caminhada com rotação alternada das pernas (`leftLeg` / `rightLeg`) e balanço pélvico no torso (`walkCycle`), eliminando o movimento estático/deslizante.
- **Oclusão Estrita de Linha de Visão e Balística (Sem Atravessar Paredes)**:
  - Raycast estrito de linha de visão a partir dos olhos dos bots: qualquer obstáculo sólido antes do alvo bloqueia a detecção.
  - Raycast instantâneo no momento exato do disparo de cada bot: se uma parede/caixa obstruir a trajetória, o projétil atinge o obstáculo gerando faíscas e traçante no ponto de impacto, sem causar dano através da parede.
- **Sistema de Guarda e Troca de Armas (Weapon Holstering / Anti-Sobreposição)**:
  - Correção na visibilidade das armas no `WeaponManager`: agora apenas a arma ativa permanece visível, garantindo que a AK-47 e a Desert Eagle nunca fiquem sobrepostas.
  - Animação suave de saque (*draw / unholster animation*) subindo a arma do coldre ao alternar entre os slots 1 e 2.

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

