import { FIELD } from '../data/balance';
import { TREELINE as T } from '../data/presentation';
import { createRng } from '../sim/rng';
import { P } from './palette';

/** One tree: x in world units, base nudge (units) within its row, sprite key and height. */
interface Tree { x: number; dy: number; key: string; h: number; flip: boolean; far?: boolean }
const BUSH = 'bush';

/** A kind from `kinds`, never the same as its left neighbour (when there is a choice), so no two identical sprites stand side by side. */
function pick(kinds: readonly string[], u: number, prev?: string): string {
  const i = Math.floor(u * kinds.length), k = kinds[i]!;
  return k === prev ? kinds[(i + 1) % kinds.length]! : k;
}

/** Real height in world units of a tree sprite: its model height x `unit`, with a small size spread (u in 0..1). */
export function treeHeight(key: string, u: number): number {
  return (T.heights[key] ?? 0) * T.unit * (T.size[0] + u * (T.size[1] - T.size[0]));
}

/** Room (units) from the view top down to the lowest base in row `r`: the same on every window, because the rows hang from the top edge. */
export function rowRoom(r: number): number { return T.first + r * T.gap - T.lift; }

/** The tree kinds that stand in row `r`: those whose crown fits its room at natural size (a little shrink allowed), so the tall pines live in the nearer rows and are never cut off. */
export function rowKinds(r: number): readonly string[] {
  const room = rowRoom(r) * T.slack, k = 1 + r * T.grow;
  const ok = T.kinds.filter((n) => treeHeight(n, 1) * k <= room);
  return ok.length ? ok : [T.kinds.reduce((a, b) => (T.heights[b]! < T.heights[a]! ? b : a))];
}

/** One scale for the whole row, from its tallest kind: 1 when that tree fits, less when it would pass the view top. Same species, same size. */
export function rowScale(r: number): number {
  const tall = Math.max(...rowKinds(r).map((n) => treeHeight(n, 1))) * (1 + r * T.grow);
  return Math.min(1, rowRoom(r) / tall);
}

/** Row r of the treeline, laid out once from its own seed so it never changes as the window resizes. */
function row(r: number, skirt = false): Tree[] {
  const rng = createRng(T.seed * 100 + r + (skirt ? 77 : 0)), k = skirt ? 1 : 1 + r * T.grow, out: Tree[] = [], kinds = rowKinds(r);
  const step = skirt ? T.skirt.step : T.step * (1 + r * T.stepGrow);
  const jit = skirt ? T.skirt.gap : T.jitter;
  for (let x = T.span[0] + rng.next() * step; x < T.span[1]; x += step * (1 + (rng.next() - 0.5) * 2 * jit)) {
    const bush = skirt || rng.next() < T.bush, flip = rng.next() < 0.5;
    out.push({
      x, flip, far: skirt && rng.next() < T.skirt.far, dy: (rng.next() - 0.5) * 2 * (skirt ? T.skirt.lift : T.lift),
      key: bush ? BUSH : pick(kinds, rng.next(), out[out.length - 1]?.key),
      h: 0,
    });
    const tr = out[out.length - 1]!, u = rng.next();
    tr.h = (skirt ? T.skirt.h[0] + u * (T.skirt.h[1] - T.skirt.h[0]) : bush ? T.bushH[0] + u * (T.bushH[1] - T.bushH[0]) : treeHeight(tr.key, u)) * k;
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
    // a hidden or zero-size canvas gives a NaN view: createLinearGradient would throw and end the frame loop (ground.ts guards the same way)
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1)) return;
    const n = Math.max(T.minRows, Math.floor((T.stop - y0 - T.first) / T.gap) + 1);
    for (let r = 0; r < n; r++) {
      const base = y0 + T.first + r * T.gap;
      // one uniform scale per row, so no crown leaves the view top and same-species trees match
      this.drawRow(g, (this.rows[r] ??= row(r)), base, r < n - 1, x0, x1, rowScale(r), true);
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
  private drawRow(g: CanvasRenderingContext2D, trees: Tree[], base: number, far: boolean, x0: number, x1: number, s = 1, clearWall = false): void {
    for (const tr0 of trees) {
      // no trunk stands on the barricade's column, so the cap rail never reads as a tree
      if (clearWall && tr0.key !== BUSH && Math.abs(tr0.x - FIELD.barX - FIELD.barW / 2) < T.cap.clear) continue;
      const h = s === 1 ? tr0.h : tr0.h * s;  // a local: no per-tree-per-frame object (TB-088/TB-183)
      const im = imgs.get(far || tr0.far ? `${tr0.key}_far` : tr0.key); if (!im) continue;
      const w = (im.width / im.height) * h; if (tr0.x + w / 2 < x0 || tr0.x - w / 2 > x1) continue;
      if (tr0.flip) { g.save(); g.translate(tr0.x, 0); g.scale(-1, 1); g.drawImage(im, -w / 2, base + tr0.dy - h, w, h); g.restore(); }
      else g.drawImage(im, tr0.x - w / 2, base + tr0.dy - h, w, h);
    }
  }
}
