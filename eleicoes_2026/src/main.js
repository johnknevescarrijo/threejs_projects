import * as THREE from 'three';
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
    this.scene.background = new THREE.Color(0x0a1122);
    this.scene.fog = new THREE.FogExp2(0x0a1122, 0.018);

    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 3.2, 11);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    // Luzes da Arena
    this.setupLights();

    // Cenário e Partículas
    this.arena = new ArenaBrasilia(this.scene);
    this.particles = new ParticleSystem(this.scene);

    // Câmera Shake
    this.cameraShake = { intensity: 0, duration: 0, timer: 0 };

    // Interface
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

    // Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLights() {
    // Luz ambiente para preenchimento
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    // Luz Direcional Principal (Holofote de estúdio / Sol poente de Brasília)
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
    dirLight.position.set(5, 14, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 35;
    dirLight.shadow.camera.left = -14;
    dirLight.shadow.camera.right = 14;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -4;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Luz de preenchimento azulada no fundo
    const backLight = new THREE.DirectionalLight(0x4299e1, 1.0);
    backLight.position.set(-6, 8, -10);
    this.scene.add(backLight);
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      // Inicia o áudio na primeira interação do usuário
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

    // Suporte a cliques na tela para garantir ativação de som
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

    // Cria o motor de combate
    this.combatEngine = new CombatEngine(
      this.f1,
      this.f2,
      this.particles,
      this.hud,
      (winner) => {
        // Ao finalizar partida, exibe tela e permite voltar à seleção
        this.characterSelect.show();
      }
    );

    // Inicia a empolgante trilha de debate
    sounds.startDebateMusic();
  }

  triggerCameraShake(intensity = 0.35, duration = 0.25) {
    this.cameraShake.intensity = intensity;
    this.cameraShake.duration = duration;
    this.cameraShake.timer = duration;
  }

  processInputs(dt) {
    if (!this.f1 || !this.f2) return;

    // Controles Jogador 1 (WASD + FGH + Espaço)
    const p1Input = {
      left: this.keys['KeyA'] || (this.gameMode === 'pve' && this.keys['ArrowLeft']),
      right: this.keys['KeyD'] || (this.gameMode === 'pve' && this.keys['ArrowRight']),
      up: this.keys['KeyW'] || (this.gameMode === 'pve' && this.keys['ArrowUp']),
      down: this.keys['KeyS'] || (this.gameMode === 'pve' && this.keys['ArrowDown']),
      light: this.keys['KeyF'] || (this.gameMode === 'pve' && this.keys['KeyJ']),
      heavy: this.keys['KeyG'] || (this.gameMode === 'pve' && this.keys['KeyK']),
      kick: this.keys['KeyH'] || (this.gameMode === 'pve' && this.keys['KeyL']),
      special: this.keys['Space'] || this.keys['KeyU']
    };

    this.f1.handleInput(p1Input);

    // Controles Jogador 2 (Setas + JKL / Numpad no modo 2P Local)
    if (this.gameMode === 'pvp') {
      const p2Input = {
        left: this.keys['ArrowLeft'],
        right: this.keys['ArrowRight'],
        up: this.keys['ArrowUp'],
        down: this.keys['ArrowDown'],
        light: this.keys['KeyJ'] || this.keys['Numpad1'],
        heavy: this.keys['KeyK'] || this.keys['Numpad2'],
        kick: this.keys['KeyL'] || this.keys['Numpad3'],
        special: this.keys['Enter'] || this.keys['Numpad0']
      };
      this.f2.handleInput(p2Input);
    } else if (this.aiController) {
      // IA do P2
      const aiInput = this.aiController.update(dt);
      this.f2.handleInput(aiInput);
    }
  }

  updateCamera() {
    if (!this.f1 || !this.f2) return;

    const p1Pos = this.f1.getPosition();
    const p2Pos = this.f2.getPosition();

    // Ponto médio entre os dois lutadores
    const midX = (p1Pos.x + p2Pos.x) * 0.5;
    const dist = Math.abs(p1Pos.x - p2Pos.x);

    // Zoom dinâmico da câmera de luta
    const targetZ = Math.max(9.5, Math.min(15.5, 7.5 + dist * 0.65));
    const targetY = 2.4 + dist * 0.08;

    // Interpolação suave
    this.camera.position.x += (midX - this.camera.position.x) * 0.08;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.08;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.08;

    // Camera Shake em golpes
    if (this.cameraShake.timer > 0) {
      const dt = 0.016;
      this.cameraShake.timer -= dt;
      const progress = this.cameraShake.timer / this.cameraShake.duration;
      const offset = this.cameraShake.intensity * progress;
      this.camera.position.x += (Math.random() - 0.5) * offset;
      this.camera.position.y += (Math.random() - 0.5) * offset;
    }

    this.camera.lookAt(midX, 2.0, 0);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const totalTime = this.clock.getElapsedTime();

    // Processa comandos
    this.processInputs(dt);

    // Atualiza arena e holofotes
    this.arena.update(totalTime);

    // Atualiza partículas
    this.particles.update(dt);

    // Atualiza combate
    if (this.combatEngine) {
      this.combatEngine.update(dt, totalTime);
    }

    // Atualiza câmera
    this.updateCamera();

    // Renderiza cena
    this.renderer.render(this.scene, this.camera);
  }
}

// Inicializa o jogo ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
