/** Scene interface and SceneManager for game state management */

import type { GameContext } from './game-context';

export interface Scene {
  readonly name: string;

  /** Called when scene becomes active (pushed or replaced to) */
  enter(ctx: GameContext): void;

  /** Called when scene is deactivated (popped or replaced from) */
  exit(ctx: GameContext): void;

  /** Fixed-timestep update. dt is in seconds. */
  update(ctx: GameContext, dt: number): void;

  /** Render frame. alpha is interpolation factor (0..1). */
  render(ctx: GameContext, alpha: number): void;
}

export class SceneManager {
  private scenes = new Map<string, Scene>();
  private stack: Scene[] = [];

  get current(): Scene | undefined {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
  }

  register(scene: Scene): this {
    this.scenes.set(scene.name, scene);
    return this;
  }

  push(name: string, ctx: GameContext): void {
    const scene = this.scenes.get(name);
    if (!scene) throw new Error(`Scene "${name}" not registered`);
    this.stack.push(scene);
    scene.enter(ctx);
  }

  pop(ctx: GameContext): void {
    const scene = this.stack.pop();
    if (scene) scene.exit(ctx);
  }

  replace(name: string, ctx: GameContext): void {
    const scene = this.scenes.get(name);
    if (!scene) throw new Error(`Scene "${name}" not registered`);
    const prev = this.stack.pop();
    if (prev) prev.exit(ctx);
    this.stack.push(scene);
    scene.enter(ctx);
  }

  update(ctx: GameContext, dt: number): void {
    this.current?.update(ctx, dt);
  }

  render(ctx: GameContext, alpha: number): void {
    this.current?.render(ctx, alpha);
  }
}
