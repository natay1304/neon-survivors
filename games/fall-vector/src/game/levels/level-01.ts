/** Level 1: Fractured Axis — Gravity zone tutorial */

import type { LevelData } from './types';

export const LEVEL_01: LevelData = {
  id: 'level_01',
  name: 'Level 1: First Steps',
  width: 2400,
  height: 1200,
  playerSpawn: { x: 100, y: 500 },

  gravityZones: [
    {
      id: 'zone_normal',
      gravity: { x: 0, y: 0.8 },
      bounds: { x: 0, y: 0, width: 800, height: 1200 },
      color: 0x330066,
    },
    {
      id: 'zone_right',
      gravity: { x: 0.8, y: 0 },
      bounds: { x: 800, y: 0, width: 800, height: 1200 },
      color: 0x006633,
    },
    {
      id: 'zone_inverted',
      gravity: { x: 0, y: -0.8 },
      bounds: { x: 1600, y: 0, width: 800, height: 1200 },
      color: 0x663300,
    },
  ],

  staticBodies: [
    // === Zone 1: Normal gravity (down) ===
    // Floor
    { x: 0, y: 600, width: 700, height: 40, color: 0x334455 },
    // Left wall
    { x: 0, y: 0, width: 30, height: 1200, color: 0x334455 },
    // Platform above start
    { x: 150, y: 420, width: 180, height: 20, color: 0x445566 },
    // Higher platform
    { x: 400, y: 300, width: 180, height: 20, color: 0x445566 },
    // Ledge to zone transition
    { x: 620, y: 200, width: 180, height: 20, color: 0x445566 },
    // Ceiling segment zone 1
    { x: 0, y: 0, width: 800, height: 30, color: 0x334455 },

    // === Zone 2: Gravity pulls right ===
    // "Floor" (right wall in zone 2 - gravity pulls right)
    { x: 1560, y: 0, width: 40, height: 1200, color: 0x335544 },
    // Platforms (horizontal platforms become walls to climb in right-gravity)
    { x: 900, y: 100, width: 20, height: 200, color: 0x446655 },
    { x: 1100, y: 350, width: 20, height: 200, color: 0x446655 },
    { x: 900, y: 600, width: 20, height: 200, color: 0x446655 },
    { x: 1100, y: 850, width: 20, height: 200, color: 0x446655 },
    // Bottom
    { x: 800, y: 1160, width: 800, height: 40, color: 0x335544 },
    // Top
    { x: 800, y: 0, width: 800, height: 30, color: 0x335544 },

    // === Zone 3: Inverted gravity (up) ===
    // "Floor" (ceiling in zone 3 - gravity pulls up)
    { x: 1600, y: 0, width: 800, height: 40, color: 0x554433 },
    // Platforms hanging from the top
    { x: 1700, y: 100, width: 180, height: 20, color: 0x665544 },
    { x: 1950, y: 250, width: 180, height: 20, color: 0x665544 },
    { x: 1700, y: 400, width: 180, height: 20, color: 0x665544 },
    // Right wall
    { x: 2370, y: 0, width: 30, height: 1200, color: 0x554433 },
    // Bottom
    { x: 1600, y: 1160, width: 800, height: 40, color: 0x554433 },
  ],

  dynamicBodies: [
    // A crate in zone 1 to experiment with
    {
      shape: 'rect',
      x: 300, y: 560,
      width: 40, height: 40,
      mass: 15,
      canBeMassShifted: true,
      interactType: 'crate',
      color: 0x886644,
    },
  ],

  enemies: [],

  collectibles: [],

  doors: [
    {
      x: 2300, y: 50,
      width: 40, height: 60,
      targetLevel: 'level_02',
      targetSpawn: 'start',
      color: 0x00ff88,
    },
  ],

  checkpoints: [
    { id: 'start', x: 100, y: 500 },
    { id: 'zone2', x: 1500, y: 1100 },
    { id: 'zone3', x: 1700, y: 80 },
  ],
};
