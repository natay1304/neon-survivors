/** Neon Path — UI screens: menu, HUD, level complete, game complete */

import {
  WORLD_W, WORLD_H, LEVELS,
  COLOR_UI_TEXT, COLOR_UI_DIM, COLOR_UI_ACCENT, COLOR_UI_PANEL,
  COLOR_DOOR_EDGE, COLOR_SPIKE,
} from './config';

// ── Helpers ───────────────────────────────────────────────────────────────────

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = COLOR_UI_PANEL;
  ctx.strokeStyle = COLOR_UI_ACCENT;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = COLOR_UI_ACCENT;
  ctx.shadowBlur = 10;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function roundRect(
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

function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  opts: { size?: number; color?: string; align?: CanvasTextAlign; glow?: string } = {},
): void {
  const { size = 16, color = COLOR_UI_TEXT, align = 'center', glow } = opts;
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
  }
  ctx.fillText(str, x, y);
  ctx.shadowBlur = 0;
}

// ── HUD ───────────────────────────────────────────────────────────────────────

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  currentLevelIdx: number,
  deaths: number,
): void {
  const totalLevels = LEVELS.length;
  const dotR = 7;
  const spacing = dotR * 2 + 10;
  const totalW = totalLevels * spacing - 10;
  const startX = (WORLD_W - totalW) / 2 + dotR;
  const dotY = 24;

  // Level progress dots
  for (let i = 0; i < totalLevels; i++) {
    const cx = startX + i * spacing;
    ctx.beginPath();
    ctx.arc(cx, dotY, dotR, 0, Math.PI * 2);

    if (i < currentLevelIdx) {
      // Completed
      ctx.fillStyle = COLOR_UI_ACCENT;
      ctx.shadowColor = COLOR_UI_ACCENT;
      ctx.shadowBlur = 8;
      ctx.fill();
    } else if (i === currentLevelIdx) {
      // Current
      ctx.fillStyle = COLOR_UI_ACCENT;
      ctx.shadowColor = COLOR_UI_ACCENT;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Locked
      ctx.strokeStyle = 'rgba(0, 191, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // Death counter (top right)
  if (deaths > 0) {
    text(ctx, `Deaths: ${deaths}`, WORLD_W - 12, 24, {
      size: 13,
      color: COLOR_UI_DIM,
      align: 'right',
    });
  }

  // Level name (top left)
  const level = LEVELS[currentLevelIdx];
  if (level) {
    text(ctx, `${level.id}. ${level.name}`, 12, 24, {
      size: 13,
      color: COLOR_UI_DIM,
      align: 'left',
    });
  }
}

// ── Menu screen ───────────────────────────────────────────────────────────────

export function drawMenu(ctx: CanvasRenderingContext2D, time: number): void {
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;

  // Background overlay
  ctx.fillStyle = 'rgba(6, 6, 15, 0.7)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Title panel
  panel(ctx, cx - 180, cy - 110, 360, 200);

  // Title glow pulse
  const pulse = 0.8 + 0.2 * Math.sin(time * 3);
  ctx.shadowColor = COLOR_UI_ACCENT;
  ctx.shadowBlur = 20 * pulse;
  text(ctx, 'NEON PATH', cx, cy - 60, { size: 38, color: COLOR_UI_ACCENT });
  ctx.shadowBlur = 0;

  text(ctx, 'A puzzle platformer', cx, cy - 20, { size: 14, color: COLOR_UI_DIM });

  // Controls hint
  text(ctx, 'Arrow keys / WASD — move', cx, cy + 15, { size: 12, color: COLOR_UI_DIM });
  text(ctx, 'Space / Up — jump', cx, cy + 35, { size: 12, color: COLOR_UI_DIM });

  // Blinking start prompt
  if (Math.sin(time * 4) > 0) {
    text(ctx, 'Press any key or tap to start', cx, cy + 68, {
      size: 14,
      color: COLOR_UI_TEXT,
      glow: COLOR_DOOR_EDGE,
    });
  }

  // Mobile jump hint
  text(ctx, 'Mobile: left side = move, right side = jump', cx, cy + 95, {
    size: 11,
    color: 'rgba(255,255,255,0.3)',
  });
}

// ── Respawn / dead overlay ────────────────────────────────────────────────────

export function drawDeadOverlay(ctx: CanvasRenderingContext2D, timer: number, maxTime: number): void {
  const t = 1 - timer / maxTime; // 0 → 1 as time progresses
  ctx.globalAlpha = Math.min(t * 2, 0.6);
  ctx.fillStyle = 'rgba(255, 32, 96, 0.2)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.globalAlpha = 1;

  if (t > 0.3) {
    ctx.globalAlpha = Math.min((t - 0.3) * 3, 1);
    text(ctx, 'RESPAWNING...', WORLD_W / 2, WORLD_H / 2, {
      size: 22,
      color: COLOR_SPIKE,
      glow: COLOR_SPIKE,
    });
    ctx.globalAlpha = 1;
  }
}

// ── Level complete overlay ────────────────────────────────────────────────────

export function drawLevelComplete(
  ctx: CanvasRenderingContext2D,
  levelIdx: number,
  timer: number,
  maxTime: number,
): void {
  const t = Math.min(timer / maxTime, 1);
  ctx.globalAlpha = t * 0.85;
  ctx.fillStyle = 'rgba(0, 255, 136, 0.06)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.globalAlpha = 1;

  if (t > 0.2) {
    ctx.globalAlpha = Math.min((t - 0.2) * 3, 1);
    const isLast = levelIdx >= LEVELS.length - 1;
    text(ctx, isLast ? 'COMPLETE!' : 'LEVEL CLEAR!', WORLD_W / 2, WORLD_H / 2 - 16, {
      size: 28,
      color: COLOR_DOOR_EDGE,
      glow: COLOR_DOOR_EDGE,
    });
    if (!isLast) {
      text(ctx, `Loading level ${levelIdx + 2}...`, WORLD_W / 2, WORLD_H / 2 + 20, {
        size: 14,
        color: COLOR_UI_DIM,
      });
    }
    ctx.globalAlpha = 1;
  }
}

// ── Game complete screen ──────────────────────────────────────────────────────

export function drawGameComplete(
  ctx: CanvasRenderingContext2D,
  deaths: number,
  time: number,
): void {
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;

  ctx.fillStyle = 'rgba(6, 6, 15, 0.82)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  panel(ctx, cx - 200, cy - 120, 400, 220);

  const pulse = 0.8 + 0.2 * Math.sin(time * 3);
  ctx.shadowColor = COLOR_DOOR_EDGE;
  ctx.shadowBlur = 22 * pulse;
  text(ctx, 'YOU ESCAPED!', cx, cy - 70, { size: 32, color: COLOR_DOOR_EDGE });
  ctx.shadowBlur = 0;

  text(ctx, 'All 5 levels completed', cx, cy - 32, { size: 14, color: COLOR_UI_DIM });

  const deathText = deaths === 0
    ? 'Flawless run! Perfect score!'
    : deaths === 1
    ? `${deaths} death — impressive!`
    : `${deaths} deaths — keep practicing!`;
  text(ctx, deathText, cx, cy + 4, { size: 15, color: COLOR_UI_TEXT });

  if (Math.sin(time * 3.5) > 0) {
    text(ctx, 'Press any key or tap to play again', cx, cy + 60, {
      size: 13,
      color: COLOR_UI_ACCENT,
      glow: COLOR_UI_ACCENT,
    });
  }
}

// ── Mobile jump button ────────────────────────────────────────────────────────

export function drawMobileControls(ctx: CanvasRenderingContext2D): void {
  // Right-side jump button hint (subtle)
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = COLOR_UI_ACCENT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(WORLD_W - 50, WORLD_H - 50, 28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = COLOR_UI_TEXT;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('JUMP', WORLD_W - 50, WORLD_H - 50);
  ctx.globalAlpha = 1;
}
