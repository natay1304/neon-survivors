import type Matter from 'matter-js';
import type * as THREE from 'three';

/** Component type keys */
export const C = {
  Pos: 'pos',
  PhysicsBody: 'phys',
  Mass: 'mass',
  Player: 'player',
  GraviGlove: 'glove',
  Enemy: 'enemy',
  Health: 'health',
  GravityWell: 'gwell',
  Interactable: 'interact',
  Platform: 'platform',
  Hazard: 'hazard',
  Collectible: 'collect',
  Door: 'door',
  Checkpoint: 'checkpoint',
  ThreeObj: 'three',
  Visual: 'vis',
  Projectile: 'proj',
} as const;

/* ── Component interfaces ─────────────────────────────────── */

export interface Pos {
  x: number;
  y: number;
  rotation: number;
}

export interface PhysicsBody {
  body: Matter.Body;
}

export interface MassData {
  base: number;
  current: number;
}

export interface Player {
  speed: number;
  jumpForce: number;
  isGrounded: boolean;
  facingDir: number;
  personalGravity: { x: number; y: number };
  canJump: boolean;
  groundedTimer: number;
}

export interface GraviGlove {
  storedMass: number;
  maxStoredMass: number;
  massShiftRange: number;
  wellCooldown: number;
  wellTimer: number;
  tetherActive: boolean;
  hasRepulsion: boolean;
  hasVectorFreeze: boolean;
  hasTimeWarp: boolean;
}

export interface EnemyData {
  type: string;
  speed: number;
  damage: number;
  behavior: 'patrol' | 'chase' | 'stationary';
  patrolPoints: { x: number; y: number }[];
  patrolIndex: number;
  patrolDir: number;
  attackTimer: number;
}

export interface Health {
  current: number;
  max: number;
  invulnTimer: number;
}

export interface GravityWellData {
  strength: number;
  radius: number;
  duration: number;
  timer: number;
  ownerId: number;
}

export interface Interactable {
  type: 'crate' | 'boulder' | 'switch' | 'pressure_plate';
  canBeMassShifted: boolean;
  breakable: boolean;
  breakMassThreshold: number;
}

export interface PlatformData {
  type: 'static' | 'moving' | 'crumbling' | 'breakable';
  breakMassThreshold: number;
  broken: boolean;
}

export interface HazardData {
  type: 'spikes' | 'laser' | 'void';
  damage: number;
  instant: boolean;
}

export interface Collectible {
  type: 'upgrade' | 'health' | 'key';
  upgradeId: string;
}

export interface Door {
  targetLevel: string;
  targetSpawn: string;
}

export interface CheckpointData {
  id: string;
  activated: boolean;
}

export interface ThreeObj {
  object: THREE.Object3D;
}

export interface Visual {
  color: number;
  width: number;
  height: number;
  layer: number;
}

export interface Projectile {
  damage: number;
  lifetime: number;
  speed: number;
  direction: { x: number; y: number };
  ownerId: number;
}
