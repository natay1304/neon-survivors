/** Level loader — converts LevelData into ECS entities, Matter.js bodies, and Three.js meshes */

import * as THREE from 'three';
import Matter from 'matter-js';
import { World } from '@survivors/core';
import type { LevelData, GravityZoneDef } from './types';
import { C } from '../components';
import type {
  Pos, PhysicsBody, MassData, Player, GraviGlove, Health,
  EnemyData, Interactable, Visual, ThreeObj, HazardData,
  Collectible, Door, CheckpointData, PlatformData,
} from '../components';
import { createStaticRect, createDynamicRect, setBodyEntity } from '../physics';
import {
  createRectMesh, createPlayerMesh, createZoneOverlay,
  createDoorMesh, createEnemyMesh, createCollectibleMesh,
} from '../renderer/sprites';
import {
  PLAYER_SPEED, PLAYER_JUMP_FORCE, PLAYER_MAX_HP,
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_MASS,
  GLOVE_MAX_STORED_MASS, GLOVE_MASS_SHIFT_RANGE, GLOVE_WELL_COOLDOWN,
  ENEMIES, DEFAULT_GRAVITY,
} from '../config';

export interface LoadedLevel {
  gravityZones: GravityZoneDef[];
  playerEntity: number;
}

export function loadLevel(
  level: LevelData,
  world: World,
  engine: Matter.Engine,
  scene: THREE.Scene,
): LoadedLevel {
  const matterWorld = engine.world;

  // — Gravity zone overlays —
  for (const zone of level.gravityZones) {
    const b = zone.bounds;
    const overlay = createZoneOverlay(b.width, b.height, zone.color);
    overlay.position.x = b.x + b.width / 2;
    overlay.position.y = -(b.y + b.height / 2);
    scene.add(overlay);
  }

  // — Static bodies (walls, floors, platforms) —
  for (const def of level.staticBodies) {
    const body = createStaticRect(def.x, def.y, def.width, def.height);
    Matter.Composite.add(matterWorld, body);

    const e = world.spawn();
    setBodyEntity(body, e);

    world.add<Pos>(e, C.Pos, {
      x: def.x + def.width / 2,
      y: def.y + def.height / 2,
      rotation: 0,
    });
    world.add<PhysicsBody>(e, C.PhysicsBody, { body });
    world.add<Visual>(e, C.Visual, {
      color: def.color,
      width: def.width,
      height: def.height,
      layer: 0,
    });

    const mesh = createRectMesh(def.width, def.height, def.color, 0);
    mesh.position.x = def.x + def.width / 2;
    mesh.position.y = -(def.y + def.height / 2);
    scene.add(mesh);
    world.add<ThreeObj>(e, C.ThreeObj, { object: mesh });

    if (def.isHazard) {
      world.add<HazardData>(e, C.Hazard, {
        type: def.hazardType ?? 'spikes',
        damage: def.hazardDamage ?? 50,
        instant: def.hazardType === 'void',
      });
    }

    world.add<PlatformData>(e, C.Platform, {
      type: 'static',
      breakMassThreshold: 0,
      broken: false,
    });
  }

  // — Dynamic bodies (crates, boulders) —
  for (const def of level.dynamicBodies) {
    const body = createDynamicRect(def.x, def.y, def.width, def.height, def.mass);
    Matter.Composite.add(matterWorld, body);

    const e = world.spawn();
    setBodyEntity(body, e);

    world.add<Pos>(e, C.Pos, { x: def.x, y: def.y, rotation: 0 });
    world.add<PhysicsBody>(e, C.PhysicsBody, { body });
    world.add<MassData>(e, C.Mass, { base: def.mass, current: def.mass });
    world.add<Visual>(e, C.Visual, {
      color: def.color,
      width: def.width,
      height: def.height,
      layer: 1,
    });

    if (def.canBeMassShifted) {
      world.add<Interactable>(e, C.Interactable, {
        type: def.interactType ?? 'crate',
        canBeMassShifted: true,
        breakable: def.breakable ?? false,
        breakMassThreshold: def.breakMassThreshold ?? 0,
      });
    }

    const mesh = createRectMesh(def.width, def.height, def.color, 1);
    mesh.position.x = def.x;
    mesh.position.y = -def.y;
    scene.add(mesh);
    world.add<ThreeObj>(e, C.ThreeObj, { object: mesh });
  }

  // — Enemies —
  for (const def of level.enemies) {
    const cfg = ENEMIES[def.type];
    if (!cfg) continue;

    const body = createDynamicRect(def.x, def.y, cfg.width, cfg.height, cfg.mass);
    Matter.Composite.add(matterWorld, body);

    const e = world.spawn();
    setBodyEntity(body, e);

    world.add<Pos>(e, C.Pos, { x: def.x, y: def.y, rotation: 0 });
    world.add<PhysicsBody>(e, C.PhysicsBody, { body });
    world.add<MassData>(e, C.Mass, { base: cfg.mass, current: cfg.mass });
    world.add<Health>(e, C.Health, { current: cfg.hp, max: cfg.hp, invulnTimer: 0 });
    world.add<EnemyData>(e, C.Enemy, {
      type: def.type,
      speed: cfg.speed,
      damage: cfg.damage,
      behavior: def.behavior,
      patrolPoints: def.patrolPoints ?? [],
      patrolIndex: 0,
      patrolDir: 1,
      attackTimer: 0,
    });
    world.add<Visual>(e, C.Visual, {
      color: cfg.color,
      width: cfg.width,
      height: cfg.height,
      layer: 4,
    });

    const mesh = createEnemyMesh(cfg.width, cfg.height, cfg.color);
    mesh.position.x = def.x;
    mesh.position.y = -def.y;
    scene.add(mesh);
    world.add<ThreeObj>(e, C.ThreeObj, { object: mesh });
  }

  // — Collectibles —
  for (const def of level.collectibles) {
    const e = world.spawn();
    world.add<Pos>(e, C.Pos, { x: def.x, y: def.y, rotation: 0 });
    world.add<Collectible>(e, C.Collectible, {
      type: def.type,
      upgradeId: def.upgradeId ?? '',
    });

    const color = def.type === 'upgrade' ? 0x00ff88 : def.type === 'health' ? 0xff4444 : 0xffcc00;
    const mesh = createCollectibleMesh(color);
    mesh.position.x = def.x;
    mesh.position.y = -def.y;
    scene.add(mesh);
    world.add<ThreeObj>(e, C.ThreeObj, { object: mesh });
  }

  // — Doors —
  for (const def of level.doors) {
    const e = world.spawn();
    world.add<Pos>(e, C.Pos, {
      x: def.x + def.width / 2,
      y: def.y + def.height / 2,
      rotation: 0,
    });
    world.add<Door>(e, C.Door, {
      targetLevel: def.targetLevel,
      targetSpawn: def.targetSpawn,
    });
    world.add<Visual>(e, C.Visual, {
      color: def.color,
      width: def.width,
      height: def.height,
      layer: 2,
    });

    const mesh = createDoorMesh(def.width, def.height, def.color);
    mesh.position.x = def.x + def.width / 2;
    mesh.position.y = -(def.y + def.height / 2);
    scene.add(mesh);
    world.add<ThreeObj>(e, C.ThreeObj, { object: mesh });
  }

  // — Checkpoints —
  for (const def of level.checkpoints) {
    const e = world.spawn();
    world.add<Pos>(e, C.Pos, { x: def.x, y: def.y, rotation: 0 });
    world.add<CheckpointData>(e, C.Checkpoint, {
      id: def.id,
      activated: false,
    });

    const mesh = createRectMesh(12, 32, 0xffcc00, 2);
    mesh.position.x = def.x;
    mesh.position.y = -def.y;
    scene.add(mesh);
    world.add<ThreeObj>(e, C.ThreeObj, { object: mesh });
  }

  // — Player —
  const playerBody = createDynamicRect(
    level.playerSpawn.x, level.playerSpawn.y,
    PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_MASS,
  );
  playerBody.frictionAir = 0.02;
  playerBody.friction = 0.1;
  Matter.Body.setInertia(playerBody, Infinity); // Prevent rotation
  Matter.Composite.add(matterWorld, playerBody);

  const playerEntity = world.spawn();
  setBodyEntity(playerBody, playerEntity);

  world.add<Pos>(playerEntity, C.Pos, {
    x: level.playerSpawn.x,
    y: level.playerSpawn.y,
    rotation: 0,
  });
  world.add<PhysicsBody>(playerEntity, C.PhysicsBody, { body: playerBody });
  world.add<MassData>(playerEntity, C.Mass, { base: PLAYER_MASS, current: PLAYER_MASS });
  world.add<Player>(playerEntity, C.Player, {
    speed: PLAYER_SPEED,
    jumpForce: PLAYER_JUMP_FORCE,
    isGrounded: false,
    facingDir: 1,
    personalGravity: { x: DEFAULT_GRAVITY.x, y: DEFAULT_GRAVITY.y },
    canJump: false,
    groundedTimer: 0,
  });
  world.add<GraviGlove>(playerEntity, C.GraviGlove, {
    storedMass: 0,
    maxStoredMass: GLOVE_MAX_STORED_MASS,
    massShiftRange: GLOVE_MASS_SHIFT_RANGE,
    wellCooldown: GLOVE_WELL_COOLDOWN,
    wellTimer: 0,
    tetherActive: false,
    hasRepulsion: false,
    hasVectorFreeze: false,
    hasTimeWarp: false,
  });
  world.add<Health>(playerEntity, C.Health, {
    current: PLAYER_MAX_HP,
    max: PLAYER_MAX_HP,
    invulnTimer: 0,
  });

  const playerMesh = createPlayerMesh(PLAYER_WIDTH, PLAYER_HEIGHT);
  playerMesh.position.x = level.playerSpawn.x;
  playerMesh.position.y = -level.playerSpawn.y;
  scene.add(playerMesh);
  world.add<ThreeObj>(playerEntity, C.ThreeObj, { object: playerMesh });

  return {
    gravityZones: level.gravityZones,
    playerEntity,
  };
}
