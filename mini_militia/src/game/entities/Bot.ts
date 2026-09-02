import { Entity } from './Entity';
import { ItemPedestal, Platform, PlayerCustomization, WeaponType } from '../types';
import { WEAPON_DEFINITIONS } from '../weapons/WeaponDefinitions';
import { ParticleSystem } from '../effects/ParticleSystem';
import { soundManager } from '../audio/SoundManager';
import { Projectile } from './Projectile';
import { Grenade } from './Grenade';

export interface BotPersonality {
  name: string;
  skinColor: string;
  headgearColor: string;
  visorColor: string;
  jetpackColor: string;
  preferredWeapon: WeaponType;
  aggression: number; // 0.1 to 1.0
  accuracy: number; // 0.1 to 1.0
  verticality: number; // How often they fly
  grenadeProbability: number;
}

export const BOT_PRESETS: BotPersonality[] = [
  {
    name: 'Sgt. Rex',
    skinColor: '#fed7aa',
    headgearColor: '#b91c1c', // Crimson
    visorColor: '#fbbf24',
    jetpackColor: '#451a03',
    preferredWeapon: 'shotgun',
    aggression: 0.9,
    accuracy: 0.75,
    verticality: 0.6,
    grenadeProbability: 0.08
  },
  {
    name: 'Ghost Sniper',
    skinColor: '#e2e8f0',
    headgearColor: '#334155', // Slate
    visorColor: '#a855f7', // Purple
    jetpackColor: '#1e293b',
    preferredWeapon: 'sniper',
    aggression: 0.5,
    accuracy: 0.92,
    verticality: 0.85,
    grenadeProbability: 0.04
  },
  {
    name: 'Viper',
    skinColor: '#fef08a',
    headgearColor: '#047857', // Emerald
    visorColor: '#38bdf8',
    jetpackColor: '#064e3b',
    preferredWeapon: 'rifle',
    aggression: 0.85,
    accuracy: 0.7,
    verticality: 0.95,
    grenadeProbability: 0.12
  },
  {
    name: 'Tanker',
    skinColor: '#fdba74',
    headgearColor: '#c2410c', // Orange
    visorColor: '#ef4444',
    jetpackColor: '#7c2d12',
    preferredWeapon: 'rocket',
    aggression: 0.75,
    accuracy: 0.65,
    verticality: 0.5,
    grenadeProbability: 0.15
  },
  {
    name: 'Shadow',
    skinColor: '#cbd5e1',
    headgearColor: '#0f172a', // Midnight
    visorColor: '#4ade80',
    jetpackColor: '#020617',
    preferredWeapon: 'rifle',
    aggression: 0.8,
    accuracy: 0.8,
    verticality: 0.7,
    grenadeProbability: 0.09
  }
];

export class Bot extends Entity {
  public id: string;
  public name: string;
  public isBot = true;
  public personality: BotPersonality;

  // Jetpack
  public fuel = 100;
  public maxFuel = 100;
  public fuelBurnRate = 32;
  public fuelRechargeRate = 45;
  public isFlying = false;

  // Weapons Inventory
  public weapons: WeaponType[] = ['pistol'];
  public currentWeaponIndex = 0;
  public ammoInMag: Record<WeaponType, number> = {
    pistol: 12,
    shotgun: 6,
    rifle: 30,
    sniper: 5,
    rocket: 3
  };
  public fireCooldownTimer = 0;
  public isReloading = false;
  public reloadTimer = 0;
  public grenades = 2;

  // AI Decision State
  public targetEntity: Entity | null = null;
  public targetItem: ItemPedestal | null = null;
  public aiDecisionTimer = 0;
  public reactionTimer = 0;
  public strafeDir = 1;
  public strafeTimer = 0;
  public wantsFly = false;
  public walkCycle = 0;
  public muzzleFlashTimer = 0;

  constructor(id: string, x: number, y: number, personality: BotPersonality) {
    super(x, y, 32, 48);
    this.id = id;
    this.personality = personality;
    this.name = personality.name;

    this.weapons = [personality.preferredWeapon, 'pistol'];
    this.ammoInMag[personality.preferredWeapon] = WEAPON_DEFINITIONS[personality.preferredWeapon].maxAmmo;
  }

  public getCurrentWeapon(): WeaponType {
    return this.weapons[this.currentWeaponIndex] || 'pistol';
  }

  public equipWeapon(weapon: WeaponType) {
    const existingIndex = this.weapons.indexOf(weapon);
    if (existingIndex !== -1) {
      this.ammoInMag[weapon] = WEAPON_DEFINITIONS[weapon].maxAmmo;
      this.currentWeaponIndex = existingIndex;
      return;
    }

    if (this.weapons.length < 3) {
      this.weapons.push(weapon);
      this.currentWeaponIndex = this.weapons.length - 1;
    } else {
      this.weapons[0] = weapon;
      this.currentWeaponIndex = 0;
    }
    this.ammoInMag[weapon] = WEAPON_DEFINITIONS[weapon].maxAmmo;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  public startReload() {
    const cur = this.getCurrentWeapon();
    const def = WEAPON_DEFINITIONS[cur];
    if (this.isReloading || this.ammoInMag[cur] >= def.maxAmmo) return;

    this.isReloading = true;
    this.reloadTimer = def.reloadTime;
  }

  public update(dt: number, platforms: Platform[]) {
    // Invulnerability timer
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Weapons timer
    if (this.fireCooldownTimer > 0) {
      this.fireCooldownTimer -= dt;
    }

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const cur = this.getCurrentWeapon();
        this.ammoInMag[cur] = WEAPON_DEFINITIONS[cur].maxAmmo;
        this.isReloading = false;
      }
    }

    // Jetpack Fuel
    if (this.isFlying) {
      this.fuel = Math.max(0, this.fuel - this.fuelBurnRate * dt);
      if (this.fuel <= 0) {
        this.isFlying = false;
      }
    } else if (this.isGrounded) {
      this.fuel = Math.min(this.maxFuel, this.fuel + this.fuelRechargeRate * dt);
    }

    // Gravity
    this.vy += this.gravity * dt;

    // Friction
    this.vx *= this.isGrounded ? Math.pow(this.groundFriction, dt * 60) : Math.pow(this.airFriction, dt * 60);

    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Platform collisions
    this.checkPlatformCollisions(platforms, dt);

    // Walk animation
    if (this.isGrounded && Math.abs(this.vx) > 15) {
      this.walkCycle += dt * 14;
    } else {
      this.walkCycle = 0;
    }
  }

  public executeAITurn(
    dt: number,
    allEntities: Entity[],
    pedestals: ItemPedestal[],
    platforms: Platform[],
    particleSystem: ParticleSystem,
    projectiles: Projectile[],
    grenades: Grenade[],
    difficultyMultiplier = 1.0
  ) {
    if (this.isDead) return;

    this.aiDecisionTimer -= dt;
    this.strafeTimer -= dt;

    // 1. Select Target (closest visible enemy: human player or rival bot)
    if (this.aiDecisionTimer <= 0 || !this.targetEntity || this.targetEntity.isDead) {
      this.aiDecisionTimer = 0.25 + Math.random() * 0.2;

      let nearestDist = Infinity;
      let chosenTarget: Entity | null = null;

      for (const ent of allEntities) {
        if (ent === this || ent.isDead) continue;
        const dist = Math.hypot(ent.x - this.x, ent.y - this.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          chosenTarget = ent;
        }
      }
      this.targetEntity = chosenTarget;

      // 2. Check for nearby items if low on health/fuel or wanting weapon
      if (this.health < 50 || this.fuel < 25 || this.weapons.length < 2) {
        let bestItem: ItemPedestal | null = null;
        let itemDist = 900;
        for (const ped of pedestals) {
          if (!ped.isAvailable) continue;
          if (this.health < 50 && ped.type === 'health') {
            const d = Math.hypot(ped.x - this.x, ped.y - this.y);
            if (d < itemDist) {
              itemDist = d;
              bestItem = ped;
            }
          } else if (this.fuel < 30 && ped.type === 'fuel') {
            const d = Math.hypot(ped.x - this.x, ped.y - this.y);
            if (d < itemDist) {
              itemDist = d;
              bestItem = ped;
            }
          } else if (ped.type === this.personality.preferredWeapon && this.getCurrentWeapon() !== this.personality.preferredWeapon) {
            const d = Math.hypot(ped.x - this.x, ped.y - this.y);
            if (d < itemDist) {
              itemDist = d;
              bestItem = ped;
            }
          }
        }
        this.targetItem = bestItem;
      } else {
        this.targetItem = null;
      }
    }

    // 3. Movement & Navigation Logic
    let destinationX = this.x;
    let destinationY = this.y;

    if (this.targetItem) {
      destinationX = this.targetItem.x;
      destinationY = this.targetItem.y;
    } else if (this.targetEntity) {
      destinationX = this.targetEntity.x;
      destinationY = this.targetEntity.y;
    }

    const dx = destinationX - this.x;
    const dy = destinationY - this.y;
    const distToDest = Math.hypot(dx, dy);

    // Strafe randomly during combat
    if (this.strafeTimer <= 0) {
      this.strafeTimer = 1.0 + Math.random() * 1.5;
      this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    }

    const curWeapon = this.getCurrentWeapon();
    const config = WEAPON_DEFINITIONS[curWeapon];
    const optimalRange = config.range * 0.55;

    let moveX = 0;
    if (distToDest > optimalRange) {
      // Approach target
      moveX = Math.sign(dx);
    } else if (distToDest < 180) {
      // Back away if too close
      moveX = -Math.sign(dx);
    } else {
      // Strafe around
      moveX = this.strafeDir;
    }

    // Horizontal speed
    this.vx = moveX * 320;
    this.facingRight = (this.targetEntity ? this.targetEntity.x : destinationX) >= this.x;

    // 4. Vertical Navigation & Jetpack
    const needsElevation = dy < -60 || (this.targetItem && this.targetItem.y < this.y - 40);
    const wantsAcrobatics = Math.random() < this.personality.verticality * 0.03;

    if ((needsElevation || wantsAcrobatics) && this.fuel > 15) {
      this.isFlying = true;
      this.vy = Math.max(-440, this.vy - 1750 * dt);
      const thrusterOffsetX = this.facingRight ? -14 : 14;
      particleSystem.emitJetpack(this.x + thrusterOffsetX, this.y + 2, Math.PI / 2);
    } else {
      this.isFlying = false;
    }

    // 5. Aiming and Combat Engagement
    if (this.targetEntity && !this.targetEntity.isDead) {
      const targetDx = this.targetEntity.x - this.x;
      const targetDy = (this.targetEntity.y - 6) - this.y;
      let targetAngle = Math.atan2(targetDy, targetDx);

      // Add accuracy variation / lead angle
      const accuracySkill = this.personality.accuracy * difficultyMultiplier;
      const errorMargin = (1 - accuracySkill) * 0.25;
      const currentError = (Math.random() - 0.5) * errorMargin;
      this.aimAngle = targetAngle + currentError;

      const combatDist = Math.hypot(targetDx, targetDy);

      // Throw grenade if clumped or entrenched
      if (
        this.grenades > 0 &&
        combatDist > 200 &&
        combatDist < 550 &&
        Math.random() < this.personality.grenadeProbability * dt * 4
      ) {
        this.grenades--;
        const throwAngle = targetAngle - 0.2; // slight loft
        grenades.push(
          new Grenade(
            this.x + Math.cos(throwAngle) * 20,
            this.y - 6 + Math.sin(throwAngle) * 20,
            throwAngle,
            680,
            this.id,
            this.name,
            true
          )
        );
      }

      // Shoot when in range and not reloading
      if (combatDist <= config.range + 80 && this.fireCooldownTimer <= 0 && !this.isReloading) {
        if (this.ammoInMag[curWeapon] <= 0) {
          this.startReload();
        } else {
          // Fire weapon!
          this.ammoInMag[curWeapon]--;
          this.fireCooldownTimer = config.fireRate;
          this.muzzleFlashTimer = 0.08;

          // Sound (slight volume attenuation for distant bots)
          soundManager.playShoot(curWeapon);

          const barrelX = this.x + Math.cos(this.aimAngle) * 26;
          const barrelY = this.y - 2 + Math.sin(this.aimAngle) * 26;

          particleSystem.emitMuzzle(barrelX, barrelY, this.aimAngle, curWeapon === 'sniper' || curWeapon === 'rocket');

          for (let p = 0; p < config.pellets; p++) {
            projectiles.push(
              new Projectile(
                barrelX,
                barrelY,
                this.aimAngle,
                curWeapon,
                this.id,
                this.name,
                true
              )
            );
          }

          if (this.ammoInMag[curWeapon] <= 0) {
            this.startReload();
          }
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Spawn protection bubble
    if (this.invulnerableTimer > 0) {
      const alpha = 0.4 + 0.3 * Math.sin(this.invulnerableTimer * 12);
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.4})`;
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const dir = this.facingRight ? 1 : -1;

    // Jetpack
    ctx.fillStyle = this.personality.jetpackColor;
    ctx.fillRect(-dir * 12 - 4, -14, 8, 20);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-dir * 12 - 4, -14, 8, 20);

    // Jetpack Nozzle
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-dir * 12 - 3, 6, 6, 4);

    // Legs
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    if (this.isGrounded) {
      const leg1Angle = Math.sin(this.walkCycle) * 0.45;
      const leg2Angle = -Math.sin(this.walkCycle) * 0.45;
      ctx.beginPath();
      ctx.moveTo(-4, 10);
      ctx.lineTo(-4 + Math.sin(leg1Angle) * 14, 24);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(4, 10);
      ctx.lineTo(4 + Math.sin(leg2Angle) * 14, 24);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-4, 10);
      ctx.lineTo(-6, 23);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(4, 10);
      ctx.lineTo(6, 23);
      ctx.stroke();
    }

    // Body
    ctx.fillStyle = this.personality.headgearColor;
    ctx.fillRect(-8, -10, 16, 20);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-8, -10, 16, 20);

    // Head
    ctx.fillStyle = this.personality.skinColor;
    ctx.beginPath();
    ctx.arc(0, -18, 10, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = this.personality.headgearColor;
    ctx.beginPath();
    ctx.arc(0, -21, 10.5, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Visor
    ctx.fillStyle = this.personality.visorColor;
    ctx.shadowColor = this.personality.visorColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    if (this.facingRight) {
      ctx.roundRect(1, -20, 9, 5, 2);
    } else {
      ctx.roundRect(-10, -20, 9, 5, 2);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    // Weapon and Arm
    this.renderWeaponAndArm(ctx);

    // Overhead tag
    this.renderOverheadBar(ctx);
  }

  private renderWeaponAndArm(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y - 2);
    ctx.rotate(this.aimAngle);

    const isFlip = Math.cos(this.aimAngle) < 0;
    if (isFlip) {
      ctx.scale(1, -1);
    }

    const cur = this.getCurrentWeapon();

    // Shoulder
    ctx.fillStyle = this.personality.headgearColor;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Arm
    ctx.strokeStyle = this.personality.skinColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12, 2);
    ctx.stroke();

    // Weapon Model
    ctx.save();
    ctx.translate(12, 2);
    if (cur === 'pistol') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, -3, 14, 5);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-2, -3, 6, 7);
    } else if (cur === 'shotgun') {
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(-4, 0, 8, 4);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(4, -3, 18, 5);
    } else if (cur === 'rifle') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-4, -4, 22, 6);
      ctx.fillStyle = '#334155';
      ctx.fillRect(4, 2, 5, 7);
    } else if (cur === 'sniper') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6, -3, 30, 5);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(4, -7, 12, 4);
    } else if (cur === 'rocket') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-10, -6, 26, 10);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(16, -5);
      ctx.lineTo(24, -1);
      ctx.lineTo(16, 3);
      ctx.closePath();
      ctx.fill();
    }

    // Flash
    if (this.muzzleFlashTimer > 0) {
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(20, -1, 6 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  private renderOverheadBar(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y - 36);

    // Bot Tag with [BOT] indicator
    ctx.font = '700 9px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fca5a5';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 3;
    ctx.fillText(`${this.name} [IA]`, 0, -6);

    // Health Bar
    const barWidth = 32;
    const barHeight = 3.5;
    const healthPct = Math.max(0, this.health / this.maxHealth);

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(-barWidth / 2, 0, barWidth, barHeight);

    ctx.fillStyle = healthPct > 0.4 ? '#ef4444' : '#b91c1c';
    ctx.fillRect(-barWidth / 2, 0, barWidth * healthPct, barHeight);

    ctx.restore();
  }
}
