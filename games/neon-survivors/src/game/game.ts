/** NeonSurvivorsScene — implements Scene, orchestrates all game systems */

import { World, Camera2D, SpatialHash, ParticleSystem, FloatingTextManager, SynthAudio, createDevCheatPanel, createPlayerCheatsSection, createWeaponCheatsSection, createGameSpeedSection, type CheatPanel, type Scene, type GameContext } from '@survivors/core';
import { C, Pos, Vel, Health, Collider, Player, Visual } from './components';
import { GAME_DURATION, STAT_UPGRADES, WEAPONS, ENEMIES, xpForLevel, type GameMode } from './config';
import { GameRenderer } from './renderer';
import { UIManager, GameScreen } from './ui';
import type { AdPlatform, PlatformServices } from '@survivors/sdk';
import {
  createInputSystem,
  createMovementSystem,
  createBTEnemySystem,
  createWeaponSystem,
  createProjectileSystem,
  createCollisionSystem,
  createPickupSystem,
  createWaveSystem,
  createDeathSystem,
  createLightningSystem,
  createBonusSpawnSystem,
  createBonusPickupSystem,
  createEnemyProjectileSystem,
  createEnemySpinSystem,
  createWaveSwarmEventSystem,
  createWaveSwarmSystem,
  createCircleEventSystem,
  createCircleSystem,
  createEnemyCullingSystem,
  spawnEnemy,
} from './systems';
import { drawJoystick } from './canvas-helpers';
import { SFX, MUSIC } from './sounds';

export class NeonSurvivorsScene implements Scene {
  readonly name = 'neon-survivors';

  private canvas: HTMLCanvasElement;
  private ctx2d: CanvasRenderingContext2D;
  private world!: World;
  private camera!: Camera2D;
  private spatialHash: SpatialHash<number>;
  private particles!: ParticleSystem;
  private floatingText!: FloatingTextManager;
  private renderer!: GameRenderer;
  private ui: UIManager;
  private ads: AdPlatform;
  private services: PlatformServices;
  private audio: SynthAudio;

  private screen: GameScreen = 'menu';
  private gameTime = 0;
  private playerId = -1;
  private reviveCount = 0;
  private readonly maxRevives = 3;
  private gamesPlayed = 0;
  private gameMode: GameMode = 'classic';
  private ngPlusLevel = 0;

  private gameState = {
    damageMult: 0,
    cooldownMult: 0,
    gameTime: 0,
    bossSpawned: new Set<number>(),
    minibossSpawned: new Set<number>(),
    enemySpinEnabled: true,
    ngPlusLevel: 0,
    gameMode: 'classic' as GameMode,
    onSfx: undefined as ((id: string) => void) | undefined,
  };

  private gameCtx: GameContext | null = null;
  private cheats: CheatPanel | null = null;

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      if (this.screen === 'playing') {
        this.screen = 'paused';
        this.ads.gameplayStop();
      } else if (this.screen === 'paused') {
        this.screen = 'playing';
        this.ads.gameplayStart();
      }
    }
  };

  private onVisibilityChange = () => {
    if (document.hidden && this.screen === 'playing') {
      this.screen = 'paused';
      this.ads.gameplayStop();
    }
  };

  constructor(canvas: HTMLCanvasElement, ads: AdPlatform, services: PlatformServices) {
    this.canvas = canvas;
    this.ctx2d = canvas.getContext('2d')!;
    this.ads = ads;
    this.services = services;
    this.spatialHash = new SpatialHash(64);

    // Procedural audio
    this.audio = new SynthAudio();
    this.audio.register(SFX);
    this.audio.registerMusic(MUSIC);
    this.gameState.onSfx = (id) => this.audio.play(id, 0.03);

    this.ui = new UIManager(
      this.ctx2d,
      (index) => this.onUpgradeSelected(index),
      () => this.restart(),
    );
    this.ui.setReviveHandler(() => this.revive());
    this.ui.setShareHandler((text) => this.shareScore(text));
    this.ui.setResumeHandler(() => this.resumeGame());
    this.ui.setMainMenuHandler(() => this.goToMenu());
    this.ui.setPlayHandler(() => this.startGame());
    this.ui.setToggleSoundHandler(() => this.toggleSound());
    this.ui.setPauseHandler(() => {
      if (this.screen === 'playing') {
        this.screen = 'paused';
        this.ads.gameplayStop();
      } else if (this.screen === 'paused') {
        this.screen = 'playing';
        this.ads.gameplayStart();
      }
    });
    this.ui.enableTracking();

    // Restore mute state
    try {
      const muted = localStorage.getItem('ns_muted') === '1';
      this.audio.muted = muted;
      this.ui.soundMuted = muted;
    } catch { /* ignore */ }
  }

  enter(ctx: GameContext): void {
    this.gameCtx = ctx;
    this.camera = new Camera2D(window.innerWidth, window.innerHeight);
    this.resize();

    this.loadProgress();

    ctx.events.on('resize', () => this.resize());
    window.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.initGame(ctx);
  }

  private loadProgress(): void {
    // Load from localStorage (sync), then cloud overwrites if newer
    const local = this.services.storage.load((cloud) => {
      if (typeof cloud.ngPlusLevel === 'number' && cloud.ngPlusLevel > this.ngPlusLevel) {
        this.ngPlusLevel = cloud.ngPlusLevel;
        this.ui.ngPlusLevel = this.ngPlusLevel;
      }
    });

    this.ngPlusLevel = typeof local?.ngPlusLevel === 'number' ? Math.max(0, local.ngPlusLevel) : 0;
    this.ui.ngPlusLevel = this.ngPlusLevel;
  }

  private saveProgress(): void {
    this.services.storage.save({ ngPlusLevel: this.ngPlusLevel }).catch(() => {});
  }

  private submitScores(player: Player): void {
    this.services.leaderboards.submitAll({
      kills: player.kills,
      survival_time: Math.floor(this.gameTime),
      damage: Math.floor(player.damageDealt),
    });
  }

  exit(_ctx: GameContext): void {
    window.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.ui.destroy();
    this.audio.dispose();
    this.cheats?.destroy();
    this.cheats = null;
    this.gameCtx = null;
  }

  private startGame(): void {
    if (this.screen !== 'menu' || !this.gameCtx) return;
    this.audio.unlock();
    this.gameMode = this.ui.selectedMode;
    this.gameState.gameMode = this.gameMode;
    this.gameState.ngPlusLevel = this.gameMode === 'classic' ? this.ngPlusLevel : 0;
    this.renderer.gameMode = this.gameMode;
    this.initGame(this.gameCtx);
    this.screen = 'playing';
    this.ads.gameplayStart();
    this.audio.startMusic('cosmic_drift');
  }

  update(ctx: GameContext, dt: number): void {
    if (this.screen === 'menu') return;

    // Mobile pause button
    if (ctx.input.pauseTap) {
      if (this.screen === 'playing') {
        this.screen = 'paused';
        this.ads.gameplayStop();
      } else if (this.screen === 'paused') {
        this.screen = 'playing';
        this.ads.gameplayStart();
      }
    }

    if (this.screen !== 'playing') return;

    // Cheat: god mode
    if (this.cheats?.isEnabled('godMode') && this.playerId >= 0) {
      const hp = this.world.get<Health>(this.playerId, C.Health);
      if (hp) { hp.current = hp.max; hp.invuln = 0.5; }
    }

    // Cheat: game speed multiplier
    const speedMult = this.cheats?.getNumber('gameSpeed', 1) ?? 1;
    dt *= speedMult;

    this.gameTime += dt;
    this.gameState.gameTime = this.gameTime;

    this.world.update(dt);
    this.particles.update(dt);
    this.floatingText.update(dt);

    // Update player visual rotation based on aim direction
    const player = this.world.get<Player>(this.playerId, C.Player);
    const vis = this.world.get<Visual>(this.playerId, C.Visual);
    if (ctx.input.isAiming) {
      vis.rotation = Math.atan2(ctx.input.aimDir.y, ctx.input.aimDir.x) + Math.PI / 2;
      // On mobile: sync lastDir with aim joystick so direction is preserved when released
      if (ctx.input.isMobile) {
        player.lastDirX = ctx.input.aimDir.x;
        player.lastDirY = ctx.input.aimDir.y;
      }
    } else {
      vis.rotation = Math.atan2(player.lastDirY, player.lastDirX) + Math.PI / 2;
    }

    // Camera follow
    const pPos = this.world.get<Pos>(this.playerId, C.Pos);
    this.camera.follow(pPos, 0.1, dt);
    this.camera.update(dt);

    this.checkLevelUp();
    this.checkGameEnd();
  }

  render(ctx: GameContext, _alpha: number): void {
    const c = this.ctx2d;
    c.save();
    const dpr = window.devicePixelRatio || 1;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.ui.screen = this.screen;
    this.renderer.render(this.world, this.gameTime, this.screen);

    if (this.screen === 'gameover' || this.screen === 'victory') {
      const player = this.world.get<Player>(this.playerId, C.Player);
      this.ui.drawGameOver(0, 0, player, this.gameTime, this.screen === 'victory');
    }

    if (this.screen === 'playing' && this.playerId >= 0) {
      const player = this.world.get<Player>(this.playerId, C.Player);
      const hp = this.world.get<Health>(this.playerId, C.Health);
      const enemyCount = this.world.count(C.Enemy);
      this.ui.updateHUD(player, hp, enemyCount, this.gameTime, this.gameMode);
    }

    // Joysticks (screen space, mobile only)
    if (this.screen === 'playing' && ctx.input.isMobile) {
      if (ctx.input.moveJoystickActive) {
        drawJoystick(c, ctx.input.moveJoystickStart, ctx.input.moveJoystickCurrent, '#00ffff');
      }
      if (ctx.input.aimJoystickActive) {
        drawJoystick(c, ctx.input.aimJoystickStart, ctx.input.aimJoystickCurrent, '#ff6633');
      }
    }

    c.restore();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.camera.resize(window.innerWidth, window.innerHeight);
  }

  private initGame(ctx: GameContext): void {
    this.world = new World();
    this.particles = new ParticleSystem();
    this.floatingText = new FloatingTextManager();
    this.gameTime = 0;
    this.gameState.damageMult = 0;
    this.gameState.cooldownMult = 0;
    this.gameState.gameTime = 0;
    this.gameState.bossSpawned.clear();
    this.gameState.minibossSpawned.clear();
    this.reviveCount = 0;
    this.ui.canRevive = this.ads.hasAds;

    this.renderer = new GameRenderer(this.ctx2d, this.camera, this.particles, this.floatingText);
    this.renderer.gameMode = this.gameMode;

    // Spawn player
    this.playerId = this.world.spawn();
    this.world.add(this.playerId, C.Pos, { x: 0, y: 0 } as Pos);
    this.world.add(this.playerId, C.Vel, { x: 0, y: 0 } as Vel);
    this.world.add(this.playerId, C.Health, { current: 150, max: 150, invuln: 0 } as Health);
    this.world.add(this.playerId, C.Collider, { radius: 14 } as Collider);
    this.world.add(this.playerId, C.Player, {
      speed: 200,
      xp: 0,
      level: 1,
      nextLevelXp: xpForLevel(1),
      pickupRange: 60,
      weapons: [{ type: 'magic_orb', level: 0, timer: 0 }],
      kills: 0,
      damageDealt: 0,
      lastDirX: 1,
      lastDirY: 0,
      armor: 0,
      buffs: [],
      statPicks: {},
      firingMode: 'normal',
    } as Player);
    this.world.add(this.playerId, C.Visual, {
      shape: 'rocket',
      color: '#00ffff',
      size: 14,
      glow: '#0088ff',
      glowSize: 15,
      rotation: 0,
    } as Visual);

    // Register systems — use ctx.input from GameContext
    this.world.addSystem(createInputSystem(ctx.input));
    this.world.addSystem(createBTEnemySystem(this.spatialHash));
    this.world.addSystem(createWeaponSystem(ctx.input, this.particles, this.floatingText, this.spatialHash, this.gameState));
    this.world.addSystem(createMovementSystem());
    this.world.addSystem(createProjectileSystem());
    this.world.addSystem(createEnemyProjectileSystem());
    this.world.addSystem(createEnemySpinSystem());
    const onSfx = this.gameState.onSfx;
    this.world.addSystem(createCollisionSystem(this.spatialHash, this.particles, this.floatingText, onSfx));
    this.world.addSystem(createPickupSystem(this.particles, this.floatingText, onSfx));
    this.world.addSystem(createDeathSystem(this.particles, onSfx));
    this.world.addSystem(createEnemyCullingSystem(() => ({ width: this.camera.width, height: this.camera.height })));
    this.world.addSystem(createWaveSystem(this.gameState));
    this.world.addSystem(createWaveSwarmEventSystem(this.gameState));
    this.world.addSystem(createWaveSwarmSystem());
    this.world.addSystem(createCircleEventSystem(this.gameState));
    this.world.addSystem(createCircleSystem());
    this.world.addSystem(createLightningSystem());
    this.world.addSystem(createBonusSpawnSystem());
    this.world.addSystem(createBonusPickupSystem(this.particles, this.floatingText, this.spatialHash, onSfx));

    this.camera.pos.set(0, 0);

    // Dev cheats — only in development mode, stripped from production build
    if (import.meta.env.DEV && !this.cheats) {
      this.cheats = createDevCheatPanel({
        onPause: () => {
          if (this.screen === 'playing') {
            this.screen = 'paused';
          }
        },
        onResume: () => {
          this.applyDeferredCheats();
          if (this.screen === 'paused') {
            this.screen = 'playing';
          }
        },
      });
      this.initCheats();
    }
  }

  private restart(): void {
    this.gamesPlayed++;
    // Pause everything before showing ad
    this.screen = 'loading';
    this.ads.gameplayStop();

    this.ads.showInterstitial().catch(() => {}).finally(() => {
      if (this.gameCtx) {
        this.initGame(this.gameCtx);
        this.screen = 'playing';
        this.ads.gameplayStart();
      }
    });
  }

  private resumeGame(): void {
    if (this.screen === 'paused') {
      this.screen = 'playing';
      this.ads.gameplayStart();
    }
  }

  private toggleSound(): void {
    this.audio.muted = !this.audio.muted;
    this.ui.soundMuted = this.audio.muted;
    try { localStorage.setItem('ns_muted', this.audio.muted ? '1' : '0'); } catch { /* ignore */ }
  }

  private goToMenu(): void {
    this.ads.gameplayStop();
    this.audio.stopAllAmbient(1);
    this.audio.stopAllMusic(1);

    // Show interstitial before returning to menu
    this.screen = 'loading';
    this.ads.showInterstitial().catch(() => {}).finally(() => {
      this.screen = 'menu';
      this.ui.screen = 'menu';
      this.ui.clickConsumed = true;
    });
  }

  private revive(): void {
    if (this.reviveCount >= this.maxRevives) return;
    this.ads.showRewarded().then((watched) => {
      if (watched) {
        this.reviveCount++;
        this.ui.canRevive = this.reviveCount < this.maxRevives;
        const hp = this.world.get<Health>(this.playerId, C.Health);
        hp.current = Math.ceil(hp.max * 0.3);
        hp.invuln = 2;
        this.screen = 'playing';
        this.ads.gameplayStart();
        this.particles.emit(
          this.world.get<Pos>(this.playerId, C.Pos).x,
          this.world.get<Pos>(this.playerId, C.Pos).y,
          25,
          { color: '#ffaa33', speed: 150, life: 0.8, size: 5, sizeEnd: 0 },
        );
      }
    }).catch(() => {});
  }

  private shareScore(text: string): void {
    const isYandex = this.ads.name === 'yandex';
    const isTelegram = this.ads.name === 'telegram';
    const gameUrl = isTelegram
      ? 'https://t.me/neon_survivors_bot/game'
      : isYandex
        ? 'https://yandex.ru/games/app/TODO' // Yandex game page URL
        : window.location.href;
    const fullText = `${text}\n${gameUrl}`;

    // Telegram Mini App: use share link
    if (isTelegram && window.Telegram?.WebApp) {
      try {
        const tg = window.Telegram.WebApp as any;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(text)}`;
        if (typeof tg.openTelegramLink === 'function') {
          tg.openTelegramLink(shareUrl);
        } else if (typeof tg.openLink === 'function') {
          tg.openLink(shareUrl);
        } else {
          window.open(shareUrl, '_blank');
        }
        return;
      } catch { /* fallback below */ }
    }

    // Web Share API (works on mobile browsers, some desktops)
    if (navigator.share) {
      navigator.share({ title: 'Neon Survivors', text: fullText }).catch(() => {});
      return;
    }

    // Fallback: copy to clipboard
    navigator.clipboard?.writeText(fullText).then(() => {
      this.ui.showCopiedFeedback();
    }).catch(() => {});
  }

  private onUpgradeSelected(index: number): void {
    if (this.screen !== 'levelup') return;
    const upgrade = this.ui.currentUpgrades[index];
    if (!upgrade) return;

    if (upgrade.id.startsWith('stat_')) {
      const statKey = upgrade.id.replace('stat_', '') as keyof typeof STAT_UPGRADES;
      const player = this.world.get<Player>(this.playerId, C.Player);
      const hp = this.world.get<Health>(this.playerId, C.Health);
      player.statPicks[statKey] = (player.statPicks[statKey] || 0) + 1;
      switch (statKey) {
        case 'damage': this.gameState.damageMult += STAT_UPGRADES.damage.mult; break;
        case 'speed': player.speed *= (1 + STAT_UPGRADES.speed.mult); break;
        case 'maxHp':
          hp.max += STAT_UPGRADES.maxHp.mult;
          hp.current += STAT_UPGRADES.maxHp.mult;
          break;
        case 'pickupRange': player.pickupRange *= (1 + STAT_UPGRADES.pickupRange.mult); break;
        case 'armor': player.armor += STAT_UPGRADES.armor.mult; break;
        case 'cooldown': this.gameState.cooldownMult += STAT_UPGRADES.cooldown.mult; break;
      }
    } else {
      upgrade.action();
    }

    this.ui.currentUpgrades = [];
    this.screen = 'playing';
  }

  private checkLevelUp(): void {
    const player = this.world.get<Player>(this.playerId, C.Player);
    while (player.xp >= player.nextLevelXp) {
      player.xp -= player.nextLevelXp;
      player.level++;
      player.nextLevelXp = xpForLevel(player.level);

      const hp = this.world.get<Health>(this.playerId, C.Health);
      hp.current = Math.min(hp.current + hp.max * 0.1, hp.max);

      this.ui.generateUpgrades(player);
      this.screen = 'levelup';
      this.audio.play('level_up');
      this.particles.emit(
        this.world.get<Pos>(this.playerId, C.Pos).x,
        this.world.get<Pos>(this.playerId, C.Pos).y,
        30,
        { color: '#ffcc00', speed: 200, life: 0.6, size: 5, sizeEnd: 0 }
      );
      break;
    }
  }

  // ─── CHEAT SYSTEM ───────────────────────────────────────────────────

  private initCheats(): void {
    if (!this.cheats) return;

    // — Player cheats (from core) —
    this.cheats.addSection(createPlayerCheatsSection({
      onHeal: () => this.cheatHeal(),
      onLevelUp: () => this.cheatLevelUp(),
      onGiveXP: () => this.cheatGiveXP(500),
    }));

    // — Weapons cheats (from core) —
    this.cheats.addSection(createWeaponCheatsSection({
      onUnlockAll: () => this.cheatUnlockAllWeapons(),
      onMaxAll: () => this.cheatMaxWeapons(),
    }));

    // — Enemy spawn cheats (game-specific) —
    const enemyOptions = Object.entries(ENEMIES).map(([key, def]) => ({
      value: key,
      label: `${def.name} (HP:${def.hp} DMG:${def.damage})`,
    }));
    this.cheats.addSection({
      title: '👾 Enemy Spawning',
      items: [
        { type: 'select', label: 'Enemy Type', key: 'spawnEnemyType', options: enemyOptions, default: 'zombie' },
        { type: 'number', label: 'Count', key: 'spawnEnemyCount', min: 1, max: 200, default: 10 },
        { type: 'button', label: '👾 Spawn Enemies', action: () => this.cheatSpawnEnemies() },
        { type: 'button', label: '💀 Kill All Enemies', action: () => this.cheatKillAllEnemies() },
        { type: 'button', label: '🧹 Remove All Enemies', action: () => this.cheatRemoveAllEnemies() },
      ],
    });

    // — Game state cheats (from core + game-specific) —
    this.cheats.addSection(createGameSpeedSection({
      gameDuration: GAME_DURATION,
      onApplyTime: () => this.cheatSetGameTime(),
    }));
    // Victory button (game-specific, added to last section)
    this.cheats.addSection({
      title: '🏆 Win Conditions',
      items: [
        { type: 'button', label: '🏆 Instant Victory', action: () => this.cheatInstantVictory() },
      ],
    });

    // — Settings —
    this.cheats.addSection({
      title: '⚙ Settings',
      items: [
        { type: 'toggle', label: '🌀 Enemy Spin', key: 'enemySpin', default: true },
      ],
    });
  }

  /** Apply deferred cheats that accumulate while panel is open */
  private applyDeferredCheats(): void {
    if (!this.cheats || this.playerId < 0) return;

    // Player speed
    const speed = this.cheats.getNumber('playerSpeed', 200);
    const player = this.world.get<Player>(this.playerId, C.Player);
    if (player) player.speed = speed;

    // Armor
    const armor = this.cheats.getNumber('playerArmor', 0);
    if (player) player.armor = armor;

    // Damage multiplier
    const dmgMult = this.cheats.getNumber('damageMult', 1);
    this.gameState.damageMult = dmgMult - 1; // gameState stores bonus, not total

    // Cooldown
    const cdPct = this.cheats.getNumber('cooldownPct', 0);
    this.gameState.cooldownMult = cdPct / 100;

    // Enemy spin toggle
    const spinEnabled = this.cheats.isEnabled('enemySpin');
    this.gameState.enemySpinEnabled = spinEnabled;
    // Remove spin from existing enemies if disabled
    if (!spinEnabled) {
      for (const e of this.world.query(C.Enemy, C.EnemySpin)) {
        this.world.remove(e, C.EnemySpin);
      }
    }
  }

  private cheatHeal(): void {
    if (this.playerId < 0) return;
    const hp = this.world.get<Health>(this.playerId, C.Health);
    if (hp) {
      hp.current = hp.max;
      hp.invuln = 1;
    }
  }

  private cheatLevelUp(): void {
    if (this.playerId < 0) return;
    const player = this.world.get<Player>(this.playerId, C.Player);
    if (!player) return;
    player.level++;
    player.nextLevelXp = xpForLevel(player.level);
    player.xp = 0;
    const hp = this.world.get<Health>(this.playerId, C.Health);
    if (hp) {
      hp.max += 10;
      hp.current = hp.max;
    }
    this.ui.generateUpgrades(player);
    this.screen = 'levelup';
  }

  private cheatGiveXP(amount: number): void {
    if (this.playerId < 0) return;
    const player = this.world.get<Player>(this.playerId, C.Player);
    if (player) player.xp += amount;
  }

  private cheatUnlockAllWeapons(): void {
    if (this.playerId < 0) return;
    const player = this.world.get<Player>(this.playerId, C.Player);
    if (!player) return;
    const owned = new Set(player.weapons.map(w => w.type));
    for (const wType of Object.keys(WEAPONS)) {
      if (!owned.has(wType)) {
        player.weapons.push({ type: wType, level: 0, timer: 0 });
      }
    }
  }

  private cheatMaxWeapons(): void {
    if (this.playerId < 0) return;
    const player = this.world.get<Player>(this.playerId, C.Player);
    if (!player) return;
    for (const w of player.weapons) {
      const def = WEAPONS[w.type];
      if (def) w.level = def.levels.length - 1;
    }
  }

  private cheatSpawnEnemies(): void {
    if (this.playerId < 0 || !this.cheats) return;
    const type = this.cheats.getString('spawnEnemyType', 'zombie');
    const count = this.cheats.getNumber('spawnEnemyCount', 10);
    const pPos = this.world.get<Pos>(this.playerId, C.Pos);
    const player = this.world.get<Player>(this.playerId, C.Player);
    if (!pPos) return;
    for (let i = 0; i < count; i++) {
      spawnEnemy(this.world, pPos, type, this.gameTime, player?.level ?? 1);
    }
  }

  private cheatKillAllEnemies(): void {
    const player = this.world.get<Player>(this.playerId, C.Player);
    for (const e of this.world.query(C.Enemy, C.Health)) {
      const hp = this.world.get<Health>(e, C.Health);
      hp.current = 0;
      if (player) player.kills++;
    }
  }

  private cheatRemoveAllEnemies(): void {
    for (const e of this.world.query(C.Enemy)) {
      this.world.destroy(e);
    }
    this.world.flush();
  }

  private cheatSetGameTime(): void {
    if (!this.cheats) return;
    const time = this.cheats.getNumber('setGameTime', 0);
    this.gameTime = time;
    this.gameState.gameTime = time;
  }

  private cheatInstantVictory(): void {
    this.gameTime = GAME_DURATION;
    this.gameState.gameTime = GAME_DURATION;
  }

  private checkGameEnd(): void {
    const hp = this.world.get<Health>(this.playerId, C.Health);
    const player = this.world.get<Player>(this.playerId, C.Player);
    if (hp.current <= 0) {
      this.screen = 'gameover';
      this.ui.canRevive = this.ads.hasAds && this.reviveCount < this.maxRevives;
      this.camera.shake(8, 0.5);
      this.ads.gameplayStop();
      this.audio.stopAllAmbient(2);
      this.audio.stopAllMusic(2);
      this.audio.play('game_over');
      this.submitScores(player);
      this.saveProgress();
      return;
    }
    if (this.gameMode === 'classic' && this.gameTime >= GAME_DURATION) {
      this.ngPlusLevel++;
      this.ui.ngPlusLevel = this.ngPlusLevel;
      this.screen = 'victory';
      this.ads.gameplayStop();
      this.ads.happytime();
      this.audio.stopAllAmbient(2);
      this.audio.stopAllMusic(2);
      this.audio.play('victory');
      this.submitScores(player);
      this.saveProgress();
    }
  }
}
