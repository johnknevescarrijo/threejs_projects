import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { InputManager } from './core/InputManager.js';
import { AudioManager } from './core/AudioManager.js';
import { TimeManager } from './core/TimeManager.js';
import { Terrain } from './world/Terrain.js';
import { SkyDome } from './world/SkyDome.js';
import { FloraManager } from './world/FloraManager.js';
import { EntityManager } from './entities/EntityManager.js';
import { ParticleSystem } from './vfx/ParticleSystem.js';
import { Player } from './player/Player.js';
import { Minimap } from './ui/Minimap.js';
import { CraftingSystem } from './player/CraftingSystem.js';
import { InventoryUI } from './ui/InventoryUI.js';
import { NotificationUI } from './ui/NotificationUI.js';
import { HUD } from './ui/HUD.js';

class Game {
  constructor() {
    this.isStarted = false;
    this.isPaused = false;
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    const canvasContainer = document.getElementById('canvas-container');

    // 1. Core Systems
    this.engine = new Engine(canvasContainer);
    this.input = new InputManager(document.body);
    this.audio = new AudioManager();
    this.time = new TimeManager(this.engine.scene);
    this.particles = new ParticleSystem(this.engine.scene);

    // 2. World Generation
    this.terrain = new Terrain(this.engine.scene);
    this.skydome = new SkyDome(this.engine.scene);
    this.flora = new FloraManager(this.engine.scene, this.terrain, this.particles, this.audio);

    // 3. Entity & Dinosaur Population
    this.entities = new EntityManager(this.engine.scene, this.terrain, this.particles, this.audio);

    // 4. UI Systems
    this.notifications = new NotificationUI();
    this.minimap = new Minimap(this.terrain, this.entities);

    // 5. Player
    this.player = new Player(
      this.engine.camera,
      this.engine.scene,
      this.terrain,
      this.flora,
      this.entities,
      this.particles,
      this.audio,
      this.notifications
    );

    // 6. Crafting & Inventory UI
    this.crafting = new CraftingSystem(this.player.inventory, this.audio, this.notifications);
    this.inventoryUI = new InventoryUI(this.player.inventory, this.crafting, this.input);
    this.hud = new HUD(this.player, this.time, this.minimap);

    // 7. Event Handlers & Overlay
    this.setupStartOverlay();
    this.setupHelpModal();

    // Start Game Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupStartOverlay() {
    const startOverlay = document.getElementById('start-overlay');
    const startBtn = document.getElementById('start-btn');

    const startGame = () => {
      if (this.isStarted) return;
      this.isStarted = true;
      this.audio.init();
      this.input.requestLock();

      if (startOverlay) {
        startOverlay.classList.add('hidden');
      }

      this.notifications.show('Sobrevivência Pré-Histórica Iniciada! Colete recursos e cuidado com predadores.', 'info');
    };

    if (startBtn) {
      startBtn.addEventListener('click', startGame);
    }
    if (startOverlay) {
      startOverlay.addEventListener('click', startGame);
    }
  }

  setupHelpModal() {
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help-btn');

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH') {
        if (helpModal) {
          helpModal.classList.toggle('active');
          if (helpModal.classList.contains('active')) {
            this.input.exitLock();
          } else {
            this.input.requestLock();
          }
        }
      }
    });

    if (closeHelp && helpModal) {
      closeHelp.addEventListener('click', () => {
        helpModal.classList.remove('active');
        this.input.requestLock();
      });
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.isStarted) {
      // 1. Process Player Input & Physics
      if (this.input.isPointerLocked) {
        this.player.handleInput(this.input, delta);
      }
      this.player.update(delta);

      // 2. Update Dinosaurs AI
      this.entities.update(delta, this.player);

      // 3. Update Environment
      this.terrain.update(delta);
      this.flora.update(delta);
      this.time.update(delta, this.player.position);
      this.skydome.update(delta, this.time, this.player.position);
      this.particles.update(delta);

      // 4. Update HUD & UI
      this.hud.update();

      // Reset single-frame inputs
      this.input.update();
    }

    // Render Scene
    this.engine.render();
  }
}

// Instantiate game on window load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
