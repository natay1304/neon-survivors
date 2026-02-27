/** All game systems — pure functions operating on the ECS world */

import { Vec2, randomAngle, randomRange, clamp } from '../core/math';
import { World, Entity } from '../core/ecs';
import { InputManager } from '../core/input';
import { SpatialHash } from '../core/spatial-hash';
import { ParticleSystem } from '../core/particles';
import { FloatingTextManager } from '../core/utils';
import { C, Pos, Vel, Health, Collider, Player, Enemy, Projectile, XPGem, Visual, LightningData, Bonus } from './components';
import { WEAPONS, ENEMIES, ENEMY_SPAWN_DISTANCE, MAX_ENEMIES, GAME_DURATION, BOSS_TIMES, MINIBOSS_TIMES } from './config';

// ─── INPUT SYSTEM ────────────────────────────────────────────────────
export function createInputSystem(input: InputManager) {
  return (world: World, _dt: number) => {
    for (const e of world.query(C.Player, C.Pos, C.Vel)) {
      const player = world.get<Player>(e, C.Player);
      const vel = world.get<Vel>(e, C.Vel);
      input.update();
      vel.x = input.dir.x * player.speed;
      vel.y = input.dir.y * player.speed;
      if (input.dir.x !== 0 || input.dir.y !== 0) {
        player.lastDirX = input.dir.x;
        player.lastDirY = input.dir.y;
      }
    }
  };
}

// ─── MOVEMENT SYSTEM ─────────────────────────────────────────────────
export function createMovementSystem() {
  return (world: World, dt: number) => {
    for (const e of world.query(C.Pos, C.Vel)) {
      const pos = world.get<Pos>(e, C.Pos);
      const vel = world.get<Vel>(e, C.Vel);
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
    }
  };
}

// ─── ENEMY AI SYSTEM ─────────────────────────────────────────────────
export function createEnemyAISystem() {
  const tmpVec = new Vec2();
  return (world: World, _dt: number) => {
    const players = world.query(C.Player, C.Pos);
    if (players.length === 0) return;
    const pPos = world.get<Pos>(players[0], C.Pos);

    for (const e of world.query(C.Enemy, C.Pos, C.Vel)) {
      const pos = world.get<Pos>(e, C.Pos);
      const enemy = world.get<Enemy>(e, C.Enemy);
      const vel = world.get<Vel>(e, C.Vel);

      tmpVec.set(pPos.x - pos.x, pPos.y - pos.y).normalize();
      vel.x = tmpVec.x * enemy.speed;
      vel.y = tmpVec.y * enemy.speed;
    }
  };
}

// ─── WEAPON SYSTEM ───────────────────────────────────────────────────
export function createWeaponSystem(
  input: InputManager,
  particles: ParticleSystem,
  floatingText: FloatingTextManager,
  spatialHash: SpatialHash<Entity>,
  gameState: { damageMult: number; cooldownMult: number; gameTime: number }
) {
  return (world: World, dt: number) => {
    for (const pe of world.query(C.Player, C.Pos)) {
      const player = world.get<Player>(pe, C.Player);
      const pPos = world.get<Pos>(pe, C.Pos);

      for (const slot of player.weapons) {
        const wDef = WEAPONS[slot.type];
        if (!wDef) continue;
        const lvl = wDef.levels[Math.min(slot.level, wDef.levels.length - 1)];

        slot.timer -= dt;
        if (slot.timer > 0) continue;

        // Active weapons need shooting input (PC: auto, Mobile: aim joystick)
        if (slot.type !== 'holy_aura' && slot.type !== 'fire_trail' && !input.isShooting) {
          slot.timer = 0;
          continue;
        }
        slot.timer = lvl.cooldown * (1 - gameState.cooldownMult);

        switch (slot.type) {
          case 'magic_orb': {
            // Use aim direction (mouse/joystick) if available, else last move dir
            const aimX = input.isAiming ? input.aimDir.x : player.lastDirX;
            const aimY = input.isAiming ? input.aimDir.y : player.lastDirY;
            const baseAngle = Math.atan2(aimY, aimX);
            const spread = 0.3;
            for (let i = 0; i < lvl.count; i++) {
              const angle = baseAngle + (i - (lvl.count - 1) / 2) * spread;
              const proj = world.spawn();
              world.add(proj, C.Pos, { x: pPos.x, y: pPos.y });
              world.add(proj, C.Vel, { x: Math.cos(angle) * lvl.speed, y: Math.sin(angle) * lvl.speed });
              world.add(proj, C.Projectile, {
                damage: lvl.damage * (1 + gameState.damageMult),
                lifetime: 2.0,
                pierce: lvl.pierce,
                weaponType: slot.type,
                hitEntities: new Set(),
                size: lvl.size,
              } as Projectile);
              world.add(proj, C.Collider, { radius: lvl.size });
              world.add(proj, C.Visual, { shape: 'circle', color: wDef.color, size: lvl.size, glow: wDef.glow, glowSize: 12 } as Visual);
            }
            break;
          }

          case 'holy_aura': {
            // Damage all enemies in range
            const enemies = spatialHash.query(pPos.x, pPos.y, lvl.size);
            const seen = new Set<Entity>();
            for (const candidate of enemies) {
              if (seen.has(candidate) || !world.has(candidate, C.Enemy)) continue;
              seen.add(candidate);
              const ePos = world.get<Pos>(candidate, C.Pos);
              const dx = ePos.x - pPos.x, dy = ePos.y - pPos.y;
              if (dx * dx + dy * dy > lvl.size * lvl.size) continue;
              applyDamage(world, candidate, lvl.damage * (1 + gameState.damageMult), particles, floatingText, player);
              // Knockback
              if (lvl.knockback > 0) {
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const vel = world.get<Vel>(candidate, C.Vel);
                vel.x += (dx / dist) * lvl.knockback;
                vel.y += (dy / dist) * lvl.knockback;
              }
            }
            // Visual pulse
            particles.emit(pPos.x, pPos.y, 8, { color: wDef.color, speed: lvl.size * 1.5, life: 0.3, size: 3, sizeEnd: 0 });
            break;
          }

          case 'lightning': {
            const enemies = spatialHash.query(pPos.x, pPos.y, lvl.size);
            const validTargets: Entity[] = [];
            const seen = new Set<Entity>();
            for (const candidate of enemies) {
              if (seen.has(candidate) || !world.has(candidate, C.Enemy)) continue;
              seen.add(candidate);
              const ePos = world.get<Pos>(candidate, C.Pos);
              const dx = ePos.x - pPos.x, dy = ePos.y - pPos.y;
              if (dx * dx + dy * dy <= lvl.size * lvl.size) validTargets.push(candidate);
            }
            for (let i = 0; i < Math.min(lvl.count, validTargets.length); i++) {
              const idx = Math.floor(Math.random() * validTargets.length);
              const target = validTargets.splice(idx, 1)[0];
              const ePos = world.get<Pos>(target, C.Pos);
              applyDamage(world, target, lvl.damage * (1 + gameState.damageMult), particles, floatingText, player);
              // Lightning visual entity
              const bolt = world.spawn();
              world.add(bolt, C.Pos, { x: pPos.x, y: pPos.y });
              world.add(bolt, C.Lightning, { targetX: ePos.x, targetY: ePos.y, timer: 0.15 } as LightningData);
              particles.emit(ePos.x, ePos.y, 12, { color: '#ffff88', speed: 200, life: 0.2, size: 3 });
            }
            break;
          }

          case 'frost_nova': {
            const enemies = spatialHash.query(pPos.x, pPos.y, lvl.size);
            const seen = new Set<Entity>();
            for (const candidate of enemies) {
              if (seen.has(candidate) || !world.has(candidate, C.Enemy)) continue;
              seen.add(candidate);
              const ePos = world.get<Pos>(candidate, C.Pos);
              const dx = ePos.x - pPos.x, dy = ePos.y - pPos.y;
              if (dx * dx + dy * dy > lvl.size * lvl.size) continue;
              applyDamage(world, candidate, lvl.damage * (1 + gameState.damageMult), particles, floatingText, player);
              // Knockback
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const vel = world.get<Vel>(candidate, C.Vel);
              vel.x += (dx / dist) * lvl.knockback;
              vel.y += (dy / dist) * lvl.knockback;
              // Slow effect
              const enemy = world.get<Enemy>(candidate, C.Enemy);
              enemy.speed *= 0.3;
              // Restore speed after 2 seconds via timer
              setTimeout(() => {
                if (world.isAlive(candidate)) {
                  const def = Object.values(ENEMIES).find(d => d.name.toLowerCase().replace(' ', '') === enemy.type);
                  if (def) enemy.speed = def.speed * (1 + gameState.gameTime / GAME_DURATION * 0.3);
                }
              }, 2000);
            }
            particles.emit(pPos.x, pPos.y, 24, { color: wDef.color, speed: lvl.size * 2, life: 0.4, size: 5, sizeEnd: 1 });
            break;
          }

          case 'fire_trail': {
            // Only leave fire if moving
            const pVel = world.get<Vel>(pe, C.Vel);
            if (pVel.x * pVel.x + pVel.y * pVel.y < 100) { slot.timer = 0.05; break; }
            const fire = world.spawn();
            world.add(fire, C.Pos, { x: pPos.x, y: pPos.y });
            world.add(fire, C.Projectile, {
              damage: lvl.damage * (1 + gameState.damageMult),
              lifetime: 1.5,
              pierce: 99,
              weaponType: slot.type,
              hitEntities: new Set(),
              size: lvl.size,
            } as Projectile);
            world.add(fire, C.Collider, { radius: lvl.size });
            // Randomize fire color for realistic flame effect
            const fireColors = ['#ff6600', '#ff8822', '#ffaa00', '#ff4400', '#ffcc33'];
            const fc = fireColors[Math.floor(Math.random() * fireColors.length)];
            world.add(fire, C.Visual, { shape: 'flame', color: fc, size: lvl.size } as Visual);
            // Slight upward drift like real fire
            world.add(fire, C.Vel, { x: (Math.random() - 0.5) * 6, y: -10 - Math.random() * 8 });
            // Small ember spark
            particles.emit(pPos.x, pPos.y, 1, { color: '#ffcc33', speed: 40, life: 0.3, size: 2, sizeEnd: 0 });
            break;
          }
        }
      }
    }
  };
}

// ─── PROJECTILE SYSTEM ───────────────────────────────────────────────
export function createProjectileSystem() {
  return (world: World, dt: number) => {
    for (const e of world.query(C.Projectile, C.Pos)) {
      const proj = world.get<Projectile>(e, C.Projectile);
      proj.lifetime -= dt;
      if (proj.lifetime <= 0) {
        world.destroy(e);
      }
      // Fade fire trail
      if (proj.weaponType === 'fire_trail') {
        const vis = world.maybe<Visual>(e, C.Visual);
        if (vis) vis.size = proj.size * clamp(proj.lifetime / 1.0, 0, 1);
      }
    }
  };
}

// ─── COLLISION SYSTEM ────────────────────────────────────────────────
export function createCollisionSystem(
  spatialHash: SpatialHash<Entity>,
  particles: ParticleSystem,
  floatingText: FloatingTextManager
) {
  return (world: World, _dt: number) => {
    // Rebuild spatial hash every frame
    spatialHash.clear();
    for (const e of world.query(C.Pos, C.Collider)) {
      const pos = world.get<Pos>(e, C.Pos);
      const col = world.get<Collider>(e, C.Collider);
      spatialHash.insert(e, pos.x, pos.y, col.radius);
    }

    // Projectile vs Enemy
    for (const pe of world.query(C.Projectile, C.Pos, C.Collider)) {
      const proj = world.get<Projectile>(pe, C.Projectile);
      const pPos = world.get<Pos>(pe, C.Pos);
      const pCol = world.get<Collider>(pe, C.Collider);

      const nearby = spatialHash.query(pPos.x, pPos.y, pCol.radius + 40);
      const seen = new Set<Entity>();
      for (const candidate of nearby) {
        if (seen.has(candidate) || candidate === pe || !world.has(candidate, C.Enemy)) continue;
        seen.add(candidate);
        if (proj.hitEntities.has(candidate)) continue;
        const ePos = world.get<Pos>(candidate, C.Pos);
        const eCol = world.get<Collider>(candidate, C.Collider);
        const dx = pPos.x - ePos.x, dy = pPos.y - ePos.y;
        const distSq = dx * dx + dy * dy;
        const minDist = pCol.radius + eCol.radius;
        if (distSq < minDist * minDist) {
          // Get player for stat tracking
          const players = world.query(C.Player);
          const player = players.length > 0 ? world.get<Player>(players[0], C.Player) : undefined;
          applyDamage(world, candidate, proj.damage, particles, floatingText, player);
          proj.hitEntities.add(candidate);
          proj.pierce--;
          if (proj.pierce <= 0) { world.destroy(pe); break; }
        }
      }
    }

    // Enemy vs Player (contact damage)
    const players = world.query(C.Player, C.Pos, C.Collider);
    if (players.length === 0) return;
    const playerId = players[0];
    const playerPos = world.get<Pos>(playerId, C.Pos);
    const playerCol = world.get<Collider>(playerId, C.Collider);
    const playerHp = world.get<Health>(playerId, C.Health);
    const playerData = world.get<Player>(playerId, C.Player);

    if (playerHp.invuln > 0) return;

    const nearby = spatialHash.query(playerPos.x, playerPos.y, playerCol.radius + 20);
    const seen = new Set<Entity>();
    for (const candidate of nearby) {
      if (seen.has(candidate) || !world.has(candidate, C.Enemy)) continue;
      seen.add(candidate);
      const ePos = world.get<Pos>(candidate, C.Pos);
      const eCol = world.get<Collider>(candidate, C.Collider);
      const dx = playerPos.x - ePos.x, dy = playerPos.y - ePos.y;
      const distSq = dx * dx + dy * dy;
      const minDist = playerCol.radius + eCol.radius;
      if (distSq < minDist * minDist) {
        const enemy = world.get<Enemy>(candidate, C.Enemy);
        const dmg = Math.max(1, Math.round(enemy.damage - playerData.armor));
        playerHp.current = Math.max(0, playerHp.current - dmg);
        playerHp.invuln = 0.8;
        floatingText.add(playerPos.x, playerPos.y - 20, `-${dmg}`, '#ff4444', 0.8, 20);
        particles.emit(playerPos.x, playerPos.y, 6, { color: '#ff4444', speed: 100, life: 0.3 });
        break; // Only take damage from one enemy per frame
      }
    }
  };
}

// ─── PICKUP SYSTEM ───────────────────────────────────────────────────
export function createPickupSystem(particles: ParticleSystem, floatingText: FloatingTextManager) {
  return (world: World, dt: number) => {
    const players = world.query(C.Player, C.Pos);
    if (players.length === 0) return;
    const playerId = players[0];
    const pPos = world.get<Pos>(playerId, C.Pos);
    const player = world.get<Player>(playerId, C.Player);

    for (const e of world.query(C.XPGem, C.Pos)) {
      const gem = world.get<XPGem>(e, C.XPGem);
      const gPos = world.get<Pos>(e, C.Pos);
      const dx = pPos.x - gPos.x, dy = pPos.y - gPos.y;
      const distSq = dx * dx + dy * dy;
      const pickupRange = player.pickupRange;

      // Magnet attraction
      if (distSq < pickupRange * pickupRange * 4) {
        gem.attracted = true;
      }

      if (gem.attracted) {
        const dist = Math.sqrt(distSq) || 1;
        const speed = 400 + 200 * (1 - dist / (pickupRange * 2));
        gPos.x += (dx / dist) * speed * dt;
        gPos.y += (dy / dist) * speed * dt;
      }

      // Collect
      if (distSq < 20 * 20) {
        player.xp += gem.value;
        floatingText.add(gPos.x, gPos.y - 10, `+${gem.value} XP`, '#44ff88', 0.5, 12);
        particles.emit(gPos.x, gPos.y, 4, { color: '#44ff44', speed: 60, life: 0.2, size: 3 });
        world.destroy(e);
      }
    }
  };
}

// ─── WAVE SYSTEM ─────────────────────────────────────────────────────
export function createWaveSystem(
  gameState: { gameTime: number; bossSpawned: Set<number>; minibossSpawned: Set<number> }
) {
  let spawnAccumulator = 0;

  return (world: World, dt: number) => {
    const players = world.query(C.Player, C.Pos);
    if (players.length === 0) return;
    const pPos = world.get<Pos>(players[0], C.Pos);
    const time = gameState.gameTime;
    const enemyCount = world.count(C.Enemy);

    // Boss spawns
    for (const bt of BOSS_TIMES) {
      if (time >= bt && !gameState.bossSpawned.has(bt)) {
        gameState.bossSpawned.add(bt);
        spawnEnemy(world, pPos, 'boss', time);
      }
    }
    for (const mt of MINIBOSS_TIMES) {
      if (time >= mt && !gameState.minibossSpawned.has(mt)) {
        gameState.minibossSpawned.add(mt);
        spawnEnemy(world, pPos, 'miniboss', time);
      }
    }

    // Regular spawns
    if (enemyCount >= MAX_ENEMIES) return;

    const spawnRate = 0.5 + time / 60 * 0.7; // enemies per second, scales with time
    spawnAccumulator += spawnRate * dt;

    while (spawnAccumulator >= 1) {
      spawnAccumulator -= 1;
      if (world.count(C.Enemy) >= MAX_ENEMIES) break;

      // Pick random enemy type based on weights and unlock time
      const available = Object.entries(ENEMIES).filter(
        ([_, def]) => !def.isBoss && def.unlockTime <= time
      );
      const totalWeight = available.reduce((sum, [_, def]) => sum + def.weight, 0);
      let roll = Math.random() * totalWeight;
      let chosenType = available[0][0];
      for (const [type, def] of available) {
        roll -= def.weight;
        if (roll <= 0) { chosenType = type; break; }
      }

      spawnEnemy(world, pPos, chosenType, time);
    }
  };
}

function spawnEnemy(world: World, playerPos: Pos, type: string, gameTime: number): void {
  const def = ENEMIES[type];
  if (!def) return;

  // Spawn at random angle around player, outside screen
  const angle = randomAngle();
  const dist = ENEMY_SPAWN_DISTANCE + randomRange(0, 150);
  const x = playerPos.x + Math.cos(angle) * dist;
  const y = playerPos.y + Math.sin(angle) * dist;

  // Scale stats with time
  const timeMult = 1 + gameTime / GAME_DURATION * 1.5;

  const e = world.spawn();
  world.add(e, C.Pos, { x, y });
  world.add(e, C.Vel, { x: 0, y: 0 });
  world.add(e, C.Health, { current: def.hp * timeMult, max: def.hp * timeMult, invuln: 0 });
  world.add(e, C.Collider, { radius: def.size });
  world.add(e, C.Enemy, {
    type: type,
    speed: def.speed * (1 + gameTime / GAME_DURATION * 0.3),
    damage: def.damage * timeMult,
    xpValue: def.xp,
    contactTimer: 0,
  } as Enemy);
  world.add(e, C.Visual, {
    shape: def.shape,
    color: def.color,
    size: def.size,
    glow: def.color,
    glowSize: def.isBoss ? 20 : 8,
    rotation: 0,
  } as Visual);
}

// ─── DEATH SYSTEM ────────────────────────────────────────────────────
export function createDeathSystem(particles: ParticleSystem) {
  return (world: World, _dt: number) => {
    for (const e of world.query(C.Health, C.Pos)) {
      const hp = world.get<Health>(e, C.Health);
      if (hp.current > 0) continue;

      const pos = world.get<Pos>(e, C.Pos);

      // Enemy death
      if (world.has(e, C.Enemy)) {
        const enemy = world.get<Enemy>(e, C.Enemy);
        const vis = world.get<Visual>(e, C.Visual);

        // Spawn XP gems
        const gemCount = Math.max(1, Math.ceil(enemy.xpValue / 2));
        for (let i = 0; i < gemCount; i++) {
          const gem = world.spawn();
          const angle = randomAngle();
          const dist = randomRange(5, 25);
          world.add(gem, C.Pos, { x: pos.x + Math.cos(angle) * dist, y: pos.y + Math.sin(angle) * dist });
          world.add(gem, C.XPGem, {
            value: Math.ceil(enemy.xpValue / gemCount),
            attracted: false,
            magnetTimer: 0,
          } as XPGem);
          world.add(gem, C.Visual, {
            shape: 'diamond', color: '#44ff44', size: 5 + enemy.xpValue * 0.3,
            glow: '#22cc22', glowSize: 6,
          } as Visual);
          world.add(gem, C.Collider, { radius: 8 });
        }

        // Death particles
        particles.emit(pos.x, pos.y, 12, {
          color: vis?.color ?? '#ff4444',
          speed: 150,
          life: 0.4,
          size: 4,
          sizeEnd: 0,
        });

        world.destroy(e);
      }
    }

    // Update invulnerability timers
    for (const e of world.query(C.Health)) {
      const hp = world.get<Health>(e, C.Health);
      if (hp.invuln > 0) hp.invuln -= 1 / 60;
    }
  };
}

// ─── LIGHTNING CLEANUP ───────────────────────────────────────────────
export function createLightningSystem() {
  return (world: World, dt: number) => {
    for (const e of world.query(C.Lightning)) {
      const l = world.get<LightningData>(e, C.Lightning);
      l.timer -= dt;
      if (l.timer <= 0) world.destroy(e);
    }
  };
}

// ─── BONUS SPAWN SYSTEM ─────────────────────────────────────────────
const BONUS_TYPES: { type: Bonus['type']; color: string; glow: string; shape: Visual['shape']; weight: number }[] = [
  { type: 'heal',   color: '#ff4466', glow: '#ff2244', shape: 'diamond',  weight: 4 },
  { type: 'magnet', color: '#44ff88', glow: '#22cc44', shape: 'hexagon',  weight: 3 },
  { type: 'bomb',   color: '#ff8800', glow: '#ff5500', shape: 'triangle', weight: 2 },
  { type: 'speed',  color: '#44ccff', glow: '#2288ff', shape: 'diamond',  weight: 3 },
];

export function createBonusSpawnSystem() {
  let timer = 8; // first bonus after 8 seconds
  return (world: World, dt: number) => {
    const players = world.query(C.Player, C.Pos);
    if (players.length === 0) return;
    const pPos = world.get<Pos>(players[0], C.Pos);

    timer -= dt;
    if (timer > 0) return;
    timer = 10 + Math.random() * 10; // every 10-20 seconds

    // Limit active bonuses on map
    const existing = world.query(C.Bonus);
    if (existing.length >= 3) return;

    // Pick random type
    const totalWeight = BONUS_TYPES.reduce((s, b) => s + b.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosen = BONUS_TYPES[0];
    for (const bt of BONUS_TYPES) {
      roll -= bt.weight;
      if (roll <= 0) { chosen = bt; break; }
    }

    // Spawn at random position near player (200-400 px away)
    const angle = randomAngle();
    const dist = 200 + Math.random() * 200;
    const x = pPos.x + Math.cos(angle) * dist;
    const y = pPos.y + Math.sin(angle) * dist;

    const e = world.spawn();
    world.add(e, C.Pos, { x, y } as Pos);
    world.add(e, C.Bonus, { type: chosen.type, lifetime: 15 } as Bonus);
    world.add(e, C.Collider, { radius: 14 } as Collider);
    world.add(e, C.Visual, {
      shape: chosen.shape, color: chosen.color, size: 12,
      glow: chosen.glow, glowSize: 18, rotation: 0,
    } as Visual);
  };
}

// Buff durations (seconds)
const BUFF_DURATIONS: Record<string, number> = {
  heal: 6,
  magnet: 8,
  bomb: 5,
  speed: 8,
};

function addBuff(player: Player, type: string): void {
  const dur = BUFF_DURATIONS[type] ?? 5;
  const existing = player.buffs.find(b => b.type === type);
  if (existing) {
    // Refresh timer
    existing.remaining = dur;
    existing.duration = dur;
  } else {
    player.buffs.push({ type, remaining: dur, duration: dur });
    // Apply on-start effects
    if (type === 'speed') player.speed *= 1.5;
    if (type === 'magnet') player.pickupRange *= 3;
  }
}

export function createBonusPickupSystem(
  particles: ParticleSystem,
  floatingText: FloatingTextManager,
  spatialHash: SpatialHash<Entity>,
) {
  let bombTickTimer = 0;

  return (world: World, dt: number) => {
    const players = world.query(C.Player, C.Pos, C.Collider);
    if (players.length === 0) return;
    const playerId = players[0];
    const pPos = world.get<Pos>(playerId, C.Pos);
    const player = world.get<Player>(playerId, C.Player);
    const hp = world.get<Health>(playerId, C.Health);

    // ── Tick active buffs ──
    for (let i = player.buffs.length - 1; i >= 0; i--) {
      const buff = player.buffs[i];
      buff.remaining -= dt;

      // Per-frame buff effects
      if (buff.type === 'heal') {
        hp.current = Math.min(hp.current + hp.max * 0.05 * dt, hp.max);
      }

      // Expire
      if (buff.remaining <= 0) {
        // Remove on-end effects
        if (buff.type === 'speed') player.speed /= 1.5;
        if (buff.type === 'magnet') player.pickupRange /= 3;
        player.buffs.splice(i, 1);
      }
    }

    // Bomb buff: periodic AoE damage
    const hasBomb = player.buffs.some(b => b.type === 'bomb');
    if (hasBomb) {
      bombTickTimer -= dt;
      if (bombTickTimer <= 0) {
        bombTickTimer = 0.5;
        const enemies = spatialHash.query(pPos.x, pPos.y, 200);
        const seen = new Set<Entity>();
        for (const candidate of enemies) {
          if (seen.has(candidate) || !world.has(candidate, C.Enemy)) continue;
          seen.add(candidate);
          const ePos = world.get<Pos>(candidate, C.Pos);
          const ddx = ePos.x - pPos.x, ddy = ePos.y - pPos.y;
          if (ddx * ddx + ddy * ddy > 200 * 200) continue;
          const eHp = world.maybe<Health>(candidate, C.Health);
          if (eHp) {
            eHp.current -= 15;
            if (eHp.current <= 0) player.kills++;
          }
        }
        particles.emit(pPos.x, pPos.y, 8, { color: '#ff8800', speed: 180, life: 0.3, size: 4, sizeEnd: 0 });
      }
    } else {
      bombTickTimer = 0;
    }

    // Magnet buff: attract XP gems every frame
    if (player.buffs.some(b => b.type === 'magnet')) {
      for (const ge of world.query(C.XPGem)) {
        world.get<XPGem>(ge, C.XPGem).attracted = true;
      }
    }

    // ── Pick up bonuses on map ──
    for (const e of world.query(C.Bonus, C.Pos)) {
      const bonus = world.get<Bonus>(e, C.Bonus);
      const bPos = world.get<Pos>(e, C.Pos);

      // Spin animation
      const vis = world.maybe<Visual>(e, C.Visual);
      if (vis) vis.rotation = (vis.rotation ?? 0) + dt * 2.5;

      // Lifetime
      bonus.lifetime -= dt;
      if (bonus.lifetime <= 0) {
        world.destroy(e);
        continue;
      }
      // Blink when about to expire
      if (vis && bonus.lifetime < 3) {
        vis.size = 10 * (0.6 + Math.sin(bonus.lifetime * 10) * 0.4);
      }

      // Check pickup
      const dx = pPos.x - bPos.x, dy = pPos.y - bPos.y;
      if (dx * dx + dy * dy < 30 * 30) {
        addBuff(player, bonus.type);

        const labels: Record<string, [string, string]> = {
          heal: ['REGEN!', '#ff4466'],
          magnet: ['MAGNET!', '#44ff88'],
          bomb: ['BOOM!', '#ff8800'],
          speed: ['SPEED!', '#44ccff'],
        };
        const [text, color] = labels[bonus.type] ?? ['BUFF!', '#ffffff'];
        floatingText.add(bPos.x, bPos.y - 10, text, color, 0.8, 16);
        particles.emit(bPos.x, bPos.y, 12, { color: vis?.color ?? '#ffffff', speed: 120, life: 0.3, size: 4 });
        world.destroy(e);
      }
    }
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────
function applyDamage(
  world: World, entity: Entity, damage: number,
  particles: ParticleSystem, floatingText: FloatingTextManager,
  player?: Player
): void {
  const hp = world.maybe<Health>(entity, C.Health);
  if (!hp) return;
  hp.current -= damage;
  if (player) player.damageDealt += damage;

  const pos = world.get<Pos>(entity, C.Pos);
  floatingText.add(pos.x + randomRange(-10, 10), pos.y - 15, Math.round(damage).toString(), '#ffcc00', 0.6, 14);
  particles.emit(pos.x, pos.y, 3, { color: '#ffaa44', speed: 80, life: 0.15, size: 2 });

  // Track kill
  if (hp.current <= 0 && world.has(entity, C.Enemy) && player) {
    player.kills++;
  }
}
