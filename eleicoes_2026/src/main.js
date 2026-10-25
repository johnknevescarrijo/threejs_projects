import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { ArenaBrasilia } from './stage/ArenaBrasilia.js';
import { Fighter } from './characters/Fighter.js';
import { ParticleSystem } from './gfx/ParticleSystem.js';
import { CombatEngine } from './combat/CombatEngine.js';
import { AIController } from './combat/AIController.js';
import { HUD } from './ui/HUD.js';
import { CharacterSelect } from './ui/CharacterSelect.js';
import { sounds } from './sound/SoundManager.js';

class Game {
  constructor() {
    this.container = document.getElementById('app');

    // Inicialização Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030712);
    // Nevoeiro suave para revelar o céu crepuscular e os monumentos ao fundo
    this.scene.fog = new THREE.FogExp2(0x071126, 0.007);

    // Câmera com far ampliado para o Sky Dome de 140 unidades
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 300);
    this.camera.position.set(0, 3.2, 11);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // Pipeline de Pós-Processamento Gráfico (UnrealBloomPass)
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom elegante para neons, LEDs, feixes e faíscas brilharem intensamente
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.38, // strength
      0.65, // radius
      0.78  // threshold
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this.clock = new THREE.Clock();

    // Iluminação Monumental da Arena
    this.setupLights();

    // Cenário Monumental e Partículas
    this.arena = new ArenaBrasilia(this.scene);
    this.particles = new ParticleSystem(this.scene);

    // Câmera Shake Global
    this.cameraShake = { intensity: 0, duration: 0, timer: 0 };

    // Interface HUD
    this.hud = new HUD(this.container);

    // Sistema de Luta e Estados
    this.f1 = null;
    this.f2 = null;
    this.combatEngine = null;
    this.aiController = null;
    this.gameMode = 'pve';

    // Teclado
    this.keys = {};
    this.setupInputListeners();

    // Tela de Seleção de Candidatos
    this.characterSelect = new CharacterSelect(this.container, (selection) => {
      this.startBattle(selection);
    });

    // Evento Redimensionamento
    window.addEventListener('resize', () => this.onWindowResize());

    // Loop de Renderização
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLights() {
    // 1. Luz ambiente para preenchimento de sombras
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    // 2. Luz Hemisférica Crepuscular (Céu dourado/violeta do Planalto e solo azulado)
    const hemiLight = new THREE.HemisphereLight(0xffd89b, 0x192a56, 0.65);
    this.scene.add(hemiLight);

    // 3. Luz Direcional Principal (Sol crepuscular de Brasília com sombra expandida)
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.85);
    dirLight.position.set(6, 16, 9);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 45;
    dirLight.shadow.camera.left = -26;
    dirLight.shadow.camera.right = 26;
    dirLight.shadow.camera.top = 18;
    dirLight.shadow.camera.bottom = -6;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // 4. Luz de Preenchimento e Contorno (Rim Light azul)
    const backLight = new THREE.DirectionalLight(0x00e5ff, 0.85);
    backLight.position.set(0, 10, -14);
    this.scene.add(backLight);
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      sounds.ensureContext();
      this.keys[e.code] = true;

      // Atalho de mute com 'M'
      if (e.code === 'KeyM') {
        const isMuted = sounds.toggleMute();
        const btn = document.getElementById('btn-toggle-audio');
        if (btn) btn.innerText = isMuted ? '🔇 SOM: OFF' : '🔊 SOM: ON';
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('pointerdown', () => {
      sounds.ensureContext();
    });
  }

  startBattle({ p1, p2, mode }) {
    this.gameMode = mode;

    // Remove lutadores anteriores se houver
    if (this.f1) this.scene.remove(this.f1.mesh);
    if (this.f2) this.scene.remove(this.f2.mesh);
    this.particles.clear();

    // Cria os novos lutadores com os modelos caricaturados 3D
    this.f1 = new Fighter(p1, false);
    this.f2 = new Fighter(p2, true);
    this.f1.setParticleSystem(this.particles);
    this.f2.setParticleSystem(this.particles);

    this.scene.add(this.f1.mesh);
    this.scene.add(this.f2.mesh);

    // Configura a HUD
    this.hud.setupFighters(p1, p2);

    // Se for modo PvE, configura IA no P2
    if (mode === 'pve') {
      this.aiController = new AIController(this.f2, this.f1);
    } else {
      this.aiController = null;
    }

    // Cria o motor de combate com callback de Camera Shake
    this.combatEngine = new CombatEngine(
      this.f1,
      this.f2,
      this.particles,
      this.hud,
      (winner) => {
        this.characterSelect.show();
      },
      (intensity, duration) => this.triggerCameraShake(intensity, duration)
    );

    // Inicia a trilha sonora de debate
    sounds.startDebateMusic();
  }

  triggerCameraShake(intensity = 0.35, duration = 0.25) {
    this.cameraShake.intensity = intensity;
    this.cameraShake.duration = duration;
    this.cameraShake.timer = duration;
  }

  processInputs(dt) {
    if (!this.f1 || !this.f2) return;

    // Controles Jogador 1 (WASD + F/G/H + U/I + Espaço)
    const p1Input = {
      left: this.keys['KeyA'] || (this.gameMode === 'pve' && this.keys['ArrowLeft']),
      right: this.keys['KeyD'] || (this.gameMode === 'pve' && this.keys['ArrowRight']),
      up: this.keys['KeyW'] || (this.gameMode === 'pve' && this.keys['ArrowUp']),
      down: this.keys['KeyS'] || (this.gameMode === 'pve' && this.keys['ArrowDown']),
      light: this.keys['KeyF'] || (this.gameMode === 'pve' && this.keys['KeyJ']),
      heavy: this.keys['KeyG'] || (this.gameMode === 'pve' && this.keys['KeyK']),
      kick: this.keys['KeyH'] || (this.gameMode === 'pve' && this.keys['KeyL']),
      special1: this.keys['KeyU'],
      special2: this.keys['KeyI'],
      special: this.keys['Space']
    };

    this.f1.handleInput(p1Input);

    // Controles Jogador 2 (Setas + JKL + O/P / Numpad no modo 2P Local)
    if (this.gameMode === 'pvp') {
      const p2Input = {
        left: this.keys['ArrowLeft'],
        right: this.keys['ArrowRight'],
        up: this.keys['ArrowUp'],
        down: this.keys['ArrowDown'],
        light: this.keys['KeyJ'] || this.keys['Numpad1'],
        heavy: this.keys['KeyK'] || this.keys['Numpad2'],
        kick: this.keys['KeyL'] || this.keys['Numpad3'],
        special1: this.keys['KeyO'] || this.keys['Numpad4'],
        special2: this.keys['KeyP'] || this.keys['Numpad5'],
        special: this.keys['Enter'] || this.keys['Numpad0']
      };
      this.f2.handleInput(p2Input);
    } else if (this.aiController) {
      // IA do P2
      const aiInput = this.aiController.update(dt);
      this.f2.handleInput(aiInput);
    }
  }

  updateCamera(dt) {
    if (!this.f1 || !this.f2) return;

    const p1Pos = this.f1.getPosition();
    const p2Pos = this.f2.getPosition();

    // Ponto médio entre os dois lutadores
    const midX = (p1Pos.x + p2Pos.x) * 0.5;
    const dist = Math.abs(p1Pos.x - p2Pos.x);

    // Clamp de midX para o tablado expandido (-16 a +16)
    const clampedMidX = Math.max(-16.0, Math.min(16.0, midX));

    // Zoom dinâmico da câmera para arena monumental
    let targetZ = Math.max(9.0, Math.min(21.0, 7.2 + dist * 0.58));
    let targetY = 2.3 + dist * 0.09;

    // Zoom dramático quando um Super Especial está sendo disparado
    const isSuperActive =
      (this.f1 && this.f1.state === 'SPECIAL_SUPER') ||
      (this.f2 && this.f2.state === 'SPECIAL_SUPER');

    if (isSuperActive) {
      targetZ = Math.max(7.5, targetZ - 2.6);
      targetY = Math.max(1.8, targetY - 0.35);
    }

    // Interpolação suave de posição
    this.camera.position.x += (clampedMidX - this.camera.position.x) * 0.08;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.08;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.08;

    // Camera Shake global em impactos
    if (this.cameraShake.timer > 0) {
      this.cameraShake.timer -= dt;
      const progress = Math.max(0, this.cameraShake.timer / this.cameraShake.duration);
      const offset = this.cameraShake.intensity * progress;
      this.camera.position.x += (Math.random() - 0.5) * offset;
      this.camera.position.y += (Math.random() - 0.5) * offset;
      this.camera.position.z += (Math.random() - 0.5) * offset * 0.4;
    }

    this.camera.lookAt(clampedMidX, 2.0, 0);

    // Leve inclinação (tilt roll) dramática no Super
    if (isSuperActive) {
      const tilt = this.f1.state === 'SPECIAL_SUPER' ? -0.03 : 0.03;
      this.camera.rotation.z += tilt;
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const totalTime = this.clock.getElapsedTime();

    // Processa comandos
    this.processInputs(dt);

    // Atualiza arena e animações dinâmicas
    this.arena.update(totalTime);

    // Atualiza partículas
    this.particles.update(dt);

    // Atualiza combate
    if (this.combatEngine) {
      this.combatEngine.update(dt, totalTime);
    }

    // Atualiza câmera com camera shake e zoom
    this.updateCamera(dt);

    // Renderização com Pós-Processamento Unreal Bloom
    this.composer.render();
  }
}

// Inicializa o jogo ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
