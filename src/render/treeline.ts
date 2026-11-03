import { TREELINE as T } from '../data/presentation';
import { createRng } from '../sim/rng';
import { P } from './palette';

/** One tree: x in world units, base nudge (units) within its row, sprite key and height. */
interface Tree { x: number; dy: number; key: string; h: number; flip: boolean; far?: boolean }
const BUSH = 'bush';

/** A tree kind, never the same as its left neighbour, so no two identical sprites stand side by side. */
function pick(u: number, prev?: string): string {
  const i = Math.floor(u * T.kinds.length), k = T.kinds[i]!;
  return k === prev ? T.kinds[(i + 1) % T.kinds.length]! : k;
}

/** Row r of the treeline, laid out once from its own seed so it never changes as the window resizes. */
function row(r: number, skirt = false): Tree[] {
  const rng = createRng(T.seed * 100 + r + (skirt ? 77 : 0)), k = skirt ? 1 : 1 + r * T.grow, out: Tree[] = [];
  const step = skirt ? T.skirt.step : T.step * (1 + r * T.stepGrow);
  const jit = skirt ? T.skirt.gap : T.jitter;
  for (let x = T.span[0] + rng.next() * step; x < T.span[1]; x += step * (1 + (rng.next() - 0.5) * 2 * jit)) {
    const bush = skirt || rng.next() < T.bush, flip = rng.next() < 0.5;
    out.push({
      x, flip, far: skirt && rng.next() < T.skirt.far, dy: (rng.next() - 0.5) * 2 * (skirt ? T.skirt.lift : T.lift),
      key: bush ? BUSH : pick(rng.next(), out[out.length - 1]?.key),
      h: (skirt ? T.skirt.h[0] + rng.next() * (T.skirt.h[1] - T.skirt.h[0]) : bush ? T.bushH[0] + rng.next() * (T.bushH[1] - T.bushH[0]) : T.h[0] + rng.next() * (T.h[1] - T.h[0])) * k,
    });
  }
  return out.sort((a, b) => a.dy - b.dy);
}

const imgs = new Map<string, HTMLImageElement>();
let started = false;
function load(): void {
  if (started || typeof Image === 'undefined') return;
  started = true;
  for (const k of [...T.kinds, BUSH]) for (const v of [k, `${k}_far`]) {
    const im = new Image(); im.onload = (): void => { imgs.set(v, im); }; im.src = `${import.meta.env.BASE_URL}decor/tree_${v}.webp`;
  }
}

/** Painted forest edge along the top of the view: as many rows as the window has room for above the plain, far to near. */
export class Treeline {
  private rows: Tree[][] = [];
  private skirt = [row(0, true), row(1, true)];
  constructor() { load(); }
  draw(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number): void {
    const n = Math.max(T.minRows, Math.floor((T.stop - y0 - T.first) / T.gap) + 1);
    for (let r = 0; r < n; r++) {
      const base = y0 + T.first + r * T.gap;
      // a short view (wide window) shrinks the trees so whole crowns still show under the top edge
      this.drawRow(g, (this.rows[r] ??= row(r)), base, r < n - 1, x0, x1, Math.min(1, (base - y0 + T.crown) / (T.h[1] * (1 + r * T.grow))));
      // aerial haze: each row behind the nearest sinks a little further into the hill colour
      if (r < n - 1) { g.globalAlpha = T.haze; g.fillStyle = P.hillFar; g.fillRect(x0, y0, x1 - x0, base - y0 + T.lift); g.globalAlpha = 1; }
    }
    // a skirt of low bushes in two staggered rows hides the nearest trunks' bases where the forest meets the meadow
    const sb = this.skirtBase(y0);
    // soft contact shadow where the bushes meet the meadow, so the forest edge sits on the ground instead of a hard line
    const cg = g.createLinearGradient(0, sb - 4, 0, sb + T.contact);
    cg.addColorStop(0, P.noShadow); cg.addColorStop(0.2, P.shadow); cg.addColorStop(1, P.noShadow);
    g.fillStyle = cg; g.fillRect(x0, sb - 4, x1 - x0, T.contact + 4);
    this.skirt.forEach((tr, i) => this.drawRow(g, tr, sb - T.skirt.offset * (T.skirt.rows - 1 - i), false, x0, x1));
  }
  /** Baseline of the bush skirt: the barricade starts just above it so the bushes cover its cut top. */
  skirtBase(y0: number): number {
    const n = Math.max(T.minRows, Math.floor((T.stop - y0 - T.first) / T.gap) + 1);
    return y0 + T.first + (n - 1) * T.gap + T.skirt.lift;
  }
  private drawRow(g: CanvasRenderingContext2D, trees: Tree[], base: number, far: boolean, x0: number, x1: number, s = 1): void {
    for (const tr0 of trees) {
      const tr = s === 1 ? tr0 : { ...tr0, h: tr0.h * s };
      const im = imgs.get(far || tr.far ? `${tr.key}_far` : tr.key); if (!im) continue;
      const w = (im.width / im.height) * tr.h; if (tr.x + w / 2 < x0 || tr.x - w / 2 > x1) continue;
      if (tr.flip) { g.save(); g.translate(tr.x, 0); g.scale(-1, 1); g.drawImage(im, -w / 2, base + tr.dy - tr.h, w, tr.h); g.restore(); }
      else g.drawImage(im, tr.x - w / 2, base + tr.dy - tr.h, w, tr.h);
    }
  }
}
