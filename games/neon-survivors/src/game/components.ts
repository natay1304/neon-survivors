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
} as const;

// Component data interfaces
export interface Pos { x: number; y: number; }
export interface Vel { x: number; y: number; }
export interface Health { current: number; max: number; invuln: number; }
export interface Collider { radius: number; }

export interface Visual {
  shape: 'circle' | 'triangle' | 'diamond' | 'square' | 'hexagon' | 'rocket' | 'spike' | 'star4' | 'flame';
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
