/** A bag of pending timeouts that can be cancelled together (TB-219): the fallen report's roll, Heartwood and seal timers. */
export class TimerBag {
  private ids: number[] = [];
  add(fn: () => void, ms: number): void { this.ids.push(setTimeout(fn, ms) as unknown as number); }
  clear(): void { for (const id of this.ids) clearTimeout(id); this.ids = []; }
  get size(): number { return this.ids.length; }
}
