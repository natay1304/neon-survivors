/** GameContext — central entry point for all games */

import Stats from 'stats.js';
import { GameLoop } from './game-loop';
import { SceneManager } from './scene';
import { InputManager } from './input';
import { TypedEventEmitter, type EventMap } from './events';
import { IRenderer, Renderer2D, Renderer3D, NullRenderer } from './renderer';

export interface CoreEvents extends EventMap {
  resize:       (width: number, height: number) => void;
  beforeUpdate: (dt: number) => void;
  afterUpdate:  (dt: number) => void;
  beforeRender: (alpha: number) => void;
  afterRender:  (alpha: number) => void;
}

export interface GameContextConfig {
  canvas: HTMLCanvasElement;
  tickRate?: number;
  maxFrameTime?: number;
  stats?: boolean;
}

export interface GameContext2DConfig extends GameContextConfig {
  antialias?: boolean;
}

export interface GameContext3DConfig extends GameContextConfig {
  fov?: number;
  antialias?: boolean;
}

export interface GameContextCustomConfig extends GameContextConfig {
  renderer?: IRenderer;
}

export class GameContext {
  readonly loop: GameLoop;
  readonly scenes: SceneManager;
  readonly input: InputManager;
  readonly events: TypedEventEmitter<CoreEvents>;
  readonly renderer: IRenderer;
  readonly canvas: HTMLCanvasElement;
  readonly stats: Stats | null;

  private constructor(config: GameContextConfig, renderer: IRenderer) {
    this.canvas = config.canvas;
    this.loop = new GameLoop(config.tickRate ?? 60, config.maxFrameTime ?? 100);
    this.scenes = new SceneManager();
    this.input = new InputManager(config.canvas);
    this.events = new TypedEventEmitter<CoreEvents>();
    this.renderer = renderer;

    // Stats.js panel (opt-in)
    if (config.stats) {
      this.stats = new Stats();
      this.stats.showPanel(0); // FPS panel
      this.stats.dom.style.position = 'absolute';
      this.stats.dom.style.top = '0px';
      this.stats.dom.style.left = '0px';
      this.stats.dom.style.zIndex = '9999';
      document.body.appendChild(this.stats.dom);
    } else {
      this.stats = null;
    }

    renderer.init();

    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  static create2D(config: GameContext2DConfig): GameContext {
    const renderer = new Renderer2D({
      canvas: config.canvas,
      antialias: config.antialias,
    });
    return new GameContext(config, renderer);
  }

  static create3D(config: GameContext3DConfig): GameContext {
    const renderer = new Renderer3D({
      canvas: config.canvas,
      fov: config.fov,
      antialias: config.antialias,
    });
    return new GameContext(config, renderer);
  }

  static createCustom(config: GameContextCustomConfig): GameContext {
    const renderer = config.renderer ?? new NullRenderer(config.canvas);
    return new GameContext(config, renderer);
  }

  start(): void {
    this.loop.start({
      update: (dt) => {
        this.events.emit('beforeUpdate', dt);
        this.scenes.update(this, dt);
        this.events.emit('afterUpdate', dt);
      },
      render: (alpha) => {
        this.stats?.begin();
        this.events.emit('beforeRender', alpha);
        this.renderer.beginFrame();
        this.scenes.render(this, alpha);
        this.renderer.endFrame();
        this.events.emit('afterRender', alpha);
        this.input.clearFrame();
        this.stats?.end();
      },
    });
  }

  stop(): void {
    this.loop.stop();
  }

  destroy(): void {
    this.loop.stop();
    this.input.destroy();
    this.renderer.dispose();
    this.events.removeAllListeners();
    if (this.stats) this.stats.dom.remove();
    window.removeEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);
    this.events.emit('resize', w, h);
  };
}
