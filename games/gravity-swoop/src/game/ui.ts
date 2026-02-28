/**
 * UI Manager for Gravity Swoop.
 *
 * Screens: menu, levelSelect, playing, levelComplete, paused
 * All rendering via Canvas 2D overlay.
 */

import { LEVELS, SEED_COLOR, GOAL_COLOR, BIRD_BODY_COLOR } from './config';

export type Screen = 'menu' | 'levelSelect' | 'playing' | 'levelComplete' | 'paused';

export interface LevelResult {
  stars: number;
  seedsCollected: number;
  totalSeeds: number;
  time: number;
}

/** Per-level persistent progress */
export interface LevelProgress {
  unlocked: boolean;
  bestStars: number;
}

export class UIManager {
  progress: LevelProgress[] = [];
  /** Mouse / touch position for hover detection */
  mouseX = 0;
  mouseY = 0;

  // Callbacks set by scene
  onStartGame: (() => void) | null = null;
  onSelectLevel: ((levelIdx: number) => void) | null = null;
  onNextLevel: (() => void) | null = null;
  onRetryLevel: (() => void) | null = null;
  onResume: (() => void) | null = null;
  onLevelSelect: (() => void) | null = null;

  constructor() {
    // Initialise progress: level 0 always unlocked
    for (let i = 0; i < LEVELS.length; i++) {
      this.progress.push({ unlocked: i === 0, bestStars: 0 });
    }
  }

  unlockLevel(idx: number): void {
    if (idx < this.progress.length) {
      this.progress[idx].unlocked = true;
    }
  }

  recordResult(levelIdx: number, result: LevelResult): void {
    const prog = this.progress[levelIdx];
    if (prog && result.stars > prog.bestStars) {
      prog.bestStars = result.stars;
    }
    // Unlock next
    if (levelIdx + 1 < this.progress.length) {
      this.progress[levelIdx + 1].unlocked = true;
    }
  }

  // ---------- Click handling ----------

  handleClick(screen: Screen, x: number, y: number, w: number, h: number): void {
    if (screen === 'menu') {
      this.onStartGame?.();
    } else if (screen === 'levelSelect') {
      this.handleLevelSelectClick(x, y, w, h);
    } else if (screen === 'levelComplete') {
      this.handleLevelCompleteClick(x, y, w, h);
    } else if (screen === 'paused') {
      this.handlePausedClick(x, y, w, h);
    }
  }

  private handleLevelSelectClick(x: number, y: number, w: number, h: number): void {
    const cols = 5;
    const btnW = 80;
    const btnH = 80;
    const gap = 16;
    const totalW = cols * btnW + (cols - 1) * gap;
    const startX = (w - totalW) / 2;
    const startY = h * 0.35;

    for (let i = 0; i < LEVELS.length; i++) {
      if (!this.progress[i].unlocked) continue;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (btnW + gap);
      const by = startY + row * (btnH + gap);

      if (x >= bx && x <= bx + btnW && y >= by && y <= by + btnH) {
        this.onSelectLevel?.(i);
        return;
      }
    }
  }

  private handleLevelCompleteClick(x: number, y: number, w: number, h: number): void {
    const btnW = 160;
    const btnH = 50;
    const gap = 20;
    const cx = w / 2;
    const cy = h * 0.7;

    // Retry button (left)
    const retryX = cx - btnW - gap / 2;
    if (x >= retryX && x <= retryX + btnW && y >= cy && y <= cy + btnH) {
      this.onRetryLevel?.();
      return;
    }

    // Next button (right)
    const nextX = cx + gap / 2;
    if (x >= nextX && x <= nextX + btnW && y >= cy && y <= cy + btnH) {
      this.onNextLevel?.();
      return;
    }
  }

  private handlePausedClick(x: number, y: number, w: number, h: number): void {
    const btnW = 200;
    const btnH = 50;
    const cx = w / 2;

    // Resume
    const r1y = h * 0.45;
    if (x >= cx - btnW / 2 && x <= cx + btnW / 2 && y >= r1y && y <= r1y + btnH) {
      this.onResume?.();
      return;
    }

    // Level Select
    const r2y = h * 0.55;
    if (x >= cx - btnW / 2 && x <= cx + btnW / 2 && y >= r2y && y <= r2y + btnH) {
      this.onLevelSelect?.();
      return;
    }
  }

  // ---------- Rendering ----------

  drawMenu(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    // Dim overlay
    ctx.fillStyle = 'rgba(11,11,46,0.85)';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = BIRD_BODY_COLOR;
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText('Gravity Swoop', w / 2, h * 0.25);

    // Subtitle
    ctx.fillStyle = '#aaaacc';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Guide the budgie to its feeder!', w / 2, h * 0.35);

    // Animated budgie silhouette
    const bob = Math.sin(time * 2) * 10;
    ctx.fillStyle = BIRD_BODY_COLOR;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.5 + bob, 30, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    // Beak
    ctx.fillStyle = '#ff9922';
    ctx.beginPath();
    ctx.moveTo(w / 2 + 28, h * 0.5 + bob - 4);
    ctx.lineTo(w / 2 + 44, h * 0.5 + bob);
    ctx.lineTo(w / 2 + 28, h * 0.5 + bob + 5);
    ctx.closePath();
    ctx.fill();

    // Start prompt
    const blink = Math.sin(time * 3) > 0;
    if (blink) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText('Tap to Start', w / 2, h * 0.72);
    }

    // Controls hint
    ctx.fillStyle = '#667788';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Tap & hold to create gravity \u2022 Release to slingshot', w / 2, h * 0.85);
  }

  drawLevelSelect(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = 'rgba(11,11,46,0.92)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText('Select Level', w / 2, h * 0.15);

    const cols = 5;
    const btnW = 80;
    const btnH = 80;
    const gap = 16;
    const totalW = cols * btnW + (cols - 1) * gap;
    const startX = (w - totalW) / 2;
    const startY = h * 0.35;

    for (let i = 0; i < LEVELS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (btnW + gap);
      const by = startY + row * (btnH + gap);
      const prog = this.progress[i];

      // Button background
      if (prog.unlocked) {
        const hover = this.mouseX >= bx && this.mouseX <= bx + btnW &&
                      this.mouseY >= by && this.mouseY <= by + btnH;
        ctx.fillStyle = hover ? '#2a2a5e' : '#1a1a3e';
        ctx.strokeStyle = BIRD_BODY_COLOR;
      } else {
        ctx.fillStyle = '#111122';
        ctx.strokeStyle = '#333344';
      }
      ctx.lineWidth = 2;
      roundRect(ctx, bx, by, btnW, btnH, 8);
      ctx.fill();
      ctx.stroke();

      // Level number
      ctx.fillStyle = prog.unlocked ? '#ffffff' : '#444466';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText(String(i + 1), bx + btnW / 2, by + btnH * 0.4);

      // Stars
      if (prog.bestStars > 0) {
        ctx.fillStyle = SEED_COLOR;
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('\u2605'.repeat(prog.bestStars), bx + btnW / 2, by + btnH * 0.75);
      }

      // Lock icon
      if (!prog.unlocked) {
        ctx.fillStyle = '#444466';
        ctx.font = '20px system-ui, sans-serif';
        ctx.fillText('\uD83D\uDD12', bx + btnW / 2, by + btnH * 0.75);
      }
    }
  }

  drawPlayingHUD(
    ctx: CanvasRenderingContext2D,
    w: number, _h: number,
    levelIdx: number,
    seedsCollected: number,
    totalSeeds: number,
    elapsedTime: number,
  ): void {
    ctx.textBaseline = 'top';

    // Level name (top-left)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#aaaacc';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`${levelIdx + 1}. ${LEVELS[levelIdx].name}`, 16, 16);

    // Seeds (top-right)
    ctx.textAlign = 'right';
    ctx.fillStyle = SEED_COLOR;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`${seedsCollected}/${totalSeeds}`, w - 16, 16);

    // Timer (top-center)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#778899';
    ctx.font = '14px system-ui, sans-serif';
    const secs = Math.floor(elapsedTime);
    const ms = Math.floor((elapsedTime % 1) * 10);
    ctx.fillText(`${secs}.${ms}s`, w / 2, 16);

    // Pause button (top-right corner)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#556677';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('\u23F8', w - 16, 40);
  }

  drawLevelComplete(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    levelIdx: number,
    result: LevelResult,
  ): void {
    ctx.fillStyle = 'rgba(11,11,46,0.88)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.fillStyle = GOAL_COLOR;
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillText('Level Complete!', w / 2, h * 0.2);

    // Level name
    ctx.fillStyle = '#aaaacc';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(LEVELS[levelIdx].name, w / 2, h * 0.28);

    // Stars
    ctx.font = '48px system-ui, sans-serif';
    let starsStr = '';
    for (let i = 0; i < 3; i++) {
      starsStr += i < result.stars ? '\u2605' : '\u2606';
    }
    ctx.fillStyle = SEED_COLOR;
    ctx.fillText(starsStr, w / 2, h * 0.4);

    // Stats
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#aaaacc';
    ctx.fillText(`Seeds: ${result.seedsCollected}/${result.totalSeeds}`, w / 2, h * 0.52);
    ctx.fillText(`Time: ${result.time.toFixed(1)}s`, w / 2, h * 0.58);

    // Buttons
    const btnW = 160;
    const btnH = 50;
    const gap = 20;
    const cx = w / 2;
    const cy = h * 0.7;

    // Retry
    const retryX = cx - btnW - gap / 2;
    drawButton(ctx, retryX, cy, btnW, btnH, 'Retry', '#556677');

    // Next
    const nextX = cx + gap / 2;
    const hasNext = levelIdx + 1 < LEVELS.length;
    drawButton(ctx, nextX, cy, btnW, btnH, hasNext ? 'Next Level' : 'Done', BIRD_BODY_COLOR);
  }

  drawPaused(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = 'rgba(11,11,46,0.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillText('Paused', w / 2, h * 0.3);

    const btnW = 200;
    const btnH = 50;
    const cx = w / 2;

    drawButton(ctx, cx - btnW / 2, h * 0.45, btnW, btnH, 'Resume', BIRD_BODY_COLOR);
    drawButton(ctx, cx - btnW / 2, h * 0.55, btnW, btnH, 'Level Select', '#556677');
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  label: string, color: string,
): void {
  ctx.fillStyle = '#1a1a3e';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
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
