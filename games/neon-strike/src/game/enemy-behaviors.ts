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

// Player target from blackboard
export const playerTarget: TargetFn = (ctx: BTContext) => {
  if (!ctx.blackboard.has('__playerX')) return null;
  return {
    x: ctx.blackboard.get<number>('__playerX', 0),
    y: ctx.blackboard.get<number>('__playerY', 0),
  };
};

// HP below fraction predicate
function hpBelow(fraction: number): (ctx: BTContext) => boolean {
  return (ctx: BTContext) => {
    const hp = ctx.world.maybe<{ current: number; max: number }>(ctx.entity, 'hp');
    if (!hp) return false;
    return hp.current / hp.max < fraction;
  };
}

// Grunt — simple direct chase
export const gruntTree: BehaviorNode = seek(playerTarget);

// Runner — fast direct chase
export const runnerTree: BehaviorNode = seek(playerTarget);

// Shooter — orbit at range, keeps distance
export const shooterTree: BehaviorNode = selector(
  sequence(
    checkDistance(playerTarget, '<', 150),
    flee(playerTarget),
  ),
  sequence(
    checkDistance(playerTarget, '<', 350),
    orbit(playerTarget, 250, 1.5),
  ),
  seek(playerTarget),
);

// Tank — slow relentless chase
export const tankTree: BehaviorNode = seek(playerTarget);

// Flanker — orbit then dash through
export const flankerTree: BehaviorNode = selector(
  sequence(
    checkDistance(playerTarget, '<', 150),
    cooldown('dash', 2.5, dash(3.0, 0.35)),
  ),
  sequence(
    checkDistance(playerTarget, '<', 400),
    orbit(playerTarget, 200, 2.0),
  ),
  seek(playerTarget),
);

// Boss — phase-based
export const bossTree: BehaviorNode = selector(
  // Phase 2: enraged (< 50% HP) — aggressive seek + frequent charges
  sequence(
    guard(hpBelow(0.5), seek(playerTarget)),
    cooldown('charge', 2.0, sequence(
      wait(0.3, 'telegraph'),
      dash(3.5, 0.5, 'charge'),
      wait(0.4, 'recovery'),
    )),
  ),
  // Phase 1: measured — approach + periodic charges
  selector(
    sequence(
      checkDistance(playerTarget, '<', 300),
      cooldown('charge', 3.5, sequence(
        wait(0.5, 'telegraph'),
        dash(3.0, 0.5, 'charge'),
        wait(0.8, 'recovery'),
      )),
    ),
    seek(playerTarget),
  ),
);

// Simple fallback for LOD
export const simpleLODTree: BehaviorNode = seek(playerTarget);

// Sniper — stay far, shoot from distance
export const sniperTree: BehaviorNode = selector(
  sequence(
    checkDistance(playerTarget, '<', 200),
    flee(playerTarget),
  ),
  sequence(
    checkDistance(playerTarget, '<', 500),
    orbit(playerTarget, 350, 1.0),
  ),
  seek(playerTarget),
);

// Swarm — direct fast rush
export const swarmTree: BehaviorNode = seek(playerTarget);

// Exploder — rush toward player
export const exploderTree: BehaviorNode = seek(playerTarget);

// Healer — orbit at distance, stays away
export const healerTree: BehaviorNode = selector(
  sequence(
    checkDistance(playerTarget, '<', 180),
    flee(playerTarget),
  ),
  sequence(
    checkDistance(playerTarget, '<', 400),
    orbit(playerTarget, 280, 1.2),
  ),
  seek(playerTarget),
);

// Registry
export const ENEMY_TREES: Record<string, BehaviorNode> = {
  grunt: gruntTree,
  runner: runnerTree,
  shooter: shooterTree,
  tank: tankTree,
  flanker: flankerTree,
  boss: bossTree,
  sniper: sniperTree,
  swarm: swarmTree,
  exploder: exploderTree,
  healer: healerTree,
};
