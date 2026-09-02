import { Platform, WeaponType } from '../types';
import { WEAPON_DEFINITIONS } from '../weapons/WeaponDefinitions';
import { ParticleSystem } from '../effects/ParticleSystem';

export class Projectile {
  public id: number;
  public x: number;
  public y: number;
  public prevX: number;
  public prevY: number;
  public vx: number;
  public vy: number;
  public damage: number;
  public ownerId: string;
  public ownerName: string;
  public isBotOwner: boolean;
  public weaponType: WeaponType;
  public radius: number;
  public life: number;
  public maxLife: number;
  public isDead = false;
  public color: string;
  public trailColor?: string;
  public explosionRadius?: number;

  private static nextId = 0;

  constructor(
    x: number,
    y: number,
    angle: number,
    weaponType: WeaponType,
    ownerId: string,
    ownerName: string,
    isBotOwner: boolean
  ) {
    this.id = Projectile.nextId++;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.ownerId = ownerId;
    this.ownerName = ownerName;
    this.isBotOwner = isBotOwner;
    this.weaponType = weaponType;

    const config = WEAPON_DEFINITIONS[weaponType];
    this.damage = config.damage;
    this.radius = config.bulletRadius;
    this.color = config.color;
    this.trailColor = config.trailColor;
    this.explosionRadius = config.explosionRadius;

    // Add slight spread variation
    const finalAngle = angle + (Math.random() - 0.5) * config.spread;
    this.vx = Math.cos(finalAngle) * config.bulletSpeed;
    this.vy = Math.sin(finalAngle) * config.bulletSpeed;

    this.maxLife = config.range / config.bulletSpeed;
    this.life = this.maxLife;
  }

  public update(dt: number, platforms: Platform[], particleSystem: ParticleSystem): boolean {
    if (this.isDead) return true;

    this.life -= dt;
    if (this.life <= 0) {
      this.isDead = true;
      return true;
    }

    this.prevX = this.x;
    this.prevY = this.y;

    // For rockets, emit exhaust smoke trail and slight acceleration
    if (this.weaponType === 'rocket') {
      const angle = Math.atan2(this.vy, this.vx);
      particleSystem.emitRocketTrail(this.x, this.y, angle);
      // Rocket accelerates slightly over time
      this.vx *= 1 + dt * 0.4;
      this.vy *= 1 + dt * 0.4;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Platform collision raycast / segment intersection
    for (const p of platforms) {
      if (
        this.x >= p.x &&
        this.x <= p.x + p.width &&
        this.y >= p.y &&
        this.y <= p.y + p.height
      ) {
        this.isDead = true;
        particleSystem.emitHit(this.x, this.y, -this.vx / Math.abs(this.vx || 1), -this.vy / Math.abs(this.vy || 1));
        return true;
      }
    }

    return false;
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    if (this.weaponType === 'rocket') {
      const angle = Math.atan2(this.vy, this.vx);
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);

      // Rocket body
      ctx.fillStyle = '#475569';
      ctx.fillRect(-12, -4, 18, 8);

      // Warhead
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(6, -4);
      ctx.lineTo(14, 0);
      ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fill();

      // Fins
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.lineTo(-16, -8);
      ctx.lineTo(-10, -4);
      ctx.lineTo(-12, 4);
      ctx.lineTo(-16, 8);
      ctx.lineTo(-10, 4);
      ctx.fill();

      // Thruster flame
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(-12, 0, 3 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.weaponType === 'sniper') {
      // High-energy laser beam tracer
      ctx.strokeStyle = this.trailColor || '#c084fc';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#d8b4fe';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(this.prevX, this.prevY);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();

      // Bright core bullet
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Tracer bullet
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.radius * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.prevX, this.prevY);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();

      // Glowing tip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
