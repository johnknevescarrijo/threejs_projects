/**
 * SoundManager - Gerador procedural de áudio via Web Audio API
 * Sem dependência de arquivos externos MP3/WAV!
 * Inclui o autêntico som da Urna Eletrônica Brasileira (PIM-lim-lim-lim-PIM)!
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isMuted = false;
    this.initialized = false;

    // Estado da música de fundo de debate
    this.isPlayingMusic = false;
    this.musicInterval = null;
    this.beatStep = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn('Web Audio API não inicializada:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    } else if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * O autêntico e lendário som da URNA ELETRÔNICA Brasileira!
   * Primeiro tom alto, quatro beeps rápidos e o toque longo final grave/médio!
   */
  playUrnaSound() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    
    // Configuração de frequências da urna TSE:
    // Sequência rítmica clássica: 5 bipes curtos em tom alto (~1200Hz) seguidos por tom mais longo grave (~780Hz)
    const beeps = [
      { time: 0.00, freq: 1180, dur: 0.045 },
      { time: 0.08, freq: 1180, dur: 0.045 },
      { time: 0.16, freq: 1180, dur: 0.045 },
      { time: 0.24, freq: 1180, dur: 0.045 },
      { time: 0.35, freq: 880,  dur: 0.35  } // O clássico PIIIIIM confirmatório
    ];

    beeps.forEach(b => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle'; // Timbre perfeito do buzzer piezoelétrico da urna
      osc.frequency.setValueAtTime(b.freq, t + b.time);

      gain.gain.setValueAtTime(0, t + b.time);
      gain.gain.linearRampToValueAtTime(0.5, t + b.time + 0.005);
      gain.gain.setValueAtTime(0.5, t + b.time + b.dur - 0.01);
      gain.gain.linearRampToValueAtTime(0, t + b.time + b.dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + b.time);
      osc.stop(t + b.time + b.dur + 0.02);
    });
  }

  /**
   * Som de clique do teclado numérico da urna eletrônica
   */
  playUrnaClick() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.04);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Soco Leve / Argumento Inicial
   */
  playPunchLight() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.09);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    // Adiciona ruído de impacto cartunesco
    this.playNoise(0.06, 0.25, 1200);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Soco Pesado / Gancho Eleitoral
   */
  playPunchHeavy() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    this.playNoise(0.12, 0.4, 800);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Chute / Rasteira de Campanha
   */
  playKick() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    this.playNoise(0.09, 0.35, 1500);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Bloqueio / Defesa
   */
  playBlock() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Pulo
   */
  playJump() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  /**
   * Especiais temáticos de cada candidato
   */
  playSpecial(characterId) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    switch (characterId) {
      case 'lula':
        // Fanfarra triunfal com estrela ascendente
        [261.63, 329.63, 392.00, 523.25, 659.25].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t + i * 0.07);
          gain.gain.setValueAtTime(0.3, t + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.07 + 0.25);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(t + i * 0.07);
          osc.stop(t + i * 0.07 + 0.28);
        });
        break;

      case 'flavio':
        // Rajada dupla patriota e tilintar de chocolate
        [440, 554, 659, 880].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq * 1.5, t + i * 0.06);
          gain.gain.setValueAtTime(0.25, t + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.06 + 0.18);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(t + i * 0.06);
          osc.stop(t + i * 0.06 + 0.2);
        });
        this.playNoise(0.3, 0.4, 2500);
        break;

      case 'renan':
        // Sirene estridente de Live e glitch digital
        for (let i = 0; i < 6; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          const f = i % 2 === 0 ? 800 : 1200;
          osc.frequency.setValueAtTime(f, t + i * 0.05);
          gain.gain.setValueAtTime(0.25, t + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.05 + 0.08);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(t + i * 0.05);
          osc.stop(t + i * 0.05 + 0.09);
        }
        break;

      case 'caiado':
        // Berrante Sísmico profundo (glissando descendente e estrondoso)
        const horn = this.ctx.createOscillator();
        const hornGain = this.ctx.createGain();
        horn.type = 'sawtooth';
        horn.frequency.setValueAtTime(130, t);
        horn.frequency.exponentialRampToValueAtTime(195, t + 0.18);
        horn.frequency.exponentialRampToValueAtTime(65, t + 0.6);

        hornGain.gain.setValueAtTime(0.6, t);
        hornGain.gain.exponentialRampToValueAtTime(0.01, t + 0.65);

        horn.connect(hornGain);
        hornGain.connect(this.sfxGain);
        horn.start(t);
        horn.stop(t + 0.7);

        // Terremoto sub-bass
        this.playNoise(0.5, 0.6, 250);
        break;

      case 'curry':
        // Arremesso veloz e o som de cesta "SWISH" + chamas
        const swish = this.ctx.createOscillator();
        const swishGain = this.ctx.createGain();
        swish.type = 'sine';
        swish.frequency.setValueAtTime(200, t);
        swish.frequency.exponentialRampToValueAtTime(900, t + 0.2);
        swishGain.gain.setValueAtTime(0.4, t);
        swishGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        swish.connect(swishGain);
        swishGain.connect(this.sfxGain);
        swish.start(t);
        swish.stop(t + 0.26);

        // Swish da rede aos 0.2s
        setTimeout(() => {
          this.playNoise(0.25, 0.45, 3000);
        }, 180);
        break;
    }
  }

  /**
   * Voz cômica sintetizada / Balão de fala estilo charge
   */
  playVocalCharge(pitch = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const syllables = 3;

    for (let i = 0; i < syllables; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      
      const baseFreq = (240 + (i * 70) * (i % 2 === 0 ? 1 : -0.5)) * pitch;
      osc.frequency.setValueAtTime(baseFreq, t + i * 0.08);
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.2, t + i * 0.08 + 0.06);

      gain.gain.setValueAtTime(0.25, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.07);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.08);
    }
  }

  /**
   * Gera rajada de ruído filtrado (impactos, ventos, explosões)
   */
  playNoise(duration, volume, filterFreq = 1000) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
  }

  /**
   * Música de Debate Dinâmica e Emocionante gerada em tempo real!
   * Groove funk/eleitoral moderno com baixo, bateria e brass de debate.
   */
  startDebateMusic() {
    this.ensureContext();
    if (this.isPlayingMusic || !this.ctx) return;
    this.isPlayingMusic = true;

    const bpm = 124;
    const stepDuration = (60 / bpm) / 4; // 16th notes
    this.beatStep = 0;

    // Linha de baixo marcante em Ré menor (D minor debate groove)
    const bassline = [
      146.83, 0, 146.83, 174.61, // D3, -, D3, F3
      0, 196.00, 0, 220.00,       // -, G3, -, A3
      146.83, 146.83, 0, 261.63,  // D3, D3, -, C4
      220.00, 0, 196.00, 174.61   // A3, -, G3, F3
    ];

    this.musicInterval = setInterval(() => {
      if (this.isMuted || !this.ctx || this.ctx.state === 'suspended') return;

      const t = this.ctx.currentTime;
      const step16 = this.beatStep % 16;
      const beat4 = Math.floor(step16 / 4);

      // Bumbo (Kick) nos tempos 0, 4, 8, 12 (4 on the floor de debate tenso)
      if (step16 % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + 0.13);
      }

      // Caixa (Snare) nos tempos 4 e 12
      if (step16 === 4 || step16 === 12) {
        this.playMusicSnare(t);
      }

      // Chimbal (Hi-Hat) em todas as colcheias
      if (step16 % 2 === 0) {
        this.playMusicHiHat(t, step16 % 4 === 2 ? 0.08 : 0.04);
      }

      // Baixo (Bass synth)
      const noteFreq = bassline[step16];
      if (noteFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(noteFreq, t);

        // Filtro passa-baixa para aquecer o baixo
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + stepDuration * 2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + stepDuration * 2.1);
      }

      // Brass de TV de Notícias nos inícios de compasso (compasso a cada 32 passos)
      if (this.beatStep % 32 === 0) {
        this.playBrassHit(t, 293.66); // D4
      } else if (this.beatStep % 32 === 16) {
        this.playBrassHit(t, 349.23); // F4
      }

      this.beatStep++;
    }, stepDuration * 1000);
  }

  playMusicSnare(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.09);

    // Ruído de esteira
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.1);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.12, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    noise.connect(nGain);
    nGain.connect(this.musicGain);
    noise.start(t);
  }

  playMusicHiHat(t, volume) {
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
  }

  playBrassHit(t, rootFreq) {
    const chord = [rootFreq, rootFreq * 1.25, rootFreq * 1.5]; // Maior
    chord.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const sounds = new SoundManager();
