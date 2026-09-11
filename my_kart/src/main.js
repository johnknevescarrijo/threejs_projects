import * as THREE from 'three';
import { Track } from './core/track.js';
import { FollowCamera } from './core/camera.js';
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

    this.track = null;
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

    this.playerInputs = {
      accelerate: false,
      brake: false,
      steerLeft: false,
      steerRight: false,
      drift: false
    };

    this.raceOver = false;

    this.init();
  }

  init() {
    // 1. Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0018);

    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.2, 1200);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    // 2. Lighting & Atmosphere
    this.setupLighting();
    this.setupSkyDome();
    this.setupSpeedLines();
    this.setupSkidMarks();

    // 3. Audio & Sound System
    this.soundSystem = new SoundSystem();

    // 4. Track & Environment
    this.track = new Track(this.scene);

    // 5. Sensor System & Item Manager
    this.sensorSystem = new SensorSystem(this.scene);
    this.itemManager = new ItemManager(this.scene, this.soundSystem);

    // 6. Spawn Item Boxes at Strategic Waypoint Intervals
    this.spawnItemBoxes();

    // 7. Spawn Grid of Racers (1 Player + 7 AI)
    this.spawnRacers();

    // 8. Camera & HUD
    this.followCamera = new FollowCamera(this.camera, this.renderer.domElement);
    this.hud = new HUD({
      onToggleDebug: () => {
        const visible = this.sensorSystem.toggleDebug();
        this.hud.showNotification(visible ? 'SENSORES DE IA ATIVADOS' : 'SENSORES DE IA DESATIVADOS', 1.8);
      },
      onToggleSound: () => {
        this.soundSystem.isMuted = !this.soundSystem.isMuted;
        const btn = document.getElementById('btn-toggle-sound');
        if (btn) btn.textContent = this.soundSystem.isMuted ? 'SOM: MUTED [M]' : 'SOM: ON [M]';
      },
      onResetRace: () => {
        this.playerKart.respawnOnTrack(this.track);
        this.hud.showNotification('CORRIDA REINICIADA!', 1.4);
      }
    });

    // 9. Input Listeners
    this.setupKeyListeners();
    window.addEventListener('resize', () => this.onWindowResize());

    // 10. Start Game Loop
    this.animate();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xdff9fb, 0x55efc4, 0.45);
    hemiLight.position.set(0, 100, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffae6, 1.25);
    dirLight.position.set(120, 200, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 600;
    const d = 160;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);
  }

  setupSkyDome() {
    const skyGeo = new THREE.SphereGeometry(680, 32, 24);
    const pos = skyGeo.attributes.position;
    const colors = [];
    const colorZenith = new THREE.Color(0x0984e3); // Vibrant deep blue
    const colorHorizon = new THREE.Color(0x74b9ff); // Light cyan
    const colorHaze = new THREE.Color(0xffeaa7); // Warm golden horizon

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const normalizedY = THREE.MathUtils.clamp((y + 680) / 1360, 0, 1);
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
      side: THREE.BackSide
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);
  }

  setupSpeedLines() {
    this.speedLinesGroup = new THREE.Group();
    this.speedLines = [];
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55
    });

    for (let i = 0; i < 36; i++) {
      const p1 = new THREE.Vector3(0, 0, 0);
      const p2 = new THREE.Vector3(0, 0, -3.5);
      const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const line = new THREE.Line(geo, lineMat);
      this.speedLinesGroup.add(line);
      this.speedLines.push({
        line,
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.2) * 6 + 1.2,
          Math.random() * 25 - 15
        ),
        speed: 40 + Math.random() * 30
      });
    }
    this.speedLinesGroup.visible = false;
    this.scene.add(this.speedLinesGroup);
  }

  updateSpeedLines(deltaTime) {
    if (!this.playerKart) return;
    const isHighSpeed = this.playerKart.isBoosting || Math.abs(this.playerKart.speed) > 36;
    if (!isHighSpeed) {
      this.speedLinesGroup.visible = false;
      return;
    }
    this.speedLinesGroup.visible = true;
    this.speedLinesGroup.position.copy(this.playerKart.position);
    this.speedLinesGroup.quaternion.copy(this.playerKart.mesh.quaternion);

    this.speedLines.forEach(item => {
      item.offset.z += item.speed * deltaTime;
      if (item.offset.z > 8) {
        item.offset.z = -24 - Math.random() * 8;
        item.offset.x = (Math.random() - 0.5) * 14;
        item.offset.y = (Math.random() - 0.2) * 6 + 1.0;
      }
      item.line.position.copy(item.offset);
    });
  }

  setupSkidMarks() {
    this.skidMarks = [];
    this.skidMat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
  }

  spawnSkidMark(pos) {
    if (this.skidMarks.length > 180) {
      const old = this.skidMarks.shift();
      this.scene.remove(old);
      old.geometry.dispose();
    }
    const plane = new THREE.PlaneGeometry(0.55, 0.9);
    plane.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(plane, this.skidMat);
    mesh.position.copy(pos);
    mesh.position.y += 0.08;
    this.scene.add(mesh);
    this.skidMarks.push(mesh);
  }

  spawnItemBoxes() {
    this.track.itemBoxProgressPoints.forEach(progressT => {
      // Spawn 3 item boxes side by side across track width
      const offsets = [-5, 0, 5];
      offsets.forEach(offset => {
        const pos = this.track.getWaypointAtProgress(progressT, offset);
        pos.y += 0.8;
        const itemBox = new ItemBox(pos, this.scene);
        this.itemBoxes.push(itemBox);
      });
    });
  }

  spawnRacers() {
    // Staggered starting grid
    // Row 0: Player (Right) & AI 0 (Left)
    // Row 1: AI 1 & AI 2
    // Row 2: AI 3 & AI 4
    // Row 3: AI 5 & AI 6

    const gridPositions = [
      { row: 0, lateral: 3.5, isPlayer: true, name: 'Você (Player)' },
      { row: 0, lateral: -3.5, preset: AI_RACER_PRESETS[0] },
      { row: 1, lateral: 3.5, preset: AI_RACER_PRESETS[1] },
      { row: 1, lateral: -3.5, preset: AI_RACER_PRESETS[2] },
      { row: 2, lateral: 3.5, preset: AI_RACER_PRESETS[3] },
      { row: 2, lateral: -3.5, preset: AI_RACER_PRESETS[4] },
      { row: 3, lateral: 3.5, preset: AI_RACER_PRESETS[5] },
      { row: 3, lateral: -3.5, preset: AI_RACER_PRESETS[6] }
    ];

    gridPositions.forEach((slot, idx) => {
      const startDist = -12 - slot.row * 9; // Meters behind start line
      const startT = ((startDist / this.track.totalLength) % 1.0 + 1.0) % 1.0;
      const startPos = this.track.getWaypointAtProgress(startT, slot.lateral);
      const tangent = this.track.curve.getTangentAt(startT).normalize();
      const yaw = Math.atan2(-tangent.x, -tangent.z);

      if (slot.isPlayer) {
        this.playerKart = new Kart({
          id: 'player',
          name: 'Jogador',
          isPlayer: true,
          color: 0xe74c3c,      // Classic Red
          accentColor: 0x2c3e50,
          scene: this.scene,
          soundSystem: this.soundSystem
        });
        this.playerKart.setPosition(startPos.x, startPos.y, startPos.z);
        this.playerKart.setRotation(yaw);
        this.allKarts.push(this.playerKart);
      } else {
        const p = slot.preset;
        const aiKart = new Kart({
          id: `ai_${idx}`,
          name: p.name,
          isPlayer: false,
          color: p.kartColor,
          accentColor: p.accentColor,
          scene: this.scene,
          soundSystem: this.soundSystem
        });
        aiKart.setPosition(startPos.x, startPos.y, startPos.z);
        aiKart.setRotation(yaw);

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

  setupKeyListeners() {
    window.addEventListener('keydown', (e) => {
      this.soundSystem.ensureContext();

      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.playerInputs.accelerate = true;
      if (key === 's' || key === 'arrowdown') this.playerInputs.brake = true;
      if (key === 'a' || key === 'arrowleft') this.playerInputs.steerLeft = true;
      if (key === 'd' || key === 'arrowright') this.playerInputs.steerRight = true;
      if (key === ' ' || e.shiftKey) this.playerInputs.drift = true;

      if (key === 'e' || key === 'enter') {
        this.usePlayerItem();
      }

      if (key === 'c') {
        const mode = this.followCamera.toggleView();
        this.hud.showNotification(`CÂMERA: ${mode}`, 1.2);
      }

      if (key === 'b') {
        const visible = this.sensorSystem.toggleDebug();
        this.hud.showNotification(visible ? 'SENSORES DE IA ATIVADOS' : 'SENSORES DE IA DESATIVADOS', 1.8);
      }

      if (key === 'm') {
        this.soundSystem.isMuted = !this.soundSystem.isMuted;
        this.hud.showNotification(this.soundSystem.isMuted ? 'SOM MUTADO' : 'SOM ATIVADO', 1.2);
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
      if (key === ' ' || !e.shiftKey) {
        if (!e.shiftKey && key !== ' ') {
          // Keep drift if space still pressed
        } else {
          this.playerInputs.drift = false;
        }
      }
    });
  }

  usePlayerItem() {
    if (!this.playerKart.heldItem) return;
    const item = this.playerKart.heldItem;

    // Backward toss if holding S / Down while firing
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
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);

    // 1. Update Item Boxes
    this.itemBoxes.forEach(box => box.update(deltaTime));

    // 2. Check Item Box Collection
    this.checkItemBoxCollisions();

    // 3. Update AI Controllers (4-layer decision pipeline)
    this.aiControllers.forEach(controller => {
      controller.update(
        deltaTime,
        this.playerKart,
        this.allKarts,
        this.itemBoxes,
        this.itemManager.activeGroundTraps
      );
    });

    // 4. Update Kart Physics
    // Update player
    this.playerKart.update(deltaTime, this.playerInputs, this.track);

    // Update AI karts
    this.aiControllers.forEach(controller => {
      controller.kart.update(deltaTime, controller.inputs, this.track);
    });

    // 5. Inter-kart collisions (Sphere repulsion)
    this.handleKartCollisions();

    // 6. Visual Effects: Speed Lines & Skid Marks
    this.updateSpeedLines(deltaTime);
    if (this.playerKart.isDrifting && Math.abs(this.playerKart.speed) > 14) {
      this.spawnSkidMark(this.playerKart.position);
    }
    this.aiRacers.forEach(ai => {
      if (ai.isDrifting && Math.abs(ai.speed) > 16) {
        this.spawnSkidMark(ai.position);
      }
    });

    // 7. Slipstream / Vácuo detection for player
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
              this.playerKart.applyBoost(1.2, 16);
              this.playerKart.draftTimer = 0;
              this.hud.showNotification('VÁCUO / SLIPSTREAM ATIVADO!', 1.2);
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

    // 8. Update Projectiles & Traps
    this.itemManager.update(deltaTime, this.allKarts, this.track);

    // 9. Update Standings & Leaderboard
    this.updateRaceStandings();

    // 10. Follow Camera
    this.followCamera.update(deltaTime, this.playerKart);

    // 11. Update HUD
    this.hud.update(deltaTime, this.playerKart, this.allKarts, this.aiControllers, this.track);

    // 12. Check Win / Finish Condition
    this.checkRaceFinish();

    // 13. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  checkItemBoxCollisions() {
    this.allKarts.forEach(kart => {
      if (kart.heldItem) return; // Already has item

      for (const box of this.itemBoxes) {
        if (!box.active) continue;
        const dist = kart.position.distanceTo(box.position);
        if (dist < box.radius + 1.2) {
          box.collect();

          // Roll item based on position (catch-up probability)
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
    // Behind positions get high-tier weapons (Blue Shell, Lightning, Mushroom)
    // Leading positions get defensive items (Banana, Green Shell)
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
      // 7th or 8th
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
        const minSpacing = 2.4;

        if (dist < minSpacing && dist > 0.001) {
          const overlap = (minSpacing - dist) * 0.5;
          const normal = delta.clone().normalize();

          k1.position.addScaledVector(normal, -overlap);
          k2.position.addScaledVector(normal, overlap);

          // Bumping velocity impact
          const relSpeed = (k1.speed - k2.speed) * 0.2;
          k1.speed -= relSpeed;
          k2.speed += relSpeed;

          if (k1.isPlayer || k2.isPlayer) {
            this.followCamera.addShake(0.2);
          }
        }
      }
    }
  }

  updateRaceStandings() {
    // Sort all karts by total distance traveled (descending)
    this.allKarts.sort((a, b) => b.totalDistance - a.totalDistance);

    this.allKarts.forEach((kart, index) => {
      kart.racePosition = index + 1;
    });
  }

  checkRaceFinish() {
    if (this.raceOver) return;

    if (this.playerKart.currentLap > TRACK_CONFIG.TOTAL_LAPS) {
      this.raceOver = true;
      this.hud.showRaceFinish(this.playerKart.racePosition, this.allKarts);
      if (this.playerKart.racePosition === 1 && this.soundSystem) {
        this.soundSystem.playLapPass();
      }
    }
  }
}

// Instantiate and start when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
