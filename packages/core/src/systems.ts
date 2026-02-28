/**
 * Common ECS systems — reusable system factories for standard mechanics.
 *
 * These cover the most common patterns across all games:
 *  - Movement (Pos+Vel integration)
 *  - Lifetime (auto-destroy after timer)
 *  - Invulnerability ticking
 */

import type { World } from './ecs';

// ── Minimal component contracts ──────────────────────────────────────

interface PosLike { x: number; y: number }
interface VelLike { x: number; y: number }
interface LifetimeLike { lifetime: number }

// ── Movement System ──────────────────────────────────────────────────

/**
 * Create a movement system that integrates velocity into position.
 *
 * Includes NaN/Infinity guards that zero out corrupt velocities
 * and destroy non-player entities that escape to non-finite positions.
 *
 * @param posKey — component key for position (default: 'pos')
 * @param velKey — component key for velocity (default: 'vel')
 * @param playerKey — component key for player tag (entities with this
 *                    are reset instead of destroyed on position corruption)
 */
export function createMovementSystem(
  posKey = 'pos',
  velKey = 'vel',
  playerKey?: string,
) {
  return (world: World, dt: number) => {
    for (const e of world.query(posKey, velKey)) {
      const pos = world.get<PosLike>(e, posKey);
      const vel = world.get<VelLike>(e, velKey);

      // Guard: zero out non-finite velocities
      if (!isFinite(vel.x)) vel.x = 0;
      if (!isFinite(vel.y)) vel.y = 0;

      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      // Guard: handle entities that escaped to non-finite positions
      if (!isFinite(pos.x) || !isFinite(pos.y)) {
        pos.x = 0;
        pos.y = 0;
        vel.x = 0;
        vel.y = 0;
        if (playerKey && world.has(e, playerKey)) continue;
        world.destroy(e);
      }
    }
  };
}

// ── Lifetime System ──────────────────────────────────────────────────

/**
 * Create a system that ticks down a lifetime timer and destroys entities
 * when it reaches zero. Useful for projectiles, particles, timed effects.
 *
 * @param lifetimeKey — component key that holds `{ lifetime: number }`
 */
export function createLifetimeSystem(lifetimeKey: string) {
  return (world: World, dt: number) => {
    for (const e of world.query(lifetimeKey)) {
      const data = world.get<LifetimeLike>(e, lifetimeKey);
      data.lifetime -= dt;
      if (data.lifetime <= 0) {
        world.destroy(e);
      }
    }
  };
}

// ── Separation (flocking) ────────────────────────────────────────────

/**
 * Compute a separation vector from nearby entities of the same type.
 *
 * Returns the unnormalized separation direction and the count of
 * nearby entities that contributed. Useful for enemy flocking/separation.
 *
 * @param positions — array of { x, y } positions of nearby same-type entities
 * @param selfX — this entity's X position
 * @param selfY — this entity's Y position
 * @param radius — separation radius (default: 28)
 * @returns { sx, sy, count } — separation vector and neighbor count
 */
export function computeSeparation(
  positions: ReadonlyArray<Readonly<{ x: number; y: number }>>,
  selfX: number,
  selfY: number,
  radius = 28,
): { sx: number; sy: number; count: number } {
  let sx = 0;
  let sy = 0;
  let count = 0;
  const radiusSq = radius * radius;

  for (let i = 0; i < positions.length; i++) {
    const other = positions[i];
    const dx = selfX - other.x;
    const dy = selfY - other.y;
    const dSq = dx * dx + dy * dy;
    if (dSq > 0 && dSq < radiusSq) {
      const dist = Math.sqrt(dSq);
      sx += dx / dist;
      sy += dy / dist;
      count++;
    }
  }

  return { sx, sy, count };
}
