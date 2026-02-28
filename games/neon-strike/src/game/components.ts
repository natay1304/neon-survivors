/** All component types for Neon Strike */

// Re-export common component interfaces from core
export type { Pos, Vel, Health, Collider, DamageFlash, BehaviorTreeData } from '@survivors/core';

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
  Pickup: 'pickup',
  Destructible: 'destr',
  DamageFlash: 'flash',
  BehaviorTree: 'bt',
  Explosion: 'explosion',
} as const;

export interface Visual {
  shape: 'circle' | 'triangle' | 'diamond' | 'square' | 'hexagon' | 'rocket' | 'star4' | 'spike' | 'crate' | 'barrel' | 'mech';
  color: string;
  size: number;
  glow?: string;
  glowSize?: number;
  rotation?: number;
}

export interface WeaponState {
  type: string;
  ammo: number; // -1 = infinite
  timer: number;
}

export interface Player {
  speed: number;
  score: number;
  lives: number;
  currentWeapon: number; // index into weapons[]
  weapons: WeaponState[];
  lastDirX: number;
  lastDirY: number;
}

export interface Enemy {
  type: string;
  speed: number;
  damage: number;
  scoreValue: number;
  contactTimer: number;
  shootTimer: number;
}

export interface Projectile {
  damage: number;
  owner: 'player' | 'enemy';
  lifetime: number;
  pierce: number;
  size: number;
  explosive: boolean;
  hitEntities: Set<number>;
}

export interface Pickup {
  type: 'weapon' | 'health';
  weaponType?: string;
  ammo?: number;
  healAmount?: number;
  lifetime: number;
  bobPhase: number;
}

export interface Destructible {
  hp: number;
  maxHp: number;
  dropType: 'weapon' | 'health' | 'none';
  explosive: boolean;
}

export interface Explosion {
  radius: number;
  maxRadius: number;
  damage: number;
  timer: number;
  owner: 'player' | 'enemy';
  hitEntities: Set<number>;
}
