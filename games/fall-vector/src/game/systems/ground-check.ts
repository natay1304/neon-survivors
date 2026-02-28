/** Ground check system — uses Matter.js collision events */

import Matter from 'matter-js';
import { World } from '@survivors/core';
import { C } from '../components';
import type { Player, PhysicsBody } from '../components';
import { COYOTE_TIME } from '../config';

export function createGroundCheckSystem(engine: Matter.Engine) {
  const groundedBodies = new Set<number>();

  Matter.Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      checkGrounding(pair, groundedBodies, true);
    }
  });

  Matter.Events.on(engine, 'collisionActive', (event) => {
    for (const pair of event.pairs) {
      checkGrounding(pair, groundedBodies, true);
    }
  });

  Matter.Events.on(engine, 'collisionEnd', (event) => {
    for (const pair of event.pairs) {
      checkGrounding(pair, groundedBodies, false);
    }
  });

  return (world: World, _dt: number) => {
    for (const e of world.query(C.Player, C.PhysicsBody)) {
      const player = world.get<Player>(e, C.Player);
      const pb = world.get<PhysicsBody>(e, C.PhysicsBody);

      const wasGrounded = player.isGrounded;
      player.isGrounded = groundedBodies.has(pb.body.id);

      if (player.isGrounded) {
        player.groundedTimer = COYOTE_TIME;
        player.canJump = true;
      } else if (wasGrounded && !player.isGrounded) {
        // Start coyote timer
        player.groundedTimer = COYOTE_TIME;
      }
    }
  };
}

function checkGrounding(
  pair: Matter.Pair,
  groundedBodies: Set<number>,
  isActive: boolean,
): void {
  const { bodyA, bodyB } = pair;

  // Check if one body is static (ground) and other is dynamic
  if (bodyA.isStatic && !bodyB.isStatic) {
    if (isActive) {
      // Check if collision normal suggests "standing on top"
      const normal = pair.collision.normal;
      // The normal should point from B to A (up from ground)
      // This means BodyB is above and being supported
      if (Math.abs(normal.y) > 0.5) {
        groundedBodies.add(bodyB.id);
      }
    } else {
      groundedBodies.delete(bodyB.id);
    }
  } else if (bodyB.isStatic && !bodyA.isStatic) {
    if (isActive) {
      const normal = pair.collision.normal;
      if (Math.abs(normal.y) > 0.5) {
        groundedBodies.add(bodyA.id);
      }
    } else {
      groundedBodies.delete(bodyA.id);
    }
  }
}
