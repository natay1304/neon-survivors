/** ECS component type constants and data interfaces for Neon Dash */

export const C = {
  Pos: 'Pos',
  Vel: 'Vel',
  Player: 'Player',
  Obstacle: 'Obstacle',
  Ground: 'Ground',
} as const;

export interface PosData {
  x: number;
  y: number;
}

export interface VelData {
  x: number;
  y: number;
}

export interface PlayerData {
  alive: boolean;
  grounded: boolean;
  rotation: number;
  targetRotation: number;
}

export interface ObstacleData {
  type: string;
  width: number;
  height: number;
}

export interface GroundData {
  width: number;
}
