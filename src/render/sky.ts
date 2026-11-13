import { DEPTH, SKY } from '../data/presentation';
import { FIELD } from '../data/balance';
import { depthY, hazeAt, meadowTop, worldY } from './depth';
import { createRng } from '../sim/rng';
import { P, SKY_TONE, mixHex, withAlpha, type SkyTone } from './palette';

const C = SKY.clouds;
interface Puff { x: number; v: number; r: number; lobes: { dx: number; dy: number; r: number }[] }

/** Painted sky above the treeline (TB-232): a soft vertical gradient and a few seeded, slowly drifting clouds, each a cluster of
 *  overlapping radial blobs (cream top, cool shade beneath), so the edge stays painterly with no hard outline. */
export class Sky {
  private puffs: Puff[] = [];
  /** This frame's sky colours (TB-261), set by `tone`. */
  readonly c: SkyTone = { ...SKY_TONE.day };
  /** Blend the sky colours for dusk `n` (0 midday, 1 deepest dusk): day -> gold at `SKY.gold` -> dusk. */
  tone(n: number): void {
    const T = SKY_TONE, lo = n < SKY.gold, a = lo ? T.day : T.gold, b = lo ? T.gold : T.dusk, t = lo ? n / SKY.gold : (n - SKY.gold) / (1 - SKY.gold);
    for (const k of Object.keys(this.c) as (keyof SkyTone)[]) this.c[k] = mixHex(a[k], b[k], t);
  }
  constructor() {
    const rng = createRng(C.seed);
    for (let i = 0; i < C.n; i++) {
      const r = C.r[0] + rng.next() * (C.r[1] - C.r[0]), lobes: Puff['lobes'] = [];
      for (let j = 0; j < C.lobes; j++) lobes.push({ dx: (j - (C.lobes - 1) / 2) * r * 0.55 + (rng.next() - 0.5) * r * 0.3, dy: -rng.next() * r * 0.25, r: r * (0.45 + rng.next() * 0.35) });
      this.puffs.push({ x: rng.next(), v: 0.25 + rng.next() * 0.75, r, lobes });
    }
  }

  /** Fill from the view top `y0` down to `bottom` (behind the trunks). Clouds keep to the open strip between the HUD band's foot `top`
   *  and the crown line `band`; below the crowns the gradient deepens from the horizon haze into the wood's shade by `wood`, so the gaps
   *  between the back trunks read as forest, never as a pale strip of sky. From `fade` to `bottom` (under the bush skirt) the shade thins
   *  to nothing, so the gaps between the skirt's bushes melt into the grass instead of ending on a ruled line. */
  draw(g: CanvasRenderingContext2D, t: number, x0: number, y0: number, x1: number, top: number, band: number, wood: number, fade: number, bottom: number, still: boolean): void {
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || bottom <= y0) return;
    const h = bottom - y0, gr = g.createLinearGradient(0, y0, 0, bottom), at = (y: number): number => Math.min(1, Math.max(0, (y - y0) / h));
    const c = this.c; gr.addColorStop(0, c.top); gr.addColorStop(at(top), c.top); gr.addColorStop(at(band), c.low); gr.addColorStop(at(wood), P.woodDeep); gr.addColorStop(Math.max(at(wood), at(fade)), P.woodDeep); gr.addColorStop(1, withAlpha(P.woodDeep, 0));
    g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, h);
    const span = x1 - x0 + 2 * C.r[1], tt = still ? 0 : t, a0 = g.globalAlpha;
    // clouds keep under the HUD band's foot (never cut by a plaque): sized to the open strip, their tops at least `top`, their feet behind the crowns
    const rs = Math.min(1, Math.max(0.35, (band - top) / C.r[1]));
    g.save(); g.beginPath(); g.rect(x0, top, x1 - x0, bottom - top); g.clip();
    g.globalAlpha = a0 * C.alpha;
    const cloud = withAlpha(c.cloud, 0.9), shade = withAlpha(c.shade, 0.55), clear = withAlpha(c.cloud, 0);
    this.puffs.forEach((p, i) => {
      const cx = x0 - C.r[1] + ((((p.x * span + tt * C.drift * p.v) % span) + span) % span);
      const pr = p.r * rs, cy = top + 1.1 * pr + Math.max(0, band - top - 1.1 * pr) * 0.5 * ((i * 0.618034) % 1);
      for (const L of p.lobes) {
        const l = { r: L.r * rs }, x = cx + L.dx * rs, y = cy + L.dy * rs;
        const sh = g.createRadialGradient(x, y + l.r * 0.35, 0, x, y + l.r * 0.35, l.r); sh.addColorStop(0, shade); sh.addColorStop(1, clear);
        g.fillStyle = sh; g.fillRect(x - l.r, y - l.r * 0.65, l.r * 2, l.r * 2);
        const lit = g.createRadialGradient(x, y - l.r * 0.15, 0, x, y - l.r * 0.15, l.r * 0.85); lit.addColorStop(0, cloud); lit.addColorStop(0.6, cloud); lit.addColorStop(1, clear);
        g.fillStyle = lit; g.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
      }
    });
    g.globalAlpha = a0; g.restore();
  }

  /** Aerial haze toward the sky colour, drawn over the trees and every actor (TB-232): `hazeAt` sampled down the drawn rows from the crown
   *  line `sky` to where it is gone, as one smooth gradient, so the far crowns are softest, the near trunks and the back meadow less so,
   *  and nothing marks the line where the wood meets the grass. */
  haze(g: CanvasRenderingContext2D, x0: number, sky: number, x1: number): number {
    if (!Number.isFinite(x0) || !Number.isFinite(sky) || !Number.isFinite(x1)) return sky;
    const t0 = meadowTop(), end = depthY(t0 + (FIELD.h - t0) * DEPTH.hazeTo); if (end <= sky) return sky;
    const gr = g.createLinearGradient(0, sky, 0, end), N = 16;
    for (let i = 0; i <= N; i++) { const v = sky + ((end - sky) * i) / N; gr.addColorStop(i / N, withAlpha(this.c.haze, hazeAt(worldY(v), sky))); }
    // the open sky keeps its own gradient: the wash starts at the crown line
    g.fillStyle = gr; g.fillRect(x0, sky, x1 - x0, end - sky);
    return end;
  }
}
