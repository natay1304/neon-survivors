/** Surface tether system — changes player personal gravity via raycast */

import Matter from 'matter-js';
import { World, InputManager } from '@survivors/core';
import { C } from '../components';
import type { Player, GraviGlove, Pos } from '../components';
import { DEFAULT_GRAVITY } from '../config';

export function createSurfaceTetherSystem(
  _input: InputManager,
  engine: Matter.Engine,
  getKeys: () => Set<string>,
  getMouseWorld: () => { x: number; y: number },
) {
  let justPressed = false;
  let justPressedReset = false;

  return (world: World, _dt: number) => {
    const keys = getKeys();
    const fPressed = keys.has('KeyF');
    const rResetPressed = keys.has('KeyG'); // G to reset gravity

    for (const e of world.query(C.Player, C.PhysicsBody, C.GraviGlove)) {
      const player = world.get<Player>(e, C.Player);
      const glove = world.get<GraviGlove>(e, C.GraviGlove);
      const pos = world.get<Pos>(e, C.Pos);

      // Reset tether with G key
      if (rResetPressed && !justPressedReset) {
        glove.tetherActive = false;
        player.personalGravity.x = DEFAULT_GRAVITY.x;
        player.personalGravity.y = DEFAULT_GRAVITY.y;
      }

      // Activate tether with F key
      if (fPressed && !justPressed) {
        const mouseWorld = getMouseWorld();
        const start = { x: pos.x, y: pos.y };
        const end = { x: mouseWorld.x, y: mouseWorld.y };

        // Raycast from player to mouse
        const allBodies = Matter.Composite.allBodies(engine.world);
        const collisions = Matter.Query.ray(allBodies, start, end, 5);

        if (collisions.length > 0) {
          // Find the first static body hit
          for (const col of collisions) {
            const hitBody = col.bodyA.isStatic ? col.bodyA : (col.bodyB.isStatic ? col.bodyB : null);
            if (!hitBody) continue;

            // Calculate surface normal from the ray collision
            // Determine which face was hit by comparing positions
            const hitX = (start.x + end.x) / 2;
            const hitY = (start.y + end.y) / 2;

            // Simple normal calculation: direction from hit body center to hit point
            const bx = hitBody.position.x;
            const by = hitBody.position.y;
            const nx = hitX - bx;
            const ny = hitY - by;
            const nLen = Math.sqrt(nx * nx + ny * ny);

            if (nLen < 1) continue;

            // Snap normal to nearest cardinal direction for cleaner feel
            const normX = nx / nLen;
            const normY = ny / nLen;

            let snappedX = 0;
            let snappedY = 0;
            if (Math.abs(normX) > Math.abs(normY)) {
              snappedX = normX > 0 ? 1 : -1;
            } else {
              snappedY = normY > 0 ? 1 : -1;
            }

            // Personal gravity is opposite of surface normal
            // (gravity pulls toward the surface)
            player.personalGravity.x = -snappedX;
            player.personalGravity.y = -snappedY;
            glove.tetherActive = true;
            break;
          }
        }
      }
    }

    justPressed = fPressed;
    justPressedReset = rResetPressed;
  };
}
