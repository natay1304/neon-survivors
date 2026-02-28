/** Per-enemy-type behavior trees */

import {
  type BehaviorNode,
  type BehaviorStatus,
  type BTContext,
  type TargetFn,
  selector,
  sequence,
  seek,
  flee,
  orbit,
  dash,
  wait,
  checkDistance,
  guard,
  zigzagSeek,
  strafeSeek,
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

// ─── Aggression-aware cooldown ────────────────────────────────────────
/**
 * Cooldown whose interval shrinks with rising `__aggression` (set by BT system).
 * At aggression=1 the interval equals baseSec; at aggression=2 it is halved, etc.
 */
function aggroCooldown(key: string, baseSec: number, node: BehaviorNode): BehaviorNode {
  const bbKey = `__acd_${key}`;
  return (ctx: BTContext): BehaviorStatus => {
    const last = ctx.blackboard.get<number>(bbKey, -Infinity);
    const now = ctx.blackboard.get<number>('__time', 0);
    const aggro = ctx.blackboard.get<number>('__aggression', 1);
    const seconds = baseSec / Math.max(1, aggro);
    if (now - last < seconds) return 'failure';
    ctx.blackboard.set(bbKey, now);
    return node(ctx);
  };
}

// ─── Shoot action (sets blackboard flag for system to spawn projectile) ──
function shoot(): BehaviorNode {
  return (ctx: BTContext): BehaviorStatus => {
    const target = playerTarget(ctx);
    if (!target) return 'failure';
    const pos = ctx.world.get<{ x: number; y: number }>(ctx.entity, 'pos');
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return 'failure';
    ctx.blackboard.set('__shoot', true);
    ctx.blackboard.set('__shootDirX', dx / len);
    ctx.blackboard.set('__shootDirY', dy / len);
    return 'success';
  };
}

// ─── Zombie — Shambling zigzag ────────────────────────────────────────
// Weaves drunkenly as it advances. Relentless, inevitable approach.
// Amplitude/frequency give a memorable shambling cadence.
export const zombieTree: BehaviorNode = zigzagSeek(playerTarget, 0.6, 3.5);

// ─── Bat — Erratic swooping ──────────────────────────────────────────
// Fast figure-8 orbits at close range with sudden dive-bomb attacks.
// Rapidly reverses orbit direction for chaotic, moth-like flight.
export const batTree: BehaviorNode = selector(
  // Close: dive-bomb through the player
  sequence(
    checkDistance(playerTarget, '<', 100),
    aggroCooldown('bat_dive', 1.8, dash(4.5, 0.2)),
  ),
  // Medium range: erratic orbit — flips direction based on time
  sequence(
    checkDistance(playerTarget, '<', 300),
    selector(
      sequence(
        guard(
          (ctx) => Math.sin(ctx.blackboard.get<number>('__time', 0) * 3) > 0,
          orbit(playerTarget, 130, 4.5),
        ),
      ),
      orbit(playerTarget, 130, -4.5),
    ),
  ),
  // Far: fast zigzag approach with high frequency
  zigzagSeek(playerTarget, 0.8, 7.0),
);

// ─── Skeleton — Methodical lunge warrior ──────────────────────────────
// Strafes forward in a measured arc, pauses to "ready weapon", lunges,
// then backsteps briefly. Very rhythmic and telegraphed but deadly.
export const skeletonTree: BehaviorNode = selector(
  // Close range: telegraph → lunge → backstep → recover
  sequence(
    checkDistance(playerTarget, '<', 180),
    aggroCooldown('skel_lunge', 2.5, sequence(
      wait(0.5, 'skel_ready'),
      dash(3.5, 0.35, 'skel_lunge'),
      flee(playerTarget),
      wait(0.4, 'skel_recover'),
    )),
  ),
  // Medium range: circle-strafe toward player
  sequence(
    checkDistance(playerTarget, '<', 400),
    strafeSeek(playerTarget, 0.5, true),
  ),
  // Far: direct approach
  seek(playerTarget),
);

// ─── Ghost — Phase-shifting specter ───────────────────────────────────
// Drifts with a sinusoidal float. Periodically "phases" — ultra-fast
// burst toward the player followed by an eerie hover. Ghostly retreat
// if player corners it.
export const ghostTree: BehaviorNode = selector(
  // Phase attack: shimmer → burst → hover
  sequence(
    checkDistance(playerTarget, '<', 300),
    aggroCooldown('ghost_phase', 3.0, sequence(
      wait(0.2, 'ghost_shimmer'),
      dash(5.0, 0.15, 'ghost_phase'),
      wait(0.8, 'ghost_hover'),
    )),
  ),
  // Flee if cornered, with a quick dash backwards
  sequence(
    checkDistance(playerTarget, '<', 60),
    dash(3.0, 0.2, 'ghost_flee_dash'),
    flee(playerTarget),
    wait(0.3, 'ghost_fade'),
  ),
  // Medium range: sinusoidal floating orbit
  sequence(
    checkDistance(playerTarget, '<', 400),
    orbit(playerTarget, 200, -1.5),
  ),
  // Far: ghostly zigzag drift (slow weave)
  zigzagSeek(playerTarget, 0.4, 2.0),
);

// ─── Demon — Berserker charger ────────────────────────────────────────
// Slowly stalks the player with a menacing strafe. Long, dramatic
// telegraph before a devastating high-speed charge. Long recovery
// after the charge creates a punishable window.
export const demonTree: BehaviorNode = selector(
  // Charge attack: roar → massive charge → stagger
  sequence(
    checkDistance(playerTarget, '<', 350),
    checkDistance(playerTarget, '>', 80),
    aggroCooldown('demon_charge', 4.0, sequence(
      wait(0.7, 'demon_roar'),
      dash(5.0, 0.5, 'demon_charge'),
      wait(1.0, 'demon_stagger'),
    )),
  ),
  // Stalking approach: slow menacing strafe
  sequence(
    checkDistance(playerTarget, '<', 500),
    strafeSeek(playerTarget, 0.3, false),
  ),
  // Far: direct approach
  seek(playerTarget),
);

// ─── Warlock — Ranged caster ──────────────────────────────────────────
// Maintains distance, orbits the player while launching projectiles.
// Blinks away if the player gets too close. Rare but dangerous.
export const warlockTree: BehaviorNode = selector(
  // Too close: blink away (fast backwards dash)
  sequence(
    checkDistance(playerTarget, '<', 150),
    aggroCooldown('warlock_blink', 3.0, sequence(
      dash(4.0, 0.2, 'warlock_blink'),
    )),
    flee(playerTarget),
  ),
  // Optimal range: orbit and shoot periodically
  sequence(
    checkDistance(playerTarget, '<', 450),
    checkDistance(playerTarget, '>', 150),
    selector(
      // Fire projectile
      aggroCooldown('warlock_shot', 2.0, sequence(
        wait(0.3, 'warlock_cast'),
        shoot(),
      )),
      // Orbit while shot is on cooldown
      orbit(playerTarget, 300, 1.0),
    ),
  ),
  // Too far: close distance
  seek(playerTarget),
);

// ─── Miniboss — Aggressive orbiting charger ───────────────────────────
export const minibossTree: BehaviorNode = selector(
  sequence(
    checkDistance(playerTarget, '<', 300),
    aggroCooldown('mb_charge', 2.5, sequence(
      wait(0.3, 'mb_telegraph'),
      dash(3.5, 0.5, 'mb_charge'),
      wait(0.5, 'mb_recovery'),
    )),
  ),
  sequence(
    checkDistance(playerTarget, '<', 500),
    orbit(playerTarget, 220, 1.5),
  ),
  seek(playerTarget),
);

// ─── Boss — Phase-based ──────────────────────────────────────────────
// Phase 2 (< 50% HP): enraged — faster charges, tighter orbit.
// Phase 1 (>= 50% HP): measured approach with periodic charges.
export const bossTree: BehaviorNode = selector(
  // Phase 2: enraged
  sequence(
    guard(hpBelow(0.5), seek(playerTarget)),
    aggroCooldown('boss_charge2', 1.5, sequence(
      wait(0.2, 'boss_telegraph2'),
      dash(5.0, 0.5, 'boss_charge2'),
      wait(0.3, 'boss_recovery2'),
    )),
  ),
  // Phase 1: measured
  selector(
    sequence(
      checkDistance(playerTarget, '<', 250),
      aggroCooldown('boss_charge', 3.5, sequence(
        wait(0.5, 'boss_telegraph'),
        dash(3.5, 0.5, 'boss_charge'),
        wait(0.8, 'boss_recovery'),
      )),
    ),
    sequence(
      checkDistance(playerTarget, '<', 500),
      orbit(playerTarget, 280, 0.8),
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
  warlock:  warlockTree,
  miniboss: minibossTree,
  boss:     bossTree,
};
