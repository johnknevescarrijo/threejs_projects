# 🏎️ My Kart — Autonomous AI Racing Game (Three.js)

Um jogo de corrida de kart estilo arcade 3D completo, desenvolvido com **Three.js** e **Vite**, que implementa com total fidelidade a especificação de agentes autônomos e IA descrita em [AGENTS.MD](AGENTS.MD).

![Three.js](https://img.shields.io/badge/Three.js-r186-black?logo=three.dot.js)
![Vite](https://img.shields.io/badge/Vite-v8-blueviolet?logo=vite)
![Web Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API-orange)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🎮 Visão Geral

O projeto reproduz a dinâmica frenética de corridas arcade consagradas (*Mario Kart*, *Crash Team Racing*), colocando o jogador em uma disputa contra **7 pilotos de IA autônomos**, cada um com traçado adaptativo, percepção espacial por raycasts não-oniscientes, máquina de estados finitos (FSM) para disparo de armas, drift com Mini-Turbo e um sistema dinâmico de ajuste de dificuldade (*Rubber Banding / DDA*).

---

## 🚀 Como Executar

### Pré-requisitos
* [Node.js](https://nodejs.org/) versão 18 ou superior instalado.

### Passo a Passo
1. Clone ou acerte o diretório do projeto:
   ```bash
   cd /home/john/Programacao/Estudos/threejs_projects/my_kart
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento Vite:
   ```bash
   npm run dev
   ```
   Abra a URL exibida no terminal (ex: `http://localhost:5173`) no seu navegador.

4. Para compilar a versão otimizada de produção:
   ```bash
   npm run build
   npm run preview
   ```

---

## 🕹️ Controles do Jogador

| Tecla / Comando | Ação |
| :--- | :--- |
| **W** ou **Seta para Cima** | Acelerar o kart |
| **S** ou **Seta para Baixo** | Frear / Marcha ré |
| **A** / **D** ou **Setas Laterais** | Esterçar para a Esquerda / Direita |
| **Espaço** ou **Shift** | Pular / Iniciar Drift com Mini-Turbo / Manobra Aérea (*Trick Stunt*) |
| **E** ou **Enter** | Utilizar Item / Segurar para manter Escudo Traseiro |
| **F** | Alternar Escudo Traseiro (Travar Casca/Casco atrás) |
| **T** | **Alternar Circuito Temático (Grand Prix ↔ Sunset Dunes ↔ Cyber Neon)** |
| **Q** ou **V** | Olhar para trás (Visão traseira do espelho) |
| **C** | Alternar Câmera (3ª Pessoa Chase ↔ Visão do Capô) |
| **B** | Alternar Visualizador de Sensores de IA (Raycasts 3D em tempo real) |
| **G** | Alternar Efeito Gráfico de Pós-Processamento (*Bloom Neon*) |
| **M** | Ligar / Silenciar Efeitos Sonoros |
| **R** | Recolocar kart na pista (Respawn imediato) |

---

## 🏆 Circuitos Temáticos Selecionáveis (`[T]`)

O jogo conta com **3 circuitos completos** selecionáveis em tempo real ou salvos em sessão:

1. 🏆 **Copa Solar Grand Prix (`GRAND_PRIX`):**
   * Circuito clássico ensolarado estilo festival arcade.
   * Asfalto cinza tradicional com trilhos de borracha e zebras esportivas vermelhas e brancas.
   * Lago central refletivo de águas azuis, montanhas verdejantes no horizonte e florestas de pinheiros.
   * Semáforo de pórtico 3D com contagem regressiva e arquibancadas com espectadores animados.

2. 🏜️ **Deserto Sunset Dunes (`SUNSET_DUNES`):**
   * Traçado rápido no deserto sob céu crepuscular laranja, violeta e dourado com sol poente dramático.
   * Terreno de areia dourada com dunas ondulantes e zebras douradas e terracota.
   * **3 Pirâmides Monumentais 3D** no horizonte com piramidions dourados polidos reluzentes.
   * Oásis central com água turquesa esmeralda cristalina e palmeiras tropicais.

3. 🌆 **Metrópole Cyber Neon (`CYBER_NEON`):**
   * Traçado noturno de alta tecnologia synthwave / retrowave.
   * Céu escuro pontilhado de estrelas e névoa magenta/cyan.
   * **Mais de 40 arranha-céus e torres 3D** ao redor da pista com colunas de janelas em Neon Cyan (`#00f2fe`) e Neon Magenta (`#d946ef`), além de antenas de comunicação com balizas vermelhas piscantes.
   * Asfalto high-tech escuro com micrograde digital e zebras neon brilhantes.

---

## ⚡ Recursos e Mecânicas Avançadas (Features 1, 2 e 3)

### 1. Sistema de Moedas e Slot Duplo de Itens
* **🪙 Moedas na Pista (0 a 10):** Espalhadas em linhas de tangência, ápices e arcos aéreos. Cada moeda confere +1.2% de velocidade máxima (até +12%) e um micro-impulso na coleta. O impacto com itens ou obstáculos faz o piloto perder até 3 moedas.
* **📦 Slot Duplo de Itens:** Permite carregar um item ativo e um item reserva secundário, com roleta dupla animada e suporte a **Caixas de Itens Duplas (`2X`)**.
* **🛡️ Escudo Traseiro Ativo:** Segurar **`E`** ou pressionar **`F`** mantém cascas de banana e cascos posicionados na traseira do kart, bloqueando impactos de tiros rivais.
* **Novos Itens Especiais:**
  * ⭐ **Super Estrela:** Imunidade total, aceleração aumentada, efeito visual rainbow e capacidade de abalroar rivais e atravessar obstáculos sem sofrer dano.
  * 👑🍄 **Cogumelo Dourado:** Dispara turbos contínuos repetidos durante 5.5 segundos.
  * 📦 **Caixa Falsa de Itens:** Armadilha explosiva com o ponto de interrogação `?` invertido.

### 2. Física Vertical, Rampas de Salto e Ultra Mini-Turbo
* **🎢 Rampas de Salto 3D:** Quatro rampas estrategicamente posicionadas no circuito (incluindo uma rampa radical no atalho) com bordas neon pulsantes e chevrons luminosos.
* **✨ Manobras Aéreas (*Trick Stunts*):** Pressionar **Espaço / Drift** na borda da rampa ou em pleno ar executa acrobacias acrobáticas (giro 360° ou barrel roll corkscrew), recompensando uma aterrissagem perfeita com um **Trick Boost** imediato.
* **💜 Ultra Mini-Turbo (Estágio 3 - Roxo):** Carregado após 3.4s de drift contínuo, liberando uma rajada turbo de 2.7 segundos (+42 km/h).
* **🎁 Caixas de Itens e Moedas Aéreas:** Coletas suspensas em arcos aéreos para pilotos que dominam o timing dos saltos.

### 3. Redesign da Pista, Perigos Dinâmicos e Superfícies
* **🏎️ Banking 3D nas Curvas:** Curvas peraltadas com inclinação transversal física e visual suave, fazendo o kart se inclinar harmoniosamente com a força centrífuga.
* **🚇 Túnel Iluminado em Neon ($t \in [0.44, 0.53]$):** Arcos estruturais futuristas com anéis de néon em ondas de luz cyan/magenta/amarelo e teto translúcido aerodinâmico.
* **🏛️ Pilares de Viaduto:** Suportes arquitetônicos maciços de concreto armado com anéis de aço que sustentam as seções elevadas da pista sobre o solo.
* **❄️ Zonas de Gelo (`ICE`):** Trechos azul-celeste translúcidos que aumentam a velocidade em +5% e reduzem o atrito lateral para derrapagens velozes.
* **🪵 Zonas de Lama (`MUD`):** Poças de lama espessas nas chicanes que reduzem severamente a tração e velocidade a menos que o piloto use turbo ou estrela.
* **⚠️ Obstáculos Dinâmicos (`this.hazards`):** 4 pilares/martelos industriais com listras amarelo/preto e núcleos de néon vermelho que oscilam transversalmente pela pista, forçando o jogador e a IA a desviarem para evitar spin-outs!

---

## 🧠 Implementação Fiel das Regras do AGENTS.MD

### 1. Pipeline Desacoplado de Decisão em 4 Camadas
Cada piloto de IA opera sob 4 níveis estruturados por tick de simulação:
1. **Percepção e Sensores:** Avaliação da spline central, largura da pista e raios de proximidade.
2. **Navegação e Steering:** Escolha entre traçado ideal, defensivo ou coleta de itens.
3. **FSM de Itens:** Decisão contextual de disparo de projéteis, escudos ou turbos.
4. **Atuação Motora:** Aplicação direta de aceleração, esterço e contraesterço no motor físico a 60 Hz.

### 2. Percepção e Sensores (Context Awareness)
* **Raycast Frontal Longo (15m–25m):** Identifica cascas de banana, karts lentos e obstáculos.
* **Raycasts Diagonais/Laterais (3m–6m):** Detectam fechadas de curva e risco de colisão lateral.
* **Sensor Traseiro (10m):** Detecta aproximação de rivais pegando vácuo (*slipstream*) ou ameaças de projéteis.
* **Scan de Colecionáveis:** Esfera de detecção em 14m em busca de caixas de itens.
* *Dica:* Pressione a tecla **`B`** para visualizar todas as linhas de sensores de todos os pilotos de IA em tempo real!

### 3. Comportamento de Direção e Mecânica de Drift
* **Linha de Corrida Adaptativa:**
  * **Traçado Ideal (Fora-Dentro-Fora):** A IA calcula a curvatura à frente na spline 3D e tangencia as curvas pelo ápice interno.
  * **Traçado Defensivo:** Quando um rival pressiona por trás, a IA ocupa o meio da pista para fechar a linha de ultrapassagem.
  * **Traçado de Coleta:** Desvia temporariamente para coletar caixas de itens ativas.
* **Mecânica de Drift e Mini-Turbo:**
  * Ativado quando a curvatura à frente é superior a **35°** e a velocidade excede **70%** da máxima.
  * O kart solta faíscas azuis (Estágio 1 - 1.2s) e laranjas (Estágio 2 - 2.4s), liberando um surto de velocidade ao alinhar a direção!
* **Atalho Off-road Inteligente:**
  * O circuito conta com um atalho de terra que corta a curva fechada.
  * Normalmente, superfícies off-road geram forte arrasto (45% da velocidade normal).
  * **Exceção do AGENTS.md:** Se a IA possuir um Cogumelo/Turbo, ela reavalia o atalho off-road como caminho preferencial e dispara o turbo para cortar caminho!

### 4. Árvore de Decisão de Itens (Item FSM)
* 🐢 **Casco Verde (Projétil Direto):** Disparo reto em alta velocidade que ricocheteia nos muros. Disparado para trás se o rival tentar ultrapassagem.
* 🎯 **Casco Vermelho (Projétil Teleguiado):** Persegue ativamente o kart rival imediatamente à frente ao longo da pista.
* 🍌 **Casca de Banana (Item de Solo):** Depositada no ápice das curvas, em trechos estreitos ou atrás de caixas de itens para fazer os rivais rodopiarem.
* 🍄 **Super Cogumelo (Impulso Instantâneo):** Garante aceleração máxima imediata e imunidade ao atrito da grama.
* 👑 **Casco Azul de Espinhos & ⚡ Raio Elétrico:** Itens de choque em área que punem os líderes, rolados preferencialmente para pilotos nas posições traseiras (P6–P8).

### 5. Dificuldade Dinâmica (Rubber Banding / DDA) & Trava Fair Play
* **IA Muito à Frente (+4s de vantagem):** Reduz velocidade máxima em 4% e diminui a precisão em curvas.
* **IA Muito Atrás (-4s de desvantagem):** Ganha +6% de aceleração, +3% de velocidade máxima e maior taxa de itens poderosos.
* 🛡️ **Trava de Fair Play:** O sistema DDA é **automaticamente desligado nos últimos 300 metros da volta final**, garantindo que a vitória ou derrota seja decidida 100% pelo mérito de pilotagem do jogador!

### 6. Personalidades dos Pilotos (Arquétipos)
1. 🔴 **O Agressivo (Rex "Brutus"):**
   * Agressividade: 0.9 | Precisão: 0.6 | Risco de Atalho: 0.8
   * Abalroa os rivais, utiliza itens ofensivamente assim que os obtém e se arrisca em atalhos.
2. 🔵 **O Técnico (Aria "Apex"):**
   * Agressividade: 0.2 | Precisão: 0.95 | Risco de Atalho: 0.4
   * Tangenciamento clássico perfeito, maximiza Mini-Turbos em todas as curvas e evita qualquer contato físico.
3. 🟢 **O Tático / Defensivo (Vance "Shield"):**
   * Agressividade: 0.5 | Precisão: 0.8 | Defesa: 0.95
   * Mantém cascas presas na traseira como escudo protetor e bloqueia ativamente o centro da pista.

### 7. Otimização e LOD (Level of Detail)
* **Tick Rate de Decisão:** 12.5 Hz (entre 10 Hz e 20 Hz) para o cérebro tático e FSM de itens, preservando 60 Hz estritos para o motor de física.
* **LOD de Proximidade:** Karts próximos (<35m) realizam raycasts completos e cálculos físicos de colisão; karts distantes (>80m) operam por interpolação geométrica simplificada na spline central.

### 8. Sistema de Desbloqueio e Recuperação da IA (Anti-Stuck & Recovery)
* **Projeção Localizada de Spline:** A busca por amostras de pista restringe-se a uma janela móvel ($t \pm 45$ nós), evitando que os karts confundam loops e trechos paralelos em curvas fechadas.
* **Esterço em Baixa Velocidade:** Karts parados mantêm raio de giro para manobrar para fora das barreiras.
* **Recuperação por Marcha à Ré & Failsafe:** Caso um kart fique com velocidade $< 3.5\text{ m/s}$ por $> 1.2\text{s}$, aciona marcha ré com contraesterço. Se persistir travado por $> 3\text{s}$, é suavemente reposicionado na pista com velocidade frontal.
* **Suspensão Dinâmica e Gráficos:** Domo celeste atmosférico, marcas de borracha na pista durante drift, linhas de vento 3D em alta velocidade, arquibancadas com torcida e chevrons luminosos nas curvas.

---

## 🔊 Sistema de Áudio Sintético Procedural

O jogo utiliza a **Web Audio API** nativa do navegador para sintetizar todos os efeitos sonoros em tempo real, sem carregar arquivos pesados:
* Ronco progressivo do motor com modulação de frequência de acordo com a velocidade do kart.
* Zunido agudo e faíscas sonoras durante o carregamento de Mini-Turbos.
* Efeito de explosão e sweep de arremesso de cascos e uso de turbos.
* Toque característico de coleta de caixa de itens e fanfarra de volta/vitória.

---

## 📂 Estrutura de Arquivos

```
my_kart/
├── AGENTS.MD             # Especificação conceitual dos agentes autônomos
├── MEMORY.md             # Memória do projeto, decisões de arquitetura e constantes
├── README.md             # Documentação oficial do projeto (este arquivo)
├── index.html            # Ponto de entrada HTML e estrutura do HUD arcade
├── package.json          # Configurações do projeto e scripts npm
├── src/
│   ├── main.js           # Loop principal do Three.js, cena, grid de largada e orquestração
│   ├── ai/
│   │   ├── aiController.js # Cérebro autônomo da IA (4 camadas, FSM, DDA, Trava Fair Play)
│   │   ├── archetypes.js   # Perfis de personalidade (Agressivo, Técnico, Tático)
│   │   └── sensors.js      # Sistema de raycasts frontais, laterais, traseiros e debug visual
│   ├── audio/
│   │   └── sound.js        # Sintetizador procedural via Web Audio API
│   ├── core/
│   │   ├── camera.js       # Câmera em 3ª pessoa suave com FOV dinâmico e screen-shake
│   │   ├── constants.js    # Constantes físicas, regras de pista e configurações de armas
│   │   └── track.js        # Gerador 3D da pista spline, zebras, atalho off-road e cenários
│   ├── entities/
│   │   ├── item.js         # Entidades de projéteis (Verde, Vermelho, Azul, Banana, Cogumelo)
│   │   ├── itemBox.js      # Caixas de itens flutuantes 3D com rotação e temporizador de respawn
│   │   └── kart.js         # Modelo 3D do kart, rodas animadas, chassi, drift e física
│   └── ui/
│       ├── hud.js          # Gerenciador do HUD (Minimap, velocímetro, roleta, telemetria)
│       └── style.css       # Estilização arcade retro-futurista para a interface
```

---

## 📄 Licença

Este projeto está licenciado sob os termos da licença **MIT**.
