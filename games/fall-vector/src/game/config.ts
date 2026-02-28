/** Balance data and constants for Fall Vector */

/* ── Physics ───────────────────────────────────────────────── */

export const GRAVITY_STRENGTH = 0.8;
export const DEFAULT_GRAVITY = { x: 0, y: GRAVITY_STRENGTH };
export const PHYSICS_SCALE = 0.001;

/* ── Player ────────────────────────────────────────────────── */

export const PLAYER_SPEED = 7;
export const PLAYER_JUMP_FORCE = 10;
export const PLAYER_MAX_HP = 100;
export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 36;
export const PLAYER_COLOR = 0x00ffcc;
export const PLAYER_MASS = 10;

/* ── Gravi-Glove ───────────────────────────────────────────── */

export const GLOVE_MAX_STORED_MASS = 200;
export const GLOVE_MASS_SHIFT_RANGE = 200;
export const GLOVE_EXTRACT_RATE = 30;
export const GLOVE_DEPOSIT_RATE = 40;
export const GLOVE_WELL_STRENGTH = 0.003;
export const GLOVE_WELL_RADIUS = 200;
export const GLOVE_WELL_DURATION = 4;
export const GLOVE_WELL_COOLDOWN = 1.5;
export const REPULSION_STRENGTH = 0.005;
export const REPULSION_RADIUS = 150;
export const REPULSION_DURATION = 1.5;

/* ── Enemies ───────────────────────────────────────────────── */

export interface EnemyConfig {
  name: string;
  hp: number;
  speed: number;
  damage: number;
  mass: number;
  color: number;
  width: number;
  height: number;
}

export const ENEMIES: Record<string, EnemyConfig> = {
  drone: {
    name: 'Drone',
    hp: 30,
    speed: 2,
    damage: 10,
    mass: 5,
    color: 0xff3333,
    width: 20,
    height: 20,
  },
  sentinel: {
    name: 'Sentinel',
    hp: 80,
    speed: 0,
    damage: 20,
    mass: 50,
    color: 0xff6600,
    width: 28,
    height: 28,
  },
  phaser: {
    name: 'Phaser',
    hp: 20,
    speed: 5,
    damage: 15,
    mass: 3,
    color: 0xff00ff,
    width: 16,
    height: 16,
  },
};

/* ── Visual ────────────────────────────────────────────────── */

export const ZONE_COLORS: Record<string, number> = {
  down: 0x330066,
  up: 0x663300,
  left: 0x003366,
  right: 0x006633,
};

export const BG_COLOR = 0x050510;

/* ── Game ──────────────────────────────────────────────────── */

export const COYOTE_TIME = 0.2;
export const INVULN_DURATION = 1.5;
export const MAX_VELOCITY = 25;
