/** Level data type definitions */

export interface GravityZoneDef {
  id: string;
  gravity: { x: number; y: number };
  bounds: { x: number; y: number; width: number; height: number };
  color: number;
}

export interface StaticBodyDef {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  isHazard?: boolean;
  hazardType?: 'spikes' | 'laser' | 'void';
  hazardDamage?: number;
}

export interface DynamicBodyDef {
  shape: 'rect' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  mass: number;
  canBeMassShifted: boolean;
  interactType?: 'crate' | 'boulder' | 'switch' | 'pressure_plate';
  color: number;
  breakable?: boolean;
  breakMassThreshold?: number;
}

export interface EnemyDef {
  type: string;
  x: number;
  y: number;
  behavior: 'patrol' | 'chase' | 'stationary';
  patrolPoints?: { x: number; y: number }[];
}

export interface CollectibleDef {
  type: 'upgrade' | 'health' | 'key';
  upgradeId?: string;
  x: number;
  y: number;
}

export interface DoorDef {
  x: number;
  y: number;
  width: number;
  height: number;
  targetLevel: string;
  targetSpawn: string;
  color: number;
}

export interface CheckpointDef {
  id: string;
  x: number;
  y: number;
}

export interface LevelData {
  id: string;
  name: string;
  width: number;
  height: number;
  playerSpawn: { x: number; y: number };
  gravityZones: GravityZoneDef[];
  staticBodies: StaticBodyDef[];
  dynamicBodies: DynamicBodyDef[];
  enemies: EnemyDef[];
  collectibles: CollectibleDef[];
  doors: DoorDef[];
  checkpoints: CheckpointDef[];
}
