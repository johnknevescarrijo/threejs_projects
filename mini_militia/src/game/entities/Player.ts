import { Entity } from './Entity';
import { Platform, PlayerCustomization, WeaponType } from '../types';
import { WEAPON_DEFINITIONS } from '../weapons/WeaponDefinitions';
import { ParticleSystem } from '../effects/ParticleSystem';
import { soundManager } from '../audio/SoundManager';
import { Projectile } from './Projectile';
import { Grenade } from './Grenade';

export class Player extends Entity {
  public name = 'Jogador';
  public isBot = false;
  public id = 'player';

  // Jetpack
  public fuel = 100;
  public maxFuel = 100;
  public fuelBurnRate = 32; // fuel / sec
  public fuelRechargeRate = 45; // fuel / sec when grounded
  public isFlying = false;

  // Weapons Inventory
  public weapons: WeaponType[] = ['rifle', 'pistol'];
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
  public grenades = 3;
  public maxGrenades = 3;

  // Customization
  public customization: PlayerCustomization = {
    name: 'Soldier',
    skinColor: '#fcd34d',
    headgearColor: '#15803d',
    visorColor: '#00f0ff',
    jetpackColor: '#334155',
    primaryWeapon: 'rifle'
  };

  // Animation
  public walkCycle = 0;
  public muzzleFlashTimer = 0;

  constructor(x: number, y: number, custom?: PlayerCustomization) {
    super(x, y, 32, 48);
    if (custom) {
      this.customization = { ...custom };
      this.name = custom.name;
      this.weapons[0] = custom.primaryWeapon;
      this.ammoInMag[custom.primaryWeapon] = WEAPON_DEFINITIONS[custom.primaryWeapon].maxAmmo;
    }
  }

  public getCurrentWeapon(): WeaponType {
    return this.weapons[this.currentWeaponIndex] || 'pistol';
  }

  public switchWeapon(slotIndex: number) {
    if (this.isReloading) {
      this.isReloading = false;
      this.reloadTimer = 0;
    }
    if (slotIndex >= 0 && slotIndex < this.weapons.length) {
      this.currentWeaponIndex = slotIndex;
    } else if (slotIndex === -1) {
      // Next weapon
      this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
    } else if (slotIndex === -2) {
      // Prev weapon
      this.currentWeaponIndex = (this.currentWeaponIndex - 1 + this.weapons.length) % this.weapons.length;
    }
  }

  public equipWeapon(weapon: WeaponType) {
    // If we already have it, just refill ammo
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
      // Replace current slot
      this.weapons[this.currentWeaponIndex] = weapon;
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
    soundManager.playReload();
  }

  public update(dt: number, platforms: Platform[]) {
    // Invulnerability shield decay
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Weapon Cooldown & Reloading
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

    // Jetpack Fuel Management
    if (this.isFlying) {
      this.fuel = Math.max(0, this.fuel - this.fuelBurnRate * dt);
      if (this.fuel <= 0) {
        this.isFlying = false;
        soundManager.stopJetpack();
      }
    } else if (this.isGrounded) {
      this.fuel = Math.min(this.maxFuel, this.fuel + this.fuelRechargeRate * dt);
    }

    // Apply gravity
    this.vy += this.gravity * dt;

    // Apply friction/drag
    this.vx *= this.isGrounded ? Math.pow(this.groundFriction, dt * 60) : Math.pow(this.airFriction, dt * 60);

    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Platform collisions
    this.checkPlatformCollisions(platforms, dt);

    // Update walk animation
    if (this.isGrounded && Math.abs(this.vx) > 15) {
      this.walkCycle += dt * 14;
    } else {
      this.walkCycle = 0;
    }
  }

  public handleInput(
    moveX: number,
    isJetpacking: boolean,
    mouseWorldX: number,
    mouseWorldY: number,
    particleSystem: ParticleSystem,
    dt: number
  ) {
    if (this.isDead) return;

    // Horizontal Movement
    const speed = 360;
    if (moveX !== 0) {
      this.vx = moveX * speed;
      this.facingRight = moveX > 0;
    }

    // Aim Angle
    this.aimAngle = Math.atan2(mouseWorldY - this.y, mouseWorldX - this.x);
    this.facingRight = mouseWorldX >= this.x;

    // Jetpack Flight
    if (isJetpacking && this.fuel > 0) {
      this.isFlying = true;
      const thrust = 1850;
      this.vy = Math.max(-480, this.vy - thrust * dt);
      soundManager.startJetpack();

      // Emit thruster flame & smoke particles from backpack
      const thrusterOffsetX = this.facingRight ? -14 : 14;
      const thrusterY = this.y + 2;
      particleSystem.emitJetpack(this.x + thrusterOffsetX, thrusterY, Math.PI / 2);
    } else {
      if (this.isFlying) {
        this.isFlying = false;
        soundManager.stopJetpack();
      }
    }
  }

  public tryShoot(
    particleSystem: ParticleSystem,
    projectiles: Projectile[]
  ): boolean {
    if (this.isDead || this.isReloading || this.fireCooldownTimer > 0) return false;

    const cur = this.getCurrentWeapon();
    const config = WEAPON_DEFINITIONS[cur];

    if (this.ammoInMag[cur] <= 0) {
      this.startReload();
      return false;
    }

    // Consume ammo
    this.ammoInMag[cur]--;
    this.fireCooldownTimer = config.fireRate;
    this.muzzleFlashTimer = 0.08;

    // Sound
    soundManager.playShoot(cur);

    // Gun barrel muzzle position
    const gunLength = 28;
    const barrelX = this.x + Math.cos(this.aimAngle) * gunLength;
    const barrelY = this.y - 2 + Math.sin(this.aimAngle) * gunLength;

    // Particles
    particleSystem.emitMuzzle(barrelX, barrelY, this.aimAngle, cur === 'sniper' || cur === 'rocket');

    // Spawn Projectiles
    for (let p = 0; p < config.pellets; p++) {
      projectiles.push(
        new Projectile(
          barrelX,
          barrelY,
          this.aimAngle,
          cur,
          this.id,
          this.name,
          this.isBot
        )
      );
    }

    // Auto-reload if mag is empty
    if (this.ammoInMag[cur] <= 0) {
      this.startReload();
    }

    return true;
  }

  public tryThrowGrenade(grenadesList: Grenade[]): boolean {
    if (this.isDead || this.grenades <= 0) return false;

    this.grenades--;
    soundManager.playGrenadeThrow();

    const throwForce = 750;
    const spawnX = this.x + Math.cos(this.aimAngle) * 20;
    const spawnY = this.y - 6 + Math.sin(this.aimAngle) * 20;

    grenadesList.push(
      new Grenade(
        spawnX,
        spawnY,
        this.aimAngle,
        throwForce,
        this.id,
        this.name,
        this.isBot
      )
    );

    return true;
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Invulnerability forcefield bubble
    if (this.invulnerableTimer > 0) {
      const alpha = 0.4 + 0.3 * Math.sin(this.invulnerableTimer * 12);
      ctx.fillStyle = `rgba(0, 240, 255, ${alpha * 0.4})`;
      ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const dir = this.facingRight ? 1 : -1;

    // 1. Jetpack on Back
    ctx.fillStyle = this.customization.jetpackColor;
    ctx.fillRect(-dir * 12 - 4, -14, 8, 20);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-dir * 12 - 4, -14, 8, 20);

    // Jetpack Thruster Nozzle
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-dir * 12 - 3, 6, 6, 4);

    // 2. Legs (Animated walk or airborne dangle)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    if (this.isGrounded) {
      const leg1Angle = Math.sin(this.walkCycle) * 0.45;
      const leg2Angle = -Math.sin(this.walkCycle) * 0.45;

      // Leg 1
      ctx.beginPath();
      ctx.moveTo(-4, 10);
      ctx.lineTo(-4 + Math.sin(leg1Angle) * 14, 24);
      ctx.stroke();

      // Leg 2
      ctx.beginPath();
      ctx.moveTo(4, 10);
      ctx.lineTo(4 + Math.sin(leg2Angle) * 14, 24);
      ctx.stroke();
    } else {
      // Airborne legs
      ctx.beginPath();
      ctx.moveTo(-4, 10);
      ctx.lineTo(-6, 23);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(4, 10);
      ctx.lineTo(6, 23);
      ctx.stroke();
    }

    // 3. Body Torso (Tactical Camo / Armor)
    ctx.fillStyle = this.customization.headgearColor;
    ctx.fillRect(-8, -10, 16, 20);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-8, -10, 16, 20);

    // Armor plate line
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-6, -2, 12, 3);

    // 4. Head & Helmet
    ctx.fillStyle = this.customization.skinColor;
    ctx.beginPath();
    ctx.arc(0, -18, 10, 0, Math.PI * 2);
    ctx.fill();

    // Military Helmet
    ctx.fillStyle = this.customization.headgearColor;
    ctx.beginPath();
    ctx.arc(0, -21, 10.5, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Helmet rim
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-11, -21, 22, 3);

    // Visor / Tactical Goggles
    ctx.fillStyle = this.customization.visorColor;
    ctx.shadowColor = this.customization.visorColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    if (this.facingRight) {
      ctx.roundRect(1, -20, 9, 5, 2);
    } else {
      ctx.roundRect(-10, -20, 9, 5, 2);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // 5. Aim Arm & Equipped Weapon
    ctx.restore(); // Return from soldier root

    this.renderWeaponAndArm(ctx);

    // 6. Name tag & Mini Health Bar above head
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
    const config = WEAPON_DEFINITIONS[cur];

    // Shoulder joint
    ctx.fillStyle = this.customization.headgearColor;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Arm reaching to weapon
    ctx.strokeStyle = this.customization.skinColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12, 2);
    ctx.stroke();

    // Draw Weapon Model
    ctx.save();
    ctx.translate(12, 2);

    if (cur === 'pistol') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, -3, 14, 5);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-2, -3, 6, 7);
    } else if (cur === 'shotgun') {
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(-4, 0, 8, 4); // stock
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(4, -3, 18, 5); // double barrel
      ctx.fillStyle = '#a16207';
      ctx.fillRect(8, 0, 6, 3); // pump
    } else if (cur === 'rifle') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-4, -4, 22, 6);
      ctx.fillStyle = '#334155';
      ctx.fillRect(4, 2, 5, 7); // magazine
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, -6, 8, 2); // optic
    } else if (cur === 'sniper') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6, -3, 30, 5); // long heavy barrel
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(4, -7, 12, 4); // high power scope
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 2, 4, 6);

      // Laser aim guide line
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(24, -1);
      ctx.lineTo(400, -1);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (cur === 'rocket') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-10, -6, 26, 10); // launcher tube
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(16, -5);
      ctx.lineTo(24, -1);
      ctx.lineTo(16, 3);
      ctx.closePath();
      ctx.fill(); // rocket tip in tube
    }

    // Muzzle Flash
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

    // Name tag
    ctx.font = '700 10px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0fdf4';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 3;
    ctx.fillText(this.name, 0, -6);

    // Health Bar
    const barWidth = 36;
    const barHeight = 4;
    const healthPct = Math.max(0, this.health / this.maxHealth);

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(-barWidth / 2, 0, barWidth, barHeight);

    const grad = ctx.createLinearGradient(-barWidth / 2, 0, barWidth / 2, 0);
    grad.addColorStop(0, healthPct > 0.5 ? '#22c55e' : '#ef4444');
    grad.addColorStop(1, '#facc15');
    ctx.fillStyle = grad;
    ctx.fillRect(-barWidth / 2, 0, barWidth * healthPct, barHeight);

    // Reloading indicator spinner/bar
    if (this.isReloading) {
      const def = WEAPON_DEFINITIONS[this.getCurrentWeapon()];
      const reloadPct = 1 - this.reloadTimer / def.reloadTime;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-barWidth / 2, barHeight + 1, barWidth * reloadPct, 2);
    }

    ctx.restore();
  }
}
