/** All ECS systems for Neon Depths */

import {
  Vec2, randomRange, World, InputManager, SpatialHash, ParticleSystem, FloatingTextManager,
  Blackboard, type BTContext, type BehaviorNode, type TargetFn,
  createMovementSystem as coreCreateMovementSystem,
  createInvulnerabilitySystem,
  createDamageFlashSystem as coreCreateDamageFlashSystem,
  circleVsCircle,
  selector, seek, flee, orbit,
} from '@survivors/core';
import {
  C, type Pos, type Vel, type Health, type Collider,
  type Player, type Enemy, type Projectile, type Pickup, type Visual,
  type BehaviorTreeData,
} from './components';
import {
  WEAPONS, ENEMIES, ARENA_W, ARENA_H, SPAWN_MARGIN,
  type FloorDef,
} from './config';

// ─── TYPES ────────────────────────────────────────────────────────────
export interface WaveState {
  arenaW: number;
  arenaH: number;
  totalEnemies: number;
  spawnedEnemies: number;
  enemyQueue: { type: string; delay: number }[];
  spawnTimer: number;
  roomCleared: boolean;
  isBoss: boolean;
}

// ─── HELPERS ──────────────────────────────────────────────────────────
const LOD_CLOSE_SQ = 400 * 400;
const LOD_MED_SQ = 700 * 700;
const LOD_FAR_SQ = 1000 * 1000;

function randomEdgePos(arenaW: number, arenaH: number): { x: number; y: number } {
  const hw = arenaW / 2 - SPAWN_MARGIN;
  const hh = arenaH / 2 - SPAWN_MARGIN;
  const side = Math.random() * 4 | 0;
  switch (side) {
    case 0: return { x: randomRange(-hw, hw), y: -hh };
    case 1: return { x: randomRange(-hw, hw), y: hh };
    case 2: return { x: -hw, y: randomRange(-hh, hh) };
    default: return { x: hw, y: randomRange(-hh, hh) };
  }
}

// ─── ENEMY BEHAVIOR TREES ─────────────────────────────────────────────
const playerTarget: TargetFn = (ctx: BTContext) => {
  if (!ctx.blackboard.has('__playerX')) return null;
  return {
    x: ctx.blackboard.get<number>('__playerX', 0),
    y: ctx.blackboard.get<number>('__playerY', 0),
  };
};

const SIMPLE_LOD_TREE: BehaviorNode = seek(playerTarget);

const ENEMY_TREES: Record<string, BehaviorNode> = {
  drone: seek(playerTarget),
  strider: seek(playerTarget),
  turret: selector(
    orbit(playerTarget, 180, 1.5),
    seek(playerTarget),
  ),
  hulk: seek(playerTarget),
  phantom: selector(
    flee(playerTarget),
    seek(playerTarget),
  ),
  sentinel: selector(
    orbit(playerTarget, 200, 1.2),
    seek(playerTarget),
  ),
  overlord: selector(
    orbit(playerTarget, 220, 1.0),
    seek(playerTarget),
  ),
};

// ─── INPUT SYSTEM ─────────────────────────────────────────────────────
export function createInputSystem(input: InputManager) {
  return (world: World, _dt: number) => {
    input.update();
    for (const e of world.query(C.Player, C.Pos, C.Vel)) {
      const player = world.get<Player>(e, C.Player);
      const vel = world.get<Vel>(e, C.Vel);

      vel.x = input.dir.x * player.speed * player.speedMultiplier;
      vel.y = input.dir.y * player.speed * player.speedMultiplier;

      if (input.dir.x !== 0 || input.dir.y !== 0) {
        player.lastDirX = input.dir.x;
        player.lastDirY = input.dir.y;
      }
    }
  };
}

// ─── SHOOT SYSTEM ─────────────────────────────────────────────────────
export function createShootSystem(input: InputManager, particles: ParticleSystem) {
  let mouseDown = false;
  window.addEventListener('mousedown', (e) => { if (e.button === 0) mouseDown = true; });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });

  return (world: World, dt: number) => {
    const shooting = input.isMobile ? input.isShooting : mouseDown;

    for (const e of world.query(C.Player, C.Pos)) {
      const player = world.get<Player>(e, C.Player);
      const pos = world.get<Pos>(e, C.Pos);

      const wSlot = player.weapons[player.currentWeapon];
      if (!wSlot) continue;
      wSlot.timer -= dt;

      if (!shooting || wSlot.timer > 0) continue;

      const levels = WEAPONS[wSlot.type];
      if (!levels) continue;
      const wDef = levels[Math.min(wSlot.level, levels.length - 1)];

      wSlot.timer = wDef.cooldown;

      let aimX = input.aimDir.x;
      let aimY = input.aimDir.y;
      if (aimX === 0 && aimY === 0) {
        aimX = player.lastDirX;
        aimY = player.lastDirY;
      }
      const aimAngle = Math.atan2(aimY, aimX);

      const dmg = Math.round(wDef.damage * player.damageMultiplier);

      for (let i = 0; i < wDef.count; i++) {
        const spreadOffset = wDef.count > 1
          ? (i / (wDef.count - 1) - 0.5) * wDef.spread
          : (Math.random() - 0.5) * wDef.spread;
        const angle = aimAngle + spreadOffset;
        const vx = Math.cos(angle) * wDef.speed;
        const vy = Math.sin(angle) * wDef.speed;

        const p = world.spawn();
        world.add(p, C.Pos, { x: pos.x + Math.cos(angle) * 18, y: pos.y + Math.sin(angle) * 18 } as Pos);
        world.add(p, C.Vel, { x: vx, y: vy } as Vel);
        world.add(p, C.Collider, { radius: wDef.size } as Collider);
        world.add(p, C.Projectile, {
          damage: dmg, owner: 'player', lifetime: wDef.range,
          pierce: wDef.pierce, size: wDef.size, hitEntities: new Set(),
        } as Projectile);
        world.add(p, C.Visual, {
          shape: 'circle', color: wDef.color, size: wDef.size,
          glow: wDef.glow, glowSize: 8, rotation: 0,
        } as Visual);
      }

      particles.emit(pos.x + Math.cos(aimAngle) * 20, pos.y + Math.sin(aimAngle) * 20, 3, {
        color: wDef.color, speed: 80, life: 0.15, size: 3, sizeEnd: 0,
        angle: aimAngle, spread: 0.5,
      });
    }
  };
}

// ─── ENEMY SHOOT SYSTEM ───────────────────────────────────────────────
export function createEnemyShootSystem() {
  return (world: World, dt: number) => {
    const players = world.query(C.Player, C.Pos);
    if (players.length === 0) return;
    const pPos = world.get<Pos>(players[0], C.Pos);

    for (const e of world.query(C.Enemy, C.Pos)) {
      const enemy = world.get<Enemy>(e, C.Enemy);
      const def = ENEMIES[enemy.type];
      if (!def || !def.canShoot) continue;

      enemy.shootTimer -= dt;
      if (enemy.shootTimer > 0) continue;
      enemy.shootTimer = def.shootCooldown * (0.8 + Math.random() * 0.4);

      const ePos = world.get<Pos>(e, C.Pos);
      const dx = pPos.x - ePos.x;
      const dy = pPos.y - ePos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 500) continue;

      const angle = Math.atan2(dy, dx);
      const speed = def.shootSpeed;

      const p = world.spawn();
      world.add(p, C.Pos, { x: ePos.x + Math.cos(angle) * 16, y: ePos.y + Math.sin(angle) * 16 } as Pos);
      world.add(p, C.Vel, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed } as Vel);
      world.add(p, C.Collider, { radius: 4 } as Collider);
      world.add(p, C.Projectile, {
        damage: enemy.damage, owner: 'enemy', lifetime: 2.0,
        pierce: 1, size: 4, hitEntities: new Set(),
      } as Projectile);
      world.add(p, C.Visual, {
        shape: 'circle', color: '#ff6644', size: 4,
        glow: '#ff3300', glowSize: 6, rotation: 0,
      } as Visual);
    }
  };
}

// ─── BT ENEMY SYSTEM ──────────────────────────────────────────────────
export function createBTEnemySystem(spatialHash: SpatialHash<number>) {
  const sepVec = new Vec2();
  const nearbyBuf: number[] = [];
  let frame = 0;
  let totalTime = 0;

  return (world: World, dt: number) => {
    frame++;
    totalTime += dt;
    const players = world.query(C.Player, C.Pos);
    if (players.length === 0) return;
    const pPos = world.get<Pos>(players[0], C.Pos);

    for (const e of world.query(C.Enemy, C.Pos, C.Vel, C.BehaviorTree)) {
      const pos = world.get<Pos>(e, C.Pos);
      const enemy = world.get<Enemy>(e, C.Enemy);
      const vel = world.get<Vel>(e, C.Vel);
      const btData = world.get<BehaviorTreeData>(e, C.BehaviorTree);

      if (!isFinite(enemy.speed) || enemy.speed <= 0) enemy.speed = 50;

      const dx = pPos.x - pos.x;
      const dy = pPos.y - pos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > LOD_FAR_SQ && (e + frame) % 4 !== 0) continue;
      if (distSq > LOD_MED_SQ && (e + frame) % 2 !== 0) continue;

      const fullTree = ENEMY_TREES[enemy.type];
      if (!fullTree) continue;
      const tree = distSq > LOD_CLOSE_SQ ? SIMPLE_LOD_TREE : fullTree;

      const bb = btData.blackboard;
      bb.set('__playerX', pPos.x);
      bb.set('__playerY', pPos.y);
      bb.set('__speed', enemy.speed);
      bb.set('__time', totalTime);

      const btCtx: BTContext = { entity: e, world, dt, blackboard: bb };
      tree(btCtx);

      const bvx = bb.get<number>('__vx', 0);
      const bvy = bb.get<number>('__vy', 0);

      sepVec.set(0, 0);
      spatialHash.queryInto(pos.x, pos.y, 28, nearbyBuf);
      let sepCount = 0;
      for (let i = 0; i < nearbyBuf.length; i++) {
        const other = nearbyBuf[i];
        if (other === e || !world.has(other, C.Enemy)) continue;
        const oPos = world.get<Pos>(other, C.Pos);
        const sdx = pos.x - oPos.x;
        const sdy = pos.y - oPos.y;
        const sd = sdx * sdx + sdy * sdy;
        if (sd > 0 && sd < 784) {
          const sDist = Math.sqrt(sd);
          sepVec.x += sdx / sDist;
          sepVec.y += sdy / sDist;
          sepCount++;
        }
      }

      const bLen = Math.sqrt(bvx * bvx + bvy * bvy);
      if (bLen > 0.01) {
        let fx = bvx / bLen;
        let fy = bvy / bLen;
        if (sepCount > 0) {
          const sl = Math.sqrt(sepVec.x * sepVec.x + sepVec.y * sepVec.y);
          if (sl > 0) {
            fx = fx * 0.7 + (sepVec.x / sl) * 0.3;
            fy = fy * 0.7 + (sepVec.y / sl) * 0.3;
          }
        }
        const fl = Math.sqrt(fx * fx + fy * fy);
        const spd = Math.min(bLen, enemy.speed);
        vel.x = (fx / fl) * spd;
        vel.y = (fy / fl) * spd;
      } else {
        vel.x *= 0.85;
        vel.y *= 0.85;
      }
    }
  };
}

// ─── MOVEMENT SYSTEM (from core) ──────────────────────────────────────
export const createMovementSystem = () => coreCreateMovementSystem(C.Pos, C.Vel, C.Player);

// ─── PROJECTILE SYSTEM ────────────────────────────────────────────────
export function createProjectileSystem() {
  return (world: World, dt: number) => {
    for (const e of world.query(C.Projectile, C.Pos)) {
      const proj = world.get<Projectile>(e, C.Projectile);
      proj.lifetime -= dt;
      if (proj.lifetime <= 0) {
        world.destroy(e);
      }
    }
  };
}

// ─── COLLISION SYSTEM ─────────────────────────────────────────────────
export function createCollisionSystem(
  spatialHash: SpatialHash<number>,
  particles: ParticleSystem,
  floatingText: FloatingTextManager,
) {
  return (world: World, dt: number) => {
    // Rebuild spatial hash
    spatialHash.clear();
    for (const e of world.query(C.Pos, C.Collider)) {
      const pos = world.get<Pos>(e, C.Pos);
      const col = world.get<Collider>(e, C.Collider);
      spatialHash.insert(e, pos.x, pos.y, col.radius);
    }

    // Player projectiles → enemies
    for (const p of world.query(C.Projectile, C.Pos, C.Collider)) {
      const proj = world.get<Projectile>(p, C.Projectile);
      if (proj.owner !== 'player') continue;

      const pPos = world.get<Pos>(p, C.Pos);
      const pCol = world.get<Collider>(p, C.Collider);
      const nearby = spatialHash.query(pPos.x, pPos.y, pCol.radius + 20);

      for (const other of nearby) {
        if (other === p || proj.hitEntities.has(other)) continue;
        if (!world.has(other, C.Enemy) || !world.has(other, C.Health)) continue;

        const oPos = world.get<Pos>(other, C.Pos);
        const oCol = world.get<Collider>(other, C.Collider);
        if (!circleVsCircle(pPos.x, pPos.y, pCol.radius, oPos.x, oPos.y, oCol.radius)) continue;

        const hp = world.get<Health>(other, C.Health);
        hp.current -= proj.damage;
        proj.hitEntities.add(other);

        floatingText.add(oPos.x, oPos.y - 15, `-${proj.damage}`, '#ffcc00', 0.6, 12);
        particles.emit(pPos.x, pPos.y, 4, {
          color: '#ffaa33', speed: 100, life: 0.2, size: 3, sizeEnd: 0,
        });

        if (!world.has(other, C.DamageFlash)) {
          world.add(other, C.DamageFlash, { timer: 0.08 });
        }

        proj.pierce--;
        if (proj.pierce <= 0) {
          world.destroy(p);
          break;
        }
      }
    }

    // Enemy projectiles → player
    for (const p of world.query(C.Projectile, C.Pos, C.Collider)) {
      const proj = world.get<Projectile>(p, C.Projectile);
      if (proj.owner !== 'enemy') continue;

      const pPos = world.get<Pos>(p, C.Pos);
      const pCol = world.get<Collider>(p, C.Collider);

      for (const pe of world.query(C.Player, C.Pos, C.Collider, C.Health)) {
        const plPos = world.get<Pos>(pe, C.Pos);
        const plCol = world.get<Collider>(pe, C.Collider);
        const plHp = world.get<Health>(pe, C.Health);
        if (plHp.invuln > 0) continue;

        if (circleVsCircle(pPos.x, pPos.y, pCol.radius, plPos.x, plPos.y, plCol.radius)) {
          const player = world.get<Player>(pe, C.Player);
          const dmg = Math.max(1, proj.damage - player.armor);
          plHp.current -= dmg;
          plHp.invuln = 0.3;

          floatingText.add(plPos.x, plPos.y - 15, `-${dmg}`, '#ff3333', 0.6, 14);
          particles.emit(plPos.x, plPos.y, 6, {
            color: '#ff3333', speed: 120, life: 0.3, size: 3, sizeEnd: 0,
          });

          world.destroy(p);
          break;
        }
      }
    }

    // Enemy contact damage → player
    for (const e of world.query(C.Enemy, C.Pos, C.Collider)) {
      const enemy = world.get<Enemy>(e, C.Enemy);
      enemy.contactTimer -= dt;
      if (enemy.contactTimer > 0) continue;

      const ePos = world.get<Pos>(e, C.Pos);
      const eCol = world.get<Collider>(e, C.Collider);

      for (const pe of world.query(C.Player, C.Pos, C.Collider, C.Health)) {
        const plPos = world.get<Pos>(pe, C.Pos);
        const plCol = world.get<Collider>(pe, C.Collider);
        const plHp = world.get<Health>(pe, C.Health);
        if (plHp.invuln > 0) continue;

        if (circleVsCircle(ePos.x, ePos.y, eCol.radius, plPos.x, plPos.y, plCol.radius)) {
          const player = world.get<Player>(pe, C.Player);
          const dmg = Math.max(1, enemy.damage - player.armor);
          plHp.current -= dmg;
          plHp.invuln = 0.5;
          enemy.contactTimer = 0.6;

          floatingText.add(plPos.x, plPos.y - 15, `-${dmg}`, '#ff3333', 0.6, 14);
          particles.emit(plPos.x, plPos.y, 8, {
            color: '#ff3333', speed: 100, life: 0.3, size: 4, sizeEnd: 0,
          });
        }
      }
    }

    // Pickup → player
    for (const pk of world.query(C.Pickup, C.Pos)) {
      const pickup = world.get<Pickup>(pk, C.Pickup);
      const pkPos = world.get<Pos>(pk, C.Pos);

      for (const pe of world.query(C.Player, C.Pos, C.Collider)) {
        const plPos = world.get<Pos>(pe, C.Pos);
        const dx = pkPos.x - plPos.x;
        const dy = pkPos.y - plPos.y;
        if (dx * dx + dy * dy < 30 * 30) {
          applyPickup(world, pe, pickup, particles, floatingText);
          world.destroy(pk);
          break;
        }
      }
    }
  };
}

function applyPickup(
  world: World, playerEntity: number, pickup: Pickup,
  particles: ParticleSystem, floatingText: FloatingTextManager,
) {
  const player = world.get<Player>(playerEntity, C.Player);
  const pos = world.get<Pos>(playerEntity, C.Pos);

  if (pickup.type === 'health') {
    const hp = world.get<Health>(playerEntity, C.Health);
    const amount = pickup.healAmount ?? 30;
    hp.current = Math.min(hp.max, hp.current + amount);
    floatingText.add(pos.x, pos.y - 20, `+${amount} HP`, '#33ff66', 0.8, 14);
    particles.emit(pos.x, pos.y, 10, {
      color: '#33ff66', speed: 80, life: 0.4, size: 4, sizeEnd: 0,
    });
  } else if (pickup.type === 'weapon' && pickup.weaponType) {
    const existing = player.weapons.findIndex(w => w.type === pickup.weaponType);
    if (existing >= 0) {
      const wSlot = player.weapons[existing];
      const maxLevel = (WEAPONS[wSlot.type]?.length ?? 1) - 1;
      if (wSlot.level < maxLevel) {
        wSlot.level++;
        floatingText.add(pos.x, pos.y - 20, `${pickup.weaponType} LVL UP!`, '#ffcc00', 1.0, 14);
      } else {
        floatingText.add(pos.x, pos.y - 20, `${pickup.weaponType} MAX`, '#aaaaaa', 0.8, 12);
      }
    } else {
      player.weapons.push({ type: pickup.weaponType, level: 0, timer: 0 });
      player.currentWeapon = player.weapons.length - 1;
      floatingText.add(pos.x, pos.y - 20, `NEW: ${pickup.weaponType}!`, '#00ccff', 1.0, 14);
    }
    particles.emit(pos.x, pos.y, 10, {
      color: '#00ccff', speed: 80, life: 0.4, size: 4, sizeEnd: 0,
    });
  }
}

// ─── DEATH SYSTEM ─────────────────────────────────────────────────────
export function createDeathSystem(particles: ParticleSystem) {
  return (world: World, _dt: number) => {
    for (const e of world.query(C.Enemy, C.Health, C.Pos)) {
      const hp = world.get<Health>(e, C.Health);
      if (hp.current > 0) continue;

      const pos = world.get<Pos>(e, C.Pos);
      const vis = world.maybe<Visual>(e, C.Visual);
      const enemy = world.get<Enemy>(e, C.Enemy);
      const color = vis?.color ?? '#ff3333';

      particles.emit(pos.x, pos.y, 12, {
        color, speed: 120, life: 0.4, size: 5, sizeEnd: 0,
      });

      // Score
      for (const pe of world.query(C.Player)) {
        const player = world.get<Player>(pe, C.Player);
        player.score += enemy.scoreValue;
        player.kills++;
      }

      // Random drop
      if (Math.random() < 0.15) {
        spawnHealthPickup(world, pos.x, pos.y);
      }

      world.destroy(e);
    }
  };
}

function spawnHealthPickup(world: World, x: number, y: number): void {
  const pk = world.spawn();
  world.add(pk, C.Pos, { x, y } as Pos);
  world.add(pk, C.Pickup, {
    type: 'health', healAmount: 20, lifetime: 15, bobPhase: Math.random() * Math.PI * 2,
  } as Pickup);
  world.add(pk, C.Visual, {
    shape: 'cross', color: '#33ff66', size: 8,
    glow: '#00cc33', glowSize: 8, rotation: 0,
  } as Visual);
}

// ─── WAVE SYSTEM ──────────────────────────────────────────────────────
export function createWaveState(floorDef: FloorDef, roomIndex: number, isBoss: boolean): WaveState {
  const queue: { type: string; delay: number }[] = [];

  if (isBoss) {
    // Boss room: some minions then the boss
    const minionCount = 3 + roomIndex;
    for (let i = 0; i < minionCount; i++) {
      const type = floorDef.enemyPool[Math.random() * floorDef.enemyPool.length | 0];
      queue.push({ type, delay: i * 0.4 });
    }
    queue.push({ type: 'overlord', delay: minionCount * 0.4 + 1.0 });
  } else {
    const count = floorDef.minEnemies + Math.floor(Math.random() * (floorDef.maxEnemies - floorDef.minEnemies + 1));
    for (let i = 0; i < count; i++) {
      const type = floorDef.enemyPool[Math.random() * floorDef.enemyPool.length | 0];
      queue.push({ type, delay: i * 0.5 });
    }
  }

  return {
    arenaW: ARENA_W,
    arenaH: ARENA_H,
    totalEnemies: queue.length,
    spawnedEnemies: 0,
    enemyQueue: queue,
    spawnTimer: 1.0,
    roomCleared: false,
    isBoss,
  };
}

export function createWaveSystem(waveState: WaveState, floorDef: FloorDef) {
  return (world: World, dt: number) => {
    if (waveState.roomCleared) return;

    waveState.spawnTimer -= dt;

    // Spawn from queue when timer reaches zero
    while (waveState.enemyQueue.length > 0 && waveState.spawnTimer <= 0) {
      const next = waveState.enemyQueue.shift()!;
      waveState.spawnedEnemies++;

      const def = ENEMIES[next.type];
      if (!def) continue;

      const pos = randomEdgePos(waveState.arenaW, waveState.arenaH);
      const e = world.spawn();
      const scaledHp = Math.round(def.hp * floorDef.hpScale);

      world.add(e, C.Pos, { x: pos.x, y: pos.y } as Pos);
      world.add(e, C.Vel, { x: 0, y: 0 } as Vel);
      world.add(e, C.Health, { current: scaledHp, max: scaledHp, invuln: 0 } as Health);
      world.add(e, C.Collider, { radius: def.size } as Collider);
      world.add(e, C.Enemy, {
        type: next.type, speed: def.speed, damage: def.damage,
        scoreValue: def.scoreValue, contactTimer: 0, shootTimer: def.shootCooldown,
      } as Enemy);
      world.add(e, C.Visual, {
        shape: def.shape, color: def.color, size: def.size,
        glow: def.color, glowSize: 10, rotation: 0,
      } as Visual);
      world.add(e, C.BehaviorTree, { blackboard: new Blackboard() } as BehaviorTreeData);

      waveState.spawnTimer = 0.5;
    }

    // Check room cleared
    if (waveState.enemyQueue.length === 0) {
      const aliveEnemies = world.count(C.Enemy);
      if (aliveEnemies === 0) {
        waveState.roomCleared = true;
      }
    }
  };
}

// ─── PICKUP LIFETIME ──────────────────────────────────────────────────
export function createPickupLifetimeSystem() {
  return (world: World, dt: number) => {
    for (const e of world.query(C.Pickup)) {
      const pickup = world.get<Pickup>(e, C.Pickup);
      pickup.lifetime -= dt;
      pickup.bobPhase += dt * 3;
      if (pickup.lifetime <= 0) {
        world.destroy(e);
      }
    }
  };
}

// ─── ARENA BOUNDS ─────────────────────────────────────────────────────
export function createArenaBoundsSystem(arenaW: number, arenaH: number) {
  const hw = arenaW / 2;
  const hh = arenaH / 2;
  return (world: World, _dt: number) => {
    for (const e of world.query(C.Player, C.Pos)) {
      const pos = world.get<Pos>(e, C.Pos);
      if (pos.x < -hw + 14) pos.x = -hw + 14;
      if (pos.x > hw - 14) pos.x = hw - 14;
      if (pos.y < -hh + 14) pos.y = -hh + 14;
      if (pos.y > hh - 14) pos.y = hh - 14;
    }
  };
}

// ─── DAMAGE FLASH & INVULN (from core) ─────────────────────────────────
export const createDamageFlashSystem = () => coreCreateDamageFlashSystem(C.DamageFlash);
export const createInvulnSystem = () => createInvulnerabilitySystem(C.Health);

// ─── SPAWN WEAPON PICKUP (for room rewards) ───────────────────────────
export function spawnWeaponPickup(world: World, x: number, y: number, weaponType: string): void {
  const levels = WEAPONS[weaponType];
  if (!levels) return;
  const pk = world.spawn();
  world.add(pk, C.Pos, { x, y } as Pos);
  world.add(pk, C.Pickup, {
    type: 'weapon', weaponType, lifetime: 30, bobPhase: Math.random() * Math.PI * 2,
  } as Pickup);
  world.add(pk, C.Visual, {
    shape: 'diamond', color: levels[0].color, size: 10,
    glow: levels[0].glow, glowSize: 10, rotation: 0,
  } as Visual);
}
