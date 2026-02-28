/** Level 2: Mass Lab — Mass shifting tutorial */

import type { LevelData } from './types';

export const LEVEL_02: LevelData = {
  id: 'level_02',
  name: 'Level 2: Mass Lab',
  width: 2000,
  height: 1000,
  playerSpawn: { x: 100, y: 400 },

  gravityZones: [
    {
      id: 'main',
      gravity: { x: 0, y: 0.8 },
      bounds: { x: 0, y: 0, width: 2000, height: 1000 },
      color: 0x220044,
    },
  ],

  staticBodies: [
    // Outer walls
    { x: 0, y: 0, width: 2000, height: 30, color: 0x334455 },    // ceiling
    { x: 0, y: 970, width: 2000, height: 30, color: 0x334455 },   // floor
    { x: 0, y: 0, width: 30, height: 1000, color: 0x334455 },     // left
    { x: 1970, y: 0, width: 30, height: 1000, color: 0x334455 },  // right

    // === Section 1: Boulder blocking passage ===
    // Floor
    { x: 30, y: 500, width: 500, height: 30, color: 0x445566 },
    // Passage floor (lower)
    { x: 30, y: 700, width: 600, height: 30, color: 0x445566 },
    // Platform above passage (the "ceiling" of passage)
    { x: 200, y: 580, width: 200, height: 20, color: 0x445566 },

    // === Section 2: Breakable floor puzzle ===
    // Elevated platform
    { x: 650, y: 400, width: 350, height: 20, color: 0x445566 },
    // Breakable floor marker (visual hint — actual breakable is dynamic)
    // Floor below
    { x: 650, y: 700, width: 400, height: 30, color: 0x445566 },
    // Walls for chamber
    { x: 650, y: 420, width: 20, height: 280, color: 0x445566 },
    { x: 1000, y: 420, width: 20, height: 280, color: 0x445566 },

    // === Section 3: Pressure plate puzzle ===
    // Floor
    { x: 1100, y: 600, width: 500, height: 30, color: 0x445566 },
    // Elevated area
    { x: 1400, y: 400, width: 200, height: 20, color: 0x445566 },

    // === Connecting platforms ===
    { x: 530, y: 500, width: 120, height: 20, color: 0x4a5a6a },
    { x: 1020, y: 500, width: 90, height: 20, color: 0x4a5a6a },

    // Pit below section 1 (hazard)
    { x: 30, y: 900, width: 600, height: 20, color: 0xff2222, isHazard: true, hazardType: 'spikes', hazardDamage: 30 },
  ],

  dynamicBodies: [
    // Heavy boulder blocking the lower passage
    {
      shape: 'rect',
      x: 350, y: 650,
      width: 60, height: 60,
      mass: 80,
      canBeMassShifted: true,
      interactType: 'boulder',
      color: 0x887766,
    },
    // Crate on elevated platform (Section 2) — make heavy to break floor
    {
      shape: 'rect',
      x: 800, y: 360,
      width: 40, height: 40,
      mass: 10,
      canBeMassShifted: true,
      interactType: 'crate',
      color: 0x886644,
      breakable: true,
      breakMassThreshold: 60,
    },
    // Crates for pressure plate (Section 3) — combine mass
    {
      shape: 'rect',
      x: 1150, y: 560,
      width: 35, height: 35,
      mass: 25,
      canBeMassShifted: true,
      interactType: 'crate',
      color: 0x886644,
    },
    {
      shape: 'rect',
      x: 1250, y: 560,
      width: 35, height: 35,
      mass: 25,
      canBeMassShifted: true,
      interactType: 'crate',
      color: 0x886644,
    },
    {
      shape: 'rect',
      x: 1350, y: 560,
      width: 35, height: 35,
      mass: 25,
      canBeMassShifted: true,
      interactType: 'crate',
      color: 0x886644,
    },
  ],

  enemies: [
    // Patrol drones in the lower passage
    {
      type: 'drone',
      x: 200, y: 660,
      behavior: 'patrol',
      patrolPoints: [{ x: 100, y: 660 }, { x: 450, y: 660 }],
    },
    {
      type: 'drone',
      x: 1200, y: 560,
      behavior: 'patrol',
      patrolPoints: [{ x: 1100, y: 560 }, { x: 1500, y: 560 }],
    },
  ],

  collectibles: [],

  doors: [
    {
      x: 1900, y: 350,
      width: 40, height: 60,
      targetLevel: 'level_03',
      targetSpawn: 'start',
      color: 0x00ff88,
    },
  ],

  checkpoints: [
    { id: 'start', x: 100, y: 400 },
    { id: 'mid', x: 700, y: 360 },
  ],
};
