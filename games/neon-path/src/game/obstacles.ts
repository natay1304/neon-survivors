/** Neon Path — runtime obstacle state: all obstacle types */

import type {
  MovingPlatform, Laser, SawBlade,
  FirePillar, AcidDrop, OrbitBlade, Turret, Crusher,
  LevelDef, Platform,
} from './config';
import type { Player } from './physics';
import { PLAYER_W, PLAYER_H, WORLD_H, WORLD_W } from './config';

// ── Moving Platform ───────────────────────────────────────────────────────────

export interface MovingPlatformState {
  def: MovingPlatform;
  x: number; y: number;
  prevX: number; prevY: number;
  t: number; dir: 1 | -1;
}

function createMovingPlatformState(def: MovingPlatform): MovingPlatformState {
  return { def, x: def.x, y: def.y, prevX: def.x, prevY: def.y, t: 0, dir: 1 };
}

function updateMovingPlatform(s: MovingPlatformState, dt: number): void {
  s.prevX = s.x; s.prevY = s.y;
  const dx = s.def.endX - s.def.x;
  const dy = s.def.endY - s.def.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  s.t += (s.def.speed / len) * dt * s.dir;
  if (s.t >= 1) { s.t = 1; s.dir = -1; }
  if (s.t <= 0) { s.t = 0; s.dir = 1; }
  s.x = s.def.x + dx * s.t;
  s.y = s.def.y + dy * s.t;
}

export function movingPlatformRect(s: MovingPlatformState): Platform {
  return { x: s.x, y: s.y, w: s.def.w, h: s.def.h };
}

// ── Laser ─────────────────────────────────────────────────────────────────────

export interface LaserState {
  def: Laser; active: boolean; timer: number;
}

function createLaserState(def: Laser): LaserState {
  const period = def.onTime + def.offTime;
  const t = def.phase % period;
  return { def, active: t < def.onTime, timer: t };
}

function updateLaser(s: LaserState, dt: number): void {
  s.timer += dt;
  const period = s.def.onTime + s.def.offTime;
  if (s.timer >= period) s.timer -= period;
  s.active = s.timer < s.def.onTime;
}

function playerHitsLaser(player: Player, s: LaserState): boolean {
  if (!s.active) return false;
  const { x1, y1, x2, y2, thickness } = s.def;
  const half = thickness / 2 + 2;
  const lx = Math.min(x1, x2) - half;
  const ly = Math.min(y1, y2) - half;
  const lw = Math.abs(x2 - x1) + half * 2;
  const lh = Math.abs(y2 - y1) + half * 2;
  return player.x < lx + lw && player.x + PLAYER_W > lx &&
         player.y < ly + lh && player.y + PLAYER_H > ly;
}

// ── Saw Blade ─────────────────────────────────────────────────────────────────

export interface SawState {
  def: SawBlade; x: number; y: number; t: number; dir: 1 | -1; angle: number;
}

function createSawState(def: SawBlade): SawState {
  return { def, x: def.x, y: def.y, t: 0, dir: 1, angle: 0 };
}

function updateSaw(s: SawState, dt: number): void {
  const dx = s.def.endX - s.def.x;
  const dy = s.def.endY - s.def.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  s.t += (s.def.speed / len) * dt * s.dir;
  if (s.t >= 1) { s.t = 1; s.dir = -1; }
  if (s.t <= 0) { s.t = 0; s.dir = 1; }
  s.x = s.def.x + dx * s.t;
  s.y = s.def.y + dy * s.t;
  s.angle += dt * 5 * s.dir;
}

function playerHitsSaw(player: Player, s: SawState): boolean {
  const cx = Math.max(player.x, Math.min(s.x, player.x + PLAYER_W));
  const cy = Math.max(player.y, Math.min(s.y, player.y + PLAYER_H));
  const dx = s.x - cx; const dy = s.y - cy;
  const r = s.def.radius - 2;
  return dx * dx + dy * dy < r * r;
}

// ── Fire Pillar ───────────────────────────────────────────────────────────────

export interface FirePillarState {
  def: FirePillar;
  timer: number;
  active: boolean;
  heightFrac: number; // 0–1 animated
}

function createFirePillarState(def: FirePillar): FirePillarState {
  const period = def.onTime + def.offTime;
  const t = def.phase % period;
  return { def, timer: t, active: t < def.onTime, heightFrac: t < def.onTime ? 1 : 0 };
}

function updateFirePillar(s: FirePillarState, dt: number): void {
  s.timer += dt;
  const period = s.def.onTime + s.def.offTime;
  if (s.timer >= period) s.timer -= period;
  s.active = s.timer < s.def.onTime;
  if (s.active) s.heightFrac = Math.min(s.heightFrac + dt * 5, 1);
  else           s.heightFrac = Math.max(s.heightFrac - dt * 7, 0);
}

function playerHitsFirePillar(player: Player, s: FirePillarState): boolean {
  if (s.heightFrac < 0.15) return false;
  const { x, y, height } = s.def;
  const fw = 22;
  const fh = height * s.heightFrac;
  return player.x + PLAYER_W > x - fw / 2 &&
         player.x < x + fw / 2 &&
         player.y + PLAYER_H > y - fh &&
         player.y < y;
}

// ── Acid Drops ────────────────────────────────────────────────────────────────

export interface AcidDropState {
  def: AcidDrop;
  spawnTimer: number;
  drops: { x: number; y: number }[];
}

function createAcidDropState(def: AcidDrop): AcidDropState {
  return { def, spawnTimer: def.interval * 0.3, drops: [] };
}

function updateAcidDrop(s: AcidDropState, dt: number): void {
  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0) {
    s.drops.push({ x: s.def.x + (Math.random() - 0.5) * 6, y: s.def.y });
    s.spawnTimer = s.def.interval;
  }
  for (const d of s.drops) d.y += s.def.speed * dt;
  s.drops = s.drops.filter(d => d.y < WORLD_H + 20);
}

function playerHitsAcidDrop(player: Player, s: AcidDropState): boolean {
  const r = 5;
  for (const d of s.drops) {
    const cx = Math.max(player.x, Math.min(d.x, player.x + PLAYER_W));
    const cy = Math.max(player.y, Math.min(d.y, player.y + PLAYER_H));
    const dx = d.x - cx; const dy = d.y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

// ── Orbiting Blade ────────────────────────────────────────────────────────────

export interface OrbitBladeState {
  def: OrbitBlade; angle: number;
}

function createOrbitBladeState(def: OrbitBlade): OrbitBladeState {
  return { def, angle: 0 };
}

function updateOrbitBlade(s: OrbitBladeState, dt: number): void {
  s.angle += s.def.speed * dt;
}

function playerHitsOrbitBlade(player: Player, s: OrbitBladeState): boolean {
  const bx = s.def.cx + Math.cos(s.angle) * s.def.radius;
  const by = s.def.cy + Math.sin(s.angle) * s.def.radius;
  const cx = Math.max(player.x, Math.min(bx, player.x + PLAYER_W));
  const cy = Math.max(player.y, Math.min(by, player.y + PLAYER_H));
  const dx = bx - cx; const dy = by - cy;
  const r = s.def.bladeRadius - 2;
  return dx * dx + dy * dy < r * r;
}

// ── Turret ────────────────────────────────────────────────────────────────────

export interface TurretState {
  def: Turret;
  fireTimer: number;
  bullets: { x: number; y: number; vx: number }[];
}

function createTurretState(def: Turret): TurretState {
  return { def, fireTimer: def.interval * 0.6, bullets: [] };
}

function updateTurret(s: TurretState, dt: number): void {
  s.fireTimer -= dt;
  if (s.fireTimer <= 0) {
    s.bullets.push({ x: s.def.x, y: s.def.y, vx: s.def.direction * s.def.bulletSpeed });
    s.fireTimer = s.def.interval;
  }
  for (const b of s.bullets) b.x += b.vx * dt;
  s.bullets = s.bullets.filter(b => b.x > -30 && b.x < WORLD_W + 30);
}

function playerHitsTurret(player: Player, s: TurretState): boolean {
  const bw = 10; const bh = 5;
  for (const b of s.bullets) {
    if (player.x < b.x + bw && player.x + PLAYER_W > b.x - bw / 2 &&
        player.y < b.y + bh && player.y + PLAYER_H > b.y - bh / 2) return true;
  }
  return false;
}

// ── Crusher ───────────────────────────────────────────────────────────────────

export interface CrusherState {
  def: Crusher;
  y: number;
  phase: 'idle' | 'warning' | 'crushing' | 'holding' | 'retracting';
  phaseTimer: number;
}

function createCrusherState(def: Crusher): CrusherState {
  return { def, y: def.y, phase: 'idle', phaseTimer: 0 };
}

function updateCrusher(s: CrusherState, player: Player, dt: number): void {
  const { def } = s;
  switch (s.phase) {
    case 'idle': {
      const pcx = player.x + PLAYER_W / 2;
      const inRange = pcx >= def.triggerX1 && pcx <= def.triggerX2;
      const below = player.y + PLAYER_H > s.y + def.h;
      if (inRange && below) { s.phase = 'warning'; s.phaseTimer = 0.35; }
      break;
    }
    case 'warning':
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) s.phase = 'crushing';
      break;
    case 'crushing':
      s.y += def.speed * dt;
      if (s.y >= def.strikeY) { s.y = def.strikeY; s.phase = 'holding'; s.phaseTimer = 0.4; }
      break;
    case 'holding':
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) s.phase = 'retracting';
      break;
    case 'retracting':
      s.y -= def.retractSpeed * dt;
      if (s.y <= def.y) { s.y = def.y; s.phase = 'idle'; }
      break;
  }
}

function playerHitsCrusher(player: Player, s: CrusherState): boolean {
  if (s.phase !== 'crushing' && s.phase !== 'holding') return false;
  const { def } = s;
  return player.x + PLAYER_W > def.x && player.x < def.x + def.w &&
         player.y + PLAYER_H > s.y    && player.y < s.y + def.h + 10;
}

// ── Bundle ────────────────────────────────────────────────────────────────────

export interface ObstacleStates {
  movingPlatforms: MovingPlatformState[];
  lasers: LaserState[];
  saws: SawState[];
  firePillars: FirePillarState[];
  acidDrops: AcidDropState[];
  orbitBlades: OrbitBladeState[];
  turrets: TurretState[];
  crushers: CrusherState[];
}

export function createObstacleStates(level: LevelDef): ObstacleStates {
  return {
    movingPlatforms: (level.movingPlatforms ?? []).map(createMovingPlatformState),
    lasers:          (level.lasers ?? []).map(createLaserState),
    saws:            (level.saws ?? []).map(createSawState),
    firePillars:     (level.firePillars ?? []).map(createFirePillarState),
    acidDrops:       (level.acidDrops ?? []).map(createAcidDropState),
    orbitBlades:     (level.orbitBlades ?? []).map(createOrbitBladeState),
    turrets:         (level.turrets ?? []).map(createTurretState),
    crushers:        (level.crushers ?? []).map(createCrusherState),
  };
}

export function updateObstacles(states: ObstacleStates, dt: number, player: Player): void {
  for (const s of states.movingPlatforms) updateMovingPlatform(s, dt);
  for (const s of states.lasers)          updateLaser(s, dt);
  for (const s of states.saws)            updateSaw(s, dt);
  for (const s of states.firePillars)     updateFirePillar(s, dt);
  for (const s of states.acidDrops)       updateAcidDrop(s, dt);
  for (const s of states.orbitBlades)     updateOrbitBlade(s, dt);
  for (const s of states.turrets)         updateTurret(s, dt);
  for (const s of states.crushers)        updateCrusher(s, player, dt);
}

export function getMovingPlatformRects(states: ObstacleStates): Platform[] {
  return states.movingPlatforms.map(movingPlatformRect);
}

export function carryPlayerOnMovingPlatforms(player: Player, states: ObstacleStates): void {
  for (const s of states.movingPlatforms) {
    const feetY = player.y + PLAYER_H;
    if (Math.abs(feetY - s.y) <= 2 &&
        player.x + PLAYER_W > s.x && player.x < s.x + s.def.w) {
      player.x += s.x - s.prevX;
      player.y += s.y - s.prevY;
    }
  }
}

export function isPlayerKilledByObstacle(player: Player, states: ObstacleStates): boolean {
  for (const s of states.lasers)      if (playerHitsLaser(player, s))       return true;
  for (const s of states.saws)        if (playerHitsSaw(player, s))         return true;
  for (const s of states.firePillars) if (playerHitsFirePillar(player, s))  return true;
  for (const s of states.acidDrops)   if (playerHitsAcidDrop(player, s))    return true;
  for (const s of states.orbitBlades) if (playerHitsOrbitBlade(player, s))  return true;
  for (const s of states.turrets)     if (playerHitsTurret(player, s))      return true;
  for (const s of states.crushers)    if (playerHitsCrusher(player, s))     return true;
  return false;
}
