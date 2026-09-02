import { Rect } from '../types';
import { ParticleSystem } from '../effects/ParticleSystem';

export class ExplosiveBarrel {
  public id: string;
  public x: number;
  public y: number;
  public width = 28;
  public height = 38;
  public health = 30;
  public maxHealth = 30;
  public isDead = false;
  public explosionRadius = 140;
  public damage = 95;
  private smokeTimer = 0;

  constructor(id: string, x: number, y: number, health = 30) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
  }

  public getBounds(): Rect {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height,
      width: this.width,
      height: this.height
    };
  }

  public takeDamage(amount: number): boolean {
    if (this.isDead) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDead = true;
      return true;
    }
    return false;
  }

  public update(dt: number, particleSystem: ParticleSystem) {
    if (this.isDead) return;

    // If damaged, leak smoke and fire
    if (this.health < this.maxHealth) {
      this.smokeTimer += dt;
      if (this.smokeTimer > 0.08) {
        this.smokeTimer = 0;
        particleSystem.emitJetpack(
          this.x + (Math.random() - 0.5) * 12,
          this.y - this.height + 4,
          -Math.PI / 2
        );
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.isDead) return;

    ctx.save();
    const bx = this.x - this.width / 2;
    const by = this.y - this.height;

    // Red military fuel drum
    const grad = ctx.createLinearGradient(bx, by, bx + this.width, by);
    grad.addColorStop(0, '#991b1b');
    grad.addColorStop(0.5, '#ef4444');
    grad.addColorStop(1, '#7f1d1d');

    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, this.width, this.height);

    // Metal ribs
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx, by + 6, this.width, 3);
    ctx.fillRect(bx, by + this.height / 2 - 1, this.width, 3);
    ctx.fillRect(bx, by + this.height - 8, this.width, 3);

    // Hazard symbol / Flammable icon
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    const cx = this.x;
    const cy = by + this.height / 2;
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 6, cy + 4);
    ctx.lineTo(cx - 6, cy + 4);
    ctx.closePath();
    ctx.fill();

    // Damage indicator
    if (this.health < this.maxHealth) {
      const pct = this.health / this.maxHealth;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by - 8, this.width, 4);
      ctx.fillStyle = pct > 0.4 ? '#eab308' : '#ef4444';
      ctx.fillRect(bx, by - 8, this.width * pct, 4);
    }

    ctx.restore();
  }
}
