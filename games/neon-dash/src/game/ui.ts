/**
 * UI manager for Neon Dash — menu, level select, death, level complete, HUD overlays.
 */

import { drawButton, roundRect } from '@survivors/core';
import { LEVELS } from './config';

export type Screen = 'menu' | 'levelSelect' | 'playing' | 'dead' | 'levelComplete';

export interface LevelProgress {
  unlocked: boolean;
  completed: boolean;
  attempts: number;
  bestProgress: number;
}

export class UIManager {
  progress: LevelProgress[] = [];

  // Callbacks
  onStartGame: (() => void) | null = null;
  onSelectLevel: ((idx: number) => void) | null = null;
  onRetryLevel: (() => void) | null = null;
  onNextLevel: (() => void) | null = null;
  onLevelSelect: (() => void) | null = null;

  constructor() {
    // Initialize progress
    for (let i = 0; i < LEVELS.length; i++) {
      this.progress.push({
        unlocked: i === 0,
        completed: false,
        attempts: 0,
        bestProgress: 0,
      });
    }
  }

  recordCompletion(levelIdx: number): void {
    this.progress[levelIdx].completed = true;
    if (levelIdx + 1 < LEVELS.length) {
      this.progress[levelIdx + 1].unlocked = true;
    }
  }

  recordAttempt(levelIdx: number, progress: number): void {
    this.progress[levelIdx].attempts++;
    if (progress > this.progress[levelIdx].bestProgress) {
      this.progress[levelIdx].bestProgress = progress;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // CLICK HANDLING
  // ══════════════════════════════════════════════════════════════════

  handleClick(screen: Screen, sx: number, sy: number, w: number, h: number): void {
    switch (screen) {
      case 'menu':
        this.handleMenuClick(sx, sy, w, h);
        break;
      case 'levelSelect':
        this.handleLevelSelectClick(sx, sy, w, h);
        break;
      case 'dead':
        this.handleDeadClick(sx, sy, w, h);
        break;
      case 'levelComplete':
        this.handleLevelCompleteClick(sx, sy, w, h);
        break;
    }
  }

  private handleMenuClick(_sx: number, _sy: number, _w: number, _h: number): void {
    this.onStartGame?.();
  }

  private handleLevelSelectClick(sx: number, sy: number, w: number, h: number): void {
    const cols = 5;
    const btnW = 100;
    const btnH = 100;
    const gap = 16;
    const totalW = cols * btnW + (cols - 1) * gap;
    const startX = (w - totalW) / 2;
    const startY = h * 0.35;

    for (let i = 0; i < LEVELS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (btnW + gap);
      const by = startY + row * (btnH + gap);

      if (sx >= bx && sx <= bx + btnW && sy >= by && sy <= by + btnH) {
        if (this.progress[i].unlocked) {
          this.onSelectLevel?.(i);
        }
        return;
      }
    }
  }

  private handleDeadClick(sx: number, sy: number, w: number, h: number): void {
    const btnW = 180;
    const btnH = 50;

    // Retry button
    const retryX = w / 2 - btnW - 12;
    const retryY = h / 2 + 40;
    if (sx >= retryX && sx <= retryX + btnW && sy >= retryY && sy <= retryY + btnH) {
      this.onRetryLevel?.();
      return;
    }

    // Level select button
    const lsX = w / 2 + 12;
    const lsY = h / 2 + 40;
    if (sx >= lsX && sx <= lsX + btnW && sy >= lsY && sy <= lsY + btnH) {
      this.onLevelSelect?.();
      return;
    }
  }

  private handleLevelCompleteClick(sx: number, sy: number, w: number, h: number): void {
    const btnW = 180;
    const btnH = 50;

    // Next level button
    const nextX = w / 2 - btnW - 12;
    const nextY = h / 2 + 60;
    if (sx >= nextX && sx <= nextX + btnW && sy >= nextY && sy <= nextY + btnH) {
      this.onNextLevel?.();
      return;
    }

    // Level select button
    const lsX = w / 2 + 12;
    const lsY = h / 2 + 60;
    if (sx >= lsX && sx <= lsX + btnW && sy >= lsY && sy <= lsY + btnH) {
      this.onLevelSelect?.();
      return;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DRAWING
  // ══════════════════════════════════════════════════════════════════

  drawMenu(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    // Title
    const glow = Math.sin(time * 2) * 5 + 10;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = glow;
    ctx.fillStyle = '#00ffff';
    ctx.font = `bold ${Math.min(w * 0.08, 64)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEON DASH', w / 2, h * 0.3);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.min(w * 0.025, 18)}px monospace`;
    ctx.fillText('A Geometry Dash Clone', w / 2, h * 0.3 + 50);

    // Animated cube preview
    const cubeSize = 30;
    const cubeY = h * 0.55;
    const cubeX = w / 2;
    ctx.save();
    ctx.translate(cubeX, cubeY);
    ctx.rotate(time * 2);
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fillRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Tap to start
    const alpha = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(w * 0.03, 22)}px monospace`;
    ctx.fillText('TAP TO START', w / 2, h * 0.72);
    ctx.globalAlpha = 1;

    // Controls hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `${Math.min(w * 0.02, 14)}px monospace`;
    ctx.fillText('SPACE / TAP to Jump', w / 2, h * 0.85);
  }

  drawLevelSelect(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Title
    ctx.fillStyle = '#00ffff';
    ctx.font = `bold ${Math.min(w * 0.05, 36)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('SELECT LEVEL', w / 2, h * 0.15);

    const cols = 5;
    const btnW = 100;
    const btnH = 100;
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
      const level = LEVELS[i];

      if (prog.unlocked) {
        // Unlocked level
        const bgColor = prog.completed ? level.color + '33' : '#1a1a3e';
        drawButton(ctx, bx, by, btnW, btnH, '', level.color, {
          bgColor,
          borderRadius: 12,
          borderWidth: 2,
        });

        // Level number
        ctx.fillStyle = level.color;
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, bx + btnW / 2, by + btnH * 0.35);

        // Level name
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(level.name, bx + btnW / 2, by + btnH * 0.6);

        // Completion indicator
        if (prog.completed) {
          ctx.fillStyle = '#00ffaa';
          ctx.font = '18px monospace';
          ctx.fillText('✓', bx + btnW / 2, by + btnH * 0.82);
        } else if (prog.bestProgress > 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = '11px monospace';
          ctx.fillText(`${Math.floor(prog.bestProgress * 100)}%`, bx + btnW / 2, by + btnH * 0.82);
        }
      } else {
        // Locked level
        drawButton(ctx, bx, by, btnW, btnH, '', '#333333', {
          bgColor: '#111122',
          borderRadius: 12,
          borderWidth: 1,
        });
        ctx.fillStyle = '#555555';
        ctx.font = '28px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', bx + btnW / 2, by + btnH / 2);
      }
    }
  }

  drawPlayingHUD(
    ctx: CanvasRenderingContext2D,
    w: number,
    _h: number,
    levelIdx: number,
    attempts: number,
  ): void {
    // Level name (top-left)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(LEVELS[levelIdx].name, 16, 16);

    // Attempt count (top-right)
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px monospace';
    ctx.fillText(`Attempt ${attempts}`, w - 16, 16);
  }

  drawDead(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    _levelIdx: number,
    progress: number,
  ): void {
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#ff3366';
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 15;
    ctx.font = `bold ${Math.min(w * 0.06, 42)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CRASHED!', w / 2, h / 2 - 50);
    ctx.shadowBlur = 0;

    // Progress
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.min(w * 0.03, 20)}px monospace`;
    ctx.fillText(`Progress: ${Math.floor(progress * 100)}%`, w / 2, h / 2);

    // Buttons
    const btnW = 180;
    const btnH = 50;
    drawButton(ctx, w / 2 - btnW - 12, h / 2 + 40, btnW, btnH, 'RETRY', '#00ffff', {
      borderRadius: 8,
      font: 'bold 16px monospace',
    });
    drawButton(ctx, w / 2 + 12, h / 2 + 40, btnW, btnH, 'LEVELS', '#ffcc00', {
      borderRadius: 8,
      font: 'bold 16px monospace',
    });
  }

  drawLevelComplete(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    levelIdx: number,
  ): void {
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    const level = LEVELS[levelIdx];

    // Title
    ctx.fillStyle = '#00ffaa';
    ctx.shadowColor = '#00ffaa';
    ctx.shadowBlur = 15;
    ctx.font = `bold ${Math.min(w * 0.06, 42)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEVEL COMPLETE!', w / 2, h / 2 - 70);
    ctx.shadowBlur = 0;

    // Level name
    ctx.fillStyle = level.color;
    ctx.font = `${Math.min(w * 0.03, 22)}px monospace`;
    ctx.fillText(level.name, w / 2, h / 2 - 20);

    // Completion graphic
    ctx.fillStyle = level.color;
    ctx.font = '36px monospace';
    ctx.fillText('★', w / 2, h / 2 + 20);

    // Buttons
    const btnW = 180;
    const btnH = 50;
    const hasNext = levelIdx + 1 < LEVELS.length;

    if (hasNext) {
      drawButton(ctx, w / 2 - btnW - 12, h / 2 + 60, btnW, btnH, 'NEXT LEVEL', '#00ffaa', {
        borderRadius: 8,
        font: 'bold 16px monospace',
      });
    }
    drawButton(ctx, hasNext ? w / 2 + 12 : w / 2 - btnW / 2, h / 2 + 60, btnW, btnH, 'LEVELS', '#ffcc00', {
      borderRadius: 8,
      font: 'bold 16px monospace',
    });
  }

  drawPauseButton(ctx: CanvasRenderingContext2D, w: number): void {
    const size = 36;
    const x = w - size - 12;
    const y = 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    roundRect(ctx, x, y, size, size, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏸', x + size / 2, y + size / 2);
  }
}
