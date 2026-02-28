/**
 * GravitySwoopScene — main scene that ties together ECS, systems, rendering, and UI.
 */

import { World, SpatialHash, ParticleSystem } from '@survivors/core';
import type { Scene, GameContext } from '@survivors/core';

import { C, type PosData, type VelData, type BirdData, type GravityPointData, type ColliderData, type ObstacleData, type CollectibleData, type GoalData } from './components';
import {
  LEVELS, GRAVITY_STRENGTH, GRAVITY_MIN_DIST, BIRD_RADIUS,
  GOAL_RADIUS, SEED_COLLECT_RADIUS, PAR_TIMES,
} from './config';
import {
  gravitySystem, movementSystem, collisionSystem,
  deathSystem, trailSystem, applySlingshot,
} from './systems';
import type { GameState } from './systems';
import { renderGame, resetCamera } from './renderer';
import { UIManager } from './ui';
import type { Screen, LevelResult } from './ui';
import type { AdPlatform } from '@survivors/sdk';

export class GravitySwoopScene implements Scene {
  name = 'gravity-swoop';

  private canvas: HTMLCanvasElement;
  private ctx2d: CanvasRenderingContext2D;
  private platform: AdPlatform;

  private world!: World;
  private spatialHash!: SpatialHash<number>;
  private particles!: ParticleSystem;
  private ui: UIManager;
  private gameState!: GameState;

  private screen: Screen = 'menu';
  private currentLevel = 0;
  private time = 0;
  private lastResult: LevelResult | null = null;

  // Pointer tracking
  private pointerDown = false;
  private pointerWorldX = 0;
  private pointerWorldY = 0;

  // Camera state (used for screen->world transform)
  private camX = 0;
  private camY = 0;

  // Bound event handlers (for cleanup)
  private handlePointerDown: (e: PointerEvent) => void;
  private handlePointerMove: (e: PointerEvent) => void;
  private handlePointerUp: (e: PointerEvent) => void;
  private handleResize: () => void;
  private handleKeyDown: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, platform: AdPlatform) {
    this.canvas = canvas;
    this.ctx2d = canvas.getContext('2d')!;
    this.platform = platform;
    this.ui = new UIManager();

    // Bind event handlers
    this.handlePointerDown = this.onPointerDown.bind(this);
    this.handlePointerMove = this.onPointerMove.bind(this);
    this.handlePointerUp = this.onPointerUp.bind(this);
    this.handleResize = this.onResize.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);

    // UI callbacks
    this.ui.onStartGame = () => { this.screen = 'levelSelect'; };
    this.ui.onSelectLevel = (idx) => { this.startLevel(idx); };
    this.ui.onRetryLevel = () => { this.startLevel(this.currentLevel); };
    this.ui.onNextLevel = () => {
      if (this.currentLevel + 1 < LEVELS.length) {
        this.startLevel(this.currentLevel + 1);
      } else {
        this.screen = 'levelSelect';
      }
    };
    this.ui.onResume = () => { this.screen = 'playing'; };
    this.ui.onLevelSelect = () => { this.screen = 'levelSelect'; };
  }

  enter(_ctx: GameContext): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerUp);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    this.onResize();
  }

  exit(_ctx: GameContext): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  // ======================================================================
  // UPDATE
  // ======================================================================

  update(_ctx: GameContext, dt: number): void {
    this.time += dt;

    if (this.screen !== 'playing') return;

    // Run game systems
    this.gameState.elapsedTime += dt;
    this.gameState.pointerDown = this.pointerDown;
    this.gameState.pointerX = this.pointerWorldX;
    this.gameState.pointerY = this.pointerWorldY;

    gravitySystem(this.gameState, dt);
    movementSystem(this.gameState, dt);
    collisionSystem(this.gameState, dt);
    deathSystem(this.gameState, dt);
    trailSystem(this.gameState, dt);

    this.particles.update(dt);
    this.world.flush();

    // Update camera position for screen→world conversion
    if (this.world.isAlive(this.gameState.birdId)) {
      const birdPos = this.world.get<PosData>(this.gameState.birdId, C.Pos);
      this.camX += (birdPos.x - this.camX) * 0.08;
      this.camY += (birdPos.y - this.camY) * 0.08;
    }
  }

  // ======================================================================
  // RENDER
  // ======================================================================

  render(_ctx: GameContext, _alpha: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const c = this.ctx2d;

    if (this.screen === 'menu') {
      c.fillStyle = '#0b0b2e';
      c.fillRect(0, 0, w, h);
      this.ui.drawMenu(c, w, h, this.time);
      return;
    }

    if (this.screen === 'levelSelect') {
      c.fillStyle = '#0b0b2e';
      c.fillRect(0, 0, w, h);
      this.ui.drawLevelSelect(c, w, h);
      return;
    }

    // Playing, paused, or levelComplete — render game world first
    if (this.gameState) {
      renderGame(c, this.canvas, this.gameState, this.time);

      // HUD
      this.ui.drawPlayingHUD(
        c, w, h,
        this.currentLevel,
        this.gameState.seedsCollected,
        this.gameState.totalSeeds,
        this.gameState.elapsedTime,
      );
    }

    // Overlay screens
    if (this.screen === 'paused') {
      this.ui.drawPaused(c, w, h);
    } else if (this.screen === 'levelComplete' && this.lastResult) {
      this.ui.drawLevelComplete(c, w, h, this.currentLevel, this.lastResult);
    }
  }

  // ======================================================================
  // LEVEL MANAGEMENT
  // ======================================================================

  private startLevel(levelIdx: number): void {
    this.currentLevel = levelIdx;
    const levelData = LEVELS[levelIdx];

    this.world = new World();
    this.spatialHash = new SpatialHash<number>(64);
    this.particles = new ParticleSystem();
    this.pointerDown = false;

    // Spawn bird
    const birdId = this.world.spawn();
    this.world.add<PosData>(birdId, C.Pos, { x: levelData.birdSpawn.x, y: levelData.birdSpawn.y });
    this.world.add<VelData>(birdId, C.Vel, { x: levelData.birdSpawn.vx, y: levelData.birdSpawn.vy });
    this.world.add<BirdData>(birdId, C.Bird, {
      rotation: Math.atan2(levelData.birdSpawn.vy, levelData.birdSpawn.vx),
      alive: true,
      deathTimer: 0,
      angularVel: 0,
      feathersSpawned: false,
    });
    this.world.add<ColliderData>(birdId, C.Collider, {
      shape: 'circle', radius: BIRD_RADIUS, width: 0, height: 0,
    });

    // Spawn obstacles
    for (const obs of levelData.obstacles) {
      const eid = this.world.spawn();
      const hw = obs.w / 2;
      const hh = obs.h / 2;
      this.world.add<PosData>(eid, C.Pos, { x: obs.x + hw, y: obs.y + hh });
      this.world.add<ObstacleData>(eid, C.Obstacle, {
        type: obs.type as any,
        width: obs.w,
        height: obs.h,
      });
      const isCircular = obs.type === 'spike' || obs.type === 'cat';
      this.world.add<ColliderData>(eid, C.Collider, {
        shape: isCircular ? 'circle' : 'rect',
        radius: isCircular ? Math.max(obs.w, obs.h) / 2 : 0,
        width: obs.w,
        height: obs.h,
      });
    }

    // Spawn collectibles
    let totalSeeds = 0;
    for (const col of levelData.collectibles) {
      const eid = this.world.spawn();
      this.world.add<PosData>(eid, C.Pos, { x: col.x, y: col.y });
      this.world.add<CollectibleData>(eid, C.Collectible, { value: 1, collected: false });
      this.world.add<ColliderData>(eid, C.Collider, {
        shape: 'circle', radius: SEED_COLLECT_RADIUS, width: 0, height: 0,
      });
      totalSeeds++;
    }

    // Spawn goal
    const goalId = this.world.spawn();
    this.world.add<PosData>(goalId, C.Pos, { x: levelData.goal.x, y: levelData.goal.y });
    this.world.add<GoalData>(goalId, C.Goal, { radius: GOAL_RADIUS });
    this.world.add<ColliderData>(goalId, C.Collider, {
      shape: 'circle', radius: GOAL_RADIUS, width: 0, height: 0,
    });

    // Reset camera
    resetCamera(levelData.birdSpawn.x, levelData.birdSpawn.y);
    this.camX = levelData.birdSpawn.x;
    this.camY = levelData.birdSpawn.y;

    // Build game state
    this.gameState = {
      world: this.world,
      birdId,
      spatialHash: this.spatialHash,
      particles: this.particles,
      levelData,
      levelComplete: false,
      seedsCollected: 0,
      totalSeeds,
      elapsedTime: 0,
      pointerDown: false,
      pointerX: 0,
      pointerY: 0,
      gravityPointId: -1,
      onDeath: () => this.restartLevel(),
      onComplete: () => this.completeLevel(),
    };

    this.screen = 'playing';
    this.lastResult = null;
  }

  private restartLevel(): void {
    this.startLevel(this.currentLevel);
  }

  private completeLevel(): void {
    const gs = this.gameState;
    const allSeeds = gs.seedsCollected >= gs.totalSeeds;
    const parTime = PAR_TIMES[this.currentLevel] ?? 30;
    const underPar = gs.elapsedTime <= parTime;

    let stars = 1; // completed
    if (underPar) stars = 2;
    if (allSeeds) stars = 3;

    this.lastResult = {
      stars,
      seedsCollected: gs.seedsCollected,
      totalSeeds: gs.totalSeeds,
      time: gs.elapsedTime,
    };

    this.ui.recordResult(this.currentLevel, this.lastResult);
    this.screen = 'levelComplete';
    this.platform.showInterstitial().catch(() => {});
  }

  // ======================================================================
  // INPUT
  // ======================================================================

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: sx - (this.canvas.width / 2 - this.camX),
      y: sy - (this.canvas.height / 2 - this.camY),
    };
  }

  private onPointerDown(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const sx = (e.clientX - rect.left) * dpr;
    const sy = (e.clientY - rect.top) * dpr;

    this.ui.mouseX = sx;
    this.ui.mouseY = sy;

    // Handle UI clicks first
    if (this.screen !== 'playing') {
      this.ui.handleClick(this.screen, sx, sy, this.canvas.width, this.canvas.height);
      return;
    }

    // Check pause button (top-right area)
    if (sx > this.canvas.width - 60 && sy > 30 && sy < 70) {
      this.screen = 'paused';
      return;
    }

    // Create gravity point
    const wp = this.screenToWorld(sx, sy);
    this.pointerWorldX = wp.x;
    this.pointerWorldY = wp.y;
    this.pointerDown = true;

    this.spawnGravityPoint(wp.x, wp.y);
  }

  private onPointerMove(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const sx = (e.clientX - rect.left) * dpr;
    const sy = (e.clientY - rect.top) * dpr;

    this.ui.mouseX = sx;
    this.ui.mouseY = sy;

    if (this.pointerDown && this.screen === 'playing') {
      const wp = this.screenToWorld(sx, sy);
      this.pointerWorldX = wp.x;
      this.pointerWorldY = wp.y;
    }
  }

  private onPointerUp(_e: PointerEvent): void {
    if (this.pointerDown && this.screen === 'playing') {
      // Apply slingshot release
      applySlingshot(this.gameState);
      this.pointerDown = false;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (this.screen === 'playing') {
        this.screen = 'paused';
      } else if (this.screen === 'paused') {
        this.screen = 'playing';
      }
    }
    if (e.key === 'r' || e.key === 'R') {
      if (this.screen === 'playing') {
        this.restartLevel();
      }
    }
  }

  private onResize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
  }

  private spawnGravityPoint(x: number, y: number): void {
    if (!this.gameState) return;
    const { world } = this.gameState;

    // Destroy existing gravity point
    if (this.gameState.gravityPointId >= 0 && world.isAlive(this.gameState.gravityPointId)) {
      world.destroy(this.gameState.gravityPointId);
      world.flush();
    }

    const eid = world.spawn();
    world.add<PosData>(eid, C.Pos, { x, y });
    world.add<GravityPointData>(eid, C.GravityPoint, {
      strength: GRAVITY_STRENGTH,
      minDist: GRAVITY_MIN_DIST,
      visualRadius: 20,
      age: 0,
    });
    this.gameState.gravityPointId = eid;
  }
}
