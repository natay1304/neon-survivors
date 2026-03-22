/** Neon Path — game constants and level definitions */

export const WORLD_W = 800;
export const WORLD_H = 450;

// Physics
export const GRAVITY = 900;
export const MAX_FALL_SPEED = 700;
export const PLAYER_SPEED = 220;
export const JUMP_FORCE = 520;

// Entity sizes
export const PLAYER_W = 20;
export const PLAYER_H = 32;
export const DOOR_W = 30;
export const DOOR_H = 50;
export const SPIKE_W = 18;
export const SPIKE_H = 14;

// Timing
export const RESPAWN_DELAY = 0.9;
export const LEVEL_COMPLETE_DELAY = 1.2;

// ── Colors ────────────────────────────────────────────────────────────────────
export const COLOR_BG             = '#06060f';
export const COLOR_GRID           = 'rgba(0, 191, 255, 0.04)';
export const COLOR_PLATFORM_FILL  = '#051c2e';
export const COLOR_PLATFORM_EDGE  = '#00bfff';
export const COLOR_PLATFORM_GLOW  = 'rgba(0, 191, 255, 0.22)';
export const COLOR_PLAYER         = '#e8f8ff';
export const COLOR_PLAYER_GLOW    = 'rgba(0, 200, 255, 0.7)';
export const COLOR_SPIKE          = '#ff2060';
export const COLOR_SPIKE_GLOW     = 'rgba(255, 32, 96, 0.45)';
export const COLOR_DOOR_FILL      = '#001a0d';
export const COLOR_DOOR_EDGE      = '#00ff88';
export const COLOR_DOOR_GLOW      = 'rgba(0, 255, 136, 0.5)';
export const COLOR_DEATH_FLASH    = 'rgba(255, 32, 96, 0.35)';
export const COLOR_COMPLETE_FLASH = 'rgba(0, 255, 136, 0.25)';
export const COLOR_UI_TEXT        = '#ffffff';
export const COLOR_UI_DIM         = 'rgba(255,255,255,0.5)';
export const COLOR_UI_ACCENT      = '#00bfff';
export const COLOR_UI_PANEL       = 'rgba(6, 6, 15, 0.88)';

// Original obstacle colors
export const COLOR_MOV_PLATFORM      = '#00e5ff';
export const COLOR_MOV_PLATFORM_GLOW = 'rgba(0, 229, 255, 0.3)';
export const COLOR_LASER             = '#ff4400';
export const COLOR_LASER_GLOW        = 'rgba(255, 68, 0, 0.5)';
export const COLOR_SAW               = '#ff00cc';
export const COLOR_SAW_GLOW          = 'rgba(255, 0, 204, 0.4)';

// New obstacle colors
export const COLOR_FIRE         = '#ff6600';
export const COLOR_FIRE_HOT     = '#ffee44';
export const COLOR_ACID         = '#39ff14';
export const COLOR_ACID_GLOW    = 'rgba(57, 255, 20, 0.5)';
export const COLOR_ORBIT        = '#ff9900';
export const COLOR_ORBIT_GLOW   = 'rgba(255, 153, 0, 0.4)';
export const COLOR_TURRET       = '#ff3030';
export const COLOR_TURRET_GLOW  = 'rgba(255, 48, 48, 0.4)';
export const COLOR_CRUSHER      = '#9933ff';
export const COLOR_CRUSHER_GLOW = 'rgba(153, 51, 255, 0.35)';

// ── Level themes (changes every 5 levels) ─────────────────────────────────────
export interface LevelTheme {
  bg: string;
  grid: string;
  platformFill: string;
  platformEdge: string;
  platformGlow: string;
}

export const THEMES: LevelTheme[] = [
  // 0: Cyan/Blue (levels 1-5)
  { bg: '#06060f', grid: 'rgba(0,191,255,0.04)',  platformFill: '#051c2e', platformEdge: '#00bfff', platformGlow: 'rgba(0,191,255,0.22)' },
  // 1: Purple/Violet (levels 6-10)
  { bg: '#090610', grid: 'rgba(160,0,255,0.04)',  platformFill: '#150a28', platformEdge: '#aa44ff', platformGlow: 'rgba(160,80,255,0.22)' },
  // 2: Green/Lime (levels 11-15)
  { bg: '#030f05', grid: 'rgba(0,255,80,0.04)',   platformFill: '#041a0a', platformEdge: '#00e060', platformGlow: 'rgba(0,220,80,0.22)'  },
  // 3: Orange/Red (levels 16-20)
  { bg: '#0f0600', grid: 'rgba(255,90,0,0.04)',   platformFill: '#251000', platformEdge: '#ff6600', platformGlow: 'rgba(255,100,0,0.22)' },
];

// ── Data types ────────────────────────────────────────────────────────────────

export interface Platform {
  x: number; y: number; w: number; h: number;
}

/** x = center, y = base (platform surface). Points upward. */
export interface Spike {
  x: number; y: number;
}

/** Patrols between (x,y) and (endX,endY) */
export interface MovingPlatform extends Platform {
  endX: number; endY: number; speed: number;
}

/** Blinks on/off. Kills on contact when active. */
export interface Laser {
  x1: number; y1: number; x2: number; y2: number;
  onTime: number; offTime: number; phase: number; thickness: number;
}

/** Circular saw that patrols a path. */
export interface SawBlade {
  x: number; y: number; endX: number; endY: number;
  radius: number; speed: number;
}

/** Periodic fire burst from a floor point. */
export interface FirePillar {
  x: number;      // center x
  y: number;      // base y (floor surface)
  height: number; // max flame height
  onTime: number;
  offTime: number;
  phase: number;
}

/** Acid drops falling from a ceiling/emitter point. */
export interface AcidDrop {
  x: number;        // emitter center x
  y: number;        // emitter y (where drops spawn)
  interval: number; // seconds between drops
  speed: number;    // falling px/s
}

/** A blade orbiting a fixed center point. */
export interface OrbitBlade {
  cx: number; cy: number;
  radius: number;      // orbit radius
  speed: number;       // rad/s (positive = clockwise)
  bladeRadius: number; // visual/hitbox size
}

/** Wall-mounted turret that fires horizontal bullets at intervals. */
export interface Turret {
  x: number; y: number;     // barrel tip position
  direction: 1 | -1;        // 1 = right, -1 = left
  interval: number;         // seconds between shots
  bulletSpeed: number;      // px/s
}

/** Ceiling crusher that strikes when the player enters its trigger zone. */
export interface Crusher {
  x: number; y: number;    // rest position (top-left)
  w: number; h: number;
  strikeY: number;         // bottom of crush stroke
  triggerX1: number;       // horizontal trigger range
  triggerX2: number;
  speed: number;           // descent px/s
  retractSpeed: number;    // return px/s
}

export interface LevelDef {
  id: number;
  name: string;
  playerSpawn: { x: number; y: number };
  platforms: Platform[];
  spikes: Spike[];
  door: { x: number; y: number };
  movingPlatforms?: MovingPlatform[];
  lasers?: Laser[];
  saws?: SawBlade[];
  firePillars?: FirePillar[];
  acidDrops?: AcidDrop[];
  orbitBlades?: OrbitBlade[];
  turrets?: Turret[];
  crushers?: Crusher[];
}

// ── Level definitions ─────────────────────────────────────────────────────────

export const LEVELS: LevelDef[] = [
  // ── Level 1: Entry Point ──────────────────────────────────────────────────
  {
    id: 1,
    name: 'ENTRY POINT',
    playerSpawn: { x: 700, y: 340 },
    platforms: [
      { x: 0,   y: 390, w: 555, h: 60 },
      { x: 610, y: 340, w: 190, h: 110 },
    ],
    spikes: [
      { x: 210, y: 390 }, { x: 232, y: 390 }, { x: 254, y: 390 },
    ],
    door: { x: 18, y: 340 },
    firePillars: [
      // Brief burst in the middle of the floor — learn to time it
      { x: 340, y: 390, height: 65, onTime: 0.65, offTime: 2.0, phase: 0.5 },
    ],
  },

  // ── Level 2: Gap Theory ───────────────────────────────────────────────────
  {
    id: 2,
    name: 'GAP THEORY',
    playerSpawn: { x: 730, y: 330 },
    platforms: [
      { x: 660, y: 330, w: 140, h: 120 },
      { x: 480, y: 360, w: 130, h: 90 },
      { x: 245, y: 380, w: 170, h: 70 },
      { x: 0,   y: 380, w: 190, h: 70 },
      { x: 60,  y: 300, w: 110, h: 20 },
    ],
    spikes: [
      { x: 290, y: 380 }, { x: 312, y: 380 },
      { x: 515, y: 360 }, { x: 537, y: 360 },
    ],
    door: { x: 12, y: 330 },
    movingPlatforms: [
      { x: 340, y: 310, w: 90, h: 18, endX: 470, endY: 310, speed: 80 },
    ],
    acidDrops: [
      // Drips over the main gap — time your crossing
      { x: 395, y: 330, interval: 2.2, speed: 190 },
    ],
  },

  // ── Level 3: Vertical Sync ────────────────────────────────────────────────
  {
    id: 3,
    name: 'VERTICAL SYNC',
    playerSpawn: { x: 695, y: 390 },
    platforms: [
      { x: 600, y: 390, w: 200, h: 60 },
      { x: 400, y: 340, w: 150, h: 20 },
      { x: 220, y: 280, w: 140, h: 20 },
      { x: 40,  y: 220, w: 160, h: 20 },
      { x: 500, y: 240, w: 120, h: 20 },
      { x: 0,   y: 390, w: 80,  h: 60 },
    ],
    spikes: [
      { x: 635, y: 390 }, { x: 657, y: 390 },
      { x: 437, y: 340 }, { x: 459, y: 340 },
      { x: 255, y: 280 }, { x: 277, y: 280 },
    ],
    door: { x: 50, y: 170 },
    lasers: [
      { x1: 220, y1: 265, x2: 398, y2: 265, onTime: 1.4, offTime: 1.0, phase: 0.0, thickness: 4 },
    ],
    orbitBlades: [
      // Guards the approach to step 2
      { cx: 480, cy: 215, radius: 44, speed: 1.9, bladeRadius: 10 },
    ],
  },

  // ── Level 4: Circuit Maze ─────────────────────────────────────────────────
  {
    id: 4,
    name: 'CIRCUIT MAZE',
    playerSpawn: { x: 745, y: 380 },
    platforms: [
      { x: 660, y: 390, w: 140, h: 60 },
      { x: 460, y: 350, w: 140, h: 20 },
      { x: 280, y: 300, w: 130, h: 20 },
      { x: 460, y: 240, w: 130, h: 20 },
      { x: 280, y: 180, w: 130, h: 20 },
      { x: 80,  y: 230, w: 160, h: 20 },
      { x: 0,   y: 160, w: 130, h: 20 },
      { x: 560, y: 170, w: 100, h: 20 },
      { x: 130, y: 390, w: 160, h: 60 },
      { x: 0,   y: 340, w: 90,  h: 110 },
    ],
    spikes: [
      { x: 700, y: 390 }, { x: 722, y: 390 },
      { x: 498, y: 350 },
      { x: 316, y: 300 }, { x: 338, y: 300 },
      { x: 498, y: 240 },
      { x: 316, y: 180 },
      { x: 120, y: 230 },
      { x: 165, y: 390 }, { x: 187, y: 390 },
    ],
    door: { x: 10, y: 110 },
    saws: [
      { x: 285, y: 285, endX: 400, endY: 285, radius: 12, speed: 95 },
    ],
    crushers: [
      // Drops on step 2 when player is there
      { x: 287, y: 240, w: 56, h: 18, strikeY: 283, triggerX1: 282, triggerX2: 408, speed: 420, retractSpeed: 85 },
    ],
  },

  // ── Level 5: Neon Finale — all mechanics ─────────────────────────────────
  {
    id: 5,
    name: 'NEON FINALE',
    playerSpawn: { x: 745, y: 370 },
    platforms: [
      { x: 650, y: 390, w: 150, h: 60 },
      { x: 450, y: 370, w: 130, h: 80 },
      { x: 280, y: 330, w: 100, h: 20 },
      { x: 430, y: 270, w: 100, h: 20 },
      { x: 560, y: 210, w: 120, h: 20 },
      { x: 380, y: 160, w: 100, h: 20 },
      { x: 200, y: 200, w: 120, h: 20 },
      { x: 50,  y: 140, w: 130, h: 20 },
      { x: 100, y: 310, w: 110, h: 20 },
      { x: 0,   y: 390, w: 100, h: 60 },
      { x: 160, y: 390, w: 130, h: 60 },
    ],
    spikes: [
      { x: 685, y: 390 }, { x: 707, y: 390 },
      { x: 478, y: 370 }, { x: 500, y: 370 }, { x: 522, y: 370 },
      { x: 308, y: 330 }, { x: 330, y: 330 },
      { x: 458, y: 270 }, { x: 480, y: 270 },
      { x: 588, y: 210 }, { x: 610, y: 210 },
      { x: 408, y: 160 },
      { x: 138, y: 310 }, { x: 160, y: 310 },
      { x: 188, y: 390 }, { x: 210, y: 390 }, { x: 232, y: 390 },
    ],
    door: { x: 60, y: 90 },
    movingPlatforms: [
      { x: 100, y: 190, w: 80, h: 18, endX: 240, endY: 190, speed: 85 },
    ],
    lasers: [
      { x1: 55, y1: 126, x2: 175, y2: 126, onTime: 1.1, offTime: 0.9, phase: 0.4, thickness: 4 },
    ],
    saws: [
      { x: 565, y: 195, endX: 665, endY: 195, radius: 12, speed: 110 },
    ],
    turrets: [
      // Fires left across the top goal — dodge bullets to reach the door
      { x: 178, y: 128, direction: -1, interval: 2.1, bulletSpeed: 175 },
    ],
  },

  // ── Level 6: Neon Rush ────────────────────────────────────────────────────
  {
    id: 6, name: 'NEON RUSH',
    playerSpawn: { x: 730, y: 365 },
    platforms: [
      { x: 620, y: 380, w: 180, h: 70 },
      { x: 0,   y: 380, w: 175, h: 70 },
      { x: 340, y: 330, w: 100, h: 20 },
    ],
    spikes: [
      { x: 658, y: 380 }, { x: 680, y: 380 }, { x: 18, y: 380 },
    ],
    door: { x: 12, y: 330 },
    movingPlatforms: [
      { x: 180, y: 350, w: 100, h: 18, endX: 530, endY: 350, speed: 120 },
    ],
    firePillars: [
      { x: 260, y: 380, height: 80, onTime: 0.65, offTime: 1.5, phase: 0.0 },
      { x: 490, y: 380, height: 80, onTime: 0.65, offTime: 1.5, phase: 0.75 },
    ],
  },

  // ── Level 7: Static Web ───────────────────────────────────────────────────
  {
    id: 7, name: 'STATIC WEB',
    playerSpawn: { x: 740, y: 375 },
    platforms: [
      { x: 650, y: 390, w: 150, h: 60 },
      { x: 470, y: 345, w: 130, h: 20 },
      { x: 295, y: 290, w: 130, h: 20 },
      { x: 120, y: 235, w: 130, h: 20 },
      { x: 0,   y: 390, w: 90,  h: 60 },
    ],
    spikes: [
      { x: 688, y: 390 }, { x: 710, y: 390 },
      { x: 508, y: 345 }, { x: 530, y: 345 },
    ],
    door: { x: 10, y: 340 },
    lasers: [
      { x1: 465, y1: 328, x2: 600, y2: 328, onTime: 1.1, offTime: 1.1, phase: 0.0,  thickness: 4 },
      { x1: 290, y1: 273, x2: 425, y2: 273, onTime: 1.1, offTime: 1.1, phase: 0.55, thickness: 4 },
      { x1: 115, y1: 218, x2: 250, y2: 218, onTime: 1.1, offTime: 1.1, phase: 1.1,  thickness: 4 },
    ],
    acidDrops: [
      { x: 530, y: 0, interval: 2.5, speed: 210 },
    ],
  },

  // ── Level 8: Orbit Trap ───────────────────────────────────────────────────
  {
    id: 8, name: 'ORBIT TRAP',
    playerSpawn: { x: 735, y: 360 },
    platforms: [
      { x: 640, y: 375, w: 160, h: 75 },
      { x: 430, y: 305, w: 110, h: 20 },
      { x: 230, y: 245, w: 120, h: 20 },
      { x: 50,  y: 300, w: 130, h: 20 },
      { x: 0,   y: 390, w: 75,  h: 60 },
    ],
    spikes: [
      { x: 678, y: 375 }, { x: 700, y: 375 },
      { x: 468, y: 305 }, { x: 268, y: 245 },
    ],
    door: { x: 8, y: 250 },
    orbitBlades: [
      { cx: 535, cy: 265, radius: 50, speed: 2.1,  bladeRadius: 11 },
      { cx: 335, cy: 215, radius: 42, speed: -2.5, bladeRadius: 10 },
    ],
    saws: [
      { x: 55, y: 285, endX: 170, endY: 285, radius: 12, speed: 95 },
    ],
    firePillars: [
      { x: 435, y: 305, height: 55, onTime: 0.6, offTime: 2.0, phase: 1.0 },
    ],
  },

  // ── Level 9: Acid Rain ────────────────────────────────────────────────────
  {
    id: 9, name: 'ACID RAIN',
    playerSpawn: { x: 745, y: 375 },
    platforms: [
      { x: 650, y: 390, w: 150, h: 60 },
      { x: 490, y: 348, w: 120, h: 20 },
      { x: 340, y: 295, w: 110, h: 20 },
      { x: 195, y: 245, w: 110, h: 20 },
      { x: 55,  y: 195, w: 120, h: 20 },
      { x: 0,   y: 390, w: 75,  h: 60 },
    ],
    spikes: [
      { x: 688, y: 390 }, { x: 710, y: 390 },
      { x: 528, y: 348 }, { x: 550, y: 348 },
      { x: 378, y: 295 },
    ],
    door: { x: 8, y: 145 },
    acidDrops: [
      { x: 550, y: 160, interval: 1.8, speed: 195 },
      { x: 400, y: 115, interval: 2.0, speed: 200 },
      { x: 255, y: 70,  interval: 1.7, speed: 205 },
      { x: 115, y: 30,  interval: 2.2, speed: 190 },
    ],
    movingPlatforms: [
      { x: 60, y: 158, w: 75, h: 18, endX: 140, endY: 158, speed: 55 },
    ],
  },

  // ── Level 10: Double Crush ────────────────────────────────────────────────
  {
    id: 10, name: 'DOUBLE CRUSH',
    playerSpawn: { x: 745, y: 375 },
    platforms: [
      { x: 650, y: 390, w: 150, h: 60 },
      { x: 450, y: 345, w: 155, h: 20 },
      { x: 250, y: 295, w: 150, h: 20 },
      { x: 70,  y: 245, w: 130, h: 20 },
      { x: 0,   y: 390, w: 90,  h: 60 },
    ],
    spikes: [
      { x: 688, y: 390 }, { x: 710, y: 390 },
      { x: 488, y: 345 }, { x: 510, y: 345 },
    ],
    door: { x: 10, y: 195 },
    crushers: [
      { x: 462, y: 305, w: 65, h: 18, strikeY: 328, triggerX1: 455, triggerX2: 600, speed: 480, retractSpeed: 80 },
      { x: 262, y: 255, w: 65, h: 18, strikeY: 278, triggerX1: 255, triggerX2: 395, speed: 480, retractSpeed: 80 },
    ],
    saws: [
      { x: 75, y: 230, endX: 190, endY: 230, radius: 12, speed: 100 },
    ],
    movingPlatforms: [
      { x: 155, y: 295, w: 85, h: 18, endX: 240, endY: 295, speed: 70 },
    ],
  },

  // ── Level 11: Saw Blitz ───────────────────────────────────────────────────
  {
    id: 11, name: 'SAW BLITZ',
    playerSpawn: { x: 740, y: 375 },
    platforms: [
      { x: 640, y: 390, w: 160, h: 60 },
      { x: 455, y: 345, w: 135, h: 20 },
      { x: 290, y: 285, w: 125, h: 20 },
      { x: 120, y: 225, w: 135, h: 20 },
      { x: 0,   y: 390, w: 80,  h: 60 },
    ],
    spikes: [
      { x: 678, y: 390 }, { x: 700, y: 390 },
      { x: 493, y: 345 }, { x: 515, y: 345 },
      { x: 328, y: 285 },
    ],
    door: { x: 8, y: 175 },
    saws: [
      { x: 460, y: 330, endX: 585, endY: 330, radius: 14, speed: 115 },
      { x: 295, y: 270, endX: 410, endY: 270, radius: 14, speed: 125 },
      { x: 125, y: 210, endX: 248, endY: 210, radius: 14, speed: 110 },
    ],
    firePillars: [
      { x: 555, y: 390, height: 65, onTime: 0.55, offTime: 1.6, phase: 0.4 },
    ],
  },

  // ── Level 12: Turret Alley ────────────────────────────────────────────────
  {
    id: 12, name: 'TURRET ALLEY',
    playerSpawn: { x: 745, y: 375 },
    platforms: [
      { x: 650, y: 390, w: 150, h: 60 },
      { x: 470, y: 340, w: 140, h: 20 },
      { x: 300, y: 280, w: 130, h: 20 },
      { x: 130, y: 220, w: 130, h: 20 },
      { x: 0,   y: 390, w: 95,  h: 60 },
    ],
    spikes: [
      { x: 688, y: 390 }, { x: 710, y: 390 },
      { x: 508, y: 340 }, { x: 338, y: 280 },
    ],
    door: { x: 12, y: 170 },
    turrets: [
      { x: 648, y: 300, direction: -1, interval: 2.0, bulletSpeed: 165 },
      { x: 130, y: 178, direction:  1, interval: 2.3, bulletSpeed: 155 },
    ],
    orbitBlades: [
      { cx: 535, cy: 300, radius: 40, speed: 2.2, bladeRadius: 10 },
    ],
    acidDrops: [
      { x: 385, y: 0, interval: 2.2, speed: 205 },
    ],
  },

  // ── Level 13: Fire Dance ──────────────────────────────────────────────────
  {
    id: 13, name: 'FIRE DANCE',
    playerSpawn: { x: 745, y: 380 },
    platforms: [
      { x: 640, y: 390, w: 160, h: 60 },
      { x: 440, y: 390, w: 140, h: 60 },
      { x: 200, y: 390, w: 170, h: 60 },
      { x: 0,   y: 390, w: 100, h: 60 },
      { x: 350, y: 280, w: 130, h: 20 },
      { x: 150, y: 210, w: 130, h: 20 },
      { x: 550, y: 240, w: 100, h: 20 },
    ],
    spikes: [
      { x: 678, y: 390 }, { x: 700, y: 390 },
      { x: 478, y: 390 }, { x: 500, y: 390 },
      { x: 238, y: 390 },
    ],
    door: { x: 10, y: 160 },
    firePillars: [
      { x: 320, y: 390, height: 90, onTime: 0.7,  offTime: 1.2, phase: 0.0 },
      { x: 420, y: 390, height: 90, onTime: 0.7,  offTime: 1.2, phase: 0.6 },
      { x: 530, y: 390, height: 70, onTime: 0.6,  offTime: 1.4, phase: 1.0 },
      { x: 180, y: 390, height: 85, onTime: 0.65, offTime: 1.3, phase: 0.3 },
      { x: 100, y: 390, height: 70, onTime: 0.55, offTime: 1.5, phase: 0.8 },
    ],
    movingPlatforms: [
      { x: 360, y: 235, w: 80, h: 18, endX: 540, endY: 235, speed: 75 },
    ],
    lasers: [
      { x1: 350, y1: 263, x2: 480, y2: 263, onTime: 0.9, offTime: 1.1, phase: 0.5, thickness: 3 },
    ],
  },

  // ── Level 14: Acid Crush ──────────────────────────────────────────────────
  {
    id: 14, name: 'ACID CRUSH',
    playerSpawn: { x: 745, y: 375 },
    platforms: [
      { x: 650, y: 390, w: 150, h: 60 },
      { x: 460, y: 345, w: 140, h: 20 },
      { x: 290, y: 285, w: 130, h: 20 },
      { x: 120, y: 225, w: 130, h: 20 },
      { x: 0,   y: 390, w: 90,  h: 60 },
    ],
    spikes: [
      { x: 688, y: 390 }, { x: 710, y: 390 },
      { x: 498, y: 345 }, { x: 520, y: 345 },
      { x: 328, y: 285 },
    ],
    door: { x: 10, y: 175 },
    crushers: [
      { x: 472, y: 305, w: 58, h: 18, strikeY: 328, triggerX1: 465, triggerX2: 595, speed: 520, retractSpeed: 85 },
    ],
    acidDrops: [
      { x: 530, y: 180, interval: 1.6, speed: 200 },
      { x: 360, y: 120, interval: 1.8, speed: 195 },
      { x: 190, y: 70,  interval: 1.5, speed: 210 },
    ],
    saws: [
      { x: 295, y: 270, endX: 415, endY: 270, radius: 12, speed: 105 },
    ],
    orbitBlades: [
      { cx: 165, cy: 185, radius: 38, speed: 2.3, bladeRadius: 10 },
    ],
  },

  // ── Level 15: Emerald Fury ────────────────────────────────────────────────
  {
    id: 15, name: 'EMERALD FURY',
    playerSpawn: { x: 745, y: 375 },
    platforms: [
      { x: 640, y: 390, w: 160, h: 60 },
      { x: 460, y: 340, w: 130, h: 20 },
      { x: 300, y: 280, w: 120, h: 20 },
      { x: 440, y: 210, w: 110, h: 20 },
      { x: 260, y: 160, w: 110, h: 20 },
      { x: 90,  y: 210, w: 120, h: 20 },
      { x: 0,   y: 390, w: 100, h: 60 },
    ],
    spikes: [
      { x: 678, y: 390 }, { x: 700, y: 390 },
      { x: 498, y: 340 }, { x: 520, y: 340 },
      { x: 338, y: 280 },
    ],
    door: { x: 10, y: 160 },
    saws: [
      { x: 465, y: 325, endX: 585, endY: 325, radius: 13, speed: 120 },
      { x: 305, y: 265, endX: 415, endY: 265, radius: 13, speed: 115 },
    ],
    crushers: [
      { x: 452, y: 170, w: 58, h: 18, strikeY: 193, triggerX1: 445, triggerX2: 545, speed: 550, retractSpeed: 90 },
    ],
    firePillars: [
      { x: 545, y: 390, height: 70, onTime: 0.6,  offTime: 1.5, phase: 0.5 },
      { x: 350, y: 390, height: 65, onTime: 0.55, offTime: 1.6, phase: 1.1 },
    ],
    orbitBlades: [
      { cx: 200, cy: 180, radius: 42, speed: 2.4, bladeRadius: 11 },
    ],
    turrets: [
      { x: 92, y: 170, direction: 1, interval: 2.0, bulletSpeed: 170 },
    ],
  },

  // ── Level 16: Scorched Earth ──────────────────────────────────────────────
  {
    id: 16, name: 'SCORCHED EARTH',
    playerSpawn: { x: 745, y: 375 },
    platforms: [
      { x: 640, y: 390, w: 160, h: 60 },
      { x: 450, y: 350, w: 140, h: 20 },
      { x: 280, y: 300, w: 130, h: 20 },
      { x: 100, y: 250, w: 135, h: 20 },
      { x: 0,   y: 390, w: 90,  h: 60 },
    ],
    spikes: [
      { x: 678, y: 390 }, { x: 700, y: 390 },
      { x: 488, y: 350 }, { x: 510, y: 350 },
      { x: 318, y: 300 },
    ],
    door: { x: 10, y: 200 },
    firePillars: [
      { x: 570, y: 390, height: 90, onTime: 0.7,  offTime: 1.3, phase: 0.0  },
      { x: 390, y: 390, height: 85, onTime: 0.65, offTime: 1.35, phase: 0.65 },
      { x: 200, y: 390, height: 80, onTime: 0.6,  offTime: 1.4, phase: 1.3  },
    ],
    saws: [
      { x: 455, y: 335, endX: 585, endY: 335, radius: 14, speed: 130 },
      { x: 285, y: 285, endX: 405, endY: 285, radius: 14, speed: 125 },
    ],
    turrets: [
      { x: 638, y: 310, direction: -1, interval: 1.8, bulletSpeed: 175 },
    ],
    acidDrops: [
      { x: 175, y: 80, interval: 1.5, speed: 215 },
    ],
  },

  // ── Level 17: Siege Line ──────────────────────────────────────────────────
  {
    id: 17, name: 'SIEGE LINE',
    playerSpawn: { x: 745, y: 370 },
    platforms: [
      { x: 640, y: 385, w: 160, h: 65 },
      { x: 460, y: 335, w: 135, h: 20 },
      { x: 280, y: 270, w: 140, h: 20 },
      { x: 80,  y: 210, w: 155, h: 20 },
      { x: 0,   y: 385, w: 90,  h: 65 },
    ],
    spikes: [
      { x: 678, y: 385 }, { x: 700, y: 385 },
      { x: 498, y: 335 }, { x: 520, y: 335 },
      { x: 318, y: 270 }, { x: 340, y: 270 },
    ],
    door: { x: 10, y: 160 },
    turrets: [
      { x: 638, y: 295, direction: -1, interval: 1.6, bulletSpeed: 180 },
      { x: 278, y: 228, direction: -1, interval: 1.9, bulletSpeed: 170 },
    ],
    orbitBlades: [
      { cx: 370, cy: 235, radius: 46, speed: 2.6,  bladeRadius: 12 },
      { cx: 170, cy: 175, radius: 42, speed: -2.8, bladeRadius: 11 },
    ],
    crushers: [
      { x: 472, y: 295, w: 58, h: 18, strikeY: 318, triggerX1: 465, triggerX2: 590, speed: 540, retractSpeed: 85 },
    ],
  },

  // ── Level 18: Infernal Maze ───────────────────────────────────────────────
  {
    id: 18, name: 'INFERNAL MAZE',
    playerSpawn: { x: 745, y: 375 },
    platforms: [
      { x: 640, y: 390, w: 160, h: 60 },
      { x: 460, y: 340, w: 130, h: 20 },
      { x: 580, y: 270, w: 100, h: 20 },
      { x: 380, y: 200, w: 120, h: 20 },
      { x: 200, y: 260, w: 130, h: 20 },
      { x: 60,  y: 190, w: 120, h: 20 },
      { x: 0,   y: 390, w: 95,  h: 60 },
    ],
    spikes: [
      { x: 678, y: 390 }, { x: 700, y: 390 },
      { x: 498, y: 340 },
      { x: 418, y: 200 }, { x: 440, y: 200 },
    ],
    door: { x: 10, y: 140 },
    lasers: [
      { x1: 455, y1: 323, x2: 580, y2: 323, onTime: 1.1, offTime: 1.0, phase: 0.0,  thickness: 4 },
      { x1: 380, y1: 183, x2: 500, y2: 183, onTime: 1.0, offTime: 1.1, phase: 0.55, thickness: 4 },
      { x1: 60,  y1: 173, x2: 180, y2: 173, onTime: 1.0, offTime: 1.0, phase: 1.1,  thickness: 4 },
    ],
    saws: [
      { x: 585, y: 255, endX: 678, endY: 255, radius: 13, speed: 110 },
      { x: 205, y: 245, endX: 325, endY: 245, radius: 13, speed: 120 },
    ],
    firePillars: [
      { x: 520, y: 340, height: 65, onTime: 0.6,  offTime: 1.4, phase: 0.8 },
      { x: 130, y: 390, height: 80, onTime: 0.65, offTime: 1.3, phase: 0.2 },
    ],
    acidDrops: [
      { x: 440, y: 80, interval: 1.7, speed: 200 },
    ],
  },

  // ── Level 19: Hellfire ────────────────────────────────────────────────────
  {
    id: 19, name: 'HELLFIRE',
    playerSpawn: { x: 745, y: 370 },
    platforms: [
      { x: 640, y: 385, w: 160, h: 65 },
      { x: 460, y: 335, w: 130, h: 20 },
      { x: 310, y: 275, w: 110, h: 20 },
      { x: 450, y: 210, w: 110, h: 20 },
      { x: 580, y: 160, w: 100, h: 20 },
      { x: 380, y: 140, w: 100, h: 20 },
      { x: 200, y: 175, w: 120, h: 20 },
      { x: 55,  y: 130, w: 120, h: 20 },
      { x: 0,   y: 385, w: 80,  h: 65 },
    ],
    spikes: [
      { x: 678, y: 385 }, { x: 700, y: 385 },
      { x: 498, y: 335 }, { x: 520, y: 335 },
      { x: 488, y: 210 }, { x: 618, y: 160 }, { x: 418, y: 140 },
    ],
    door: { x: 8, y: 80 },
    firePillars: [
      { x: 380, y: 335, height: 75, onTime: 0.65, offTime: 1.3, phase: 0.0 },
      { x: 550, y: 385, height: 85, onTime: 0.7,  offTime: 1.2, phase: 0.6 },
    ],
    lasers: [
      { x1: 460, y1: 318, x2: 588, y2: 318, onTime: 1.0, offTime: 1.0, phase: 0.0, thickness: 4 },
      { x1: 380, y1: 123, x2: 480, y2: 123, onTime: 0.9, offTime: 1.1, phase: 0.5, thickness: 4 },
      { x1: 55,  y1: 113, x2: 175, y2: 113, onTime: 0.9, offTime: 1.0, phase: 1.0, thickness: 4 },
    ],
    turrets: [
      { x: 638, y: 295, direction: -1, interval: 1.5, bulletSpeed: 180 },
      { x: 578, y: 118, direction: -1, interval: 1.8, bulletSpeed: 175 },
    ],
    orbitBlades: [
      { cx: 395, cy: 245, radius: 44, speed: 2.8, bladeRadius: 12 },
    ],
    acidDrops: [
      { x: 260, y: 80, interval: 1.4, speed: 215 },
    ],
    crushers: [
      { x: 322, y: 235, w: 55, h: 18, strikeY: 258, triggerX1: 315, triggerX2: 415, speed: 560, retractSpeed: 88 },
    ],
  },

  // ── Level 20: Inferno Gate ────────────────────────────────────────────────
  {
    id: 20, name: 'INFERNO GATE',
    playerSpawn: { x: 745, y: 370 },
    platforms: [
      { x: 640, y: 385, w: 160, h: 65 },
      { x: 470, y: 330, w: 130, h: 20 },
      { x: 310, y: 260, w: 110, h: 20 },
      { x: 170, y: 310, w: 100, h: 20 },
      { x: 430, y: 195, w: 110, h: 20 },
      { x: 270, y: 155, w: 110, h: 20 },
      { x: 100, y: 195, w: 120, h: 20 },
      { x: 570, y: 155, w: 110, h: 20 },
      { x: 0,   y: 385, w: 80,  h: 65 },
      { x: 55,  y: 100, w: 130, h: 20 },
    ],
    spikes: [
      { x: 678, y: 385 }, { x: 700, y: 385 },
      { x: 508, y: 330 }, { x: 530, y: 330 },
      { x: 348, y: 260 }, { x: 468, y: 195 },
      { x: 308, y: 155 }, { x: 608, y: 155 },
    ],
    door: { x: 10, y: 50 },
    saws: [
      { x: 475, y: 315, endX: 595, endY: 315, radius: 14, speed: 130 },
      { x: 315, y: 245, endX: 422, endY: 245, radius: 13, speed: 125 },
      { x: 105, y: 180, endX: 215, endY: 180, radius: 13, speed: 115 },
    ],
    firePillars: [
      { x: 540, y: 385, height: 90, onTime: 0.7,  offTime: 1.1, phase: 0.0  },
      { x: 240, y: 385, height: 80, onTime: 0.65, offTime: 1.2, phase: 0.55 },
    ],
    lasers: [
      { x1: 430, y1: 178, x2: 540, y2: 178, onTime: 0.9, offTime: 1.0, phase: 0.0,  thickness: 4 },
      { x1: 270, y1: 138, x2: 380, y2: 138, onTime: 0.9, offTime: 1.0, phase: 0.45, thickness: 4 },
      { x1: 55,  y1: 83,  x2: 185, y2: 83,  onTime: 0.9, offTime: 0.9, phase: 0.9,  thickness: 4 },
    ],
    turrets: [
      { x: 638, y: 290, direction: -1, interval: 1.5, bulletSpeed: 185 },
      { x: 428, y: 153, direction: -1, interval: 1.7, bulletSpeed: 175 },
    ],
    orbitBlades: [
      { cx: 225, cy: 270, radius: 46, speed: 3.0,  bladeRadius: 12 },
      { cx: 620, cy: 115, radius: 38, speed: -3.2, bladeRadius: 11 },
    ],
    crushers: [
      { x: 322, y: 220, w: 58, h: 18, strikeY: 243, triggerX1: 315, triggerX2: 420, speed: 580, retractSpeed: 90 },
    ],
    acidDrops: [
      { x: 185, y: 90, interval: 1.3, speed: 220 },
      { x: 380, y: 80, interval: 1.5, speed: 210 },
    ],
  },
];
