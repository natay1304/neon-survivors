/**
 * Collision detection primitives — reusable across all games.
 *
 * Provides circle-circle, circle-AABB, point-AABB, and point-circle
 * collision tests used by all game collision systems.
 */

// ── Circle vs Circle ─────────────────────────────────────────────────

/** Test overlap between two circles (position + radius). Returns true on hit. */
export function circleVsCircle(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const combinedR = ar + br;
  return dx * dx + dy * dy < combinedR * combinedR;
}

/** Squared distance between two circles' centers (avoids sqrt). */
export function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// ── Circle vs AABB ───────────────────────────────────────────────────

/**
 * Test overlap between a circle and an axis-aligned bounding box.
 *
 * @param cx — circle center X
 * @param cy — circle center Y
 * @param cr — circle radius
 * @param rx — rect center X
 * @param ry — rect center Y
 * @param rw — rect full width
 * @param rh — rect full height
 */
export function circleVsAABB(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const hw = rw / 2;
  const hh = rh / 2;
  // Closest point on AABB to circle center
  const closestX = Math.max(rx - hw, Math.min(cx, rx + hw));
  const closestY = Math.max(ry - hh, Math.min(cy, ry + hh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

// ── Point tests ──────────────────────────────────────────────────────

/** Test if a point is inside an AABB (center + dimensions). */
export function pointInAABB(
  px: number, py: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const hw = rw / 2;
  const hh = rh / 2;
  return px >= rx - hw && px <= rx + hw && py >= ry - hh && py <= ry + hh;
}

/** Test if a point is inside a circle. */
export function pointInCircle(
  px: number, py: number,
  cx: number, cy: number, cr: number,
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy < cr * cr;
}

// ── Generic shape test ───────────────────────────────────────────────

export type ColliderShape = 'circle' | 'rect';

export interface ColliderDef {
  shape: ColliderShape;
  radius: number;
  width: number;
  height: number;
}

/**
 * Test collision between a circle and a generic collider (circle or rect).
 *
 * @param cx — circle center X
 * @param cy — circle center Y
 * @param cr — circle radius
 * @param ex — collider center X
 * @param ey — collider center Y
 * @param col — collider definition (shape, radius, width, height)
 */
export function circleVsCollider(
  cx: number, cy: number, cr: number,
  ex: number, ey: number, col: ColliderDef,
): boolean {
  if (col.shape === 'circle') {
    return circleVsCircle(cx, cy, cr, ex, ey, col.radius);
  }
  return circleVsAABB(cx, cy, cr, ex, ey, col.width, col.height);
}
