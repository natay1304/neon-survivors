/** Game configuration: physics tuning, visual constants, and level data */

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
export const GRAVITY = 2800;
export const JUMP_FORCE = -750;
export const SCROLL_SPEED = 400;
export const PLAYER_SIZE = 40;
export const GROUND_Y_OFFSET = 120;

// ---------------------------------------------------------------------------
// Visual
// ---------------------------------------------------------------------------
export const BG_COLOR = '#0a0a1a';
export const GROUND_COLOR = '#1a1a3e';
export const GROUND_LINE_COLOR = '#00ffff';
export const PLAYER_COLOR = '#00ffff';
export const PLAYER_GLOW_COLOR = 'rgba(0, 255, 255, 0.3)';
export const SPIKE_COLOR = '#ff3366';
export const SPIKE_GLOW_COLOR = 'rgba(255, 51, 102, 0.3)';
export const BLOCK_COLOR = '#6633ff';
export const BLOCK_GLOW_COLOR = 'rgba(102, 51, 255, 0.25)';
export const PORTAL_COLOR = '#ffcc00';
export const COIN_COLOR = '#ffcc00';
export const COIN_GLOW_COLOR = 'rgba(255, 204, 0, 0.3)';
export const PROGRESS_BAR_COLOR = '#00ffaa';
export const PROGRESS_BG_COLOR = 'rgba(255, 255, 255, 0.1)';
export const GRID_COLOR = 'rgba(255, 255, 255, 0.03)';
export const STAR_COLORS = ['#ffffff', '#aaccff', '#ffddaa', '#ff88cc'];
export const PARTICLE_COLORS = ['#00ffff', '#ff3366', '#ffcc00', '#00ffaa', '#6633ff'];
export const CEILING_LINE_COLOR = '#ff3366';

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
export const DEATH_FREEZE_TIME = 0.4;
export const DEATH_PARTICLES = 30;
export const JUMP_PARTICLES = 6;

// ---------------------------------------------------------------------------
// Obstacle types
// ---------------------------------------------------------------------------
export type ObstacleType = 'spike' | 'block' | 'spike_down' | 'double_spike' | 'tall_block';

export interface ObstacleDef {
  type: ObstacleType;
  x: number;
}

// ---------------------------------------------------------------------------
// Level data
// ---------------------------------------------------------------------------
export interface LevelData {
  id: number;
  name: string;
  color: string;
  glowColor: string;
  speed: number;
  obstacles: ObstacleDef[];
}

function generateObstacles(count: number, spacing: number, types: ObstacleType[], startX: number): ObstacleDef[] {
  const obs: ObstacleDef[] = [];
  let x = startX;
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    obs.push({ type, x });
    x += spacing;
  }
  return obs;
}

export const LEVELS: LevelData[] = [
  // ------------------------------------------------------------------
  // 1 — First Jump
  // ------------------------------------------------------------------
  {
    id: 1,
    name: 'First Jump',
    color: '#00ffff',
    glowColor: 'rgba(0, 255, 255, 0.3)',
    speed: 380,
    obstacles: [
      { type: 'spike', x: 600 },
      { type: 'spike', x: 1000 },
      { type: 'block', x: 1400 },
      { type: 'spike', x: 1800 },
      { type: 'spike', x: 2100 },
      { type: 'block', x: 2500 },
      { type: 'spike', x: 2900 },
      { type: 'spike', x: 3200 },
      { type: 'block', x: 3500 },
      { type: 'spike', x: 3900 },
      { type: 'spike', x: 4200 },
      { type: 'spike', x: 4600 },
    ],
  },

  // ------------------------------------------------------------------
  // 2 — Double Trouble
  // ------------------------------------------------------------------
  {
    id: 2,
    name: 'Double Trouble',
    color: '#ff3366',
    glowColor: 'rgba(255, 51, 102, 0.3)',
    speed: 400,
    obstacles: [
      { type: 'spike', x: 600 },
      { type: 'double_spike', x: 1000 },
      { type: 'block', x: 1400 },
      { type: 'spike', x: 1700 },
      { type: 'double_spike', x: 2100 },
      { type: 'spike', x: 2400 },
      { type: 'block', x: 2700 },
      { type: 'double_spike', x: 3000 },
      { type: 'spike', x: 3400 },
      { type: 'block', x: 3700 },
      { type: 'double_spike', x: 4000 },
      { type: 'spike', x: 4300 },
      { type: 'spike', x: 4600 },
      { type: 'double_spike', x: 5000 },
    ],
  },

  // ------------------------------------------------------------------
  // 3 — Block Party
  // ------------------------------------------------------------------
  {
    id: 3,
    name: 'Block Party',
    color: '#6633ff',
    glowColor: 'rgba(102, 51, 255, 0.3)',
    speed: 420,
    obstacles: [
      { type: 'block', x: 600 },
      { type: 'spike', x: 900 },
      { type: 'tall_block', x: 1200 },
      { type: 'spike', x: 1550 },
      { type: 'block', x: 1800 },
      { type: 'double_spike', x: 2100 },
      { type: 'tall_block', x: 2400 },
      { type: 'spike', x: 2750 },
      { type: 'block', x: 3000 },
      { type: 'spike', x: 3300 },
      { type: 'tall_block', x: 3600 },
      { type: 'double_spike', x: 3900 },
      { type: 'block', x: 4200 },
      { type: 'spike', x: 4500 },
      { type: 'double_spike', x: 4800 },
      { type: 'tall_block', x: 5200 },
    ],
  },

  // ------------------------------------------------------------------
  // 4 — Neon Rush
  // ------------------------------------------------------------------
  {
    id: 4,
    name: 'Neon Rush',
    color: '#00ffaa',
    glowColor: 'rgba(0, 255, 170, 0.3)',
    speed: 450,
    obstacles: [
      ...generateObstacles(5, 350, ['spike', 'spike', 'double_spike', 'block', 'spike'], 600),
      { type: 'tall_block', x: 2500 },
      { type: 'spike', x: 2850 },
      { type: 'double_spike', x: 3100 },
      { type: 'spike', x: 3400 },
      { type: 'block', x: 3700 },
      { type: 'spike', x: 4000 },
      { type: 'double_spike', x: 4300 },
      { type: 'tall_block', x: 4600 },
      { type: 'spike', x: 4900 },
      { type: 'spike', x: 5200 },
      { type: 'double_spike', x: 5500 },
      { type: 'spike', x: 5800 },
    ],
  },

  // ------------------------------------------------------------------
  // 5 — Final Dash
  // ------------------------------------------------------------------
  {
    id: 5,
    name: 'Final Dash',
    color: '#ffcc00',
    glowColor: 'rgba(255, 204, 0, 0.3)',
    speed: 480,
    obstacles: [
      { type: 'spike', x: 500 },
      { type: 'double_spike', x: 800 },
      { type: 'block', x: 1100 },
      { type: 'spike', x: 1350 },
      { type: 'tall_block', x: 1600 },
      { type: 'spike', x: 1900 },
      { type: 'double_spike', x: 2150 },
      { type: 'block', x: 2400 },
      { type: 'spike', x: 2650 },
      { type: 'spike', x: 2900 },
      { type: 'tall_block', x: 3150 },
      { type: 'double_spike', x: 3400 },
      { type: 'spike', x: 3650 },
      { type: 'block', x: 3900 },
      { type: 'spike', x: 4150 },
      { type: 'double_spike', x: 4400 },
      { type: 'tall_block', x: 4700 },
      { type: 'spike', x: 5000 },
      { type: 'spike', x: 5250 },
      { type: 'double_spike', x: 5500 },
      { type: 'spike', x: 5750 },
      { type: 'block', x: 6000 },
      { type: 'spike', x: 6300 },
    ],
  },
];

/** Get the total length of a level (furthest obstacle + buffer) */
export function getLevelLength(level: LevelData): number {
  if (level.obstacles.length === 0) return 2000;
  const lastX = Math.max(...level.obstacles.map(o => o.x));
  return lastX + 600;
}
