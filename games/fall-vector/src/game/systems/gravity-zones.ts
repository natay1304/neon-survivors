/** Gravity zone system — applies per-body gravity based on zone */

import Matter from 'matter-js';
import { World } from '@survivors/core';
import type { GravityZoneDef } from '../levels/types';
import { C } from '../components';
import type { PhysicsBody, Player, MassData } from '../components';
import { DEFAULT_GRAVITY, PHYSICS_SCALE } from '../config';

export function createGravityZoneSystem(getZones: () => GravityZoneDef[]) {
  return (world: World, _dt: number) => {
    const zones = getZones();

    for (const e of world.query(C.PhysicsBody)) {
      const pb = world.get<PhysicsBody>(e, C.PhysicsBody);
      const body = pb.body;
      if (body.isStatic) continue;

      const pos = body.position;

      // Player uses personal gravity
      const player = world.maybe<Player>(e, C.Player);
      if (player) {
        const mass = world.maybe<MassData>(e, C.Mass);
        const m = mass ? mass.current : body.mass;
        Matter.Body.applyForce(body, pos, {
          x: player.personalGravity.x * m * PHYSICS_SCALE,
          y: player.personalGravity.y * m * PHYSICS_SCALE,
        });

        // Also update player's personal gravity based on zone if not tethered
        const glove = world.maybe(e, C.GraviGlove) as { tetherActive: boolean } | undefined;
        if (!glove?.tetherActive) {
          const zone = findZone(zones, pos.x, pos.y);
          if (zone) {
            player.personalGravity.x = zone.gravity.x;
            player.personalGravity.y = zone.gravity.y;
          } else {
            player.personalGravity.x = DEFAULT_GRAVITY.x;
            player.personalGravity.y = DEFAULT_GRAVITY.y;
          }
        }
        continue;
      }

      // Non-player: use zone gravity
      const zone = findZone(zones, pos.x, pos.y);
      const gravity = zone ? zone.gravity : DEFAULT_GRAVITY;
      const mass = world.maybe<MassData>(e, C.Mass);
      const m = mass ? mass.current : body.mass;

      Matter.Body.applyForce(body, pos, {
        x: gravity.x * m * PHYSICS_SCALE,
        y: gravity.y * m * PHYSICS_SCALE,
      });
    }
  };
}

function findZone(zones: GravityZoneDef[], x: number, y: number): GravityZoneDef | null {
  for (const zone of zones) {
    const b = zone.bounds;
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
      return zone;
    }
  }
  return null;
}
