/**
 * Health and damage utilities — reusable across all games.
 *
 * Generic damage application, knockback, invulnerability ticking,
 * and death detection helpers used by multiple game systems.
 */

import type { World, Entity } from './ecs';
import type { ParticleSystem } from './particles';
import type { FloatingTextManager } from './utils';
import { randomRange } from './math';

// ── Component shape contracts ────────────────────────────────────────
// Minimal interfaces that any game's Health/Pos/Vel components must satisfy.
// Games use their own component types; these are structural checks.

/** Minimal position data. */
export interface HealthPos { x: number; y: number }

/** Minimal health data. */
export interface HealthData { current: number; max: number; invuln: number }

/** Minimal velocity data. */
export interface HealthVel { x: number; y: number }

// ── Damage application ───────────────────────────────────────────────

export interface ApplyDamageOptions {
  /** Component key for position (default: 'pos') */
  posKey?: string;
  /** Component key for health (default: 'hp') */
  healthKey?: string;
  /** Particle color (default: '#ffaa44') */
  particleColor?: string;
  /** Floating text color (default: '#ffcc00') */
  textColor?: string;
  /** Text float duration in seconds (default: 0.6) */
  textDuration?: number;
  /** Text font size (default: 14) */
  textSize?: number;
  /** Number of hit particles (default: 3) */
  particleCount?: number;
  /** Callback invoked when damage kills the entity (hp ≤ 0) */
  onKill?: (entity: Entity) => void;
}

/**
 * Apply damage to an entity: reduce hp, emit particles, show floating text.
 *
 * Returns true if the entity was killed (hp ≤ 0).
 */
export function applyDamage(
  world: World,
  entity: Entity,
  damage: number,
  particles: ParticleSystem,
  floatingText: FloatingTextManager,
  options: ApplyDamageOptions = {},
): boolean {
  const {
    posKey = 'pos',
    healthKey = 'hp',
    particleColor = '#ffaa44',
    textColor = '#ffcc00',
    textDuration = 0.6,
    textSize = 14,
    particleCount = 3,
    onKill,
  } = options;

  const hp = world.maybe<HealthData>(entity, healthKey);
  if (!hp) return false;

  hp.current -= damage;

  const pos = world.get<HealthPos>(entity, posKey);
  floatingText.add(
    pos.x + randomRange(-10, 10),
    pos.y - 15,
    Math.round(damage).toString(),
    textColor,
    textDuration,
    textSize,
  );
  particles.emit(pos.x, pos.y, particleCount, {
    color: particleColor,
    speed: 80,
    life: 0.15,
    size: 2,
  });

  const killed = hp.current <= 0;
  if (killed && onKill) onKill(entity);
  return killed;
}

// ── Knockback ────────────────────────────────────────────────────────

/**
 * Apply knockback to an entity from a source point.
 *
 * @param vel      — entity velocity component
 * @param entityX  — entity position X
 * @param entityY  — entity position Y
 * @param sourceX  — source position X (knockback radiates away from this)
 * @param sourceY  — source position Y
 * @param force    — knockback force magnitude
 */
export function applyKnockback(
  vel: HealthVel,
  entityX: number, entityY: number,
  sourceX: number, sourceY: number,
  force: number,
): void {
  const dx = entityX - sourceX;
  const dy = entityY - sourceY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const kbx = (dx / dist) * force;
  const kby = (dy / dist) * force;
  if (isFinite(kbx)) vel.x += kbx;
  if (isFinite(kby)) vel.y += kby;
}

// ── Invulnerability tick ─────────────────────────────────────────────

/**
 * Create a system that decrements invulnerability timers on all entities
 * with a health component.
 *
 * @param healthKey — component key for health (default: 'hp')
 */
export function createInvulnerabilitySystem(healthKey = 'hp') {
  return (world: World, dt: number) => {
    for (const e of world.query(healthKey)) {
      const hp = world.get<HealthData>(e, healthKey);
      if (hp.invuln > 0) hp.invuln -= dt;
    }
  };
}
