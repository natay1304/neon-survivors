/** Camera system — follows player with smooth interpolation and tether rotation */

import { World, Camera2D } from '@survivors/core';
import { C } from '../components';
import type { Player, Pos } from '../components';

export function createCameraSystem(camera: Camera2D) {
  let targetRotation = 0;
  let currentRotation = 0;

  return (world: World, dt: number) => {
    for (const e of world.query(C.Player, C.Pos)) {
      const pos = world.get<Pos>(e, C.Pos);
      const player = world.get<Player>(e, C.Player);

      // Follow player
      camera.follow(pos, 0.08, dt);

      // Calculate camera rotation based on personal gravity direction
      // When gravity = (0, 1) → rotation = 0 (normal)
      // When gravity = (1, 0) → rotation = -PI/2 (right is down)
      // When gravity = (0, -1) → rotation = PI (flipped)
      // When gravity = (-1, 0) → rotation = PI/2 (left is down)
      targetRotation = Math.atan2(-player.personalGravity.x, player.personalGravity.y);

      // Handle wrapping for smooth rotation
      let diff = targetRotation - currentRotation;
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      currentRotation += diff * Math.min(1, dt * 5);

      // Apply rotation to Three.js camera
      camera.threeCamera.rotation.z = currentRotation;
    }

    camera.update(dt);
  };
}
