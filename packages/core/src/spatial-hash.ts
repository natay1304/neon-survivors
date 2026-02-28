/** Spatial hash grid for O(n) broad-phase collision detection */

export class SpatialHash<T = number> {
  private cells = new Map<number, T[]>();
  private entityCells = new Map<T, number[]>();

  constructor(private cellSize: number) {}

  clear(): void {
    this.cells.clear();
    this.entityCells.clear();
  }

  private key(cx: number, cy: number): number {
    // Cantor pairing with offset to handle negatives
    const a = cx + 0x7FFF;
    const b = cy + 0x7FFF;
    return (a + b) * (a + b + 1) / 2 + b;
  }

  private cellRange(x: number, y: number, radius: number): [number, number, number, number] | null {
    if (!(isFinite(x) && isFinite(y) && isFinite(radius) && radius >= 0)) return null;
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    // Reject if any cell coord is non-finite or span is too large
    if (!(isFinite(minCx) && isFinite(maxCx) && isFinite(minCy) && isFinite(maxCy))) return null;
    if (maxCx - minCx > 50 || maxCy - minCy > 50) return null;
    return [minCx, maxCx, minCy, maxCy];
  }

  insert(item: T, x: number, y: number, radius: number): void {
    const range = this.cellRange(x, y, radius);
    if (!range) return;
    const [minCx, maxCx, minCy, maxCy] = range;

    const keys: number[] = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const k = this.key(cx, cy);
        keys.push(k);
        let cell = this.cells.get(k);
        if (!cell) { cell = []; this.cells.set(k, cell); }
        cell.push(item);
      }
    }
    this.entityCells.set(item, keys);
  }

  /** Query all items within radius of point. May contain duplicates — caller should dedup if needed. */
  query(x: number, y: number, radius: number): T[] {
    const range = this.cellRange(x, y, radius);
    if (!range) return [];
    const [minCx, maxCx, minCy, maxCy] = range;

    const result: T[] = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(this.key(cx, cy));
        if (cell) {
          for (let i = 0; i < cell.length; i++) result.push(cell[i]);
        }
      }
    }
    return result;
  }
}
