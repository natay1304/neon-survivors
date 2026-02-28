/**
 * Common ECS component interfaces — reusable across all games.
 *
 * These define the minimal data shapes for components that appear
 * in every game. Games may extend these with additional fields.
 */

import type { Blackboard } from './behavior-tree';

/** 2D position component. */
export interface Pos { x: number; y: number; }

/** 2D velocity component. */
export interface Vel { x: number; y: number; }

/** Health component with invulnerability timer. */
export interface Health { current: number; max: number; invuln: number; }

/** Circle collider component. */
export interface Collider { radius: number; }

/** Visual flash on damage. Timer counts down; component is removed at zero. */
export interface DamageFlash { timer: number; }

/** Behavior tree wrapper component. */
export interface BehaviorTreeData { blackboard: Blackboard; }
