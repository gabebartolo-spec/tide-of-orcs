/** Fixed-capacity object pool with a free list. No allocation after construction. */
export class Pool<T extends { live: boolean }> {
  readonly items: T[];
  private free: number[] = [];
  /** Slot of each item, so release is O(1) (was indexOf). */
  private slot = new Map<T, number>();
  count = 0;

  constructor(capacity: number, make: () => T) {
    this.items = Array.from({ length: capacity }, make);
    this.items.forEach((it, i) => this.slot.set(it, i));
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
    this.free.push(this.slot.get(it) ?? this.items.indexOf(it));
  }

  forEach(fn: (it: T) => void): void {
    for (const it of this.items) if (it.live) fn(it);
  }

  clear(): void { for (const it of this.items) if (it.live) this.release(it); }
}
