/** NeonStrikeScene — implements Scene, orchestrates all game systems */

import { World, Camera2D, SpatialHash, ParticleSystem, FloatingTextManager, type Scene, type GameContext } from '@survivors/core';
import { C, Pos, Vel, Health, Collider, Player, Visual } from './components';
import { LEVELS, TOTAL_LEVELS } from './config';
import { GameRenderer } from './renderer';
import { UIManager, type GameScreen } from './ui';
import type { AdPlatform } from '@survivors/sdk';
import { drawJoystick } from './canvas-helpers';
import {
  createInputSystem,
  createMovementSystem,
  createShootSystem,
  createEnemyShootSystem,
  createBTEnemySystem,
  createProjectileSystem,
  createCollisionSystem,
  createDestructibleSystem,
  createDeathSystem,
  createWaveSystem,
  createExplosionSystem,
  createPickupSystem,
  createDamageFlashSystem,
  createInvulnSystem,
  createArenaBoundsSystem,
  spawnDestructibles,
  createWaveState,
  type WaveState,
} from './systems';

export class NeonStrikeScene implements Scene {
  readonly name = 'neon-strike';

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

  private screen: GameScreen = 'menu';
  private playerId = -1;
  private levelIndex = 0;
  private waveState!: WaveState;
  private levelCompleteTimer = 0;
  private playerScore = 0;

  private gameCtx: GameContext | null = null;

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

  constructor(canvas: HTMLCanvasElement, ads: AdPlatform) {
    this.canvas = canvas;
    this.ctx2d = canvas.getContext('2d')!;
    this.ads = ads;
    this.spatialHash = new SpatialHash(64);

    this.ui = new UIManager(
      this.ctx2d,
      () => this.restart(),
      () => this.nextLevel(),
    );
  }

  enter(ctx: GameContext): void {
    this.gameCtx = ctx;
    this.camera = new Camera2D(window.innerWidth, window.innerHeight);
    this.resize();

    ctx.events.on('resize', () => this.resize());
    window.addEventListener('keydown', this.onKeyDown);

    this.initLevel(ctx, 0);
  }

  exit(_ctx: GameContext): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.ui.destroy();
    this.gameCtx = null;
  }

  update(ctx: GameContext, dt: number): void {
    if (this.screen === 'menu') {
      if (ctx.input.anyKey) {
        this.screen = 'playing';
        this.ads.gameplayStart();
      }
      return;
    }

    // Mobile pause
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

    this.world.update(dt);
    this.particles.update(dt);
    this.floatingText.update(dt);

    // Update player visual rotation
    const player = this.world.get<Player>(this.playerId, C.Player);
    const vis = this.world.get<Visual>(this.playerId, C.Visual);
    if (ctx.input.isAiming) {
      vis.rotation = Math.atan2(ctx.input.aimDir.y, ctx.input.aimDir.x) + Math.PI / 2;
    } else if (player.lastDirX !== 0 || player.lastDirY !== 0) {
      vis.rotation = Math.atan2(player.lastDirY, player.lastDirX) + Math.PI / 2;
    }

    // Camera follow
    const pPos = this.world.get<Pos>(this.playerId, C.Pos);
    this.camera.follow(pPos, 0.1, dt);
    this.camera.update(dt);

    // Sync score
    this.playerScore = player.score;

    // Check player death
    this.checkPlayerDeath();

    // Check level clear
    if (this.waveState.levelCleared) {
      this.levelCompleteTimer += dt;
      if (this.levelCompleteTimer > 0.5) {
        if (this.levelIndex + 1 >= TOTAL_LEVELS) {
          this.screen = 'victory';
          this.ads.gameplayStop();
          this.ads.happytime();
        } else {
          this.screen = 'levelComplete';
          this.ads.gameplayStop();
        }
      }
    }
  }

  render(ctx: GameContext, _alpha: number): void {
    const c = this.ctx2d;
    c.save();
    const dpr = window.devicePixelRatio || 1;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = window.innerWidth;
    const h = window.innerHeight;

    this.ui.screen = this.screen;

    switch (this.screen) {
      case 'menu':
        this.renderer.render(this.world, this.waveState.arenaW, this.waveState.arenaH, this.levelIndex, this.screen);
        this.ui.drawMenu(w, h, ctx.input.isMobile);
        break;
      case 'playing':
        this.renderer.render(this.world, this.waveState.arenaW, this.waveState.arenaH, this.levelIndex, this.screen);
        break;
      case 'levelComplete':
        this.renderer.render(this.world, this.waveState.arenaW, this.waveState.arenaH, this.levelIndex, this.screen);
        this.ui.drawLevelComplete(w, h, this.levelIndex, this.playerScore);
        break;
      case 'gameover':
        this.renderer.render(this.world, this.waveState.arenaW, this.waveState.arenaH, this.levelIndex, this.screen);
        this.ui.drawGameOver(w, h, this.playerScore);
        break;
      case 'victory':
        this.renderer.render(this.world, this.waveState.arenaW, this.waveState.arenaH, this.levelIndex, this.screen);
        this.ui.drawVictory(w, h, this.playerScore);
        break;
      case 'paused':
        this.renderer.render(this.world, this.waveState.arenaW, this.waveState.arenaH, this.levelIndex, this.screen);
        this.ui.drawPaused(w, h);
        break;
    }

    // Joysticks
    if (this.screen === 'playing' && ctx.input.isMobile) {
      if (ctx.input.moveJoystickActive) {
        drawJoystick(c, ctx.input.moveJoystickStart, ctx.input.moveJoystickCurrent, '#ff3366');
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

  private initLevel(ctx: GameContext, levelIdx: number): void {
    this.levelIndex = levelIdx;
    const level = LEVELS[levelIdx];
    this.waveState = createWaveState(levelIdx);
    this.levelCompleteTimer = 0;

    this.world = new World();
    this.particles = new ParticleSystem();
    this.floatingText = new FloatingTextManager();

    this.renderer = new GameRenderer(this.ctx2d, this.camera, this.particles, this.floatingText);

    // Spawn player at center
    this.playerId = this.world.spawn();
    this.world.add(this.playerId, C.Pos, { x: 0, y: 0 } as Pos);
    this.world.add(this.playerId, C.Vel, { x: 0, y: 0 } as Vel);
    this.world.add(this.playerId, C.Health, { current: 100, max: 100, invuln: 1.0 } as Health);
    this.world.add(this.playerId, C.Collider, { radius: 12 } as Collider);
    this.world.add(this.playerId, C.Player, {
      speed: 200,
      score: this.playerScore,
      lives: levelIdx === 0 ? 3 : (this.world.get<Player>(this.playerId, C.Player)?.lives ?? 3),
      currentWeapon: 0,
      weapons: [{ type: 'pistol', ammo: -1, timer: 0 }],
      lastDirX: 0,
      lastDirY: -1,
    } as Player);
    this.world.add(this.playerId, C.Visual, {
      shape: 'rocket', color: '#00ffff', size: 13,
      glow: '#0088ff', glowSize: 12, rotation: 0,
    } as Visual);

    // Restore lives/score from previous level
    if (levelIdx > 0) {
      const p = this.world.get<Player>(this.playerId, C.Player);
      p.score = this.playerScore;
      p.lives = this._savedLives;
    }

    // Register systems
    this.world.addSystem(createInputSystem(ctx.input));
    this.world.addSystem(createShootSystem(ctx.input, this.particles));
    this.world.addSystem(createEnemyShootSystem());
    this.world.addSystem(createBTEnemySystem(this.spatialHash));
    this.world.addSystem(createMovementSystem());
    this.world.addSystem(createProjectileSystem());
    this.world.addSystem(createCollisionSystem(this.spatialHash, this.particles, this.floatingText));
    this.world.addSystem(createExplosionSystem());
    this.world.addSystem(createDestructibleSystem(this.particles));
    this.world.addSystem(createDeathSystem(this.particles));
    this.world.addSystem(createWaveSystem(this.waveState));
    this.world.addSystem(createPickupSystem());
    this.world.addSystem(createDamageFlashSystem());
    this.world.addSystem(createInvulnSystem());
    this.world.addSystem(createArenaBoundsSystem(level.arenaWidth, level.arenaHeight));

    // Spawn destructibles
    spawnDestructibles(this.world, level.arenaWidth, level.arenaHeight, level.crates, level.barrels);

    this.camera.pos.set(0, 0);
  }

  private _savedLives = 3;

  private checkPlayerDeath(): void {
    const hp = this.world.get<Health>(this.playerId, C.Health);
    if (hp.current <= 0) {
      const player = this.world.get<Player>(this.playerId, C.Player);
      player.lives--;

      if (player.lives <= 0) {
        this.screen = 'gameover';
        this.camera.shake(10, 0.5);
        this.ads.gameplayStop();
        return;
      }

      // Respawn with invuln
      hp.current = hp.max;
      hp.invuln = 2.0;
      const pos = this.world.get<Pos>(this.playerId, C.Pos);
      pos.x = 0;
      pos.y = 0;

      this.camera.shake(6, 0.3);
      this.particles.emit(pos.x, pos.y, 20, {
        color: '#ff3333', speed: 150, life: 0.5, size: 5, sizeEnd: 0,
      });
    }
  }

  private nextLevel(): void {
    if (!this.gameCtx) return;
    const player = this.world.get<Player>(this.playerId, C.Player);
    this._savedLives = player.lives;
    this.playerScore = player.score;

    this.ads.showInterstitial().catch(() => {}).finally(() => {
      if (this.gameCtx) {
        this.initLevel(this.gameCtx, this.levelIndex + 1);
        this.screen = 'playing';
        this.ads.gameplayStart();
      }
    });
  }

  private restart(): void {
    this.playerScore = 0;
    this._savedLives = 3;
    this.ads.showInterstitial().catch(() => {}).finally(() => {
      if (this.gameCtx) {
        this.initLevel(this.gameCtx, 0);
        this.screen = 'playing';
        this.ads.gameplayStart();
      }
    });
  }
}
