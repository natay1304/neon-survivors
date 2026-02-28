/**
 * Canvas 2D renderer for Gravity Swoop.
 *
 * Rendering pipeline:
 *  1. Background (space + stars)
 *  2. Camera transform (follow bird)
 *  3. Level bounds / decorative walls
 *  4. Obstacles
 *  5. Collectibles (seeds)
 *  6. Goal (feeder)
 *  7. Gravity well effect
 *  8. Bird
 *  9. Particles
 * 10. Restore → HUD
 */

import { type ParticleSystem } from '@survivors/core';
import {
  C, type PosData, type VelData, type BirdData, type GravityPointData,
  type ObstacleData, type CollectibleData, type ColliderData,
} from './components';
import {
  BG_COLOR, BIRD_RADIUS, BIRD_BODY_COLOR, BIRD_BELLY_COLOR,
  BIRD_BEAK_COLOR, BIRD_EYE_COLOR, GRAVITY_WELL_COLOR,
  SEED_COLOR, GOAL_COLOR, GOAL_RADIUS, OBSTACLE_COLORS,
  STAR_COLORS, CAMERA_SMOOTHING, CAMERA_LOOKAHEAD,
} from './config';
import type { GameState } from './systems';

// Pre-generated star field (generated once)
interface Star { x: number; y: number; size: number; color: string; layer: number }
let stars: Star[] = [];

function ensureStars(count: number, w: number, h: number): void {
  if (stars.length >= count) return;
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w * 3 - w,
      y: Math.random() * h * 3 - h,
      size: 0.5 + Math.random() * 1.5,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      layer: Math.random() < 0.5 ? 0 : 1,
    });
  }
}

// Camera position (smoothed)
let camX = 0;
let camY = 0;

export function resetCamera(x: number, y: number): void {
  camX = x;
  camY = y;
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameState,
  time: number,
): void {
  const w = canvas.width;
  const h = canvas.height;
  const { world, birdId, particles, levelData } = state;

  // --- Update camera ---
  if (world.isAlive(birdId)) {
    const birdPos = world.get<PosData>(birdId, C.Pos);
    const birdVel = world.maybe<VelData>(birdId, C.Vel);
    let targetX = birdPos.x;
    let targetY = birdPos.y;
    if (birdVel) {
      const speed = Math.sqrt(birdVel.x * birdVel.x + birdVel.y * birdVel.y);
      if (speed > 10) {
        targetX += (birdVel.x / speed) * CAMERA_LOOKAHEAD;
        targetY += (birdVel.y / speed) * CAMERA_LOOKAHEAD;
      }
    }
    camX += (targetX - camX) * CAMERA_SMOOTHING;
    camY += (targetY - camY) * CAMERA_SMOOTHING;
  }

  const offsetX = w / 2 - camX;
  const offsetY = h / 2 - camY;

  // ---- 1. Background ----
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, w, h);

  // Stars (parallax)
  ensureStars(200, w, h);
  for (let i = 0; i < stars.length; i++) {
    const st = stars[i];
    const parallax = st.layer === 0 ? 0.1 : 0.2;
    const sx = st.x + camX * parallax;
    const sy = st.y + camY * parallax;
    // Wrap
    const wx = ((sx % w) + w) % w;
    const wy = ((sy % h) + h) % h;
    ctx.fillStyle = st.color;
    ctx.globalAlpha = 0.4 + st.size * 0.2;
    ctx.fillRect(wx, wy, st.size, st.size);
  }
  ctx.globalAlpha = 1;

  // ---- 2. Camera transform ----
  ctx.save();
  ctx.translate(offsetX, offsetY);

  // ---- 3. Level bounds (subtle border) ----
  ctx.strokeStyle = '#223355';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, levelData.width, levelData.height);

  // Background grid dots
  ctx.fillStyle = '#151540';
  const gridSize = 80;
  const startGx = Math.floor((camX - w / 2) / gridSize) * gridSize;
  const startGy = Math.floor((camY - h / 2) / gridSize) * gridSize;
  for (let gx = startGx; gx < camX + w / 2; gx += gridSize) {
    for (let gy = startGy; gy < camY + h / 2; gy += gridSize) {
      if (gx >= 0 && gx <= levelData.width && gy >= 0 && gy <= levelData.height) {
        ctx.fillRect(gx - 1, gy - 1, 2, 2);
      }
    }
  }

  // ---- 4. Obstacles ----
  for (const eid of world.query(C.Pos, C.Obstacle, C.Collider)) {
    const pos = world.get<PosData>(eid, C.Pos);
    const obs = world.get<ObstacleData>(eid, C.Obstacle);
    const col = world.get<ColliderData>(eid, C.Collider);
    drawObstacle(ctx, pos, obs, col, time);
  }

  // ---- 5. Collectibles (golden seeds) ----
  for (const eid of world.query(C.Pos, C.Collectible)) {
    const pos = world.get<PosData>(eid, C.Pos);
    const col = world.get<CollectibleData>(eid, C.Collectible);
    if (!col.collected) {
      drawSeed(ctx, pos.x, pos.y, time);
    }
  }

  // ---- 6. Goal (feeder) ----
  for (const eid of world.query(C.Pos, C.Goal)) {
    const pos = world.get<PosData>(eid, C.Pos);
    drawGoal(ctx, pos.x, pos.y, time);
  }

  // ---- 7. Gravity well ----
  if (state.gravityPointId >= 0 && world.isAlive(state.gravityPointId)) {
    const gpPos = world.get<PosData>(state.gravityPointId, C.Pos);
    const gp = world.get<GravityPointData>(state.gravityPointId, C.GravityPoint);
    drawGravityWell(ctx, gpPos.x, gpPos.y, gp, time);
  }

  // ---- 8. Bird ----
  if (world.isAlive(birdId)) {
    const birdPos = world.get<PosData>(birdId, C.Pos);
    const bird = world.get<BirdData>(birdId, C.Bird);
    drawBird(ctx, birdPos.x, birdPos.y, bird, time);
  }

  // ---- 9. Particles ----
  drawParticles(ctx, particles);

  // Restore camera
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  bird: BirdData,
  time: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bird.rotation);

  // Death fade
  if (!bird.alive) {
    const t = Math.max(0, bird.deathTimer / 0.8);
    ctx.globalAlpha = t;
  }

  const r = BIRD_RADIUS;

  // Body (green ellipse)
  ctx.fillStyle = BIRD_BODY_COLOR;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = BIRD_BELLY_COLOR;
  ctx.beginPath();
  ctx.ellipse(2, 2, r * 0.6, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing (flap animation)
  const wingAngle = Math.sin(time * 12) * 0.3;
  ctx.save();
  ctx.translate(-4, -3);
  ctx.rotate(wingAngle);
  ctx.fillStyle = BIRD_BODY_COLOR;
  ctx.beginPath();
  ctx.ellipse(0, -4, r * 0.5, r * 0.35, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Beak
  ctx.fillStyle = BIRD_BEAK_COLOR;
  ctx.beginPath();
  ctx.moveTo(r - 2, -2);
  ctx.lineTo(r + 8, 0);
  ctx.lineTo(r - 2, 3);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.25, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BIRD_EYE_COLOR;
  ctx.beginPath();
  ctx.arc(r * 0.5, -r * 0.25, 2, 0, Math.PI * 2);
  ctx.fill();

  // Tail feathers
  ctx.fillStyle = '#33bb44';
  ctx.beginPath();
  ctx.moveTo(-r + 2, 0);
  ctx.lineTo(-r - 8, -5);
  ctx.lineTo(-r - 6, 0);
  ctx.lineTo(-r - 8, 5);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawGravityWell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  gp: GravityPointData,
  time: number,
): void {
  const pulseBase = 20 + gp.age * 30;
  const pulse = pulseBase + Math.sin(time * 8) * 5;
  const maxR = Math.min(pulse, 80);

  // Outer glow
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = GRAVITY_WELL_COLOR;
  ctx.beginPath();
  ctx.arc(x, y, maxR * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Swirl rings
  for (let i = 0; i < 3; i++) {
    const ringR = maxR * (0.4 + i * 0.3);
    const rotOffset = time * (3 + i) + i * 2;
    ctx.globalAlpha = 0.3 - i * 0.08;
    ctx.strokeStyle = GRAVITY_WELL_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, ringR, rotOffset, rotOffset + Math.PI * 1.4);
    ctx.stroke();
  }

  // Core
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#220044';
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = GRAVITY_WELL_COLOR;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  pos: PosData,
  obs: ObstacleData,
  col: ColliderData,
  time: number,
): void {
  const color = OBSTACLE_COLORS[obs.type] || '#ff3344';

  if (obs.type === 'spike') {
    // Triangle spikes
    ctx.fillStyle = color;
    ctx.beginPath();
    const r = col.shape === 'circle' ? col.radius : Math.max(col.width, col.height) / 2;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const px = pos.x + Math.cos(a) * r;
      const py = pos.y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Glow
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (obs.type === 'laser') {
    // Pulsing red beam
    const pulse = 0.6 + Math.sin(time * 6) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = color;
    ctx.fillRect(
      pos.x - col.width / 2,
      pos.y - col.height / 2,
      col.width,
      col.height,
    );
    // Brighter core
    ctx.globalAlpha = pulse * 0.7;
    ctx.fillStyle = '#ff8888';
    const coreW = Math.max(col.width * 0.3, 4);
    const coreH = Math.max(col.height * 0.3, 4);
    ctx.fillRect(
      pos.x - coreW / 2,
      pos.y - coreH / 2,
      coreW,
      coreH,
    );
    ctx.globalAlpha = 1;
  } else if (obs.type === 'cat') {
    // Simple cat face
    const r = col.shape === 'circle' ? col.radius : Math.max(col.width, col.height) / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.moveTo(pos.x - r * 0.7, pos.y - r * 0.5);
    ctx.lineTo(pos.x - r * 0.4, pos.y - r * 1.2);
    ctx.lineTo(pos.x - r * 0.1, pos.y - r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pos.x + r * 0.1, pos.y - r * 0.5);
    ctx.lineTo(pos.x + r * 0.4, pos.y - r * 1.2);
    ctx.lineTo(pos.x + r * 0.7, pos.y - r * 0.5);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ffff88';
    ctx.beginPath();
    ctx.arc(pos.x - r * 0.3, pos.y - r * 0.1, 3, 0, Math.PI * 2);
    ctx.arc(pos.x + r * 0.3, pos.y - r * 0.1, 3, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (slit)
    ctx.fillStyle = '#111';
    ctx.fillRect(pos.x - r * 0.3 - 1, pos.y - r * 0.1 - 2, 2, 5);
    ctx.fillRect(pos.x + r * 0.3 - 1, pos.y - r * 0.1 - 2, 2, 5);

    // Mouth
    ctx.strokeStyle = '#cc6633';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y + r * 0.3, 4, 0, Math.PI);
    ctx.stroke();
  } else {
    // Wall — simple rectangle
    ctx.fillStyle = color;
    ctx.fillRect(
      pos.x - col.width / 2,
      pos.y - col.height / 2,
      col.width,
      col.height,
    );
    // Border
    ctx.strokeStyle = '#778899';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      pos.x - col.width / 2,
      pos.y - col.height / 2,
      col.width,
      col.height,
    );
  }
}

function drawSeed(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const bob = Math.sin(time * 4 + x * 0.01) * 3;
  const spin = time * 3;

  ctx.save();
  ctx.translate(x, y + bob);

  // Glow
  ctx.globalAlpha = 0.2 + Math.sin(time * 5) * 0.1;
  ctx.fillStyle = SEED_COLOR;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Seed body (oval that rotates)
  ctx.fillStyle = SEED_COLOR;
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 4, spin, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = '#ffe566';
  ctx.beginPath();
  ctx.ellipse(-1, -1, 3, 2, spin, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGoal(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const pulse = 1 + Math.sin(time * 3) * 0.15;

  // Outer glow
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = GOAL_COLOR;
  ctx.beginPath();
  ctx.arc(x, y, GOAL_RADIUS * pulse * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Ring
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = GOAL_COLOR;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, GOAL_RADIUS * pulse, 0, Math.PI * 2);
  ctx.stroke();

  // Inner
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = GOAL_COLOR;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();

  // Feeder icon (simple bowl)
  ctx.fillStyle = '#886644';
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(x - 15, y - 2);
  ctx.quadraticCurveTo(x, y + 14, x + 15, y - 2);
  ctx.closePath();
  ctx.fill();

  // Seeds in bowl
  ctx.fillStyle = SEED_COLOR;
  ctx.beginPath();
  ctx.arc(x - 5, y, 3, 0, Math.PI * 2);
  ctx.arc(x + 5, y, 3, 0, Math.PI * 2);
  ctx.arc(x, y - 2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: ParticleSystem): void {
  const active = particles.activeParticles;
  for (let i = 0; i < active.length; i++) {
    const p = active[i];
    const t = p.life / p.maxLife;
    ctx.globalAlpha = t;
    ctx.fillStyle = p.color;
    const sz = p.size + (p.sizeEnd - p.size) * (1 - t);
    ctx.beginPath();
    ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
