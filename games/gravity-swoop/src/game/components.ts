/** ECS component type constants and data interfaces for Gravity Swoop */

export const C = {
  Pos: 'Pos',
  Vel: 'Vel',
  Bird: 'Bird',
  GravityPoint: 'GravityPoint',
  Obstacle: 'Obstacle',
  Collectible: 'Collectible',
  Goal: 'Goal',
  Collider: 'Collider',
  Visual: 'Visual',
} as const;

export interface PosData {
  x: number;
  y: number;
}

export interface VelData {
  x: number;
  y: number;
}

export interface BirdData {
  rotation: number;
  alive: boolean;
  deathTimer: number;
  angularVel: number;
  feathersSpawned: boolean;
}

export interface GravityPointData {
  strength: number;
  minDist: number;
  visualRadius: number;
  age: number;
}

export type ObstacleType = 'spike' | 'laser' | 'cat' | 'wall';

export interface ObstacleData {
  type: ObstacleType;
  width: number;
  height: number;
}

export interface CollectibleData {
  value: number;
  collected: boolean;
}

export interface GoalData {
  radius: number;
}

import type { ColliderShape } from '@survivors/core';

export { ColliderShape };

export interface ColliderData {
  shape: ColliderShape;
  radius: number;
  width: number;
  height: number;
}

export interface VisualData {
  type: string;
  color: string;
  size: number;
}
