/** Tells a tap from a drag on the skill tree (TB-219). Pure. Reading `dragged` never clears it: the panel's mousemove tooltip
 *  and the release click both read it, and only the next press (`press`) starts a fresh gesture. */
export class DragGuard {
  private moved = 0;
  private flag = false;
  /** True once the press travelled past `limit` px or a pinch began; stays true until the next press. */
  get dragged(): boolean { return this.flag; }
  press(): void { this.moved = 0; this.flag = false; }
  /** Add pointer travel in layout px; returns whether this gesture is now a drag. */
  move(dx: number, dy: number, limit: number): boolean {
    this.moved += Math.hypot(dx, dy);
    if (this.moved > limit) this.flag = true;
    return this.flag;
  }
  /** Travel only (fixed camera): counts but never flags. */
  travel(dx: number, dy: number): void { this.moved += Math.hypot(dx, dy); }
  /** Call once the release click has had its chance (next task after pointerup): hover hit tests work again. */
  settle(): void { this.flag = false; }
  pinch(): void { this.flag = true; }
}
