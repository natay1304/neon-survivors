/** 2D camera wrapping THREE.OrthographicCamera */

import * as THREE from 'three';
import { Vec2, lerp, randomRange } from './math';

export interface ICamera {
  resize(width: number, height: number): void;
  update(dt: number): void;
}

export class Camera2D implements ICamera {
  readonly threeCamera: THREE.OrthographicCamera;
  readonly pos = new Vec2();
  width: number;
  height: number;

  private shakeAmount = 0;
  private shakeDuration = 0;
  private shakeTimer = 0;
  private offset = new Vec2();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.threeCamera = new THREE.OrthographicCamera(
      -width / 2, width / 2,
      height / 2, -height / 2,
      0.1, 1000,
    );
    this.threeCamera.position.z = 500;
  }

  get shakeOffset(): Readonly<Vec2> {
    return this.offset;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.threeCamera.left = -width / 2;
    this.threeCamera.right = width / 2;
    this.threeCamera.top = height / 2;
    this.threeCamera.bottom = -height / 2;
    this.threeCamera.updateProjectionMatrix();
  }

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

    // Sync Three.js camera position (Three.js Y-up, game Y-down)
    this.threeCamera.position.x = this.pos.x + this.offset.x;
    this.threeCamera.position.y = -(this.pos.y + this.offset.y);
    this.threeCamera.updateProjectionMatrix();
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return new Vec2(
      sx - this.width / 2 + this.pos.x,
      sy - this.height / 2 + this.pos.y,
    );
  }

  isVisible(x: number, y: number, pad = 64): boolean {
    const dx = Math.abs(x - this.pos.x);
    const dy = Math.abs(y - this.pos.y);
    return dx < this.width / 2 + pad && dy < this.height / 2 + pad;
  }
}
