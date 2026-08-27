# ⚽ Futebol de Botão 3D (Three.js)

Um jogo interativo e completo de **Futebol de Botão 3D** construído com **Three.js** e JavaScript ES6 moderno, executado 100% no navegador via CDN (sem necessidade de bundlers, npm ou dependências pesadas).

---

## 🎮 Modos de Jogo & Recursos

- **Modos de Jogo:**
  - 👤🤖 **1 Jogador (vs Bot):** Desafie a Inteligência Artificial escolhendo jogar de **Vermelho** ou **Azul**.
  - 👥 **2 Jogadores (Local):** Dispute com um amigo em turnos alternados no mesmo teclado/mouse.
  - 🤖🤖 **Assistir (Bot vs Bot):** Acompanhe uma partida simulada entre dois bots autônomos.
- **Inteligência Artificial (Bot):**
  - Quatro níveis de desafio: **🟢 Fácil (Iniciante)**, **🟡 Médio (Equilibrado)**, **🔴 Craque (Difícil)** e **👑 Lendário (Extremo Master)**.
  - Tomada de decisão analítica profunda: simulação física prospectiva dos lances, passes e assistências para armação de jogadas, bloqueios posicionais para anular o contra-ataque adversário, raycasting de desobstrução, jogadas de tabela (bank shots) e velocidade máxima de disparo ($3.4\times$).
  - Animação de mira e tempo de raciocínio dinâmico da IA antes de chutar.
- **Mesa de Botão Clássica:** Campo verde com marcações detalhadas e tabelas/bordas elevadas de madeira para jogadas de rebote.
- **Peças Tradicionais:**
  - **10 Botões de linha por time** (Vermelho vs Azul) com números e efeito de acrílico/plástico.
  - **Goleiros retangulares** de acrílico translúcido com física de peso realista.
  - **Bolinha leve** no centro do campo.
- **Mecânica de Chute (Slingshot / Estilingue):** Clique no botão do seu time, puxe para trás para dosar a mira e a intensidade, e solte para disparar.
- **Física 2.5D Customizada:**
  - Deslizamento com atrito suave.
  - Colisões elásticas círculo-círculo com conservação de momento.
  - Rebotes nas tabelas de madeira e traves.
  - Detecção automática de **GOL** com reposicionamento automático.
- **Sistema de Turnos & Placar:** Alternância automática de vez com badges interativos no placar ("VOCÊ", "BOT", "JOGADOR 1/2").
- **Efeitos Sonoros Nativos (Web Audio API):** Sons sintetizados em tempo real para impactos de acrílico, batidas na madeira, chutes, apito do juiz e comemoração de gol.
- **Múltiplos Ângulos de Câmera:** Alternância rápida entre visão isométrica, vista aérea superior (top-down) e visão atrás de cada um dos times.

---

## 🕹️ Como Jogar

1. **Menu de Opções:** Logo no início (ou clicando no botão `⚙️ Modo de Jogo`), selecione o **Modo de Jogo**, seu **Time** e o **Nível da IA**.
2. **Disparo:** No seu turno, clique com o **botão esquerdo** em um botão do seu time.
3. **Mira & Força:** Arraste o mouse para trás para esticar o vetor de mira e aumentar a força do chute.
4. **Chutar:** Solte o botão do mouse para impulsionar a peça.
5. **Câmera:**
   - **Girar:** Segure o botão direito do mouse e arraste.
   - **Zoom:** Use a roda do mouse (scroll).
   - **Mover:** Botão do meio do mouse (pan).
   - **Câmeras pré-definidas:** Clique no botão `📷 Alternar Câmera`.

---

## 🚀 Como Executar o Jogo

Como o projeto utiliza ES6 Modules com Three.js via CDN, basta executar de uma das formas abaixo:

### Opção 1: Servidor Local com Python (Recomendado)
Se tiver Python instalado, abra o terminal na pasta do projeto e execute:

```bash
# Python 3
python3 -m http.server 8000
```
Em seguida, abra o navegador e acesse:
👉 **`http://localhost:8000`**

---

### Opção 2: Servidor Local com Node.js / npx
Se tiver Node.js instalado:

```bash
npx serve .
```
Ou usando `http-server`:
```bash
npx http-server -p 8000
```

---

### Opção 3: Extensão Live Server (VS Code)
Se estiver usando o VS Code, basta clicar com o botão direito no arquivo `index.html` e selecionar **"Open with Live Server"**.

---

### Opção 4: Abertura Direta
Você também pode abrir o arquivo `index.html` com duplo clique em navegadores modernos que suportem importmaps locais.

---

## 📁 Estrutura do Projeto

```text
jogo_fubetol/
├── index.html      # Aplicação completa (Three.js, física, IA, controles, áudio e UI)
├── README.md       # Apresentação do projeto, modos de jogo e guia de execução
├── AGENTS.md       # Diretrizes e especificações do jogo
└── MEMORY.md       # Memória técnica, arquitetura e decisões de projeto
```

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 & CSS3** (Interface translúcida com backdrop blur)
- **JavaScript ES6 Modules**
- **Three.js (v0.160.0)** via CDN `importmap`
- **OrbitControls**
- **Web Audio API** (Sintetizador de áudio procedural)

---

Divirta-se jogando Futebol de Botão 3D! ⚽🏆
