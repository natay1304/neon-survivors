/** UI screens — HTML overlay replacing canvas drawing */

import { Player, Health } from './components';
import { WEAPONS, STAT_UPGRADES, GAME_DURATION, type GameMode } from './config';
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

// ── CSS injected once per page ─────────────────────────────────────
const CSS = `
#ui-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  font-family: monospace;
  z-index: 100;
  overflow: hidden;
}
.ui-screen {
  position: absolute;
  inset: 0;
  display: none;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}
.ui-screen.vis { display: flex; }

/* ── MENU ──────────────────────────────────────────────────────── */
#ui-menu { background: rgba(10,10,26,0.95); justify-content: center; }
.ui-menu-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  pointer-events: auto;
}
#ui-menu-title {
  font-size: clamp(26px, 7.4vw, 52px);
  font-weight: bold;
  color: #00ffff;
  text-shadow: 0 0 30px #00ffff;
  margin: 0;
  white-space: nowrap;
  pointer-events: none;
}
#ui-menu-subtitle {
  font-size: clamp(12px, 2.3vw, 16px);
  color: #8888aa;
  margin: 0;
  text-align: center;
  pointer-events: none;
}
#ui-play {
  width: clamp(160px, 28.6vw, 200px);
  height: clamp(40px, 6.9vw, 48px);
  background: #061a2a;
  border: 2px solid #00ffff;
  color: #00ffff;
  font-family: monospace;
  font-size: clamp(18px, 3.4vw, 24px);
  font-weight: bold;
  cursor: pointer;
  pointer-events: auto;
  animation: ui-pulse 1.15s ease-in-out infinite;
  text-shadow: 0 0 10px #00ffff;
  box-shadow: 0 0 10px #00ffff;
}
#ui-play:hover { background: #0a2a3a; box-shadow: 0 0 18px #00ffff; }
@keyframes ui-pulse {
  0%, 100% { opacity: 0.85; }
  50%       { opacity: 1; }
}
.ui-hints {
  font-size: clamp(11px, 1.9vw, 13px);
  color: #555566;
  text-align: center;
  line-height: 1.6;
  margin: 0;
  pointer-events: none;
}
.ui-mode-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.ui-mode-row { display: flex; gap: clamp(8px, 1.7vw, 12px); }
.ui-mode-btn {
  width: clamp(140px, 25.7vw, 180px);
  height: clamp(32px, 5.4vw, 38px);
  font-family: monospace;
  font-size: clamp(10px, 1.86vw, 13px);
  font-weight: bold;
  cursor: pointer;
  border: 1px solid #333355;
  background: transparent;
  color: #777799;
  pointer-events: auto;
}
.ui-mode-btn.active {
  border: 2px solid #00ffff;
  color: #00ffff;
  text-shadow: 0 0 8px #00ffff;
  box-shadow: 0 0 8px #00ffff;
}
#ui-ng-badge {
  font-size: clamp(10px, 1.7vw, 12px);
  font-weight: bold;
  color: #ffaa33;
  display: none;
  text-align: center;
}
.ui-mode-desc {
  font-size: clamp(9px, 1.57vw, 11px);
  color: #555566;
  margin: 0;
  text-align: center;
  pointer-events: none;
}

/* ── TOP-RIGHT CONTROLS ────────────────────────────────────────── */
#ui-controls {
  position: fixed;
  top: 12px;
  right: 12px;
  display: none;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
  z-index: 200;
}
#ui-controls.vis { display: flex; }
.ui-lang-row { display: flex; gap: 4px; }
.ui-lang-btn {
  width: clamp(38px, 6.6vw, 46px);
  height: clamp(26px, 4.3vw, 30px);
  font-family: monospace;
  font-size: clamp(10px, 1.86vw, 13px);
  font-weight: bold;
  cursor: pointer;
  background: transparent;
  border: 1px solid #444466;
  color: #555577;
  pointer-events: auto;
}
.ui-lang-btn.active {
  background: rgba(0,255,255,0.13);
  border: 1.5px solid #00ffff;
  color: #00ffff;
}
#ui-sound-btn {
  width: clamp(26px, 4.3vw, 30px);
  height: clamp(26px, 4.3vw, 30px);
  font-family: monospace;
  font-size: 14px;
  cursor: pointer;
  background: transparent;
  border: 1px solid #555577;
  color: #888899;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
#ui-sound-btn:hover { background: rgba(255,255,255,0.07); }
#ui-sound-btn.muted { border-color: #ff4444; color: #ff4444; }

/* ── LEVEL UP ──────────────────────────────────────────────────── */
#ui-levelup {
  background: rgba(10,10,26,0.85);
  justify-content: center;
}
#ui-levelup-header {
  text-align: center;
  pointer-events: none;
  margin-bottom: 20px;
}
#ui-levelup-header h2 {
  font-size: 36px;
  font-weight: bold;
  color: #ffcc00;
  text-shadow: 0 0 20px #ffcc00;
  margin: 0 0 10px;
}
#ui-levelup-header p {
  font-size: 14px;
  color: #aaaacc;
  margin: 0;
}
#ui-levelup-cards {
  display: flex;
  gap: clamp(8px, 2vw, 20px);
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  pointer-events: auto;
}
.upgrade-card {
  --card-color: #ffffff;
  width: clamp(110px, 25vw, 180px);
  aspect-ratio: 1 / 1.15;
  background: #111133;
  border: 1px solid #333355;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  pointer-events: auto;
  gap: 4px;
  transition: background 0.1s, border-color 0.1s;
}
.upgrade-card:hover {
  background: #1a1a4a;
  border: 2px solid var(--card-color);
  box-shadow: 0 0 15px var(--card-color);
}
.upgrade-card-icon {
  font-size: clamp(22px, 5vw, 36px);
  line-height: 1;
  margin-bottom: 4px;
}
.upgrade-card-name {
  font-family: monospace;
  font-size: clamp(10px, 2vw, 14px);
  font-weight: bold;
  text-align: center;
}
.upgrade-card-desc {
  font-family: monospace;
  font-size: clamp(9px, 1.57vw, 11px);
  color: #aaaacc;
  text-align: center;
  line-height: 1.4;
  word-break: break-word;
}

/* ── GAME OVER / VICTORY ───────────────────────────────────────── */
#ui-gameover {
  background: rgba(10,10,26,0.92);
  justify-content: center;
  align-items: center;
}
.ui-go-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
}
#ui-go-title {
  font-size: 42px;
  font-weight: bold;
  margin: 0 0 6px;
}
.ui-go-stats {
  font-size: 16px;
  color: #ccccdd;
  text-align: center;
  line-height: 1.75;
  margin: 0 0 6px;
  pointer-events: none;
}
#ui-revive {
  width: 260px; height: 44px;
  font-family: monospace; font-size: 16px; font-weight: bold;
  cursor: pointer; pointer-events: auto;
  background: #2a1a0a; border: 1px solid #ffaa33; color: #ffaa33;
  animation: ui-pulse 1s ease-in-out infinite;
}
#ui-revive:hover { background: #3a2a1a; border-width: 2px; }
#ui-play-again {
  width: 200px; height: 44px;
  font-family: monospace; font-size: 18px; font-weight: bold;
  cursor: pointer; pointer-events: auto;
  background: #1a1a3a; border: 1px solid #00ffff; color: #00ffff;
}
#ui-play-again:hover { background: #2a2a5a; border-width: 2px; }
#ui-share {
  width: 200px; height: 38px;
  font-family: monospace; font-size: 15px; font-weight: bold;
  cursor: pointer; pointer-events: auto;
  background: #0a2a0a; border: 1px solid #44ff44; color: #44ff44;
}
#ui-share:hover { background: #1a3a1a; border-width: 2px; }
#ui-main-menu-go {
  width: 200px; height: 38px;
  font-family: monospace; font-size: 14px; font-weight: bold;
  cursor: pointer; pointer-events: auto;
  background: #1a0a0a; border: 1px solid #777799; color: #777799;
}
#ui-main-menu-go:hover { background: #2a1a1a; border-width: 2px; }

/* ── PAUSED ────────────────────────────────────────────────────── */
#ui-paused {
  background: rgba(10,10,26,0.80);
  justify-content: center;
  align-items: center;
}
.ui-paused-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto;
}
#ui-paused-title {
  font-size: clamp(32px, 6vw, 42px);
  font-weight: bold;
  color: #00ffff;
  text-shadow: 0 0 25px #00ffff;
  margin: 0 0 8px;
}
.ui-paused-hint {
  font-size: clamp(14px, 2.3vw, 16px);
  color: #8888aa;
  margin: 0 0 4px;
}
.ui-paused-aim-hint {
  font-size: 13px;
  color: #555566;
  margin: 0 0 12px;
}
#ui-resume {
  width: 180px; height: 38px; margin-top: 16px;
  font-family: monospace; font-size: clamp(14px,2.1vw,15px); font-weight: bold;
  cursor: pointer; pointer-events: auto;
  background: #0a1a1a; border: 1px solid #00ffff; color: #00ffff;
}
#ui-resume:hover { background: #1a2a2a; border-width: 2px; }
#ui-restart-pause {
  width: 180px; height: 38px; margin-top: 12px;
  font-family: monospace; font-size: clamp(14px,2.1vw,15px); font-weight: bold;
  cursor: pointer; pointer-events: auto;
  background: #1a1010; border: 1px solid #ff4444; color: #ff4444;
}
#ui-restart-pause:hover { background: #2a1a1a; border-width: 2px; }
#ui-main-menu-pause {
  width: 180px; height: 38px; margin-top: 12px;
  font-family: monospace; font-size: clamp(14px,2.1vw,15px); font-weight: bold;
  cursor: pointer; pointer-events: auto;
  background: #111111; border: 1px solid #666688; color: #888899;
}
#ui-main-menu-pause:hover { background: #1a1a1a; border-width: 2px; }

/* ── HUD (playing screen) ──────────────────────────────────────── */
#ui-hud { pointer-events: none; }
#hud-pause {
  position: fixed; top: 12px; right: 12px;
  width: 36px; height: 36px;
  background: #1a1a3a; border: 1px solid #444466; color: #888899;
  font-size: 16px; cursor: pointer; pointer-events: auto;
  display: flex; align-items: center; justify-content: center;
  font-family: monospace;
}
#hud-pause:hover { background: #2a2a4a; border-color: #6666aa; }
#hud-timer {
  position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
  font: bold 24px monospace; color: #ffffff; pointer-events: none;
  white-space: nowrap;
}
#hud-kills {
  position: fixed; top: 18px; right: 60px;
  font: 18px monospace; color: #ff8888; pointer-events: none;
  white-space: nowrap;
}
#hud-hp-wrap {
  position: fixed; top: 44px; left: 20px;
  width: 160px; pointer-events: none;
}
#hud-hp-bg {
  position: relative; width: 160px; height: 14px;
  background: #331111; overflow: hidden;
}
#hud-hp-fill { height: 100%; width: 100%; }
#hud-hp-text {
  position: absolute; left: 4px; top: 2px;
  font: bold 11px monospace; color: #fff;
  text-shadow: 1px 1px 2px #000, -1px -1px 2px #000;
  white-space: nowrap; pointer-events: none;
}
#hud-enemies {
  position: fixed; top: 74px; left: 20px;
  font: 12px monospace; color: #888888; pointer-events: none;
}
#hud-stats {
  position: fixed; top: 90px; left: 20px;
  font: 10px monospace; color: #aaaacc;
  display: flex; gap: 8px; flex-wrap: wrap; max-width: 200px;
  pointer-events: none;
}
#hud-buffs {
  position: fixed; right: 14px; top: 56px;
  display: flex; flex-direction: column; gap: 12px;
  pointer-events: none;
}
.hud-buff { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.hud-buff-box {
  position: relative; width: 26px; height: 26px;
  background: #1a1a3a; overflow: hidden;
}
.hud-buff-fill { position: absolute; bottom: 0; left: 0; width: 100%; opacity: 0.25; }
.hud-buff-icon {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font: 14px serif;
}
.hud-buff-time { font: bold 8px monospace; white-space: nowrap; }
#hud-xp-bg {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 8px; background: #1a1a2a; pointer-events: none;
}
#hud-xp-fill {
  height: 100%; width: 0;
  background: linear-gradient(to right, #cc6600, #ffaa33);
}
#hud-level {
  position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
  font: bold 16px monospace; color: #ffaa33; pointer-events: none;
  white-space: nowrap;
}
#hud-weapons {
  position: fixed; bottom: 50px; right: 20px;
  display: flex; gap: 6px; align-items: center;
  pointer-events: none;
}
.hud-weapon {
  position: relative; width: 28px; height: 28px;
  background: #1a1a3a; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: monospace;
}
.hud-weapon-icon { font: 16px serif; line-height: 1; }
.hud-weapon-lv  { font: 9px monospace; line-height: 1; }
.hud-weapon-cd  { position: absolute; top: 0; left: 0; width: 100%; background: rgba(0,0,0,0.6); }
#hud-aim-hint {
  position: fixed; bottom: 18px; left: 20px;
  font: 11px monospace; color: #444466; pointer-events: none;
}
`;

export class UIManager {
  currentUpgrades: UpgradeOption[] = [];
  selectedUpgrade = -1;
  canRevive = false;
  private _screen: GameScreen = 'menu';
  clickConsumed = false;
  selectedMode: GameMode = 'classic';
  private _ngPlusLevel = 0;
  private _soundMuted = false;
  private shareData: { kills: number; time: string; level: number; victory: boolean } | null = null;

  private onRevive: (() => void) | null = null;
  private onShare: ((text: string) => void) | null = null;
  private onResume: (() => void) | null = null;
  private onMainMenu: (() => void) | null = null;
  private onPlay: (() => void) | null = null;
  private onToggleSound: (() => void) | null = null;
  private onPause: (() => void) | null = null;

  // HUD elements
  private elHud!: HTMLDivElement;
  private elHudTimer!: HTMLDivElement;
  private elHudKills!: HTMLDivElement;
  private elHudPause!: HTMLButtonElement;
  private elHudHpFill!: HTMLDivElement;
  private elHudHpText!: HTMLSpanElement;
  private elHudEnemies!: HTMLDivElement;
  private elHudStats!: HTMLDivElement;
  private elHudBuffs!: HTMLDivElement;
  private elHudXpFill!: HTMLDivElement;
  private elHudLevel!: HTMLDivElement;
  private elHudWeapons!: HTMLDivElement;
  private elHudAimHint!: HTMLDivElement;
  private _lastStatSig = '';
  private _lastBuffSig = '';
  private _lastWeaponSig = '';

  // DOM elements
  private overlay!: HTMLDivElement;
  private elMenu!: HTMLDivElement;
  private elLevelup!: HTMLDivElement;
  private elGameover!: HTMLDivElement;
  private elPaused!: HTMLDivElement;
  private elControls!: HTMLDivElement;
  private elSoundBtn!: HTMLButtonElement;
  private elLangRow!: HTMLDivElement;
  private elLangEn!: HTMLButtonElement;
  private elLangRu!: HTMLButtonElement;
  private elSubtitle!: HTMLParagraphElement;
  private elPlayBtn!: HTMLButtonElement;
  private elHintMobile!: HTMLParagraphElement;
  private elHintDesktop!: HTMLParagraphElement;
  private elModeClassic!: HTMLButtonElement;
  private elModeEndless!: HTMLButtonElement;
  private elModeDesc!: HTMLParagraphElement;
  private elNgBadge!: HTMLSpanElement;
  private elCards!: HTMLDivElement;
  private elGoTitle!: HTMLHeadingElement;
  private elGoStats!: HTMLParagraphElement;
  private elReviveBtn!: HTMLButtonElement;
  private elPlayAgain!: HTMLButtonElement;
  private elShare!: HTMLButtonElement;
  private elMainMenuGo!: HTMLButtonElement;
  private elPausedHint!: HTMLParagraphElement;
  private elPausedAimHint!: HTMLParagraphElement;
  private elResumeBtn!: HTMLButtonElement;
  private elRestartPause!: HTMLButtonElement;
  private elMainMenuPause!: HTMLButtonElement;
  private _gameOverPopulated = false;

  get screen(): GameScreen { return this._screen; }
  set screen(s: GameScreen) {
    if (this._screen === s) return;
    this._screen = s;
    this._gameOverPopulated = false;
    this.updateVisibility();
  }

  get ngPlusLevel(): number { return this._ngPlusLevel; }
  set ngPlusLevel(v: number) {
    this._ngPlusLevel = v;
    this.updateNgBadge();
  }

  get soundMuted(): boolean { return this._soundMuted; }
  set soundMuted(v: boolean) {
    this._soundMuted = v;
    this.updateSoundBtn();
  }

  constructor(
    _ctx: CanvasRenderingContext2D,
    private onUpgradeSelected: (index: number) => void,
    private onRestart: () => void,
  ) {
    this.injectStyles();
    this.buildHTML();
    this.updateVisibility();
  }

  // ── Public API — identical to original ───────────────────────────
  setReviveHandler(h: () => void): void { this.onRevive = h; }
  setShareHandler(h: (text: string) => void): void { this.onShare = h; }
  setResumeHandler(h: () => void): void { this.onResume = h; }
  setMainMenuHandler(h: () => void): void { this.onMainMenu = h; }
  setPlayHandler(h: () => void): void { this.onPlay = h; }
  setToggleSoundHandler(h: () => void): void { this.onToggleSound = h; }
  setPauseHandler(h: () => void): void { this.onPause = h; }
  enableTracking(): void { /* no-op: CSS :hover handles hover detection */ }

  showCopiedFeedback(): void {
    this.elShare.textContent = t().copied;
    setTimeout(() => { this.elShare.textContent = t().shareScore; }, 2000);
  }

  /** Update all HUD elements — call every frame while screen === 'playing'. */
  updateHUD(player: Player, hp: Health, enemyCount: number, gameTime: number, gameMode: GameMode): void {
    const strings = t();

    // Timer
    const timerValue = gameMode === 'endless' ? gameTime : Math.max(0, GAME_DURATION - gameTime);
    const min = Math.floor(timerValue / 60);
    const sec = Math.floor(timerValue % 60);
    this.elHudTimer.textContent = `${min}:${sec.toString().padStart(2, '0')}`;

    // Kill count
    this.elHudKills.textContent = `${strings.killsLabel} ${player.kills}`;

    // HP bar
    const hpPct = Math.max(0, Math.min(1, hp.current / hp.max));
    this.elHudHpFill.style.width = `${hpPct * 100}%`;
    this.elHudHpFill.style.background = hpPct > 0.5 ? '#44ff44' : hpPct > 0.25 ? '#ffcc00' : '#ff4444';
    this.elHudHpText.textContent = `${strings.hpLabel} ${Math.ceil(hp.current)}/${Math.ceil(hp.max)}`;

    // Enemy count
    this.elHudEnemies.textContent = `${strings.enemiesLabel} ${enemyCount}`;

    // Stat picks
    this.updateStatPicks(player);

    // Active buffs
    this.updateBuffs(player);

    // XP bar
    const xpPct = player.nextLevelXp > 0 ? Math.max(0, Math.min(1, player.xp / player.nextLevelXp)) : 0;
    this.elHudXpFill.style.width = `${xpPct * 100}%`;

    // Level badge
    this.elHudLevel.textContent = `${strings.lvLabel} ${player.level}`;

    // Weapon icons + cooldown
    this.updateWeapons(player);

    // Aim hint
    this.elHudAimHint.textContent = strings.aimHintHud;
  }

  // ── Draw methods — no-op (HTML updates via setters / drawGameOver) ─
  drawMenu(_w: number, _h: number, _isMobile?: boolean): void { /* no-op */ }
  drawLevelUp(_w: number, _h: number): void { /* no-op */ }
  drawPaused(_w: number, _h: number): void { /* no-op */ }

  /** Called each frame from game.ts render loop; populates HTML on first call per screen transition. */
  drawGameOver(_w: number, _h: number, player: Player, gameTime: number, victory: boolean): void {
    if (this._gameOverPopulated) return;
    this._gameOverPopulated = true;

    const strings = t();
    this.elGoTitle.textContent = victory ? strings.victory : strings.gameOver;
    const color = victory ? '#44ff44' : '#ff4444';
    this.elGoTitle.style.color = color;
    this.elGoTitle.style.textShadow = `0 0 20px ${color}`;

    const mm = Math.floor(gameTime / 60).toString().padStart(2, '0');
    const ss = Math.floor(gameTime % 60).toString().padStart(2, '0');
    const timeStr = `${mm}:${ss}`;
    this.elGoStats.innerHTML =
      `${strings.timeSurvived} ${timeStr}<br>` +
      `${strings.levelReached} ${player.level}<br>` +
      `${strings.enemiesKilled} ${player.kills}<br>` +
      `${strings.damageDealt} ${Math.round(player.damageDealt)}`;

    this.elReviveBtn.style.display = (!victory && this.canRevive) ? '' : 'none';
    this.shareData = { kills: player.kills, time: timeStr, level: player.level, victory };
    this.elShare.textContent = strings.shareScore;
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
        icon: '💫',
        color: '#ffdd00',
        action: () => { player.firingMode = 'rapid'; },
      });
    }

    shuffle(options);
    this.currentUpgrades = options.slice(0, 3);
    this.buildCards(this.currentUpgrades);
    return this.currentUpgrades;
  }

  destroy(): void {
    this.overlay.remove();
    document.getElementById('ui-styles')?.remove();
  }

  // ── DOM construction ──────────────────────────────────────────────

  private injectStyles(): void {
    if (document.getElementById('ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'ui-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  private el<T extends HTMLElement>(tag: string, id?: string, cls?: string): T {
    const e = document.createElement(tag) as T;
    if (id) e.id = id;
    if (cls) e.className = cls;
    return e;
  }

  private buildHTML(): void {
    const strings = t();
    const locale = getLocale();

    this.overlay = this.el<HTMLDivElement>('div', 'ui-overlay');

    // ── MENU ──────────────────────────────────────────────────────
    this.elMenu = this.el<HTMLDivElement>('div', 'ui-menu', 'ui-screen');

    const menuCenter = this.el<HTMLDivElement>('div', undefined, 'ui-menu-center');

    const title = this.el<HTMLHeadingElement>('h1', 'ui-menu-title');
    title.textContent = 'NEON SURVIVORS';

    this.elSubtitle = this.el<HTMLParagraphElement>('p', 'ui-menu-subtitle');
    this.elSubtitle.textContent = strings.subtitle;

    this.elPlayBtn = this.el<HTMLButtonElement>('button', 'ui-play');
    this.elPlayBtn.textContent = strings.play;
    this.elPlayBtn.addEventListener('click', () => {
      this.clickConsumed = true;
      if (this.onPlay) this.onPlay();
    });

    this.elHintMobile = this.el<HTMLParagraphElement>('p', undefined, 'ui-hints');
    this.elHintMobile.innerHTML = `${strings.moveLeft}<br>${strings.aimLeft}`;

    this.elHintDesktop = this.el<HTMLParagraphElement>('p', undefined, 'ui-hints');
    this.elHintDesktop.innerHTML = `${strings.movePC}<br>${strings.aimPC}`;

    // Mode selector
    const modeWrap = this.el<HTMLDivElement>('div', undefined, 'ui-mode-wrap');
    const modeRow = this.el<HTMLDivElement>('div', undefined, 'ui-mode-row');

    this.elModeClassic = this.el<HTMLButtonElement>('button', undefined, 'ui-mode-btn active');
    this.elModeClassic.textContent = strings.modeClassic;
    this.elModeClassic.addEventListener('click', () => {
      this.clickConsumed = true;
      this.selectedMode = 'classic';
      this.refreshModeSelector();
    });

    this.elModeEndless = this.el<HTMLButtonElement>('button', undefined, 'ui-mode-btn');
    this.elModeEndless.textContent = strings.modeEndless;
    this.elModeEndless.addEventListener('click', () => {
      this.clickConsumed = true;
      this.selectedMode = 'endless';
      this.refreshModeSelector();
    });

    modeRow.append(this.elModeClassic, this.elModeEndless);

    this.elNgBadge = this.el<HTMLSpanElement>('span', 'ui-ng-badge');
    this.elModeDesc = this.el<HTMLParagraphElement>('p', undefined, 'ui-mode-desc');
    this.elModeDesc.textContent = strings.modeClassicDesc;

    modeWrap.append(modeRow, this.elNgBadge, this.elModeDesc);
    menuCenter.append(title, this.elSubtitle, this.elPlayBtn, this.elHintMobile, this.elHintDesktop, modeWrap);
    this.elMenu.appendChild(menuCenter);

    // ── LEVEL UP ──────────────────────────────────────────────────
    this.elLevelup = this.el<HTMLDivElement>('div', 'ui-levelup', 'ui-screen');

    const lvHeader = this.el<HTMLDivElement>('div', 'ui-levelup-header');
    const lvTitle = this.el<HTMLHeadingElement>('h2');
    lvTitle.textContent = strings.levelUp;
    const lvSub = this.el<HTMLParagraphElement>('p');
    lvSub.textContent = strings.chooseUpgrade;
    lvHeader.append(lvTitle, lvSub);

    this.elCards = this.el<HTMLDivElement>('div', 'ui-levelup-cards');
    this.elLevelup.append(lvHeader, this.elCards);

    // ── GAME OVER / VICTORY ───────────────────────────────────────
    this.elGameover = this.el<HTMLDivElement>('div', 'ui-gameover', 'ui-screen');
    const goInner = this.el<HTMLDivElement>('div', undefined, 'ui-go-inner');

    this.elGoTitle = this.el<HTMLHeadingElement>('h2', 'ui-go-title');
    this.elGoTitle.textContent = strings.gameOver;

    this.elGoStats = this.el<HTMLParagraphElement>('p', undefined, 'ui-go-stats');

    this.elReviveBtn = this.el<HTMLButtonElement>('button', 'ui-revive');
    this.elReviveBtn.textContent = strings.watchAdRevive;
    this.elReviveBtn.style.display = 'none';
    this.elReviveBtn.addEventListener('click', () => {
      this.clickConsumed = true;
      if (this.onRevive) this.onRevive();
    });

    this.elPlayAgain = this.el<HTMLButtonElement>('button', 'ui-play-again');
    this.elPlayAgain.textContent = strings.playAgain;
    this.elPlayAgain.addEventListener('click', () => {
      this.clickConsumed = true;
      this.onRestart();
    });

    this.elShare = this.el<HTMLButtonElement>('button', 'ui-share');
    this.elShare.textContent = strings.shareScore;
    this.elShare.addEventListener('click', () => {
      this.clickConsumed = true;
      this.handleShare();
    });

    this.elMainMenuGo = this.el<HTMLButtonElement>('button', 'ui-main-menu-go');
    this.elMainMenuGo.textContent = strings.mainMenu;
    this.elMainMenuGo.addEventListener('click', () => {
      this.clickConsumed = true;
      if (this.onMainMenu) this.onMainMenu();
    });

    goInner.append(this.elGoTitle, this.elGoStats, this.elReviveBtn, this.elPlayAgain, this.elShare, this.elMainMenuGo);
    this.elGameover.appendChild(goInner);

    // ── PAUSED ────────────────────────────────────────────────────
    this.elPaused = this.el<HTMLDivElement>('div', 'ui-paused', 'ui-screen');
    const pausedInner = this.el<HTMLDivElement>('div', undefined, 'ui-paused-inner');

    const pausedTitle = this.el<HTMLHeadingElement>('h2', 'ui-paused-title');
    pausedTitle.textContent = strings.paused;

    this.elPausedHint = this.el<HTMLParagraphElement>('p', undefined, 'ui-paused-hint');
    this.elPausedHint.textContent = strings.escResume;

    this.elPausedAimHint = this.el<HTMLParagraphElement>('p', undefined, 'ui-paused-aim-hint');
    this.elPausedAimHint.textContent = strings.aimHintPause;

    this.elResumeBtn = this.el<HTMLButtonElement>('button', 'ui-resume');
    this.elResumeBtn.textContent = strings.resume;
    this.elResumeBtn.addEventListener('click', () => {
      this.clickConsumed = true;
      if (this.onResume) this.onResume();
    });

    this.elRestartPause = this.el<HTMLButtonElement>('button', 'ui-restart-pause');
    this.elRestartPause.textContent = strings.restart;
    this.elRestartPause.addEventListener('click', () => {
      this.clickConsumed = true;
      this.onRestart();
    });

    this.elMainMenuPause = this.el<HTMLButtonElement>('button', 'ui-main-menu-pause');
    this.elMainMenuPause.textContent = strings.mainMenu;
    this.elMainMenuPause.addEventListener('click', () => {
      this.clickConsumed = true;
      if (this.onMainMenu) this.onMainMenu();
    });

    pausedInner.append(pausedTitle, this.elPausedHint, this.elPausedAimHint, this.elResumeBtn, this.elRestartPause, this.elMainMenuPause);
    this.elPaused.appendChild(pausedInner);

    // ── TOP-RIGHT CONTROLS (sound + lang) ─────────────────────────
    this.elControls = this.el<HTMLDivElement>('div', 'ui-controls');

    this.elSoundBtn = this.el<HTMLButtonElement>('button', 'ui-sound-btn');
    this.elSoundBtn.textContent = '♪';
    this.elSoundBtn.addEventListener('click', () => {
      this.clickConsumed = true;
      if (this.onToggleSound) this.onToggleSound();
    });

    this.elLangRow = this.el<HTMLDivElement>('div', undefined, 'ui-lang-row');

    this.elLangEn = this.el<HTMLButtonElement>('button', undefined, `ui-lang-btn${locale === 'en' ? ' active' : ''}`);
    this.elLangEn.textContent = 'EN';
    this.elLangEn.addEventListener('click', () => {
      this.clickConsumed = true;
      setLocale('en');
      this.refreshAllText();
    });

    this.elLangRu = this.el<HTMLButtonElement>('button', undefined, `ui-lang-btn${locale === 'ru' ? ' active' : ''}`);
    this.elLangRu.textContent = 'RU';
    this.elLangRu.addEventListener('click', () => {
      this.clickConsumed = true;
      setLocale('ru');
      this.refreshAllText();
    });

    this.elLangRow.append(this.elLangEn, this.elLangRu);
    this.elControls.append(this.elSoundBtn, this.elLangRow);

    this.overlay.append(this.elMenu, this.elLevelup, this.elGameover, this.elPaused, this.elControls);

    // ── HUD ───────────────────────────────────────────────────────
    this.elHud = this.el<HTMLDivElement>('div', 'ui-hud');
    this.elHud.style.display = 'none';

    this.elHudTimer = this.el<HTMLDivElement>('div', 'hud-timer');
    this.elHudKills = this.el<HTMLDivElement>('div', 'hud-kills');

    this.elHudPause = this.el<HTMLButtonElement>('button', 'hud-pause');
    this.elHudPause.textContent = '⏸';
    this.elHudPause.addEventListener('click', () => {
      this.clickConsumed = true;
      if (this.onPause) this.onPause();
    });

    const hpWrap = this.el<HTMLDivElement>('div', 'hud-hp-wrap');
    const hpBg = this.el<HTMLDivElement>('div', 'hud-hp-bg');
    this.elHudHpFill = this.el<HTMLDivElement>('div', 'hud-hp-fill');
    this.elHudHpText = this.el<HTMLSpanElement>('span', 'hud-hp-text');
    hpBg.append(this.elHudHpFill, this.elHudHpText);
    hpWrap.appendChild(hpBg);

    this.elHudEnemies = this.el<HTMLDivElement>('div', 'hud-enemies');
    this.elHudStats   = this.el<HTMLDivElement>('div', 'hud-stats');
    this.elHudBuffs   = this.el<HTMLDivElement>('div', 'hud-buffs');

    const xpBg = this.el<HTMLDivElement>('div', 'hud-xp-bg');
    this.elHudXpFill = this.el<HTMLDivElement>('div', 'hud-xp-fill');
    xpBg.appendChild(this.elHudXpFill);

    this.elHudLevel   = this.el<HTMLDivElement>('div', 'hud-level');
    this.elHudWeapons = this.el<HTMLDivElement>('div', 'hud-weapons');
    this.elHudAimHint = this.el<HTMLDivElement>('div', 'hud-aim-hint');

    this.elHud.append(
      this.elHudTimer, this.elHudKills, this.elHudPause,
      hpWrap, this.elHudEnemies, this.elHudStats, this.elHudBuffs,
      xpBg, this.elHudLevel, this.elHudWeapons, this.elHudAimHint,
    );
    this.overlay.appendChild(this.elHud);

    document.body.appendChild(this.overlay);
  }

  private buildCards(upgrades: UpgradeOption[]): void {
    this.elCards.innerHTML = '';
    upgrades.forEach((upg, i) => {
      const card = this.el<HTMLDivElement>('div', undefined, 'upgrade-card');
      card.style.setProperty('--card-color', upg.color);

      const icon = this.el<HTMLDivElement>('div', undefined, 'upgrade-card-icon');
      icon.textContent = upg.icon;

      const name = this.el<HTMLDivElement>('div', undefined, 'upgrade-card-name');
      name.textContent = upg.name;
      name.style.color = upg.color;

      const desc = this.el<HTMLDivElement>('div', undefined, 'upgrade-card-desc');
      desc.textContent = upg.description;

      card.append(icon, name, desc);
      card.addEventListener('click', () => {
        this.clickConsumed = true;
        this.onUpgradeSelected(i);
      });
      this.elCards.appendChild(card);
    });
  }

  private handleShare(): void {
    if (!this.shareData || !this.onShare) return;
    const d = this.shareData;
    const strings = t();
    const text = d.victory
      ? strings.shareVictory(d.level, d.kills, d.time)
      : strings.shareDeath(d.level, d.kills, d.time);
    this.onShare(text);
  }

  private updateVisibility(): void {
    const s = this._screen;
    const mobile = window.innerWidth < 600;

    this.elMenu.classList.toggle('vis', s === 'menu');
    this.elLevelup.classList.toggle('vis', s === 'levelup');
    this.elGameover.classList.toggle('vis', s === 'gameover' || s === 'victory');
    this.elPaused.classList.toggle('vis', s === 'paused');
    this.elHud.style.display = s === 'playing' ? 'block' : 'none';

    const showControls = s === 'menu' || s === 'paused';
    this.elControls.classList.toggle('vis', showControls);
    this.elLangRow.style.display = s === 'menu' ? 'flex' : 'none';

    if (s === 'menu') {
      this.elHintMobile.style.display = mobile ? '' : 'none';
      this.elHintDesktop.style.display = mobile ? 'none' : '';
      this.refreshModeSelector();
    }

    if (s === 'paused') {
      this.elPausedHint.textContent = mobile ? t().tapResume : t().escResume;
      this.elPausedAimHint.style.display = mobile ? 'none' : '';
    }
  }

  private updateNgBadge(): void {
    if (this._ngPlusLevel > 0 && this.selectedMode === 'classic') {
      this.elNgBadge.textContent = `${t().nextRun} NG+${this._ngPlusLevel}`;
      this.elNgBadge.style.display = '';
    } else {
      this.elNgBadge.style.display = 'none';
    }
  }

  private updateSoundBtn(): void {
    this.elSoundBtn.textContent = this._soundMuted ? '✗' : '♪';
    this.elSoundBtn.classList.toggle('muted', this._soundMuted);
  }

  private refreshModeSelector(): void {
    const strings = t();
    this.elModeClassic.classList.toggle('active', this.selectedMode === 'classic');
    this.elModeEndless.classList.toggle('active', this.selectedMode === 'endless');
    this.elModeClassic.textContent = strings.modeClassic;
    this.elModeEndless.textContent = strings.modeEndless;
    this.elModeDesc.textContent = this.selectedMode === 'classic'
      ? strings.modeClassicDesc
      : strings.modeEndlessDesc;
    this.updateNgBadge();
  }

  private refreshAllText(): void {
    const strings = t();
    const locale = getLocale();
    const mobile = window.innerWidth < 600;

    this.elSubtitle.textContent = strings.subtitle;
    this.elPlayBtn.textContent = strings.play;
    this.elHintMobile.innerHTML = `${strings.moveLeft}<br>${strings.aimLeft}`;
    this.elHintDesktop.innerHTML = `${strings.movePC}<br>${strings.aimPC}`;
    this.refreshModeSelector();

    this.elLangEn.classList.toggle('active', locale === 'en');
    this.elLangRu.classList.toggle('active', locale === 'ru');

    this.elPausedHint.textContent = mobile ? strings.tapResume : strings.escResume;
    this.elPausedAimHint.textContent = strings.aimHintPause;
    this.elResumeBtn.textContent = strings.resume;
    this.elRestartPause.textContent = strings.restart;
    this.elMainMenuPause.textContent = strings.mainMenu;
    this.elPlayAgain.textContent = strings.playAgain;
    this.elShare.textContent = strings.shareScore;
    this.elMainMenuGo.textContent = strings.mainMenu;
  }

  // ── HUD helpers ───────────────────────────────────────────────────

  private updateStatPicks(player: Player): void {
    const keys = Object.keys(player.statPicks).filter(k => player.statPicks[k] > 0);
    const sig = keys.map(k => `${k}:${player.statPicks[k]}`).join(',');
    if (sig === this._lastStatSig) return;
    this._lastStatSig = sig;
    this.elHudStats.innerHTML = '';
    for (const key of keys) {
      const stat = STAT_UPGRADES[key as keyof typeof STAT_UPGRADES];
      if (!stat) continue;
      const span = document.createElement('span');
      span.textContent = `${stat.icon}×${player.statPicks[key]}`;
      this.elHudStats.appendChild(span);
    }
  }

  private updateBuffs(player: Player): void {
    const buffIconMap: Record<string, [string, string]> = {
      heal: ['❤️', '#ff4466'],
      magnet: ['🧲', '#44ff88'],
      bomb: ['💥', '#ff8800'],
      speed: ['⚡', '#44ccff'],
    };
    const sig = player.buffs.map(b => b.type).join(',');
    if (sig !== this._lastBuffSig) {
      this._lastBuffSig = sig;
      this.elHudBuffs.innerHTML = '';
      for (const buff of player.buffs) {
        const [icon, color] = buffIconMap[buff.type] ?? ['?', '#ffffff'];
        const div = document.createElement('div');
        div.className = 'hud-buff';
        const box = document.createElement('div');
        box.className = 'hud-buff-box';
        box.style.border = `1px solid ${color}`;
        const fill = document.createElement('div');
        fill.className = 'hud-buff-fill';
        fill.style.background = color;
        const iconEl = document.createElement('div');
        iconEl.className = 'hud-buff-icon';
        iconEl.textContent = icon;
        const timeEl = document.createElement('div');
        timeEl.className = 'hud-buff-time';
        timeEl.style.color = color;
        box.append(fill, iconEl);
        div.append(box, timeEl);
        this.elHudBuffs.appendChild(div);
      }
    }
    // Update drain + timer text
    const buffDivs = this.elHudBuffs.children;
    for (let i = 0; i < player.buffs.length; i++) {
      const buff = player.buffs[i];
      const pct = Math.max(0, Math.min(1, buff.remaining / buff.duration));
      const div = buffDivs[i] as HTMLElement | undefined;
      if (!div) continue;
      (div.querySelector('.hud-buff-fill') as HTMLElement).style.height = `${pct * 100}%`;
      (div.querySelector('.hud-buff-time') as HTMLElement).textContent = `${Math.ceil(buff.remaining)}s`;
    }
  }

  private updateWeapons(player: Player): void {
    const sig = player.weapons.map(w => `${w.type}:${w.level}`).join(',');
    if (sig !== this._lastWeaponSig) {
      this._lastWeaponSig = sig;
      this.elHudWeapons.innerHTML = '';
      for (const slot of player.weapons) {
        const wDef = WEAPONS[slot.type];
        if (!wDef) continue;
        const div = document.createElement('div');
        div.className = 'hud-weapon';
        div.style.border = `1px solid ${wDef.color}`;
        const iconEl = document.createElement('div');
        iconEl.className = 'hud-weapon-icon';
        iconEl.textContent = wDef.icon;
        const lvEl = document.createElement('div');
        lvEl.className = 'hud-weapon-lv';
        lvEl.style.color = wDef.color;
        lvEl.textContent = `${slot.level + 1}`;
        const cdEl = document.createElement('div');
        cdEl.className = 'hud-weapon-cd';
        div.append(iconEl, lvEl, cdEl);
        this.elHudWeapons.appendChild(div);
      }
    }
    // Update cooldown overlay heights
    const weaponDivs = this.elHudWeapons.children;
    for (let i = 0; i < player.weapons.length; i++) {
      const slot = player.weapons[i];
      const wDef = WEAPONS[slot.type];
      if (!wDef) continue;
      const lvl = wDef.levels[Math.min(slot.level, wDef.levels.length - 1)];
      const cdPct = Math.max(0, Math.min(1, slot.timer / lvl.cooldown));
      const div = weaponDivs[i] as HTMLElement | undefined;
      if (!div) continue;
      (div.querySelector('.hud-weapon-cd') as HTMLElement).style.height = cdPct > 0 ? `${cdPct * 100}%` : '0';
    }
  }
}
