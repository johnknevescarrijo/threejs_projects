# 🗳️ ELEIÇÕES 2026: DEBATE MORTAL (Edição Charge 3D)

Um jogo de luta 3D em Three.js com estilo caricato / charge política de jornal animada, ambientado no cenário icônico da Praça dos Três Poderes em Brasília com o Congresso Nacional.

---

## 👥 Os Candidatos e Seus Especiais

1. **Lula (#13)**
   - **Estilo:** Terno escuro, gravata vermelha vibrante, estrela na lapela, barba e cabelos grisalhos volumosos.
   - **Golpe Especial:** *"Chuva de Picanha & Companheirismo"* — Dispara uma picanha cósmica flamejante envolta em estrelas da esperança!
   - **Frase de Efeito:** `"FAZ O L, COMPANHEIRO!"`

2. **Flávio Bolsonaro (#22)**
   - **Estilo:** Terno azul-marinho nobre, gravata listrada verde e amarela, broche patriota e topete penteado.
   - **Golpe Especial:** *"Caixa de Bombom Explosiva / Rajada Patriota"* — Dispara caixas de chocolate douradas com rajada verde-amarela.
   - **Frase de Efeito:** `"QUESTÃO DE ORDEM!"`

3. **Renan Santos (#44)**
   - **Estilo:** Terno moderno sobre camisa preta com detalhes amarelos (MBL / Missão), barba alinhada e megafone de live.
   - **Golpe Especial:** *"Tsunami de Cortes da Live"* — Onda sônica amarela com flashes digitais e cortes verticais desestabilizadores.
   - **Frase de Efeito:** `"VAI CORRER DO DEBATE?!"`

4. **Ronaldo Caiado (#25)**
   - **Estilo:** Terno clássico com chapéu sertanejo goiano de aba larga, porte ereto e fivela dourada.
   - **Golpe Especial:** *"Trovão do Cerrado / Berrante Sísmico"* — Pisão sísmico devastador no chão com o eco estrondoso do berrante.
   - **Frase de Efeito:** `"AQUI EM GOIÁS A LEI FUNCIONA!"`

5. **Curry (#30)**
   - **Estilo:** Terno azul royal com detalhes dourados, faixa esportiva e pose de arremessador de basquete.
   - **Golpe Especial:** *"Urna de 3 Pontos do Meio da Quadra!"* — Salta nas alturas em câmera lenta e arremessa uma Urna Eletrônica flamejante em arco parabólico.
   - **Frase de Efeito:** `"CESTA DE 3 NO SEGUNDO TURNO!"`

---

## 🏛️ Cenário 3D & Efeitos

- **Arena Brasília:**
  - O **Congresso Nacional** com suas duas cúpulas (Câmara dos Deputados aberta para cima, Senado Federal invertida) e as torres gêmeas H de 28 andares ao fundo com janelas iluminadas ao entardecer.
  - Tablado central de debate com carpete vermelho e púlpitos com microfones estilizados.
  - Holofotes móveis varrendo o céu crepuscular do Planalto Central.
  - Plateia animada comemorando e balançando bandeirinhas.
- **Partículas:**
  - Quando um golpe acerta o candidato, voam **"santinhos eleitorais"** com sua foto e número de campanha!
  - Faíscas de microfonia, bloqueios com escudo de energia azul e balões de HQ (`"POW!"`, `"DIREITO DE RESPOSTA!"`, `"FAKE NEWS!"`, etc).
- **Áudio Sintetizado (Web Audio API):**
  - O som autêntico e inconfundível da **Urna Eletrônica Brasileira** (*PIM-lim-lim-lim-PIM!*) ao confirmar o voto e ao fim de cada turno.
  - Trilha sonora procedural de debate empolgante com bateria, baixo groove e fanfarras de TV.

---

## 🎮 Controles

### Modo 1 Jogador vs CPU:
- **Mover:** `A` / `D` ou `Setas Esquerda / Direita`
- **Pular:** `W` ou `Seta Cima`
- **Defender / Agachar:** `S` ou `Seta Baixo` (reduz dano em 80%!)
- **Soco Rápido (Jab):** `F` ou `J`
- **Soco Forte (Gancho):** `G` ou `K`
- **Chute (Rasteira de Campanha):** `H` ou `L`
- **Super Especial:** `Espaço` ou `U` (requer barra de Fundo Eleitoral 100%)
- **Mutar Som:** `M` ou botão no canto superior direito

### Modo 2 Jogadores (PvP Local):
- **Jogador 1:** `A`/`D` (Mover), `W` (Pular), `S` (Defender), `F` (Soco), `G` (Forte), `H` (Chute), `Espaço` (Especial).
- **Jogador 2:** `Setas` (Mover, Pular, Defender), `J` (Soco), `K` (Forte), `L` (Chute), `Enter` (Especial).

---

## 🚀 Como Executar

```bash
# Modo de desenvolvimento (Vite)
npm run dev

# Ou construir e pré-visualizar
npm run build
npm run preview
```
