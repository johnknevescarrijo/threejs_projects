import * as THREE from 'three';
import { sounds } from './audio/soundManager.js';
import { DustMap } from './world/map.js';
import { ParticleSystem } from './world/particles.js';
import { DecalManager } from './world/decals.js';
import { WeaponManager } from './entities/weapon.js';
import { Player } from './entities/player.js';
import { Bot } from './entities/bot.js';
import { GrenadeManager } from './entities/grenades.js';
import { DroppedWeaponManager } from './entities/droppedWeapons.js';
import { HUD } from './ui/hud.js';
import { WEAPONS } from './config/weapons.js';
import {
  computeBulletDamage,
  generatePelletOffsets,
  classifySurfacePenetration,
  isBackstab
} from './combat/ballistics.js';
import {
  UTILITY_ITEMS,
  createEconomyState,
  awardKill,
  applyRespawnFloor,
  purchaseItem
} from './combat/tactical.js';

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

    // 2. Systems
    this.map = new DustMap(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.decals = new DecalManager(this.scene);
    this.weapons = new WeaponManager(this.camera, this.viewmodelCamera, this.particles, this.decals);
    this.player = new Player(this.camera, this.renderer.domElement, this.map);
    this.grenades = new GrenadeManager(this.scene, this.map);
    this.droppedWeapons = new DroppedWeaponManager(this.scene, this.map);
    this.hud = new HUD();

    // 3. Economy, Flash & Match State
    this.economy = createEconomyState(false);
    this.flashIntensity = 0;
    this.flashPeakIntensity = 0;
    this.flashTimer = 0;
    this.flashMaxDuration = 1;
    this.wasPlayerAlive = true;

    // 4. Bots & Teams
    this.bots = [];
    this.scoreCT = 0;
    this.scoreT = 0;
    this._spawnBots();

    // 5. Timing & State
    this.clock = new THREE.Clock();
    this.elapsedTime = 0;
    this.isGameRunning = false;

    this._setupEvents();
    this._setupUIEvents();
  }

  _spawnBots() {
    const botConfigs = [
      // CT Team (Friendly allies)
      { pos: new THREE.Vector3(-10, 0, -20), name: 'CT_Alpha', team: 'CT' },
      { pos: new THREE.Vector3(6, 0, -22), name: 'CT_Bravo', team: 'CT' },
      // Terrorist Team (Enemies)
      { pos: new THREE.Vector3(18, 1.2, 18), name: 'T_Phoenix', team: 'T' },
      { pos: new THREE.Vector3(-16, 0, 12), name: 'T_Leet', team: 'T' },
      { pos: new THREE.Vector3(4, 0, 10), name: 'T_Balkan', team: 'T' }
    ];

    botConfigs.forEach((cfg, index) => {
      const bot = new Bot(index + 1, this.scene, this.map, cfg.pos, cfg.name, cfg.team);
      this.bots.push(bot);
    });
  }

  _refreshArsenalMenu() {
    this.hud.renderArsenalMenu(this.weapons, this.economy, this.player.armor, {
      onSelectWeapon: (weaponId) => this._handleBuyWeapon(weaponId),
      onBuyUtility: (utilityId) => this._handleBuyUtility(utilityId),
      onToggleSandbox: () => {
        this.economy.sandboxFree = !this.economy.sandboxFree;
        sounds.playWeaponSwitch();
        this._refreshArsenalMenu();
      }
    });
  }

  _handleBuyWeapon(weaponId) {
    const w = WEAPONS[weaponId];
    if (!w) return;

    // If already equipped in that slot, just switch to it without charging again
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

    // Drop previously held weapon from that slot on the floor
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

    // If holding a weapon in that slot, drop it on the ground first
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
    // Window resize for both world & viewmodel cameras
    window.addEventListener('resize', () => {
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.viewmodelCamera.aspect = aspect;
      this.viewmodelCamera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Prevent browser context menu on right-click (scope / burst / knife stab / underhand throw)
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Right mouse button actions
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 2 || !this.isGameRunning || !this.player.isLocked || !this.player.isAlive || this.hud.isArsenalOpen) {
        return;
      }
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

    // Weapon hotkeys, grenades, drop, pickup, quick-switch, reload & Buy Menu
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

    // Mouse scroll cycles available slots
    window.addEventListener('wheel', (e) => {
      if (!this.isGameRunning || this.hud.isArsenalOpen) return;
      this.weapons.cycleSlot(e.deltaY > 0 ? 1 : -1);
    });
  }

  _setupUIEvents() {
    const startScreen = document.getElementById('start-screen');
    const btnStart = document.getElementById('btn-start');
    const btnCloseArsenal = document.getElementById('btn-close-arsenal');

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

    // Resume pointer lock on canvas click when Arsenal is closed
    this.renderer.domElement.addEventListener('click', () => {
      if (this.isGameRunning && !this.player.isLocked && !this.hud.isArsenalOpen) {
        this.renderer.domElement.requestPointerLock();
      }
    });
  }

  _onEnemyBotKilled(bot, weaponSpec, weaponLabel, isHeadshot) {
    this.player.kills++;
    this.scoreCT++;
    this.hud.addKillfeedEntry('Player', weaponLabel, bot.name, isHeadshot, 'CT', 'T');
    awardKill(this.economy, weaponSpec, isHeadshot);

    // Drop dead bot's weapon on the ground
    const botWeapon = WEAPONS[bot.weaponId];
    if (botWeapon) {
      const dropOrigin = bot.group.position.clone().add(new THREE.Vector3(0, 0.9, 0));
      const dropDir = bot.getForwardVector();
      const magAmmo = Math.max(1, Math.floor(botWeapon.magSize * 0.7));
      this.droppedWeapons.dropWeapon(botWeapon, magAmmo, botWeapon.maxReserve, dropOrigin, dropDir);
    }
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
      if (bot.team === 'CT') {
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
      const normal = closestWorld.face
        ? closestWorld.face.normal.clone().transformDirection(closestWorld.object.matrixWorld)
        : new THREE.Vector3(0, 1, 0);
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
        const normal = hit.face
          ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
          : new THREE.Vector3(0, 1, 0);

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

        if (bot.team === 'CT') {
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
    if (!this.player.isShooting || !this.player.isAlive || this.hud.isArsenalOpen) return;

    const curW = this.weapons.currentWeapon;

    // Throw grenade on LMB without firing previous gun
    if (curW.isGrenade) {
      this.player.isShooting = false;
      this._throwActiveGrenade(false);
      return;
    }

    // Melee primary slash
    if (curW.isMelee) {
      this._handleMeleeAttack(false);
      return;
    }

    if (!this.weapons.canShoot()) return;

    // Semi-auto, burst, or empty mag (avoid dry-fire spam) trigger once per click
    if (!curW.isAutomatic || curW.fireMode === 'burst' || curW.currentAmmo <= 0) {
      this.player.isShooting = false;
    }

    const horizontalSpeed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    const inAir = !this.player.isGrounded;

    const shotInfo = this.weapons.shoot(horizontalSpeed, this.player.isCrouching, inAir);
    this._fireShotInfo(shotInfo);
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      const delta = Math.min(this.clock.getDelta(), 0.1);
      if (this.isGameRunning) {
        this.elapsedTime += delta;

        // 1. Update Scope FOV & Mouse Sensitivity scaling
        const targetFov = this.weapons.getScopeFov();
        if (Math.abs(this.camera.fov - targetFov) > 0.05) {
          this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, delta * 18));
          this.camera.updateProjectionMatrix();
        }
        const sensitivityScale = this.camera.fov / 75;
        const weaponMoveSpeed = this.weapons.getActiveMoveSpeed();

        // 2. Update Player, Respawn Economy Floor, Death Cleanup & Shooting
        this.player.update(delta, weaponMoveSpeed, sensitivityScale);

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

        // 3. Update Weapons & Burst Follow-Up Shots
        const isMoving = this.player.velocity.lengthSq() > 0.1;
        this.weapons.update(
          delta,
          this.player.velocity,
          isMoving,
          this.player.isCrouching,
          !this.player.isGrounded,
          (burstShotInfo) => this._fireShotInfo(burstShotInfo)
        );

        // 4. Update Grenades (HE, Flashbang, Smoke)
        this.grenades.update(delta, this.player, this.bots, {
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

        // Decay player Flashbang whiteout smoothly with real delta
        if (this.flashTimer > 0) {
          this.flashTimer = Math.max(0, this.flashTimer - delta);
          const ratio = this.flashTimer / this.flashMaxDuration;
          this.flashIntensity = Math.pow(ratio, 0.75) * this.flashPeakIntensity;
          if (this.flashTimer <= 0) {
            this.flashIntensity = 0;
            this.flashPeakIntensity = 0;
          }
        }

        // 5. Update Dropped Weapons, Auto-Pickup & [E] Prompt
        this.droppedWeapons.update(delta, this.player.camera.position);
        let pickupTarget = null;
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
          pickupTarget = this.droppedWeapons.findInteractTarget(this.player.camera.position, this.camera);
        }

        // 6. Update Bots (with Smoke & Flashbang support)
        this.bots.forEach((bot) => {
          bot.update(
            delta,
            this.player,
            this.bots,
            this.particles,
            (killer, weapon, victim, isHS, killerTeam, victimTeam) => {
              if (killerTeam === 'CT') {
                this.scoreCT++;
              } else {
                this.scoreT++;
              }
              this.hud.addKillfeedEntry(killer, weapon, victim, isHS, killerTeam, victimTeam);
            },
            this.grenades
          );
        });

        // 7. Update Particle Systems
        this.particles.update(delta);

        // 8. Update HUD with economy, flash & pickup prompt
        this.hud.update(delta, this.player, this.weapons, this.elapsedTime, this.scoreCT, this.scoreT, {
          economy: this.economy,
          flashIntensity: this.flashIntensity,
          pickupTarget
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
