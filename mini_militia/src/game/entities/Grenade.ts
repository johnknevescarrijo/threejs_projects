import { Platform } from '../types';
import { ParticleSystem } from '../effects/ParticleSystem';
import { soundManager } from '../audio/SoundManager';

export class Grenade {
  public id: number;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius = 6;
  public rotation = 0;
  public vRot = 0;
  public fuseTimer = 2.2;
  public maxFuse = 2.2;
  public isDead = false;
  public ownerId: string;
  public ownerName: string;
  public isBotOwner: boolean;
  public damage = 95;
  public explosionRadius = 140;

  private static nextId = 0;

  constructor(
    x: number,
    y: number,
    angle: number,
    throwForce: number,
    ownerId: string,
    ownerName: string,
    isBotOwner: boolean
  ) {
    this.id = Grenade.nextId++;
    this.x = x;
    this.y = y;
    this.ownerId = ownerId;
    this.ownerName = ownerName;
    this.isBotOwner = isBotOwner;

    this.vx = Math.cos(angle) * throwForce;
    this.vy = Math.sin(angle) * throwForce;
    this.vRot = (Math.random() - 0.5) * 15;
  }

  public update(dt: number, platforms: Platform[], particleSystem: ParticleSystem): boolean {
    if (this.isDead) return true;

    this.fuseTimer -= dt;
    if (this.fuseTimer <= 0) {
      this.isDead = true;
      return true;
    }

    // Gravity and physics
    this.vy += 850 * dt;
    this.vx *= Math.pow(0.98, dt * 60);
    this.rotation += this.vRot * dt;

    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;

    // Bounce check against platforms
    for (const p of platforms) {
      if (
        nextX + this.radius > p.x &&
        nextX - this.radius < p.x + p.width &&
        nextY + this.radius > p.y &&
        nextY - this.radius < p.y + p.height
      ) {
        // Determine collision normal
        const prevBottom = this.y + this.radius;
        const prevTop = this.y - this.radius;

        if (prevBottom <= p.y + 8 && this.vy > 0) {
          // Top bounce
          this.y = p.y - this.radius;
          this.vy = -this.vy * 0.55;
          this.vx *= 0.75;
          this.vRot *= 0.6;
          if (Math.abs(this.vy) > 60) soundManager.playBounce();
        } else if (prevTop >= p.y + p.height - 8 && this.vy < 0) {
          // Bottom bounce
          this.y = p.y + p.height + this.radius;
          this.vy = -this.vy * 0.55;
          if (Math.abs(this.vy) > 60) soundManager.playBounce();
        } else {
          // Side bounce
          this.vx = -this.vx * 0.6;
          this.x = this.vx > 0 ? p.x + p.width + this.radius : p.x - this.radius;
          if (Math.abs(this.vx) > 60) soundManager.playBounce();
        }
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Emit tiny fuse smoke
    if (Math.random() < 0.3) {
      particleSystem.emitJetpack(this.x, this.y - 4, -Math.PI / 2);
    }

    return false;
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Grenade body (Pineapple military frag)
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ribbed texture
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top fuse cap
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-2, -this.radius - 3, 4, 3);

    // Blinking red warning LED (beeps faster as fuse runs out)
    const blinkFreq = (1 - this.fuseTimer / this.maxFuse) * 15 + 4;
    const isLit = Math.sin(this.fuseTimer * blinkFreq) > 0;
    if (isLit) {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, -this.radius - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
