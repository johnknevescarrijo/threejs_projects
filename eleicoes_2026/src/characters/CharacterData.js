/**
 * CharacterData - Informações e atributos de cada candidato das Eleições 2026
 */

export const CHARACTERS = {
  lula: {
    id: 'lula',
    name: 'Lula',
    fullName: 'Luiz Inácio Lula da Silva',
    party: 'PT - Federação Brasil da Esperança',
    number: '13',
    title: 'O Companheiro Invicto',
    slogan: 'O amor venceu e a picanha é sagrada!',
    quotes: [
      'FAZ O L, COMPANHEIRO!',
      'VAI TER PICANHA COM CERVEJINHA SIM!',
      'CALMA GENTE, O AMOR VENCEU!',
      'NUNCA ANTES NA HISTÓRIA DESTE PAÍS!'
    ],
    specialQuote: 'FAZ O L, COMPANHEIRO!',
    specials: {
      special1: {
        id: 'picanha_shot',
        name: 'Disparo de Picanha na Brasa',
        command: '↓ ↘ → + Soco (ou U)',
        desc: 'Hadouken de picanha cósmica grelhada com estrelas da esperança.'
      },
      special2: {
        id: 'giro_sindical',
        name: 'Giro Sindical / Estrela Vermelha',
        command: '→ ↓ ↘ + Soco (ou I)',
        desc: 'Avança girando os punhos como um Tatsumaki sindicalista!'
      },
      super: {
        id: 'faz_o_l_supremo',
        name: 'Chuva de Picanha & Faz o L Supremo',
        command: 'SUPER (Barra 100% + ESPAÇO)',
        desc: 'Invoca o poder das massas com chuva estelar de picanhas e explosão de amor!'
      }
    },
    specialName: 'Chuva de Picanha & Faz o L Supremo',
    specialDesc: 'Dispara uma picanha cósmica dourada envolta em estrelas da esperança.',
    themeColor: '#d32f2f',
    secondaryColor: '#ffd600',
    stats: {
      ataque: 88,
      velocidade: 78,
      defesa: 85,
      eloquencia: 98,
      carisma: 96
    },
    voicePitch: 0.82
  },
  flavio: {
    id: 'flavio',
    name: 'Flávio',
    fullName: 'Flávio Bolsonaro',
    party: 'PL - Partido Liberal',
    number: '22',
    title: 'O Senador do Chocolate',
    slogan: 'Deus, Pátria, Família e Bombom na Boca do Caixa!',
    quotes: [
      'QUESTÃO DE ORDEM NO SENADO!',
      'QUER UM BOMBOM AÍ? É DA LOJA!',
      'AQUI É O 01, DEVOLVAM O BRASIL!',
      'SÓ PRECISO QUE ME DÊ UMA LUZ!'
    ],
    specialQuote: 'QUESTÃO DE ORDEM NO SENADO!',
    specials: {
      special1: {
        id: 'trufa_explosiva',
        name: 'Trufa Explosiva de Chocolate',
        command: '↓ ↘ → + Soco (ou U)',
        desc: 'Dispara um bombom dourado giratório cortante estilo Sonic Boom.'
      },
      special2: {
        id: 'uppercut_patriota',
        name: 'Imunidade Parlamentar / Shoryuken Patriota',
        command: '→ ↓ ↘ + Soco (ou I)',
        desc: 'Salto vertical devastador com aura verde-amarela inatingível!'
      },
      super: {
        id: 'fabrica_chocolates',
        name: 'Fantástica Fábrica de Chocolates 22',
        command: 'SUPER (Barra 100% + ESPAÇO)',
        desc: 'Bombardeio dourado de caixas de bombons e depósitos fracionados explosivos!'
      }
    },
    specialName: 'Caixa de Bombom Explosiva & Rajada 22',
    specialDesc: 'Dispara caixas douradas de chocolate com rajada patriota verde-amarela.',
    themeColor: '#2e7d32',
    secondaryColor: '#fbc02d',
    stats: {
      ataque: 84,
      velocidade: 84,
      defesa: 80,
      eloquencia: 88,
      carisma: 86
    },
    voicePitch: 1.05
  },
  renan: {
    id: 'renan',
    name: 'Renan',
    fullName: 'Renan Santos',
    party: 'Partido Missão',
    number: '14',
    title: 'O Líder da Onça-Pintada',
    slogan: 'Missão 14: Lei, Ordem e Não Fuja do Debate!',
    quotes: [
      'VAI CORRER DO DEBATE?!',
      'É A MISSÃO 14, IRMÃO!',
      'CORTA ISSO PRA LIVE!',
      'O BRASIL VAI TER LEI E ORDEM!'
    ],
    specialQuote: 'VAI CORRER DO DEBATE?!',
    specials: {
      special1: {
        id: 'livro_amarelo',
        name: 'Livro Amarelo na Cara / Corte Viral',
        command: '↓ ↘ → + Soco (ou U)',
        desc: 'Arremessa o pesado calhamaço do Livro Amarelo de propostas girando em alta velocidade!'
      },
      special2: {
        id: 'bote_onca',
        name: 'Bote da Onça-Pintada',
        command: '→ ↓ ↘ + Soco (ou I)',
        desc: 'Salto rasante veloz estilo Blanka com garras de energia amarela e preta!'
      },
      super: {
        id: 'rugido_missao',
        name: 'Rugido da Onça 14 & Tsunami de Lives',
        command: 'SUPER (Barra 100% + ESPAÇO)',
        desc: 'Onda ensurdecedora de cortes virais e o rugido indomável da Onça-Pintada!'
      }
    },
    specialName: 'Rugido da Onça 14 & Tsunami de Cortes',
    specialDesc: 'Onda sonora de cortes verticais e notificações elétricas que desestabilizam o oponente.',
    themeColor: '#ffcc00',
    secondaryColor: '#141414',
    stats: {
      ataque: 86,
      velocidade: 94,
      defesa: 74,
      eloquencia: 94,
      carisma: 84
    },
    voicePitch: 1.2
  },
  caiado: {
    id: 'caiado',
    name: 'Caiado',
    fullName: 'Ronaldo Caiado',
    party: 'União Brasil',
    number: '44',
    title: 'O Coronel da Segurança',
    slogan: 'Em Goiás bandido ou muda de profissão ou muda de estado!',
    quotes: [
      'EM GOIÁS BANDIDO MUDA DE ESTADO!',
      'AQUI A ROTAM NÃO BRINCA EM SERVIÇO!',
      'NEM A, NEM B: C DE CAIADO!',
      'SEGURA O CHAPÉU DO DOUTOR!'
    ],
    specialQuote: 'EM GOIÁS BANDIDO MUDA DE ESTADO!',
    specials: {
      special1: {
        id: 'onda_berrante',
        name: 'Onda Sonora do Berrante Goiano',
        command: '↓ ↘ → + Soco (ou U)',
        desc: 'Toca o berrante de ouro disparando ondas acústicas concêntricas atordoantes.'
      },
      special2: {
        id: 'investida_cerrado',
        name: 'Investida do Cerrado (Armadura)',
        command: '→ ↓ ↘ + Soco (ou I)',
        desc: 'Avanço pesado blindado com ombrada brutal estilo E. Honda / Zangief!'
      },
      super: {
        id: 'trovao_goias',
        name: 'Trovão de Goiás: Mude de Profissão!',
        command: 'SUPER (Barra 100% + ESPAÇO)',
        desc: 'Pisão sísmico titânico que abre fendas de asfalto sob o plenário!'
      }
    },
    specialName: 'Trovão de Goiás: Mude de Profissão!',
    specialDesc: 'Pisão sísmico devastador acompanhado pelo eco estrondoso do berrante de ouro.',
    themeColor: '#1565c0',
    secondaryColor: '#d4af37',
    stats: {
      ataque: 95,
      velocidade: 72,
      defesa: 94,
      eloquencia: 86,
      carisma: 88
    },
    voicePitch: 0.9
  },
  curry: {
    id: 'curry',
    name: 'Curry',
    fullName: 'Eduardo Cury / Chef Curry',
    party: 'PL / Golden State das Urnas',
    number: '22',
    title: 'O Arremessador de 3 Pontos',
    slogan: 'Da linha de 3 direto pro segundo turno com tecnologia e gestão!',
    quotes: [
      'CESTA DE 3 NO SEGUNDO TURNO!',
      'SPLASH! TRÊS PONTOS NA URNA!',
      'PARQUE TECNOLÓGICO E GESTÃO DE PONTA!',
      'DO MEIO DA QUADRA DIRETO PRO PLANALTO!'
    ],
    specialQuote: 'SPLASH! TRÊS PONTOS NA URNA!',
    specials: {
      special1: {
        id: 'urna_passe',
        name: 'Passe de Peito com Urna',
        command: '↓ ↘ → + Soco (ou U)',
        desc: 'Lança uma Urna Eletrônica rápida e giratória em linha reta estilo Hadouken.'
      },
      special2: {
        id: 'slam_dunk',
        name: 'Enterrada no Plenário (Slam Dunk)',
        command: '→ ↓ ↘ + Soco (ou I)',
        desc: 'Salto acrobático espetacular cravando uma urna de cima para baixo como antiaéreo!'
      },
      super: {
        id: 'chuva_3pts',
        name: 'Chuva de 3 Pontos do Meio da Quadra',
        command: 'SUPER (Barra 100% + ESPAÇO)',
        desc: 'Dispara 3 Urnas Eletrônicas flamejantes em parábola perfeita que caem com som da rede estalando!'
      }
    },
    specialName: 'Chuva de 3 Pontos do Meio da Quadra!',
    specialDesc: 'Salta nas alturas e lança Urnas Eletrônicas flamejantes em arco parabólico fulminante.',
    themeColor: '#0288d1',
    secondaryColor: '#ffc107',
    stats: {
      ataque: 90,
      velocidade: 96,
      defesa: 70,
      eloquencia: 86,
      carisma: 94
    },
    voicePitch: 1.15
  }
};
