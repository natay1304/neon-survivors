/** Main Game class — orchestrates all systems, manages game state */

import { World } from '../core/ecs';
import { InputManager } from '../core/input';
import { Camera } from '../core/camera';
import { SpatialHash } from '../core/spatial-hash';
import { ParticleSystem } from '../core/particles';
import { FloatingTextManager } from '../core/utils';
import { C, Pos, Vel, Health, Collider, Player, Visual } from './components';
import { GAME_DURATION, STAT_UPGRADES, xpForLevel } from './config';
import { GameRenderer } from './renderer';
import { UIManager, GameScreen } from './ui';
import type { AdPlatform } from '../sdk';
import {
  createInputSystem,
  createMovementSystem,
  createEnemyAISystem,
  createWeaponSystem,
  createProjectileSystem,
  createCollisionSystem,
  createPickupSystem,
  createWaveSystem,
  createDeathSystem,
  createLightningSystem,
  createBonusSpawnSystem,
  createBonusPickupSystem,
} from './systems';

const TICK_RATE = 60;
const TICK_DURATION = 1000 / TICK_RATE;
const MAX_FRAME_TIME = 100; // prevent spiral of death

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world!: World;
  private input: InputManager;
  private camera: Camera;
  private spatialHash: SpatialHash<number>;
  private particles!: ParticleSystem;
  private floatingText!: FloatingTextManager;
  private renderer!: GameRenderer;
  private ui: UIManager;
  private ads: AdPlatform;

  private screen: GameScreen = 'menu';
  private gameTime = 0;
  private accumulator = 0;
  private lastTime = 0;
  private playerId = -1;
  private hasRevived = false;

  private gameState = {
    damageMult: 0,
    cooldownMult: 0,
    gameTime: 0,
    bossSpawned: new Set<number>(),
    minibossSpawned: new Set<number>(),
  };

  constructor(canvas: HTMLCanvasElement, ads: AdPlatform) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ads = ads;

    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.input = new InputManager(canvas);
    this.spatialHash = new SpatialHash(64);

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.ui = new UIManager(
      this.ctx,
      (index) => this.onUpgradeSelected(index),
      () => this.restart(),
    );
    this.ui.setReviveHandler(() => this.revive());
    this.ui.enableTracking();

    this.initGame();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.screen === 'playing') {
          this.screen = 'paused';
          this.ads.gameplayStop();
        } else if (this.screen === 'paused') {
          this.screen = 'playing';
          this.ads.gameplayStart();
        }
      }
    });
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Use CSS pixels for game logic
    this.camera.width = window.innerWidth;
    this.camera.height = window.innerHeight;
  }

  private initGame(): void {
    this.world = new World();
    this.particles = new ParticleSystem();
    this.floatingText = new FloatingTextManager();
    this.gameTime = 0;
    this.gameState.damageMult = 0;
    this.gameState.cooldownMult = 0;
    this.gameState.gameTime = 0;
    this.gameState.bossSpawned.clear();
    this.gameState.minibossSpawned.clear();
    this.hasRevived = false;
    this.ui.canRevive = true;

    this.renderer = new GameRenderer(this.ctx, this.camera, this.particles, this.floatingText);

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
    } as Player);
    this.world.add(this.playerId, C.Visual, {
      shape: 'rocket',
      color: '#00ffff',
      size: 14,
      glow: '#0088ff',
      glowSize: 15,
      rotation: 0,
    } as Visual);

    // Register systems
    this.world.addSystem(createInputSystem(this.input));
    this.world.addSystem(createEnemyAISystem());
    this.world.addSystem(createWeaponSystem(this.input, this.particles, this.floatingText, this.spatialHash, this.gameState));
    this.world.addSystem(createMovementSystem());
    this.world.addSystem(createProjectileSystem());
    this.world.addSystem(createCollisionSystem(this.spatialHash, this.particles, this.floatingText));
    this.world.addSystem(createPickupSystem(this.particles, this.floatingText));
    this.world.addSystem(createDeathSystem(this.particles));
    this.world.addSystem(createWaveSystem(this.gameState));
    this.world.addSystem(createLightningSystem());
    this.world.addSystem(createBonusSpawnSystem());
    this.world.addSystem(createBonusPickupSystem(this.particles, this.floatingText, this.spatialHash));

    this.camera.pos.set(0, 0);
  }

  private restart(): void {
    // Show interstitial ad between rounds, then restart
    this.ads.showInterstitial().catch(() => {}).finally(() => {
      this.initGame();
      this.screen = 'playing';
      this.ads.gameplayStart();
    });
  }

  private revive(): void {
    if (this.hasRevived) return;
    // Show rewarded ad, then revive player with 50% HP
    this.ads.showRewarded().then((watched) => {
      if (watched) {
        this.hasRevived = true;
        this.ui.canRevive = false;
        const hp = this.world.get<Health>(this.playerId, C.Health);
        hp.current = Math.ceil(hp.max * 0.5);
        // Brief invulnerability after revive
        hp.invuln = 2;
        this.screen = 'playing';
        this.ads.gameplayStart();
        // Revive particles
        this.particles.emit(
          this.world.get<Pos>(this.playerId, C.Pos).x,
          this.world.get<Pos>(this.playerId, C.Pos).y,
          25,
          { color: '#ffaa33', speed: 150, life: 0.8, size: 5, sizeEnd: 0 },
        );
      }
    }).catch(() => {});
  }

  private onUpgradeSelected(index: number): void {
    if (this.screen !== 'levelup') return;
    const upgrade = this.ui.currentUpgrades[index];
    if (!upgrade) return;

    // Apply stat upgrades
    if (upgrade.id.startsWith('stat_')) {
      const statKey = upgrade.id.replace('stat_', '') as keyof typeof STAT_UPGRADES;
      const player = this.world.get<Player>(this.playerId, C.Player);
      const hp = this.world.get<Health>(this.playerId, C.Health);
      // Track stat picks for HUD display
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
      // Weapon upgrades handled by the action closure
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

      // Heal on level up
      const hp = this.world.get<Health>(this.playerId, C.Health);
      hp.current = Math.min(hp.current + hp.max * 0.1, hp.max);

      // Show upgrade screen
      this.ui.generateUpgrades(player);
      this.screen = 'levelup';
      this.particles.emit(
        this.world.get<Pos>(this.playerId, C.Pos).x,
        this.world.get<Pos>(this.playerId, C.Pos).y,
        30,
        { color: '#ffcc00', speed: 200, life: 0.6, size: 5, sizeEnd: 0 }
      );
      break; // Handle one level up at a time
    }
  }

  private checkGameEnd(): void {
    const hp = this.world.get<Health>(this.playerId, C.Health);
    if (hp.current <= 0) {
      this.screen = 'gameover';
      this.ui.canRevive = !this.hasRevived;
      this.camera.shake(8, 0.5);
      this.ads.gameplayStop();
      return;
    }
    if (this.gameTime >= GAME_DURATION) {
      this.screen = 'victory';
      this.ads.gameplayStop();
      this.ads.happytime();
    }
  }

  start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(currentTime: number): void {
    const frameTime = Math.min(currentTime - this.lastTime, MAX_FRAME_TIME);
    this.lastTime = currentTime;

    if (this.screen === 'menu') {
      if (this.input.anyKey) {
        this.screen = 'playing';
        this.ads.gameplayStart();
      }
    }

    // Mobile pause button
    if (this.input.pauseTap) {
      if (this.screen === 'playing') {
        this.screen = 'paused';
        this.ads.gameplayStop();
      } else if (this.screen === 'paused') {
        this.screen = 'playing';
        this.ads.gameplayStart();
      }
    }

    if (this.screen === 'playing') {
      this.accumulator += frameTime;
      while (this.accumulator >= TICK_DURATION) {
        this.accumulator -= TICK_DURATION;
        const dt = TICK_DURATION / 1000;

        this.gameTime += dt;
        this.gameState.gameTime = this.gameTime;

        this.world.update(dt);
        this.particles.update(dt);
        this.floatingText.update(dt);

        // Update player visual rotation based on aim direction
        const player = this.world.get<Player>(this.playerId, C.Player);
        const vis = this.world.get<Visual>(this.playerId, C.Visual);
        if (this.input.isAiming) {
          vis.rotation = Math.atan2(this.input.aimDir.y, this.input.aimDir.x) + Math.PI / 2;
        } else {
          vis.rotation = Math.atan2(player.lastDirY, player.lastDirX) + Math.PI / 2;
        }

        // Camera follow
        const pPos = this.world.get<Pos>(this.playerId, C.Pos);
        this.camera.follow(pPos, 0.1, dt);
        this.camera.update(dt);

        this.checkLevelUp();
        this.checkGameEnd();

        if (this.screen !== 'playing') break;
      }
    }

    // Render
    this.ctx.save();
    const dpr = window.devicePixelRatio || 1;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = window.innerWidth;
    const h = window.innerHeight;

    switch (this.screen) {
      case 'menu':
        this.renderer.render(this.world, this.gameTime, this.screen);
        this.ui.drawMenu(w, h, this.input.isMobile);
        break;
      case 'playing':
        this.renderer.render(this.world, this.gameTime, this.screen);
        break;
      case 'levelup':
        this.renderer.render(this.world, this.gameTime, this.screen);
        this.ui.drawLevelUp(w, h);
        break;
      case 'gameover':
      case 'victory': {
        this.renderer.render(this.world, this.gameTime, this.screen);
        const player = this.world.get<Player>(this.playerId, C.Player);
        this.ui.drawGameOver(w, h, player, this.gameTime, this.screen === 'victory');
        break;
      }
      case 'paused':
        this.renderer.render(this.world, this.gameTime, this.screen);
        this.ui.drawPaused(w, h);
        break;
    }

    // Joysticks (screen space, mobile only)
    if (this.screen === 'playing' && this.input.isMobile) {
      this.input.drawJoystick(this.ctx);
      this.input.drawAimJoystick(this.ctx);
    }

    this.ctx.restore();

    this.input.clearFrame();
    requestAnimationFrame((t) => this.loop(t));
  }
}
