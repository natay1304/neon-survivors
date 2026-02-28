/** Gravity well system — creates attraction points, applies forces */

import Matter from 'matter-js';
import * as THREE from 'three';
import { World, InputManager } from '@survivors/core';
import { C } from '../components';
import type {
  Pos, GraviGlove, GravityWellData, ThreeObj,
} from '../components';
import { createGravityWellMesh } from '../renderer/sprites';
import { GLOVE_WELL_STRENGTH, GLOVE_WELL_RADIUS, GLOVE_WELL_DURATION } from '../config';

export function createGravityWellSystem(
  _input: InputManager,
  engine: Matter.Engine,
  threeScene: THREE.Scene,
  getKeys: () => Set<string>,
  getMouseWorld: () => { x: number; y: number },
) {
  let justPressed = false;

  return (world: World, dt: number) => {
    const keys = getKeys();

    // --- Spawning new wells ---
    const qPressed = keys.has('KeyQ');
    if (qPressed && !justPressed) {
      justPressed = true;

      for (const pe of world.query(C.Player, C.GraviGlove)) {
        const glove = world.get<GraviGlove>(pe, C.GraviGlove);
        if (glove.wellTimer > 0) continue;

        const mouseWorld = getMouseWorld();
        glove.wellTimer = glove.wellCooldown;

        // Spawn gravity well entity
        const e = world.spawn();
        world.add<Pos>(e, C.Pos, { x: mouseWorld.x, y: mouseWorld.y, rotation: 0 });
        world.add<GravityWellData>(e, C.GravityWell, {
          strength: GLOVE_WELL_STRENGTH,
          radius: GLOVE_WELL_RADIUS,
          duration: GLOVE_WELL_DURATION,
          timer: GLOVE_WELL_DURATION,
          ownerId: pe,
        });

        const mesh = createGravityWellMesh(GLOVE_WELL_RADIUS);
        mesh.position.x = mouseWorld.x;
        mesh.position.y = -mouseWorld.y;
        threeScene.add(mesh);
        world.add<ThreeObj>(e, C.ThreeObj, { object: mesh });
      }
    }
    if (!qPressed) justPressed = false;

    // --- Update well cooldown on player ---
    for (const pe of world.query(C.Player, C.GraviGlove)) {
      const glove = world.get<GraviGlove>(pe, C.GraviGlove);
      if (glove.wellTimer > 0) {
        glove.wellTimer -= dt;
      }
    }

    // --- Apply attraction forces + decay ---
    for (const we of world.query(C.GravityWell, C.Pos)) {
      const well = world.get<GravityWellData>(we, C.GravityWell);
      const wellPos = world.get<Pos>(we, C.Pos);

      well.timer -= dt;

      // Update visual opacity based on remaining time
      const obj = world.maybe<ThreeObj>(we, C.ThreeObj);
      if (obj) {
        const fade = well.timer / well.duration;
        obj.object.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            if (child.material.transparent) {
              child.material.opacity = 0.3 * fade;
            }
          }
        });
      }

      if (well.timer <= 0) {
        // Remove from Three.js scene
        if (obj) {
          obj.object.removeFromParent();
        }
        world.destroy(we);
        continue;
      }

      // Apply attraction to all dynamic bodies
      const allBodies = Matter.Composite.allBodies(engine.world);
      for (const body of allBodies) {
        if (body.isStatic) continue;

        const dx = wellPos.x - body.position.x;
        const dy = wellPos.y - body.position.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist > well.radius || dist < 5) continue;

        // Inverse-square law with strength falloff
        const mass = body.mass;
        const forceMag = (well.strength * mass) / Math.max(distSq, 100);
        const fade = well.timer / well.duration;

        Matter.Body.applyForce(body, body.position, {
          x: (dx / dist) * forceMag * fade,
          y: (dy / dist) * forceMag * fade,
        });
      }
    }
  };
}
