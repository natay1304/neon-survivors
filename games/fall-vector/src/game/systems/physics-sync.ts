/** Physics sync system — steps Matter.js engine and syncs ECS positions */

import Matter from 'matter-js';
import { World } from '@survivors/core';
import { C } from '../components';
import type { PhysicsBody, Pos } from '../components';

export function createPhysicsSyncSystem(engine: Matter.Engine) {
  return (world: World, dt: number) => {
    // Step Matter.js at fixed rate (dt is in seconds, Matter expects ms)
    Matter.Engine.update(engine, dt * 1000);

    // Sync ECS positions from Matter.js bodies
    for (const e of world.query(C.PhysicsBody, C.Pos)) {
      const pb = world.get<PhysicsBody>(e, C.PhysicsBody);
      const pos = world.get<Pos>(e, C.Pos);

      pos.x = pb.body.position.x;
      pos.y = pb.body.position.y;
      pos.rotation = pb.body.angle;
    }
  };
}
