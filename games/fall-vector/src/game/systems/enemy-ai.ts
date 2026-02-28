/** Enemy AI system — patrol and chase behaviors */

import Matter from 'matter-js';
import { World } from '@survivors/core';
import { C } from '../components';
import type { EnemyData, PhysicsBody, Pos } from '../components';

export function createEnemyAISystem() {
  return (world: World, dt: number) => {
    // Get player position
    const players = world.query(C.Player, C.Pos);
    if (players.length === 0) return;
    const playerPos = world.get<Pos>(players[0], C.Pos);

    for (const e of world.query(C.Enemy, C.PhysicsBody, C.Pos)) {
      const enemy = world.get<EnemyData>(e, C.Enemy);
      const pb = world.get<PhysicsBody>(e, C.PhysicsBody);
      const pos = world.get<Pos>(e, C.Pos);
      const body = pb.body;

      switch (enemy.behavior) {
        case 'patrol': {
          if (enemy.patrolPoints.length < 2) break;
          const target = enemy.patrolPoints[enemy.patrolIndex];
          const dx = target.x - pos.x;
          const dy = target.y - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 10) {
            // Move to next patrol point
            enemy.patrolIndex += enemy.patrolDir;
            if (enemy.patrolIndex >= enemy.patrolPoints.length) {
              enemy.patrolIndex = enemy.patrolPoints.length - 2;
              enemy.patrolDir = -1;
            } else if (enemy.patrolIndex < 0) {
              enemy.patrolIndex = 1;
              enemy.patrolDir = 1;
            }
          } else {
            const force = enemy.speed * 0.0003;
            Matter.Body.applyForce(body, body.position, {
              x: (dx / dist) * force,
              y: (dy / dist) * force,
            });
          }
          break;
        }

        case 'chase': {
          const dx = playerPos.x - pos.x;
          const dy = playerPos.y - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 20 && dist < 500) {
            const force = enemy.speed * 0.0003;
            Matter.Body.applyForce(body, body.position, {
              x: (dx / dist) * force,
              y: (dy / dist) * force,
            });
          }
          break;
        }

        case 'stationary': {
          // TODO: Add projectile shooting for sentinels
          enemy.attackTimer -= dt;
          break;
        }
      }
    }
  };
}
