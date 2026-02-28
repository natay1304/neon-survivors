/**
 * ECS systems for Gravity Swoop.
 *
 * Execution order (registered in game.ts):
 *  1. gravitySystem      — attract bird toward active gravity point
 *  2. movementSystem     — integrate velocity into position
 *  3. collisionSystem    — bird vs obstacles / collectibles / goal / bounds
 *  4. deathSystem        — death animation, respawn timer
 *  5. trailSystem        — emit trail particles behind bird
 */

import { type World, type SpatialHash, type ParticleSystem, applyPointGravity, getTangentialRelease } from '@survivors/core';
import { C, type PosData, type VelData, type BirdData, type GravityPointData, type CollectibleData, type ColliderData } from './components';
import {
  BIRD_MAX_SPEED, BIRD_DRAG,
  DEATH_ANIMATION_TIME, DEATH_GRAVITY, FEATHER_COUNT_ON_DEATH,
  BIRD_RADIUS,
  FEATHER_COLORS,
} from './config';
import type { LevelData } from './config';

// ---- Game state passed into systems from the scene ----
export interface GameState {
  world: World;
  birdId: number;
  spatialHash: SpatialHash<number>;
  particles: ParticleSystem;
  levelData: LevelData;
  /** Set to true by collision system on level completion */
  levelComplete: boolean;
  /** Number of seeds collected this attempt */
  seedsCollected: number;
  /** Total seeds in level */
  totalSeeds: number;
  /** Elapsed time for this attempt */
  elapsedTime: number;
  /** Pointer state from scene */
  pointerDown: boolean;
  pointerX: number;
  pointerY: number;
  /** Gravity point entity id (or -1) */
  gravityPointId: number;
  /** Callback to restart level */
  onDeath: () => void;
  /** Callback on level complete */
  onComplete: () => void;
}

// =========================================================================
// 1. Gravity System
// =========================================================================

export function gravitySystem(state: GameState, dt: number): void {
  const { world, birdId } = state;
  if (!world.isAlive(birdId)) return;

  const bird = world.maybe<BirdData>(birdId, C.Bird);
  if (!bird || !bird.alive) return;

  const vel = world.get<VelData>(birdId, C.Vel);

  // Apply attraction if gravity point is active
  if (state.gravityPointId >= 0 && world.isAlive(state.gravityPointId)) {
    const pos = world.get<PosData>(birdId, C.Pos);
    const gpPos = world.get<PosData>(state.gravityPointId, C.Pos);
    const gp = world.get<GravityPointData>(state.gravityPointId, C.GravityPoint);

    const result = applyPointGravity(
      pos.x, pos.y,
      vel.x, vel.y,
      gpPos.x, gpPos.y,
      gp.strength,
      gp.minDist,
      dt,
    );
    vel.x = result.vx;
    vel.y = result.vy;

    // Increment visual age
    gp.age += dt;
  }

  // Apply drag
  vel.x *= BIRD_DRAG;
  vel.y *= BIRD_DRAG;

  // Clamp max speed
  const speedSq = vel.x * vel.x + vel.y * vel.y;
  if (speedSq > BIRD_MAX_SPEED * BIRD_MAX_SPEED) {
    const s = BIRD_MAX_SPEED / Math.sqrt(speedSq);
    vel.x *= s;
    vel.y *= s;
  }

  // Update bird rotation to match velocity direction
  if (speedSq > 1) {
    bird.rotation = Math.atan2(vel.y, vel.x);
  }
}

// =========================================================================
// 2. Movement System
// =========================================================================

export function movementSystem(state: GameState, dt: number): void {
  const { world } = state;

  for (const eid of world.query(C.Pos, C.Vel)) {
    const pos = world.get<PosData>(eid, C.Pos);
    const vel = world.get<VelData>(eid, C.Vel);

    pos.x += vel.x * dt;
    pos.y += vel.y * dt;

    // Guard against NaN
    if (!isFinite(pos.x)) pos.x = 0;
    if (!isFinite(pos.y)) pos.y = 0;
  }
}

// =========================================================================
// 3. Collision System
// =========================================================================

export function collisionSystem(state: GameState, _dt: number): void {
  const { world, birdId, spatialHash, levelData } = state;
  if (!world.isAlive(birdId)) return;

  const bird = world.maybe<BirdData>(birdId, C.Bird);
  if (!bird || !bird.alive) return;

  const birdPos = world.get<PosData>(birdId, C.Pos);

  // --- Rebuild spatial hash ---
  spatialHash.clear();
  for (const eid of world.query(C.Pos, C.Collider)) {
    if (eid === birdId) continue;
    const p = world.get<PosData>(eid, C.Pos);
    const col = world.get<ColliderData>(eid, C.Collider);
    const r = col.shape === 'circle' ? col.radius : Math.max(col.width, col.height) * 0.7;
    spatialHash.insert(eid, p.x, p.y, r);
  }

  // --- Query nearby entities ---
  const nearby = spatialHash.query(birdPos.x, birdPos.y, BIRD_RADIUS + 100);

  for (let i = 0; i < nearby.length; i++) {
    const eid = nearby[i];
    if (!world.isAlive(eid)) continue;

    const ePos = world.get<PosData>(eid, C.Pos);
    const eCol = world.get<ColliderData>(eid, C.Collider);

    // Check collision with bird
    if (!testCollision(birdPos.x, birdPos.y, BIRD_RADIUS, ePos, eCol)) continue;

    // --- Obstacle → death ---
    if (world.has(eid, C.Obstacle)) {
      killBird(state);
      return;
    }

    // --- Collectible → collect ---
    if (world.has(eid, C.Collectible)) {
      const col = world.get<CollectibleData>(eid, C.Collectible);
      if (!col.collected) {
        col.collected = true;
        state.seedsCollected++;
        // Sparkle particles
        state.particles.emit(ePos.x, ePos.y, 6, {
          color: '#ffcc00',
          speed: 80,
          speedVar: 40,
          life: 0.4,
          lifeVar: 0.1,
          size: 4,
          sizeEnd: 0,
        });
        world.destroy(eid);
      }
    }

    // --- Goal → level complete ---
    if (world.has(eid, C.Goal)) {
      state.levelComplete = true;
      state.onComplete();
      return;
    }
  }

  // --- Bounds check ---
  const pad = 80;
  if (
    birdPos.x < -pad || birdPos.x > levelData.width + pad ||
    birdPos.y < -pad || birdPos.y > levelData.height + pad
  ) {
    killBird(state);
  }
}

function testCollision(
  bx: number, by: number, br: number,
  ePos: PosData, eCol: ColliderData,
): boolean {
  if (eCol.shape === 'circle') {
    const dx = bx - ePos.x;
    const dy = by - ePos.y;
    const combinedR = br + eCol.radius;
    return dx * dx + dy * dy < combinedR * combinedR;
  }
  // Rect collision (AABB vs circle)
  const hw = eCol.width / 2;
  const hh = eCol.height / 2;
  const cx = Math.max(ePos.x - hw, Math.min(bx, ePos.x + hw));
  const cy = Math.max(ePos.y - hh, Math.min(by, ePos.y + hh));
  const dx = bx - cx;
  const dy = by - cy;
  return dx * dx + dy * dy < br * br;
}

function killBird(state: GameState): void {
  const { world, birdId } = state;
  const bird = world.maybe<BirdData>(birdId, C.Bird);
  if (!bird || !bird.alive) return;

  bird.alive = false;
  bird.deathTimer = DEATH_ANIMATION_TIME;
  bird.angularVel = (Math.random() - 0.5) * 20;
  bird.feathersSpawned = false;

  // Destroy gravity point if active
  if (state.gravityPointId >= 0 && world.isAlive(state.gravityPointId)) {
    world.destroy(state.gravityPointId);
    state.gravityPointId = -1;
  }
}

// =========================================================================
// 4. Death System
// =========================================================================

export function deathSystem(state: GameState, dt: number): void {
  const { world, birdId, particles } = state;
  if (!world.isAlive(birdId)) return;

  const bird = world.maybe<BirdData>(birdId, C.Bird);
  if (!bird || bird.alive) return;

  const pos = world.get<PosData>(birdId, C.Pos);
  const vel = world.get<VelData>(birdId, C.Vel);

  // Spawn feather burst once
  if (!bird.feathersSpawned) {
    bird.feathersSpawned = true;
    for (let i = 0; i < FEATHER_COUNT_ON_DEATH; i++) {
      const color = FEATHER_COLORS[i % FEATHER_COLORS.length];
      particles.emit(pos.x, pos.y, 1, {
        color,
        speed: 100 + Math.random() * 150,
        life: 0.6 + Math.random() * 0.4,
        size: 3 + Math.random() * 3,
        sizeEnd: 0,
        angle: Math.random() * Math.PI * 2,
        spread: Math.PI * 2,
      });
    }
  }

  // Death physics: spin + gravity
  bird.rotation += bird.angularVel * dt;
  vel.x *= 0.95;
  vel.y += DEATH_GRAVITY * dt;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;

  bird.deathTimer -= dt;
  if (bird.deathTimer <= 0) {
    state.onDeath();
  }
}

// =========================================================================
// 5. Trail System
// =========================================================================

export function trailSystem(state: GameState, _dt: number): void {
  const { world, birdId, particles } = state;
  if (!world.isAlive(birdId)) return;

  const bird = world.maybe<BirdData>(birdId, C.Bird);
  if (!bird || !bird.alive) return;

  const pos = world.get<PosData>(birdId, C.Pos);
  const vel = world.get<VelData>(birdId, C.Vel);
  const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);

  if (speed < 20) return;

  // Emit trail particles proportional to speed
  const count = speed > 200 ? 2 : 1;
  particles.emit(pos.x, pos.y, count, {
    color: '#44dd55',
    speed: 10,
    speedVar: 5,
    life: 0.25,
    lifeVar: 0.1,
    size: 3,
    sizeEnd: 0,
    angle: Math.atan2(-vel.y, -vel.x),
    spread: 0.5,
  });
}

// =========================================================================
// Slingshot Release Helper (called from scene on pointer up)
// =========================================================================

export function applySlingshot(state: GameState): void {
  const { world, birdId, gravityPointId } = state;
  if (gravityPointId < 0 || !world.isAlive(gravityPointId)) return;
  if (!world.isAlive(birdId)) return;

  const bird = world.maybe<BirdData>(birdId, C.Bird);
  if (!bird || !bird.alive) return;

  const birdPos = world.get<PosData>(birdId, C.Pos);
  const birdVel = world.get<VelData>(birdId, C.Vel);
  const gpPos = world.get<PosData>(gravityPointId, C.Pos);

  const result = getTangentialRelease(
    birdPos.x, birdPos.y,
    birdVel.x, birdVel.y,
    gpPos.x, gpPos.y,
  );

  birdVel.x = result.vx;
  birdVel.y = result.vy;

  // Speed boost on release (slingshot effect)
  const speed = Math.sqrt(result.vx * result.vx + result.vy * result.vy);
  if (speed > 10) {
    const boost = 1.15;
    birdVel.x *= boost;
    birdVel.y *= boost;
  }

  // Destroy gravity point
  world.destroy(gravityPointId);
  state.gravityPointId = -1;
}
