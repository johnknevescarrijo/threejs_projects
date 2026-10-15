import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { Track } from './core/track.js';
import { FollowCamera } from './core/camera.js';
import { ParticleSystem } from './core/particles.js';
import { Kart } from './entities/kart.js';
import { ItemBox } from './entities/itemBox.js';
import { ItemManager } from './entities/item.js';
import { SensorSystem } from './ai/sensors.js';
import { AIController } from './ai/aiController.js';
import { AI_RACER_PRESETS } from './ai/archetypes.js';
import { SoundSystem } from './audio/sound.js';
import { HUD } from './ui/hud.js';
import { ITEM_TYPES, TRACK_CONFIG } from './core/constants.js';

class GameApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.useBloom = true;
    this.dirLight = null;

    this.track = null;
    this.particleSystem = null;
    this.playerKart = null;
    this.aiRacers = [];
    this.allKarts = [];
    this.aiControllers = [];
    this.itemBoxes = [];
    this.itemManager = null;
    this.sensorSystem = null;
    this.soundSystem = null;
    this.followCamera = null;
    this.hud = null;

    this.spacePressed = false;
    this.shiftPressed = false;
    this.playerInputs = {
      accelerate: false,
      brake: false,
      steerLeft: false,
      steerRight: false,
      drift: false
    };

    // Race Countdown & Timing State
    this.countdownTimer = 3.2;
    this.lastCountdownStage = 4;
    this.rocketStartCharge = 0;
    this.raceTime = 0;
    this.currentLapStartTime = 0;
    this.bestLapTime = null;
    this.prevPlayerLap = 1;
    this.raceOver = false;

    this.init();
  }

  init() {
    // 1. Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x38bdf8);
    this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.0012);

    this.camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.2, 1300);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    // PBR Environment Map for metallic & clearcoat reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    // Post-Processing Composer (RenderPass + UnrealBloomPass + OutputPass)
    this.setupPostProcessing();

    // 2. Lighting & Atmosphere
    this.setupLighting();
    this.setupSkyDomeAndSun();
    this.setupSpeedLines();
    this.setupSkidMarks();

    // 3. Audio & Particle Systems
    this.soundSystem = new SoundSystem();
    this.particleSystem = new ParticleSystem(this.scene, 550);

    // 4. Track & Environment
    this.track = new Track(this.scene);

    // 5. Sensor System & Item Manager
    this.sensorSystem = new SensorSystem(this.scene);
    this.itemManager = new ItemManager(this.scene, this.soundSystem, this.particleSystem);

    // 6. Spawn Item Boxes at Strategic Waypoint Intervals
    this.spawnItemBoxes();

    // 7. Spawn Grid of Racers (1 Player + 7 AI)
    this.spawnRacers();

    // 8. Camera & HUD
    this.followCamera = new FollowCamera(this.camera, this.renderer.domElement);
    this.hud = new HUD({
      onToggleDebug: () => this.toggleSensorDebug(),
      onToggleBloom: () => this.toggleBloom(),
      onToggleCamera: () => {
        const mode = this.followCamera.toggleView();
        this.hud.showNotification(`CÂMERA: ${mode}`, 1.2);
      },
      onToggleSound: () => this.toggleSound(),
      onResetRace: () => {
        this.playerKart.respawnOnTrack(this.track);
        this.hud.showNotification('RECOLOCADO NA PISTA!', 1.4);
      },
      onPlayAgain: () => location.reload()
    });

    // 9. Input Listeners
    this.setupKeyListeners();
    window.addEventListener('resize', () => this.onWindowResize());

    // 10. Start Game Loop
    this.animate();
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.24, // subtle arcade bloom strength
      0.45, // radius
      0.86  // high threshold so only neon/flames/sky highlights bloom
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x22c55e, 0.5);
    hemiLight.position.set(0, 120, 0);
    this.scene.add(hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.55);
    this.dirLight.position.set(90, 140, 80);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 350;
    const d = 68;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);
  }

  setupSkyDomeAndSun() {
    const skyGeo = new THREE.SphereGeometry(750, 32, 24);
    const pos = skyGeo.attributes.position;
    const colors = [];
    const colorZenith = new THREE.Color(0x0284c7);
    const colorHorizon = new THREE.Color(0x7dd3fc);
    const colorHaze = new THREE.Color(0xfef3c7);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const normalizedY = THREE.MathUtils.clamp((y + 750) / 1500, 0, 1);
      let c;
      if (normalizedY > 0.48) {
        c = colorHorizon.clone().lerp(colorZenith, (normalizedY - 0.48) * 1.9);
      } else {
        c = colorHaze.clone().lerp(colorHorizon, normalizedY * 2.0);
      }
      colors.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const skyMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);

    // Glowing Sun Disc in the Sky
    const sunGeo = new THREE.SphereGeometry(28, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(280, 340, 260);
    this.scene.add(sunMesh);
  }

  setupSpeedLines() {
    this.speedLinesGroup = new THREE.Group();
    this.speedLines = [];
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });

    for (let i = 0; i < 36; i++) {
      const p1 = new THREE.Vector3(0, 0, 0);
      const p2 = new THREE.Vector3(0, 0, 4.0);
      const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const line = new THREE.Line(geo, lineMat);
      this.speedLinesGroup.add(line);
      this.speedLines.push({
        line,
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.2) * 6 + 1.2,
          Math.random() * 25 - 5
        ),
        speed: 45 + Math.random() * 35
      });
    }
    this.speedLinesGroup.visible = false;
    this.scene.add(this.speedLinesGroup);
  }

  updateSpeedLines(deltaTime) {
    if (!this.playerKart) return;
    const isHighSpeed = this.playerKart.isBoosting || Math.abs(this.playerKart.speed) > 38;
    if (!isHighSpeed) {
      this.speedLinesGroup.visible = false;
      return;
    }
    this.speedLinesGroup.visible = true;
    this.speedLinesGroup.position.copy(this.playerKart.position);
    this.speedLinesGroup.quaternion.copy(this.playerKart.mesh.quaternion);

    this.speedLines.forEach(item => {
      item.offset.z -= item.speed * deltaTime;
      if (item.offset.z < -8) {
        item.offset.z = 18 + Math.random() * 10;
        item.offset.x = (Math.random() - 0.5) * 14;
        item.offset.y = (Math.random() - 0.2) * 6 + 1.0;
      }
      item.line.position.copy(item.offset);
    });
  }

  setupSkidMarks() {
    this.skidMarks = [];
    this.skidMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    });
  }

  spawnSkidMark(kart) {
    [-0.95, 0.95].forEach(side => {
      if (this.skidMarks.length > 220) {
        const old = this.skidMarks.shift();
        this.scene.remove(old);
        old.geometry.dispose();
      }
      const plane = new THREE.PlaneGeometry(0.36, 0.85);
      plane.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(plane, this.skidMat);
      const wheelPos = kart.position.clone()
        .addScaledVector(kart.forward, -1.0)
        .addScaledVector(kart.right, side);
      mesh.position.copy(wheelPos);
      mesh.position.y += 0.05;
      mesh.rotation.y = kart.yaw;
      this.scene.add(mesh);
      this.skidMarks.push(mesh);
    });
  }

  spawnItemBoxes() {
    this.track.itemBoxProgressPoints.forEach(progressT => {
      const offsets = [-5, 0, 5];
      offsets.forEach(offset => {
        const pos = this.track.getWaypointAtProgress(progressT, offset);
        pos.y += 0.5;
        const itemBox = new ItemBox(pos, this.scene);
        this.itemBoxes.push(itemBox);
      });
    });
  }

  spawnRacers() {
    const gridPositions = [
      { row: 0, lateral: 3.5, isPlayer: true, name: 'Você (Player)', num: 1 },
      { row: 0, lateral: -3.5, preset: AI_RACER_PRESETS[0], num: 2 },
      { row: 1, lateral: 3.5, preset: AI_RACER_PRESETS[1], num: 3 },
      { row: 1, lateral: -3.5, preset: AI_RACER_PRESETS[2], num: 4 },
      { row: 2, lateral: 3.5, preset: AI_RACER_PRESETS[3], num: 5 },
      { row: 2, lateral: -3.5, preset: AI_RACER_PRESETS[4], num: 6 },
      { row: 3, lateral: 3.5, preset: AI_RACER_PRESETS[5], num: 7 },
      { row: 3, lateral: -3.5, preset: AI_RACER_PRESETS[6], num: 8 }
    ];

    gridPositions.forEach((slot, idx) => {
      const startDist = -12 - slot.row * 9;
      const startT = ((startDist / this.track.totalLength) % 1.0 + 1.0) % 1.0;
      const startPos = this.track.getWaypointAtProgress(startT, slot.lateral);
      const tangent = this.track.curve.getTangentAt(startT).normalize();
      // +Z of Kart model is forward!
      const yaw = Math.atan2(tangent.x, tangent.z);

      if (slot.isPlayer) {
        this.playerKart = new Kart({
          id: 'player',
          name: 'Jogador',
          racerNumber: slot.num,
          isPlayer: true,
          color: 0xef4444,
          accentColor: 0xfacc15,
          scene: this.scene,
          soundSystem: this.soundSystem,
          particleSystem: this.particleSystem
        });
        this.playerKart.setPosition(startPos.x, startPos.y, startPos.z);
        this.playerKart.setRotation(yaw);
        this.playerKart.lapProgress = startT;
        this.playerKart.prevLapProgress = startT;
        this.allKarts.push(this.playerKart);
      } else {
        const p = slot.preset;
        const aiKart = new Kart({
          id: `ai_${idx}`,
          name: p.name,
          racerNumber: slot.num,
          isPlayer: false,
          color: p.kartColor,
          accentColor: p.accentColor,
          scene: this.scene,
          soundSystem: this.soundSystem,
          particleSystem: this.particleSystem
        });
        aiKart.setPosition(startPos.x, startPos.y, startPos.z);
        aiKart.setRotation(yaw);
        aiKart.lapProgress = startT;
        aiKart.prevLapProgress = startT;

        const controller = new AIController({
          kart: aiKart,
          archetypeId: p.archetypeId,
          track: this.track,
          sensorSystem: this.sensorSystem,
          itemManager: this.itemManager
        });

        this.allKarts.push(aiKart);
        this.aiRacers.push(aiKart);
        this.aiControllers.push(controller);
      }
    });
  }

  toggleSensorDebug() {
    const visible = this.sensorSystem.toggleDebug();
    this.hud.showNotification(visible ? 'SENSORES DE IA ATIVADOS' : 'SENSORES DE IA DESATIVADOS', 1.8);
  }

  toggleBloom() {
    this.useBloom = !this.useBloom;
    const btn = document.getElementById('btn-toggle-bloom');
    if (btn) btn.textContent = this.useBloom ? 'BLOOM: ON [G]' : 'BLOOM: OFF [G]';
    this.hud.showNotification(this.useBloom ? 'GRÁFICOS BLOOM: ON' : 'GRÁFICOS BLOOM: OFF', 1.4);
  }

  toggleSound() {
    this.soundSystem.isMuted = !this.soundSystem.isMuted;
    const btn = document.getElementById('btn-toggle-sound');
    if (btn) btn.textContent = this.soundSystem.isMuted ? 'SOM: MUTED [M]' : 'SOM: ON [M]';
    this.hud.showNotification(this.soundSystem.isMuted ? 'SOM MUTADO' : 'SOM ATIVADO', 1.2);
  }

  setupKeyListeners() {
    window.addEventListener('keydown', (e) => {
      this.soundSystem.ensureContext();

      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.playerInputs.accelerate = true;
      if (key === 's' || key === 'arrowdown') this.playerInputs.brake = true;
      if (key === 'a' || key === 'arrowleft') this.playerInputs.steerLeft = true;
      if (key === 'd' || key === 'arrowright') this.playerInputs.steerRight = true;

      if (e.code === 'Space') this.spacePressed = true;
      if (e.shiftKey) this.shiftPressed = true;
      this.playerInputs.drift = this.spacePressed || this.shiftPressed;

      if (key === 'q' || key === 'v') {
        this.followCamera.lookBack = true;
      }

      if (key === 'e' || key === 'enter') {
        this.usePlayerItem();
      }

      if (key === 'c') {
        const mode = this.followCamera.toggleView();
        this.hud.showNotification(`CÂMERA: ${mode}`, 1.2);
      }

      if (key === 'b') {
        this.toggleSensorDebug();
      }

      if (key === 'g') {
        this.toggleBloom();
      }

      if (key === 'm') {
        this.toggleSound();
      }

      if (key === 'r') {
        this.playerKart.respawnOnTrack(this.track);
        this.hud.showNotification('RECOLOCADO NA PISTA!', 1.4);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.playerInputs.accelerate = false;
      if (key === 's' || key === 'arrowdown') this.playerInputs.brake = false;
      if (key === 'a' || key === 'arrowleft') this.playerInputs.steerLeft = false;
      if (key === 'd' || key === 'arrowright') this.playerInputs.steerRight = false;

      if (e.code === 'Space') this.spacePressed = false;
      if (!e.shiftKey) this.shiftPressed = false;
      this.playerInputs.drift = this.spacePressed || this.shiftPressed;

      if (key === 'q' || key === 'v') {
        this.followCamera.lookBack = false;
      }
    });
  }

  usePlayerItem() {
    if (!this.playerKart.heldItem || this.countdownTimer > 0) return;
    const item = this.playerKart.heldItem;
    const direction = this.playerInputs.brake ? 'backward' : 'forward';

    this.itemManager.spawnItem({
      type: item,
      shooterKart: this.playerKart,
      direction,
      allKarts: this.allKarts,
      track: this.track
    });

    this.playerKart.heldItem = null;
    this.playerKart.updateHeldItemVisual();
    this.hud.clearItemSlot();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  updateCountdownLogic(deltaTime) {
    if (this.countdownTimer <= -1.0) return false;

    this.countdownTimer -= deltaTime;
    this.hud.updateCountdown(this.countdownTimer);

    // Determine traffic light stage (1, 2, 3, 4=GO)
    let stage = 0;
    if (this.countdownTimer > 2.0) stage = 1;
    else if (this.countdownTimer > 1.0) stage = 2;
    else if (this.countdownTimer > 0.0) stage = 3;
    else stage = 4;

    if (stage !== this.lastCountdownStage) {
      this.lastCountdownStage = stage;
      this.track.setCountdownLights(stage);
      if (stage >= 1 && stage <= 3) {
        this.soundSystem.playCountdownBeep(false);
      } else if (stage === 4) {
        this.soundSystem.playCountdownBeep(true);
        // Check Rocket Start!
        if (this.rocketStartCharge >= 0.45 && this.rocketStartCharge <= 1.65) {
          this.playerKart.applyBoost(1.5, 24);
          this.hud.showNotification('🚀 ARRANCADA TURBO PERFEITA!', 2.0);
          this.soundSystem.playMiniTurbo();
          this.followCamera.addShake(0.35);
        }
      }
    }

    // Accumulate rocket start charge if holding accelerate during 2..0
    if (this.countdownTimer > 0 && this.countdownTimer < 2.0) {
      if (this.playerInputs.accelerate) {
        this.rocketStartCharge += deltaTime;
        if (this.particleSystem && Math.random() < 0.5) {
          const exhaustPos = this.playerKart.position.clone().addScaledVector(this.playerKart.forward, -1.8);
          this.particleSystem.emitExhaustFlame(exhaustPos, this.playerKart.forward);
        }
      }
    }

    return this.countdownTimer > 0;
  }

  checkBoostPadCollisions() {
    const now = performance.now() * 0.001;
    this.allKarts.forEach(kart => {
      if (now - kart.lastBoostPadTime < 0.7) return;
      for (const pad of this.track.boostPads) {
        if (kart.position.distanceTo(pad.position) < pad.radius) {
          kart.lastBoostPadTime = now;
          kart.applyBoost(1.15, 22);
          if (kart.isPlayer) {
            this.hud.showNotification('⚡ TURBO PAD!', 1.2);
            this.soundSystem.playMiniTurbo();
            this.followCamera.addShake(0.25);
          }
          break;
        }
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);

    // 1. Update Track & Item Boxes & Particles
    this.track.update(deltaTime);
    this.itemBoxes.forEach(box => box.update(deltaTime));
    this.particleSystem.update(deltaTime);

    // 2. Check Starting Countdown
    const inPreRace = this.updateCountdownLogic(deltaTime);

    if (!inPreRace && !this.raceOver) {
      this.raceTime += deltaTime;

      // Track lap times for player
      if (this.playerKart.currentLap > this.prevPlayerLap) {
        const lapDuration = this.raceTime - this.currentLapStartTime;
        this.currentLapStartTime = this.raceTime;
        this.prevPlayerLap = this.playerKart.currentLap;
        if (!this.bestLapTime || lapDuration < this.bestLapTime) {
          this.bestLapTime = lapDuration;
        }
        if (this.playerKart.currentLap <= TRACK_CONFIG.TOTAL_LAPS) {
          this.hud.showNotification(`🏁 VOLTA ${this.playerKart.currentLap} / ${TRACK_CONFIG.TOTAL_LAPS}`, 1.8);
        }
      }

      // 3. Check Item Box & Boost Pad Collection
      this.checkItemBoxCollisions();
      this.checkBoostPadCollisions();

      // 4. Update AI Controllers (4-layer decision pipeline)
      this.aiControllers.forEach(controller => {
        controller.update(
          deltaTime,
          this.playerKart,
          this.allKarts,
          this.itemBoxes,
          this.itemManager.activeGroundTraps
        );
      });

      // 5. Update Kart Physics
      this.playerKart.update(deltaTime, this.playerInputs, this.track);
      this.aiControllers.forEach(controller => {
        controller.kart.update(deltaTime, controller.inputs, this.track);
      });

      // 6. Inter-kart collisions
      this.handleKartCollisions();

      // 7. Visual Effects: Speed Lines & Skid Marks
      this.updateSpeedLines(deltaTime);
      if (this.playerKart.isDrifting && Math.abs(this.playerKart.speed) > 14) {
        this.spawnSkidMark(this.playerKart);
      }
      this.aiRacers.forEach(ai => {
        if (ai.isDrifting && Math.abs(ai.speed) > 16) {
          this.spawnSkidMark(ai);
        }
      });

      // 8. Slipstream / Vácuo detection for player
      let drafting = false;
      for (const other of this.aiRacers) {
        if (other.totalDistance > this.playerKart.totalDistance) {
          const toOther = new THREE.Vector3().subVectors(other.position, this.playerKart.position);
          const dist = toOther.length();
          if (dist < 15 && dist > 2.5) {
            const dot = toOther.normalize().dot(this.playerKart.forward);
            if (dot > 0.92) {
              drafting = true;
              this.playerKart.draftTimer = (this.playerKart.draftTimer || 0) + deltaTime;
              if (this.playerKart.draftTimer > 1.3) {
                this.playerKart.applyBoost(1.2, 18);
                this.playerKart.draftTimer = 0;
                this.hud.showNotification('💨 VÁCUO / SLIPSTREAM ATIVADO!', 1.4);
                if (this.soundSystem) this.soundSystem.playMiniTurbo();
              }
              break;
            }
          }
        }
      }
      if (!drafting && this.playerKart.draftTimer > 0) {
        this.playerKart.draftTimer = Math.max(0, this.playerKart.draftTimer - deltaTime * 1.5);
      }

      // 9. Update Projectiles & Traps
      this.itemManager.update(deltaTime, this.allKarts, this.track);
    }

    // 10. Update Standings & Leaderboard
    this.updateRaceStandings();

    // 11. Follow Camera & Dynamic Shadow Frustum Tracking
    this.followCamera.update(deltaTime, this.playerKart, this.countdownTimer);
    if (this.dirLight && this.playerKart) {
      this.dirLight.position.set(
        this.playerKart.position.x + 65,
        this.playerKart.position.y + 110,
        this.playerKart.position.z + 55
      );
      this.dirLight.target.position.copy(this.playerKart.position);
    }

    // 12. Update HUD
    const incomingThreat = this.itemManager.getIncomingThreat(this.playerKart);
    this.hud.update(
      deltaTime,
      this.playerKart,
      this.allKarts,
      this.aiControllers,
      this.track,
      this.raceTime,
      this.bestLapTime,
      incomingThreat,
      this.itemManager.activeProjectiles
    );

    // 13. Check Win / Finish Condition
    this.checkRaceFinish();

    // 14. Render Scene (with optional Post-Processing Bloom)
    if (this.useBloom && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  checkItemBoxCollisions() {
    this.allKarts.forEach(kart => {
      if (kart.heldItem) return;

      for (const box of this.itemBoxes) {
        if (!box.active) continue;
        const dist = kart.position.distanceTo(box.position);
        if (dist < box.radius + 1.2) {
          box.collect();
          if (this.particleSystem) {
            this.particleSystem.emitBurst(box.position, 0x38bdf8, 16, 9);
          }

          const item = this.rollItemForKart(kart);

          if (kart.isPlayer) {
            this.soundSystem.playItemBoxCollect();
            this.hud.triggerItemRoulette(item, () => {
              kart.assignItem(item);
            });
          } else {
            kart.assignItem(item);
          }
          break;
        }
      }
    });
  }

  rollItemForKart(kart) {
    const pos = kart.racePosition;
    if (pos === 1) {
      return Math.random() < 0.65 ? ITEM_TYPES.BANANA : ITEM_TYPES.GREEN_SHELL;
    } else if (pos <= 3) {
      const r = Math.random();
      if (r < 0.4) return ITEM_TYPES.GREEN_SHELL;
      if (r < 0.75) return ITEM_TYPES.RED_SHELL;
      return ITEM_TYPES.BOOST_MUSHROOM;
    } else if (pos <= 6) {
      const r = Math.random();
      if (r < 0.4) return ITEM_TYPES.RED_SHELL;
      if (r < 0.8) return ITEM_TYPES.BOOST_MUSHROOM;
      return ITEM_TYPES.LIGHTNING;
    } else {
      const r = Math.random();
      if (r < 0.35) return ITEM_TYPES.BLUE_SHELL;
      if (r < 0.7) return ITEM_TYPES.LIGHTNING;
      return ITEM_TYPES.BOOST_MUSHROOM;
    }
  }

  handleKartCollisions() {
    for (let i = 0; i < this.allKarts.length; i++) {
      for (let j = i + 1; j < this.allKarts.length; j++) {
        const k1 = this.allKarts[i];
        const k2 = this.allKarts[j];

        const delta = new THREE.Vector3().subVectors(k2.position, k1.position);
        delta.y = 0;
        const dist = delta.length();
        const minSpacing = 2.35;

        if (dist < minSpacing && dist > 0.001) {
          const overlap = (minSpacing - dist) * 0.5;
          const normal = delta.clone().normalize();

          k1.position.addScaledVector(normal, -overlap);
          k2.position.addScaledVector(normal, overlap);

          const relSpeed = (k1.speed - k2.speed) * 0.2;
          k1.speed -= relSpeed;
          k2.speed += relSpeed;

          if (k1.isPlayer || k2.isPlayer) {
            this.followCamera.addShake(0.18);
          }
        }
      }
    }
  }

  updateRaceStandings() {
    this.allKarts.sort((a, b) => b.totalDistance - a.totalDistance);

    this.allKarts.forEach((kart, index) => {
      kart.racePosition = index + 1;
    });
  }

  checkRaceFinish() {
    if (this.raceOver) return;

    if (this.playerKart.currentLap > TRACK_CONFIG.TOTAL_LAPS) {
      this.raceOver = true;
      this.hud.showRaceFinish(this.playerKart.racePosition, this.allKarts, this.raceTime);
      if (this.playerKart.racePosition === 1 && this.soundSystem) {
        this.soundSystem.playLapPass();
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
