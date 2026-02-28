/** All ECS systems for Neon Strike */

import {
  Vec2, randomRange, World, InputManager, SpatialHash, ParticleSystem, FloatingTextManager, Blackboard, type BTContext,
  createMovementSystem as coreCreateMovementSystem,
  createInvulnerabilitySystem,
  createDamageFlashSystem as coreCreateDamageFlashSystem,
  circleVsCircle,
} from '@survivors/core';
import { C, type Pos, type Vel, type Health, type Collider, type Player, type Enemy, type Projectile, type Pickup, type Destructible, type Visual, type Explosion, type BehaviorTreeData } from './components';
import { WEAPONS, ENEMIES, LEVELS, WEAPON_DROPS, EXPLOSION_RADIUS, EXPLOSION_DAMAGE, SPAWN_MARGIN } from './config';
import { ENEMY_TREES, simpleLODTree } from './enemy-behaviors';

const LOD_CLOSE_SQ = 400 * 400;
const LOD_MED_SQ = 700 * 700;
const LOD_FAR_SQ = 1000 * 1000;

// ─── INPUT SYSTEM ─────────────────────────────────────────────────────
export function createInputSystem(input: InputManager) {
  return (world: World, _dt: number) => {
    input.update();
    for (const e of world.query(C.Player, C.Pos, C.Vel)) {
      const player = world.get<Player>(e, C.Player);
      const vel = world.get<Vel>(e, C.Vel);

      vel.x = input.dir.x * player.speed;
      vel.y = input.dir.y * player.speed;

      if (input.dir.x !== 0 || input.dir.y !== 0) {
        player.lastDirX = input.dir.x;
        player.lastDirY = input.dir.y;
      }
    }
  };
}

// ─── SHOOT SYSTEM ─────────────────────────────────────────────────────
export function createShootSystem(
  input: InputManager,
  particles: ParticleSystem,
) {
  // Track mouse button for manual fire (InputManager.isShooting is always true on PC)
  let mouseDown = false;
  window.addEventListener('mousedown', (e) => { if (e.button === 0) mouseDown = true; });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });

  return (world: World, dt: number) => {
    const shooting = input.isMobile ? input.isShooting : mouseDown;

    for (const e of world.query(C.Player, C.Pos)) {
      const player = world.get<Player>(e, C.Player);
      const pos = world.get<Pos>(e, C.Pos);

      // Tick weapon cooldown
      const wState = player.weapons[player.currentWeapon];
      if (!wState) continue;
      wState.timer -= dt;

      if (!shooting || wState.timer > 0) continue;

      const wDef = WEAPONS[wState.type];
      if (!wDef) continue;

      // Fire
      wState.timer = wDef.cooldown;

      // Aim direction
      let aimX = input.aimDir.x;
      let aimY = input.aimDir.y;
      if (aimX === 0 && aimY === 0) {
        aimX = player.lastDirX;
        aimY = player.lastDirY;
      }
      const aimAngle = Math.atan2(aimY, aimX);

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
          damage: wDef.damage,
          owner: 'player',
          lifetime: wDef.range,
          pierce: wDef.pierce,
          size: wDef.size,
          explosive: wDef.explosive,
          hitEntities: new Set(),
        } as Projectile);
        world.add(p, C.Visual, {
          shape: 'circle', color: wDef.color, size: wDef.size,
          glow: wDef.glow, glowSize: 8, rotation: 0,
        } as Visual);
      }

      // Muzzle flash particles
      particles.emit(pos.x + Math.cos(aimAngle) * 20, pos.y + Math.sin(aimAngle) * 20, 3, {
        color: wDef.color, speed: 80, life: 0.15, size: 3, sizeEnd: 0,
        angle: aimAngle, spread: 0.5,
      });

      // Consume ammo
      if (wState.ammo > 0) {
        wState.ammo--;
        if (wState.ammo === 0) {
          // Revert to pistol
          player.weapons.splice(player.currentWeapon, 1);
          player.currentWeapon = 0;
        }
      }
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
      if (dist > 500) continue; // Don't shoot if too far

      const angle = Math.atan2(dy, dx);
      const speed = def.shootSpeed;

      const p = world.spawn();
      world.add(p, C.Pos, { x: ePos.x + Math.cos(angle) * 16, y: ePos.y + Math.sin(angle) * 16 } as Pos);
      world.add(p, C.Vel, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed } as Vel);
      world.add(p, C.Collider, { radius: 4 } as Collider);
      world.add(p, C.Projectile, {
        damage: enemy.damage,
        owner: 'enemy',
        lifetime: 2.0,
        pierce: 1,
        size: 4,
        explosive: false,
        hitEntities: new Set(),
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

      // LOD frame-skipping
      if (distSq > LOD_FAR_SQ && (e + frame) % 4 !== 0) continue;
      if (distSq > LOD_MED_SQ && (e + frame) % 2 !== 0) continue;

      const fullTree = ENEMY_TREES[enemy.type];
      if (!fullTree) continue;
      const tree = distSq > LOD_CLOSE_SQ ? simpleLODTree : fullTree;

      const bb = btData.blackboard;
      bb.set('__playerX', pPos.x);
      bb.set('__playerY', pPos.y);
      bb.set('__time', totalTime);

      const ctx: BTContext = { entity: e, world, dt, blackboard: bb };
      tree(ctx);

      const bvx = bb.get<number>('__vx', 0);
      const bvy = bb.get<number>('__vy', 0);

      // Separation
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
  return (world: World, _dt: number) => {
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

        // Hit enemy
        if (world.has(other, C.Enemy) && world.has(other, C.Health)) {
          const oPos = world.get<Pos>(other, C.Pos);
          const oCol = world.get<Collider>(other, C.Collider);
          if (circleVsCircle(pPos.x, pPos.y, pCol.radius, oPos.x, oPos.y, oCol.radius)) {
            const hp = world.get<Health>(other, C.Health);
            hp.current -= proj.damage;
            proj.hitEntities.add(other);

            // Damage number
            floatingText.add(oPos.x, oPos.y - 15, `-${proj.damage}`, '#ffcc00', 0.6, 12);

            // Impact particles
            particles.emit(pPos.x, pPos.y, 4, {
              color: '#ffaa33', speed: 100, life: 0.2, size: 3, sizeEnd: 0,
            });

            // Flash
            if (!world.has(other, C.DamageFlash)) {
              world.add(other, C.DamageFlash, { timer: 0.08 });
            }

            proj.pierce--;
            if (proj.pierce <= 0) {
              // Spawn explosion if explosive
              if (proj.explosive) {
                spawnExplosion(world, pPos.x, pPos.y, EXPLOSION_RADIUS, EXPLOSION_DAMAGE, 'player', particles);
              }
              world.destroy(p);
              break;
            }
          }
        }

        // Hit destructible
        if (world.has(other, C.Destructible)) {
          const oPos = world.get<Pos>(other, C.Pos);
          const oCol = world.get<Collider>(other, C.Collider);
          if (circleVsCircle(pPos.x, pPos.y, pCol.radius, oPos.x, oPos.y, oCol.radius)) {
            const destr = world.get<Destructible>(other, C.Destructible);
            destr.hp -= proj.damage;
            proj.hitEntities.add(other);

            particles.emit(oPos.x, oPos.y, 3, {
              color: '#aa8855', speed: 60, life: 0.2, size: 2, sizeEnd: 0,
            });

            proj.pierce--;
            if (proj.pierce <= 0) {
              if (proj.explosive) {
                spawnExplosion(world, pPos.x, pPos.y, EXPLOSION_RADIUS, EXPLOSION_DAMAGE, 'player', particles);
              }
              world.destroy(p);
              break;
            }
          }
        }
      }
    }

    // Enemy projectiles → player
    for (const p of world.query(C.Projectile, C.Pos, C.Collider)) {
      if (!world.isAlive(p)) continue;
      const proj = world.get<Projectile>(p, C.Projectile);
      if (proj.owner !== 'enemy') continue;

      const pPos = world.get<Pos>(p, C.Pos);
      const pCol = world.get<Collider>(p, C.Collider);

      for (const pl of world.query(C.Player, C.Pos, C.Collider)) {
        const plPos = world.get<Pos>(pl, C.Pos);
        const plCol = world.get<Collider>(pl, C.Collider);
        const plHp = world.get<Health>(pl, C.Health);
        if (plHp.invuln > 0) continue;

        if (circleVsCircle(pPos.x, pPos.y, pCol.radius, plPos.x, plPos.y, plCol.radius)) {
          plHp.current -= proj.damage;
          plHp.invuln = 0.5;
          floatingText.add(plPos.x, plPos.y - 15, `-${proj.damage}`, '#ff4444', 0.6, 14);
          particles.emit(plPos.x, plPos.y, 5, {
            color: '#ff3333', speed: 80, life: 0.2, size: 3, sizeEnd: 0,
          });
          world.destroy(p);
          break;
        }
      }
    }

    // Enemy contact → player
    for (const e of world.query(C.Enemy, C.Pos, C.Collider)) {
      const enemy = world.get<Enemy>(e, C.Enemy);
      const ePos = world.get<Pos>(e, C.Pos);
      const eCol = world.get<Collider>(e, C.Collider);

      for (const pl of world.query(C.Player, C.Pos, C.Collider)) {
        const plPos = world.get<Pos>(pl, C.Pos);
        const plCol = world.get<Collider>(pl, C.Collider);
        const plHp = world.get<Health>(pl, C.Health);
        if (plHp.invuln > 0) continue;

        if (circleVsCircle(ePos.x, ePos.y, eCol.radius, plPos.x, plPos.y, plCol.radius)) {
          enemy.contactTimer += _dt;
          if (enemy.contactTimer >= 0.5) {
            enemy.contactTimer = 0;
            plHp.current -= enemy.damage;
            plHp.invuln = 0.3;
            floatingText.add(plPos.x, plPos.y - 15, `-${enemy.damage}`, '#ff4444', 0.5, 13);
          }
        }
      }
    }

    // Player → pickups
    for (const pk of world.query(C.Pickup, C.Pos)) {
      const pkPos = world.get<Pos>(pk, C.Pos);

      for (const pl of world.query(C.Player, C.Pos)) {
        const plPos = world.get<Pos>(pl, C.Pos);
        if (circleVsCircle(pkPos.x, pkPos.y, 0, plPos.x, plPos.y, 30)) {
          const pickup = world.get<Pickup>(pk, C.Pickup);
          const player = world.get<Player>(pl, C.Player);

          if (pickup.type === 'health') {
            const hp = world.get<Health>(pl, C.Health);
            hp.current = Math.min(hp.max, hp.current + (pickup.healAmount || 30));
            floatingText.add(plPos.x, plPos.y - 20, `+${pickup.healAmount || 30} HP`, '#44ff44', 0.8, 13);
          } else if (pickup.type === 'weapon' && pickup.weaponType) {
            // Add weapon or refresh ammo
            const existing = player.weapons.findIndex(w => w.type === pickup.weaponType);
            if (existing >= 0) {
              player.weapons[existing].ammo += pickup.ammo || WEAPONS[pickup.weaponType].defaultAmmo;
              player.currentWeapon = existing;
            } else {
              player.weapons.push({ type: pickup.weaponType, ammo: pickup.ammo || WEAPONS[pickup.weaponType].defaultAmmo, timer: 0 });
              player.currentWeapon = player.weapons.length - 1;
            }
            const wDef = WEAPONS[pickup.weaponType];
            floatingText.add(plPos.x, plPos.y - 20, wDef.name, wDef.color, 0.8, 13);
          }

          particles.emit(pkPos.x, pkPos.y, 8, {
            color: '#44ff44', speed: 80, life: 0.3, size: 3, sizeEnd: 0,
          });
          world.destroy(pk);
          break;
        }
      }
    }

    // Explosion → enemies
    for (const ex of world.query(C.Explosion, C.Pos)) {
      const expl = world.get<Explosion>(ex, C.Explosion);
      const exPos = world.get<Pos>(ex, C.Pos);

      const nearby = spatialHash.query(exPos.x, exPos.y, expl.radius);
      for (const other of nearby) {
        if (expl.hitEntities.has(other)) continue;
        if (!world.has(other, C.Health) || !world.has(other, C.Pos)) continue;
        if (expl.owner === 'player' && world.has(other, C.Player)) continue;

        const oPos = world.get<Pos>(other, C.Pos);
        if (circleVsCircle(exPos.x, exPos.y, expl.radius, oPos.x, oPos.y, 0)) {
          const hp = world.get<Health>(other, C.Health);
          hp.current -= expl.damage;
          expl.hitEntities.add(other);
          floatingText.add(oPos.x, oPos.y - 15, `-${expl.damage}`, '#ff8800', 0.6, 12);
        }
      }
    }

    // Player/Enemy → Destructible push-out
    const destructibles = world.query(C.Destructible, C.Pos, C.Collider);
    for (const e of world.query(C.Pos, C.Collider)) {
      if (!world.has(e, C.Player) && !world.has(e, C.Enemy)) continue;
      const pos = world.get<Pos>(e, C.Pos);
      const col = world.get<Collider>(e, C.Collider);
      for (const d of destructibles) {
        const dPos = world.get<Pos>(d, C.Pos);
        const dCol = world.get<Collider>(d, C.Collider);
        if (circleVsCircle(pos.x, pos.y, col.radius, dPos.x, dPos.y, dCol.radius)) {
          const dx = pos.x - dPos.x;
          const dy = pos.y - dPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const overlap = col.radius + dCol.radius - dist;
          pos.x += (dx / dist) * overlap;
          pos.y += (dy / dist) * overlap;
        }
      }
    }
  };
}

function spawnExplosion(
  world: World, x: number, y: number,
  radius: number, damage: number, owner: 'player' | 'enemy',
  particles: ParticleSystem,
): void {
  const e = world.spawn();
  world.add(e, C.Pos, { x, y } as Pos);
  world.add(e, C.Explosion, {
    radius, maxRadius: radius, damage, timer: 0.3,
    owner, hitEntities: new Set(),
  } as Explosion);

  particles.emit(x, y, 25, {
    color: '#ff6633', speed: 200, life: 0.4, size: 6, sizeEnd: 0,
  });
  particles.emit(x, y, 15, {
    color: '#ffcc00', speed: 120, life: 0.3, size: 4, sizeEnd: 0,
  });
}

// ─── EXPLOSION SYSTEM ─────────────────────────────────────────────────
export function createExplosionSystem() {
  return (world: World, dt: number) => {
    for (const e of world.query(C.Explosion)) {
      const expl = world.get<Explosion>(e, C.Explosion);
      expl.timer -= dt;
      if (expl.timer <= 0) {
        world.destroy(e);
      }
    }
  };
}

// ─── DESTRUCTIBLE SYSTEM ──────────────────────────────────────────────
export function createDestructibleSystem(
  particles: ParticleSystem,
) {
  return (world: World, _dt: number) => {
    for (const e of world.query(C.Destructible, C.Pos)) {
      const destr = world.get<Destructible>(e, C.Destructible);
      if (destr.hp > 0) continue;

      const pos = world.get<Pos>(e, C.Pos);

      // Barrel explosion
      if (destr.explosive) {
        spawnExplosion(world, pos.x, pos.y, EXPLOSION_RADIUS, EXPLOSION_DAMAGE, 'player', particles);
      }

      // Drop pickup
      if (destr.dropType !== 'none') {
        const pk = world.spawn();
        world.add(pk, C.Pos, { x: pos.x, y: pos.y } as Pos);

        if (destr.dropType === 'health') {
          world.add(pk, C.Pickup, {
            type: 'health', healAmount: 30, lifetime: 15, bobPhase: Math.random() * Math.PI * 2,
          } as Pickup);
          world.add(pk, C.Visual, {
            shape: 'diamond', color: '#44ff44', size: 7,
            glow: '#22cc22', glowSize: 8, rotation: 0,
          } as Visual);
        } else {
          const wType = WEAPON_DROPS[Math.floor(Math.random() * WEAPON_DROPS.length)];
          const wDef = WEAPONS[wType];
          world.add(pk, C.Pickup, {
            type: 'weapon', weaponType: wType, ammo: wDef.defaultAmmo,
            lifetime: 15, bobPhase: Math.random() * Math.PI * 2,
          } as Pickup);
          world.add(pk, C.Visual, {
            shape: 'diamond', color: wDef.color, size: 8,
            glow: wDef.glow, glowSize: 8, rotation: 0,
          } as Visual);
        }
      }

      // Destruction particles
      particles.emit(pos.x, pos.y, 12, {
        color: destr.explosive ? '#ff6633' : '#aa8855',
        speed: 100, life: 0.3, size: 4, sizeEnd: 0,
      });

      world.destroy(e);
    }
  };
}

// ─── DEATH SYSTEM ─────────────────────────────────────────────────────
export function createDeathSystem(particles: ParticleSystem) {
  return (world: World, _dt: number) => {
    for (const e of world.query(C.Health, C.Pos)) {
      if (world.has(e, C.Player) || world.has(e, C.Destructible)) continue;
      const hp = world.get<Health>(e, C.Health);
      if (hp.current > 0) continue;

      const pos = world.get<Pos>(e, C.Pos);
      const vis = world.maybe<Visual>(e, C.Visual);
      const color = vis?.color || '#ff3333';

      particles.emit(pos.x, pos.y, 15, {
        color, speed: 120, life: 0.35, size: 4, sizeEnd: 0,
      });

      // Add score
      if (world.has(e, C.Enemy)) {
        const enemy = world.get<Enemy>(e, C.Enemy);
        for (const pl of world.query(C.Player)) {
          const player = world.get<Player>(pl, C.Player);
          player.score += enemy.scoreValue;
        }
      }

      world.destroy(e);
    }
  };
}

// ─── WAVE SYSTEM ──────────────────────────────────────────────────────
export interface WaveState {
  levelIndex: number;
  enemiesSpawned: number;
  enemiesTotal: number;
  spawnTimer: number;
  spawnQueue: { type: string; count: number }[];
  levelCleared: boolean;
  arenaW: number;
  arenaH: number;
}

export function createWaveState(levelIndex: number): WaveState {
  const level = LEVELS[levelIndex];
  const total = level.enemies.reduce((s, e) => s + e.count, 0);
  return {
    levelIndex,
    enemiesSpawned: 0,
    enemiesTotal: total,
    spawnTimer: 1.5, // initial delay
    spawnQueue: level.enemies.map(e => ({ ...e })),
    levelCleared: false,
    arenaW: level.arenaWidth,
    arenaH: level.arenaHeight,
  };
}

export function createWaveSystem(waveState: WaveState) {
  return (world: World, dt: number) => {
    if (waveState.levelCleared) return;

    waveState.spawnTimer -= dt;
    if (waveState.spawnTimer > 0) return;

    // Spawn enemies from queue
    if (waveState.enemiesSpawned < waveState.enemiesTotal) {
      waveState.spawnTimer = 0.6 + Math.random() * 0.8; // stagger spawns

      // Pick next type from queue
      for (const entry of waveState.spawnQueue) {
        if (entry.count <= 0) continue;
        entry.count--;
        waveState.enemiesSpawned++;
        spawnEnemy(world, entry.type, waveState.arenaW, waveState.arenaH);
        break;
      }
    }

    // Check if level cleared (all spawned + all dead)
    if (waveState.enemiesSpawned >= waveState.enemiesTotal) {
      const alive = world.count(C.Enemy);
      if (alive === 0) {
        waveState.levelCleared = true;
      }
    }
  };
}

export function spawnEnemy(world: World, type: string, arenaW: number, arenaH: number): void {
  const def = ENEMIES[type];
  if (!def) return;

  // Spawn from arena edges
  const hw = arenaW / 2;
  const hh = arenaH / 2;
  const side = Math.floor(Math.random() * 4);
  let x: number, y: number;
  switch (side) {
    case 0: x = randomRange(-hw + SPAWN_MARGIN, hw - SPAWN_MARGIN); y = -hh + SPAWN_MARGIN; break;
    case 1: x = randomRange(-hw + SPAWN_MARGIN, hw - SPAWN_MARGIN); y = hh - SPAWN_MARGIN; break;
    case 2: x = -hw + SPAWN_MARGIN; y = randomRange(-hh + SPAWN_MARGIN, hh - SPAWN_MARGIN); break;
    default: x = hw - SPAWN_MARGIN; y = randomRange(-hh + SPAWN_MARGIN, hh - SPAWN_MARGIN); break;
  }

  const e = world.spawn();
  world.add(e, C.Pos, { x, y } as Pos);
  world.add(e, C.Vel, { x: 0, y: 0 } as Vel);
  world.add(e, C.Health, { current: def.hp, max: def.hp, invuln: 0 } as Health);
  world.add(e, C.Collider, { radius: def.size } as Collider);
  world.add(e, C.Enemy, {
    type, speed: def.speed, damage: def.damage,
    scoreValue: def.scoreValue, contactTimer: 0,
    shootTimer: def.canShoot ? def.shootCooldown * Math.random() : 0,
  } as Enemy);
  world.add(e, C.Visual, {
    shape: def.shape, color: def.color, size: def.size,
    glow: def.color, glowSize: def.isBoss ? 18 : 8, rotation: 0,
  } as Visual);
  world.add(e, C.BehaviorTree, { blackboard: new Blackboard() } as BehaviorTreeData);
}

// ─── PICKUP LIFETIME ──────────────────────────────────────────────────
export function createPickupSystem() {
  return (world: World, dt: number) => {
    for (const e of world.query(C.Pickup, C.Pos)) {
      const pickup = world.get<Pickup>(e, C.Pickup);
      pickup.lifetime -= dt;
      pickup.bobPhase += dt * 3;
      if (pickup.lifetime <= 0) {
        world.destroy(e);
      }
    }
  };
}

// ─── DAMAGE FLASH (from core) ─────────────────────────────────────────
export const createDamageFlashSystem = () => coreCreateDamageFlashSystem(C.DamageFlash);

// ─── INVULN TICK (from core) ──────────────────────────────────────────
export const createInvulnSystem = () => createInvulnerabilitySystem(C.Health);

// ─── ARENA BOUNDS ─────────────────────────────────────────────────────
export function createArenaBoundsSystem(arenaW: number, arenaH: number) {
  const hw = arenaW / 2;
  const hh = arenaH / 2;
  return (world: World, _dt: number) => {
    for (const e of world.query(C.Player, C.Pos, C.Collider)) {
      const pos = world.get<Pos>(e, C.Pos);
      const col = world.get<Collider>(e, C.Collider);
      if (pos.x - col.radius < -hw) pos.x = -hw + col.radius;
      if (pos.x + col.radius > hw) pos.x = hw - col.radius;
      if (pos.y - col.radius < -hh) pos.y = -hh + col.radius;
      if (pos.y + col.radius > hh) pos.y = hh - col.radius;
    }
    for (const e of world.query(C.Enemy, C.Pos, C.Collider)) {
      const pos = world.get<Pos>(e, C.Pos);
      const col = world.get<Collider>(e, C.Collider);
      if (pos.x - col.radius < -hw) pos.x = -hw + col.radius;
      if (pos.x + col.radius > hw) pos.x = hw - col.radius;
      if (pos.y - col.radius < -hh) pos.y = -hh + col.radius;
      if (pos.y + col.radius > hh) pos.y = hh - col.radius;
    }
  };
}

// ─── HELPER: spawn destructibles ──────────────────────────────────────
export function spawnDestructibles(world: World, arenaW: number, arenaH: number, crates: number, barrels: number): void {
  const hw = arenaW / 2 - 60;
  const hh = arenaH / 2 - 60;

  for (let i = 0; i < crates; i++) {
    const x = randomRange(-hw, hw);
    const y = randomRange(-hh, hh);
    // Avoid center (player spawn)
    if (Math.abs(x) < 80 && Math.abs(y) < 80) continue;

    const e = world.spawn();
    world.add(e, C.Pos, { x, y } as Pos);
    world.add(e, C.Collider, { radius: 14 } as Collider);
    world.add(e, C.Destructible, {
      hp: 40, maxHp: 40,
      dropType: Math.random() < 0.6 ? 'weapon' : 'health',
      explosive: false,
    } as Destructible);
    world.add(e, C.Visual, {
      shape: 'crate', color: '#aa8844', size: 14,
      glow: '#665522', glowSize: 4, rotation: 0,
    } as Visual);
  }

  for (let i = 0; i < barrels; i++) {
    const x = randomRange(-hw, hw);
    const y = randomRange(-hh, hh);
    if (Math.abs(x) < 80 && Math.abs(y) < 80) continue;

    const e = world.spawn();
    world.add(e, C.Pos, { x, y } as Pos);
    world.add(e, C.Collider, { radius: 12 } as Collider);
    world.add(e, C.Destructible, {
      hp: 25, maxHp: 25,
      dropType: 'none',
      explosive: true,
    } as Destructible);
    world.add(e, C.Visual, {
      shape: 'barrel', color: '#ff6633', size: 12,
      glow: '#cc3300', glowSize: 6, rotation: 0,
    } as Visual);
  }
}
