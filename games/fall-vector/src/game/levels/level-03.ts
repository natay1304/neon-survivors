/** Level 3: The Slingshot — Gravity well tutorial + upgrade reward */

import type { LevelData } from './types';

export const LEVEL_03: LevelData = {
  id: 'level_03',
  name: 'Level 3: The Slingshot',
  width: 2400,
  height: 1400,
  playerSpawn: { x: 150, y: 600 },

  gravityZones: [
    {
      id: 'main',
      gravity: { x: 0, y: 0.8 },
      bounds: { x: 0, y: 0, width: 2400, height: 1400 },
      color: 0x220033,
    },
  ],

  staticBodies: [
    // Outer walls
    { x: 0, y: 0, width: 2400, height: 30, color: 0x334455 },
    { x: 0, y: 1370, width: 2400, height: 30, color: 0x334455 },
    { x: 0, y: 0, width: 30, height: 1400, color: 0x334455 },
    { x: 2370, y: 0, width: 30, height: 1400, color: 0x334455 },

    // === Left platform (start area) ===
    { x: 30, y: 700, width: 350, height: 30, color: 0x445566 },
    // Small step up
    { x: 200, y: 580, width: 150, height: 20, color: 0x445566 },

    // === Central gap — THE SLINGSHOT ===
    // No floor in the center — void drop
    { x: 380, y: 1300, width: 900, height: 40, color: 0xff2222, isHazard: true, hazardType: 'void', hazardDamage: 999 },
    // Floating debris platforms in the gap (small, spread out)
    { x: 550, y: 600, width: 60, height: 15, color: 0x556677 },
    { x: 750, y: 500, width: 50, height: 15, color: 0x556677 },
    { x: 950, y: 650, width: 50, height: 15, color: 0x556677 },
    { x: 1100, y: 450, width: 60, height: 15, color: 0x556677 },

    // === Right side (after the gap) ===
    { x: 1280, y: 700, width: 400, height: 30, color: 0x445566 },

    // === Combat arena ===
    { x: 1280, y: 500, width: 30, height: 200, color: 0x445566 },
    // Floor
    { x: 1310, y: 900, width: 600, height: 30, color: 0x445566 },
    // Some cover
    { x: 1500, y: 780, width: 80, height: 20, color: 0x556677 },
    { x: 1700, y: 780, width: 80, height: 20, color: 0x556677 },

    // === Upgrade chamber ===
    { x: 1910, y: 500, width: 30, height: 500, color: 0x445566 },
    { x: 1940, y: 700, width: 430, height: 30, color: 0x445566 },
    // Ceiling of chamber
    { x: 1940, y: 500, width: 430, height: 30, color: 0x445566 },
  ],

  dynamicBodies: [
    // Debris in the gap that can be attracted by gravity wells
    {
      shape: 'rect',
      x: 650, y: 700,
      width: 30, height: 30,
      mass: 8,
      canBeMassShifted: true,
      interactType: 'crate',
      color: 0x776655,
    },
    {
      shape: 'rect',
      x: 850, y: 550,
      width: 25, height: 25,
      mass: 6,
      canBeMassShifted: true,
      interactType: 'crate',
      color: 0x776655,
    },
    {
      shape: 'rect',
      x: 1050, y: 600,
      width: 35, height: 35,
      mass: 10,
      canBeMassShifted: true,
      interactType: 'crate',
      color: 0x776655,
    },
    // Heavy debris for combat
    {
      shape: 'rect',
      x: 1600, y: 860,
      width: 40, height: 40,
      mass: 30,
      canBeMassShifted: true,
      interactType: 'boulder',
      color: 0x887766,
    },
  ],

  enemies: [
    // Chase drones in combat arena
    {
      type: 'phaser',
      x: 1400, y: 860,
      behavior: 'chase',
    },
    {
      type: 'phaser',
      x: 1550, y: 860,
      behavior: 'chase',
    },
    {
      type: 'drone',
      x: 1700, y: 860,
      behavior: 'patrol',
      patrolPoints: [{ x: 1400, y: 860 }, { x: 1800, y: 860 }],
    },
    {
      type: 'phaser',
      x: 1800, y: 860,
      behavior: 'chase',
    },
  ],

  collectibles: [
    // Repulsion Module upgrade at the end
    {
      type: 'upgrade',
      upgradeId: 'repulsion',
      x: 2200, y: 650,
    },
  ],

  doors: [
    {
      x: 2300, y: 640,
      width: 40, height: 60,
      targetLevel: 'victory',
      targetSpawn: 'start',
      color: 0xffcc00,
    },
  ],

  checkpoints: [
    { id: 'start', x: 150, y: 600 },
    { id: 'gap_right', x: 1350, y: 660 },
    { id: 'arena', x: 1400, y: 860 },
  ],
};
