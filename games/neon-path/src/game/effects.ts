/** Neon Path — visual effects: pixel death explosion */

import type { Player } from './physics';
import { PLAYER_W, PLAYER_H } from './config';

const PIXEL_COLORS = [
  '#e8f8ff', '#e8f8ff', '#00d4ff', '#00d4ff', // mostly white/cyan
  '#ff2060', '#7b2dff', '#00ff88', '#ffffff',
];

export interface Pixel {
  x: number;  y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number; // alpha lost per second
}

export interface PixelExplosion {
  pixels: Pixel[];
  done: boolean;
}

export function createPixelExplosion(player: Player): PixelExplosion {
  const pixels: Pixel[] = [];
  const cx = player.x + PLAYER_W / 2;
  const cy = player.y + PLAYER_H / 2;

  for (let i = 0; i < 72; i++) {
    const angle = Math.random() * Math.PI * 2;
    // Burst spread: inner cluster + outer scatter
    const speed = i < 30
      ? 60  + Math.random() * 160  // compact burst
      : 180 + Math.random() * 280; // far scatter
    const size = Math.ceil(Math.random() * 4);

    pixels.push({
      x: cx + (Math.random() - 0.5) * PLAYER_W * 0.8,
      y: cy + (Math.random() - 0.5) * PLAYER_H * 0.8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80, // slight upward bias
      size,
      color: PIXEL_COLORS[Math.floor(Math.random() * PIXEL_COLORS.length)]!,
      alpha: 1,
      decay: 0.6 + Math.random() * 1.0,
    });
  }

  return { pixels, done: false };
}

export function updatePixelExplosion(effect: PixelExplosion, dt: number): void {
  let alive = 0;
  for (const p of effect.pixels) {
    if (p.alpha <= 0) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 520 * dt; // gravity
    p.vx *= Math.pow(0.88, dt * 60); // air drag (frame-rate independent)
    p.alpha = Math.max(0, p.alpha - p.decay * dt);
    alive++;
  }
  effect.done = alive === 0;
}

export function drawPixelExplosion(ctx: CanvasRenderingContext2D, effect: PixelExplosion): void {
  for (const p of effect.pixels) {
    if (p.alpha <= 0) continue;
    ctx.globalAlpha = Math.min(1, p.alpha);
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.size * 3;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}
