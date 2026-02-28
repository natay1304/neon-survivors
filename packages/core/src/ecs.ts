/** Minimal Entity-Component-System framework */

export type Entity = number;
export type SystemFn = (world: World, dt: number) => void;

export class World {
  private nextId = 0;
  private stores = new Map<string, Map<Entity, unknown>>();
  private deferred: Entity[] = [];
  private systems: SystemFn[] = [];
  private alive = new Set<Entity>();
  private queryCache = new Map<string, Entity[]>();

  spawn(): Entity {
    const id = this.nextId++;
    this.alive.add(id);
    return id;
  }

  add<T>(entity: Entity, component: string, data: T): this {
    let store = this.stores.get(component);
    if (!store) { store = new Map(); this.stores.set(component, store); }
    store.set(entity, data);
    this.queryCache.clear();
    return this;
  }

  get<T>(entity: Entity, component: string): T {
    return this.stores.get(component)?.get(entity) as T;
  }

  maybe<T>(entity: Entity, component: string): T | undefined {
    return this.stores.get(component)?.get(entity) as T | undefined;
  }

  has(entity: Entity, component: string): boolean {
    return this.stores.get(component)?.has(entity) ?? false;
  }

  remove(entity: Entity, component: string): void {
    this.stores.get(component)?.delete(entity);
    this.queryCache.clear();
  }

  destroy(entity: Entity): void {
    this.deferred.push(entity);
  }

  isAlive(entity: Entity): boolean {
    return this.alive.has(entity);
  }

  /** Query entities that have ALL given components. Iterates smallest store first. */
  query(...components: string[]): Entity[] {
    if (components.length === 0) return [];

    const key = components.length === 1 ? components[0] : [...components].sort().join(',');
    const cached = this.queryCache.get(key);
    if (cached) return cached;

    let smallest = components[0];
    let smallestSize = this.stores.get(components[0])?.size ?? 0;
    for (let i = 1; i < components.length; i++) {
      const size = this.stores.get(components[i])?.size ?? 0;
      if (size < smallestSize) { smallest = components[i]; smallestSize = size; }
    }

    const store = this.stores.get(smallest);
    if (!store) {
      const empty: Entity[] = [];
      this.queryCache.set(key, empty);
      return empty;
    }

    const result: Entity[] = [];
    for (const entity of store.keys()) {
      let valid = true;
      for (const c of components) {
        if (c !== smallest && !(this.stores.get(c)?.has(entity))) { valid = false; break; }
      }
      if (valid) result.push(entity);
    }
    this.queryCache.set(key, result);
    return result;
  }

  /** Count entities matching query (no allocation) */
  count(...components: string[]): number {
    if (components.length === 0) return 0;
    let smallest = components[0];
    let smallestSize = this.stores.get(components[0])?.size ?? 0;
    for (let i = 1; i < components.length; i++) {
      const size = this.stores.get(components[i])?.size ?? 0;
      if (size < smallestSize) { smallest = components[i]; smallestSize = size; }
    }
    const store = this.stores.get(smallest);
    if (!store) return 0;
    let count = 0;
    for (const entity of store.keys()) {
      let valid = true;
      for (const c of components) {
        if (c !== smallest && !(this.stores.get(c)?.has(entity))) { valid = false; break; }
      }
      if (valid) count++;
    }
    return count;
  }

  addSystem(fn: SystemFn): this {
    this.systems.push(fn);
    return this;
  }

  update(dt: number): void {
    for (const sys of this.systems) sys(this, dt);
    this.flush();
  }

  flush(): void {
    for (const entity of this.deferred) {
      for (const store of this.stores.values()) store.delete(entity);
      this.alive.delete(entity);
    }
    this.deferred.length = 0;
    this.queryCache.clear();
  }
}
