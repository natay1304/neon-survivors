/** Neon Path — main game scene */

import type { Scene, GameContext } from '@survivors/core';


import {
  LEVELS, WORLD_W,
  PLAYER_W, PLAYER_H, SPIKE_W, SPIKE_H, DOOR_W, DOOR_H,
  RESPAWN_DELAY, LEVEL_COMPLETE_DELAY,
} from './config';
import { createPlayer, stepPlayer, isOutOfBounds } from './physics';
import type { Player } from './physics';
import {
  createObstacleStates, updateObstacles,
  getMovingPlatformRects, carryPlayerOnMovingPlatforms, isPlayerKilledByObstacle,
} from './obstacles';
import type { ObstacleStates } from './obstacles';
import {
  renderGame, beginWorldTransform, endWorldTransform,
  drawDeathFlash, drawCompleteFlash, drawPixelExplosion,
} from './renderer';
import { createPixelExplosion, updatePixelExplosion } from './effects';
import type { PixelExplosion } from './effects';
import {
  drawHUD, drawMenu, drawDeadOverlay, drawLevelComplete, drawGameComplete,
  drawMobileControls,
} from './ui';
import type { LevelDef } from './config';

type GameState = 'menu' | 'playing' | 'dead' | 'levelComplete' | 'gameComplete';

export class NeonPathScene implements Scene {
  readonly name = 'neon-path';

  private canvas: HTMLCanvasElement;
  private ctx2d: CanvasRenderingContext2D;

  private state: GameState = 'menu';
  private currentLevelIdx = 0;
  private deaths = 0;
  private time = 0;
  private stateTimer = 0;

  private level!: LevelDef;
  private player!: Player;
  private obstacles!: ObstacleStates;
  private deathEffects: PixelExplosion[] = [];

  // Keyboard state — tracked directly (ctx.input.dir requires input.update() wiring)
  private keys = new Set<string>();
  private jumpPressed = false;
  private jumpHeld = false;

  // Resize handling
  private canvasW = 0;
  private canvasH = 0;

  // Bound handlers for cleanup
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onPointerDown: (e: PointerEvent) => void;
  private onResize: () => void;

  constructor(canvas: HTMLCanvasElement, _platform: unknown) {
    this.canvas = canvas;
    this.ctx2d = canvas.getContext('2d')!;

    this.onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!this.jumpHeld) this.jumpPressed = true;
        this.jumpHeld = true;
      }
      if (this.state === 'menu') this.startGame();
      if (this.state === 'gameComplete') this.resetGame();
    };

    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.jumpHeld = false;
      }
    };

    this.onPointerDown = (e: PointerEvent) => {
      if (this.state === 'menu') { this.startGame(); return; }
      if (this.state === 'gameComplete') { this.resetGame(); return; }
      // Right half of screen = jump
      const worldRight = this.canvasW / 2;
      if (e.clientX >= worldRight) {
        this.jumpPressed = true;
      }
    };

    this.onResize = () => {
      const dpr = window.devicePixelRatio || 1;
      this.canvasW = canvas.clientWidth * dpr;
      this.canvasH = canvas.clientHeight * dpr;
      canvas.width = this.canvasW;
      canvas.height = this.canvasH;
    };
  }

  enter(_ctx: GameContext): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  exit(_ctx: GameContext): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('resize', this.onResize);
  }

  // ── Game flow ───────────────────────────────────────────────────────────────

  private startGame(): void {
    this.currentLevelIdx = 0;
    this.deaths = 0;
    this.loadLevel(0);
    this.state = 'playing';
  }

  private resetGame(): void {
    this.state = 'menu';
  }

  private loadLevel(idx: number, keepEffects = false): void {
    this.level = LEVELS[idx]!;
    const spawn = this.level.playerSpawn;
    this.player = createPlayer(spawn.x, spawn.y);
    this.obstacles = createObstacleStates(this.level);
    this.stateTimer = 0;
    if (!keepEffects) this.deathEffects = [];
  }

  private respawn(): void {
    this.loadLevel(this.currentLevelIdx, true); // keep death effects across attempts
    this.state = 'playing';
  }

  private nextLevel(): void {
    this.currentLevelIdx++;
    if (this.currentLevelIdx >= LEVELS.length) {
      this.state = 'gameComplete';
      this.stateTimer = 0;
    } else {
      this.loadLevel(this.currentLevelIdx);
      this.state = 'playing';
    }
  }

  // ── Collision helpers ───────────────────────────────────────────────────────

  private playerTouchesSpike(): boolean {
    const { player } = this;
    for (const s of this.level.spikes) {
      // Spike hitbox — slightly smaller than visual for forgiveness
      const hx = s.x - SPIKE_W / 2 + 3;
      const hy = s.y - SPIKE_H + 2;
      const hw = SPIKE_W - 6;
      const hh = SPIKE_H - 3;
      if (
        player.x < hx + hw &&
        player.x + PLAYER_W > hx &&
        player.y < hy + hh &&
        player.y + PLAYER_H > hy
      ) {
        return true;
      }
    }
    return false;
  }

  private playerReachesDoor(): boolean {
    const { player } = this;
    const { door } = this.level;
    // Overlap with center half of door
    const overlap = 8;
    return (
      player.x + PLAYER_W > door.x + overlap &&
      player.x < door.x + DOOR_W - overlap &&
      player.y + PLAYER_H > door.y + overlap &&
      player.y < door.y + DOOR_H
    );
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(_ctx: GameContext, dt: number): void {
    this.time += dt;

    switch (this.state) {
      case 'menu':
        break;

      case 'playing':
        this.updatePlaying(dt);
        for (const e of this.deathEffects) updatePixelExplosion(e, dt);
        this.deathEffects = this.deathEffects.filter(e => !e.done);
        break;

      case 'dead':
        this.stateTimer += dt;
        for (const e of this.deathEffects) updatePixelExplosion(e, dt);
        this.deathEffects = this.deathEffects.filter(e => !e.done);
        if (this.stateTimer >= RESPAWN_DELAY) this.respawn();
        break;

      case 'levelComplete':
        this.stateTimer += dt;
        if (this.stateTimer >= LEVEL_COMPLETE_DELAY) this.nextLevel();
        break;

      case 'gameComplete':
        this.stateTimer += dt;
        break;
    }

    // Consume jump press at end of update
    this.jumpPressed = false;
  }

  private updatePlaying(dt: number): void {
    // ── Obstacles first (so moving platforms are in new position before player moves)
    updateObstacles(this.obstacles, dt, this.player);

    // Carry player standing on moving platforms
    carryPlayerOnMovingPlatforms(this.player, this.obstacles);

    // ── Player movement
    let moveX = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) moveX -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) moveX += 1;

    const jump = this.jumpPressed;

    // Combine static platforms + current moving platform positions for collision
    const allPlatforms = [
      ...this.level.platforms,
      ...getMovingPlatformRects(this.obstacles),
    ];

    stepPlayer(this.player, dt, moveX, jump, allPlatforms);

    // ── Kill checks
    const dead =
      this.playerTouchesSpike() ||
      isPlayerKilledByObstacle(this.player, this.obstacles) ||
      isOutOfBounds(this.player);

    if (dead) {
      this.deaths++;
      this.deathEffects.push(createPixelExplosion(this.player));
      this.state = 'dead';
      this.stateTimer = 0;
      return;
    }

    // ── Win check
    if (this.playerReachesDoor()) {
      this.state = 'levelComplete';
      this.stateTimer = 0;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  render(_ctx: GameContext, alpha: number): void {
    const c = this.ctx2d;
    const { canvasW, canvasH } = this;

    // Clear to background
    c.fillStyle = '#06060f';
    c.fillRect(0, 0, canvasW, canvasH);

    if (this.state === 'menu') {
      beginWorldTransform(c, canvasW, canvasH);
      drawMenu(c, this.time);
      endWorldTransform(c);
      return;
    }

    if (this.state === 'gameComplete') {
      beginWorldTransform(c, canvasW, canvasH);
      drawGameComplete(c, this.deaths, this.time);
      endWorldTransform(c);
      return;
    }

    // Game world
    const themeIdx = Math.floor(this.currentLevelIdx / 5);
    const showPlayer = this.state !== 'dead';
    beginWorldTransform(c, canvasW, canvasH);
    renderGame(c, this.level, this.player, this.obstacles, this.time, alpha, themeIdx, showPlayer);

    // Pixel death explosions (rendered in world space)
    for (const e of this.deathEffects) drawPixelExplosion(c, e);

    // State overlays
    if (this.state === 'dead') {
      const progress = this.stateTimer / RESPAWN_DELAY;
      drawDeathFlash(c, Math.max(0, 1 - progress * 2));
      drawDeadOverlay(c, this.stateTimer, RESPAWN_DELAY);
    }

    if (this.state === 'levelComplete') {
      const progress = this.stateTimer / LEVEL_COMPLETE_DELAY;
      drawCompleteFlash(c, Math.min(progress * 2, 1));
      drawLevelComplete(c, this.currentLevelIdx, this.stateTimer, LEVEL_COMPLETE_DELAY);
    }

    // HUD (drawn in world space so it scales with the game)
    drawHUD(c, this.currentLevelIdx, this.deaths);

    // Mobile controls hint
    const isMobile = 'ontouchstart' in window;
    if (isMobile) drawMobileControls(c);

    endWorldTransform(c);

    // Clamp player position display to keep within world horizontally
    void WORLD_W; // used in physics module
  }
}
