/** UI screens — main menu, level up, game over, victory */

import { Player } from './components';
import { WEAPONS, STAT_UPGRADES } from './config';
import { shuffle } from '@survivors/core';

export type GameScreen = 'menu' | 'playing' | 'levelup' | 'gameover' | 'victory' | 'paused';

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  action: () => void;
}

export class UIManager {
  currentUpgrades: UpgradeOption[] = [];
  selectedUpgrade = -1;
  canRevive = false;
  private onRevive: (() => void) | null = null;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private onUpgradeSelected: (index: number) => void,
    private onRestart: () => void,
  ) {
    // Click handler
    this.ctx.canvas.addEventListener('click', this.onClick);
    this.ctx.canvas.addEventListener('touchend', this.onTouch);
  }

  drawMenu(w: number, h: number, isMobile = false): void {
    const ctx = this.ctx;
    const s = Math.min(1, w / 700);

    // Dim background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.fillRect(0, 0, w, h);

    const cy = Math.min(h * 0.4, h / 2);
    ctx.textAlign = 'center';

    // Title with glow
    ctx.save();
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 30 * s;
    ctx.fillStyle = '#00ffff';
    ctx.font = `bold ${Math.max(26, Math.round(52 * s))}px monospace`;
    ctx.fillText('NEON SURVIVORS', w / 2, cy - 50);
    ctx.restore();

    // Subtitle
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8888aa';
    ctx.font = `${Math.max(12, Math.round(16 * s))}px monospace`;
    ctx.fillText('Survive the swarm. Grow stronger.', w / 2, cy - 10);

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
      ctx.fillText('WASD / Arrows = move', w / 2, cy + 100);
      ctx.fillText('Mouse = aim & shoot  |  ESC = pause', w / 2, cy + 118);
    }
  }

  drawLevelUp(w: number, h: number): void {
    const ctx = this.ctx;

    // Dim background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.save();
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP!', w / 2, 80);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaaacc';
    ctx.font = '14px monospace';
    ctx.fillText('Choose an upgrade', w / 2, 110);

    // Cards — responsive sizing
    const maxCardW = 180;
    const gap = Math.min(20, w * 0.02);
    const cardW = Math.min(maxCardW, (w - gap * 4) / this.currentUpgrades.length);
    const cardH = Math.min(200, cardW * 1.15);
    const totalW = this.currentUpgrades.length * cardW + (this.currentUpgrades.length - 1) * gap;
    const startX = (w - totalW) / 2;
    const startY = (h - cardH) / 2;

    for (let i = 0; i < this.currentUpgrades.length; i++) {
      const upg = this.currentUpgrades[i];
      const cx = startX + i * (cardW + gap);
      const cy = startY;
      const hover = this.isHovering(cx, cy, cardW, cardH);

      // Card background
      ctx.fillStyle = hover ? '#1a1a4a' : '#111133';
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = hover ? upg.color : '#333355';
      ctx.lineWidth = hover ? 2 : 1;
      ctx.strokeRect(cx, cy, cardW, cardH);

      // Glow on hover
      if (hover) {
        ctx.save();
        ctx.shadowColor = upg.color;
        ctx.shadowBlur = 15;
        ctx.strokeRect(cx, cy, cardW, cardH);
        ctx.restore();
      }

      // Icon
      const iconSize = Math.max(24, Math.round(36 * cardW / maxCardW));
      ctx.font = `${iconSize}px serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(upg.icon, cx + cardW / 2, cy + cardH * 0.28);

      // Name
      ctx.fillStyle = upg.color;
      const nameSize = Math.max(10, Math.round(14 * cardW / maxCardW));
      ctx.font = `bold ${nameSize}px monospace`;
      ctx.fillText(upg.name, cx + cardW / 2, cy + cardH * 0.45);

      // Description
      ctx.fillStyle = '#aaaacc';
      const descSize = Math.max(9, Math.round(11 * cardW / maxCardW));
      ctx.font = `${descSize}px monospace`;
      const words = upg.description.split(' ');
      let line = '';
      let ly = cy + cardH * 0.58;
      for (const word of words) {
        const test = line + (line ? ' ' : '') + word;
        if (ctx.measureText(test).width > cardW - 16) {
          ctx.fillText(line, cx + cardW / 2, ly);
          line = word;
          ly += descSize + 3;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, cx + cardW / 2, ly);
    }
  }

  setReviveHandler(handler: () => void): void {
    this.onRevive = handler;
  }

  drawGameOver(w: number, h: number, player: Player, gameTime: number, victory: boolean): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 10, 26, 0.92)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';

    // Title
    ctx.save();
    ctx.shadowColor = victory ? '#44ff44' : '#ff4444';
    ctx.shadowBlur = 25;
    ctx.fillStyle = victory ? '#44ff44' : '#ff4444';
    ctx.font = 'bold 42px monospace';
    ctx.fillText(victory ? 'VICTORY!' : 'GAME OVER', w / 2, h / 2 - 100);
    ctx.restore();

    // Stats
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ccccdd';
    ctx.font = '16px monospace';
    const min = Math.floor(gameTime / 60);
    const sec = Math.floor(gameTime % 60);
    const stats = [
      `Time survived: ${min}:${sec.toString().padStart(2, '0')}`,
      `Level reached: ${player.level}`,
      `Enemies killed: ${player.kills}`,
      `Damage dealt: ${Math.round(player.damageDealt)}`,
    ];
    stats.forEach((s, i) => {
      ctx.fillText(s, w / 2, h / 2 - 30 + i * 28);
    });

    // Revive button (only on game over, not victory, and only once)
    if (!victory && this.canRevive) {
      const revW = 240, revH = 44;
      const revX = w / 2 - revW / 2;
      const revY = h / 2 + 90;
      const revHover = this.isHovering(revX, revY, revW, revH);

      ctx.fillStyle = revHover ? '#3a2a1a' : '#2a1a0a';
      ctx.fillRect(revX, revY, revW, revH);
      ctx.strokeStyle = '#ffaa33';
      ctx.lineWidth = revHover ? 2 : 1;
      ctx.strokeRect(revX, revY, revW, revH);

      const pulse = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ffaa33';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('▶ WATCH AD — REVIVE', w / 2, revY + 28);
      ctx.globalAlpha = 1;
    }

    // Restart button
    const btnW = 200, btnH = 44;
    const btnX = w / 2 - btnW / 2;
    const btnY = !victory && this.canRevive ? h / 2 + 150 : h / 2 + 100;
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

  drawPaused(w: number, h: number): void {
    const ctx = this.ctx;
    const mobile = w < 600;

    ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#00ffff';
    ctx.font = `bold ${mobile ? 32 : 42}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', w / 2, h / 2 - 10);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.font = `${mobile ? 14 : 16}px monospace`;
    ctx.fillStyle = '#8888aa';
    ctx.fillText(mobile ? 'Tap ⏸ to resume' : 'ESC or click ⏸ to resume', w / 2, h / 2 + 30);

    if (!mobile) {
      ctx.font = '13px monospace';
      ctx.fillStyle = '#555566';
      ctx.fillText('MOUSE = aim  |  WASD = move', w / 2, h / 2 + 65);
    }
  }

  generateUpgrades(player: Player): UpgradeOption[] {
    const options: UpgradeOption[] = [];

    // New weapons the player doesn't have
    const ownedWeapons = new Set(player.weapons.map(w => w.type));
    for (const [type, def] of Object.entries(WEAPONS)) {
      if (!ownedWeapons.has(type)) {
        options.push({
          id: `new_${type}`,
          name: `NEW: ${def.name}`,
          description: def.description,
          icon: def.icon,
          color: def.color,
          action: () => {
            player.weapons.push({ type, level: 0, timer: 0 });
          },
        });
      }
    }

    // Weapon upgrades
    for (const slot of player.weapons) {
      const def = WEAPONS[slot.type];
      if (!def || slot.level >= def.levels.length - 1) continue;
      options.push({
        id: `up_${slot.type}`,
        name: `${def.name} LV${slot.level + 2}`,
        description: `Upgrade ${def.name}`,
        icon: def.icon,
        color: def.color,
        action: () => { slot.level++; },
      });
    }

    // Stat upgrades
    for (const [key, stat] of Object.entries(STAT_UPGRADES)) {
      options.push({
        id: `stat_${key}`,
        name: stat.name,
        description: `Permanent stat boost`,
        icon: stat.icon,
        color: '#88aaff',
        action: () => {
          // Applied externally via gameState
        },
      });
    }

    // Pick 3 random
    shuffle(options);
    this.currentUpgrades = options.slice(0, 3);
    return this.currentUpgrades;
  }

  // Mouse tracking for hover effects
  private mouseX = 0;
  private mouseY = 0;

  trackMouse = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };

  enableTracking(): void {
    this.ctx.canvas.addEventListener('mousemove', this.trackMouse);
  }

  private isHovering(x: number, y: number, w: number, h: number): boolean {
    return this.mouseX >= x && this.mouseX <= x + w && this.mouseY >= y && this.mouseY <= y + h;
  }

  private onClick = (e: MouseEvent) => {
    this.handleClick(e.clientX, e.clientY);
  };

  private onTouch = (e: TouchEvent) => {
    if (e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      this.handleClick(t.clientX, t.clientY);
    }
  };

  private handleClick(x: number, y: number): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Level up card click (responsive sizing must match drawLevelUp)
    if (this.currentUpgrades.length > 0) {
      const maxCardW = 180;
      const gap = Math.min(20, w * 0.02);
      const cardW = Math.min(maxCardW, (w - gap * 4) / this.currentUpgrades.length);
      const cardH = Math.min(200, cardW * 1.15);
      const totalW = this.currentUpgrades.length * cardW + (this.currentUpgrades.length - 1) * gap;
      const startX = (w - totalW) / 2;
      const startY = (h - cardH) / 2;

      for (let i = 0; i < this.currentUpgrades.length; i++) {
        const cx = startX + i * (cardW + gap);
        if (x >= cx && x <= cx + cardW && y >= startY && y <= startY + cardH) {
          this.onUpgradeSelected(i);
          return;
        }
      }
    }

    // Revive button click
    if (this.canRevive && this.onRevive) {
      const revW = 240, revH = 44;
      const revX = w / 2 - revW / 2;
      const revY = h / 2 + 90;
      if (x >= revX && x <= revX + revW && y >= revY && y <= revY + revH) {
        this.onRevive();
        return;
      }
    }

    // Restart button click
    const btnW = 200, btnH = 44;
    const btnX = w / 2 - btnW / 2;
    const btnY = this.canRevive ? h / 2 + 150 : h / 2 + 100;
    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      this.onRestart();
    }
  }

  destroy(): void {
    this.ctx.canvas.removeEventListener('click', this.onClick);
    this.ctx.canvas.removeEventListener('touchend', this.onTouch);
    this.ctx.canvas.removeEventListener('mousemove', this.trackMouse);
  }
}
