import * as THREE from 'three';
import { sounds } from './audio/soundManager.js';
import { DustMap } from './world/map.js';
import { ParticleSystem } from './world/particles.js';
import { DecalManager } from './world/decals.js';
import { WeaponManager } from './entities/weapon.js';
import { Player } from './entities/player.js';
import { Bot } from './entities/bot.js';
import { HUD } from './ui/hud.js';

class Game {
  constructor() {
    this.container = document.getElementById('game-container');

    // 1. Three.js Scene, Camera, Renderer
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 1000);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    // 2. Systems
    this.map = new DustMap(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.decals = new DecalManager(this.scene);
    this.weapons = new WeaponManager(this.camera, this.scene, this.particles, this.decals);
    this.player = new Player(this.camera, this.renderer.domElement, this.map);
    this.hud = new HUD();

    // 3. Bots
    this.bots = [];
    this._spawnBots();

    // 4. Timing & State
    this.clock = new THREE.Clock();
    this.elapsedTime = 0;
    this.isGameRunning = false;

    this._setupEvents();
    this._setupUIEvents();
  }

  _spawnBots() {
    const spawnPoints = [
      { pos: new THREE.Vector3(18, 1.2, 18), name: 'Bot_CT_Alpha' },
      { pos: new THREE.Vector3(-15, 0, 10), name: 'Bot_CT_Bravo' },
      { pos: new THREE.Vector3(2, 0, 12), name: 'Bot_CT_Charlie' }
    ];

    spawnPoints.forEach((sp, index) => {
      const bot = new Bot(index + 1, this.scene, this.map, sp.pos, sp.name);
      this.bots.push(bot);
    });
  }

  _setupEvents() {
    // Window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Weapon slot hotkeys (1: AK-47, 2: Deagle)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Digit1') {
        this.weapons.switchWeapon('ak47');
      } else if (e.code === 'Digit2') {
        this.weapons.switchWeapon('deagle');
      } else if (e.code === 'KeyR') {
        this.weapons.reload();
      }
    });

    // Mouse scroll weapon switch
    window.addEventListener('wheel', (e) => {
      if (e.deltaY > 0) {
        this.weapons.switchWeapon('deagle');
      } else {
        this.weapons.switchWeapon('ak47');
      }
    });
  }

  _setupUIEvents() {
    const startScreen = document.getElementById('start-screen');
    const btnStart = document.getElementById('btn-start');
    const btnRespawn = document.getElementById('btn-respawn');

    btnStart.addEventListener('click', () => {
      sounds.init();
      sounds.resume();
      this.renderer.domElement.requestPointerLock();
      startScreen.style.display = 'none';
      this.isGameRunning = true;
    });

    if (btnRespawn) {
      btnRespawn.addEventListener('click', () => {
        this.player.respawn();
        this.renderer.domElement.requestPointerLock();
      });
    }

    // Resume pointer lock on click if running
    this.renderer.domElement.addEventListener('click', () => {
      if (this.isGameRunning && !this.player.isLocked) {
        this.renderer.domElement.requestPointerLock();
      }
    });
  }

  _handlePlayerShooting() {
    if (!this.player.isShooting || !this.player.isAlive) return;

    const curW = this.weapons.currentWeapon;
    if (!this.weapons.canShoot()) return;

    // For semi-automatic weapon (Deagle), trigger once per click
    if (!curW.isAutomatic) {
      this.player.isShooting = false;
    }

    const horizontalSpeed = Math.sqrt(
      this.player.velocity.x * this.player.velocity.x + this.player.velocity.z * this.player.velocity.z
    );

    const shotInfo = this.weapons.shoot(horizontalSpeed, this.player.isCrouching);
    if (!shotInfo) return;

    // Prepare raycasting against bots + world
    const allBotHitboxes = [];
    this.bots.forEach(b => {
      if (b.isAlive) {
        allBotHitboxes.push(...b.hitboxes);
      }
    });

    // First check bot hits
    const botIntersects = shotInfo.raycaster.intersectObjects(allBotHitboxes, false);
    // Also check world hits
    const worldIntersects = shotInfo.raycaster.intersectObjects(this.map.raycastMeshes, false);

    const closestBot = botIntersects.length > 0 ? botIntersects[0] : null;
    const closestWorld = worldIntersects.length > 0 ? worldIntersects[0] : null;

    let hitPoint = null;

    if (closestBot && (!closestWorld || closestBot.distance < closestWorld.distance)) {
      // Hit a bot!
      hitPoint = closestBot.point;
      const hitData = closestBot.object.userData;
      const bot = hitData.bot;
      const isHeadshot = hitData.part === 'head';

      let damage = shotInfo.damage;
      if (isHeadshot) {
        damage *= shotInfo.headshotMultiplier;
        sounds.playHeadshot();
        this.hud.showHitmarker(true);
      } else {
        sounds.playHitmarker();
        this.hud.showHitmarker(false);
      }

      // Blood particles
      const normal = closestBot.face ? closestBot.face.normal : new THREE.Vector3(0, 1, 0);
      this.particles.createBlood(hitPoint, normal);

      // Apply damage to bot
      const wasKilled = bot.takeDamage(damage, isHeadshot);
      if (wasKilled) {
        this.player.kills++;
        this.hud.addKillfeedEntry('Player', shotInfo.weaponName, bot.name, isHeadshot);
      }
    } else if (closestWorld) {
      // Hit a wall or crate!
      hitPoint = closestWorld.point;
      const normal = closestWorld.face.normal.clone().transformDirection(closestWorld.object.matrixWorld);

      // Sparks & Bullet Hole Decal
      this.particles.createSparks(hitPoint, normal);
      this.decals.addBulletHole(hitPoint, normal);
    } else {
      // Missed into the sky
      hitPoint = shotInfo.raycaster.ray.origin.clone().add(
        shotInfo.raycaster.ray.direction.clone().multiplyScalar(100)
      );
    }

    // Bullet tracer
    this.particles.createTracer(shotInfo.muzzlePos, hitPoint);
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      const delta = Math.min(this.clock.getDelta(), 0.1);
      if (this.isGameRunning) {
        this.elapsedTime += delta;

        // 1. Update Player & Shooting
        this.player.update(delta);
        this._handlePlayerShooting();

        // 2. Update Weapons
        const isMoving = this.player.velocity.lengthSq() > 0.1;
        this.weapons.update(delta, this.player.velocity, isMoving, this.player.isCrouching);

        // 3. Update Bots
        this.bots.forEach(bot => {
          bot.update(delta, this.player, this.particles);
        });

        // 4. Update Particle Systems & Decals
        this.particles.update(delta);

        // 5. Update HUD
        this.hud.update(this.player, this.weapons, this.elapsedTime);
      }

      // Render 3D Scene
      this.renderer.render(this.scene, this.camera);
    });
  }
}

// Instantiate and launch game
const game = new Game();
game.start();
