import { ItemPedestal, ItemType } from '../types';
import { WEAPON_DEFINITIONS } from '../weapons/WeaponDefinitions';

export class ItemPickupManager {
  public pedestals: ItemPedestal[] = [];

  constructor(initialPedestals: ItemPedestal[]) {
    this.pedestals = initialPedestals.map(p => ({ ...p }));
  }

  public update(dt: number) {
    for (const p of this.pedestals) {
      p.floatingOffset += dt * 3;

      if (!p.isAvailable) {
        p.cooldownTimer -= dt;
        if (p.cooldownTimer <= 0) {
          p.isAvailable = true;
          p.cooldownTimer = 0;
        }
      }
    }
  }

  public checkPickup(
    entityX: number,
    entityY: number,
    entityRadius = 24
  ): ItemPedestal | null {
    for (const p of this.pedestals) {
      if (!p.isAvailable) continue;

      const dx = entityX - p.x;
      const dy = entityY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist < entityRadius + 22) {
        return p;
      }
    }
    return null;
  }

  public consume(pedestal: ItemPedestal) {
    pedestal.isAvailable = false;
    pedestal.cooldownTimer = pedestal.respawnTime;
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    for (const p of this.pedestals) {
      // Base pedestal stand
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 12, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (!p.isAvailable) {
        // Holo ring recharge progress
        const pct = 1 - p.cooldownTimer / p.respawnTime;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y + 12, 18, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
        ctx.stroke();
        continue;
      }

      const bobY = p.y + Math.sin(p.floatingOffset) * 5 - 4;

      // Glow aura
      ctx.save();
      const glowGrad = ctx.createRadialGradient(p.x, bobY, 2, p.x, bobY, 22);
      const color = this.getItemColor(p.type);
      glowGrad.addColorStop(0, color);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(p.x, bobY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Render Item Icon / Model
      this.renderItemIcon(ctx, p.type, p.x, bobY);
    }

    ctx.restore();
  }

  private getItemColor(type: ItemType): string {
    switch (type) {
      case 'health':
        return 'rgba(34, 197, 94, 0.35)'; // Green
      case 'fuel':
        return 'rgba(6, 182, 212, 0.35)'; // Cyan
      case 'grenade':
        return 'rgba(234, 179, 8, 0.35)'; // Yellow
      case 'sniper':
        return 'rgba(168, 85, 247, 0.35)';
      case 'rocket':
        return 'rgba(239, 68, 68, 0.35)';
      case 'shotgun':
        return 'rgba(251, 146, 60, 0.35)';
      case 'rifle':
        return 'rgba(56, 189, 248, 0.35)';
      case 'pistol':
        return 'rgba(250, 204, 21, 0.35)';
    }
  }

  private renderItemIcon(ctx: CanvasRenderingContext2D, type: ItemType, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);

    if (type === 'health') {
      // White medkit box with red cross
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-12, -9, 24, 18);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-12, -9, 24, 18);

      // Red cross
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-3, -7, 6, 14);
      ctx.fillRect(-7, -3, 14, 6);
    } else if (type === 'fuel') {
      // Blue/Cyan Jerrycan canister
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-10, -11, 20, 22);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-7, -8, 14, 16);

      // Lightning bolt icon
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(1, -6);
      ctx.lineTo(-4, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(-2, 6);
      ctx.lineTo(4, -1);
      ctx.lineTo(0, -1);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'grenade') {
      // Grenade item icon
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-2, -9, 4, 4);
    } else {
      // Weapon pedestal drop
      const def = WEAPON_DEFINITIONS[type];
      ctx.font = '16px "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, 0, 0);

      // Mini weapon badge
      ctx.fillStyle = def.color;
      ctx.font = '900 8px "Orbitron", sans-serif';
      ctx.fillText(def.name.split(' ')[0].toUpperCase(), 0, 14);
    }

    ctx.restore();
  }
}
