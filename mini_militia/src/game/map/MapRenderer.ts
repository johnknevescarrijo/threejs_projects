import { MAP_HEIGHT, MAP_WIDTH } from './MapData';
import { Platform } from '../types';

export class MapRenderer {
  // Parallax background elements
  private stars: { x: number; y: number; size: number; alpha: number }[] = [];
  private trees: { x: number; y: number; height: number; width: number; color: string }[] = [];
  private fireflies: { x: number; y: number; vx: number; vy: number; radius: number; phase: number }[] = [];

  constructor() {
    this.generateBackground();
  }

  private generateBackground() {
    // Generate background trees
    for (let x = -200; x < MAP_WIDTH + 200; x += 140) {
      this.trees.push({
        x: x + Math.random() * 40,
        y: MAP_HEIGHT - 60,
        height: 250 + Math.random() * 200,
        width: 100 + Math.random() * 80,
        color: Math.random() < 0.5 ? '#064e3b' : '#042f2e'
      });
    }

    // Fireflies / floating jungle particles
    for (let i = 0; i < 40; i++) {
      this.fireflies.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        radius: 1.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  public update(dt: number) {
    for (const f of this.fireflies) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.phase += dt * 3;

      if (f.x < 0) f.x = MAP_WIDTH;
      if (f.x > MAP_WIDTH) f.x = 0;
      if (f.y < 0) f.y = MAP_HEIGHT;
      if (f.y > MAP_HEIGHT) f.y = 0;
    }
  }

  public renderBackground(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewWidth: number, viewHeight: number) {
    // Sky gradient with dark jungle military atmosphere
    const skyGrad = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
    skyGrad.addColorStop(0, '#020617'); // Dark night sky
    skyGrad.addColorStop(0.5, '#061b1b'); // Dark teal/jungle mist
    skyGrad.addColorStop(1, '#062817'); // Rich jungle floor
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Parallax distant mountains / jungle canopy
    ctx.save();
    ctx.fillStyle = '#031a14';
    ctx.beginPath();
    ctx.moveTo(0, MAP_HEIGHT);
    for (let x = 0; x <= MAP_WIDTH; x += 300) {
      const hillHeight = 600 + Math.sin(x * 0.003) * 140;
      ctx.lineTo(x, MAP_HEIGHT - hillHeight);
    }
    ctx.lineTo(MAP_WIDTH, MAP_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Distant background trees
    for (const tree of this.trees) {
      ctx.fillStyle = tree.color;
      ctx.beginPath();
      // Trunk
      ctx.fillRect(tree.x - 12, tree.y - tree.height, 24, tree.height);
      // Canopy layers
      ctx.arc(tree.x, tree.y - tree.height, tree.width * 0.6, 0, Math.PI * 2);
      ctx.arc(tree.x - 25, tree.y - tree.height * 0.75, tree.width * 0.45, 0, Math.PI * 2);
      ctx.arc(tree.x + 25, tree.y - tree.height * 0.75, tree.width * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Draw fireflies
    ctx.save();
    for (const f of this.fireflies) {
      const alpha = 0.3 + 0.7 * Math.abs(Math.sin(f.phase));
      ctx.fillStyle = `rgba(163, 230, 53, ${alpha})`;
      ctx.shadowColor = '#a3e635';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  public renderPlatforms(ctx: CanvasRenderingContext2D, platforms: Platform[]) {
    ctx.save();
    for (const p of platforms) {
      if (p.type === 'bridge') {
        // Render suspension bridge with wooden planks and steel ropes
        ctx.fillStyle = '#78350f';
        ctx.fillRect(p.x, p.y, p.width, p.height);

        // Plank seams
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        for (let bx = p.x; bx < p.x + p.width; bx += 18) {
          ctx.beginPath();
          ctx.moveTo(bx, p.y);
          ctx.lineTo(bx, p.y + p.height);
          ctx.stroke();
        }

        // Top rope
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 10);
        ctx.quadraticCurveTo(p.x + p.width / 2, p.y - 2, p.x + p.width, p.y - 10);
        ctx.stroke();

        // Support vertical ropes
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
        for (let bx = p.x + 20; bx < p.x + p.width - 10; bx += 35) {
          ctx.beginPath();
          ctx.moveTo(bx, p.y - 8);
          ctx.lineTo(bx, p.y);
          ctx.stroke();
        }
      } else {
        // Solid rock/metal platforms with high tech military finish
        const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        grad.addColorStop(0, p.color || '#334155');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, p.width, p.height);

        // Top grass/foliage or metallic highlight
        ctx.fillStyle = p.y >= MAP_HEIGHT - 70 ? '#22c55e' : '#475569';
        ctx.fillRect(p.x, p.y, p.width, 5);

        // Platform borders
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x, p.y, p.width, p.height);

        // Tech rivets / hazard stripes on military sections
        if (p.width > 200 && p.height >= 26) {
          ctx.fillStyle = '#facc15';
          for (let rx = p.x + 20; rx < p.x + p.width - 20; rx += 50) {
            ctx.beginPath();
            ctx.arc(rx, p.y + p.height / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  }

  public renderForegroundFoliage(ctx: CanvasRenderingContext2D) {
    // Hanging vines from upper platforms
    ctx.save();
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 3;
    const vinePoints = [
      { x: 300, y: 584, len: 45 },
      { x: 700, y: 624, len: 60 },
      { x: 1000, y: 544, len: 50 },
      { x: 1450, y: 544, len: 65 },
      { x: 1750, y: 624, len: 40 },
      { x: 2100, y: 584, len: 55 }
    ];

    for (const v of vinePoints) {
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.bezierCurveTo(v.x + 8, v.y + v.len * 0.5, v.x - 8, v.y + v.len * 0.8, v.x + 2, v.y + v.len);
      ctx.stroke();

      // Leaf clusters
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(v.x + 4, v.y + v.len * 0.4, 5, 8, Math.PI / 4, 0, Math.PI * 2);
      ctx.ellipse(v.x - 4, v.y + v.len * 0.8, 6, 9, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
