/**
 * NeonDashScene — main scene: Geometry Dash clone with neon aesthetics.
 *
 * Auto-scrolling side-scroller where the player cube jumps over obstacles.
 * Tap / Space to jump. One-hit death. Restart from level beginning.
 */

import { ParticleSystem } from '@survivors/core';
import type { Scene, GameContext } from '@survivors/core';

import {
  LEVELS, GRAVITY, JUMP_FORCE, PLAYER_SIZE, GROUND_Y_OFFSET,
  DEATH_FREEZE_TIME, DEATH_PARTICLES, JUMP_PARTICLES,
  TRAIL_PARTICLE_CHANCE, COLLISION_CULL_MULTIPLIER, SPIKE_HITBOX_SHRINK,
  PARTICLE_COLORS, getLevelLength,
} from './config';
import type { ObstacleType } from './config';
import { renderGame, resetCamera, updateCamera, getCameraX } from './renderer';
import { UIManager } from './ui';
import type { Screen } from './ui';
import type { AdPlatform } from '@survivors/sdk';

export class NeonDashScene implements Scene {
  name = 'neon-dash';

  private canvas: HTMLCanvasElement;
  private ctx2d: CanvasRenderingContext2D;
  private platform: AdPlatform;

  private particles!: ParticleSystem;
  private ui: UIManager;

  private screen: Screen = 'menu';
  private currentLevel = 0;
  private time = 0;
  private levelLength = 0;

  // Player state
  private playerX = 0;
  private playerY = 0;
  private playerVelY = 0;
  private playerRotation = 0;
  private playerAlive = true;
  private playerGrounded = false;
  private scrollSpeed = 0;
  private groundY = 0;

  // Death state
  private deathTimer = 0;

  // Attempts counter per level
  private attempts = 0;

  // Obstacles (cached flat array for fast iteration)
  private obstacles: Array<{
    type: ObstacleType;
    x: number;
    y: number;
    w: number;
    h: number;
  }> = [];

  // Bound event handlers
  private handlePointerDown: (e: PointerEvent) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;
  private handleResize: () => void;

  // Jump input state
  private jumpPressed = false;
  private jumpHeld = false;

  constructor(canvas: HTMLCanvasElement, platform: AdPlatform) {
    this.canvas = canvas;
    this.ctx2d = canvas.getContext('2d')!;
    this.platform = platform;
    this.ui = new UIManager();

    this.handlePointerDown = this.onPointerDown.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    this.handleResize = this.onResize.bind(this);

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
    this.ui.onLevelSelect = () => { this.screen = 'levelSelect'; };
  }

  enter(_ctx: GameContext): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
    this.onResize();
  }

  exit(_ctx: GameContext): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
  }

  // ======================================================================
  // UPDATE
  // ======================================================================

  update(_ctx: GameContext, dt: number): void {
    this.time += dt;

    if (this.screen !== 'playing') return;

    // Death freeze
    if (!this.playerAlive) {
      this.deathTimer -= dt;
      this.particles.update(dt);
      if (this.deathTimer <= 0) {
        this.ui.recordAttempt(this.currentLevel, this.getProgress());
        this.screen = 'dead';
      }
      return;
    }

    const level = LEVELS[this.currentLevel];
    this.scrollSpeed = level.speed;

    // Auto-scroll: move player forward
    this.playerX += this.scrollSpeed * dt;

    // Jump logic
    if (this.jumpPressed && this.playerGrounded) {
      this.playerVelY = JUMP_FORCE;
      this.playerGrounded = false;

      // Jump particles
      this.particles.emit(this.playerX, this.groundY, JUMP_PARTICLES, {
        color: level.color,
        speed: 100,
        speedVar: 40,
        life: 0.3,
        lifeVar: 0.1,
        size: 4,
        sizeEnd: 0,
        angle: -Math.PI / 2,
        spread: Math.PI * 0.6,
      });
    }
    this.jumpPressed = false;

    // Gravity
    if (!this.playerGrounded) {
      this.playerVelY += GRAVITY * dt;
    }

    // Apply vertical velocity
    this.playerY += this.playerVelY * dt;

    // Ground collision
    const playerBottom = this.groundY - PLAYER_SIZE;
    if (this.playerY >= playerBottom) {
      this.playerY = playerBottom;
      this.playerVelY = 0;
      this.playerGrounded = true;
    }

    // Player rotation (spins when in air, snaps to grid when grounded)
    if (this.playerGrounded) {
      // Snap rotation to nearest 90 degrees
      const target = Math.round(this.playerRotation / (Math.PI / 2)) * (Math.PI / 2);
      this.playerRotation += (target - this.playerRotation) * 0.3;
    } else {
      this.playerRotation += dt * 8;
    }

    // Trail particles while moving
    if (Math.random() < TRAIL_PARTICLE_CHANCE) {
      this.particles.emit(
        this.playerX - PLAYER_SIZE / 2,
        this.groundY - 2,
        1,
        {
          color: level.color,
          speed: 30,
          speedVar: 10,
          life: 0.2,
          lifeVar: 0.05,
          size: 3,
          sizeEnd: 0,
          angle: Math.PI,
          spread: 0.5,
        },
      );
    }

    // Obstacle collision
    this.checkCollisions();

    // Level completion
    if (this.playerX >= this.levelLength) {
      this.completeLevel();
      return;
    }

    // Update camera
    updateCamera(this.playerX, this.canvas.width);

    // Update particles
    this.particles.update(dt);
  }

  // ======================================================================
  // RENDER
  // ======================================================================

  render(_ctx: GameContext, _alpha: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const c = this.ctx2d;

    if (this.screen === 'menu') {
      c.fillStyle = '#0a0a1a';
      c.fillRect(0, 0, w, h);
      this.ui.drawMenu(c, w, h, this.time);
      return;
    }

    if (this.screen === 'levelSelect') {
      c.fillStyle = '#0a0a1a';
      c.fillRect(0, 0, w, h);
      this.ui.drawLevelSelect(c, w, h);
      return;
    }

    // Playing, dead, or levelComplete — render game world
    const level = LEVELS[this.currentLevel];

    // Build visible obstacles list
    const camX = getCameraX();
    const visibleObs = this.obstacles.filter(
      o => o.x + o.w > camX - 100 && o.x - o.w < camX + w + 100,
    );

    renderGame(
      c, this.canvas,
      this.playerX, this.playerY,
      this.playerRotation,
      this.playerAlive,
      visibleObs,
      this.groundY,
      this.particles,
      this.time,
      level,
      this.getProgress(),
    );

    // HUD
    this.ui.drawPlayingHUD(c, w, h, this.currentLevel, this.attempts);

    // Overlay screens
    if (this.screen === 'dead') {
      this.ui.drawDead(c, w, h, this.currentLevel, this.getProgress());
    } else if (this.screen === 'levelComplete') {
      this.ui.drawLevelComplete(c, w, h, this.currentLevel);
    }
  }

  // ======================================================================
  // LEVEL MANAGEMENT
  // ======================================================================

  private startLevel(levelIdx: number): void {
    this.currentLevel = levelIdx;
    const level = LEVELS[levelIdx];

    this.particles = new ParticleSystem();

    // Calculate ground position
    this.groundY = this.canvas.height - GROUND_Y_OFFSET;

    // Reset player
    this.playerX = 100;
    this.playerY = this.groundY - PLAYER_SIZE;
    this.playerVelY = 0;
    this.playerRotation = 0;
    this.playerAlive = true;
    this.playerGrounded = true;
    this.scrollSpeed = level.speed;
    this.jumpPressed = false;
    this.jumpHeld = false;
    this.deathTimer = 0;
    this.attempts++;

    // Calculate level length
    this.levelLength = getLevelLength(level);

    // Build obstacle list
    this.obstacles = [];
    for (const obs of level.obstacles) {
      const def = this.getObstacleDimensions(obs.type);
      this.obstacles.push({
        type: obs.type,
        x: obs.x,
        y: this.groundY - def.h,
        w: def.w,
        h: def.h,
      });
    }

    // Reset camera
    resetCamera();
    updateCamera(this.playerX, this.canvas.width);

    this.screen = 'playing';
  }

  private getObstacleDimensions(type: ObstacleType): { w: number; h: number } {
    switch (type) {
      case 'spike': return { w: PLAYER_SIZE, h: PLAYER_SIZE };
      case 'spike_down': return { w: PLAYER_SIZE, h: PLAYER_SIZE };
      case 'double_spike': return { w: PLAYER_SIZE * 1.8, h: PLAYER_SIZE };
      case 'block': return { w: PLAYER_SIZE, h: PLAYER_SIZE };
      case 'tall_block': return { w: PLAYER_SIZE, h: PLAYER_SIZE * 2 };
    }
  }

  private completeLevel(): void {
    this.ui.recordCompletion(this.currentLevel);
    this.screen = 'levelComplete';
    this.platform.showInterstitial().catch(() => {});
  }

  private getProgress(): number {
    if (this.levelLength <= 0) return 0;
    return Math.min((this.playerX - 100) / (this.levelLength - 100), 1);
  }

  // ======================================================================
  // COLLISION
  // ======================================================================

  private checkCollisions(): void {
    const px = this.playerX;
    const py = this.playerY;
    const pSize = PLAYER_SIZE;
    const halfP = pSize / 2;

    // Player AABB
    const pLeft = px - halfP;
    const pRight = px + halfP;
    const pTop = py;
    const pBottom = py + pSize;

    for (const obs of this.obstacles) {
      // Quick distance check
      if (Math.abs(obs.x - px) > pSize * COLLISION_CULL_MULTIPLIER) continue;

      if (obs.type === 'spike' || obs.type === 'spike_down' || obs.type === 'double_spike') {
        // Spike collision — use triangle approximation (shrunk hitbox)
        const shrink = pSize * SPIKE_HITBOX_SHRINK;
        const sLeft = obs.x - obs.w / 2 + shrink;
        const sRight = obs.x + obs.w / 2 - shrink;
        const sTop = obs.y + shrink;
        const sBottom = obs.y + obs.h;

        if (pRight > sLeft && pLeft < sRight && pBottom > sTop && pTop < sBottom) {
          this.die();
          return;
        }
      } else {
        // Block collision — AABB
        const bLeft = obs.x - obs.w / 2;
        const bRight = obs.x + obs.w / 2;
        const bTop = obs.y;
        const bBottom = obs.y + obs.h;

        if (pRight > bLeft && pLeft < bRight && pBottom > bTop && pTop < bBottom) {
          // Determine collision side
          const overlapLeft = pRight - bLeft;
          const overlapRight = bRight - pLeft;
          const overlapTop = pBottom - bTop;
          const overlapBottom = bBottom - pTop;

          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

          if (minOverlap === overlapTop && this.playerVelY >= 0) {
            // Landing on top of block
            this.playerY = bTop - pSize;
            this.playerVelY = 0;
            this.playerGrounded = true;
          } else if (minOverlap === overlapLeft) {
            // Hitting side — death
            this.die();
            return;
          } else {
            // Other collisions — death
            this.die();
            return;
          }
        }
      }
    }
  }

  private die(): void {
    if (!this.playerAlive) return;
    this.playerAlive = false;
    this.deathTimer = DEATH_FREEZE_TIME;

    // Death particles
    const colors = PARTICLE_COLORS;
    for (let i = 0; i < DEATH_PARTICLES; i++) {
      this.particles.emit(this.playerX, this.playerY + PLAYER_SIZE / 2, 1, {
        color: colors[i % colors.length],
        speed: 200 + Math.random() * 200,
        speedVar: 50,
        life: 0.6,
        lifeVar: 0.2,
        size: 4 + Math.random() * 4,
        sizeEnd: 0,
      });
    }
  }

  // ======================================================================
  // INPUT
  // ======================================================================

  private onPointerDown(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const sx = (e.clientX - rect.left) * dpr;
    const sy = (e.clientY - rect.top) * dpr;

    if (this.screen !== 'playing') {
      this.ui.handleClick(this.screen, sx, sy, this.canvas.width, this.canvas.height);
      return;
    }

    // Jump
    if (this.playerAlive) {
      this.jumpPressed = true;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();

      if (this.screen === 'menu') {
        this.ui.handleClick('menu', 0, 0, this.canvas.width, this.canvas.height);
        return;
      }

      if (this.screen === 'playing' && this.playerAlive && !this.jumpHeld) {
        this.jumpPressed = true;
        this.jumpHeld = true;
      }
    }

    if (e.key === 'Escape') {
      if (this.screen === 'dead' || this.screen === 'levelComplete') {
        this.screen = 'levelSelect';
      }
    }

    if (e.key === 'r' || e.key === 'R') {
      if (this.screen === 'playing' || this.screen === 'dead') {
        this.startLevel(this.currentLevel);
      }
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.jumpHeld = false;
    }
  }

  private onResize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.groundY = this.canvas.height - GROUND_Y_OFFSET;

    // Recalculate obstacle Y positions
    for (const obs of this.obstacles) {
      const def = this.getObstacleDimensions(obs.type as ObstacleType);
      obs.y = this.groundY - def.h;
    }
  }
}
