export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  startSize: number;
  endSize: number;
  color: string;
  endColor?: string;
  alpha: number;
  life: number;
  maxLife: number;
  drag: number;
  gravity: number;
  rotation: number;
  vRot: number;
  type: 'circle' | 'spark' | 'smoke' | 'shockwave' | 'casing' | 'blood';
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 600;

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.vy += p.gravity * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;

      const progress = p.life / p.maxLife;
      p.size = p.startSize + (p.endSize - p.startSize) * (1 - progress);
      p.alpha = progress;
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === 'shockwave') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * 0.15);
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'casing') {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
      } else if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 2, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // circle, smoke, fire, blood
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  // Jetpack thruster flame and smoke
  public emitJetpack(x: number, y: number, angle: number) {
    if (this.particles.length > this.maxParticles) return;

    // Fire flame particle
    const flameSpeed = 160 + Math.random() * 80;
    const spread = (Math.random() - 0.5) * 0.4;
    const dir = angle + Math.PI + spread;

    const colors = ['#ff4500', '#ff8c00', '#ffd700', '#00e5ff'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: Math.cos(dir) * flameSpeed,
      vy: Math.sin(dir) * flameSpeed,
      size: 6,
      startSize: 6,
      endSize: 1,
      color,
      alpha: 1,
      life: 0.18 + Math.random() * 0.08,
      maxLife: 0.25,
      drag: 0.92,
      gravity: 50,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 5,
      type: 'circle'
    });

    // Smoke particle
    if (Math.random() < 0.4) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(dir) * (flameSpeed * 0.6) + (Math.random() - 0.5) * 30,
        vy: Math.sin(dir) * (flameSpeed * 0.6) - 20,
        size: 4,
        startSize: 4,
        endSize: 12 + Math.random() * 6,
        color: '#64748b',
        alpha: 0.6,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        drag: 0.94,
        gravity: -20,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 2,
        type: 'smoke'
      });
    }
  }

  // Muzzle flash and shell casing
  public emitMuzzle(x: number, y: number, angle: number, isHeavy = false) {
    if (this.particles.length > this.maxParticles) return;

    // Flash sparks
    const count = isHeavy ? 8 : 4;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.6;
      const speed = 120 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        size: 3,
        startSize: 3,
        endSize: 0.5,
        color: '#fde047',
        alpha: 1,
        life: 0.08 + Math.random() * 0.06,
        maxLife: 0.14,
        drag: 0.85,
        gravity: 0,
        rotation: angle,
        vRot: 0,
        type: 'spark'
      });
    }

    // Shell casing ejection
    const ejectAngle = angle + (Math.PI / 2) + (Math.random() - 0.5) * 0.4;
    const ejectSpeed = 90 + Math.random() * 50;
    this.particles.push({
      x,
      y,
      vx: Math.cos(ejectAngle) * ejectSpeed,
      vy: Math.sin(ejectAngle) * ejectSpeed - 60,
      size: 2.5,
      startSize: 2.5,
      endSize: 2.5,
      color: '#eab308',
      alpha: 1,
      life: 0.5,
      maxLife: 0.5,
      drag: 0.98,
      gravity: 500,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 20,
      type: 'casing'
    });
  }

  // Bullet impact sparks / hit blood
  public emitHit(x: number, y: number, normalX: number, normalY: number, isBlood = false) {
    const count = isBlood ? 7 : 5;
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(normalY, normalX) + (Math.random() - 0.5) * 1.2;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: isBlood ? 3.5 : 2.5,
        startSize: isBlood ? 3.5 : 2.5,
        endSize: 0.5,
        color: isBlood ? (Math.random() < 0.5 ? '#dc2626' : '#991b1b') : '#facc15',
        alpha: 1,
        life: 0.2 + Math.random() * 0.15,
        maxLife: 0.35,
        drag: 0.92,
        gravity: isBlood ? 400 : 200,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 10,
        type: isBlood ? 'blood' : 'spark'
      });
    }
  }

  // Large explosive blast
  public emitExplosion(x: number, y: number, radius = 100) {
    // Shockwave ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 10,
      startSize: 10,
      endSize: radius * 1.3,
      color: '#fdba74',
      alpha: 1,
      life: 0.3,
      maxLife: 0.3,
      drag: 1,
      gravity: 0,
      rotation: 0,
      vRot: 0,
      type: 'shockwave'
    });

    // Core fireball particles
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * (radius * 2.2);
      const colors = ['#ef4444', '#f97316', '#fbbf24', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: x + Math.cos(angle) * (radius * 0.15),
        y: y + Math.sin(angle) * (radius * 0.15),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 12 + Math.random() * 14,
        startSize: 12 + Math.random() * 14,
        endSize: 2,
        color,
        alpha: 1,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        drag: 0.88,
        gravity: 40,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 8,
        type: 'circle'
      });
    }

    // Heavy dark smoke clouds
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * (radius * 1.2);
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 10,
        startSize: 10,
        endSize: 26 + Math.random() * 16,
        color: Math.random() < 0.5 ? '#334155' : '#1e293b',
        alpha: 0.8,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        drag: 0.92,
        gravity: -25,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 2,
        type: 'smoke'
      });
    }
  }

  // Rocket exhaust trail
  public emitRocketTrail(x: number, y: number, angle: number) {
    if (this.particles.length > this.maxParticles) return;
    const backAngle = angle + Math.PI + (Math.random() - 0.5) * 0.3;
    const speed = 40 + Math.random() * 40;

    this.particles.push({
      x,
      y,
      vx: Math.cos(backAngle) * speed,
      vy: Math.sin(backAngle) * speed,
      size: 5,
      startSize: 5,
      endSize: 14,
      color: Math.random() < 0.6 ? '#f97316' : '#64748b',
      alpha: 0.7,
      life: 0.3 + Math.random() * 0.15,
      maxLife: 0.45,
      drag: 0.9,
      gravity: -10,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 3,
      type: 'smoke'
    });
  }

  // Item pickup glow burst
  public emitPickupGlow(x: number, y: number, color = '#38bdf8') {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 60 + Math.random() * 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4,
        startSize: 4,
        endSize: 0.5,
        color,
        alpha: 1,
        life: 0.35,
        maxLife: 0.35,
        drag: 0.9,
        gravity: 0,
        rotation: 0,
        vRot: 0,
        type: 'spark'
      });
    }
  }

  public clear() {
    this.particles = [];
  }
}
