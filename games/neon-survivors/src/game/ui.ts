/** UI screens — main menu, level up, game over, victory */

import { Player } from './components';
import { WEAPONS, STAT_UPGRADES, type GameMode } from './config';
import { shuffle } from '@survivors/core';
import { t, getLocale, setLocale } from './i18n';

export type GameScreen = 'menu' | 'playing' | 'levelup' | 'gameover' | 'victory' | 'paused' | 'loading';

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
  screen: GameScreen = 'menu';
  private onRevive: (() => void) | null = null;
  private onShare: ((text: string) => void) | null = null;
  private onResume: (() => void) | null = null;
  private onMainMenu: (() => void) | null = null;
  private onPlay: (() => void) | null = null;
  private onToggleSound: (() => void) | null = null;
  /** True if the last click was handled internally (e.g. lang switcher) — game should ignore it */
  clickConsumed = false;
  selectedMode: GameMode = 'classic';
  ngPlusLevel = 0;
  soundMuted = false;
  private shareData: { kills: number; time: string; level: number; victory: boolean } | null = null;
  private copiedTimer = 0;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private onUpgradeSelected: (index: number) => void,
    private onRestart: () => void,
  ) {
    this.ctx.canvas.addEventListener('click', this.onClick);
    this.ctx.canvas.addEventListener('touchend', this.onTouch);
  }

  drawMenu(w: number, h: number, isMobile = false): void {
    const ctx = this.ctx;
    const s = Math.min(1, w / 700);
    const strings = t();

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
    ctx.fillStyle = '#8888aa';
    ctx.font = `${Math.max(12, Math.round(16 * s))}px monospace`;
    ctx.fillText(strings.subtitle, w / 2, cy - 10);

    // PLAY button
    const playW = Math.max(160, Math.round(200 * s));
    const playH = Math.max(40, Math.round(48 * s));
    const playX = w / 2 - playW / 2;
    const playY = cy + 30;
    const playHover = this.isHovering(playX, playY, playW, playH);
    const pulse = 0.85 + Math.sin(Date.now() * 0.003) * 0.15;

    ctx.save();
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = playHover ? 18 : 10;
    ctx.fillStyle = playHover ? '#0a2a3a' : '#061a2a';
    ctx.fillRect(playX, playY, playW, playH);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = pulse;
    ctx.strokeRect(playX, playY, playW, playH);
    ctx.restore();

    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#00ffff';
    ctx.font = `bold ${Math.max(18, Math.round(24 * s))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(strings.play, w / 2, playY + playH / 2 + Math.round(8 * s));
    ctx.globalAlpha = 1;

    // Controls
    ctx.fillStyle = '#555566';
    ctx.font = `${Math.max(11, Math.round(13 * s))}px monospace`;
    if (isMobile) {
      ctx.fillText(strings.moveLeft, w / 2, cy + 100);
      ctx.fillText(strings.aimLeft, w / 2, cy + 118);
    } else {
      ctx.fillText(strings.movePC, w / 2, cy + 100);
      ctx.fillText(strings.aimPC, w / 2, cy + 118);
    }

    // Mode selection buttons
    this.drawModeSelector(w, h, s);

    // Language switcher and sound button (top-right)
    this.drawLangSwitcher(w, s);
    this.drawSoundButton(w, s);
  }

  private drawModeSelector(w: number, h: number, s: number): void {
    const ctx = this.ctx;
    const strings = t();
    const cy = Math.min(h * 0.4, h / 2);
    const btnW = Math.max(140, Math.round(180 * s));
    const btnH = Math.max(32, Math.round(38 * s));
    const gap = Math.max(8, Math.round(12 * s));
    const totalW = btnW * 2 + gap;
    const startX = (w - totalW) / 2;
    const btnY = cy + Math.max(140, Math.round(155 * s));
    const fontSize = Math.max(10, Math.round(13 * s));

    for (const [i, mode] of (['classic', 'endless'] as const).entries()) {
      const bx = startX + i * (btnW + gap);
      const active = this.selectedMode === mode;
      const hover = this.isHovering(bx, btnY, btnW, btnH);
      const label = mode === 'classic' ? strings.modeClassic : strings.modeEndless;

      ctx.fillStyle = active ? '#00ffff11' : hover ? '#ffffff08' : 'transparent';
      ctx.fillRect(bx, btnY, btnW, btnH);
      ctx.strokeStyle = active ? '#00ffff' : hover ? '#555577' : '#333355';
      ctx.lineWidth = active ? 2 : 1;
      ctx.strokeRect(bx, btnY, btnW, btnH);

      if (active) {
        ctx.save();
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.strokeRect(bx, btnY, btnW, btnH);
        ctx.restore();
      }

      ctx.fillStyle = active ? '#00ffff' : '#777799';
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(label, bx + btnW / 2, btnY + btnH / 2 + fontSize * 0.35);
    }

    // NG+ badge (below classic button)
    if (this.ngPlusLevel > 0 && this.selectedMode === 'classic') {
      ctx.fillStyle = '#ffaa33';
      ctx.font = `bold ${Math.max(10, Math.round(12 * s))}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${strings.nextRun} NG+${this.ngPlusLevel}`, w / 2, btnY + btnH + Math.round(18 * s));
    }

    // Mode description
    const descY = btnY + btnH + (this.ngPlusLevel > 0 && this.selectedMode === 'classic' ? Math.round(34 * s) : Math.round(18 * s));
    ctx.fillStyle = '#555566';
    ctx.font = `${Math.max(9, Math.round(11 * s))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(
      this.selectedMode === 'classic' ? strings.modeClassicDesc : strings.modeEndlessDesc,
      w / 2, descY
    );
  }

  private drawSoundButton(w: number, s: number): void {
    const ctx = this.ctx;
    const lBtnW = Math.max(38, Math.round(46 * s));
    const lBtnH = Math.max(26, Math.round(30 * s));
    const lGap = 4;
    const lTotalW = lBtnW * 2 + lGap;
    const btnW = lBtnH; // square, same height as lang buttons
    const btnH = lBtnH;
    const bx = w - lTotalW - 12 - btnW - 8; // left of lang buttons
    const by = 12; // same row as lang switcher
    const hover = this.isHovering(bx, by, btnW, btnH);
    const muted = this.soundMuted;

    ctx.fillStyle = hover ? '#ffffff11' : 'transparent';
    ctx.fillRect(bx, by, btnW, btnH);
    ctx.strokeStyle = muted ? '#ff4444' : '#555577';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, btnW, btnH);

    // Draw speaker icon centered in button
    const cx = bx + btnW / 2 - 1; // shift left slightly to visually center with waves
    const cy = by + btnH / 2;
    const sz = Math.min(btnW, btnH) * 0.32;

    ctx.fillStyle = muted ? '#ff4444' : '#888899';
    ctx.strokeStyle = muted ? '#ff4444' : '#888899';
    ctx.lineWidth = 1.5;

    // Speaker body (centered around cx)
    ctx.beginPath();
    ctx.moveTo(cx - sz * 0.5, cy - sz * 0.3);
    ctx.lineTo(cx - sz * 0.1, cy - sz * 0.3);
    ctx.lineTo(cx + sz * 0.4, cy - sz * 0.7);
    ctx.lineTo(cx + sz * 0.4, cy + sz * 0.7);
    ctx.lineTo(cx - sz * 0.1, cy + sz * 0.3);
    ctx.lineTo(cx - sz * 0.5, cy + sz * 0.3);
    ctx.closePath();
    ctx.fill();

    if (muted) {
      // X mark
      ctx.beginPath();
      ctx.moveTo(cx + sz * 0.6, cy - sz * 0.4);
      ctx.lineTo(cx + sz * 1.1, cy + sz * 0.4);
      ctx.moveTo(cx + sz * 1.1, cy - sz * 0.4);
      ctx.lineTo(cx + sz * 0.6, cy + sz * 0.4);
      ctx.stroke();
    } else {
      // Sound waves
      ctx.beginPath();
      ctx.arc(cx + sz * 0.5, cy, sz * 0.5, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + sz * 0.5, cy, sz * 0.85, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
    }
  }

  private drawLangSwitcher(w: number, s: number): void {
    const ctx = this.ctx;
    const locale = getLocale();
    const btnW = Math.max(38, Math.round(46 * s));
    const btnH = Math.max(26, Math.round(30 * s));
    const gap = 4;
    const totalW = btnW * 2 + gap;
    const rx = w - totalW - 12;
    const ry = 12;
    const fontSize = Math.max(10, Math.round(13 * s));

    for (const [i, lang] of (['en', 'ru'] as const).entries()) {
      const bx = rx + i * (btnW + gap);
      const active = locale === lang;
      ctx.fillStyle = active ? '#00ffff22' : 'transparent';
      ctx.fillRect(bx, ry, btnW, btnH);
      ctx.strokeStyle = active ? '#00ffff' : '#444466';
      ctx.lineWidth = active ? 1.5 : 1;
      ctx.strokeRect(bx, ry, btnW, btnH);
      ctx.fillStyle = active ? '#00ffff' : '#555577';
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(lang.toUpperCase(), bx + btnW / 2, ry + btnH / 2 + fontSize * 0.35);
    }
  }

  drawLevelUp(w: number, h: number): void {
    const ctx = this.ctx;
    const strings = t();

    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(strings.levelUp, w / 2, 80);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaaacc';
    ctx.font = '14px monospace';
    ctx.fillText(strings.chooseUpgrade, w / 2, 110);

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

      ctx.fillStyle = hover ? '#1a1a4a' : '#111133';
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = hover ? upg.color : '#333355';
      ctx.lineWidth = hover ? 2 : 1;
      ctx.strokeRect(cx, cy, cardW, cardH);

      if (hover) {
        ctx.save();
        ctx.shadowColor = upg.color;
        ctx.shadowBlur = 15;
        ctx.strokeRect(cx, cy, cardW, cardH);
        ctx.restore();
      }

      const iconSize = Math.max(24, Math.round(36 * cardW / maxCardW));
      ctx.font = `${iconSize}px serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(upg.icon, cx + cardW / 2, cy + cardH * 0.28);

      ctx.fillStyle = upg.color;
      const nameSize = Math.max(10, Math.round(14 * cardW / maxCardW));
      ctx.font = `bold ${nameSize}px monospace`;
      ctx.fillText(upg.name, cx + cardW / 2, cy + cardH * 0.45);

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

  setReviveHandler(handler: () => void): void { this.onRevive = handler; }
  setShareHandler(handler: (text: string) => void): void { this.onShare = handler; }

  showCopiedFeedback(): void {
    this.copiedTimer = 2.0; // show "Copied!" for 2 seconds
  }
  setResumeHandler(handler: () => void): void { this.onResume = handler; }
  setMainMenuHandler(handler: () => void): void { this.onMainMenu = handler; }
  setPlayHandler(handler: () => void): void { this.onPlay = handler; }
  setToggleSoundHandler(handler: () => void): void { this.onToggleSound = handler; }

  drawGameOver(w: number, h: number, player: Player, gameTime: number, victory: boolean): void {
    const ctx = this.ctx;
    const strings = t();

    ctx.fillStyle = 'rgba(10, 10, 26, 0.92)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowColor = victory ? '#44ff44' : '#ff4444';
    ctx.shadowBlur = 25;
    ctx.fillStyle = victory ? '#44ff44' : '#ff4444';
    ctx.font = 'bold 42px monospace';
    ctx.fillText(victory ? strings.victory : strings.gameOver, w / 2, h / 2 - 100);
    ctx.restore();

    ctx.fillStyle = '#ccccdd';
    ctx.font = '16px monospace';
    const min = Math.floor(gameTime / 60);
    const sec = Math.floor(gameTime % 60);
    const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;
    const stats = [
      `${strings.timeSurvived} ${timeStr}`,
      `${strings.levelReached} ${player.level}`,
      `${strings.enemiesKilled} ${player.kills}`,
      `${strings.damageDealt} ${Math.round(player.damageDealt)}`,
    ];
    stats.forEach((s, i) => {
      ctx.fillText(s, w / 2, h / 2 - 30 + i * 28);
    });

    // Revive button
    if (!victory && this.canRevive) {
      const revW = 260, revH = 44;
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
      ctx.fillText(strings.watchAdRevive, w / 2, revY + 28);
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
    ctx.fillText(strings.playAgain, w / 2, btnY + 28);

    // Share button
    const shareW = 200, shareH = 38;
    const shareX = w / 2 - shareW / 2;
    const shareY = btnY + btnH + 14;
    const shareHover = this.isHovering(shareX, shareY, shareW, shareH);

    ctx.fillStyle = shareHover ? '#1a3a1a' : '#0a2a0a';
    ctx.fillRect(shareX, shareY, shareW, shareH);
    ctx.strokeStyle = '#44ff44';
    ctx.lineWidth = shareHover ? 2 : 1;
    ctx.strokeRect(shareX, shareY, shareW, shareH);
    ctx.fillStyle = '#44ff44';
    ctx.font = 'bold 15px monospace';
    const shareLabel = this.copiedTimer > 0 ? (strings.copied ?? 'Copied!') : strings.shareScore;
    ctx.fillText(shareLabel, w / 2, shareY + 24);

    if (this.copiedTimer > 0) this.copiedTimer -= 0.016;

    // Main menu button
    const menuW = 200, menuH = 38;
    const menuX = w / 2 - menuW / 2;
    const menuY = shareY + shareH + 10;
    const menuHover = this.isHovering(menuX, menuY, menuW, menuH);

    ctx.fillStyle = menuHover ? '#2a1a1a' : '#1a0a0a';
    ctx.fillRect(menuX, menuY, menuW, menuH);
    ctx.strokeStyle = '#777799';
    ctx.lineWidth = menuHover ? 2 : 1;
    ctx.strokeRect(menuX, menuY, menuW, menuH);
    ctx.fillStyle = '#777799';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(strings.mainMenu, w / 2, menuY + 24);

    this.shareData = { kills: player.kills, time: timeStr, level: player.level, victory };
  }

  drawPaused(w: number, h: number): void {
    const ctx = this.ctx;
    const mobile = w < 600;
    const strings = t();

    ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#00ffff';
    ctx.font = `bold ${mobile ? 32 : 42}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(strings.paused, w / 2, h / 2 - 30);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.font = `${mobile ? 14 : 16}px monospace`;
    ctx.fillStyle = '#8888aa';
    ctx.fillText(mobile ? strings.tapResume : strings.escResume, w / 2, h / 2 + 10);

    if (!mobile) {
      ctx.font = '13px monospace';
      ctx.fillStyle = '#555566';
      ctx.fillText(strings.aimHintPause, w / 2, h / 2 + 40);
    }

    // Resume button
    const resBtnW = 180, resBtnH = 38;
    const resBtnX = w / 2 - resBtnW / 2;
    const resBtnY = h / 2 + (mobile ? 50 : 65);
    const resHover = this.isHovering(resBtnX, resBtnY, resBtnW, resBtnH);

    ctx.fillStyle = resHover ? '#1a2a2a' : '#0a1a1a';
    ctx.fillRect(resBtnX, resBtnY, resBtnW, resBtnH);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = resHover ? 2 : 1;
    ctx.strokeRect(resBtnX, resBtnY, resBtnW, resBtnH);
    ctx.fillStyle = '#00ffff';
    ctx.font = `bold ${mobile ? 14 : 15}px monospace`;
    ctx.fillText(strings.resume, w / 2, resBtnY + 25);

    // Restart button
    const btnW = 180, btnH = 38;
    const btnX = w / 2 - btnW / 2;
    const btnY = resBtnY + resBtnH + 12;
    const hover = this.isHovering(btnX, btnY, btnW, btnH);

    ctx.fillStyle = hover ? '#2a1a1a' : '#1a1010';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = hover ? 2 : 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = '#ff4444';
    ctx.font = `bold ${mobile ? 14 : 15}px monospace`;
    ctx.fillText(strings.restart, w / 2, btnY + 25);

    // Main menu button
    const menuW = 180, menuH = 38;
    const menuX = w / 2 - menuW / 2;
    const menuY = btnY + btnH + 12;
    const menuHover = this.isHovering(menuX, menuY, menuW, menuH);

    ctx.fillStyle = menuHover ? '#1a1a1a' : '#111111';
    ctx.fillRect(menuX, menuY, menuW, menuH);
    ctx.strokeStyle = '#666688';
    ctx.lineWidth = menuHover ? 2 : 1;
    ctx.strokeRect(menuX, menuY, menuW, menuH);
    ctx.fillStyle = '#888899';
    ctx.font = `bold ${mobile ? 14 : 15}px monospace`;
    ctx.fillText(strings.mainMenu, w / 2, menuY + 25);

    // Sound toggle
    const s = Math.min(1, w / 700);
    this.drawSoundButton(w, s);
  }

  generateUpgrades(player: Player): UpgradeOption[] {
    const options: UpgradeOption[] = [];
    const strings = t();
    const ownedWeapons = new Set(player.weapons.map(w => w.type));

    for (const [type, def] of Object.entries(WEAPONS)) {
      if (!ownedWeapons.has(type)) {
        const loc = strings.weapons[type];
        options.push({
          id: `new_${type}`,
          name: `${strings.newWeaponPrefix}${loc?.name ?? def.name}`,
          description: loc?.description ?? def.description,
          icon: def.icon,
          color: def.color,
          action: () => { player.weapons.push({ type, level: 0, timer: 0 }); },
        });
      }
    }

    for (const slot of player.weapons) {
      const def = WEAPONS[slot.type];
      if (!def || slot.level >= def.levels.length - 1) continue;
      const loc = strings.weapons[slot.type];
      const name = loc?.name ?? def.name;
      options.push({
        id: `up_${slot.type}`,
        name: `${name} LV${slot.level + 2}`,
        description: `${strings.upgradePrefix}${name}`,
        icon: def.icon,
        color: def.color,
        action: () => { slot.level++; },
      });
    }

    for (const key of Object.keys(STAT_UPGRADES)) {
      const stat = STAT_UPGRADES[key as keyof typeof STAT_UPGRADES];
      options.push({
        id: `stat_${key}`,
        name: strings.stats[key] ?? stat.name,
        description: strings.permanentStat,
        icon: stat.icon,
        color: '#88aaff',
        action: () => { /* Applied externally via gameState */ },
      });
    }

    if (player.firingMode === 'normal') {
      options.push({
        id: 'mode_shotgun',
        name: strings.shotgunMode,
        description: strings.shotgunDesc,
        icon: '💥',
        color: '#ff8844',
        action: () => { player.firingMode = 'shotgun'; },
      });
      options.push({
        id: 'mode_rapid',
        name: strings.rapidFire,
        description: strings.rapidDesc,
        icon: '⚡',
        color: '#ffdd00',
        action: () => { player.firingMode = 'rapid'; },
      });
    }

    shuffle(options);
    this.currentUpgrades = options.slice(0, 3);
    return this.currentUpgrades;
  }

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

  private onClick = (e: MouseEvent) => { this.clickConsumed = false; this.handleClick(e.clientX, e.clientY); };
  private onTouch = (e: TouchEvent) => {
    if (e.changedTouches.length > 0) {
      this.clickConsumed = false;
      const touch = e.changedTouches[0];
      this.handleClick(touch.clientX, touch.clientY);
    }
  };

  private checkSoundButtonClick(x: number, y: number, w: number): boolean {
    const s = Math.min(1, w / 700);
    const lBtnW = Math.max(38, Math.round(46 * s));
    const lBtnH = Math.max(26, Math.round(30 * s));
    const lGap = 4;
    const lTotalW = lBtnW * 2 + lGap;
    const btnW = lBtnH;
    const btnH = lBtnH;
    const bx = w - lTotalW - 12 - btnW - 8;
    const by = 12;
    if (x >= bx && x <= bx + btnW && y >= by && y <= by + btnH) {
      if (this.onToggleSound) this.onToggleSound();
      return true;
    }
    return false;
  }

  private handleClick(x: number, y: number): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Language switcher + mode selector (only on menu screen)
    if (this.screen === 'menu') {
      const s = Math.min(1, w / 700);

      // Sound toggle
      if (this.checkSoundButtonClick(x, y, w)) {
        this.clickConsumed = true;
        return;
      }

      // Language buttons
      const lBtnW = Math.max(38, Math.round(46 * s));
      const lBtnH = Math.max(26, Math.round(30 * s));
      const lGap = 4;
      const lTotalW = lBtnW * 2 + lGap;
      const lRx = w - lTotalW - 12;
      const lRy = 12;
      for (const [i, lang] of (['en', 'ru'] as const).entries()) {
        const bx = lRx + i * (lBtnW + lGap);
        if (x >= bx && x <= bx + lBtnW && y >= lRy && y <= lRy + lBtnH) {
          setLocale(lang);
          this.clickConsumed = true;
          return;
        }
      }

      // Mode selector buttons
      const cy = Math.min(h * 0.4, h / 2);
      const mBtnW = Math.max(140, Math.round(180 * s));
      const mBtnH = Math.max(32, Math.round(38 * s));
      const mGap = Math.max(8, Math.round(12 * s));
      const mTotalW = mBtnW * 2 + mGap;
      const mStartX = (w - mTotalW) / 2;
      const mBtnY = cy + Math.max(140, Math.round(155 * s));
      for (const [i, mode] of (['classic', 'endless'] as const).entries()) {
        const bx = mStartX + i * (mBtnW + mGap);
        if (x >= bx && x <= bx + mBtnW && y >= mBtnY && y <= mBtnY + mBtnH) {
          this.selectedMode = mode;
          this.clickConsumed = true;
          return;
        }
      }

      // PLAY button
      const menuCy = Math.min(h * 0.4, h / 2);
      const playW = Math.max(160, Math.round(200 * s));
      const playH = Math.max(40, Math.round(48 * s));
      const playX = w / 2 - playW / 2;
      const playY = menuCy + 30;
      if (x >= playX && x <= playX + playW && y >= playY && y <= playY + playH) {
        this.clickConsumed = true;
        if (this.onPlay) this.onPlay();
        return;
      }
    }

    // Level up card click
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

    // Pause screen
    if (this.screen === 'paused') {
      if (this.checkSoundButtonClick(x, y, w)) return;
      const mobile = w < 600;
      const resBtnW = 180, resBtnH = 38;
      const resBtnX = w / 2 - resBtnW / 2;
      const resBtnY = h / 2 + (mobile ? 50 : 65);
      if (x >= resBtnX && x <= resBtnX + resBtnW && y >= resBtnY && y <= resBtnY + resBtnH) {
        if (this.onResume) this.onResume();
        return;
      }
      const btnW = 180, btnH = 38;
      const btnX = w / 2 - btnW / 2;
      const btnY = resBtnY + resBtnH + 12;
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        this.onRestart();
        return;
      }
      const menuW = 180, menuH = 38;
      const menuX = w / 2 - menuW / 2;
      const menuY = btnY + btnH + 12;
      if (x >= menuX && x <= menuX + menuW && y >= menuY && y <= menuY + menuH) {
        if (this.onMainMenu) this.onMainMenu();
        return;
      }
    }

    // Revive button
    if (this.canRevive && this.onRevive) {
      const revW = 260, revH = 44;
      const revX = w / 2 - revW / 2;
      const revY = h / 2 + 90;
      if (x >= revX && x <= revX + revW && y >= revY && y <= revY + revH) {
        this.onRevive();
        return;
      }
    }

    // Game-over / victory buttons (Restart, Share, Main menu)
    if (this.screen === 'gameover' || this.screen === 'victory') {
      const btnW = 200, btnH = 44;
      const btnX = w / 2 - btnW / 2;
      const btnY = this.canRevive ? h / 2 + 150 : h / 2 + 100;
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        this.onRestart();
        return;
      }

      // Share button
      if (this.shareData && this.onShare) {
        const shareW = 200, shareH = 38;
        const shareX = w / 2 - shareW / 2;
        const shareY = btnY + btnH + 14;
        if (x >= shareX && x <= shareX + shareW && y >= shareY && y <= shareY + shareH) {
          const d = this.shareData;
          const strings = t();
          const text = d.victory
            ? strings.shareVictory(d.level, d.kills, d.time)
            : strings.shareDeath(d.level, d.kills, d.time);
          this.onShare(text);
          return;
        }
      }

      // Main menu button (below share)
      if (this.onMainMenu) {
        const shareY = btnY + btnH + 14;
        const menuW = 200, menuH = 38;
        const menuX = w / 2 - menuW / 2;
        const menuY = shareY + 38 + 10;
        if (x >= menuX && x <= menuX + menuW && y >= menuY && y <= menuY + menuH) {
          this.onMainMenu();
          return;
        }
      }
    }
  }

  destroy(): void {
    this.ctx.canvas.removeEventListener('click', this.onClick);
    this.ctx.canvas.removeEventListener('touchend', this.onTouch);
    this.ctx.canvas.removeEventListener('mousemove', this.trackMouse);
  }
}
