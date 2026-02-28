/** Mass shift system — extract/deposit mass via mouse targeting */

import Matter from 'matter-js';
import { World, InputManager } from '@survivors/core';
import { C } from '../components';
import type { GraviGlove, MassData, Interactable, Pos } from '../components';
import { getBodyEntity } from '../physics';
import { GLOVE_EXTRACT_RATE, GLOVE_DEPOSIT_RATE } from '../config';

export function createMassShiftSystem(
  _input: InputManager,
  engine: Matter.Engine,
  getKeys: () => Set<string>,
  getMouseWorld: () => { x: number; y: number },
) {
  return (world: World, dt: number) => {
    const keys = getKeys();
    if (!keys.has('KeyE')) return;

    for (const pe of world.query(C.Player, C.PhysicsBody, C.GraviGlove)) {
      const glove = world.get<GraviGlove>(pe, C.GraviGlove);
      const playerPos = world.get<Pos>(pe, C.Pos);
      const mouseWorld = getMouseWorld();

      // Find bodies at mouse position
      const bodies = Matter.Query.point(
        Matter.Composite.allBodies(engine.world),
        { x: mouseWorld.x, y: mouseWorld.y },
      );

      if (bodies.length === 0) continue;

      // Find entity for nearest body
      let targetEntity: number | undefined;
      let targetBody: Matter.Body | undefined;
      for (const body of bodies) {
        if (body.isStatic) continue;
        const eid = getBodyEntity(body);
        if (eid === undefined || eid === pe) continue;
        const interactable = world.maybe<Interactable>(eid, C.Interactable);
        if (interactable?.canBeMassShifted) {
          targetEntity = eid;
          targetBody = body;
          break;
        }
      }

      if (targetEntity === undefined || !targetBody) continue;

      // Range check
      const targetPos = world.get<Pos>(targetEntity, C.Pos);
      const dx = targetPos.x - playerPos.x;
      const dy = targetPos.y - playerPos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > glove.massShiftRange * glove.massShiftRange) continue;

      const targetMass = world.get<MassData>(targetEntity, C.Mass);

      // Left mouse = extract, Right mouse button held = implicit extract
      // Without right-click detection in InputManager, we'll use:
      // E held = extract mode (mass flows from target to glove)
      // E + Shift held = deposit mode (mass flows from glove to target)
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) {
        // Deposit mass
        const amount = Math.min(
          GLOVE_DEPOSIT_RATE * dt,
          glove.storedMass,
        );
        if (amount > 0) {
          targetMass.current += amount;
          glove.storedMass -= amount;
          Matter.Body.setMass(targetBody, targetMass.current);
        }
      } else {
        // Extract mass (min mass is 1)
        const amount = Math.min(
          GLOVE_EXTRACT_RATE * dt,
          targetMass.current - 1,
          glove.maxStoredMass - glove.storedMass,
        );
        if (amount > 0) {
          targetMass.current -= amount;
          glove.storedMass += amount;
          Matter.Body.setMass(targetBody, Math.max(1, targetMass.current));
        }
      }
    }
  };
}
