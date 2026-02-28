/** Renderer abstractions — IRenderer + Renderer2D + Renderer3D + NullRenderer */

import * as THREE from 'three';
import { Camera2D } from './camera-2d';
import { Camera3D } from './camera-3d';

export interface IRenderer {
  readonly domElement: HTMLCanvasElement;
  readonly threeRenderer: THREE.WebGLRenderer | null;
  readonly threeScene: THREE.Scene | null;

  init(): void;
  resize(width: number, height: number): void;
  beginFrame(): void;
  endFrame(): void;
  dispose(): void;
}

export interface Renderer2DOptions {
  canvas?: HTMLCanvasElement;
  antialias?: boolean;
}

export class Renderer2D implements IRenderer {
  readonly threeRenderer: THREE.WebGLRenderer;
  readonly threeScene: THREE.Scene;
  readonly camera: Camera2D;

  constructor(options: Renderer2DOptions = {}) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.threeRenderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: options.antialias ?? true,
      alpha: false,
    });
    this.threeRenderer.setPixelRatio(window.devicePixelRatio || 1);
    this.threeRenderer.setSize(w, h);

    this.threeScene = new THREE.Scene();
    this.camera = new Camera2D(w, h);
  }

  get domElement(): HTMLCanvasElement {
    return this.threeRenderer.domElement;
  }

  init(): void {
    // Scene is ready after construction
  }

  resize(width: number, height: number): void {
    this.threeRenderer.setSize(width, height);
    this.camera.resize(width, height);
  }

  beginFrame(): void {
    // autoClear handles clearing
  }

  endFrame(): void {
    this.threeRenderer.render(this.threeScene, this.camera.threeCamera);
  }

  dispose(): void {
    this.threeRenderer.dispose();
  }
}

export interface Renderer3DOptions {
  canvas?: HTMLCanvasElement;
  fov?: number;
  antialias?: boolean;
}

export class Renderer3D implements IRenderer {
  readonly threeRenderer: THREE.WebGLRenderer;
  readonly threeScene: THREE.Scene;
  readonly camera: Camera3D;

  constructor(options: Renderer3DOptions = {}) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.threeRenderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: options.antialias ?? true,
      alpha: false,
    });
    this.threeRenderer.setPixelRatio(window.devicePixelRatio || 1);
    this.threeRenderer.setSize(w, h);

    this.threeScene = new THREE.Scene();
    this.camera = new Camera3D(options.fov ?? 75, w / h);
  }

  get domElement(): HTMLCanvasElement {
    return this.threeRenderer.domElement;
  }

  init(): void {
    // Scene is ready after construction
  }

  resize(width: number, height: number): void {
    this.threeRenderer.setSize(width, height);
    this.camera.resize(width, height);
  }

  beginFrame(): void {
    // autoClear handles clearing
  }

  endFrame(): void {
    this.threeRenderer.render(this.threeScene, this.camera.threeCamera);
  }

  dispose(): void {
    this.threeRenderer.dispose();
  }
}

/** No-op renderer for games using custom rendering (e.g. Canvas2D) */
export class NullRenderer implements IRenderer {
  readonly domElement: HTMLCanvasElement;
  readonly threeRenderer: null = null;
  readonly threeScene: null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.domElement = canvas;
  }

  init(): void {}
  resize(_width: number, _height: number): void {}
  beginFrame(): void {}
  endFrame(): void {}
  dispose(): void {}
}
