/** Game balance data — weapons, enemies, levels */

export interface WeaponDef {
  name: string;
  color: string;
  glow: string;
  icon: string;
  damage: number;
  cooldown: number;
  speed: number;       // projectile speed (0 = instant)
  count: number;       // projectiles per shot
  spread: number;      // spread angle in radians
  pierce: number;
  size: number;        // projectile radius
  range: number;       // max lifetime in seconds
  explosive: boolean;
  defaultAmmo: number; // ammo when picked up (-1 = infinite)
}

export const WEAPONS: Record<string, WeaponDef> = {
  pistol: {
    name: 'Pistol', color: '#ffffff', glow: '#aaaaaa', icon: '🔫',
    damage: 20, cooldown: 0.35, speed: 500, count: 1, spread: 0,
    pierce: 1, size: 4, range: 1.2, explosive: false, defaultAmmo: -1,
  },
  shotgun: {
    name: 'Shotgun', color: '#ff8833', glow: '#cc5500', icon: '💥',
    damage: 15, cooldown: 0.7, speed: 420, count: 5, spread: 0.4,
    pierce: 1, size: 4, range: 0.5, explosive: false, defaultAmmo: 20,
  },
  smg: {
    name: 'SMG', color: '#ffee33', glow: '#ccaa00', icon: '🔧',
    damage: 10, cooldown: 0.08, speed: 550, count: 1, spread: 0.08,
    pierce: 1, size: 3, range: 0.9, explosive: false, defaultAmmo: 60,
  },
  rocket: {
    name: 'Rocket', color: '#ff3333', glow: '#cc0000', icon: '🚀',
    damage: 60, cooldown: 1.0, speed: 300, count: 1, spread: 0,
    pierce: 1, size: 6, range: 2.0, explosive: true, defaultAmmo: 8,
  },
  laser: {
    name: 'Laser', color: '#00ffff', glow: '#0088cc', icon: '⚡',
    damage: 18, cooldown: 0.12, speed: 900, count: 1, spread: 0.03,
    pierce: 3, size: 3, range: 0.8, explosive: false, defaultAmmo: 30,
  },
  flamethrower: {
    name: 'Flamer', color: '#ff6600', glow: '#ff3300', icon: '🔥',
    damage: 8, cooldown: 0.04, speed: 250, count: 1, spread: 0.25,
    pierce: 2, size: 5, range: 0.35, explosive: false, defaultAmmo: 50,
  },
};

export interface EnemyDef {
  name: string;
  hp: number;
  speed: number;
  damage: number;
  scoreValue: number;
  color: string;
  size: number;
  shape: 'circle' | 'triangle' | 'diamond' | 'square' | 'star4' | 'spike';
  canShoot: boolean;
  shootCooldown: number;
  shootSpeed: number;
  isBoss?: boolean;
}

export const ENEMIES: Record<string, EnemyDef> = {
  grunt: {
    name: 'Grunt', hp: 40, speed: 60, damage: 10, scoreValue: 10,
    color: '#ff3333', size: 12, shape: 'circle',
    canShoot: false, shootCooldown: 0, shootSpeed: 0,
  },
  runner: {
    name: 'Runner', hp: 20, speed: 150, damage: 8, scoreValue: 15,
    color: '#cc44ff', size: 10, shape: 'diamond',
    canShoot: false, shootCooldown: 0, shootSpeed: 0,
  },
  shooter: {
    name: 'Shooter', hp: 35, speed: 50, damage: 12, scoreValue: 25,
    color: '#ffcc00', size: 11, shape: 'triangle',
    canShoot: true, shootCooldown: 2.0, shootSpeed: 280,
  },
  tank: {
    name: 'Tank', hp: 150, speed: 30, damage: 20, scoreValue: 40,
    color: '#33cc55', size: 16, shape: 'square',
    canShoot: false, shootCooldown: 0, shootSpeed: 0,
  },
  flanker: {
    name: 'Flanker', hp: 30, speed: 80, damage: 12, scoreValue: 20,
    color: '#3388ff', size: 11, shape: 'triangle',
    canShoot: false, shootCooldown: 0, shootSpeed: 0,
  },
  boss: {
    name: 'Boss', hp: 800, speed: 40, damage: 30, scoreValue: 200,
    color: '#ff0066', size: 28, shape: 'star4',
    canShoot: true, shootCooldown: 1.5, shootSpeed: 250,
    isBoss: true,
  },
};

export interface LevelDef {
  enemies: { type: string; count: number }[];
  crates: number;
  barrels: number;
  arenaWidth: number;
  arenaHeight: number;
  isBoss: boolean;
}

export const LEVELS: LevelDef[] = [
  // Zone 1: Easy
  { enemies: [{ type: 'grunt', count: 12 }], crates: 4, barrels: 2, arenaWidth: 1200, arenaHeight: 900, isBoss: false },
  { enemies: [{ type: 'grunt', count: 10 }, { type: 'runner', count: 5 }], crates: 5, barrels: 3, arenaWidth: 1300, arenaHeight: 950, isBoss: false },
  { enemies: [{ type: 'grunt', count: 6 }, { type: 'runner', count: 4 }, { type: 'boss', count: 1 }], crates: 6, barrels: 4, arenaWidth: 1400, arenaHeight: 1000, isBoss: true },
  // Zone 2: Medium
  { enemies: [{ type: 'grunt', count: 12 }, { type: 'shooter', count: 5 }, { type: 'runner', count: 5 }], crates: 5, barrels: 4, arenaWidth: 1400, arenaHeight: 1000, isBoss: false },
  { enemies: [{ type: 'shooter', count: 8 }, { type: 'tank', count: 3 }, { type: 'flanker', count: 5 }], crates: 6, barrels: 5, arenaWidth: 1500, arenaHeight: 1050, isBoss: false },
  { enemies: [{ type: 'grunt', count: 8 }, { type: 'tank', count: 4 }, { type: 'flanker', count: 4 }, { type: 'boss', count: 1 }], crates: 7, barrels: 5, arenaWidth: 1600, arenaHeight: 1100, isBoss: true },
  // Zone 3: Hard
  { enemies: [{ type: 'runner', count: 12 }, { type: 'shooter', count: 8 }, { type: 'tank', count: 5 }], crates: 6, barrels: 6, arenaWidth: 1600, arenaHeight: 1100, isBoss: false },
  { enemies: [{ type: 'flanker', count: 10 }, { type: 'shooter', count: 10 }, { type: 'tank', count: 6 }, { type: 'runner', count: 8 }], crates: 8, barrels: 7, arenaWidth: 1800, arenaHeight: 1200, isBoss: false },
  { enemies: [{ type: 'grunt', count: 10 }, { type: 'shooter', count: 8 }, { type: 'tank', count: 5 }, { type: 'flanker', count: 6 }, { type: 'boss', count: 1 }], crates: 10, barrels: 8, arenaWidth: 2000, arenaHeight: 1300, isBoss: true },
];

export const TOTAL_LEVELS = LEVELS.length;

// Pickup weapon pool (weighted)
export const WEAPON_DROPS = ['shotgun', 'smg', 'rocket', 'laser', 'flamethrower'];

// Explosion radius for rockets and barrels
export const EXPLOSION_RADIUS = 80;
export const EXPLOSION_DAMAGE = 50;

// Arena wall thickness for collision
export const WALL_THICKNESS = 20;

// Spawn distance from arena edges
export const SPAWN_MARGIN = 50;
