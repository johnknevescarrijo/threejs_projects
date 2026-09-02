import { MAP_HEIGHT, MAP_WIDTH } from '../map/MapData';

export class Camera {
  public x = 0;
  public y = 0;
  public width = 1280;
  public height = 720;
  public zoom = 1.0;

  private targetX = 0;
  private targetY = 0;
  private shakeIntensity = 0;
  private shakeDecay = 0.9;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.resize(viewportWidth, viewportHeight);
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    // Calculate adaptive zoom for different screen sizes
    if (width < 900) {
      this.zoom = 0.85;
    } else {
      this.zoom = 1.0;
    }
  }

  public follow(targetX: number, targetY: number, dt: number, lerpFactor = 8) {
    this.targetX = targetX;
    this.targetY = targetY;

    // Smooth lerp
    const effectiveLerp = 1 - Math.exp(-lerpFactor * dt);
    this.x += (this.targetX - this.x) * effectiveLerp;
    this.y += (this.targetY - this.y) * effectiveLerp;

    // Apply and decay screen shake
    if (this.shakeIntensity > 0.1) {
      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeIntensity *= Math.pow(this.shakeDecay, dt * 60);
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.shakeIntensity = 0;
    }

    // Clamp camera within map bounds
    const halfW = (this.width / 2) / this.zoom;
    const halfH = (this.height / 2) / this.zoom;

    this.x = Math.max(halfW, Math.min(MAP_WIDTH - halfW, this.x));
    this.y = Math.max(halfH, Math.min(MAP_HEIGHT - halfH, this.y));
  }

  public addShake(intensity: number) {
    this.shakeIntensity = Math.min(45, this.shakeIntensity + intensity);
  }

  public applyTransform(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x + this.shakeOffsetX, -this.y + this.shakeOffsetY);
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const centeredX = (screenX - this.width / 2) / this.zoom;
    const centeredY = (screenY - this.height / 2) / this.zoom;
    return {
      x: centeredX + this.x - this.shakeOffsetX,
      y: centeredY + this.y - this.shakeOffsetY
    };
  }

  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const offsetX = (worldX - (this.x - this.shakeOffsetX)) * this.zoom;
    const offsetY = (worldY - (this.y - this.shakeOffsetY)) * this.zoom;
    return {
      x: offsetX + this.width / 2,
      y: offsetY + this.height / 2
    };
  }

  public getVisibleBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const halfW = (this.width / 2) / this.zoom;
    const halfH = (this.height / 2) / this.zoom;
    return {
      minX: this.x - halfW - 100,
      maxX: this.x + halfW + 100,
      minY: this.y - halfH - 100,
      maxY: this.y + halfH + 100
    };
  }
}
