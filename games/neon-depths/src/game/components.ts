/** ECS component types for Neon Depths */

export type { Pos, Vel, Health, Collider, DamageFlash, BehaviorTreeData } from '@survivors/core';

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
  DamageFlash: 'flash',
  BehaviorTree: 'bt',
  RoomDoor: 'door',
} as const;

export interface Visual {
  shape: 'circle' | 'triangle' | 'diamond' | 'square' | 'hexagon' | 'rocket' | 'star4' | 'spike' | 'cross';
  color: string;
  size: number;
  glow?: string;
  glowSize?: number;
  rotation?: number;
}

export interface Player {
  speed: number;
  score: number;
  currentWeapon: number;
  weapons: WeaponSlot[];
  lastDirX: number;
  lastDirY: number;
  kills: number;
  armor: number;
  damageMultiplier: number;
  speedMultiplier: number;
  roomsCleared: number;
  floor: number;
}

export interface WeaponSlot {
  type: string;
  level: number;
  timer: number;
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
  hitEntities: Set<number>;
}

export interface Pickup {
  type: 'weapon' | 'health' | 'upgrade';
  weaponType?: string;
  healAmount?: number;
  upgradeType?: string;
  lifetime: number;
  bobPhase: number;
}

export interface RoomDoor {
  dir: 'up' | 'down' | 'left' | 'right';
  targetRoom: number;
}
