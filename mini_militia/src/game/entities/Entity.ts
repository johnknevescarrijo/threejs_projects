import { Platform, Rect } from '../types';

export abstract class Entity {
  public x = 0;
  public y = 0;
  public vx = 0;
  public vy = 0;
  public width = 32;
  public height = 48;
  public radius = 16;
  public isGrounded = false;
  public facingRight = true;
  public aimAngle = 0;

  public health = 100;
  public maxHealth = 100;
  public isDead = false;
  public invulnerableTimer = 0;

  public gravity = 1200; // pixels / s^2
  public groundFriction = 0.82;
  public airFriction = 0.96;

  constructor(x: number, y: number, width = 32, height = 48) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.radius = width / 2;
  }

  public getBounds(): Rect {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }

  public checkPlatformCollisions(platforms: Platform[], dt: number) {
    this.isGrounded = false;
    const bounds = this.getBounds();

    for (const p of platforms) {
      // Fast AABB intersection check
      if (
        bounds.x < p.x + p.width &&
        bounds.x + bounds.width > p.x &&
        bounds.y < p.y + p.height &&
        bounds.y + bounds.height > p.y
      ) {
        // Calculate penetration depths
        const overlapX = Math.min(bounds.x + bounds.width - p.x, p.x + p.width - bounds.x);
        const overlapY = Math.min(bounds.y + bounds.height - p.y, p.y + p.height - bounds.y);

        if (p.type === 'bridge' || p.type === 'one-way') {
          // One way platforms: only land on top when falling down
          if (this.vy > 0 && bounds.y + bounds.height - this.vy * dt <= p.y + 12) {
            this.y = p.y - this.height / 2;
            this.vy = 0;
            this.isGrounded = true;
          }
        } else {
          // Solid obstacle
          if (overlapY < overlapX) {
            if (bounds.y + bounds.height / 2 < p.y + p.height / 2) {
              // Top collision (landing on platform)
              this.y = p.y - this.height / 2;
              this.vy = 0;
              this.isGrounded = true;
            } else {
              // Bottom collision (hitting head)
              this.y = p.y + p.height + this.height / 2;
              if (this.vy < 0) this.vy = 0;
            }
          } else {
            if (bounds.x + bounds.width / 2 < p.x + p.width / 2) {
              // Left wall collision
              this.x = p.x - this.width / 2;
              this.vx = 0;
            } else {
              // Right wall collision
              this.x = p.x + p.width + this.width / 2;
              this.vx = 0;
            }
          }
        }
      }
    }
  }

  public takeDamage(amount: number): boolean {
    if (this.isDead || this.invulnerableTimer > 0) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDead = true;
      return true; // lethal hit
    }
    return false;
  }

  public heal(amount: number) {
    if (this.isDead) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  public abstract update(dt: number, platforms: Platform[]): void;
  public abstract render(ctx: CanvasRenderingContext2D): void;
}
