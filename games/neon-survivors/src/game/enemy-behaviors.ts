/** Per-enemy-type behavior trees */

import {
  type BehaviorNode,
  type BTContext,
  type TargetFn,
  selector,
  sequence,
  seek,
  flee,
  orbit,
  dash,
  wait,
  cooldown,
  checkDistance,
  guard,
} from '@survivors/core';

// ─── Shared target helper ─────────────────────────────────────────────
/**
 * Creates a TargetFn that returns the player position.
 * Reads the cached `__playerX` / `__playerY` from the blackboard
 * (set each tick by the BT runner system).
 */
export const playerTarget: TargetFn = (ctx: BTContext) => {
  if (!ctx.blackboard.has('__playerX')) return null;
  return {
    x: ctx.blackboard.get<number>('__playerX', 0),
    y: ctx.blackboard.get<number>('__playerY', 0),
  };
};

// ─── Condition helpers ────────────────────────────────────────────────

/** Guard predicate: entity HP below a fraction of max. */
function hpBelow(fraction: number): (ctx: BTContext) => boolean {
  return (ctx: BTContext) => {
    const hp = ctx.world.maybe<{ current: number; max: number }>(ctx.entity, 'hp');
    if (!hp) return false;
    return hp.current / hp.max < fraction;
  };
}

// ─── Zombie — Direct chase ────────────────────────────────────────────
export const zombieTree: BehaviorNode = seek(playerTarget);

// ─── Bat — Erratic darting ────────────────────────────────────────────
// Circles the player at medium range. When close, dashes through.
export const batTree: BehaviorNode = selector(
  sequence(
    checkDistance(playerTarget, '<', 120),
    cooldown('dash', 2.0, dash(3.0, 0.3)),
  ),
  orbit(playerTarget, 180, 2.5),
);

// ─── Skeleton — Stop-and-lunge ────────────────────────────────────────
// Approaches, pauses to telegraph an attack, then lunges.
export const skeletonTree: BehaviorNode = selector(
  sequence(
    checkDistance(playerTarget, '<', 200),
    wait(0.6, 'windup'),
    dash(2.5, 0.4, 'lunge'),
    wait(0.3, 'recovery'),
  ),
  seek(playerTarget),
);

// ─── Ghost — Flanking/evasive ─────────────────────────────────────────
// Orbits at medium range. When too close, flees briefly.
// Periodically reverses orbit direction for unpredictability.
export const ghostTree: BehaviorNode = selector(
  sequence(
    checkDistance(playerTarget, '<', 80),
    flee(playerTarget),
    wait(0.5, 'phase'),
  ),
  sequence(
    checkDistance(playerTarget, '<', 350),
    orbit(playerTarget, 200, -1.8),
  ),
  seek(playerTarget),
);

// ─── Demon — Bull charge ──────────────────────────────────────────────
// At medium range, telegraphs then charges with high speed.
// Recovery period after charge is exploitable.
export const demonTree: BehaviorNode = selector(
  sequence(
    checkDistance(playerTarget, '<', 350),
    checkDistance(playerTarget, '>', 100),
    cooldown('charge', 3.5, sequence(
      wait(0.4, 'telegraph'),
      dash(3.5, 0.6, 'charge'),
      wait(0.8, 'exhaust'),
    )),
  ),
  seek(playerTarget),
);

// ─── Miniboss — Aggressive orbiter ───────────────────────────────────
// Orbits wider, charges more frequently than demon.
export const minibossTree: BehaviorNode = selector(
  sequence(
    checkDistance(playerTarget, '<', 300),
    cooldown('charge', 2.5, sequence(
      wait(0.3, 'telegraph'),
      dash(3.0, 0.5, 'charge'),
      wait(0.5, 'recovery'),
    )),
  ),
  sequence(
    checkDistance(playerTarget, '<', 500),
    orbit(playerTarget, 250, 1.2),
  ),
  seek(playerTarget),
);

// ─── Boss — Phase-based ──────────────────────────────────────────────
// Phase 2 (< 50% HP): aggressive with faster charges.
// Phase 1 (>= 50% HP): measured approach with periodic charges.
export const bossTree: BehaviorNode = selector(
  // Phase 2: enraged
  sequence(
    guard(hpBelow(0.5), seek(playerTarget)), // guard as first node
    cooldown('charge', 2.0, sequence(
      wait(0.3, 'telegraph'),
      dash(4.0, 0.5, 'charge'),
      wait(0.4, 'recovery'),
    )),
  ),
  // Phase 1: measured
  selector(
    sequence(
      checkDistance(playerTarget, '<', 250),
      cooldown('charge', 4.0, sequence(
        wait(0.5, 'telegraph'),
        dash(3.0, 0.5, 'charge'),
        wait(1.0, 'recovery'),
      )),
    ),
    seek(playerTarget),
  ),
);

// ─── LOD fallback — Simple seek for distant enemies ─────────────────
/** Simplified seek-only tree used by the LOD system at distance. */
export const simpleLODTree: BehaviorNode = seek(playerTarget);

// ─── Tree registry ───────────────────────────────────────────────────
/** Maps enemy type string to its behavior tree. */
export const ENEMY_TREES: Record<string, BehaviorNode> = {
  zombie:   zombieTree,
  bat:      batTree,
  skeleton: skeletonTree,
  ghost:    ghostTree,
  demon:    demonTree,
  miniboss: minibossTree,
  boss:     bossTree,
};
