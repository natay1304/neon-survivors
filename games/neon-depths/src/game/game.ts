/** NeonDepthsScene — main scene orchestrator for the roguelike shooter */

import {
  World, Camera2D, SpatialHash, ParticleSystem, FloatingTextManager,
  type Scene, type GameContext, type Vel, type Collider,
} from '@survivors/core';
import { C, type Pos, type Health, type Player, type Visual } from './components';
import {
  FLOORS, TOTAL_FLOORS, UPGRADES, WEAPONS, ARENA_W, ARENA_H,
  type UpgradeStats,
} from './config';
import { GameRenderer } from './renderer';
import { UIManager, type GameScreen, type UpgradeOption } from './ui';
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
  createDeathSystem,
  createWaveSystem,
  createWaveState,
  createPickupLifetimeSystem,
  createDamageFlashSystem,
  createInvulnSystem,
  createArenaBoundsSystem,
  type WaveState,
} from './systems';

export class NeonDepthsScene implements Scene {
  readonly name = 'neon-depths';

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
  private floorIndex = 0;
  private roomIndex = 0;
  private waveState!: WaveState;
  private roomClearTimer = 0;
  private playerScore = 0;

  private upgradeStats: UpgradeStats = {
    maxHp: 100, speed: 200, armor: 0, damageMultiplier: 1.0, speedMultiplier: 1.0,
  };

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
    if (e.code === 'KeyQ' && this.screen === 'playing') {
      this.switchWeapon();
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
      (opt) => this.applyUpgrade(opt),
      () => this.continueToNextRoom(),
    );
  }

  enter(ctx: GameContext): void {
    this.gameCtx = ctx;
    this.camera = new Camera2D(window.innerWidth, window.innerHeight);
    this.resize();

    ctx.events.on('resize', () => this.resize());
    window.addEventListener('keydown', this.onKeyDown);

    this.initRoom(ctx, 0, 0);
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
    if (this.world.isAlive(this.playerId)) {
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

      this.playerScore = player.score;

      // Check player death
      this.checkPlayerDeath();

      // Check room clear
      if (this.waveState.roomCleared) {
        this.roomClearTimer += dt;
        if (this.roomClearTimer > 0.5 && this.screen === 'playing') {
          this.screen = 'roomClear';
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
    const floor = FLOORS[this.floorIndex];
    const totalRooms = floor?.rooms ?? 1;

    switch (this.screen) {
      case 'menu':
        this.renderer.render(this.world, ARENA_W, ARENA_H, this.floorIndex);
        this.ui.drawMenu(w, h, ctx.input.isMobile);
        break;
      case 'playing':
        this.renderer.render(this.world, ARENA_W, ARENA_H, this.floorIndex);
        this.renderer.drawHUD(this.world, this.floorIndex, this.roomIndex, totalRooms);
        break;
      case 'roomClear':
        this.renderer.render(this.world, ARENA_W, ARENA_H, this.floorIndex);
        this.ui.drawRoomClear(w, h);
        break;
      case 'upgradeChoice':
        this.renderer.render(this.world, ARENA_W, ARENA_H, this.floorIndex);
        this.ui.drawUpgradeChoice(w, h);
        break;
      case 'gameover':
        this.renderer.render(this.world, ARENA_W, ARENA_H, this.floorIndex);
        this.ui.drawGameOver(w, h, this.playerScore, this.floorIndex, this.roomIndex);
        break;
      case 'victory':
        this.renderer.render(this.world, ARENA_W, ARENA_H, this.floorIndex);
        this.ui.drawVictory(w, h, this.playerScore);
        break;
      case 'paused':
        this.renderer.render(this.world, ARENA_W, ARENA_H, this.floorIndex);
        this.ui.drawPaused(w, h);
        break;
    }

    // Joysticks
    if (this.screen === 'playing' && ctx.input.isMobile) {
      if (ctx.input.moveJoystickActive) {
        drawJoystick(c, ctx.input.moveJoystickStart, ctx.input.moveJoystickCurrent, '#00ccff');
      }
      if (ctx.input.aimJoystickActive) {
        drawJoystick(c, ctx.input.aimJoystickStart, ctx.input.aimJoystickCurrent, '#ff6633');
      }
    }

    c.restore();
  }

  // ─── PRIVATE ────────────────────────────────────────────────────────

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.camera.resize(window.innerWidth, window.innerHeight);
  }

  private initRoom(ctx: GameContext, floorIdx: number, roomIdx: number): void {
    this.floorIndex = floorIdx;
    this.roomIndex = roomIdx;
    this.roomClearTimer = 0;

    const floor = FLOORS[floorIdx];
    const isBoss = (roomIdx + 1) % floor.bossEvery === 0;

    this.waveState = createWaveState(floor, roomIdx, isBoss);

    this.world = new World();
    this.particles = new ParticleSystem();
    this.floatingText = new FloatingTextManager();
    this.renderer = new GameRenderer(this.ctx2d, this.camera, this.particles, this.floatingText);

    // Spawn player
    this.playerId = this.world.spawn();
    this.world.add(this.playerId, C.Pos, { x: 0, y: 0 } as Pos);
    this.world.add(this.playerId, C.Vel, { x: 0, y: 0 } as Vel);
    this.world.add(this.playerId, C.Health, {
      current: this.upgradeStats.maxHp,
      max: this.upgradeStats.maxHp,
      invuln: 1.0,
    } as Health);
    this.world.add(this.playerId, C.Collider, { radius: 12 } as Collider);
    this.world.add(this.playerId, C.Player, {
      speed: this.upgradeStats.speed,
      score: this.playerScore,
      currentWeapon: 0,
      weapons: this._savedWeapons.length > 0
        ? this._savedWeapons.map(w => ({ ...w, timer: 0 }))
        : [{ type: 'blaster', level: 0, timer: 0 }],
      lastDirX: 0,
      lastDirY: -1,
      kills: this._savedKills,
      armor: this.upgradeStats.armor,
      damageMultiplier: this.upgradeStats.damageMultiplier,
      speedMultiplier: this.upgradeStats.speedMultiplier,
      roomsCleared: this._savedRoomsCleared,
      floor: floorIdx,
    } as Player);
    this.world.add(this.playerId, C.Visual, {
      shape: 'rocket', color: '#00ffcc', size: 13,
      glow: '#00aa88', glowSize: 12, rotation: 0,
    } as Visual);

    // Register systems
    this.world.addSystem(createInputSystem(ctx.input));
    this.world.addSystem(createShootSystem(ctx.input, this.particles));
    this.world.addSystem(createEnemyShootSystem());
    this.world.addSystem(createBTEnemySystem(this.spatialHash));
    this.world.addSystem(createMovementSystem());
    this.world.addSystem(createProjectileSystem());
    this.world.addSystem(createCollisionSystem(this.spatialHash, this.particles, this.floatingText));
    this.world.addSystem(createDeathSystem(this.particles));
    this.world.addSystem(createWaveSystem(this.waveState, floor));
    this.world.addSystem(createPickupLifetimeSystem());
    this.world.addSystem(createDamageFlashSystem());
    this.world.addSystem(createInvulnSystem());
    this.world.addSystem(createArenaBoundsSystem(ARENA_W, ARENA_H));

    this.camera.pos.set(0, 0);
  }

  private _savedWeapons: { type: string; level: number; timer: number }[] = [];
  private _savedKills = 0;
  private _savedRoomsCleared = 0;
  private _savedHp = 100;

  private savePlayerState(): void {
    if (!this.world.isAlive(this.playerId)) return;
    const player = this.world.get<Player>(this.playerId, C.Player);
    const hp = this.world.get<Health>(this.playerId, C.Health);
    this._savedWeapons = player.weapons.map(w => ({ ...w }));
    this._savedKills = player.kills;
    this._savedRoomsCleared = player.roomsCleared + 1;
    this._savedHp = hp.current;
    this.playerScore = player.score;
  }

  private checkPlayerDeath(): void {
    if (!this.world.isAlive(this.playerId)) return;
    const hp = this.world.get<Health>(this.playerId, C.Health);
    if (hp.current <= 0) {
      this.screen = 'gameover';
      this.camera.shake(10, 0.5);
      this.ads.gameplayStop();
      this.particles.emit(
        this.world.get<Pos>(this.playerId, C.Pos).x,
        this.world.get<Pos>(this.playerId, C.Pos).y,
        30, { color: '#ff3333', speed: 200, life: 0.6, size: 6, sizeEnd: 0 },
      );
    }
  }

  private continueToNextRoom(): void {
    if (!this.gameCtx) return;
    this.savePlayerState();

    const floor = FLOORS[this.floorIndex];
    const nextRoom = this.roomIndex + 1;

    if (nextRoom >= floor.rooms) {
      // Next floor
      const nextFloor = this.floorIndex + 1;
      if (nextFloor >= TOTAL_FLOORS) {
        this.screen = 'victory';
        this.ads.gameplayStop();
        this.ads.happytime();
        return;
      }
      // Show upgrade between floors
      this.floorIndex = nextFloor;
      this.roomIndex = 0;
      this.ui.generateUpgradeOptions();
      this.screen = 'upgradeChoice';
    } else {
      // Same floor, next room — show upgrade every 2 rooms
      this.roomIndex = nextRoom;
      if (nextRoom % 2 === 0) {
        this.ui.generateUpgradeOptions();
        this.screen = 'upgradeChoice';
      } else {
        this.startNextRoom();
      }
    }
  }

  private applyUpgrade(option: UpgradeOption): void {
    if (option.type === 'stat') {
      const upg = UPGRADES[option.index];
      if (upg) {
        upg.apply(this.upgradeStats);
      }
    } else if (option.type === 'weapon' && option.weaponType) {
      // Level up existing or add new weapon
      const existing = this._savedWeapons.findIndex(w => w.type === option.weaponType);
      if (existing >= 0) {
        const wSlot = this._savedWeapons[existing];
        const maxLevel = (WEAPONS[wSlot.type]?.length ?? 1) - 1;
        if (wSlot.level < maxLevel) {
          wSlot.level++;
        }
      } else {
        this._savedWeapons.push({ type: option.weaponType, level: 0, timer: 0 });
      }
    }

    // Heal some HP between rooms
    this._savedHp = Math.min(this.upgradeStats.maxHp, this._savedHp + 30);

    this.startNextRoom();
  }

  private startNextRoom(): void {
    if (!this.gameCtx) return;
    this.initRoom(this.gameCtx, this.floorIndex, this.roomIndex);
    // Restore HP
    const hp = this.world.get<Health>(this.playerId, C.Health);
    hp.current = Math.min(this.upgradeStats.maxHp, this._savedHp);
    this.screen = 'playing';
    this.ads.gameplayStart();
  }

  private switchWeapon(): void {
    if (!this.world.isAlive(this.playerId)) return;
    const player = this.world.get<Player>(this.playerId, C.Player);
    if (player.weapons.length <= 1) return;
    player.currentWeapon = (player.currentWeapon + 1) % player.weapons.length;
  }

  private restart(): void {
    this.playerScore = 0;
    this._savedWeapons = [];
    this._savedKills = 0;
    this._savedRoomsCleared = 0;
    this._savedHp = 100;
    this.upgradeStats = {
      maxHp: 100, speed: 200, armor: 0, damageMultiplier: 1.0, speedMultiplier: 1.0,
    };

    this.ads.showInterstitial().catch(() => {}).finally(() => {
      if (this.gameCtx) {
        this.initRoom(this.gameCtx, 0, 0);
        this.screen = 'playing';
        this.ads.gameplayStart();
      }
    });
  }
}
