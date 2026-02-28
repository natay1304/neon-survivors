/** Reusable utilities: ObjectPool, EventBus */

export class ObjectPool<T> {
  private items: T[] = [];

  constructor(private factory: () => T, prewarm = 0) {
    for (let i = 0; i < prewarm; i++) this.items.push(factory());
  }

  get(): T {
    return this.items.pop() ?? this.factory();
  }

  release(item: T): void {
    this.items.push(item);
  }

  get size(): number { return this.items.length; }
}

type Listener = (...args: unknown[]) => void;

export class EventBus {
  private listeners = new Map<string, Listener[]>();

  on(event: string, fn: Listener): void {
    let list = this.listeners.get(event);
    if (!list) { list = []; this.listeners.set(event, list); }
    list.push(fn);
  }

  off(event: string, fn: Listener): void {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(fn);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const list = this.listeners.get(event);
    if (list) for (const fn of list) fn(...args);
  }
}

/** Floating damage/text numbers */
export interface FloatingText {
  x: number; y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export class FloatingTextManager {
  items: FloatingText[] = [];

  add(x: number, y: number, text: string, color = '#ffffff', life = 0.8, size = 16): void {
    this.items.push({ x, y, text, color, life, maxLife: life, size });
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const ft = this.items[i];
      ft.y -= 50 * dt;
      ft.life -= dt;
      if (ft.life <= 0) {
        this.items[i] = this.items[this.items.length - 1];
        this.items.pop();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const ft of this.items) {
      const t = ft.life / ft.maxLife;
      ctx.globalAlpha = t;
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${ft.size}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
  }
}

/** Debug overlay — FPS counter and optional stats (core utility) */
export class DebugOverlay {
  enabled = false;
  private frames: number[] = [];
  private fps = 0;
  private lastTime = 0;
  private stats: Map<string, string> = new Map();

  /** Call once per frame with performance.now() timestamp */
  update(now: number): void {
    if (!this.enabled) return;
    if (this.lastTime > 0) {
      this.frames.push(now - this.lastTime);
      if (this.frames.length > 60) this.frames.shift();
      const avg = this.frames.reduce((s, v) => s + v, 0) / this.frames.length;
      this.fps = avg > 0 ? 1000 / avg : 0;
    }
    this.lastTime = now;
  }

  /** Set a custom stat line (e.g. "entities", "150") */
  set(key: string, value: string | number): void {
    this.stats.set(key, String(value));
  }

  /** Draw the overlay in screen space */
  draw(ctx: CanvasRenderingContext2D, x = 10, y = 20): void {
    if (!this.enabled) return;

    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';

    // Background
    const lineH = 16;
    const lines = 1 + this.stats.size;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 4, y - 14, 160, lines * lineH + 6);

    // FPS
    const fpsColor = this.fps >= 55 ? '#44ff44' : this.fps >= 30 ? '#ffcc00' : '#ff4444';
    ctx.fillStyle = fpsColor;
    ctx.fillText(`FPS: ${Math.round(this.fps)}`, x, y);

    // Extra stats
    let ly = y + lineH;
    ctx.fillStyle = '#aaccff';
    ctx.font = '12px monospace';
    for (const [key, val] of this.stats) {
      ctx.fillText(`${key}: ${val}`, x, ly);
      ly += lineH;
    }

    ctx.restore();
  }
}
