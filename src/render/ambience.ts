import { FIELD } from '../data/balance';
import { AMBIENCE } from '../data/presentation';
import { createRng } from '../sim/rng';
import { P } from './palette';

const W = FIELD.w, H = FIELD.h, A = AMBIENCE;

/** Fairy motes over the plain (TB-166; sun shafts cut in TB-174, they washed the colour out). Seeded, so the field looks the same each load; `n` is dusk 0..1. */
export class Ambience {
  private motes: { x: number; y: number; r: number; ph: number; vx: number; vy: number }[] = [];

  constructor(private x0: number) {
    const rng = createRng(0x51e7f0);
    for (let i = 0; i < A.motes.n; i++) {
      const a = rng.next() * 6.28;
      this.motes.push({ x: x0 + rng.next() * (W - x0), y: rng.next() * H, r: A.motes.r[0] + rng.next() * (A.motes.r[1] - A.motes.r[0]), ph: rng.next() * 6.28, vx: Math.cos(a) * A.motes.speed, vy: Math.sin(a) * A.motes.speed * 0.6 });
    }
  }

  /** Drifting glow points, wrapping round the plain; brighter as dusk falls. Still when motion is reduced. */
  motesDraw(g: CanvasRenderingContext2D, t: number, n: number, still: boolean): void {
    const M = A.motes, base = M.day + (M.night - M.day) * n, tt = still ? 0 : t, span = W - this.x0;
    for (const m of this.motes) {
      const x = this.x0 + ((((m.x - this.x0 + m.vx * tt + Math.sin(tt * 0.5 + m.ph) * 8) % span) + span) % span);
      const y = (((m.y + m.vy * tt + Math.cos(tt * 0.7 + m.ph) * 6) % H) + H) % H;
      g.globalAlpha = base * (0.55 + 0.45 * Math.sin(tt * M.pulse + m.ph));
      g.fillStyle = P.moteGlow; g.beginPath(); g.arc(x, y, m.r * M.halo, 0, 6.28); g.fill();
      g.fillStyle = P.mote; g.beginPath(); g.arc(x, y, m.r, 0, 6.28); g.fill();
    }
    g.globalAlpha = 1;
  }

}
