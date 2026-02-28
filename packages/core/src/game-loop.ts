/** Fixed-timestep game loop with requestAnimationFrame rendering */

export interface GameLoopCallbacks {
  /** Fixed timestep update. dt is in seconds. */
  update(dt: number): void;
  /** Render frame. alpha is interpolation factor 0..1. */
  render(alpha: number): void;
}

export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private rafId = 0;
  private callbacks: GameLoopCallbacks | null = null;

  constructor(
    private tickRate = 60,
    private maxFrameTime = 100,
  ) {}

  get tickDuration(): number {
    return 1000 / this.tickRate;
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(callbacks: GameLoopCallbacks): void {
    if (this.running) return;
    this.callbacks = callbacks;
    this.running = true;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.callbacks = null;
  }

  private loop(currentTime: number): void {
    if (!this.running || !this.callbacks) return;

    const frameTime = Math.min(currentTime - this.lastTime, this.maxFrameTime);
    this.lastTime = currentTime;

    const dtFixed = this.tickDuration / 1000;
    this.accumulator += frameTime;

    while (this.accumulator >= this.tickDuration) {
      this.accumulator -= this.tickDuration;
      this.callbacks.update(dtFixed);
    }

    const alpha = this.accumulator / this.tickDuration;
    this.callbacks.render(alpha);

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }
}
