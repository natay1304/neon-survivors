/** Reusable 2D vector math + utilities */

export class Vec2 {
  constructor(public x = 0, public y = 0) {}

  set(x: number, y: number): this { this.x = x; this.y = y; return this; }
  copy(v: Vec2): this { this.x = v.x; this.y = v.y; return this; }
  clone(): Vec2 { return new Vec2(this.x, this.y); }

  add(v: Vec2): this { this.x += v.x; this.y += v.y; return this; }
  sub(v: Vec2): this { this.x -= v.x; this.y -= v.y; return this; }
  scale(s: number): this { this.x *= s; this.y *= s; return this; }

  len(): number { return Math.sqrt(this.x * this.x + this.y * this.y); }
  lenSq(): number { return this.x * this.x + this.y * this.y; }

  normalize(): this {
    const l = this.len();
    if (l > 0) { this.x /= l; this.y /= l; }
    return this;
  }

  distTo(v: Vec2): number {
    const dx = this.x - v.x, dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distSqTo(v: Vec2): number {
    const dx = this.x - v.x, dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  angle(): number { return Math.atan2(this.y, this.x); }

  rotate(a: number): this {
    const c = Math.cos(a), s = Math.sin(a);
    const nx = this.x * c - this.y * s;
    const ny = this.x * s + this.y * c;
    this.x = nx; this.y = ny;
    return this;
  }

  lerp(v: Vec2, t: number): this {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    return this;
  }

  static fromAngle(a: number, len = 1): Vec2 {
    return new Vec2(Math.cos(a) * len, Math.sin(a) * len);
  }
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function randomAngle(): number {
  return Math.random() * Math.PI * 2;
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const TWO_PI = Math.PI * 2;
