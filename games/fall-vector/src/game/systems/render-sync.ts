/** Render sync system — syncs ECS Pos to Three.js objects */

import { World } from '@survivors/core';
import { C } from '../components';
import type { Pos, ThreeObj, MassData } from '../components';

export function createRenderSyncSystem() {
  return (world: World, _dt: number) => {
    for (const e of world.query(C.Pos, C.ThreeObj)) {
      const pos = world.get<Pos>(e, C.Pos);
      const obj = world.get<ThreeObj>(e, C.ThreeObj);

      // Game Y-down → Three.js Y-up
      obj.object.position.x = pos.x;
      obj.object.position.y = -pos.y;

      // Sync rotation (invert for Three.js CCW convention)
      obj.object.rotation.z = -pos.rotation;

      // Scale based on mass for mass-shiftable objects
      const mass = world.maybe<MassData>(e, C.Mass);
      if (mass && mass.current !== mass.base) {
        const scale = Math.sqrt(mass.current / mass.base);
        obj.object.scale.setScalar(scale);
      }
    }
  };
}
