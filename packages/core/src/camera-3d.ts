/** 3D camera wrapping THREE.PerspectiveCamera */

import * as THREE from 'three';
import type { ICamera } from './camera-2d';

export class Camera3D implements ICamera {
  readonly threeCamera: THREE.PerspectiveCamera;

  constructor(fov = 75, aspect = 1, near = 0.1, far = 1000) {
    this.threeCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  }

  get position(): THREE.Vector3 {
    return this.threeCamera.position;
  }

  get rotation(): THREE.Euler {
    return this.threeCamera.rotation;
  }

  resize(width: number, height: number): void {
    this.threeCamera.aspect = width / height;
    this.threeCamera.updateProjectionMatrix();
  }

  lookAt(x: number, y: number, z: number): void {
    this.threeCamera.lookAt(x, y, z);
  }

  update(_dt: number): void {
    // Base implementation: no-op. Games extend behavior as needed.
  }
}
