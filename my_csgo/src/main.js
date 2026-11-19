import * as THREE from 'three';
import { sounds } from './audio/soundManager.js';
import { FIXED_HZ, createFixedStepper } from './core/fixedLoop.js';
import { createMap } from './world/mapRegistry.js';
import { PooledParticleSystem } from './world/pooledParticles.js';
import { DecalManager } from './world/decals.js';
import { WeaponManager } from './entities/weapon.js';
import { Player } from './entities/player.js';
import { Bot } from './entities/bot.js';
import { GrenadeManager } from './entities/grenades.js';
import { DroppedWeaponManager } from './entities/droppedWeapons.js';
import { HUD } from './ui/hud.js';
import { WEAPONS } from './config/weapons.js';
import { RoundManager, ROUND_PHASES } from './combat/roundManager.js';
import {
  computeBulletDamage,
  generatePelletOffsets,
  classifySurfacePenetration,
  isBackstab
} from './combat/ballistics.js';
import {
  ECONOMY_CONFIG,
  UTILITY_ITEMS,
  createEconomyState,
  awardKill,
  applyRespawnFloor,
  purchaseItem
} from './combat/tactical.js';

const _TMP_NORMAL_MAT = new THREE.Matrix3();
const _TMP_INST_MAT = new THREE.Matrix4();

class Game {
  constructor() {
    this.container = document.getElementById('game-container');

    // 1. World Scene, Camera & Anti-Clipping Viewmodel Scene/Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 1000);
    this.scene.add(this.camera);

    this.viewmodelScene = new THREE.Scene();
    this.viewmodelCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
    this.viewmodelScene.add(this.viewmodelCamera);

    // Dedicated crisp lighting for first-person viewmodel & tactical arms
    const vmHemi = new THREE.HemisphereLight(0xffeedd, 0x334155, 1.0);
    const vmKey = new THREE.DirectionalLight(0xfff7ed, 1.35);
    vmKey.position.set(2, 4, 2);
    this.viewmodelScene.add(vmHemi);
    this.viewmodelScene.add(vmKey);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.autoClear = false;
    this.container.appendChild(this.renderer.domElement);

    // 2. Match Selection & Systems
    this.selectedMapId = 'dust2';
    this.playerTeam = 'CT';
    this.map = createMap(this.selectedMapId, this.scene);
    this.particles = new PooledParticleSystem(this.scene, this.map);
    this.decals = new DecalManager(this.scene);
    this.weapons = new WeaponManager(this.camera, this.viewmodelCamera, this.particles, this.decals);
    this.player = new Player(this.camera, this.renderer.domElement, this.map);
    this.grenades = new GrenadeManager(this.scene, this.map);
    this.droppedWeapons = new DroppedWeaponManager(this.scene, this.map);
    this.hud = new HUD();

    // 3. Round, C4, Economy & Flash State
    this.roundManager = new RoundManager({ mode: this.map.defaultMode });
    this.economy = createEconomyState(false);
    this.flashIntensity = 0;
    this.flashPeakIntensity = 0;
    this.flashTimer = 0;
    this.flashMaxDuration = 1;
    this.wasPlayerAlive = true;

    this.plantedC4Group = null;
    this.plantedC4LedMat = null;
    this.c4LedBlinkTimer = 0;
    this.c4ExplosionEffects = [];
    this.playerPlantProgress = 0;
    this.playerDefuseProgress = 0;
    this.isPlayerDefusing = false;
    this.objectivePrompt = null;
    this.actionProgress = null;

    // 4. Bots & Teams
    this.bots = [];
    this.scoreCT = 0;
    this.scoreT = 0;
    this._initializeMatch(this.selectedMapId, this.playerTeam);

    // 5. Timing & State
    this.clock = new THREE.Clock();
    this.fixedStepper = createFixedStepper({ stepHz: FIXED_HZ, maxFrameDelta: 0.1, maxSubsteps: 5 });
    this.elapsedTime = 0;
    this.isGameRunning = false;

    this._setupEvents();
    this._setupUIEvents();
  }

  _initializeMatch(mapId, playerTeam) {
    this.selectedMapId = mapId;
    this.playerTeam = playerTeam;

    // Dispose old bots and map cleanly
    for (const b of this.bots) {
      b.dispose();
    }
    this.bots = [];
    this._removePlantedC4();
    while (this.droppedWeapons.items.length > 0) {
      this.droppedWeapons.removeDropped(this.droppedWeapons.items[0]);
    }

    if (this.map && this.map.id !== mapId) {
      this.map.dispose();
      this.map = createMap(mapId, this.scene);
      this.particles.map = this.map;
      this.grenades.map = this.map;
      this.droppedWeapons.map = this.map;
      this.player.map = this.map;
    }

    this.roundManager = new RoundManager({ mode: this.map.defaultMode });
    this.player.allowAutoRespawn = (this.roundManager.mode === 'deathmatch');
    this.player.hasDefuseKit = false;
    this.player.kills = 0;
    this.player.deaths = 0;
    this.economy = createEconomyState(false);
    this.scoreCT = 0;
    this.scoreT = 0;

    this._spawnBotsForMatch();
    this._startRoundSetup(true);
  }

  _spawnBotsForMatch() {
    const ctNames = ['CT_Alpha', 'CT_Bravo', 'CT_Charlie', 'CT_Delta'];
    const tNames = ['T_Phoenix', 'T_Leet', 'T_Balkan', 'T_Guerilla'];
    const ctSpawns = this.map.spawns.CT;
    const tSpawns = this.map.spawns.T;

    const ctCount = this.playerTeam === 'CT' ? 3 : 4;
    const tCount = this.playerTeam === 'T' ? 3 : 4;
    let idCounter = 1;

    for (let i = 0; i < ctCount; i++) {
      const spIdx = this.playerTeam === 'CT' ? i + 1 : i;
      const sp = ctSpawns[spIdx % ctSpawns.length];
      const bot = new Bot(
        idCounter++,
        this.scene,
        this.map,
        new THREE.Vector3(sp.x, sp.y ?? 0, sp.z),
        ctNames[i % ctNames.length],
        'CT',
        { playerTeam: this.playerTeam }
      );
      this.bots.push(bot);
    }

    for (let i = 0; i < tCount; i++) {
      const spIdx = this.playerTeam === 'T' ? i + 1 : i;
      const sp = tSpawns[spIdx % tSpawns.length];
      const bot = new Bot(
        idCounter++,
        this.scene,
        this.map,
        new THREE.Vector3(sp.x, sp.y ?? 0, sp.z),
        tNames[i % tNames.length],
        'T',
        { playerTeam: this.playerTeam }
      );
      this.bots.push(bot);
    }
  }

  _startRoundSetup(isNewMatch = false) {
    this._removePlantedC4();
    while (this.droppedWeapons.items.length > 0) {
      this.droppedWeapons.removeDropped(this.droppedWeapons.items[0]);
    }

    this.playerPlantProgress = 0;
    this.playerDefuseProgress = 0;
    this.isPlayerDefusing = false;
    this.objectivePrompt = null;
    this.actionProgress = null;
    this.flashTimer = 0;
    this.flashIntensity = 0;
    this.flashPeakIntensity = 0;

    // Reset Player spawn & loadout
    const pSpawns = this.map.spawns[this.playerTeam];
    const pSpawn = pSpawns[0];
    this.player.defaultSpawnPos = pSpawn;
    this.player.defaultSpawnYaw = pSpawn.yaw ?? 0;

    const survivedLastRound = !isNewMatch && this.wasPlayerAlive && this.player.isAlive;
    this.player.spawnAt(pSpawn, pSpawn.yaw ?? 0, true);
    this.wasPlayerAlive = true;

    if (!survivedLastRound) {
      this.player.hasDefuseKit = false;
      const defaultPrimary = this.playerTeam === 'CT' ? 'm4a4' : 'ak47';
      const defaultPistol = this.playerTeam === 'CT' ? 'usps' : 'glock18';
      this.weapons.equipWeapon(defaultPistol);
      this.weapons.equipWeapon(defaultPrimary);
    }

    // Assign C4 in bomb_defusal mode
    const isBombMode = this.roundManager.mode === 'bomb_defusal';
    const playerGetsC4 = isBombMode && this.playerTeam === 'T';
    this.weapons.setHasC4(playerGetsC4);

    let ctIdx = this.playerTeam === 'CT' ? 1 : 0;
    let tIdx = this.playerTeam === 'T' ? 1 : 0;
    let tBotGivenC4 = false;

    for (const bot of this.bots) {
      bot.setPlayerTeam(this.playerTeam);
      if (bot.team === 'CT') {
        const sp = this.map.spawns.CT[ctIdx % this.map.spawns.CT.length];
        ctIdx++;
        bot.resetForRound(new THREE.Vector3(sp.x, sp.y ?? 0, sp.z), false);
      } else {
        const sp = this.map.spawns.T[tIdx % this.map.spawns.T.length];
        tIdx++;
        const giveC4 = isBombMode && !playerGetsC4 && !tBotGivenC4;
        if (giveC4) tBotGivenC4 = true;
        bot.resetForRound(new THREE.Vector3(sp.x, sp.y ?? 0, sp.z), giveC4);
      }
    }
  }

  _spawnPlantedC4(pos) {
    this._removePlantedC4();
    const group = new THREE.Group();
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.75 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.4
    });

    const brick = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.36), brickMat);
    brick.position.y = 0.06;
    brick.castShadow = true;
    group.add(brick);

    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.18), darkMat);
    pad.position.y = 0.13;
    group.add(pad);

    const led = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), ledMat);
    led.position.set(0.05, 0.15, -0.04);
    group.add(led);

    const gy = this.map.getGroundHeight(pos.x, pos.z);
    group.position.set(pos.x, gy, pos.z);
    this.scene.add(group);

    this.plantedC4Group = group;
    this.plantedC4LedMat = ledMat;
    this.c4LedBlinkTimer = 0;
  }

  _removePlantedC4() {
    if (this.plantedC4Group) {
      this.scene.remove(this.plantedC4Group);
      this.plantedC4Group = null;
      this.plantedC4LedMat = null;
    }
  }

  _spawnC4Explosion(pos) {
    if (!pos) return;
    const origin = new THREE.Vector3(pos.x, (pos.y ?? 0) + 0.5, pos.z);
    const geo = new THREE.SphereGeometry(1, 16, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.92 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    mesh.scale.setScalar(0.6);
    this.scene.add(mesh);
    this.c4ExplosionEffects.push({ mesh, geo, mat, life: 0.85, maxLife: 0.85 });

    // Blast damage within 22m
    for (const bot of this.bots) {
      if (!bot.isAlive) continue;
      const dist = bot.group.position.distanceTo(origin);
      if (dist < 22) {
        const dmg = Math.round(140 * (1 - dist / 22));
        bot.takeDamage(dmg, false, 0);
      }
    }
    if (this.player.isAlive) {
      const dist = this.player.camera.position.distanceTo(origin);
      if (dist < 22) {
        this.player.takeDamage(Math.round(120 * (1 - dist / 22)));
      }
    }
  }

  _onBombPlanted(site, pos, planterName) {
    const ev = this.roundManager.plantBomb(site, pos);
    if (!ev) return;
    sounds.playC4Plant();
    this._spawnPlantedC4(ev.pos);
    this.hud.addKillfeedEntry(planterName, 'C4 PLANTED', `BOMBSITE ${ev.site}`, false, 'T', 'CT');
  }

  _onBombDefused(defuserName) {
    const ev = this.roundManager.defuseBomb();
    if (!ev) return;
    sounds.playC4Defused();
    this._removePlantedC4();
    this.hud.addKillfeedEntry(defuserName, 'DEFUSED', 'C4', false, 'CT', 'T');
    this._applyRoundEndEvent(ev);
  }

  _applyRoundEndEvent(ev) {
    this.scoreCT = ev.scoreCT;
    this.scoreT = ev.scoreT;
    const reward = this.playerTeam === 'CT' ? ev.rewardCT : ev.rewardT;
    this.economy.money = Math.min(ECONOMY_CONFIG.maxMoney, this.economy.money + reward);
    sounds.playRoundEnd(ev.winner === this.playerTeam);
  }

  _refreshArsenalMenu() {
    this.hud.renderArsenalMenu(
      this.weapons,
      this.economy,
      this.player.armor,
      {
        onSelectWeapon: (weaponId) => this._handleBuyWeapon(weaponId),
        onBuyUtility: (utilityId) => this._handleBuyUtility(utilityId),
        onToggleSandbox: () => {
          this.economy.sandboxFree = !this.economy.sandboxFree;
          sounds.playWeaponSwitch();
          this._refreshArsenalMenu();
        }
      },
      {
        playerTeam: this.playerTeam,
        hasDefuseKit: this.player.hasDefuseKit
      }
    );
  }

  _handleBuyWeapon(weaponId) {
    const w = WEAPONS[weaponId];
    if (!w) return;

    if (this.weapons.slots[w.slot] === weaponId) {
      this.weapons.switchSlot(w.slot);
      this._toggleArsenal(false);
      return;
    }

    const res = purchaseItem(this.economy, w.price);
    if (!res.ok) {
      sounds.playBuyError();
      return;
    }

    const oldId = this.weapons.slots[w.slot];
    if (oldId && this.weapons.weapons[oldId]) {
      const oldState = this.weapons.weapons[oldId];
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const dropOrigin = this.camera.position.clone().addScaledVector(forward, 0.5).add(new THREE.Vector3(0, -0.35, 0));
      this.droppedWeapons.dropWeapon(WEAPONS[oldId], oldState.currentAmmo, oldState.reserveAmmo, dropOrigin, forward);
    }

    this.weapons.equipWeapon(weaponId);
    sounds.playBuy();
    this._toggleArsenal(false);
  }

  _handleBuyUtility(utilityId) {
    const item = UTILITY_ITEMS[utilityId];
    if (!item) return;

    if (item.type === 'armor') {
      if (this.player.armor >= 100) {
        sounds.playBuyError();
        return;
      }
      const price = this.player.armor > 0 ? item.repairPrice : item.price;
      const res = purchaseItem(this.economy, price);
      if (!res.ok) {
        sounds.playBuyError();
        return;
      }
      this.player.armor = 100;
      sounds.playBuy();
    } else if (item.type === 'kit') {
      if (this.playerTeam !== 'CT' || this.player.hasDefuseKit) {
        sounds.playBuyError();
        return;
      }
      const res = purchaseItem(this.economy, item.price);
      if (!res.ok) {
        sounds.playBuyError();
        return;
      }
      this.player.hasDefuseKit = true;
      sounds.playBuy();
    } else {
      const currentCount = this.weapons.grenades[item.id] || 0;
      if (currentCount >= item.maxCarry) {
        sounds.playBuyError();
        return;
      }
      const res = purchaseItem(this.economy, item.price);
      if (!res.ok) {
        sounds.playBuyError();
        return;
      }
      this.weapons.addGrenade(item.id, item.maxCarry);
      sounds.playBuy();
    }

    this._refreshArsenalMenu();
  }

  _toggleArsenal(forceState = null) {
    if (!this.isGameRunning) return;
    const nextOpen = forceState !== null ? forceState : !this.hud.isArsenalOpen;

    if (nextOpen) {
      this.player.isShooting = false;
      this.weapons.resetScope();
      this._refreshArsenalMenu();
      this.hud.setArsenalOpen(true);
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock();
      }
    } else {
      this.hud.setArsenalOpen(false);
      this.renderer.domElement.requestPointerLock();
    }
  }

  _throwActiveGrenade(isUnderhand = false) {
    const curW = this.weapons.currentWeapon;
    if (!curW.isGrenade) return;

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.camera.position.clone()
      .addScaledVector(dir, 0.55)
      .add(new THREE.Vector3(0, -0.1, 0));

    const type = this.weapons.consumeActiveGrenade();
    if (!type) return;

    this.grenades.throwGrenade(type, origin, dir, this.player.velocity, isUnderhand);
  }

  _handleDropWeapon() {
    if (!this.player.isAlive || this.hud.isArsenalOpen) return;
    const dropped = this.weapons.dropActiveWeapon();
    if (!dropped) return;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const origin = this.camera.position.clone()
      .addScaledVector(forward, 0.6)
      .add(new THREE.Vector3(0, -0.35, 0));

    this.droppedWeapons.dropWeapon(
      dropped.spec,
      dropped.currentAmmo,
      dropped.reserveAmmo,
      origin,
      forward
    );
    sounds.playWeaponSwitch();
  }

  _handlePickupInteract() {
    if (!this.player.isAlive || this.hud.isArsenalOpen) return;
    const target = this.droppedWeapons.findInteractTarget(this.player.camera.position, this.camera);
    if (!target) return;

    const slot = target.weaponSpec.slot;
    const existingId = this.weapons.slots[slot];

    if (existingId && this.weapons.weapons[existingId]) {
      const existingState = this.weapons.weapons[existingId];
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const origin = this.camera.position.clone()
        .addScaledVector(forward, 0.5)
        .add(new THREE.Vector3(0, -0.35, 0));

      this.droppedWeapons.dropWeapon(
        WEAPONS[existingId],
        existingState.currentAmmo,
        existingState.reserveAmmo,
        origin,
        forward
      );
    }

    this.weapons.pickupWeapon(target.weaponId, target.currentAmmo, target.reserveAmmo, true);
    this.droppedWeapons.removeDropped(target);
    sounds.playPickup();
  }

  _setupEvents() {
    window.addEventListener('resize', () => {
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.viewmodelCamera.aspect = aspect;
      this.viewmodelCamera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button !== 2 || !this.isGameRunning || !this.player.isLocked || !this.player.isAlive || this.hud.isArsenalOpen) {
        return;
      }
      if (this.player.isFrozen) return;
      const curW = this.weapons.currentWeapon;
      if (curW.isGrenade) {
        this._throwActiveGrenade(true);
      } else if (curW.isMelee) {
        this._handleMeleeAttack(true);
      } else if (curW.isSniper) {
        this.weapons.cycleScope();
      } else if (curW.hasBurstMode) {
        this.weapons.toggleFireMode();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isGameRunning) return;

      if (e.code === 'KeyB') {
        this._toggleArsenal();
        return;
      }
      if (e.code === 'Escape' && this.hud.isArsenalOpen) {
        this.hud.setArsenalOpen(false);
        return;
      }
      if (this.hud.isArsenalOpen) return;

      if (e.code === 'Digit1') {
        this.weapons.switchSlot(1);
      } else if (e.code === 'Digit2') {
        this.weapons.switchSlot(2);
      } else if (e.code === 'Digit3') {
        this.weapons.switchSlot(3);
      } else if (e.code === 'Digit4') {
        this.weapons.switchSlot(4);
      } else if (e.code === 'Digit5') {
        this.weapons.switchSlot(5);
      } else if (e.code === 'KeyQ') {
        this.weapons.quickSwitch();
      } else if (e.code === 'KeyR') {
        this.weapons.reload();
      } else if (e.code === 'KeyG') {
        this._handleDropWeapon();
      } else if (e.code === 'KeyE') {
        this._handlePickupInteract();
      }
    });

    window.addEventListener('wheel', (e) => {
      if (!this.isGameRunning || this.hud.isArsenalOpen) return;
      this.weapons.cycleSlot(e.deltaY > 0 ? 1 : -1);
    });
  }

  _setupUIEvents() {
    const startScreen = document.getElementById('start-screen');
    const btnStart = document.getElementById('btn-start');
    const btnCloseArsenal = document.getElementById('btn-close-arsenal');

    const mapBtns = document.querySelectorAll('#map-selector .setup-option-btn');
    mapBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        mapBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const mapId = btn.getAttribute('data-map') || 'dust2';
        this._initializeMatch(mapId, this.playerTeam);
      });
    });

    const teamBtns = document.querySelectorAll('#team-selector .setup-option-btn');
    teamBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        teamBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const team = btn.getAttribute('data-team') || 'CT';
        this._initializeMatch(this.selectedMapId, team);
      });
    });

    btnStart.addEventListener('click', () => {
      sounds.init();
      sounds.resume();
      this.renderer.domElement.requestPointerLock();
      startScreen.style.display = 'none';
      this.isGameRunning = true;
    });

    if (btnCloseArsenal) {
      btnCloseArsenal.addEventListener('click', () => {
        this._toggleArsenal(false);
      });
    }

    this.renderer.domElement.addEventListener('click', () => {
      if (this.isGameRunning && !this.player.isLocked && !this.hud.isArsenalOpen) {
        this.renderer.domElement.requestPointerLock();
      }
    });
  }

  _onEnemyBotKilled(bot, weaponSpec, weaponLabel, isHeadshot) {
    this.player.kills++;
    const enemyTeam = this.playerTeam === 'CT' ? 'T' : 'CT';
    if (this.roundManager.mode === 'deathmatch') {
      if (this.playerTeam === 'CT') this.scoreCT++;
      else this.scoreT++;
    }
    this.hud.addKillfeedEntry('Player', weaponLabel, bot.name, isHeadshot, this.playerTeam, enemyTeam);
    awardKill(this.economy, weaponSpec, isHeadshot);

    const botWeapon = WEAPONS[bot.weaponId];
    if (botWeapon) {
      const dropOrigin = bot.group.position.clone().add(new THREE.Vector3(0, 0.9, 0));
      const dropDir = bot.getForwardVector();
      const magAmmo = Math.max(1, Math.floor(botWeapon.magSize * 0.7));
      this.droppedWeapons.dropWeapon(botWeapon, magAmmo, botWeapon.maxReserve, dropOrigin, dropDir);
    }
  }

  _getWorldNormal(hit) {
    if (!hit.face) return new THREE.Vector3(0, 1, 0);
    if (hit.object.isInstancedMesh && hit.instanceId !== undefined) {
      hit.object.getMatrixAt(hit.instanceId, _TMP_INST_MAT);
      _TMP_NORMAL_MAT.getNormalMatrix(_TMP_INST_MAT);
      return hit.face.normal.clone().applyMatrix3(_TMP_NORMAL_MAT).normalize();
    }
    return hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
  }

  _handleMeleeAttack(isAlt) {
    const melee = this.weapons.tryMelee(isAlt);
    if (!melee) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    raycaster.far = melee.range;

    const allBotHitboxes = [];
    this.bots.forEach((b) => {
      if (b.isAlive) allBotHitboxes.push(...b.hitboxes);
    });

    const botHits = raycaster.intersectObjects(allBotHitboxes, false);
    const worldHits = raycaster.intersectObjects(this.map.raycastMeshes, false);

    const closestBot = botHits.length > 0 ? botHits[0] : null;
    const closestWorld = worldHits.length > 0 ? worldHits[0] : null;

    if (closestBot && (!closestWorld || closestBot.distance <= closestWorld.distance)) {
      const bot = closestBot.object.userData.bot;
      if (bot.team === this.playerTeam) {
        sounds.playHitmarker();
        return;
      }

      const backstab = isAlt && isBackstab(this.camera.position, bot.group.position, bot.getForwardVector());
      const finalDamage = backstab ? melee.backstabDamage : melee.damage;

      sounds.playKnifeHit(isAlt, true);
      this.hud.showHitmarker(backstab);

      const normal = closestBot.face ? closestBot.face.normal : new THREE.Vector3(0, 1, 0);
      this.particles.createBlood(closestBot.point, normal);

      const wasKilled = bot.takeDamage(finalDamage, backstab, 0);
      if (wasKilled) {
        this._onEnemyBotKilled(bot, WEAPONS.knife, melee.weaponName, backstab);
      }
    } else if (closestWorld) {
      sounds.playKnifeHit(isAlt, false);
      const normal = this._getWorldNormal(closestWorld);
      this.particles.createSparks(closestWorld.point, normal);
      this.decals.addBulletHole(closestWorld.point, normal);
    }
  }

  _processBulletRay(shotInfo, offsetX, offsetY) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(offsetX, offsetY), this.camera);

    const allBotHitboxes = [];
    this.bots.forEach((b) => {
      if (b.isAlive) allBotHitboxes.push(...b.hitboxes);
    });

    const botIntersects = raycaster.intersectObjects(allBotHitboxes, false);
    const worldIntersects = raycaster.intersectObjects(this.map.raycastMeshes, false);

    const hits = [];
    for (const h of botIntersects) {
      hits.push({ kind: 'bot', hit: h, distance: h.distance });
    }
    for (const h of worldIntersects) {
      hits.push({ kind: 'world', hit: h, distance: h.distance });
    }
    hits.sort((a, b) => a.distance - b.distance);

    let penetrationScale = 1.0;
    const hitBots = new Set();
    let finalHitPoint = null;

    for (const entry of hits) {
      const { kind, hit } = entry;

      if (kind === 'world') {
        finalHitPoint = hit.point;
        const normal = this._getWorldNormal(hit);

        this.particles.createSparks(hit.point, normal);
        this.decals.addBulletHole(hit.point, normal);

        const surfacePen = classifySurfacePenetration(hit.object);
        if (surfacePen <= 0 || !shotInfo.wallbang) {
          break;
        }
        penetrationScale *= surfacePen * shotInfo.wallbang;
        if (penetrationScale < 0.12) {
          break;
        }
      } else {
        const hitData = hit.object.userData;
        const bot = hitData.bot;
        if (hitBots.has(bot.id)) continue;
        hitBots.add(bot.id);

        finalHitPoint = hit.point;

        if (bot.team === this.playerTeam) {
          sounds.playHitmarker();
          break;
        }

        const isHeadshot = hitData.part === 'head';
        const { healthDamage, armorDamage } = computeBulletDamage({
          baseDamage: shotInfo.damage,
          distance: hit.distance,
          rangeModifier: shotInfo.rangeModifier,
          isHeadshot,
          headshotMultiplier: shotInfo.headshotMultiplier,
          armor: bot.armor,
          armorRatio: shotInfo.armorRatio,
          hasHelmet: bot.hasHelmet,
          penetrationScale
        });

        if (isHeadshot) {
          sounds.playHeadshot();
          this.hud.showHitmarker(true);
        } else {
          sounds.playHitmarker();
          this.hud.showHitmarker(false);
        }

        const normal = hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0);
        this.particles.createBlood(hit.point, normal);

        const wasKilled = bot.takeDamage(healthDamage, isHeadshot, armorDamage);
        if (wasKilled) {
          this._onEnemyBotKilled(bot, shotInfo.weapon, shotInfo.weaponName, isHeadshot);
        }

        penetrationScale *= 0.55 * (shotInfo.wallbang || 0.4);
        if (penetrationScale < 0.15) {
          break;
        }
      }
    }

    if (!finalHitPoint) {
      finalHitPoint = raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 100);
    }

    if (!shotInfo.noTracers) {
      this.particles.createTracer(shotInfo.muzzlePos, finalHitPoint);
    }
  }

  _fireShotInfo(shotInfo) {
    if (!shotInfo) return;

    this.player.addViewpunch(shotInfo.viewpunchPitch, shotInfo.viewpunchYaw);

    if (shotInfo.pellets > 1) {
      const pelletOffsets = generatePelletOffsets(shotInfo.pellets, shotInfo.pelletSpread);
      for (const off of pelletOffsets) {
        this._processBulletRay(
          shotInfo,
          shotInfo.sprayOffset.x + off.x,
          shotInfo.sprayOffset.y + off.y
        );
      }
    } else {
      this._processBulletRay(shotInfo, shotInfo.sprayOffset.x, shotInfo.sprayOffset.y);
    }
  }

  _handlePlayerShooting() {
    if (!this.player.isShooting || !this.player.isAlive || this.hud.isArsenalOpen || this.player.isFrozen) return;

    const curW = this.weapons.currentWeapon;
    if (curW.isC4) return;

    if (curW.isGrenade) {
      this.player.isShooting = false;
      this._throwActiveGrenade(false);
      return;
    }

    if (curW.isMelee) {
      this._handleMeleeAttack(false);
      return;
    }

    if (!this.weapons.canShoot()) return;

    if (!curW.isAutomatic || curW.fireMode === 'burst' || curW.currentAmmo <= 0) {
      this.player.isShooting = false;
    }

    const horizontalSpeed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    const inAir = !this.player.isGrounded;

    const shotInfo = this.weapons.shoot(horizontalSpeed, this.player.isCrouching, inAir);
    this._fireShotInfo(shotInfo);
  }

  _updatePlayerObjective(fixedDt) {
    this.objectivePrompt = null;
    this.actionProgress = null;

    if (this.roundManager.mode !== 'bomb_defusal' || !this.player.isAlive || this.hud.isArsenalOpen) {
      this.playerPlantProgress = 0;
      this.playerDefuseProgress = 0;
      this.isPlayerDefusing = false;
      return;
    }

    const px = this.player.camera.position.x;
    const py = this.player.camera.position.y - this.player.currentHeight;
    const pz = this.player.camera.position.z;

    // 1. T Player Planting C4
    if (
      this.playerTeam === 'T' &&
      this.weapons.hasC4 &&
      this.roundManager.phase === ROUND_PHASES.LIVE
    ) {
      const siteHere = this.map.getBombsiteAt(px, pz);
      if (siteHere) {
        this.objectivePrompt = `Segure [E] ou [CLICK ESQ] (Slot 5 C4) para plantar no Site ${siteHere}`;
        const holdingPlant = this.player.keys.use || (this.player.isShooting && this.weapons.currentWeapon.isC4);
        if (holdingPlant) {
          this.playerPlantProgress += fixedDt;
          this.actionProgress = {
            label: `PLANTANDO C4 NO SITE ${siteHere}...`,
            progress: this.playerPlantProgress / this.roundManager.plantDuration
          };
          if (this.playerPlantProgress >= this.roundManager.plantDuration) {
            const gy = this.map.getGroundHeight(px, pz);
            this._onBombPlanted(siteHere, { x: px, y: gy, z: pz }, 'Player');
            this.weapons.setHasC4(false);
            this.playerPlantProgress = 0;
            this.actionProgress = null;
          }
        } else {
          this.playerPlantProgress = 0;
        }
        return;
      }
      this.playerPlantProgress = 0;
    }

    // 2. CT Player Defusing C4
    if (
      this.playerTeam === 'CT' &&
      this.roundManager.phase === ROUND_PHASES.BOMB_PLANTED &&
      this.roundManager.bombPosition
    ) {
      const bPos = this.roundManager.bombPosition;
      const dist = Math.hypot(px - bPos.x, pz - bPos.z);
      const dy = Math.abs(py - bPos.y);
      if (dist < 2.5 && dy < 1.8) {
        const needed = this.roundManager.getDefuseDuration(this.player.hasDefuseKit);
        this.objectivePrompt = `Segure [E] para defusar a C4 (${needed.toFixed(1)}s${this.player.hasDefuseKit ? ' com Kit' : ''})`;
        if (this.player.keys.use) {
          if (!this.isPlayerDefusing) {
            this.isPlayerDefusing = true;
            sounds.playC4DefuseStart();
          }
          this.playerDefuseProgress += fixedDt;
          this.actionProgress = {
            label: `DESARMANDO C4${this.player.hasDefuseKit ? ' (KIT)' : ''}...`,
            progress: this.playerDefuseProgress / needed
          };
          if (this.playerDefuseProgress >= needed) {
            this._onBombDefused('Player');
            this.playerDefuseProgress = 0;
            this.isPlayerDefusing = false;
            this.actionProgress = null;
          }
        } else {
          this.playerDefuseProgress = 0;
          this.isPlayerDefusing = false;
        }
        return;
      }
      this.playerDefuseProgress = 0;
      this.isPlayerDefusing = false;
    }
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      const rawDelta = this.clock.getDelta();
      const frameDelta = Math.min(rawDelta, 0.1);
      if (this.isGameRunning) {
        this.elapsedTime += frameDelta;

        const targetFov = this.weapons.getScopeFov();
        if (Math.abs(this.camera.fov - targetFov) > 0.05) {
          this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, frameDelta * 18));
          this.camera.updateProjectionMatrix();
        }
        const sensitivityScale = this.camera.fov / 75;
        const weaponMoveSpeed = this.weapons.getActiveMoveSpeed();

        this.fixedStepper.advance(rawDelta, (fixedDt) => {
          this.player.isFrozen = (
            this.roundManager.mode === 'bomb_defusal' &&
            this.roundManager.phase === ROUND_PHASES.FREEZETIME
          );
          this.player.update(fixedDt, weaponMoveSpeed, sensitivityScale);

          if (!this.wasPlayerAlive && this.player.isAlive) {
            applyRespawnFloor(this.economy);
          }
          this.wasPlayerAlive = this.player.isAlive;

          if (!this.player.isAlive) {
            if (this.weapons.scopeLevel > 0) {
              this.weapons.resetScope();
            }
            this.weapons.burstRemaining = 0;
            this.flashTimer = 0;
            this.flashPeakIntensity = 0;
            this.flashIntensity = 0;
          }
          this._handlePlayerShooting();
          this._updatePlayerObjective(fixedDt);

          const isMoving = this.player.velocity.lengthSq() > 0.1;
          this.weapons.update(
            fixedDt,
            this.player.velocity,
            isMoving,
            this.player.isCrouching,
            !this.player.isGrounded,
            (burstShotInfo) => this._fireShotInfo(burstShotInfo)
          );

          this.grenades.update(fixedDt, this.player, this.bots, {
            playerTeam: this.playerTeam,
            onPlayerFlash: (intensity, duration) => {
              if (intensity > this.flashIntensity || this.flashTimer <= 0) {
                this.flashPeakIntensity = intensity;
                this.flashIntensity = intensity;
                this.flashTimer = duration;
                this.flashMaxDuration = Math.max(0.2, duration);
              }
            },
            onBotKilledByGrenade: (bot, weaponLabel) => {
              this._onEnemyBotKilled(bot, { id: 'he', category: 'grenade' }, weaponLabel, false);
            }
          });

          this.droppedWeapons.update(fixedDt, this.player.camera.position);
          if (this.player.isAlive) {
            const emptySlots = [1, 2].filter((s) => !this.weapons.slots[s]);
            if (emptySlots.length > 0) {
              const autoItem = this.droppedWeapons.findAutoPickup(this.player.camera.position, emptySlots);
              if (autoItem) {
                this.weapons.pickupWeapon(autoItem.weaponId, autoItem.currentAmmo, autoItem.reserveAmmo, false);
                this.droppedWeapons.removeDropped(autoItem);
                sounds.playPickup();
              }
            }
          }

          // Determine closest CT bot to planted C4 for defusal assignment
          let closestCtBotId = null;
          if (this.roundManager.bombPlanted && this.roundManager.bombPosition) {
            let bestDist = Infinity;
            const bp = this.roundManager.bombPosition;
            for (const b of this.bots) {
              if (b.isAlive && b.team === 'CT') {
                const d = Math.hypot(b.group.position.x - bp.x, b.group.position.z - bp.z);
                if (d < bestDist) {
                  bestDist = d;
                  closestCtBotId = b.id;
                }
              }
            }
          }

          const roundContextBase = {
            mode: this.roundManager.mode,
            phase: this.roundManager.phase,
            bombPlanted: this.roundManager.bombPlanted,
            bombSite: this.roundManager.bombSite,
            bombPosition: this.roundManager.bombPosition,
            playerTeam: this.playerTeam,
            onBotPlantBomb: (site, pos, bot) => this._onBombPlanted(site, pos, bot.name),
            onBotDefuseBomb: (bot) => this._onBombDefused(bot.name)
          };

          this.bots.forEach((bot) => {
            bot.update(
              fixedDt,
              this.player,
              this.bots,
              this.particles,
              (killer, weapon, victim, isHS, killerTeam, victimTeam) => {
                if (this.roundManager.mode === 'deathmatch') {
                  if (killerTeam === 'CT') this.scoreCT++;
                  else this.scoreT++;
                }
                this.hud.addKillfeedEntry(killer, weapon, victim, isHS, killerTeam, victimTeam);
              },
              this.grenades,
              {
                ...roundContextBase,
                isDefuser: bot.id === closestCtBotId
              }
            );
          });

          // Advance RoundManager state machine
          let aliveCT = this.playerTeam === 'CT' && this.player.isAlive ? 1 : 0;
          let aliveT = this.playerTeam === 'T' && this.player.isAlive ? 1 : 0;
          for (const b of this.bots) {
            if (!b.isAlive) continue;
            if (b.team === 'CT') aliveCT++;
            else aliveT++;
          }

          const roundEvents = this.roundManager.update(fixedDt, { aliveCT, aliveT });
          for (const ev of roundEvents) {
            if (ev.type === 'c4_beep') {
              sounds.playC4Beep(ev.urgency);
              if (this.plantedC4LedMat) {
                this.plantedC4LedMat.emissiveIntensity = 4.0;
                this.c4LedBlinkTimer = 0.08;
              }
            } else if (ev.type === 'c4_explode') {
              sounds.playExplosion();
              this._spawnC4Explosion(ev.pos);
              this._removePlantedC4();
            } else if (ev.type === 'round_end') {
              this._applyRoundEndEvent(ev);
            } else if (ev.type === 'new_round') {
              this._startRoundSetup(false);
            }
          }
        });

        // Smooth visual effects & HUD at render frame rate
        if (this.c4LedBlinkTimer > 0) {
          this.c4LedBlinkTimer = Math.max(0, this.c4LedBlinkTimer - frameDelta);
          if (this.c4LedBlinkTimer <= 0 && this.plantedC4LedMat) {
            this.plantedC4LedMat.emissiveIntensity = 0.25;
          }
        }

        for (let i = this.c4ExplosionEffects.length - 1; i >= 0; i--) {
          const fx = this.c4ExplosionEffects[i];
          fx.life -= frameDelta;
          if (fx.life <= 0) {
            this.scene.remove(fx.mesh);
            fx.geo.dispose();
            fx.mat.dispose();
            this.c4ExplosionEffects.splice(i, 1);
          } else {
            const p = 1 - fx.life / fx.maxLife;
            fx.mesh.scale.setScalar(0.6 + p * 16.0);
            fx.mat.opacity = (1 - p) * 0.9;
          }
        }

        if (this.flashTimer > 0) {
          this.flashTimer = Math.max(0, this.flashTimer - frameDelta);
          const ratio = this.flashTimer / this.flashMaxDuration;
          this.flashIntensity = Math.pow(ratio, 0.75) * this.flashPeakIntensity;
          if (this.flashTimer <= 0) {
            this.flashIntensity = 0;
            this.flashPeakIntensity = 0;
          }
        }

        this.particles.update(frameDelta);

        const pickupTarget = this.player.isAlive
          ? this.droppedWeapons.findInteractTarget(this.player.camera.position, this.camera)
          : null;
        const zoneName = this.map.getZoneName(this.player.camera.position.x, this.player.camera.position.z);

        this.hud.update(frameDelta, this.player, this.weapons, this.elapsedTime, this.scoreCT, this.scoreT, {
          economy: this.economy,
          flashIntensity: this.flashIntensity,
          pickupTarget,
          zoneName,
          roundManager: this.roundManager,
          playerTeam: this.playerTeam,
          objectivePrompt: this.objectivePrompt,
          actionProgress: this.actionProgress
        });
      }

      // 2-Pass Anti-Clipping Render: World first, clear depth, Viewmodel on top
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
      this.renderer.clearDepth();
      this.renderer.render(this.viewmodelScene, this.viewmodelCamera);
    });
  }
}

// Instantiate and launch game
const game = new Game();
game.start();
