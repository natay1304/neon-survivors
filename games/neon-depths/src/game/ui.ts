/** UI screens — menu, upgrade choice, game over, victory, pause, room clear */

import { UPGRADES, WEAPON_POOL, WEAPONS } from './config';
import { roundRect } from '@survivors/core';

export type GameScreen =
  | 'menu'
  | 'playing'
  | 'roomClear'
  | 'upgradeChoice'
  | 'gameover'
  | 'victory'
  | 'paused';

export interface UpgradeOption {
  type: 'stat' | 'weapon';
  index: number;
  weaponType?: string;
}

export class UIManager {
  screen: GameScreen = 'menu';
  upgradeOptions: UpgradeOption[] = [];
  selectedUpgrade = -1;

  private hoverBtn = -1;
  private onRestart: () => void;
  private onUpgradePick: (option: UpgradeOption) => void;
  private onContinue: () => void;
  private btnRects: { x: number; y: number; w: number; h: number }[] = [];

  constructor(
    private ctx: CanvasRenderingContext2D,
    onRestart: () => void,
    onUpgradePick: (option: UpgradeOption) => void,
    onContinue: () => void,
  ) {
    this.onRestart = onRestart;
    this.onUpgradePick = onUpgradePick;
    this.onContinue = onContinue;
    this.ctx.canvas.addEventListener('click', this.onClick);
    this.ctx.canvas.addEventListener('mousemove', this.onMouseMove);
  }

  destroy(): void {
    this.ctx.canvas.removeEventListener('click', this.onClick);
    this.ctx.canvas.removeEventListener('mousemove', this.onMouseMove);
  }

  generateUpgradeOptions(): void {
    this.upgradeOptions = [];
    const options: UpgradeOption[] = [];

    // Add stat upgrades
    const statIndices = shuffleIndices(UPGRADES.length);
    for (let i = 0; i < Math.min(2, statIndices.length); i++) {
      options.push({ type: 'stat', index: statIndices[i] });
    }

    // Add weapon option
    const wIdx = Math.random() * WEAPON_POOL.length | 0;
    options.push({ type: 'weapon', index: 0, weaponType: WEAPON_POOL[wIdx] });

    this.upgradeOptions = options;
    this.selectedUpgrade = -1;
  }

  drawMenu(w: number, h: number, isMobile: boolean): void {
    const c = this.ctx;
    const s = Math.min(1, w / 700);

    c.fillStyle = 'rgba(5, 5, 16, 0.95)';
    c.fillRect(0, 0, w, h);

    const cy = Math.min(h * 0.4, h / 2);
    c.textAlign = 'center';

    c.save();
    c.shadowColor = '#00ccff';
    c.shadowBlur = 30 * s;
    c.fillStyle = '#00ccff';
    c.font = `bold ${Math.max(26, Math.round(48 * s))}px monospace`;
    c.fillText('NEON DEPTHS', w / 2, cy - 50);
    c.restore();

    c.fillStyle = '#8888aa';
    c.font = `${Math.max(12, Math.round(15 * s))}px monospace`;
    c.fillText('Descend. Fight. Upgrade. Survive.', w / 2, cy - 10);

    const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
    c.globalAlpha = 0.5 + pulse * 0.5;
    c.fillStyle = '#ffffff';
    c.font = `${Math.max(16, Math.round(20 * s))}px monospace`;
    c.fillText('TAP or PRESS ANY KEY', w / 2, cy + 50);
    c.globalAlpha = 1;

    c.fillStyle = '#555566';
    c.font = `${Math.max(11, Math.round(13 * s))}px monospace`;
    if (isMobile) {
      c.fillText('Left joystick = move', w / 2, cy + 100);
      c.fillText('Right joystick = aim & shoot', w / 2, cy + 118);
    } else {
      c.fillText('WASD = move  |  Mouse = aim', w / 2, cy + 100);
      c.fillText('Click = shoot  |  Q = switch weapon', w / 2, cy + 118);
      c.fillText('ESC = pause', w / 2, cy + 136);
    }
  }

  drawRoomClear(w: number, h: number): void {
    const c = this.ctx;
    this.btnRects = [];

    c.fillStyle = 'rgba(5, 5, 16, 0.85)';
    c.fillRect(0, 0, w, h);

    c.textAlign = 'center';
    c.save();
    c.shadowColor = '#44ff44';
    c.shadowBlur = 20;
    c.fillStyle = '#44ff44';
    c.font = 'bold 32px monospace';
    c.fillText('ROOM CLEARED!', w / 2, h / 2 - 40);
    c.restore();

    // Continue button
    const bw = 200;
    const bh = 44;
    const bx = w / 2 - bw / 2;
    const by = h / 2 + 10;
    this.drawButton(bx, by, bw, bh, 'CONTINUE', '#00ccff', this.hoverBtn === 0);
    this.btnRects.push({ x: bx, y: by, w: bw, h: bh });
  }

  drawUpgradeChoice(w: number, h: number): void {
    const c = this.ctx;
    this.btnRects = [];

    c.fillStyle = 'rgba(5, 5, 16, 0.92)';
    c.fillRect(0, 0, w, h);

    c.textAlign = 'center';
    c.save();
    c.shadowColor = '#ffcc00';
    c.shadowBlur = 20;
    c.fillStyle = '#ffcc00';
    c.font = 'bold 28px monospace';
    c.fillText('CHOOSE UPGRADE', w / 2, h / 2 - 110);
    c.restore();

    const cardW = Math.min(180, (w - 60) / 3);
    const cardH = 140;
    const totalW = cardW * this.upgradeOptions.length + 16 * (this.upgradeOptions.length - 1);
    const startX = w / 2 - totalW / 2;
    const cardY = h / 2 - 50;

    for (let i = 0; i < this.upgradeOptions.length; i++) {
      const opt = this.upgradeOptions[i];
      const cx = startX + i * (cardW + 16);
      const isHover = this.hoverBtn === i;

      c.save();
      c.fillStyle = isHover ? 'rgba(40, 40, 80, 0.9)' : 'rgba(20, 20, 50, 0.9)';
      c.strokeStyle = isHover ? '#ffcc00' : '#444466';
      c.lineWidth = 2;
      roundRect(c, cx, cardY, cardW, cardH, 8);
      c.fill();
      c.stroke();
      c.restore();

      this.btnRects.push({ x: cx, y: cardY, w: cardW, h: cardH });

      c.textAlign = 'center';
      const textX = cx + cardW / 2;

      if (opt.type === 'stat') {
        const upg = UPGRADES[opt.index];
        c.font = '20px monospace';
        c.fillStyle = '#ffffff';
        c.fillText(upg.icon, textX, cardY + 35);

        c.font = 'bold 12px monospace';
        c.fillStyle = '#ffcc00';
        c.fillText(upg.name, textX, cardY + 60);

        c.font = '11px monospace';
        c.fillStyle = '#aaaacc';
        c.fillText(upg.description, textX, cardY + 80);
      } else if (opt.type === 'weapon' && opt.weaponType) {
        const levels = WEAPONS[opt.weaponType];
        const wDef = levels?.[0];
        if (wDef) {
          c.font = '20px monospace';
          c.fillStyle = '#ffffff';
          c.fillText(wDef.icon, textX, cardY + 35);

          c.font = 'bold 12px monospace';
          c.fillStyle = wDef.color;
          c.fillText(wDef.name.replace(/ I$/, ''), textX, cardY + 60);

          c.font = '11px monospace';
          c.fillStyle = '#aaaacc';
          c.fillText('New weapon', textX, cardY + 80);
          c.fillText('or level up', textX, cardY + 95);
        }
      }
    }
  }

  drawGameOver(w: number, h: number, score: number, floor: number, room: number): void {
    const c = this.ctx;
    this.btnRects = [];

    c.fillStyle = 'rgba(5, 5, 16, 0.92)';
    c.fillRect(0, 0, w, h);

    c.textAlign = 'center';

    c.save();
    c.shadowColor = '#ff3333';
    c.shadowBlur = 25;
    c.fillStyle = '#ff3333';
    c.font = 'bold 38px monospace';
    c.fillText('GAME OVER', w / 2, h / 2 - 70);
    c.restore();

    c.fillStyle = '#ccccdd';
    c.font = '16px monospace';
    c.fillText(`Score: ${score}`, w / 2, h / 2 - 30);
    c.fillText(`Reached: Floor ${floor + 1}, Room ${room + 1}`, w / 2, h / 2 - 6);

    const bw = 200;
    const bh = 44;
    const bx = w / 2 - bw / 2;
    const by = h / 2 + 30;
    this.drawButton(bx, by, bw, bh, 'TRY AGAIN', '#ff3366', this.hoverBtn === 0);
    this.btnRects.push({ x: bx, y: by, w: bw, h: bh });
  }

  drawVictory(w: number, h: number, score: number): void {
    const c = this.ctx;
    this.btnRects = [];

    c.fillStyle = 'rgba(5, 5, 16, 0.92)';
    c.fillRect(0, 0, w, h);

    c.textAlign = 'center';

    c.save();
    c.shadowColor = '#ffcc00';
    c.shadowBlur = 30;
    c.fillStyle = '#ffcc00';
    c.font = 'bold 42px monospace';
    c.fillText('VICTORY!', w / 2, h / 2 - 70);
    c.restore();

    c.fillStyle = '#ccccdd';
    c.font = '18px monospace';
    c.fillText('You escaped the Neon Depths!', w / 2, h / 2 - 30);
    c.fillText(`Final Score: ${score}`, w / 2, h / 2 - 4);

    const bw = 200;
    const bh = 44;
    const bx = w / 2 - bw / 2;
    const by = h / 2 + 30;
    this.drawButton(bx, by, bw, bh, 'PLAY AGAIN', '#ffcc00', this.hoverBtn === 0);
    this.btnRects.push({ x: bx, y: by, w: bw, h: bh });
  }

  drawPaused(w: number, h: number): void {
    const c = this.ctx;
    this.btnRects = [];

    c.fillStyle = 'rgba(5, 5, 16, 0.8)';
    c.fillRect(0, 0, w, h);

    c.textAlign = 'center';
    c.fillStyle = '#ffffff';
    c.font = 'bold 36px monospace';
    c.fillText('PAUSED', w / 2, h / 2 - 10);

    c.fillStyle = '#8888aa';
    c.font = '14px monospace';
    c.fillText('Press ESC to resume', w / 2, h / 2 + 20);
  }

  private drawButton(x: number, y: number, w: number, h: number, label: string, color: string, hover: boolean): void {
    const c = this.ctx;
    c.save();
    c.fillStyle = hover ? color : 'rgba(20, 20, 50, 0.9)';
    c.strokeStyle = color;
    c.lineWidth = 2;
    roundRect(c, x, y, w, h, 6);
    c.fill();
    c.stroke();

    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = hover ? '#000000' : color;
    c.font = 'bold 14px monospace';
    c.fillText(label, x + w / 2, y + h / 2);
    c.restore();
  }

  private onClick = (ev: MouseEvent): void => {
    const rect = this.ctx.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    for (let i = 0; i < this.btnRects.length; i++) {
      const b = this.btnRects[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (this.screen === 'roomClear') {
          this.onContinue();
        } else if (this.screen === 'upgradeChoice') {
          const opt = this.upgradeOptions[i];
          if (opt) this.onUpgradePick(opt);
        } else if (this.screen === 'gameover' || this.screen === 'victory') {
          this.onRestart();
        }
        return;
      }
    }
  };

  private onMouseMove = (ev: MouseEvent): void => {
    const rect = this.ctx.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    this.hoverBtn = -1;
    for (let i = 0; i < this.btnRects.length; i++) {
      const b = this.btnRects[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.hoverBtn = i;
        break;
      }
    }
  };
}

function shuffleIndices(n: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < n; i++) arr.push(i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
