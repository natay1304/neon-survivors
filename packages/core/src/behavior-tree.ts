/** Behavior Tree framework for ECS-driven AI */

import { World } from './ecs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BehaviorStatus = 'success' | 'failure' | 'running';

/** Function that resolves a target position from the BT context. */
export type TargetFn = (ctx: BTContext) => { x: number; y: number } | null;

/** Context passed to every behavior node on each tick. */
export interface BTContext {
  entity: number;
  world: World;
  dt: number;
  blackboard: Blackboard;
}

/** A single node in the behavior tree. */
export type BehaviorNode = (ctx: BTContext) => BehaviorStatus;

// ---------------------------------------------------------------------------
// Blackboard
// ---------------------------------------------------------------------------

/** Per-entity key-value store for BT runtime state (timers, targets, etc.). */
export class Blackboard {
  private data = new Map<string, unknown>();

  get<T>(key: string, fallback?: T): T {
    return (this.data.get(key) as T) ?? fallback!;
  }

  set(key: string, value: unknown): void {
    this.data.set(key, value);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Module-level counter for generating unique composite node keys. */
let _nodeId = 0;

/** Read entity speed, defaulting to 100 if no enemy component exists. */
function getSpeed(ctx: BTContext): number {
  const enemy = ctx.world.maybe<{ speed: number }>(ctx.entity, 'enemy');
  return enemy?.speed ?? 100;
}

/** Read entity position. */
function getPos(ctx: BTContext): { x: number; y: number } {
  return ctx.world.get<{ x: number; y: number }>(ctx.entity, 'pos');
}

// ---------------------------------------------------------------------------
// Composites
// ---------------------------------------------------------------------------

/**
 * Runs children in order. Fails immediately on the first child that fails.
 * Supports `running` — stores the current child index on the blackboard so
 * execution resumes from the same child next tick.
 */
export function sequence(...nodes: BehaviorNode[]): BehaviorNode {
  const key = `__seq_${_nodeId++}`;
  return (ctx: BTContext): BehaviorStatus => {
    let start = ctx.blackboard.get<number>(key, 0);
    for (let i = start; i < nodes.length; i++) {
      const status = nodes[i](ctx);
      if (status === 'failure') {
        ctx.blackboard.delete(key);
        return 'failure';
      }
      if (status === 'running') {
        ctx.blackboard.set(key, i);
        return 'running';
      }
    }
    ctx.blackboard.delete(key);
    return 'success';
  };
}

/**
 * Tries children in order. Succeeds immediately on the first child that
 * succeeds. Supports `running` — stores the current child index on the
 * blackboard so execution resumes from the same child next tick.
 */
export function selector(...nodes: BehaviorNode[]): BehaviorNode {
  const key = `__sel_${_nodeId++}`;
  return (ctx: BTContext): BehaviorStatus => {
    let start = ctx.blackboard.get<number>(key, 0);
    for (let i = start; i < nodes.length; i++) {
      const status = nodes[i](ctx);
      if (status === 'success') {
        ctx.blackboard.delete(key);
        return 'success';
      }
      if (status === 'running') {
        ctx.blackboard.set(key, i);
        return 'running';
      }
    }
    ctx.blackboard.delete(key);
    return 'failure';
  };
}

// ---------------------------------------------------------------------------
// Decorators
// ---------------------------------------------------------------------------

/** Inverts the child result: success <-> failure. Running passes through. */
export function invert(node: BehaviorNode): BehaviorNode {
  return (ctx: BTContext): BehaviorStatus => {
    const s = node(ctx);
    if (s === 'success') return 'failure';
    if (s === 'failure') return 'success';
    return 'running';
  };
}

/** Runs the child but always returns success (unless running). */
export function alwaysSucceed(node: BehaviorNode): BehaviorNode {
  return (ctx: BTContext): BehaviorStatus => {
    const s = node(ctx);
    return s === 'running' ? 'running' : 'success';
  };
}

/** Repeats the child until it returns failure, then returns success. */
export function repeatUntilFail(node: BehaviorNode): BehaviorNode {
  return (ctx: BTContext): BehaviorStatus => {
    const s = node(ctx);
    if (s === 'failure') return 'success';
    return 'running';
  };
}

/**
 * Rate-limiter: only executes the child if at least `seconds` have elapsed
 * since the last execution. Uses the blackboard to store the timestamp.
 */
export function cooldown(
  key: string,
  seconds: number,
  node: BehaviorNode,
): BehaviorNode {
  const bbKey = `__cd_${key}`;
  return (ctx: BTContext): BehaviorStatus => {
    const last = ctx.blackboard.get<number>(bbKey, -Infinity);
    const now = ctx.blackboard.get<number>('__time', 0);
    if (now - last < seconds) return 'failure';
    ctx.blackboard.set(bbKey, now);
    return node(ctx);
  };
}

/** Condition gate: runs child only if the predicate returns true. */
export function guard(
  predicate: (ctx: BTContext) => boolean,
  node: BehaviorNode,
): BehaviorNode {
  return (ctx: BTContext): BehaviorStatus => {
    return predicate(ctx) ? node(ctx) : 'failure';
  };
}

// ---------------------------------------------------------------------------
// Conditions (leaf nodes)
// ---------------------------------------------------------------------------

/**
 * Checks the distance from the entity position to a target.
 * Returns success if the comparison holds, failure otherwise.
 */
export function checkDistance(
  getTarget: TargetFn,
  op: '<' | '>' | '<=' | '>=',
  dist: number,
): BehaviorNode {
  return (ctx: BTContext): BehaviorStatus => {
    const target = getTarget(ctx);
    if (!target) return 'failure';
    const pos = getPos(ctx);
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    let result = false;
    switch (op) {
      case '<':  result = d < dist;  break;
      case '>':  result = d > dist;  break;
      case '<=': result = d <= dist; break;
      case '>=': result = d >= dist; break;
    }
    return result ? 'success' : 'failure';
  };
}

/** Returns success with the given probability (0-1), failure otherwise. */
export function randomChance(probability: number): BehaviorNode {
  return (): BehaviorStatus => {
    return Math.random() < probability ? 'success' : 'failure';
  };
}

/** Returns success if the blackboard contains the given key. */
export function hasBlackboard(key: string): BehaviorNode {
  return (ctx: BTContext): BehaviorStatus => {
    return ctx.blackboard.has(key) ? 'success' : 'failure';
  };
}

// ---------------------------------------------------------------------------
// Actions (leaf nodes — write velocity intent to blackboard)
// ---------------------------------------------------------------------------

/** Move toward the target at entity speed. Always returns success. */
export function seek(getTarget: TargetFn): BehaviorNode {
  return (ctx: BTContext): BehaviorStatus => {
    const target = getTarget(ctx);
    if (!target) {
      ctx.blackboard.set('__vx', 0);
      ctx.blackboard.set('__vy', 0);
      return 'success';
    }
    const pos = getPos(ctx);
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) {
      ctx.blackboard.set('__vx', 0);
      ctx.blackboard.set('__vy', 0);
      return 'success';
    }
    const speed = getSpeed(ctx);
    ctx.blackboard.set('__vx', (dx / len) * speed);
    ctx.blackboard.set('__vy', (dy / len) * speed);
    return 'success';
  };
}

/** Move away from the target at entity speed. Always returns success. */
export function flee(getTarget: TargetFn): BehaviorNode {
  return (ctx: BTContext): BehaviorStatus => {
    const target = getTarget(ctx);
    if (!target) {
      ctx.blackboard.set('__vx', 0);
      ctx.blackboard.set('__vy', 0);
      return 'success';
    }
    const pos = getPos(ctx);
    const dx = pos.x - target.x;
    const dy = pos.y - target.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) {
      ctx.blackboard.set('__vx', 0);
      ctx.blackboard.set('__vy', 0);
      return 'success';
    }
    const speed = getSpeed(ctx);
    ctx.blackboard.set('__vx', (dx / len) * speed);
    ctx.blackboard.set('__vy', (dy / len) * speed);
    return 'success';
  };
}

/**
 * Circle around a target at the given radius and angular speed (rad/s).
 * Stores the current angle on the blackboard. Always returns running.
 */
export function orbit(
  getTarget: TargetFn,
  radius: number,
  angularSpeed: number,
): BehaviorNode {
  const angleKey = `__orbit_angle_${_nodeId++}`;
  return (ctx: BTContext): BehaviorStatus => {
    const target = getTarget(ctx);
    if (!target) {
      ctx.blackboard.set('__vx', 0);
      ctx.blackboard.set('__vy', 0);
      return 'running';
    }
    let angle = ctx.blackboard.get<number>(angleKey, 0);
    // Initialise angle from current position relative to target if first tick
    if (!ctx.blackboard.has(angleKey)) {
      const pos = getPos(ctx);
      angle = Math.atan2(pos.y - target.y, pos.x - target.x);
    }
    angle += angularSpeed * ctx.dt;
    ctx.blackboard.set(angleKey, angle);

    // Desired position on the orbit circle
    const desiredX = target.x + Math.cos(angle) * radius;
    const desiredY = target.y + Math.sin(angle) * radius;

    const pos = getPos(ctx);
    const dx = desiredX - pos.x;
    const dy = desiredY - pos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const speed = getSpeed(ctx);
    if (len > 0) {
      ctx.blackboard.set('__vx', (dx / len) * speed);
      ctx.blackboard.set('__vy', (dy / len) * speed);
    } else {
      ctx.blackboard.set('__vx', 0);
      ctx.blackboard.set('__vy', 0);
    }
    return 'running';
  };
}

/**
 * Random drift. Picks a random direction, moves for 1-2 seconds, then picks
 * a new direction. Uses `speed` as the wander speed (px/s). Always returns running.
 */
export function wander(speed: number): BehaviorNode {
  const dirKey = `__wander_dir_${_nodeId}`;
  const timerKey = `__wander_timer_${_nodeId++}`;
  return (ctx: BTContext): BehaviorStatus => {
    let timer = ctx.blackboard.get<number>(timerKey, 0);
    timer -= ctx.dt;

    if (timer <= 0) {
      // Pick a new random direction and reset timer
      const angle = Math.random() * Math.PI * 2;
      ctx.blackboard.set(dirKey, angle);
      timer = 1 + Math.random(); // 1-2 seconds
    }
    ctx.blackboard.set(timerKey, timer);

    const angle = ctx.blackboard.get<number>(dirKey, 0);
    ctx.blackboard.set('__vx', Math.cos(angle) * speed);
    ctx.blackboard.set('__vy', Math.sin(angle) * speed);
    return 'running';
  };
}

/**
 * Speed burst: multiplies entity speed by `speedMult` for `duration` seconds.
 * Maintains the direction stored at dash start. Returns running while active,
 * success when finished.
 */
export function dash(
  speedMult: number,
  duration: number,
  key?: string,
): BehaviorNode {
  const id = key ?? `__dash_${_nodeId++}`;
  const timerKey = `${id}_timer`;
  const dxKey = `${id}_dx`;
  const dyKey = `${id}_dy`;
  return (ctx: BTContext): BehaviorStatus => {
    let timer = ctx.blackboard.get<number>(timerKey, -1);

    // First tick — capture current direction and init timer
    if (timer < 0) {
      const vx = ctx.blackboard.get<number>('__vx', 0);
      const vy = ctx.blackboard.get<number>('__vy', 0);
      const len = Math.sqrt(vx * vx + vy * vy);
      if (len > 0) {
        ctx.blackboard.set(dxKey, vx / len);
        ctx.blackboard.set(dyKey, vy / len);
      } else {
        // No current direction — pick a random one
        const angle = Math.random() * Math.PI * 2;
        ctx.blackboard.set(dxKey, Math.cos(angle));
        ctx.blackboard.set(dyKey, Math.sin(angle));
      }
      timer = duration;
    }

    timer -= ctx.dt;
    if (timer <= 0) {
      // Dash finished — clean up
      ctx.blackboard.delete(timerKey);
      ctx.blackboard.delete(dxKey);
      ctx.blackboard.delete(dyKey);
      return 'success';
    }

    ctx.blackboard.set(timerKey, timer);
    const dx = ctx.blackboard.get<number>(dxKey, 1);
    const dy = ctx.blackboard.get<number>(dyKey, 0);
    const speed = getSpeed(ctx) * speedMult;
    ctx.blackboard.set('__vx', dx * speed);
    ctx.blackboard.set('__vy', dy * speed);
    return 'running';
  };
}

/**
 * Stop moving for `duration` seconds. Returns running while waiting,
 * success when done.
 */
export function wait(duration: number, key?: string): BehaviorNode {
  const timerKey = key ?? `__wait_${_nodeId++}`;
  return (ctx: BTContext): BehaviorStatus => {
    let timer = ctx.blackboard.get<number>(timerKey, -1);
    if (timer < 0) {
      timer = duration;
    }
    timer -= ctx.dt;
    ctx.blackboard.set('__vx', 0);
    ctx.blackboard.set('__vy', 0);
    if (timer <= 0) {
      ctx.blackboard.delete(timerKey);
      return 'success';
    }
    ctx.blackboard.set(timerKey, timer);
    return 'running';
  };
}

/** Set a blackboard variable. Always returns success. */
export function setVar(
  key: string,
  valueFn: (ctx: BTContext) => unknown,
): BehaviorNode {
  return (ctx: BTContext): BehaviorStatus => {
    ctx.blackboard.set(key, valueFn(ctx));
    return 'success';
  };
}

/** Debug log. Always returns success. */
export function log(msg: string): BehaviorNode {
  return (ctx: BTContext): BehaviorStatus => {
    console.log(`[BT] entity=${ctx.entity}: ${msg}`);
    return 'success';
  };
}
