/** Neon Path — Canvas 2D rendering with neon glow */

import {
  WORLD_W, WORLD_H,
  PLAYER_W, PLAYER_H, DOOR_W, DOOR_H, SPIKE_W, SPIKE_H,
  COLOR_PLAYER, COLOR_PLAYER_GLOW,
  COLOR_SPIKE, COLOR_SPIKE_GLOW,
  COLOR_DOOR_FILL, COLOR_DOOR_EDGE, COLOR_DOOR_GLOW,
  COLOR_DEATH_FLASH, COLOR_COMPLETE_FLASH,
  COLOR_MOV_PLATFORM, COLOR_MOV_PLATFORM_GLOW,
  COLOR_LASER, COLOR_LASER_GLOW,
  COLOR_SAW, COLOR_SAW_GLOW,
  COLOR_FIRE, COLOR_FIRE_HOT,
  COLOR_ACID, COLOR_ACID_GLOW,
  COLOR_ORBIT, COLOR_ORBIT_GLOW,
  COLOR_TURRET, COLOR_TURRET_GLOW,
  COLOR_CRUSHER, COLOR_CRUSHER_GLOW,
  THEMES,
} from './config';
import type { Platform, Spike, LevelDef, LevelTheme } from './config';
import type { Player } from './physics';
import type { ObstacleStates } from './obstacles';
import type { PixelExplosion } from './effects';

// ── Glow helpers ──────────────────────────────────────────────────────────────

function glow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  ctx.shadowColor = color; ctx.shadowBlur = blur;
}
function noGlow(ctx: CanvasRenderingContext2D): void { ctx.shadowBlur = 0; }

// ── Background ────────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, theme: LevelTheme): void {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  const g = 40;
  for (let x = 0; x <= WORLD_W; x += g) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke();
  }
  for (let y = 0; y <= WORLD_H; y += g) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke();
  }
}

// ── Static platforms ──────────────────────────────────────────────────────────

function drawPlatforms(ctx: CanvasRenderingContext2D, platforms: Platform[], theme: LevelTheme): void {
  for (const p of platforms) {
    glow(ctx, theme.platformGlow, 18);
    ctx.fillStyle = theme.platformGlow;
    ctx.fillRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8);
    noGlow(ctx);
    ctx.fillStyle = theme.platformFill;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    glow(ctx, theme.platformEdge, 8);
    ctx.strokeStyle = theme.platformEdge;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.w, p.y); ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.h);
    ctx.moveTo(p.x + p.w, p.y); ctx.lineTo(p.x + p.w, p.y + p.h);
    ctx.stroke();
    ctx.globalAlpha = 1; noGlow(ctx);
  }
}

// ── Spikes ────────────────────────────────────────────────────────────────────

function drawSpikes(ctx: CanvasRenderingContext2D, spikes: Spike[]): void {
  for (const s of spikes) {
    glow(ctx, COLOR_SPIKE_GLOW, 12);
    ctx.fillStyle = COLOR_SPIKE;
    ctx.beginPath();
    ctx.moveTo(s.x - SPIKE_W / 2, s.y);
    ctx.lineTo(s.x, s.y - SPIKE_H);
    ctx.lineTo(s.x + SPIKE_W / 2, s.y);
    ctx.closePath(); ctx.fill(); noGlow(ctx);
  }
}

// ── Door ──────────────────────────────────────────────────────────────────────

function drawDoor(ctx: CanvasRenderingContext2D, door: LevelDef['door'], time: number): void {
  const { x, y } = door;
  const pulse = 0.6 + 0.4 * Math.sin(time * 4);
  glow(ctx, COLOR_DOOR_GLOW, 20 * pulse);
  ctx.fillStyle = 'rgba(0, 255, 136, 0.08)';
  ctx.fillRect(x - 6, y - 6, DOOR_W + 12, DOOR_H + 12);
  noGlow(ctx);
  ctx.fillStyle = COLOR_DOOR_FILL;
  ctx.fillRect(x, y, DOOR_W, DOOR_H);
  glow(ctx, COLOR_DOOR_EDGE, 10 * pulse);
  ctx.strokeStyle = COLOR_DOOR_EDGE; ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, DOOR_W - 2, DOOR_H - 2);
  noGlow(ctx);
  ctx.globalAlpha = 0.5 * pulse;
  glow(ctx, COLOR_DOOR_EDGE, 8);
  ctx.strokeStyle = COLOR_DOOR_EDGE; ctx.lineWidth = 1.5;
  const cx = x + DOOR_W / 2;
  ctx.beginPath(); ctx.moveTo(cx, y + 6); ctx.lineTo(cx, y + DOOR_H - 6); ctx.stroke();
  noGlow(ctx); ctx.globalAlpha = 1;
}

// ── Player ────────────────────────────────────────────────────────────────────

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, _alpha: number): void {
  const cx = player.x + PLAYER_W / 2;
  const headR = 5;
  const neckY = player.y + headR * 2 + 2;
  const hipY = player.y + PLAYER_H - 10;
  const footY = player.y + PLAYER_H;
  ctx.strokeStyle = COLOR_PLAYER; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  glow(ctx, COLOR_PLAYER_GLOW, 14);
  ctx.fillStyle = COLOR_PLAYER;
  ctx.beginPath(); ctx.arc(cx, player.y + headR, headR, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx, neckY); ctx.lineTo(cx, hipY); ctx.stroke();
  const armY = neckY + (hipY - neckY) * 0.35; const armLen = 8;
  if (player.onGround && Math.abs(player.vx) > 10) {
    const sw = Math.sin(player.walkCycle) * 6;
    ctx.beginPath();
    ctx.moveTo(cx, armY); ctx.lineTo(cx - armLen, armY + sw);
    ctx.moveTo(cx, armY); ctx.lineTo(cx + armLen, armY - sw);
    ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(cx - armLen, armY); ctx.lineTo(cx + armLen, armY); ctx.stroke();
  }
  const legLen = 10;
  if (!player.onGround) {
    ctx.beginPath();
    ctx.moveTo(cx, hipY); ctx.lineTo(cx - legLen * 0.6, hipY + legLen * 0.8);
    ctx.moveTo(cx, hipY); ctx.lineTo(cx + legLen * 0.6, hipY + legLen * 0.8);
    ctx.stroke();
  } else if (Math.abs(player.vx) > 10) {
    const ls = Math.sin(player.walkCycle) * 8;
    ctx.beginPath();
    ctx.moveTo(cx, hipY); ctx.lineTo(cx - 5 + ls * 0.3, footY);
    ctx.moveTo(cx, hipY); ctx.lineTo(cx + 5 - ls * 0.3, footY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, hipY); ctx.lineTo(cx - 5, footY);
    ctx.moveTo(cx, hipY); ctx.lineTo(cx + 5, footY);
    ctx.stroke();
  }
  noGlow(ctx);
}

// ── Moving platforms ──────────────────────────────────────────────────────────

function drawMovingPlatforms(ctx: CanvasRenderingContext2D, states: ObstacleStates): void {
  for (const s of states.movingPlatforms) {
    const { x, y } = s; const { w, h, endX, endY } = s.def;
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s.def.x + w / 2, s.def.y + h / 2);
    ctx.lineTo(endX + w / 2, endY + h / 2); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    glow(ctx, COLOR_MOV_PLATFORM_GLOW, 20);
    ctx.fillStyle = '#062535'; ctx.fillRect(x, y, w, h);
    glow(ctx, COLOR_MOV_PLATFORM, 10);
    ctx.strokeStyle = COLOR_MOV_PLATFORM; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
    noGlow(ctx);
  }
}

// ── Lasers ────────────────────────────────────────────────────────────────────

function drawLasers(ctx: CanvasRenderingContext2D, states: ObstacleStates, time: number): void {
  for (const s of states.lasers) {
    const { x1, y1, x2, y2, thickness } = s.def;
    if (s.active) {
      const flicker = 0.85 + 0.15 * Math.sin(time * 40);
      ctx.globalAlpha = flicker;
      glow(ctx, COLOR_LASER_GLOW, 18);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = thickness * 0.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      glow(ctx, COLOR_LASER, 14);
      ctx.strokeStyle = COLOR_LASER; ctx.lineWidth = thickness;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      glow(ctx, COLOR_LASER, 10); ctx.fillStyle = '#ff8840';
      for (const [ex, ey] of [[x1, y1], [x2, y2]] as [number, number][]) {
        ctx.beginPath(); ctx.arc(ex, ey, thickness * 0.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; noGlow(ctx);
    } else {
      const progress = s.timer / s.def.offTime;
      const warn = progress > 0.7 ? (progress - 0.7) / 0.3 : 0;
      ctx.globalAlpha = 0.15 + warn * 0.35 * Math.abs(Math.sin(time * 12));
      ctx.strokeStyle = COLOR_LASER; ctx.lineWidth = 1;
      ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
  }
}

// ── Saw blades ────────────────────────────────────────────────────────────────

function drawSaws(ctx: CanvasRenderingContext2D, states: ObstacleStates): void {
  for (const s of states.saws) {
    const { radius } = s.def; const { x, y, angle } = s;
    ctx.save(); ctx.setLineDash([5, 8]);
    ctx.strokeStyle = 'rgba(255, 0, 204, 0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s.def.x, s.def.y); ctx.lineTo(s.def.endX, s.def.endY);
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    glow(ctx, COLOR_SAW_GLOW, 16);
    ctx.fillStyle = 'rgba(255, 0, 204, 0.1)';
    ctx.beginPath(); ctx.arc(x, y, radius + 4, 0, Math.PI * 2); ctx.fill(); noGlow(ctx);
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    glow(ctx, COLOR_SAW, 8); ctx.strokeStyle = COLOR_SAW; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = COLOR_SAW;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const ir = radius - 5; const or = radius + 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.25) * ir, Math.sin(a - 0.25) * ir);
      ctx.lineTo(Math.cos(a) * or, Math.sin(a) * or);
      ctx.lineTo(Math.cos(a + 0.25) * ir, Math.sin(a + 0.25) * ir);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = COLOR_SAW; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (radius - 6), Math.sin(a) * (radius - 6)); ctx.stroke();
    }
    ctx.restore(); noGlow(ctx);
  }
}

// ── Fire Pillars ──────────────────────────────────────────────────────────────

function drawFirePillars(ctx: CanvasRenderingContext2D, states: ObstacleStates, time: number): void {
  for (const s of states.firePillars) {
    const h = s.def.height * s.heightFrac;
    if (h < 2) continue;
    const { x, y } = s.def;
    const fw = 18 + Math.sin(time * 18) * 3;
    const fw2 = 22 + Math.sin(time * 22 + 1) * 4;

    // Outer flame (orange)
    const g1 = ctx.createLinearGradient(x, y, x, y - h);
    g1.addColorStop(0, 'rgba(255, 100, 0, 0.95)');
    g1.addColorStop(0.5, 'rgba(255, 160, 0, 0.7)');
    g1.addColorStop(1, 'rgba(255, 255, 100, 0)');
    glow(ctx, COLOR_FIRE, 22);
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.moveTo(x - fw2 / 2, y);
    ctx.quadraticCurveTo(x - fw2 / 3, y - h * 0.55, x, y - h);
    ctx.quadraticCurveTo(x + fw2 / 3, y - h * 0.55, x + fw2 / 2, y);
    ctx.closePath(); ctx.fill();

    // Inner flame (hot yellow-white)
    const g2 = ctx.createLinearGradient(x, y, x, y - h * 0.7);
    g2.addColorStop(0, 'rgba(255, 220, 50, 0.9)');
    g2.addColorStop(0.6, 'rgba(255, 255, 200, 0.5)');
    g2.addColorStop(1, 'rgba(255, 255, 255, 0)');
    glow(ctx, COLOR_FIRE_HOT, 10);
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(x - fw / 2, y);
    ctx.quadraticCurveTo(x - fw / 4, y - h * 0.4, x, y - h * 0.7);
    ctx.quadraticCurveTo(x + fw / 4, y - h * 0.4, x + fw / 2, y);
    ctx.closePath(); ctx.fill();

    // Base glow dot
    glow(ctx, COLOR_FIRE, 14);
    ctx.fillStyle = '#ffee44';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    noGlow(ctx);
  }
}

// ── Acid Drops ────────────────────────────────────────────────────────────────

function drawAcidDrops(ctx: CanvasRenderingContext2D, states: ObstacleStates, time: number): void {
  for (const s of states.acidDrops) {
    // Emitter drip point
    glow(ctx, COLOR_ACID_GLOW, 10);
    ctx.fillStyle = COLOR_ACID;
    ctx.beginPath(); ctx.arc(s.def.x, s.def.y, 5, 0, Math.PI * 2); ctx.fill();
    // Drip trail
    const drip = Math.sin(time * 8) * 2;
    ctx.fillStyle = 'rgba(57, 255, 20, 0.4)';
    ctx.fillRect(s.def.x - 1, s.def.y, 2, 4 + drip);
    noGlow(ctx);

    // Active drops
    for (const d of s.drops) {
      glow(ctx, COLOR_ACID_GLOW, 8);
      ctx.fillStyle = COLOR_ACID;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = '#bbffaa';
      ctx.beginPath(); ctx.ellipse(d.x - 0.8, d.y - 1.5, 1, 2, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; noGlow(ctx);
    }
  }
}

// ── Orbiting Blades ───────────────────────────────────────────────────────────

function drawOrbitBlades(ctx: CanvasRenderingContext2D, states: ObstacleStates): void {
  for (const s of states.orbitBlades) {
    const { cx, cy, radius, bladeRadius } = s.def;
    const bx = cx + Math.cos(s.angle) * radius;
    const by = cy + Math.sin(s.angle) * radius;

    // Orbit ring
    ctx.strokeStyle = 'rgba(255, 153, 0, 0.18)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Center pivot
    glow(ctx, COLOR_ORBIT_GLOW, 8);
    ctx.fillStyle = COLOR_ORBIT;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();

    // Tether arm
    ctx.strokeStyle = 'rgba(255, 153, 0, 0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();

    // Blade (diamond)
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(s.angle + Math.PI / 4);
    glow(ctx, COLOR_ORBIT, 14); ctx.fillStyle = COLOR_ORBIT;
    ctx.beginPath();
    ctx.moveTo(0, -bladeRadius); ctx.lineTo(bladeRadius, 0);
    ctx.lineTo(0, bladeRadius); ctx.lineTo(-bladeRadius, 0);
    ctx.closePath(); ctx.fill();
    // Inner bright core
    ctx.fillStyle = '#ffdd88';
    ctx.beginPath();
    const ir = bladeRadius * 0.4;
    ctx.moveTo(0, -ir); ctx.lineTo(ir, 0); ctx.lineTo(0, ir); ctx.lineTo(-ir, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore(); noGlow(ctx);
  }
}

// ── Turrets ───────────────────────────────────────────────────────────────────

function drawTurrets(ctx: CanvasRenderingContext2D, states: ObstacleStates, time: number): void {
  for (const s of states.turrets) {
    const { x, y, direction } = s.def;
    const bw = 26; const bh = 18;
    const bx = direction === 1 ? x - bw : x;

    // Body
    glow(ctx, COLOR_TURRET_GLOW, 10);
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(bx, y - bh / 2, bw, bh);
    ctx.strokeStyle = COLOR_TURRET; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, y - bh / 2, bw, bh);

    // Barrel
    const barrelLen = 14;
    const fireGlow = s.fireTimer < 0.1 ? 20 : 6;
    glow(ctx, COLOR_TURRET, fireGlow);
    ctx.strokeStyle = '#ff7070'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + direction * barrelLen, y);
    ctx.stroke();

    // Muzzle flash on fire
    if (s.fireTimer < 0.08) {
      ctx.fillStyle = '#ffdd44';
      ctx.beginPath(); ctx.arc(x + direction * (barrelLen + 4), y, 6, 0, Math.PI * 2); ctx.fill();
    }
    noGlow(ctx);

    // Scope indicator
    const scanX = x + direction * (bw * 0.3 + Math.sin(time * 2) * 0);
    ctx.fillStyle = '#ff4444';
    ctx.beginPath(); ctx.arc(scanX, y, 2.5, 0, Math.PI * 2); ctx.fill();

    // Bullets
    for (const b of s.bullets) {
      glow(ctx, COLOR_TURRET_GLOW, 8);
      ctx.fillStyle = '#ff9999';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(b.x - direction * 1.5, b.y, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      noGlow(ctx);
    }
  }
}

// ── Crushers ──────────────────────────────────────────────────────────────────

function drawCrushers(ctx: CanvasRenderingContext2D, states: ObstacleStates, time: number): void {
  for (const s of states.crushers) {
    const { def, y, phase } = s;
    const isWarning = phase === 'warning';
    const isCrushing = phase === 'crushing' || phase === 'holding';

    // Trigger zone (faint)
    const warnPulse = isWarning ? 0.3 + 0.25 * Math.sin(time * 30) : 0.08;
    ctx.globalAlpha = warnPulse;
    ctx.fillStyle = COLOR_CRUSHER;
    ctx.fillRect(def.triggerX1, y + def.h, def.triggerX2 - def.triggerX1, def.strikeY - y - def.h + 8);
    ctx.globalAlpha = 1;

    // Warning indicator lines on ceiling mount
    if (isWarning) {
      const shake = Math.sin(time * 60) * 2;
      ctx.fillStyle = '#ff88ff';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(def.x + i * (def.w / 3) + 6, def.y - 6 + shake, def.w / 3 - 4, 4);
      }
    }

    // Body
    glow(ctx, isCrushing ? '#cc66ff' : COLOR_CRUSHER_GLOW, isCrushing ? 18 : 10);
    ctx.fillStyle = '#160828';
    ctx.fillRect(def.x, y, def.w, def.h);
    ctx.strokeStyle = isCrushing ? '#cc44ff' : COLOR_CRUSHER;
    ctx.lineWidth = 2;
    ctx.strokeRect(def.x, y, def.w, def.h);
    noGlow(ctx);

    // Bottom spikes
    const count = Math.floor(def.w / 14);
    glow(ctx, COLOR_CRUSHER, 6);
    ctx.fillStyle = COLOR_CRUSHER;
    for (let i = 0; i < count; i++) {
      const sx = def.x + (i + 0.5) * (def.w / count);
      ctx.beginPath();
      ctx.moveTo(sx - 5, y + def.h);
      ctx.lineTo(sx, y + def.h + 9);
      ctx.lineTo(sx + 5, y + def.h);
      ctx.closePath(); ctx.fill();
    }
    noGlow(ctx);

    // Mount cable from ceiling
    ctx.strokeStyle = 'rgba(153, 51, 255, 0.4)'; ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(def.x + def.w / 2, 0);
    ctx.lineTo(def.x + def.w / 2, y);
    ctx.stroke(); ctx.setLineDash([]);
  }
}

// ── Pixel explosion (death effect) ───────────────────────────────────────────

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

// ── State overlays ────────────────────────────────────────────────────────────

export function drawDeathFlash(ctx: CanvasRenderingContext2D, intensity: number): void {
  if (intensity <= 0) return;
  ctx.globalAlpha = intensity * 0.8;
  ctx.fillStyle = COLOR_DEATH_FLASH;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.globalAlpha = 1;
}

export function drawCompleteFlash(ctx: CanvasRenderingContext2D, intensity: number): void {
  if (intensity <= 0) return;
  ctx.globalAlpha = intensity * 0.6;
  ctx.fillStyle = COLOR_COMPLETE_FLASH;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.globalAlpha = 1;
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderGame(
  ctx: CanvasRenderingContext2D,
  level: LevelDef,
  player: Player,
  obstacles: ObstacleStates,
  time: number,
  alpha: number,
  themeIdx: number,
  showPlayer: boolean,
): void {
  const theme = THEMES[themeIdx % THEMES.length]!;
  drawBackground(ctx, theme);
  drawMovingPlatforms(ctx, obstacles);
  drawPlatforms(ctx, level.platforms, theme);
  drawSpikes(ctx, level.spikes);
  drawFirePillars(ctx, obstacles, time);
  drawSaws(ctx, obstacles);
  drawOrbitBlades(ctx, obstacles);
  drawCrushers(ctx, obstacles, time);
  drawTurrets(ctx, obstacles, time);
  drawLasers(ctx, obstacles, time);
  drawAcidDrops(ctx, obstacles, time);
  drawDoor(ctx, level.door, time);
  if (showPlayer) drawPlayer(ctx, player, alpha);
}

// ── Scale helpers ─────────────────────────────────────────────────────────────

export function beginWorldTransform(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
): { scale: number; offsetX: number; offsetY: number } {
  const scale = Math.min(canvasW / WORLD_W, canvasH / WORLD_H);
  const offsetX = (canvasW - WORLD_W * scale) / 2;
  const offsetY = (canvasH - WORLD_H * scale) / 2;
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  return { scale, offsetX, offsetY };
}

export function endWorldTransform(ctx: CanvasRenderingContext2D): void {
  ctx.restore();
}
