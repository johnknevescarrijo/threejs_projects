Projeto: Mini Militia 2D (Nostalgia Modernizada)
Visão Geral do Projeto
Jogo de tiro em arena 2D multiplayer (vs IA) inspirado no clássico Mini Militia / Doodle Army 2, com visual nostálgico modernizado e jogabilidade polida em qualidade AAA para navegador.

Estilo Visual
Elemento	Especificação
Estilo geral	2D com arte vetorial nítida, cores vibrantes, sombras suaves
Tema	Selva/militar com paleta terrosa + verde militar + laranja de explosões
Personagens	Bonecos stickman estilizados com equipamentos visíveis (armas, mochila jetpack)
Cenário	Plataformas, pontes, cavernas, caixas, barris, vegetação
Efeitos	Partículas (fumaça, fogo, faíscas), clarões, rastros de bala, marcas de hit
UI	Estilo nostálgico-moderno: bordas arredondadas, vidro fosco, neon suave
Vibe: "Mini Militia da infância, reconstruído para 2026"

Mecânicas Núcleo
Sistema	Descrição
Gênero	Arena shooter 2D com visão lateral
Jogadores	1 humano vs 5 bots de IA
Objetivo	Primeiro a 15 abates em 5 minutos
Movimento	WASD / Setas (direcional 8 direções)
Mirar	Ponteiro do mouse (360°)
Atirar	Clique esquerdo (com cooldown por arma)
Jetpack	Espaço (combustível limitado, recarrega no chão)
Recarregar	Tecla R
Granada	Tecla G (arremesso com parábola)
Armas	1, 2, 3 (troca rápida)
Ressurgimento	3 segundos após morte (em local seguro)
Arsenal
Arma	Dano	Cadência	Munição	Alcance	Especial
🔫 Pistola	10	Médio	12	Médio	Padrão, precisa
🔫 Espingarda	8x6	Lento	6	Curto	Espalhamento, devastador perto
🔫 Fuzil Assalto	8	Rápido	30	Longo	Automático, versátil
🔫 Sniper	50	Muito lento	5	Muito longo	Tiro único letal
🚀 Lança-foguetes	80	Lento	3	Longo	Explosão em área
Coletáveis no mapa:

Armas (spawn em pontos fixos)

Granadas (máx 3)

Kit de vida (+25 HP)

Combustível jetpack (+50%)

Inteligência Artificial (Bots)
Comportamentos (todos implementados):

✅ Movimentação tática (andar, pular, usar jetpack)

✅ Mirar no jogador com precisão variável (ajustável por dificuldade)

✅ Atirar quando em alcance

✅ Perseguir jogador ou fugir para cobertura

✅ Usar jetpack para reposicionamento vertical

✅ Coletar armas melhores no mapa

✅ Buscar vida e combustível quando baixo

✅ Flanquear e atirar de cobertura

✅ Reagir a tiros recebidos

Dificuldade dos bots: Adaptativa (melhoram com o tempo ou fixa em "média" para MVP)

Mapa (Arena Selva/Militar)
Dimensões: 1600x900 (viewport com câmera que segue o jogador)

Elementos:

🏗️ Plataformas flutuantes (3 níveis de altura)

🌉 Pontes suspensas

🕳️ Cavernas subterrâneas (túneis)

📦 Caixas de munição/cobertura

🛢️ Barris explosivos (destrutíveis)

🌿 Vegetação (visual, sem colisão)

🎯 Pontos de spawn de armas (marcados no minimapa)

💀 Zonas de ressurgimento (seguras)

Design: Verticalidade é crucial (jetpack é essencial para navegação)

HUD (Interface no Jogo)
Elemento	Posição	Estilo
Barra de Vida	Inferior esquerdo	Verde → Vermelho (gradiente)
Barra de Combustível Jetpack	Inferior esquerdo (abaixo da vida)	Azul com brilho
Munição atual	Inferior direito	Ícone da arma + contador
Arma equipada	Inferior direito	Ícone grande
Temporizador	Superior central	Digital neon
Pontuação (Jogador vs Bots)	Superior esquerdo/direito	Placar estilizado
Feed de abates	Superior direito (rolagem)	"[Jogador] matou [Bot]"
Minimapa	Canto inferior direito	Circular com pontos coloridos
Estados do Jogo (Fluxo Completo)
text
MENU PRINCIPAL
    ├── JOGAR → Entra na arena
    ├── LOADOUT → Personalizar armas (futuro)
    ├── PERSONAGEM → Skins (futuro)
    └── CONFIGURAÇÕES → Áudio, sensibilidade, teclas

→ ARENA (Partida)
    ├── Pré-jogo (3, 2, 1, GO!)
    ├── Loop principal (5 minutos)
    │   ├── Jogador vivo → Combate
    │   ├── Jogador morto → Tela de ressurgimento (3s)
    │   └── Bot morto → Ressurgimento automático
    └── Fim de jogo (tempo esgotado OU 15 abates)

→ TELA DE RESULTADOS
    ├── VITÓRIA ou DERROTA
    ├── Estatísticas: Abates / Mortes / Precisão (%) / Melhor sequência
    └── Botão REVANCHE → Reinicia partida
Eventos e Feedback (Polimento)
Evento	Feedback Visual	Feedback Sonoro
Tiro	Clarão de cano, rastro de bala	"Pew" (distinto por arma)
Acerto	Marcador vermelho (X), número de dano	"Hit" satisfatório
Morte	Animação de queda, explosão de partículas	"Ugh" + som de queda
Ressurgimento	Flash branco, fade-in	"Whoosh"
Jetpack	Chamas laranja, partículas	"Fsssssss"
Explosão (granada/rocket)	Onda de choque, tela treme	"BOOM" grave
Coleta de item	Brilho + ícone flutuante	"Pickup"
Recarga	Animação da arma	"Click-clack"
Fim de jogo	Tela escurece, confetes ou derrota	Música de vitória/derrota
Vibração de tela: Pequeno tremor em tiros fortes, explosões e mortes.

Tecnologia
Stack recomendada:

React 18+ (UI e gerenciamento de estado)

TypeScript (tipagem segura)

Canvas 2D (renderização do jogo)

Web Audio API (efeitos sonoros procedurais ou samples leves)

CSS moderno (UI estilizada)

Estrutura de pastas sugerida:

text
src/
├── game/
│   ├── core/          (Game loop, câmera, input)
│   ├── entities/      (Player, Bot, Projetil, Item)
│   ├── map/           (Arena, plataformas, colliders)
│   ├── weapons/       (Armas, balística)
│   ├── ai/            (Bot behaviors)
│   └── effects/       (Partículas, explosões, tela)
├── ui/
│   ├── menu/          (Menu principal)
│   ├── hud/           (HUD do jogo)
│   └── results/       (Tela de resultados)
└── assets/
    ├── sprites/       (Personagens, armas, itens)
    ├── sounds/        (Efeitos sonoros)
    └── fonts/         (Fonte nostálgica)
Requisitos de Performance
✅ 60 FPS estáveis em navegadores modernos

✅ Otimização de partículas (pooling)

✅ Renderização eficiente no Canvas (dirty rectangles ou tile-based)

✅ Asset loading com fallbacks

✅ Código leve (< 2MB total)

Critérios de Aceite (MVP)
□ Menu principal com todas as opções (mesmo que LOADOUT seja placeholder)
□ Partida funcional: entrar → jogar → morrer → ressurgir → terminar
□ 5 bots com comportamento realista (não ficam parados)
□ Todas as 5 armas funcionando com diferenças perceptíveis
□ Jetpack funcional com combustível
□ Coletáveis no mapa (armas, vida, granadas, combustível)
□ Fim de partida com resultados e revanche
□ Efeitos visuais e sonoros satisfatórios
□ UI bonita e responsiva
□ Sem assets placeholder (tudo original)
Priorização (Lean Development)
Fase 1 (Núcleo):

Player com movimento, mira, tiro

1 bot simples (move + atira)

3 armas básicas (pistola, fuzil, sniper)

Mapa simples com plataformas

HUD mínimo (vida, munição, pontuação)

Fase 2 (Polimento):

Todos os 5 bots com IA avançada

Todas as 5 armas

Jetpack com física

Coletáveis e itens

Efeitos visuais/sonoros

Fase 3 (Experiência):

UI completa (menu, resultados)

Ciclo completo de partida

Otimização e polish final

Teste de jogabilidade

Estilo Visual (UI)
Paleta de cores:

Fundo: #1a1a2e (azul escuro)

Destaque: #e94560 (vermelho neon) e #ffd700 (ouro)

Texto: #ffffff e #f0f0f0

Cards: rgba(255,255,255,0.05) com blur

Fontes:

Títulos: "Press Start 2P" (retrô)

Corpo: "Inter" ou "Segoe UI" (moderno)

Números: "Orbitron" (futurista)

Botões:

Efeito hover com brilho suave

Canto arredondado (12px)

Sombra sutil

Próximos Passos Imediatos
Setup do projeto: React + TypeScript + Vite

Canvas game loop: Configurar renderização básica

Player controller: Movimento + mira com mouse

Sistema de tiro: Projéteis com física simples

Bot básico: Movimento aleatório + tiro direcionado

Mapa: Carregar arena com plataformas

Data de criação: 2026-09-01
Status: Especificação aprovada para desenvolvimento
Prioridade: JOGABILIDADE > VISUAL > RECURSOS EXTRAS

