/** Typed event emitter wrapping eventemitter3 */

import EventEmitter from 'eventemitter3';

export type EventMap = Record<string, (...args: any[]) => void>;

export class TypedEventEmitter<T extends EventMap> {
  private ee = new EventEmitter();

  on<K extends keyof T & string>(event: K, fn: T[K]): this {
    this.ee.on(event, fn as any);
    return this;
  }

  once<K extends keyof T & string>(event: K, fn: T[K]): this {
    this.ee.once(event, fn as any);
    return this;
  }

  off<K extends keyof T & string>(event: K, fn: T[K]): this {
    this.ee.off(event, fn as any);
    return this;
  }

  emit<K extends keyof T & string>(event: K, ...args: Parameters<T[K]>): boolean {
    return this.ee.emit(event, ...args);
  }

  removeAllListeners<K extends keyof T & string>(event?: K): this {
    this.ee.removeAllListeners(event);
    return this;
  }
}
