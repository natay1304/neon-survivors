/** Player input system — gravity-relative movement and jump */

import Matter from 'matter-js';
import { World, InputManager } from '@survivors/core';
import { C } from '../components';
import type { Player, PhysicsBody } from '../components';
import { MAX_VELOCITY } from '../config';

export function createInputSystem(
  input: InputManager,
  getKeys: () => Set<string>,
) {
  return (world: World, dt: number) => {
    input.update();
    const keys = getKeys();

    for (const e of world.query(C.Player, C.PhysicsBody, C.GraviGlove)) {
      const player = world.get<Player>(e, C.Player);
      const pb = world.get<PhysicsBody>(e, C.PhysicsBody);
      const body = pb.body;

      const gx = player.personalGravity.x;
      const gy = player.personalGravity.y;

      // "Right" direction perpendicular to gravity
      const rightX = -gy;
      const rightY = gx;

      // Horizontal movement relative to personal gravity
      let moveInput = 0;
      if (input.dir.x !== 0) {
        moveInput = input.dir.x;
      }

      if (moveInput !== 0) {
        player.facingDir = moveInput > 0 ? 1 : -1;
      }

      const moveForce = moveInput * player.speed * 0.001;
      Matter.Body.applyForce(body, body.position, {
        x: rightX * moveForce,
        y: rightY * moveForce,
      });

      // Air friction for horizontal control (stronger decel for snappy stops)
      const rightVel = body.velocity.x * rightX + body.velocity.y * rightY;
      if (Math.abs(moveInput) < 0.1) {
        // Decelerate when not pressing movement — stronger friction for crisp stops
        Matter.Body.applyForce(body, body.position, {
          x: -rightX * rightVel * 0.006,
          y: -rightY * rightVel * 0.006,
        });
      }

      // Jump — opposite to personal gravity
      const wantsJump = keys.has('Space') || keys.has('KeyW') || keys.has('ArrowUp') || input.dir.y < -0.5;
      if (wantsJump && player.canJump && (player.isGrounded || player.groundedTimer > 0)) {
        const jumpX = -gx * player.jumpForce;
        const jumpY = -gy * player.jumpForce;

        // Cancel existing downward velocity before jumping
        const downVel = body.velocity.x * gx + body.velocity.y * gy;
        if (downVel > 0) {
          Matter.Body.setVelocity(body, {
            x: body.velocity.x - gx * downVel,
            y: body.velocity.y - gy * downVel,
          });
        }

        Matter.Body.setVelocity(body, {
          x: body.velocity.x + jumpX,
          y: body.velocity.y + jumpY,
        });
        player.canJump = false;
        player.isGrounded = false;
        player.groundedTimer = 0;
      }

      // Reset jump ability when key released
      if (!wantsJump) {
        player.canJump = true;
      }

      // Coyote time
      if (!player.isGrounded && player.groundedTimer > 0) {
        player.groundedTimer -= dt;
      }

      // Clamp velocity
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      if (speed > MAX_VELOCITY) {
        const scale = MAX_VELOCITY / speed;
        Matter.Body.setVelocity(body, {
          x: body.velocity.x * scale,
          y: body.velocity.y * scale,
        });
      }
    }
  };
}
