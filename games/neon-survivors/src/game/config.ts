/** Game balance data — weapons, enemies, upgrades, progression */

export interface WeaponLevel {
  damage: number;
  cooldown: number;
  count: number;       // projectiles or hits
  speed: number;       // projectile speed or 0
  pierce: number;      // how many enemies to go through
  size: number;        // projectile/area radius
  knockback: number;
}

export interface WeaponDef {
  name: string;
  description: string;
  color: string;
  glow: string;
  icon: string;
  levels: WeaponLevel[];
}

export const WEAPONS: Record<string, WeaponDef> = {
  magic_orb: {
    name: 'Magic Orb',
    description: 'Fires orbs in your direction',
    color: '#00ccff',
    glow: '#0088ff',
    icon: '🔮',
    levels: [
      { damage: 25, cooldown: 0.55, count: 1, speed: 380, pierce: 1, size: 8, knockback: 40 },
      { damage: 25, cooldown: 0.65, count: 1, speed: 400, pierce: 1, size: 9, knockback: 35 },
      { damage: 30, cooldown: 0.60, count: 2, speed: 420, pierce: 1, size: 10, knockback: 40 },
      { damage: 35, cooldown: 0.50, count: 2, speed: 440, pierce: 2, size: 11, knockback: 45 },
      { damage: 45, cooldown: 0.40, count: 3, speed: 470, pierce: 2, size: 12, knockback: 50 },
    ],
  },
  holy_aura: {
    name: 'Holy Aura',
    description: 'Damages nearby enemies',
    color: '#aa44ff',
    glow: '#7700cc',
    icon: '✨',
    levels: [
      { damage: 8,  cooldown: 0.5, count: 1, speed: 0, pierce: 99, size: 80,  knockback: 20 },
      { damage: 12, cooldown: 0.45, count: 1, speed: 0, pierce: 99, size: 100, knockback: 25 },
      { damage: 16, cooldown: 0.4, count: 1, speed: 0, pierce: 99, size: 120, knockback: 30 },
      { damage: 22, cooldown: 0.35, count: 1, speed: 0, pierce: 99, size: 145, knockback: 35 },
      { damage: 30, cooldown: 0.3, count: 1, speed: 0, pierce: 99, size: 170, knockback: 40 },
    ],
  },
  lightning: {
    name: 'Lightning',
    description: 'Strikes a random nearby enemy',
    color: '#ffff44',
    glow: '#ffcc00',
    icon: '⚡',
    levels: [
      { damage: 40, cooldown: 1.5, count: 1, speed: 0, pierce: 1, size: 300, knockback: 0 },
      { damage: 55, cooldown: 1.3, count: 1, speed: 0, pierce: 1, size: 350, knockback: 0 },
      { damage: 70, cooldown: 1.1, count: 2, speed: 0, pierce: 1, size: 400, knockback: 0 },
      { damage: 90, cooldown: 0.9, count: 2, speed: 0, pierce: 1, size: 450, knockback: 0 },
      { damage: 120, cooldown: 0.7, count: 3, speed: 0, pierce: 1, size: 500, knockback: 0 },
    ],
  },
  frost_nova: {
    name: 'Frost Nova',
    description: 'Freezes and damages enemies around you',
    color: '#44ddff',
    glow: '#0099cc',
    icon: '❄️',
    levels: [
      { damage: 25, cooldown: 2.5, count: 1, speed: 0, pierce: 99, size: 120, knockback: 80 },
      { damage: 35, cooldown: 2.2, count: 1, speed: 0, pierce: 99, size: 150, knockback: 100 },
      { damage: 45, cooldown: 1.9, count: 1, speed: 0, pierce: 99, size: 180, knockback: 120 },
      { damage: 60, cooldown: 1.6, count: 1, speed: 0, pierce: 99, size: 210, knockback: 140 },
      { damage: 80, cooldown: 1.3, count: 1, speed: 0, pierce: 99, size: 250, knockback: 160 },
    ],
  },
  fire_trail: {
    name: 'Fire Trail',
    description: 'Leaves fire behind you as you move',
    color: '#ff6600',
    glow: '#ff3300',
    icon: '🔥',
    levels: [
      { damage: 15, cooldown: 0.2, count: 1, speed: 0, pierce: 99, size: 18, knockback: 0 },
      { damage: 20, cooldown: 0.18, count: 1, speed: 0, pierce: 99, size: 22, knockback: 0 },
      { damage: 28, cooldown: 0.15, count: 1, speed: 0, pierce: 99, size: 26, knockback: 0 },
      { damage: 38, cooldown: 0.12, count: 1, speed: 0, pierce: 99, size: 30, knockback: 0 },
      { damage: 50, cooldown: 0.1, count: 1, speed: 0, pierce: 99, size: 36, knockback: 0 },
    ],
  },
};

export interface EnemyDef {
  name: string;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  color: string;
  size: number;
  shape: 'circle' | 'triangle' | 'diamond' | 'square' | 'hexagon' | 'rocket' | 'spike' | 'star4';
  unlockTime: number;  // seconds into game
  weight: number;      // spawn probability weight
  isBoss?: boolean;
}

export const ENEMIES: Record<string, EnemyDef> = {
  zombie:   { name: 'Zombie',   hp: 30,   speed: 55,  damage: 10, xp: 1, color: '#cc3333', size: 12, shape: 'spike',    unlockTime: 0,   weight: 10 },
  bat:      { name: 'Bat',      hp: 15,   speed: 180, damage: 5,  xp: 1, color: '#9933cc', size: 9,  shape: 'diamond',  unlockTime: 25,  weight: 8 },
  wisp:     { name: 'Wisp',     hp: 12,   speed: 220, damage: 7,  xp: 2, color: '#44ffcc', size: 7,  shape: 'triangle', unlockTime: 45,  weight: 6 },
  skeleton: { name: 'Skeleton', hp: 50,   speed: 85,  damage: 15, xp: 3, color: '#ccbb88', size: 13, shape: 'star4',    unlockTime: 90,  weight: 6 },
  ghost:    { name: 'Ghost',    hp: 25,   speed: 135, damage: 8,  xp: 2, color: '#88bbff', size: 11, shape: 'triangle', unlockTime: 150, weight: 5 },
  demon:    { name: 'Demon',    hp: 100,  speed: 40,  damage: 25, xp: 5, color: '#ff4400', size: 16, shape: 'spike',    unlockTime: 240, weight: 3 },
  warlock:  { name: 'Warlock',  hp: 60,   speed: 65,  damage: 20, xp: 4, color: '#ff3366', size: 13, shape: 'hexagon',  unlockTime: 20,  weight: 4 },
  // Wave/circle event enemy types (weight: 0 — spawned by event system, not regular waves)
  swarm:    { name: 'Swarm',    hp: 20,   speed: 250, damage: 12, xp: 1, color: '#ff8800', size: 8,  shape: 'triangle', unlockTime: 0,   weight: 0 },
  ring:     { name: 'Ring',     hp: 25,   speed: 0,   damage: 15, xp: 1, color: '#44aaff', size: 9,  shape: 'diamond',  unlockTime: 0,   weight: 0 },
  miniboss: { name: 'Miniboss', hp: 500,  speed: 30,  damage: 30, xp: 20, color: '#ffaa00', size: 24, shape: 'star4',   unlockTime: 120, weight: 0, isBoss: true },
  boss:     { name: 'Boss',     hp: 2000, speed: 25,  damage: 50, xp: 100, color: '#ff00ff', size: 32, shape: 'spike',   unlockTime: 300, weight: 0, isBoss: true },
};

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'new_weapon' | 'weapon_level' | 'stat';
  weaponType?: string;
  stat?: keyof typeof STAT_UPGRADES;
}

export const STAT_UPGRADES = {
  damage:      { name: '+10% Damage',       icon: '⚔️',  mult: 0.10 },
  speed:       { name: '+8% Move Speed',    icon: '👟',  mult: 0.08 },
  maxHp:       { name: '+20 Max HP',        icon: '❤️',  mult: 20 },
  pickupRange: { name: '+25% Pickup Range', icon: '🧲',  mult: 0.25 },
  armor:       { name: '+1 Armor',          icon: '🛡️',  mult: 1 },
  cooldown:    { name: '-8% Cooldowns',     icon: '⏱️',  mult: 0.08 },
};

// XP needed for next level
export function xpForLevel(level: number): number {
  return 5 * level + Math.floor(level * level * 0.5);
}

// Game modes
export type GameMode = 'classic' | 'endless';

// NG+ scaling per level (additive multipliers)
export const NG_PLUS = {
  hpMult: 0.25,        // +25% enemy HP per NG+ level
  damageMult: 0.20,    // +20% enemy damage per NG+ level
  speedMult: 0.10,     // +10% enemy speed per NG+ level
  spawnRateMult: 0.15, // +15% spawn rate per NG+ level
  maxLevel: 10,
};

// Wave timing and scaling
export const GAME_DURATION = 600; // seconds (10 min)
export const MAX_ENEMIES = 250;
export const MAX_ENEMIES_ENDLESS = 350;
export const ENEMY_SPAWN_DISTANCE = 600; // px from player

// Boss spawn times (seconds)
export const BOSS_TIMES = [100, 220, 340, 460, GAME_DURATION];
export const MINIBOSS_TIMES = [50, 130, 190, 250, 310, 370, 430, 520];
