/** Canvas2D drawing helpers — extracted from core for game-level rendering */

import type { Vec2, ParticleSystem, FloatingTextManager } from '@survivors/core';
import { TWO_PI } from '@survivors/core';

/** Draw a virtual joystick (for mobile) */
export function drawJoystick(
  ctx: CanvasRenderingContext2D,
  start: Readonly<Vec2>,
  current: Readonly<Vec2>,
  color: string,
): void {
  const sx = start.x, sy = start.y;
  const cx = current.x, cy = current.y;

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(sx, sy, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = color;
  const dx = cx - sx, dy = cy - sy;
  const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.arc(sx + Math.cos(angle) * dist, sy + Math.sin(angle) * dist, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw all active particles to a Canvas2D context */
export function drawParticles(ctx: CanvasRenderingContext2D, system: ParticleSystem): void {
  let lastColor = '';
  for (const p of system.activeParticles) {
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

/** Draw floating text to a Canvas2D context */
export function drawFloatingText(ctx: CanvasRenderingContext2D, manager: FloatingTextManager): void {
  for (const ft of manager.items) {
    const t = ft.life / ft.maxLife;
    ctx.globalAlpha = t;
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${ft.size}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}

/** Apply Camera2D transform to a Canvas2D context */
export function applyCameraToContext(
  ctx: CanvasRenderingContext2D,
  pos: Readonly<Vec2>,
  shakeOffset: Readonly<Vec2>,
  width: number,
  height: number,
): void {
  ctx.translate(
    Math.round(width / 2 - pos.x + shakeOffset.x),
    Math.round(height / 2 - pos.y + shakeOffset.y),
  );
}
