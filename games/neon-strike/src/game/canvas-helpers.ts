/** Canvas drawing helpers */

import type { Camera2D, ParticleSystem, FloatingTextManager } from '@survivors/core';

const TWO_PI = Math.PI * 2;

export function applyCameraToContext(ctx: CanvasRenderingContext2D, camera: Camera2D): void {
  const cx = camera.width / 2 - camera.pos.x - camera.shakeOffset.x;
  const cy = camera.height / 2 - camera.pos.y - camera.shakeOffset.y;
  ctx.translate(cx, cy);
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: string,
  x: number, y: number,
  size: number, color: string,
  glow: string | undefined, glowSize: number,
  rotation: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);

  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = glowSize;
  }
  ctx.fillStyle = color;

  switch (shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, TWO_PI);
      ctx.fill();
      break;
    case 'square':
    case 'crate':
      ctx.fillRect(-size, -size, size * 2, size * 2);
      break;
    case 'barrel':
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, TWO_PI);
      ctx.fill();
      // inner ring
      ctx.strokeStyle = color === '#ff6633' ? '#cc4422' : '#886644';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.6, 0, TWO_PI);
      ctx.stroke();
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size, 0);
      ctx.closePath();
      ctx.fill();
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.87, size * 0.5);
      ctx.lineTo(-size * 0.87, size * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    case 'star4': {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TWO_PI - Math.PI / 2;
        const r = i % 2 === 0 ? size : size * 0.45;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'spike': {
      const spikes = 6;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * TWO_PI - Math.PI / 2;
        const r = i % 2 === 0 ? size : size * 0.55;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'rocket': {
      // Arrow/rocket shape
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.5, size * 0.3);
      ctx.lineTo(size * 0.2, size * 0.2);
      ctx.lineTo(size * 0.2, size);
      ctx.lineTo(-size * 0.2, size);
      ctx.lineTo(-size * 0.2, size * 0.2);
      ctx.lineTo(-size * 0.5, size * 0.3);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, TWO_PI);
      ctx.fill();
  }

  ctx.restore();
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: ParticleSystem): void {
  for (const p of particles.activeParticles) {
    const t = p.life / p.maxLife;
    const s = p.size + (p.sizeEnd - p.size) * (1 - t);
    ctx.globalAlpha = t;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, s), 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawFloatingText(ctx: CanvasRenderingContext2D, ft: FloatingTextManager): void {
  for (const t of ft.items) {
    const alpha = t.life / t.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.size}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

export function drawJoystick(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
): void {
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(start.x, start.y, 50, 0, TWO_PI);
  ctx.stroke();

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(current.x, current.y, 20, 0, TWO_PI);
  ctx.fill();
  ctx.globalAlpha = 1;
}
