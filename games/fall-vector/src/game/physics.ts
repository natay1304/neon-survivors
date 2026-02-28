/** Matter.js engine setup and helpers */

import Matter from 'matter-js';

export function createPhysicsEngine(): Matter.Engine {
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 0, scale: 0 },
  });
  return engine;
}

/** Find ECS entity ID stored on a Matter.js body */
export function getBodyEntity(body: Matter.Body): number | undefined {
  return (body as BodyWithEntity).entityId;
}

/** Store ECS entity ID on a Matter.js body */
export function setBodyEntity(body: Matter.Body, entityId: number): void {
  (body as BodyWithEntity).entityId = entityId;
}

interface BodyWithEntity extends Matter.Body {
  entityId?: number;
}

/** Create a static rectangular body */
export function createStaticRect(
  x: number, y: number, w: number, h: number,
): Matter.Body {
  return Matter.Bodies.rectangle(x + w / 2, y + h / 2, w, h, { isStatic: true });
}

/** Create a dynamic rectangular body */
export function createDynamicRect(
  x: number, y: number, w: number, h: number, mass: number,
): Matter.Body {
  const body = Matter.Bodies.rectangle(x, y, w, h, { mass });
  Matter.Body.setMass(body, mass);
  return body;
}

/** Create a dynamic circle body */
export function createDynamicCircle(
  x: number, y: number, radius: number, mass: number,
): Matter.Body {
  const body = Matter.Bodies.circle(x, y, radius, { mass });
  Matter.Body.setMass(body, mass);
  return body;
}
