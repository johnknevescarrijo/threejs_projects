import { Camera } from './Camera';
import { InputManager } from './InputManager';
import { MapRenderer } from '../map/MapRenderer';
import { ARENA_PLATFORMS, INITIAL_BARRELS, INITIAL_PEDESTALS, MAP_HEIGHT, MAP_WIDTH, SPAWN_POINTS } from '../map/MapData';
import { ParticleSystem } from '../effects/ParticleSystem';
import { FloatingTextManager } from '../effects/FloatingText';
import { Player } from '../entities/Player';
import { Bot, BOT_PRESETS } from '../entities/Bot';
import { Projectile } from '../entities/Projectile';
import { Grenade } from '../entities/Grenade';
import { ExplosiveBarrel } from '../entities/ExplosiveBarrel';
import { ItemPickupManager } from '../entities/ItemPickup';
import { soundManager } from '../audio/SoundManager';
import { ControlSettings, KillEvent, PlayerCustomization, PlayerStats, WeaponType } from '../types';
import confetti from 'canvas-confetti';

export type GameState = 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'RESPAWNING' | 'ENDED';

export interface MatchResults {
  isVictory: boolean;
  winnerName: string;
  playerStats: PlayerStats;
  allStats: PlayerStats[];
  matchDuration: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private lastTime = 0;

  // Systems
  public camera: Camera;
  public input: InputManager;
  public mapRenderer: MapRenderer;
  public particleSystem: ParticleSystem;
  public textManager: FloatingTextManager;
  public itemManager: ItemPickupManager;

  // Entities
  public player: Player;
  public bots: Bot[] = [];
  public projectiles: Projectile[] = [];
  public grenades: Grenade[] = [];
  public barrels: ExplosiveBarrel[] = [];

  // Match State
  public state: GameState = 'MENU';
  public matchTimeRemaining = 300; // 5 minutes
  public maxKillsToWin = 15;
  public countdownTimer = 3.5;
  public playerRespawnTimer = 0;
  public killerName = '';

  // Stats & Events
  public stats: Map<string, PlayerStats> = new Map();
  public killFeed: KillEvent[] = [];
  public settings: ControlSettings = {
    soundVolume: 0.8,
    sfxVolume: 0.8,
    screenShake: true,
    showHitNumbers: true,
    botDifficulty: 'normal'
  };

  // UI Event Callbacks
  public onStateChange?: (state: GameState) => void;
  public onKillFeedUpdate?: (feed: KillEvent[]) => void;
  public onStatsUpdate?: (stats: PlayerStats[]) => void;
  public onMatchEnd?: (results: MatchResults) => void;
  public onAnnouncement?: (title: string, sub: string) => void;

  constructor(canvas: HTMLCanvasElement, settings?: ControlSettings) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;

    if (settings) this.settings = { ...this.settings, ...settings };

    this.camera = new Camera(canvas.width, canvas.height);
    this.input = new InputManager();
    this.mapRenderer = new MapRenderer();
    this.particleSystem = new ParticleSystem();
    this.textManager = new FloatingTextManager();
    this.itemManager = new ItemPickupManager(INITIAL_PEDESTALS);

    // Default Player
    this.player = new Player(SPAWN_POINTS[0].x, SPAWN_POINTS[0].y);

    this.loop = this.loop.bind(this);
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  public handleResize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.resize(this.canvas.width, this.canvas.height);
  }

  public startMatch(customization: PlayerCustomization, settings: ControlSettings) {
    soundManager.init();
    soundManager.resume();
    this.settings = settings;
    soundManager.setVolumes(settings.soundVolume, settings.sfxVolume);

    // Reset Match Data
    this.matchTimeRemaining = 300;
    this.countdownTimer = 3.5;
    this.projectiles = [];
    this.grenades = [];
    this.particleSystem.clear();
    this.textManager.clear();
    this.killFeed = [];
    this.itemManager = new ItemPickupManager(INITIAL_PEDESTALS);

    // Initialize Barrels
    this.barrels = INITIAL_BARRELS.map(b => new ExplosiveBarrel(b.id, b.x, b.y, b.health));

    // Spawn Player
    const playerSpawn = SPAWN_POINTS[0];
    this.player = new Player(playerSpawn.x, playerSpawn.y, customization);
    this.player.invulnerableTimer = 2.0;

    // Spawn 5 Bots
    this.bots = BOT_PRESETS.map((preset, idx) => {
      const spawn = SPAWN_POINTS[(idx + 1) % SPAWN_POINTS.length];
      const bot = new Bot(`bot-${idx}`, spawn.x, spawn.y, preset);
      bot.invulnerableTimer = 2.0;
      return bot;
    });

    // Initialize Stats
    this.stats.clear();
    this.stats.set(this.player.id, {
      id: this.player.id,
      name: this.player.name,
      isBot: false,
      color: '#38bdf8',
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      shotsFired: 0,
      shotsHit: 0,
      bestStreak: 0,
      currentStreak: 0
    });

    for (const bot of this.bots) {
      this.stats.set(bot.id, {
        id: bot.id,
        name: bot.name,
        isBot: true,
        color: bot.personality.headgearColor,
        kills: 0,
        deaths: 0,
        damageDealt: 0,
        shotsFired: 0,
        shotsHit: 0,
        bestStreak: 0,
        currentStreak: 0
      });
    }

    this.input.attach(this.canvas);
    this.setState('COUNTDOWN');
    this.notifyStats();

    if (!this.animFrameId) {
      this.lastTime = performance.now();
      this.animFrameId = requestAnimationFrame(this.loop);
    }
  }

  public setState(newState: GameState) {
    this.state = newState;
    if (this.onStateChange) this.onStateChange(newState);
  }

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.input.detach();
    window.removeEventListener('resize', this.handleResize);
    soundManager.stopJetpack();
  }

  private loop(timestamp: number) {
    const dt = Math.min(0.06, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  }

  private update(dt: number) {
    // 1. Countdown Phase
    if (this.state === 'COUNTDOWN') {
      const prevSec = Math.ceil(this.countdownTimer);
      this.countdownTimer -= dt;
      const curSec = Math.ceil(this.countdownTimer);

      if (curSec !== prevSec && curSec > 0) {
        soundManager.playCountdown(curSec);
      }

      if (this.countdownTimer <= 0) {
        soundManager.playCountdown(0);
        this.setState('PLAYING');
        if (this.onAnnouncement) this.onAnnouncement('LUTAR!', 'Primeiro a 15 abates vence!');
      }
      return;
    }

    if (this.state === 'ENDED') {
      this.particleSystem.update(dt);
      this.textManager.update(dt);
      return;
    }

    // 2. Match Timer
    this.matchTimeRemaining -= dt;
    if (this.matchTimeRemaining <= 0) {
      this.matchTimeRemaining = 0;
      this.checkEndMatch(true);
      return;
    }

    // 3. Update Map & Items & Particles
    this.mapRenderer.update(dt);
    this.itemManager.update(dt);
    this.particleSystem.update(dt);
    this.textManager.update(dt);

    for (const barrel of this.barrels) {
      barrel.update(dt, this.particleSystem);
    }

    // 4. Update Player
    if (!this.player.isDead) {
      const mouseWorld = this.camera.screenToWorld(this.input.mouseScreenX, this.input.mouseScreenY);
      this.player.handleInput(
        this.input.moveX,
        this.input.isJetpacking,
        mouseWorld.x,
        mouseWorld.y,
        this.particleSystem,
        dt
      );

      // Weapon switch
      if (this.input.switchWeaponSlot !== null) {
        this.player.switchWeapon(this.input.switchWeaponSlot);
      }

      // Reload
      if (this.input.wantsReload) {
        this.player.startReload();
      }

      // Grenade
      if (this.input.wantsGrenade) {
        this.player.tryThrowGrenade(this.grenades);
      }

      // Shooting
      if (this.input.isShooting) {
        const shot = this.player.tryShoot(this.particleSystem, this.projectiles);
        if (shot) {
          const pStat = this.stats.get(this.player.id);
          if (pStat) pStat.shotsFired++;
          if (this.settings.screenShake) this.camera.addShake(2.5);
        }
      }

      this.player.update(dt, ARENA_PLATFORMS);

      // Check item pickups for player
      const pickup = this.itemManager.checkPickup(this.player.x, this.player.y);
      if (pickup) {
        this.handleItemPickup(this.player, pickup);
      }
    } else {
      // Player Respawn Countdown
      if (this.state === 'RESPAWNING') {
        this.playerRespawnTimer -= dt;
        if (this.playerRespawnTimer <= 0) {
          this.respawnPlayer();
        }
      }
    }

    this.input.consumeImpulses();

    // 5. Update Bots
    const allEntities = [this.player, ...this.bots];
    const diffMultiplier = this.settings.botDifficulty === 'easy' ? 0.7 : this.settings.botDifficulty === 'hard' ? 1.25 : 1.0;

    for (const bot of this.bots) {
      if (!bot.isDead) {
        bot.executeAITurn(
          dt,
          allEntities,
          this.itemManager.pedestals,
          ARENA_PLATFORMS,
          this.particleSystem,
          this.projectiles,
          this.grenades,
          diffMultiplier
        );
        bot.update(dt, ARENA_PLATFORMS);

        const pickup = this.itemManager.checkPickup(bot.x, bot.y);
        if (pickup) {
          this.handleItemPickup(bot, pickup);
        }
      } else {
        // Bot auto-respawn timer
        if (bot.invulnerableTimer <= 0) {
          this.respawnBot(bot);
        } else {
          bot.invulnerableTimer -= dt;
        }
      }
    }

    // 6. Update Projectiles & Bullet Hit Detection
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const hitWall = proj.update(dt, ARENA_PLATFORMS, this.particleSystem);

      if (hitWall) {
        if (proj.explosionRadius) {
          this.triggerExplosion(proj.x, proj.y, proj.explosionRadius, proj.damage, proj.ownerId, proj.ownerName, proj.isBotOwner, proj.weaponType);
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check hit against Barrels
      let hitSomething = false;
      for (const barrel of this.barrels) {
        if (barrel.isDead) continue;
        const b = barrel.getBounds();
        if (proj.x >= b.x && proj.x <= b.x + b.width && proj.y >= b.y && proj.y <= b.y + b.height) {
          hitSomething = true;
          const died = barrel.takeDamage(proj.damage);
          this.particleSystem.emitHit(proj.x, proj.y, 0, -1);
          if (died) {
            this.triggerExplosion(barrel.x, barrel.y - barrel.height / 2, barrel.explosionRadius, barrel.damage, proj.ownerId, proj.ownerName, proj.isBotOwner, proj.weaponType);
          }
          break;
        }
      }

      if (hitSomething) {
        if (proj.explosionRadius) {
          this.triggerExplosion(proj.x, proj.y, proj.explosionRadius, proj.damage, proj.ownerId, proj.ownerName, proj.isBotOwner, proj.weaponType);
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check hit against Soldiers (Player & Bots)
      for (const target of allEntities) {
        if (target.isDead || target.id === proj.ownerId || target.invulnerableTimer > 0) continue;

        const dist = Math.hypot(target.x - proj.x, target.y - proj.y);
        if (dist < target.radius + proj.radius + 6) {
          hitSomething = true;

          // Headshot multiplier if upper head region
          const isHeadshot = proj.y < target.y - 12 && proj.weaponType === 'sniper';
          const finalDamage = isHeadshot ? proj.damage * 1.5 : proj.damage;

          const died = target.takeDamage(finalDamage);

          // Particles & Sound
          this.particleSystem.emitHit(proj.x, proj.y, -proj.vx, -proj.vy, true);
          if (this.settings.showHitNumbers) {
            this.textManager.add(target.x, target.y - 14, isHeadshot ? `HEADSHOT! -${Math.round(finalDamage)}` : `-${Math.round(finalDamage)}`, isHeadshot ? '#ef4444' : '#facc15', isHeadshot ? 22 : 16, isHeadshot);
          }

          // Attribution
          const shooterStat = this.stats.get(proj.ownerId);
          if (shooterStat) {
            shooterStat.shotsHit++;
            shooterStat.damageDealt += finalDamage;
          }

          if (proj.ownerId === this.player.id) {
            soundManager.playHitmarker();
          }

          if (died) {
            this.handleKill(proj.ownerId, proj.ownerName, proj.isBotOwner, target.id, target.name, target.isBot, proj.weaponType);
          }

          if (proj.explosionRadius) {
            this.triggerExplosion(proj.x, proj.y, proj.explosionRadius, proj.damage, proj.ownerId, proj.ownerName, proj.isBotOwner, proj.weaponType);
          }

          break;
        }
      }

      if (hitSomething) {
        this.projectiles.splice(i, 1);
      }
    }

    // 7. Update Grenades
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      const exploded = g.update(dt, ARENA_PLATFORMS, this.particleSystem);

      if (exploded) {
        this.triggerExplosion(g.x, g.y, g.explosionRadius, g.damage, g.ownerId, g.ownerName, g.isBotOwner, 'rocket');
        this.grenades.splice(i, 1);
      }
    }

    // 8. Camera Follow Player (or spectate leader if player is dead)
    const targetCameraX = !this.player.isDead ? this.player.x : (this.bots[0]?.x || MAP_WIDTH / 2);
    const targetCameraY = !this.player.isDead ? this.player.y : (this.bots[0]?.y || MAP_HEIGHT / 2);
    this.camera.follow(targetCameraX, targetCameraY, dt);
  }

  private handleItemPickup(entity: Player | Bot, pedestal: import('../types').ItemPedestal) {
    let took = false;

    if (pedestal.type === 'health') {
      if (entity.health < entity.maxHealth) {
        entity.heal(25);
        took = true;
        this.particleSystem.emitPickupGlow(pedestal.x, pedestal.y, '#22c55e');
        if (entity === this.player) {
          soundManager.playPickup('health');
          this.textManager.add(entity.x, entity.y - 12, '+25 HP', '#22c55e', 18);
        }
      }
    } else if (pedestal.type === 'fuel') {
      if (entity.fuel < entity.maxFuel) {
        entity.fuel = Math.min(entity.maxFuel, entity.fuel + 50);
        took = true;
        this.particleSystem.emitPickupGlow(pedestal.x, pedestal.y, '#38bdf8');
        if (entity === this.player) {
          soundManager.playPickup('fuel');
          this.textManager.add(entity.x, entity.y - 12, '+50% FUEL', '#38bdf8', 18);
        }
      }
    } else if (pedestal.type === 'grenade') {
      if (entity.grenades < 3) {
        entity.grenades = Math.min(3, entity.grenades + 2);
        took = true;
        this.particleSystem.emitPickupGlow(pedestal.x, pedestal.y, '#eab308');
        if (entity === this.player) {
          soundManager.playPickup('grenade');
          this.textManager.add(entity.x, entity.y - 12, '+2 GRENADES', '#eab308', 18);
        }
      }
    } else {
      // Weapon pedestal
      entity.equipWeapon(pedestal.type as WeaponType);
      took = true;
      this.particleSystem.emitPickupGlow(pedestal.x, pedestal.y, '#f59e0b');
      if (entity === this.player) {
        soundManager.playPickup('weapon');
        this.textManager.add(entity.x, entity.y - 12, `EQUIP: ${pedestal.type.toUpperCase()}`, '#f59e0b', 20);
      }
    }

    if (took) {
      this.itemManager.consume(pedestal);
    }
  }

  private triggerExplosion(
    x: number,
    y: number,
    radius: number,
    maxDamage: number,
    ownerId: string,
    ownerName: string,
    isBotOwner: boolean,
    weaponType: WeaponType
  ) {
    soundManager.playExplosion();
    this.particleSystem.emitExplosion(x, y, radius);
    if (this.settings.screenShake) {
      this.camera.addShake(18);
    }

    const allEntities = [this.player, ...this.bots];

    // Damage all entities in blast radius
    for (const ent of allEntities) {
      if (ent.isDead || ent.invulnerableTimer > 0) continue;

      const dist = Math.hypot(ent.x - x, ent.y - y);
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        const damage = Math.round(maxDamage * falloff);

        // Blast pushback velocity
        const blastAngle = Math.atan2(ent.y - y, ent.x - x);
        const impulse = 550 * falloff;
        ent.vx += Math.cos(blastAngle) * impulse;
        ent.vy += Math.sin(blastAngle) * impulse - 120;

        const died = ent.takeDamage(damage);

        this.particleSystem.emitHit(ent.x, ent.y, Math.cos(blastAngle), Math.sin(blastAngle), true);
        if (this.settings.showHitNumbers) {
          this.textManager.add(ent.x, ent.y - 12, `-${damage}`, '#ef4444', 20, true);
        }

        const shooterStat = this.stats.get(ownerId);
        if (shooterStat) {
          shooterStat.damageDealt += damage;
        }

        if (died) {
          this.handleKill(ownerId, ownerName, isBotOwner, ent.id, ent.name, ent.isBot, weaponType);
        }
      }
    }

    // Damage explosive barrels in blast radius (chain reaction)
    for (const barrel of this.barrels) {
      if (barrel.isDead) continue;
      const dist = Math.hypot(barrel.x - x, barrel.y - barrel.height / 2 - y);
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        const damage = Math.round(maxDamage * falloff);
        const died = barrel.takeDamage(damage);
        if (died) {
          setTimeout(() => {
            this.triggerExplosion(barrel.x, barrel.y - barrel.height / 2, barrel.explosionRadius, barrel.damage, ownerId, ownerName, isBotOwner, weaponType);
          }, 60);
        }
      }
    }
  }

  private handleKill(
    killerId: string,
    killerName: string,
    killerIsBot: boolean,
    victimId: string,
    victimName: string,
    victimIsBot: boolean,
    weapon: WeaponType
  ) {
    // 1. Update stats
    const killerStat = this.stats.get(killerId);
    const victimStat = this.stats.get(victimId);

    if (killerStat) {
      killerStat.kills++;
      killerStat.currentStreak++;
      if (killerStat.currentStreak > killerStat.bestStreak) {
        killerStat.bestStreak = killerStat.currentStreak;
      }
    }

    if (victimStat) {
      victimStat.deaths++;
      victimStat.currentStreak = 0;
    }

    // 2. Kill event record
    const event: KillEvent = {
      id: `${Date.now()}-${Math.random()}`,
      killerName,
      killerIsBot,
      victimName,
      victimIsBot,
      weapon,
      timestamp: Date.now()
    };
    this.killFeed.unshift(event);
    if (this.killFeed.length > 6) this.killFeed.pop();
    if (this.onKillFeedUpdate) this.onKillFeedUpdate([...this.killFeed]);

    // 3. Audio & Announcements
    if (killerId === this.player.id) {
      soundManager.playKill();

      const streak = killerStat?.currentStreak || 1;
      if (streak === 2) {
        if (this.onAnnouncement) this.onAnnouncement('DOUBLE KILL!', 'Sequência x2');
      } else if (streak === 3) {
        if (this.onAnnouncement) this.onAnnouncement('TRIPLE KILL!', 'Em chamas! x3');
      } else if (streak >= 5) {
        if (this.onAnnouncement) this.onAnnouncement('KILLING SPREE!', `Sequência imparável de ${streak}!`);
      }
    }

    // 4. Handle player respawn screen
    if (victimId === this.player.id) {
      this.killerName = killerName;
      this.playerRespawnTimer = 3.0;
      this.setState('RESPAWNING');
    } else {
      // Bot respawn delay
      const bot = this.bots.find(b => b.id === victimId);
      if (bot) {
        bot.invulnerableTimer = 3.0; // Acts as respawn timer while dead
      }
    }

    this.notifyStats();

    // 5. Check win conditions
    if (killerStat && killerStat.kills >= this.maxKillsToWin) {
      this.checkEndMatch(false);
    }
  }

  private respawnPlayer() {
    // Find safe spawn point farthest from enemies
    const spawn = this.getSafestSpawnPoint();
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.health = this.player.maxHealth;
    this.player.fuel = this.player.maxFuel;
    this.player.isDead = false;
    this.player.invulnerableTimer = 2.0;
    this.setState('PLAYING');
  }

  private respawnBot(bot: Bot) {
    const spawn = this.getSafestSpawnPoint();
    bot.x = spawn.x;
    bot.y = spawn.y;
    bot.vx = 0;
    bot.vy = 0;
    bot.health = bot.maxHealth;
    bot.fuel = bot.maxFuel;
    bot.isDead = false;
    bot.invulnerableTimer = 2.0;
  }

  private getSafestSpawnPoint() {
    let bestSpawn = SPAWN_POINTS[0];
    let maxMinDist = -1;

    for (const sp of SPAWN_POINTS) {
      let minDistToEnemy = Infinity;
      for (const ent of [this.player, ...this.bots]) {
        if (ent.isDead) continue;
        const dist = Math.hypot(ent.x - sp.x, ent.y - sp.y);
        if (dist < minDistToEnemy) {
          minDistToEnemy = dist;
        }
      }
      if (minDistToEnemy > maxMinDist) {
        maxMinDist = minDistToEnemy;
        bestSpawn = sp;
      }
    }
    return bestSpawn;
  }

  private checkEndMatch(byTime: boolean) {
    this.setState('ENDED');
    const allStats = Array.from(this.stats.values()).sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
    const winner = allStats[0];
    const isVictory = winner.id === this.player.id;

    if (isVictory) {
      soundManager.playVictory();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } else {
      soundManager.playDefeat();
    }

    const playerStat = this.stats.get(this.player.id)!;
    const matchResults: MatchResults = {
      isVictory,
      winnerName: winner.name,
      playerStats: playerStat,
      allStats,
      matchDuration: 300 - this.matchTimeRemaining
    };

    if (this.onMatchEnd) {
      this.onMatchEnd(matchResults);
    }
  }

  private notifyStats() {
    if (this.onStatsUpdate) {
      const list = Array.from(this.stats.values()).sort((a, b) => b.kills - a.kills);
      this.onStatsUpdate(list);
    }
  }

  private render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply Camera Transform
    this.ctx.save();
    this.camera.applyTransform(this.ctx);

    // 1. Background & Parallax Environment
    this.mapRenderer.renderBackground(this.ctx, this.camera.x, this.camera.y, this.camera.width, this.camera.height);

    // 2. Platforms & Structures
    this.mapRenderer.renderPlatforms(this.ctx, ARENA_PLATFORMS);

    // 3. Item Pedestals & Pickups
    this.itemManager.render(this.ctx);

    // 4. Explosive Barrels
    for (const barrel of this.barrels) {
      barrel.render(this.ctx);
    }

    // 5. Grenades
    for (const g of this.grenades) {
      g.render(this.ctx);
    }

    // 6. Soldiers (Bots & Player)
    for (const bot of this.bots) {
      bot.render(this.ctx);
    }
    this.player.render(this.ctx);

    // 7. Projectiles (Tracer bullets, Lasers, Rockets)
    for (const proj of this.projectiles) {
      proj.render(this.ctx);
    }

    // 8. Particles (Fire, Smoke, Sparks, Blood)
    this.particleSystem.render(this.ctx);

    // 9. Foreground Foliage / Vines
    this.mapRenderer.renderForegroundFoliage(this.ctx);

    // 10. Floating Combat Damage Numbers
    this.textManager.render(this.ctx);

    this.ctx.restore();
  }
}
