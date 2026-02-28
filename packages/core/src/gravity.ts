/**
 * Point gravity attraction physics — reusable for any gravity-based game.
 *
 * Uses smoothed inverse-distance formula (not 1/r^2) for better game feel:
 * force = strength / max(dist, minDist)
 *
 * This avoids the runaway singularity at r→0 while still feeling "gravitational".
 */

/** Result of a gravity velocity calculation (avoids allocation in hot path). */
export interface GravityResult {
  vx: number;
  vy: number;
}

// Shared result object — reused every call to avoid GC
const _result: GravityResult = { vx: 0, vy: 0 };

/**
 * Apply gravitational attraction force from an attractor point to a body.
 * Returns new velocity components.
 *
 * @param px  Body position X
 * @param py  Body position Y
 * @param vx  Body velocity X
 * @param vy  Body velocity Y
 * @param ax  Attractor position X
 * @param ay  Attractor position Y
 * @param strength  Gravitational strength (pixels/s^2 at unit distance)
 * @param minDist  Minimum clamped distance to prevent singularity
 * @param dt  Delta time in seconds
 */
export function applyPointGravity(
  px: number, py: number,
  vx: number, vy: number,
  ax: number, ay: number,
  strength: number,
  minDist: number,
  dt: number,
): GravityResult {
  const dx = ax - px;
  const dy = ay - py;
  const distSq = dx * dx + dy * dy;
  const dist = Math.sqrt(distSq);

  if (dist < 0.001) {
    _result.vx = vx;
    _result.vy = vy;
    return _result;
  }

  // Smoothed distance — never less than minDist
  const effectiveDist = dist < minDist ? minDist : dist;

  // Force magnitude: strength / distance (linear falloff, better game feel than 1/r^2)
  const force = strength / effectiveDist;

  // Normalised direction toward attractor
  const nx = dx / dist;
  const ny = dy / dist;

  _result.vx = vx + nx * force * dt;
  _result.vy = vy + ny * force * dt;
  return _result;
}

/**
 * Get the tangential component of velocity relative to an attractor.
 * Used for slingshot release: strips the radial component, keeps only the tangential.
 *
 * @param px  Body position X
 * @param py  Body position Y
 * @param vx  Body velocity X
 * @param vy  Body velocity Y
 * @param ax  Attractor position X
 * @param ay  Attractor position Y
 */
export function getTangentialRelease(
  px: number, py: number,
  vx: number, vy: number,
  ax: number, ay: number,
): GravityResult {
  const dx = px - ax;
  const dy = py - ay;
  const distSq = dx * dx + dy * dy;

  if (distSq < 0.001) {
    // Basically at the attractor — keep current velocity
    _result.vx = vx;
    _result.vy = vy;
    return _result;
  }

  const invDist = 1 / Math.sqrt(distSq);
  // Radial unit vector (away from attractor)
  const rx = dx * invDist;
  const ry = dy * invDist;

  // Radial speed component (dot product of velocity and radial direction)
  const radialSpeed = vx * rx + vy * ry;

  // Subtract radial component → keep only tangential
  _result.vx = vx - radialSpeed * rx;
  _result.vy = vy - radialSpeed * ry;
  return _result;
}

/**
 * Check whether a body is approximately orbiting an attractor.
 * An orbit is detected when the radial velocity is small relative to total speed.
 *
 * @param px  Body position X
 * @param py  Body position Y
 * @param vx  Body velocity X
 * @param vy  Body velocity Y
 * @param ax  Attractor position X
 * @param ay  Attractor position Y
 * @param threshold  Ratio threshold (0–1). Lower = stricter orbit detection.
 *                   Typically 0.3 means radial speed is < 30% of total speed.
 */
export function isOrbiting(
  px: number, py: number,
  vx: number, vy: number,
  ax: number, ay: number,
  threshold: number,
): boolean {
  const dx = px - ax;
  const dy = py - ay;
  const distSq = dx * dx + dy * dy;
  const speedSq = vx * vx + vy * vy;

  if (distSq < 0.001 || speedSq < 0.001) return false;

  const invDist = 1 / Math.sqrt(distSq);
  const rx = dx * invDist;
  const ry = dy * invDist;

  const radialSpeed = vx * rx + vy * ry;
  const speed = Math.sqrt(speedSq);

  return Math.abs(radialSpeed) / speed < threshold;
}
