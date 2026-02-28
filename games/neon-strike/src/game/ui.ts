/** UI screens — menu, level complete, game over, victory, pause */

import { TOTAL_LEVELS } from './config';

export type GameScreen = 'menu' | 'playing' | 'levelComplete' | 'gameover' | 'victory' | 'paused';

export class UIManager {
  screen: GameScreen = 'menu';

  constructor(
    private ctx: CanvasRenderingContext2D,
    private onRestart: () => void,
    private onNextLevel: () => void,
    private onResume: () => void,
  ) {
    this.ctx.canvas.addEventListener('click', this.onClick);
    this.ctx.canvas.addEventListener('touchend', this.onTouch);
    this.ctx.canvas.addEventListener('mousemove', this.onMouseMove);
  }

  drawMenu(w: number, h: number, isMobile: boolean): void {
    const ctx = this.ctx;
    const s = Math.min(1, w / 700);

    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.fillRect(0, 0, w, h);

    const cy = Math.min(h * 0.4, h / 2);
    ctx.textAlign = 'center';

    // Title
    ctx.save();
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 30 * s;
    ctx.fillStyle = '#ff3366';
    ctx.font = `bold ${Math.max(26, Math.round(52 * s))}px monospace`;
    ctx.fillText('NEON STRIKE', w / 2, cy - 50);
    ctx.restore();

    // Subtitle
    ctx.fillStyle = '#8888aa';
    ctx.font = `${Math.max(12, Math.round(16 * s))}px monospace`;
    ctx.fillText('Shoot everything. Survive the levels.', w / 2, cy - 10);

    // Start prompt
    const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
    ctx.globalAlpha = 0.5 + pulse * 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(16, Math.round(20 * s))}px monospace`;
    ctx.fillText('TAP or PRESS ANY KEY', w / 2, cy + 50);
    ctx.globalAlpha = 1;

    // Controls
    ctx.fillStyle = '#555566';
    ctx.font = `${Math.max(11, Math.round(13 * s))}px monospace`;
    if (isMobile) {
      ctx.fillText('Left joystick = move', w / 2, cy + 100);
      ctx.fillText('Right joystick = aim & shoot', w / 2, cy + 118);
    } else {
      ctx.fillText('WASD = move  |  Mouse = aim', w / 2, cy + 100);
      ctx.fillText('Click = shoot  |  ESC = pause', w / 2, cy + 118);
    }
  }

  drawLevelComplete(w: number, h: number, levelIndex: number, score: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 10, 26, 0.9)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowColor = '#44ff44';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#44ff44';
    ctx.font = 'bold 38px monospace';
    ctx.fillText('LEVEL CLEAR!', w / 2, h / 2 - 60);
    ctx.restore();

    ctx.fillStyle = '#ccccdd';
    ctx.font = '16px monospace';
    ctx.fillText(`Level ${levelIndex + 1} / ${TOTAL_LEVELS} completed`, w / 2, h / 2 - 15);
    ctx.fillText(`Score: ${score}`, w / 2, h / 2 + 15);

    // Next level button
    const btnW = 220, btnH = 44;
    const btnX = w / 2 - btnW / 2;
    const btnY = h / 2 + 55;
    const hover = this.isHovering(btnX, btnY, btnW, btnH);

    ctx.fillStyle = hover ? '#1a3a1a' : '#0a2a0a';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#44ff44';
    ctx.lineWidth = hover ? 2 : 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#44ff44';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(levelIndex + 1 >= TOTAL_LEVELS ? 'VICTORY!' : 'NEXT LEVEL ▶', w / 2, btnY + 28);
    ctx.globalAlpha = 1;
  }

  drawGameOver(w: number, h: number, score: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 10, 26, 0.92)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 42px monospace';
    ctx.fillText('GAME OVER', w / 2, h / 2 - 60);
    ctx.restore();

    ctx.fillStyle = '#ccccdd';
    ctx.font = '16px monospace';
    ctx.fillText(`Final Score: ${score}`, w / 2, h / 2 - 10);

    // Restart button
    const btnW = 200, btnH = 44;
    const btnX = w / 2 - btnW / 2;
    const btnY = h / 2 + 30;
    const hover = this.isHovering(btnX, btnY, btnW, btnH);

    ctx.fillStyle = hover ? '#2a2a5a' : '#1a1a3a';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = hover ? 2 : 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('PLAY AGAIN', w / 2, btnY + 28);
  }

  drawVictory(w: number, h: number, score: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 10, 26, 0.92)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 42px monospace';
    ctx.fillText('VICTORY!', w / 2, h / 2 - 80);
    ctx.restore();

    ctx.fillStyle = '#44ff44';
    ctx.font = '18px monospace';
    ctx.fillText('All levels cleared!', w / 2, h / 2 - 35);

    ctx.fillStyle = '#ccccdd';
    ctx.font = '16px monospace';
    ctx.fillText(`Final Score: ${score}`, w / 2, h / 2 + 0);

    // Restart button
    const btnW = 200, btnH = 44;
    const btnX = w / 2 - btnW / 2;
    const btnY = h / 2 + 40;
    const hover = this.isHovering(btnX, btnY, btnW, btnH);

    ctx.fillStyle = hover ? '#2a2a3a' : '#1a1a2a';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = hover ? 2 : 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('PLAY AGAIN', w / 2, btnY + 28);
  }

  drawPaused(w: number, h: number): void {
    const ctx = this.ctx;
    const mobile = w < 600;

    ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ff3366';
    ctx.font = `bold ${mobile ? 32 : 42}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', w / 2, h / 2 - 50);
    ctx.restore();

    // Resume button (green, above)
    const btnW = 180, btnH = 38;
    const resumeX = w / 2 - btnW / 2;
    const resumeY = h / 2 + (mobile ? 0 : 5);
    const resumeHover = this.isHovering(resumeX, resumeY, btnW, btnH);

    ctx.fillStyle = resumeHover ? '#1a3a1a' : '#0a2a0a';
    ctx.fillRect(resumeX, resumeY, btnW, btnH);
    ctx.strokeStyle = '#44ff44';
    ctx.lineWidth = resumeHover ? 2 : 1;
    ctx.strokeRect(resumeX, resumeY, btnW, btnH);

    ctx.fillStyle = '#44ff44';
    ctx.textAlign = 'center';
    ctx.font = `bold ${mobile ? 14 : 15}px monospace`;
    ctx.fillText('RESUME', w / 2, resumeY + 25);

    // Retry button (red, below)
    const retryY = resumeY + btnH + 12;
    const retryHover = this.isHovering(resumeX, retryY, btnW, btnH);

    ctx.fillStyle = retryHover ? '#2a1a1a' : '#1a1010';
    ctx.fillRect(resumeX, retryY, btnW, btnH);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = retryHover ? 2 : 1;
    ctx.strokeRect(resumeX, retryY, btnW, btnH);

    ctx.fillStyle = '#ff4444';
    ctx.font = `bold ${mobile ? 14 : 15}px monospace`;
    ctx.fillText('RETRY', w / 2, retryY + 25);
  }

  // ─── Mouse tracking ─────────────────────────────────────────────
  private mouseX = 0;
  private mouseY = 0;

  private onMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };

  private isHovering(x: number, y: number, w: number, h: number): boolean {
    return this.mouseX >= x && this.mouseX <= x + w && this.mouseY >= y && this.mouseY <= y + h;
  }

  // ─── Click handling ─────────────────────────────────────────────
  private onClick = (e: MouseEvent) => { this.handleClick(e.clientX, e.clientY); };
  private onTouch = (e: TouchEvent) => {
    if (e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      this.handleClick(t.clientX, t.clientY);
    }
  };

  private handleClick(x: number, y: number): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (this.screen === 'levelComplete') {
      const btnW = 220, btnH = 44;
      const btnX = w / 2 - btnW / 2;
      const btnY = h / 2 + 55;
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        this.onNextLevel();
        return;
      }
    }

    if (this.screen === 'gameover' || this.screen === 'victory') {
      const btnW = 200, btnH = 44;
      const btnX = w / 2 - btnW / 2;
      const btnY = this.screen === 'victory' ? h / 2 + 40 : h / 2 + 30;
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        this.onRestart();
        return;
      }
    }

    if (this.screen === 'paused') {
      const mobile = w < 600;
      const btnW = 180, btnH = 38;
      const btnX = w / 2 - btnW / 2;
      const resumeY = h / 2 + (mobile ? 0 : 5);
      const retryY = resumeY + btnH + 12;
      if (x >= btnX && x <= btnX + btnW && y >= resumeY && y <= resumeY + btnH) {
        this.onResume();
        return;
      }
      if (x >= btnX && x <= btnX + btnW && y >= retryY && y <= retryY + btnH) {
        this.onRestart();
        return;
      }
    }
  }

  destroy(): void {
    this.ctx.canvas.removeEventListener('click', this.onClick);
    this.ctx.canvas.removeEventListener('touchend', this.onTouch);
    this.ctx.canvas.removeEventListener('mousemove', this.onMouseMove);
  }
}
