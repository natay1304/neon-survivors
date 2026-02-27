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
