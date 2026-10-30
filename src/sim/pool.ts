/** Fixed-capacity object pool with a free list. No allocation after construction. */
export class Pool<T extends { live: boolean }> {
  readonly items: T[];
  private free: number[] = [];
  count = 0;

  constructor(capacity: number, make: () => T) {
    this.items = Array.from({ length: capacity }, make);
    for (let i = capacity - 1; i >= 0; i--) this.free.push(i);
  }

  alloc(): T | null {
    const i = this.free.pop();
    if (i === undefined) return null;
    const it = this.items[i]!;
    it.live = true;
    this.count++;
    return it;
  }

  release(it: T): void {
    if (!it.live) return;
    it.live = false;
    this.count--;
    this.free.push(this.items.indexOf(it));
  }

  forEach(fn: (it: T) => void): void {
    for (const it of this.items) if (it.live) fn(it);
  }

  clear(): void { for (const it of this.items) if (it.live) this.release(it); }
}
