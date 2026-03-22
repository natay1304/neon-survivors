/** All component types used in the game */

import type { Blackboard } from '@survivors/core';

// Component type constants
export const C = {
  Pos: 'pos',
  Vel: 'vel',
  Health: 'hp',
  Collider: 'col',
  Visual: 'vis',
  Player: 'player',
  Enemy: 'enemy',
  Projectile: 'proj',
  XPGem: 'xp',
  DamageFlash: 'flash',
  Aura: 'aura',
  Lightning: 'lightning',
  Bonus: 'bonus',
  BehaviorTree: 'bt',
  EnemyProjectile: 'eproj',
  EnemySpin: 'espin',
  WaveSwarm: 'wswarm',
  CircleMember: 'cmember',
} as const;

// Component data interfaces
export interface Pos { x: number; y: number; }
export interface Vel { x: number; y: number; }
export interface Health { current: number; max: number; invuln: number; }
export interface Collider { radius: number; }

export interface Visual {
  shape: 'circle' | 'triangle' | 'diamond' | 'square' | 'hexagon' | 'rocket' | 'spike' | 'star4' | 'flame' | 'bullet';
  color: string;
  size: number;
  glow?: string;
  glowSize?: number;
  rotation?: number;
}

export interface WeaponSlot {
  type: string;
  level: number;
  timer: number;
}

export interface Buff {
  type: string;
  remaining: number;
  duration: number;
}

export interface Player {
  speed: number;
  xp: number;
  level: number;
  nextLevelXp: number;
  pickupRange: number;
  weapons: WeaponSlot[];
  kills: number;
  damageDealt: number;
  lastDirX: number;
  lastDirY: number;
  armor: number;
  buffs: Buff[];
  statPicks: Record<string, number>;
  firingMode: 'normal' | 'shotgun' | 'rapid';
}

export interface Enemy {
  type: string;
  speed: number;
  damage: number;
  xpValue: number;
  contactTimer: number;
}

export interface Projectile {
  damage: number;
  lifetime: number;
  pierce: number;
  weaponType: string;
  hitEntities: Set<number>;
  size: number;
}

export interface XPGem {
  value: number;
  attracted: boolean;
  magnetTimer: number;
}

export interface DamageFlash {
  timer: number;
}

export interface AuraData {
  radius: number;
  damage: number;
  tickTimer: number;
  tickRate: number;
  color: string;
}

export interface LightningData {
  targetX: number;
  targetY: number;
  timer: number;
}

export interface Bonus {
  type: 'heal' | 'magnet' | 'bomb' | 'speed';
  lifetime: number;
}

export interface BehaviorTreeData {
  blackboard: Blackboard;
}

export interface EnemyProjectile {
  damage: number;
  lifetime: number;
}

export interface EnemySpin {
  speed: number;         // radians per second
  direction: number;     // 1 or -1
  flipTimer: number;     // countdown to next direction change
  flipInterval: number;  // base seconds between direction changes
}

/** Wave swarm member — flies in a straight line, ignores normal AI */
export interface WaveSwarmMember {
  dirX: number;          // normalized direction
  dirY: number;
  speed: number;
  lifetime: number;      // despawn timer
}

/** Closing circle member — orbits and shrinks toward center */
export interface CircleMember {
  centerX: number;       // center of circle (player pos at spawn)
  centerY: number;
  angle: number;         // current angle on circle
  radius: number;        // current orbit radius
  shrinkRate: number;    // px/s radius decrease
  rotSpeed: number;      // rad/s
  lifetime: number;      // despawn timer (vanish before fully closing)
}
