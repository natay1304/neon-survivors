/** Game balance data — weapons, enemies, rooms, upgrades */

export interface WeaponDef {
  name: string;
  color: string;
  glow: string;
  icon: string;
  damage: number;
  cooldown: number;
  speed: number;
  count: number;
  spread: number;
  pierce: number;
  size: number;
  range: number;
}

export const WEAPONS: Record<string, WeaponDef[]> = {
  blaster: [
    { name: 'Blaster I', color: '#00ccff', glow: '#0066cc', icon: '🔫', damage: 18, cooldown: 0.30, speed: 480, count: 1, spread: 0, pierce: 1, size: 4, range: 1.0 },
    { name: 'Blaster II', color: '#00ccff', glow: '#0066cc', icon: '🔫', damage: 22, cooldown: 0.26, speed: 520, count: 1, spread: 0, pierce: 1, size: 4, range: 1.1 },
    { name: 'Blaster III', color: '#00ccff', glow: '#0066cc', icon: '🔫', damage: 28, cooldown: 0.22, speed: 560, count: 2, spread: 0.12, pierce: 1, size: 4, range: 1.2 },
  ],
  scatter: [
    { name: 'Scatter I', color: '#ff8833', glow: '#cc5500', icon: '💥', damage: 12, cooldown: 0.60, speed: 400, count: 4, spread: 0.35, pierce: 1, size: 4, range: 0.5 },
    { name: 'Scatter II', color: '#ff8833', glow: '#cc5500', icon: '💥', damage: 14, cooldown: 0.55, speed: 420, count: 5, spread: 0.35, pierce: 1, size: 4, range: 0.55 },
    { name: 'Scatter III', color: '#ff8833', glow: '#cc5500', icon: '💥', damage: 16, cooldown: 0.45, speed: 450, count: 6, spread: 0.40, pierce: 1, size: 5, range: 0.6 },
  ],
  rapid: [
    { name: 'Rapid I', color: '#ffee33', glow: '#ccaa00', icon: '⚡', damage: 8, cooldown: 0.09, speed: 550, count: 1, spread: 0.06, pierce: 1, size: 3, range: 0.8 },
    { name: 'Rapid II', color: '#ffee33', glow: '#ccaa00', icon: '⚡', damage: 10, cooldown: 0.07, speed: 580, count: 1, spread: 0.05, pierce: 1, size: 3, range: 0.9 },
    { name: 'Rapid III', color: '#ffee33', glow: '#ccaa00', icon: '⚡', damage: 12, cooldown: 0.06, speed: 600, count: 1, spread: 0.04, pierce: 2, size: 3, range: 1.0 },
  ],
  pierce: [
    { name: 'Pierce I', color: '#cc44ff', glow: '#8800cc', icon: '🔮', damage: 22, cooldown: 0.40, speed: 600, count: 1, spread: 0, pierce: 3, size: 5, range: 1.4 },
    { name: 'Pierce II', color: '#cc44ff', glow: '#8800cc', icon: '🔮', damage: 28, cooldown: 0.35, speed: 650, count: 1, spread: 0, pierce: 4, size: 5, range: 1.5 },
    { name: 'Pierce III', color: '#cc44ff', glow: '#8800cc', icon: '🔮', damage: 35, cooldown: 0.30, speed: 700, count: 2, spread: 0.08, pierce: 5, size: 6, range: 1.6 },
  ],
  plasma: [
    { name: 'Plasma I', color: '#33ff66', glow: '#00cc33', icon: '🟢', damage: 35, cooldown: 0.70, speed: 350, count: 1, spread: 0, pierce: 2, size: 7, range: 1.2 },
    { name: 'Plasma II', color: '#33ff66', glow: '#00cc33', icon: '🟢', damage: 45, cooldown: 0.60, speed: 380, count: 1, spread: 0, pierce: 2, size: 8, range: 1.3 },
    { name: 'Plasma III', color: '#33ff66', glow: '#00cc33', icon: '🟢', damage: 55, cooldown: 0.50, speed: 400, count: 2, spread: 0.10, pierce: 3, size: 9, range: 1.4 },
  ],
};

export interface EnemyDef {
  name: string;
  hp: number;
  speed: number;
  damage: number;
  scoreValue: number;
  color: string;
  size: number;
  shape: 'circle' | 'triangle' | 'diamond' | 'square' | 'star4' | 'spike' | 'hexagon';
  canShoot: boolean;
  shootCooldown: number;
  shootSpeed: number;
  isBoss?: boolean;
}

export const ENEMIES: Record<string, EnemyDef> = {
  drone: {
    name: 'Drone', hp: 30, speed: 70, damage: 8, scoreValue: 10,
    color: '#ff3333', size: 10, shape: 'circle',
    canShoot: false, shootCooldown: 0, shootSpeed: 0,
  },
  strider: {
    name: 'Strider', hp: 18, speed: 160, damage: 6, scoreValue: 15,
    color: '#cc44ff', size: 9, shape: 'diamond',
    canShoot: false, shootCooldown: 0, shootSpeed: 0,
  },
  turret: {
    name: 'Turret', hp: 45, speed: 30, damage: 12, scoreValue: 25,
    color: '#ffcc00', size: 11, shape: 'square',
    canShoot: true, shootCooldown: 1.8, shootSpeed: 300,
  },
  hulk: {
    name: 'Hulk', hp: 120, speed: 35, damage: 20, scoreValue: 35,
    color: '#33cc55', size: 16, shape: 'hexagon',
    canShoot: false, shootCooldown: 0, shootSpeed: 0,
  },
  phantom: {
    name: 'Phantom', hp: 25, speed: 100, damage: 10, scoreValue: 20,
    color: '#3388ff', size: 10, shape: 'triangle',
    canShoot: false, shootCooldown: 0, shootSpeed: 0,
  },
  sentinel: {
    name: 'Sentinel', hp: 60, speed: 50, damage: 14, scoreValue: 30,
    color: '#ff8844', size: 12, shape: 'star4',
    canShoot: true, shootCooldown: 2.2, shootSpeed: 250,
  },
  overlord: {
    name: 'Overlord', hp: 600, speed: 40, damage: 25, scoreValue: 200,
    color: '#ff0066', size: 26, shape: 'star4',
    canShoot: true, shootCooldown: 1.2, shootSpeed: 280,
    isBoss: true,
  },
};

export interface RoomDef {
  enemies: { type: string; count: number }[];
  arenaWidth: number;
  arenaHeight: number;
}

export interface FloorDef {
  name: string;
  color: string;
  rooms: number;
  enemyPool: string[];
  minEnemies: number;
  maxEnemies: number;
  hpScale: number;
  bossEvery: number;
}

export const FLOORS: FloorDef[] = [
  { name: 'Sublevel Alpha', color: '#0066ff', rooms: 4, enemyPool: ['drone', 'strider'], minEnemies: 6, maxEnemies: 10, hpScale: 1.0, bossEvery: 4 },
  { name: 'Sublevel Beta', color: '#9933ff', rooms: 5, enemyPool: ['drone', 'strider', 'turret', 'phantom'], minEnemies: 8, maxEnemies: 14, hpScale: 1.3, bossEvery: 5 },
  { name: 'Sublevel Gamma', color: '#ff3366', rooms: 5, enemyPool: ['strider', 'turret', 'hulk', 'phantom', 'sentinel'], minEnemies: 10, maxEnemies: 18, hpScale: 1.7, bossEvery: 5 },
  { name: 'The Core', color: '#ff6600', rooms: 6, enemyPool: ['turret', 'hulk', 'phantom', 'sentinel'], minEnemies: 12, maxEnemies: 22, hpScale: 2.2, bossEvery: 6 },
];

export const TOTAL_FLOORS = FLOORS.length;

export interface UpgradeDef {
  name: string;
  description: string;
  icon: string;
  apply: (stats: UpgradeStats) => void;
}

export interface UpgradeStats {
  maxHp: number;
  speed: number;
  armor: number;
  damageMultiplier: number;
  speedMultiplier: number;
}

export const UPGRADES: UpgradeDef[] = [
  { name: 'Reinforced Plating', description: '+25 Max HP', icon: '❤️', apply: (s) => { s.maxHp += 25; } },
  { name: 'Overdrive', description: '+12% Speed', icon: '💨', apply: (s) => { s.speedMultiplier += 0.12; } },
  { name: 'Power Cell', description: '+15% Damage', icon: '⚔️', apply: (s) => { s.damageMultiplier += 0.15; } },
  { name: 'Nano Armor', description: '+1 Armor', icon: '🛡️', apply: (s) => { s.armor += 1; } },
  { name: 'Adrenaline', description: '+8% Speed, +8% Damage', icon: '💉', apply: (s) => { s.speedMultiplier += 0.08; s.damageMultiplier += 0.08; } },
  { name: 'Vitality Core', description: '+40 Max HP', icon: '💖', apply: (s) => { s.maxHp += 40; } },
];

export const ARENA_W = 1200;
export const ARENA_H = 900;
export const WALL_THICKNESS = 20;
export const SPAWN_MARGIN = 60;

export const WEAPON_POOL = ['blaster', 'scatter', 'rapid', 'pierce', 'plasma'];
