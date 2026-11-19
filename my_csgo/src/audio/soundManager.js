// Web Audio API procedural sound synthesizer for CS:GO / CS 1.6 weapons & tactical SFX

class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.noiseBuffer = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.32, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Pre-generate reusable 1-second white noise buffer (zero per-shot allocations)
      const bufferLen = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferLen, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferLen; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _playNoiseBurst(startTime, duration, filterType, freq, q, gainPeak, endGain = 0.001) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    // Start at random offset in cached buffer so consecutive shots vary slightly
    const maxOffset = Math.max(0, 1.0 - duration - 0.02);
    const offset = Math.random() * maxOffset;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, startTime);
    if (q) filter.Q.setValueAtTime(q, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, startTime);
    gain.gain.exponentialRampToValueAtTime(endGain, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(startTime, offset, duration);
  }

  _playOsc(startTime, duration, type, startFreq, endFreq, gainPeak) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);

    gain.gain.setValueAtTime(gainPeak, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  playWeaponShot(soundProfile = 'ak47') {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;

    switch (soundProfile) {
      case 'ak47':
        this._playNoiseBurst(t, 0.16, 'bandpass', 1550, 1.6, 0.85);
        this._playOsc(t, 0.14, 'sine', 220, 42, 0.9);
        break;

      case 'm4a4':
        this._playNoiseBurst(t, 0.13, 'bandpass', 2100, 1.4, 0.78);
        this._playOsc(t, 0.10, 'triangle', 260, 58, 0.65);
        break;

      case 'silenced':
        // Suppressed M4A1-S / USP-S pneumatic thwip
        this._playNoiseBurst(t, 0.08, 'bandpass', 1200, 2.8, 0.35);
        this._playOsc(t, 0.06, 'sine', 340, 110, 0.28);
        break;

      case 'famas':
        this._playNoiseBurst(t, 0.11, 'highpass', 1400, 1.0, 0.72);
        this._playOsc(t, 0.09, 'sawtooth', 290, 75, 0.45);
        break;

      case 'awp':
        // Massive cannon boom + supersonic crack + bolt rack
        this._playNoiseBurst(t, 0.34, 'lowpass', 2200, 0.7, 1.25);
        this._playNoiseBurst(t, 0.22, 'highpass', 1100, 1.0, 0.85);
        this._playOsc(t, 0.30, 'sawtooth', 130, 24, 1.15);
        this._playClick(t + 0.45, 520, 0.22);
        this._playClick(t + 0.68, 950, 0.26);
        break;

      case 'scout':
        // Crisp light bolt-action rifle crack + quick bolt
        this._playNoiseBurst(t, 0.20, 'bandpass', 1900, 1.1, 0.95);
        this._playOsc(t, 0.16, 'triangle', 210, 45, 0.75);
        this._playClick(t + 0.36, 780, 0.18);
        this._playClick(t + 0.50, 1250, 0.22);
        break;

      case 'smg':
        // Classic MP5 tight sub-machine pop
        this._playNoiseBurst(t, 0.08, 'bandpass', 1850, 2.0, 0.58);
        this._playOsc(t, 0.07, 'triangle', 290, 80, 0.48);
        break;

      case 'p90':
        // High-rate PDW punch
        this._playNoiseBurst(t, 0.075, 'bandpass', 2400, 1.8, 0.56);
        this._playOsc(t, 0.065, 'sawtooth', 330, 95, 0.36);
        break;

      case 'shotgun':
        // Heavy wide blast + pump-action chk-chk
        this._playNoiseBurst(t, 0.26, 'lowpass', 1600, 0.8, 1.15);
        this._playOsc(t, 0.22, 'triangle', 165, 28, 1.0);
        this._playClick(t + 0.34, 480, 0.24);
        this._playClick(t + 0.48, 860, 0.28);
        break;

      case 'pistol':
        this._playNoiseBurst(t, 0.10, 'bandpass', 2200, 1.5, 0.65);
        this._playOsc(t, 0.08, 'triangle', 260, 65, 0.52);
        break;

      case 'deagle':
        this._playNoiseBurst(t, 0.22, 'highpass', 650, 0.9, 1.0);
        this._playOsc(t, 0.20, 'triangle', 180, 30, 1.05);
        break;

      default:
        this._playNoiseBurst(t, 0.14, 'bandpass', 1600, 1.6, 0.75);
        this._playOsc(t, 0.12, 'sine', 220, 45, 0.8);
        break;
    }
  }

  // Compatibility wrappers
  playAK47() {
    this.playWeaponShot('ak47');
  }

  playDeagle() {
    this.playWeaponShot('deagle');
  }

  playKnifeSlash(isAlt = false) {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    const dur = isAlt ? 0.16 : 0.10;
    const freq = isAlt ? 900 : 1400;
    this._playNoiseBurst(t, dur, 'bandpass', freq, 2.2, isAlt ? 0.45 : 0.32);
  }

  playKnifeHit(isAlt = false, isFlesh = true) {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    if (isFlesh) {
      this._playNoiseBurst(t, 0.09, 'lowpass', 1200, 1.0, isAlt ? 0.85 : 0.6);
      this._playOsc(t, 0.10, 'sine', isAlt ? 150 : 190, 40, isAlt ? 0.75 : 0.5);
    } else {
      // Metallic spark ping on wall
      this._playOsc(t, 0.14, 'square', 2200, 1400, 0.3);
      this._playNoiseBurst(t, 0.06, 'highpass', 2400, 1.0, 0.35);
    }
  }

  playScopeZoom() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._playClick(t, 1600, 0.18);
  }

  playFireModeToggle() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._playClick(t, 1950, 0.22);
    this._playClick(t + 0.04, 1300, 0.15);
  }

  // Bot gunshot (slightly lower volume/distant)
  playBotShot() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._playOsc(t, 0.11, 'sawtooth', 300, 70, 0.35);
  }

  // Classic Headshot "Dink" / Metallic helmet ring
  playHeadshot() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.3);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(3600, t);
    osc2.frequency.exponentialRampToValueAtTime(2900, t + 0.25);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.35);
    osc2.stop(t + 0.35);
  }

  // Hitmarker body hit sound
  playHitmarker() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._playOsc(t, 0.05, 'triangle', 900, 300, 0.3);
  }

  // Reload sound steps
  playReload() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;

    this._playClick(t + 0.1, 800, 0.2);
    this._playClick(t + 0.9, 1200, 0.3);
    this._playClick(t + 1.4, 600, 0.25);
    this._playClick(t + 1.55, 1400, 0.35);
  }

  _playClick(time, freq, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.06);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  // Footstep
  playFootstep() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._playOsc(t, 0.08, 'sine', 90 + Math.random() * 30, 30, 0.18);
  }

  // Switch weapon click
  playWeaponSwitch() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._playClick(t, 1100, 0.2);
    this._playClick(t + 0.05, 750, 0.15);
  }

  // Empty magazine click
  playDryFire() {
    if (!this.initialized) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._playClick(t, 2200, 0.2);
  }
}

export const sounds = new SoundManager();
