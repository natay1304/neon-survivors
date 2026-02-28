/**
 * Canvas 2D drawing helpers — reusable across all games.
 *
 * Functions for rendering particles, floating text, joysticks,
 * camera transforms, and UI primitives on a Canvas2D context.
 */

import type { Vec2 } from './math';
import { TWO_PI } from './math';
import type { ParticleSystem } from './particles';
import type { FloatingTextManager } from './utils';

// ── Particle rendering ───────────────────────────────────────────────

/** Draw all active particles from a ParticleSystem to a Canvas2D context. */
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

// ── Floating text rendering ──────────────────────────────────────────

/** Draw all floating text entries from a FloatingTextManager. */
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

// ── Camera transform ─────────────────────────────────────────────────

/** Apply a 2D camera offset (position + shake) to a Canvas2D context. */
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

// ── Virtual joystick ─────────────────────────────────────────────────

/** Draw a virtual joystick (for mobile). */
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
  ctx.arc(sx, sy, 60, 0, TWO_PI);
  ctx.fill();

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = color;
  const dx = cx - sx, dy = cy - sy;
  const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.arc(sx + Math.cos(angle) * dist, sy + Math.sin(angle) * dist, 24, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
}

// ── UI primitives ────────────────────────────────────────────────────

/** Trace a rounded rectangle path (does not fill or stroke). */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw a styled button (rounded rectangle with label).
 *
 * @param ctx — Canvas 2D context
 * @param x — top-left X
 * @param y — top-left Y
 * @param w — width
 * @param h — height
 * @param label — button text
 * @param color — accent color (border)
 * @param options — optional overrides
 */
export function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  label: string,
  color: string,
  options: {
    bgColor?: string;
    textColor?: string;
    font?: string;
    borderRadius?: number;
    borderWidth?: number;
  } = {},
): void {
  const {
    bgColor = '#1a1a3e',
    textColor = '#ffffff',
    font = 'bold 18px system-ui, sans-serif',
    borderRadius = 8,
    borderWidth = 2,
  } = options;

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = color;
  ctx.lineWidth = borderWidth;
  roundRect(ctx, x, y, w, h, borderRadius);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}
