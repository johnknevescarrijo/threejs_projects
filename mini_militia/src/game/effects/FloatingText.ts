export interface FloatingTextItem {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  vy: number;
  vx: number;
  scale: number;
}

export class FloatingTextManager {
  private items: FloatingTextItem[] = [];
  private nextId = 0;

  public add(x: number, y: number, text: string, color = '#facc15', size = 18, isCritical = false) {
    this.items.push({
      id: this.nextId++,
      x: x + (Math.random() * 20 - 10),
      y: y - 10,
      text,
      color,
      size: isCritical ? size * 1.4 : size,
      life: 0.8,
      maxLife: 0.8,
      vy: -60 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 40,
      scale: isCritical ? 1.5 : 1.0
    });
  }

  public update(dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life -= dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.vy += 30 * dt; // slight downward deceleration

      if (item.life <= 0) {
        this.items.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const item of this.items) {
      const progress = item.life / item.maxLife;
      const alpha = Math.min(1, progress * 1.5);
      const scale = 1 + (1 - progress) * 0.2;

      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${Math.round(item.size)}px "Orbitron", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(item.text, 0, 0);

      // Fill
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  public clear() {
    this.items = [];
  }
}
