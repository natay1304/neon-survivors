/** Game configuration: physics tuning, visual constants, and level data */

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
export const GRAVITY_STRENGTH = 800;
export const GRAVITY_MIN_DIST = 30;
export const BIRD_MAX_SPEED = 500;
export const BIRD_DRAG = 0.998;
export const BIRD_INITIAL_SPEED = 200;
export const BIRD_RADIUS = 16;

// ---------------------------------------------------------------------------
// Death / Restart
// ---------------------------------------------------------------------------
export const DEATH_ANIMATION_TIME = 0.8;
export const DEATH_GRAVITY = 400;
export const FEATHER_COUNT_ON_DEATH = 12;

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
export const CAMERA_SMOOTHING = 0.08;
export const CAMERA_LOOKAHEAD = 100;

// ---------------------------------------------------------------------------
// Collectibles & Goal
// ---------------------------------------------------------------------------
export const SEED_COLLECT_RADIUS = 30;
export const GOAL_RADIUS = 50;

// ---------------------------------------------------------------------------
// Visual
// ---------------------------------------------------------------------------
export const BG_COLOR = '#0b0b2e';
export const STAR_COLORS = ['#ffffff', '#aaccff', '#ffddaa'];
export const BIRD_BODY_COLOR = '#44dd55';
export const BIRD_BELLY_COLOR = '#aaff66';
export const BIRD_BEAK_COLOR = '#ff9922';
export const BIRD_EYE_COLOR = '#111111';
export const GRAVITY_WELL_COLOR = '#8844ff';
export const SEED_COLOR = '#ffcc00';
export const GOAL_COLOR = '#00ffaa';
export const OBSTACLE_COLORS: Record<string, string> = {
  spike: '#ff3344',
  laser: '#ff2222',
  cat: '#ff8844',
  wall: '#556677',
};
export const FEATHER_COLORS = ['#44dd55', '#aaff66', '#66ee88', '#22cc44'];

// ---------------------------------------------------------------------------
// Par times (seconds) per level for 2-star rating
// ---------------------------------------------------------------------------
export const PAR_TIMES = [
  10, // level 1
  12,
  14,
  16,
  18,
  20,
  22,
  24,
  28,
  32, // level 10
];

// ---------------------------------------------------------------------------
// Level data
// ---------------------------------------------------------------------------
export interface LevelData {
  id: number;
  name: string;
  width: number;
  height: number;
  birdSpawn: { x: number; y: number; vx: number; vy: number };
  goal: { x: number; y: number };
  obstacles: Array<{ type: string; x: number; y: number; w: number; h: number }>;
  collectibles: Array<{ x: number; y: number }>;
}

export const LEVELS: LevelData[] = [
  // ------------------------------------------------------------------
  // 1 — First Flight
  // ------------------------------------------------------------------
  {
    id: 1,
    name: 'First Flight',
    width: 1200,
    height: 600,
    birdSpawn: { x: 100, y: 300, vx: BIRD_INITIAL_SPEED, vy: 0 },
    goal: { x: 1100, y: 300 },
    obstacles: [],
    collectibles: [
      { x: 350, y: 300 },
      { x: 550, y: 300 },
      { x: 750, y: 300 },
    ],
  },

  // ------------------------------------------------------------------
  // 2 — Gentle Curve
  // ------------------------------------------------------------------
  {
    id: 2,
    name: 'Gentle Curve',
    width: 1400,
    height: 700,
    birdSpawn: { x: 100, y: 500, vx: BIRD_INITIAL_SPEED, vy: 0 },
    goal: { x: 1300, y: 200 },
    obstacles: [
      { type: 'wall', x: 650, y: 300, w: 40, h: 250 },
    ],
    collectibles: [
      { x: 400, y: 450 },
      { x: 700, y: 180 },
      { x: 1000, y: 200 },
    ],
  },

  // ------------------------------------------------------------------
  // 3 — The Gap
  // ------------------------------------------------------------------
  {
    id: 3,
    name: 'The Gap',
    width: 1400,
    height: 700,
    birdSpawn: { x: 100, y: 350, vx: BIRD_INITIAL_SPEED, vy: 0 },
    goal: { x: 1300, y: 350 },
    obstacles: [
      { type: 'wall', x: 600, y: 0, w: 40, h: 280 },
      { type: 'wall', x: 600, y: 420, w: 40, h: 280 },
    ],
    collectibles: [
      { x: 350, y: 350 },
      { x: 620, y: 350 },
      { x: 950, y: 350 },
    ],
  },

  // ------------------------------------------------------------------
  // 4 — Slingshot
  // ------------------------------------------------------------------
  {
    id: 4,
    name: 'Slingshot',
    width: 1400,
    height: 800,
    birdSpawn: { x: 100, y: 600, vx: BIRD_INITIAL_SPEED * 0.8, vy: 0 },
    goal: { x: 1200, y: 150 },
    obstacles: [
      { type: 'wall', x: 500, y: 200, w: 300, h: 40 },
      { type: 'spike', x: 800, y: 500, w: 60, h: 60 },
    ],
    collectibles: [
      { x: 300, y: 650 },
      { x: 500, y: 500 },
      { x: 700, y: 300 },
      { x: 1000, y: 180 },
    ],
  },

  // ------------------------------------------------------------------
  // 5 — Cat Nap
  // ------------------------------------------------------------------
  {
    id: 5,
    name: 'Cat Nap',
    width: 1600,
    height: 700,
    birdSpawn: { x: 100, y: 350, vx: BIRD_INITIAL_SPEED, vy: 0 },
    goal: { x: 1500, y: 350 },
    obstacles: [
      { type: 'cat', x: 400, y: 250, w: 50, h: 50 },
      { type: 'cat', x: 600, y: 450, w: 50, h: 50 },
      { type: 'cat', x: 800, y: 200, w: 50, h: 50 },
      { type: 'cat', x: 1000, y: 500, w: 50, h: 50 },
      { type: 'cat', x: 1200, y: 300, w: 50, h: 50 },
    ],
    collectibles: [
      { x: 300, y: 350 },
      { x: 500, y: 350 },
      { x: 700, y: 350 },
      { x: 900, y: 350 },
      { x: 1100, y: 350 },
    ],
  },

  // ------------------------------------------------------------------
  // 6 — Laser Maze
  // ------------------------------------------------------------------
  {
    id: 6,
    name: 'Laser Maze',
    width: 1600,
    height: 700,
    birdSpawn: { x: 100, y: 350, vx: BIRD_INITIAL_SPEED * 0.9, vy: 0 },
    goal: { x: 1500, y: 350 },
    obstacles: [
      { type: 'laser', x: 400, y: 0, w: 20, h: 280 },
      { type: 'laser', x: 400, y: 420, w: 20, h: 280 },
      { type: 'laser', x: 700, y: 0, w: 20, h: 400 },
      { type: 'laser', x: 700, y: 540, w: 20, h: 160 },
      { type: 'laser', x: 1000, y: 0, w: 20, h: 200 },
      { type: 'laser', x: 1000, y: 340, w: 20, h: 360 },
      { type: 'laser', x: 1300, y: 0, w: 20, h: 320 },
      { type: 'laser', x: 1300, y: 460, w: 20, h: 240 },
    ],
    collectibles: [
      { x: 410, y: 350 },
      { x: 710, y: 470 },
      { x: 1010, y: 270 },
      { x: 1310, y: 390 },
    ],
  },

  // ------------------------------------------------------------------
  // 7 — The Loop
  // ------------------------------------------------------------------
  {
    id: 7,
    name: 'The Loop',
    width: 1600,
    height: 800,
    birdSpawn: { x: 100, y: 400, vx: BIRD_INITIAL_SPEED * 0.7, vy: 0 },
    goal: { x: 1500, y: 400 },
    obstacles: [
      { type: 'wall', x: 500, y: 150, w: 400, h: 40 },
      { type: 'wall', x: 500, y: 610, w: 400, h: 40 },
      { type: 'wall', x: 500, y: 150, w: 40, h: 500 },
      { type: 'spike', x: 1100, y: 350, w: 80, h: 80 },
    ],
    collectibles: [
      { x: 300, y: 400 },
      { x: 700, y: 200 },
      { x: 880, y: 400 },
      { x: 700, y: 590 },
      { x: 1300, y: 400 },
    ],
  },

  // ------------------------------------------------------------------
  // 8 — Narrow Pass
  // ------------------------------------------------------------------
  {
    id: 8,
    name: 'Narrow Pass',
    width: 1800,
    height: 700,
    birdSpawn: { x: 100, y: 350, vx: BIRD_INITIAL_SPEED * 0.8, vy: 0 },
    goal: { x: 1700, y: 350 },
    obstacles: [
      { type: 'wall', x: 350, y: 0, w: 30, h: 300 },
      { type: 'wall', x: 350, y: 400, w: 30, h: 300 },
      { type: 'wall', x: 650, y: 0, w: 30, h: 320 },
      { type: 'wall', x: 650, y: 380, w: 30, h: 320 },
      { type: 'wall', x: 950, y: 0, w: 30, h: 280 },
      { type: 'wall', x: 950, y: 420, w: 30, h: 280 },
      { type: 'wall', x: 1250, y: 0, w: 30, h: 310 },
      { type: 'wall', x: 1250, y: 390, w: 30, h: 310 },
      { type: 'spike', x: 500, y: 350, w: 40, h: 40 },
      { type: 'spike', x: 800, y: 350, w: 40, h: 40 },
      { type: 'spike', x: 1100, y: 350, w: 40, h: 40 },
    ],
    collectibles: [
      { x: 365, y: 350 },
      { x: 665, y: 350 },
      { x: 965, y: 350 },
      { x: 1265, y: 350 },
      { x: 1500, y: 350 },
    ],
  },

  // ------------------------------------------------------------------
  // 9 — Gravity Gauntlet
  // ------------------------------------------------------------------
  {
    id: 9,
    name: 'Gravity Gauntlet',
    width: 2000,
    height: 800,
    birdSpawn: { x: 100, y: 400, vx: BIRD_INITIAL_SPEED * 0.9, vy: 0 },
    goal: { x: 1900, y: 400 },
    obstacles: [
      { type: 'spike', x: 350, y: 300, w: 50, h: 50 },
      { type: 'spike', x: 350, y: 500, w: 50, h: 50 },
      { type: 'cat', x: 550, y: 200, w: 50, h: 50 },
      { type: 'wall', x: 700, y: 0, w: 30, h: 350 },
      { type: 'wall', x: 700, y: 450, w: 30, h: 350 },
      { type: 'laser', x: 900, y: 300, w: 200, h: 20 },
      { type: 'spike', x: 1100, y: 400, w: 60, h: 60 },
      { type: 'cat', x: 1300, y: 250, w: 50, h: 50 },
      { type: 'cat', x: 1300, y: 550, w: 50, h: 50 },
      { type: 'wall', x: 1500, y: 0, w: 30, h: 370 },
      { type: 'wall', x: 1500, y: 430, w: 30, h: 370 },
      { type: 'spike', x: 1700, y: 350, w: 50, h: 50 },
      { type: 'spike', x: 1700, y: 450, w: 50, h: 50 },
    ],
    collectibles: [
      { x: 350, y: 400 },
      { x: 600, y: 350 },
      { x: 850, y: 250 },
      { x: 1050, y: 500 },
      { x: 1400, y: 400 },
      { x: 1800, y: 400 },
    ],
  },

  // ------------------------------------------------------------------
  // 10 — Final Feast
  // ------------------------------------------------------------------
  {
    id: 10,
    name: 'Final Feast',
    width: 2200,
    height: 900,
    birdSpawn: { x: 100, y: 700, vx: BIRD_INITIAL_SPEED * 0.7, vy: -40 },
    goal: { x: 2100, y: 150 },
    obstacles: [
      { type: 'wall', x: 300, y: 400, w: 30, h: 500 },
      { type: 'spike', x: 450, y: 300, w: 50, h: 50 },
      { type: 'cat', x: 600, y: 500, w: 60, h: 60 },
      { type: 'laser', x: 750, y: 0, w: 20, h: 350 },
      { type: 'laser', x: 750, y: 500, w: 20, h: 400 },
      { type: 'wall', x: 950, y: 200, w: 350, h: 30 },
      { type: 'spike', x: 1000, y: 350, w: 50, h: 50 },
      { type: 'spike', x: 1150, y: 350, w: 50, h: 50 },
      { type: 'cat', x: 1350, y: 150, w: 60, h: 60 },
      { type: 'wall', x: 1500, y: 300, w: 30, h: 600 },
      { type: 'laser', x: 1650, y: 0, w: 20, h: 400 },
      { type: 'laser', x: 1650, y: 550, w: 20, h: 350 },
      { type: 'spike', x: 1800, y: 250, w: 60, h: 60 },
      { type: 'spike', x: 1800, y: 450, w: 60, h: 60 },
      { type: 'cat', x: 1950, y: 350, w: 60, h: 60 },
      { type: 'wall', x: 2000, y: 0, w: 30, h: 300 },
    ],
    collectibles: [
      { x: 200, y: 700 },
      { x: 400, y: 500 },
      { x: 600, y: 300 },
      { x: 850, y: 430 },
      { x: 1100, y: 180 },
      { x: 1400, y: 250 },
      { x: 1550, y: 450 },
      { x: 1750, y: 350 },
      { x: 2000, y: 200 },
    ],
  },
];
