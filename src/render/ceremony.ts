/**
 * Replant ceremony (TB-051, GDD §10, ART-STYLE §Motion): the grove burns upward in amber, one seed falls,
 * the field fades up through dawn. Render-only; main.ts holds the sim still while it plays. Skippable.
 */
import { FIELD } from '../data/balance';
import { P } from './palette';

/** Phase ends in seconds: burn, then seed, then dawn. Reduced motion plays only a cross-fade. */
export const CEREMONY = { burn: 1.4, seed: 2.4, dawn: 3.6, reduced: 0.3, embers: 70 } as const;
const W = FIELD.w, H = FIELD.h;

interface Ember { x: number; y: number; vy: number; r: number }

export class Ceremony {
  private t = -1;
  private reduced = false;
  private embers: Ember[] = [];

  get active(): boolean { return this.t >= 0; }
  /** 0..1 while burning, used by the panel to desaturate the tree. */
  get burning(): boolean { return this.active && !this.reduced && this.t < CEREMONY.burn; }

  start(reduced: boolean): void {
    this.t = 0; this.reduced = reduced;
    this.embers = reduced ? [] : Array.from({ length: CEREMONY.embers }, () => ({ x: Math.random() * W, y: H + Math.random() * H * 0.5, vy: 120 + Math.random() * 160, r: 1.5 + Math.random() * 2.5 }));
  }
  skip(): void { this.t = -1; }

  /** Advance and draw over the field in logical coordinates (caller sets the transform). */
  draw(g: CanvasRenderingContext2D, dt: number): void {
    if (!this.active) return;
    this.t += dt;
    const t = this.t, end = this.reduced ? CEREMONY.reduced : CEREMONY.dawn;
    if (t >= end) { this.t = -1; return; }
    if (this.reduced) { g.globalAlpha = 1 - t / CEREMONY.reduced; g.fillStyle = P.ink; g.fillRect(0, 0, W, H); g.globalAlpha = 1; return; }

    if (t < CEREMONY.burn) {
      // amber burns upward; the dark follows it
      const u = t / CEREMONY.burn, top = H * (1 - u);
      g.fillStyle = P.ink; g.globalAlpha = u; g.fillRect(0, 0, W, H);
      g.globalAlpha = 0.7; g.fillStyle = P.amber; g.fillRect(0, top, W, 6 + 30 * u);
      g.globalAlpha = 1; g.fillStyle = P.amber;
      for (const e of this.embers) { e.y -= e.vy * dt; if (e.y > top - 40) g.fillRect(e.x, e.y, e.r, e.r); }
      return;
    }
    if (t < CEREMONY.seed) {
      // one seed falls through the dark to the grove
      const u = (t - CEREMONY.burn) / (CEREMONY.seed - CEREMONY.burn), y = H * 0.1 + H * 0.45 * u * u;
      g.fillStyle = P.ink; g.fillRect(0, 0, W, H);
      g.fillStyle = P.rose; g.beginPath(); g.ellipse(W / 2, y, 5, 7, 0, 0, 6.28); g.fill();
      g.globalAlpha = 0.35; g.fillStyle = P.amber; g.beginPath(); g.arc(W / 2, y, 14, 0, 6.28); g.fill(); g.globalAlpha = 1;
      return;
    }
    // dawn: an amber-tinted dark lifts off the new field
    const u = (t - CEREMONY.seed) / (CEREMONY.dawn - CEREMONY.seed);
    g.globalAlpha = 1 - u; g.fillStyle = P.ink; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.4 * (1 - u); g.fillStyle = P.amber; g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
  }
}
