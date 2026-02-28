/** Lightweight particle system for visual effects */

import { randomRange, randomAngle, TWO_PI } from './math';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; sizeEnd: number;
  color: string;
  alpha: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private pool: Particle[] = [];

  private alloc(): Particle {
    return this.pool.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 4, sizeEnd: 0, color: '#fff', alpha: 1 };
  }

  emit(x: number, y: number, count: number, opts: {
    color?: string;
    speed?: number;
    speedVar?: number;
    life?: number;
    lifeVar?: number;
    size?: number;
    sizeEnd?: number;
    angle?: number;
    spread?: number;
  } = {}): void {
    const { color = '#ffffff', speed = 100, speedVar = 40, life = 0.5, lifeVar = 0.2, size = 4, sizeEnd = 0, angle, spread = TWO_PI } = opts;

    for (let i = 0; i < count; i++) {
      const p = this.alloc();
      const a = angle !== undefined ? angle + randomRange(-spread / 2, spread / 2) : randomAngle();
      const s = speed + randomRange(-speedVar, speedVar);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = life + randomRange(-lifeVar, lifeVar);
      p.maxLife = p.life;
      p.size = size;
      p.sizeEnd = sizeEnd;
      p.color = color;
      p.alpha = 1;
      this.particles.push(p);
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.push(p);
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Sort by color to batch fillStyle changes (reduces GPU state flushes)
    this.particles.sort((a, b) => (a.color < b.color ? -1 : a.color > b.color ? 1 : 0));

    let lastColor = '';
    for (const p of this.particles) {
      const t = 1 - p.life / p.maxLife;
      const size = p.size + (p.sizeEnd - p.size) * t;
      ctx.globalAlpha = (1 - t) * 0.9;
      if (p.color !== lastColor) {
        ctx.fillStyle = p.color;
        lastColor = p.color;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(size, 0.5), 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  get count(): number { return this.particles.length; }
}
