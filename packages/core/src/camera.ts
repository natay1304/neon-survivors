/** @deprecated Use Camera2D from './camera-2d' instead. This class will be removed. */

import { Vec2, lerp, randomRange } from './math';

export class Camera {
  pos = new Vec2();
  private shakeAmount = 0;
  private shakeDuration = 0;
  private shakeTimer = 0;
  private offset = new Vec2();

  constructor(public width: number, public height: number) {}

  follow(target: { x: number; y: number }, smoothing: number, dt: number): void {
    const t = 1 - Math.pow(1 - smoothing, dt * 60);
    this.pos.x = lerp(this.pos.x, target.x, t);
    this.pos.y = lerp(this.pos.y, target.y, t);
  }

  shake(amount: number, duration: number): void {
    this.shakeAmount = amount;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  update(dt: number): void {
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const intensity = this.shakeAmount * (this.shakeTimer / this.shakeDuration);
      this.offset.set(randomRange(-intensity, intensity), randomRange(-intensity, intensity));
    } else {
      this.offset.set(0, 0);
    }
  }

  /** Apply camera transform to canvas context */
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.translate(
      Math.round(this.width / 2 - this.pos.x + this.offset.x),
      Math.round(this.height / 2 - this.pos.y + this.offset.y),
    );
  }

  /** Convert screen coords to world coords */
  screenToWorld(sx: number, sy: number): Vec2 {
    return new Vec2(sx - this.width / 2 + this.pos.x, sy - this.height / 2 + this.pos.y);
  }

  /** Check if world position is visible on screen (with padding) */
  isVisible(x: number, y: number, pad = 64): boolean {
    const dx = Math.abs(x - this.pos.x);
    const dy = Math.abs(y - this.pos.y);
    return dx < this.width / 2 + pad && dy < this.height / 2 + pad;
  }
}
