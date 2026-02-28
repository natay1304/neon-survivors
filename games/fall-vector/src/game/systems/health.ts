/** Health system — damage processing, invulnerability, death */

import Matter from 'matter-js';
import { World } from '@survivors/core';
import { C } from '../components';
import type { Health, PhysicsBody, EnemyData, Pos, ThreeObj } from '../components';
import { INVULN_DURATION } from '../config';

export function createHealthSystem(engine: Matter.Engine) {
  const contactPairs = new Set<string>();

  Matter.Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      contactPairs.add(pairKey(pair.bodyA.id, pair.bodyB.id));
    }
  });

  Matter.Events.on(engine, 'collisionEnd', (event) => {
    for (const pair of event.pairs) {
      contactPairs.delete(pairKey(pair.bodyA.id, pair.bodyB.id));
    }
  });

  return (world: World, dt: number) => {
    // Decrement invulnerability timers
    for (const e of world.query(C.Health)) {
      const health = world.get<Health>(e, C.Health);
      if (health.invulnTimer > 0) {
        health.invulnTimer -= dt;
      }
    }

    // Process enemy-player contact damage
    for (const pe of world.query(C.Player, C.PhysicsBody, C.Health)) {
      const playerHealth = world.get<Health>(pe, C.Health);
      if (playerHealth.invulnTimer > 0) continue;

      const playerBody = world.get<PhysicsBody>(pe, C.PhysicsBody);

      for (const ee of world.query(C.Enemy, C.PhysicsBody)) {
        const enemyBody = world.get<PhysicsBody>(ee, C.PhysicsBody);
        const key = pairKey(playerBody.body.id, enemyBody.body.id);

        if (contactPairs.has(key)) {
          const enemy = world.get<EnemyData>(ee, C.Enemy);
          playerHealth.current -= enemy.damage;
          playerHealth.invulnTimer = INVULN_DURATION;

          // Knockback
          const playerPos = world.get<Pos>(pe, C.Pos);
          const enemyPos = world.get<Pos>(ee, C.Pos);
          const dx = playerPos.x - enemyPos.x;
          const dy = playerPos.y - enemyPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 1) {
            Matter.Body.setVelocity(playerBody.body, {
              x: playerBody.body.velocity.x + (dx / dist) * 5,
              y: playerBody.body.velocity.y + (dy / dist) * 5,
            });
          }
          break; // Only one damage instance per frame
        }
      }
    }

    // Destroy dead enemies + remove Three.js objects
    for (const e of world.query(C.Enemy, C.Health)) {
      const health = world.get<Health>(e, C.Health);
      if (health.current <= 0) {
        const obj = world.maybe<ThreeObj>(e, C.ThreeObj);
        if (obj) obj.object.removeFromParent();

        const pb = world.maybe<PhysicsBody>(e, C.PhysicsBody);
        if (pb) Matter.Composite.remove(engine.world, pb.body);

        world.destroy(e);
      }
    }
  };
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}
