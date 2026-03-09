/**
 * Canvas 2D neon-style renderer for Neon Dash.
 * Handles background, ground, obstacles, player, particles, and effects.
 */

import type { ParticleSystem } from '@survivors/core';
import { TWO_PI } from '@survivors/core';
import {
  BG_COLOR, GROUND_COLOR, GROUND_LINE_COLOR, GRID_COLOR,
  SPIKE_COLOR, SPIKE_GLOW_COLOR, BLOCK_COLOR, BLOCK_GLOW_COLOR,
  PLAYER_SIZE, STAR_COLORS,
  CEILING_LINE_COLOR,
} from './config';
import type { ObstacleType, LevelData } from './config';

// ── Background stars ─────────────────────────────────────────────────

interface Star {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  twinkleOffset: number;
}

let stars: Star[] = [];
let starsInited = false;

function initStars(w: number, h: number): void {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * w * 3,
      y: Math.random() * h,
      size: Math.random() * 2 + 0.5,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      speed: 0.1 + Math.random() * 0.3,
      twinkleOffset: Math.random() * TWO_PI,
    });
  }
  starsInited = true;
}

// ── Camera ───────────────────────────────────────────────────────────

let camX = 0;

export function resetCamera(): void {
  camX = 0;
}

export function updateCamera(playerX: number, canvasWidth: number): void {
  const targetX = playerX - canvasWidth * 0.3;
  camX += (targetX - camX) * 0.1;
}

export function getCameraX(): number {
  return camX;
}

// ── Main render ──────────────────────────────────────────────────────

export function renderGame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  playerX: number,
  playerY: number,
  playerRotation: number,
  playerAlive: boolean,
  obstacles: Array<{ type: ObstacleType; x: number; y: number; w: number; h: number }>,
  groundY: number,
  particles: ParticleSystem,
  time: number,
  level: LevelData,
  progress: number,
): void {
  const w = canvas.width;
  const h = canvas.height;

  if (!starsInited) initStars(w, h);

  // Clear
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, w, h);

  // Draw stars (parallax)
  drawStars(ctx, w, h, time);

  // Draw grid
  drawGrid(ctx, w, h, groundY);

  ctx.save();
  ctx.translate(-camX, 0);

  // Draw ground
  drawGround(ctx, w, h, groundY);

  // Draw ceiling line
  drawCeiling(ctx, w, groundY);

  // Draw obstacles
  for (const obs of obstacles) {
    drawObstacle(ctx, obs.type, obs.x, obs.y, obs.w, obs.h, time, level.color);
  }

  // Draw player
  if (playerAlive) {
    drawPlayer(ctx, playerX, playerY, playerRotation, time, level.color, level.glowColor);
  }

  // Draw particles
  drawParticles(ctx, particles);

  ctx.restore();

  // Draw progress bar (screen space)
  drawProgressBar(ctx, w, progress, level.color);
}

// ── Stars ────────────────────────────────────────────────────────────

function drawStars(ctx: CanvasRenderingContext2D, w: number, _h: number, time: number): void {
  for (const star of stars) {
    const twinkle = Math.sin(time * 2 + star.twinkleOffset) * 0.3 + 0.7;
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = star.color;
    const sx = ((star.x - camX * star.speed) % (w * 2) + w * 2) % (w * 2);
    if (sx < w) {
      ctx.beginPath();
      ctx.arc(sx, star.y, star.size, 0, TWO_PI);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ── Grid ─────────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, w: number, _h: number, groundY: number): void {
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  const gridSize = 80;
  const offsetX = (-camX % gridSize + gridSize) % gridSize;
  for (let x = offsetX; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, groundY);
    ctx.stroke();
  }
  for (let y = 0; y < groundY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

// ── Ground ───────────────────────────────────────────────────────────

function drawGround(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  groundY: number,
): void {
  const startX = camX;
  const endX = camX + w;

  // Ground fill
  ctx.fillStyle = GROUND_COLOR;
  ctx.fillRect(startX, groundY, endX - startX, 200);

  // Neon ground line
  ctx.strokeStyle = GROUND_LINE_COLOR;
  ctx.lineWidth = 3;
  ctx.shadowColor = GROUND_LINE_COLOR;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(startX, groundY);
  ctx.lineTo(endX, groundY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Ground grid
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  const gridSize = PLAYER_SIZE;
  const gStartX = Math.floor(startX / gridSize) * gridSize;
  for (let x = gStartX; x < endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, groundY + 200);
    ctx.stroke();
  }
  for (let y = groundY; y < groundY + 200; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
}

// ── Ceiling ──────────────────────────────────────────────────────────

function drawCeiling(ctx: CanvasRenderingContext2D, w: number, groundY: number): void {
  const ceilY = groundY - PLAYER_SIZE * 10;
  if (ceilY < 0) return;
  ctx.strokeStyle = CEILING_LINE_COLOR;
  ctx.lineWidth = 2;
  ctx.shadowColor = CEILING_LINE_COLOR;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(camX, ceilY);
  ctx.lineTo(camX + w, ceilY);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ── Obstacles ────────────────────────────────────────────────────────

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  type: ObstacleType,
  x: number,
  y: number,
  _w: number,
  h: number,
  time: number,
  levelColor: string,
): void {
  switch (type) {
    case 'spike':
    case 'spike_down':
      drawSpike(ctx, x, y, h, time, type === 'spike_down');
      break;
    case 'double_spike':
      drawDoubleSpike(ctx, x, y, h, time);
      break;
    case 'block':
    case 'tall_block':
      drawBlock(ctx, x, y, _w, h, time, levelColor);
      break;
  }
}

function drawSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number,
  flipped: boolean,
): void {
  const pulse = Math.sin(time * 4) * 2;

  // Glow
  ctx.shadowColor = SPIKE_COLOR;
  ctx.shadowBlur = 12 + pulse;

  ctx.fillStyle = SPIKE_COLOR;
  ctx.strokeStyle = SPIKE_GLOW_COLOR;
  ctx.lineWidth = 2;

  ctx.beginPath();
  if (flipped) {
    ctx.moveTo(x - size / 2, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x + size / 2, y);
  } else {
    ctx.moveTo(x - size / 2, y + size);
    ctx.lineTo(x, y);
    ctx.lineTo(x + size / 2, y + size);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawDoubleSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number,
): void {
  drawSpike(ctx, x - size * 0.35, y, size, time, false);
  drawSpike(ctx, x + size * 0.35, y, size, time, false);
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
  color: string,
): void {
  const pulse = Math.sin(time * 3) * 1.5;

  ctx.shadowColor = color;
  ctx.shadowBlur = 8 + pulse;

  ctx.fillStyle = BLOCK_COLOR;
  ctx.strokeStyle = BLOCK_GLOW_COLOR;
  ctx.lineWidth = 2;
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.strokeRect(x - w / 2, y, w, h);

  // Inner cross pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x - w / 2, y + h);
  ctx.stroke();

  ctx.shadowBlur = 0;
}

// ── Player ───────────────────────────────────────────────────────────

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  time: number,
  color: string,
  glowColor: string,
): void {
  const size = PLAYER_SIZE;
  const pulse = Math.sin(time * 5) * 2;

  ctx.save();
  ctx.translate(x, y + size / 2);
  ctx.rotate(rotation);

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 20 + pulse;

  // Outer glow ring
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.8, 0, TWO_PI);
  ctx.fill();

  // Main cube
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);

  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(-size / 2, -size / 2, size, size);

  // Inner detail
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  const inner = size * 0.3;
  ctx.strokeRect(-inner, -inner, inner * 2, inner * 2);

  // Eye / icon
  ctx.fillStyle = '#ffffff';
  const eyeSize = size * 0.15;
  ctx.beginPath();
  ctx.arc(size * 0.1, -size * 0.05, eyeSize, 0, TWO_PI);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ── Particles ────────────────────────────────────────────────────────

function drawParticles(ctx: CanvasRenderingContext2D, system: ParticleSystem): void {
  for (const p of system.activeParticles) {
    const t = 1 - p.life / p.maxLife;
    const size = p.size + (p.sizeEnd - p.size) * t;
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(size, 0.5), 0, TWO_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// ── Progress bar ─────────────────────────────────────────────────────

function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  progress: number,
  color: string,
): void {
  const barW = canvasWidth * 0.35;
  const barH = 6;
  const barX = (canvasWidth - barW) / 2;
  const barY = 16;

  // Background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(barX, barY, barW, barH);

  // Fill
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillRect(barX, barY, barW * Math.min(progress, 1), barH);
  ctx.shadowBlur = 0;

  // Percentage text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(progress * 100)}%`, canvasWidth / 2, barY + barH + 16);
}
