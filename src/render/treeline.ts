import { SKY, TREELINE as T } from '../data/presentation';
import { createRng } from '../sim/rng';
import { P } from './palette';

/** One tree: x in world units, base nudge (units) within its row, sprite key and height. */
interface Tree { x: number; dy: number; key: string; h: number; flip: boolean; far?: boolean }
/** One tree placed for the current window: `off` is its base below the view top (so depth order never changes as the view moves). */
interface Spot { x: number; off: number; key: string; h: number; flip: boolean; shadow: number }
const BUSH = 'bush';

/** A kind from `kinds`, never the same as its two left neighbours (when there is a choice), so no two identical sprites stand side by side. */
function pick(kinds: readonly string[], u: number, prev?: string, prev2?: string): string {
  const n = kinds.length, i = Math.floor(u * n);
  for (let d = 0; d < n; d++) { const k = kinds[(i + d) % n]!; if (k !== prev && (k !== prev2 || n < 3)) return k; }
  return kinds[i]!;
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
  if (!ok.length) return [T.kinds.reduce((a, b) => (T.heights[b]! < T.heights[a]! ? b : a))];
  // the top rows are the canopy: only the tall kinds stand there (>= `fill.min` x the tallest that fits), so crowns reach the view top and no bare strip shows above them
  const tall = Math.max(...ok.map((n) => T.heights[n]!));
  return r < T.fill.rows ? ok.filter((n) => T.heights[n]! >= tall * T.fill.min) : ok;
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
    const roll = rng.next(), bush = skirt || (r >= T.fill.rows && roll < T.bush), flip = rng.next() < 0.5;
    // the skirt is mostly bushes with the odd young tree among them, so the same bush never repeats at a steady beat
    const young = skirt && rng.next() < T.skirt.young;
    out.push({
      x, flip, far: skirt && rng.next() < T.skirt.far, dy: (rng.next() - 0.5) * 2 * (skirt ? T.skirt.lift : T.lift),
      key: young ? T.skirt.kinds[Math.floor(rng.next() * T.skirt.kinds.length)]! : bush ? BUSH : pick(kinds, rng.next(), out[out.length - 1]?.key, out[out.length - 2]?.key),
      h: 0,
    });
    const tr = out[out.length - 1]!, u = rng.next(), v = rng.next();
    tr.h = (young ? T.skirt.youngH[0] + v * (T.skirt.youngH[1] - T.skirt.youngH[0])
      : skirt ? T.skirt.h[0] + u * u * (T.skirt.h[1] - T.skirt.h[0])
      : bush ? T.bushH[0] + u * (T.bushH[1] - T.bushH[0]) : treeHeight(tr.key, u)) * k;
  }
  return out.sort((a, b) => a.dy - b.dy);
}

const imgs = new Map<string, HTMLImageElement>();
/** Device-exact copies: one canvas per (sprite, flip, whole device height), so a tree is blitted 1:1 on a whole device pixel (no second resample, no shimmer). */
const exact = new Map<string, HTMLCanvasElement>();
/** Pre-scaled copies of each sprite, halved level by level (a mip chain): a 2x-25x downscale straight from the full sprite stair-steps, a 1x-2x one from the right level does not. */
const mips = new Map<string, HTMLCanvasElement[]>();
let started = false;

/** Halve `im` until it is under `T.mipMin` px high. Level k is drawn at exactly 1/2^k of the sprite in a canvas padded up to whole pixels, so the source rectangle keeps the sprite's own aspect. */
function buildMips(im: HTMLImageElement): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  if (typeof document === 'undefined') return out;
  let prev: CanvasImageSource = im, pw = im.width, ph = im.height;
  while (ph / 2 >= T.mipMin) {
    const w = pw / 2, h = ph / 2, c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h);
    const x = c.getContext('2d'); if (!x) break;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(prev, 0, 0, pw, ph, 0, 0, w, h);
    out.push(c); prev = c; pw = w; ph = h;
  }
  return out;
}

/** Sprite suffix for a tree `back` rows behind the nearest: '' for the nearest, then `_d1`.. capped at `TREELINE.depth` (TB-260). */
export const grade = (back: number): string => (back <= 0 ? '' : `_d${Math.min(back, T.depth)}`);

function load(): void {
  if (started || typeof Image === 'undefined') return;
  started = true;
  for (const k of [...T.kinds, BUSH]) for (let d = 0; d <= T.depth; d++) {
    const v = k + grade(d);
    const im = new Image(); im.onload = (): void => { imgs.set(v, im); mips.set(v, buildMips(im)); }; im.src = `${import.meta.env.BASE_URL}decor/tree_${v}.webp`;
  }
}

/** Soft oval of ground shadow, painted once from the palette and stamped under every trunk and bush. */
let shadowImg: HTMLCanvasElement | null = null;
function shadowSprite(): HTMLCanvasElement | null {
  if (shadowImg || typeof document === 'undefined') return shadowImg;
  const c = document.createElement('canvas'); c.width = T.shadowPx; c.height = T.shadowPx / 2;
  const x = c.getContext('2d'); if (!x) return null;
  x.scale(1, 0.5);  // a round gradient squashed into an oval
  const g = x.createRadialGradient(c.width / 2, c.width / 2, 0, c.width / 2, c.width / 2, c.width / 2);
  g.addColorStop(0, P.shadow); g.addColorStop(0.5, P.shadow); g.addColorStop(1, P.noShadow);
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.width);
  return (shadowImg = c);
}

/** The smallest pre-scaled level that is still at least `need` device px high (1x-2x down from it), else the full sprite; `k` is how many times smaller that level is. */
function level(v: string, im: HTMLImageElement, need: number): { src: CanvasImageSource; k: number } {
  const ms = mips.get(v); let k = 1, src: CanvasImageSource = im;
  if (ms) for (let i = 0; i < ms.length && im.height / (k * 2) >= need; i++) { k *= 2; src = ms[i]!; }
  return { src, k };
}

/** Size in device px of a sprite `hd` high: the width follows the source aspect (rounded to a whole pixel), so nothing squashes. */
export function fitSize(aspect: number, hd: number): { w: number; h: number } {
  const h = Math.max(1, Math.round(hd)); return { w: Math.max(1, Math.round(h * aspect)), h };
}

/** The sprite at exactly `hd` device px high (flipped if asked): the nearest mip level at or above it, then one 1x-2x high-quality step down. Null where there is no DOM. */
function exactSprite(v: string, im: HTMLImageElement, hd: number, flip: boolean): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const { w, h } = fitSize(im.width / im.height, hd), id = `${v}|${flip ? 1 : 0}|${h}`, hit = exact.get(id); if (hit) return hit;
  if (exact.size >= T.exactCap) exact.clear();
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); if (!x) return null;
  const lv = level(v, im, h);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  if (flip) { x.translate(w, 0); x.scale(-1, 1); }
  x.drawImage(lv.src, 0, 0, im.width / lv.k, im.height / lv.k, 0, 0, w, h);
  exact.set(id, c); return c;
}

/** Painted forest edge along the top of the view: as many rows as the window has room for above the plain, far to near.
 *  Trees and the bush skirt are depth-sorted against the orcs (see `treesUpTo`, `skirtUpTo`), so a walker in the forest stands behind the trunks and bushes in front of it. */
export class Treeline {
  private rows: Tree[][] = [];
  private skirt = [row(0, true), row(1, true)];
  private spots: Spot[] = []; private edges: Spot[] = [];
  /** Height (world units) of the HUD band kept clear above the crowns; everything hangs from `y0 + hud`, not the view top. */
  private hud = 0;
  /** Sprites painted after the frame's first forest orc (must stay 0: an orc is never covered by a tree or bush). */
  private orcMark = false; occluders = 0;
  private n = -1; private sky = 0; private ri = 0; private si = 0; private px = 1; private q: ImageSmoothingQuality = 'low';
  constructor() { load(); }
  /** Rows that fit between the view top at `y0` and the plain. */
  private count(y0: number, hud: number): number { return Math.max(T.minRows, Math.floor((T.stop - y0 - hud - T.first) / T.gap) + 1); }
  /** Rows laid out this frame. */
  private rowsN: number = T.minRows;
  /** Lay out the trees and the bush skirt, as offsets from the view top, whenever the row count changes. Sorted by base, near last. */
  private layout(n: number, sky: number): void {
    if (n === this.n && sky === this.sky) return;
    this.n = n; this.sky = sky; this.spots = []; this.edges = [];
    for (let r = 0; r < n; r++) {
      const trees = (this.rows[r] ??= row(r)), s = rowScale(r), baseOff = T.first + r * T.gap;
      for (const t of trees) {
        const off = baseOff + t.dy; let h = t.h * s;
        // the canopy row reaches up to the HUD band: stretched (same aspect, within `stretch`) so its crown top lands just under it
        const crown = sky + T.crown[0] + ((t.x * 0.618) % 1 + 1) % 1 * (T.crown[1] - T.crown[0]);
        if (r === 0 && t.key !== BUSH) h = Math.min(h * T.stretch, Math.max(h * 0.95, off - crown));
        // the open sky under the HUD (TB-232): a crown that would reach into it is drawn shorter, one uniform scale, at most down to `shrink`
        if (off - h < crown) h = Math.max(h * SKY.shrink, off - crown);
        this.spots.push({ x: t.x, off, key: t.key + grade(n - 1 - r), h, flip: t.flip, shadow: T.shade.tree });
      }
    }
    const sb = T.first + (n - 1) * T.gap + T.skirt.lift;
    this.skirt.forEach((tr, i) => {
      const base = sb - T.skirt.offset * (T.skirt.rows - 1 - i);
      for (const t of tr) this.edges.push({ x: t.x, off: base + t.dy, key: t.key + grade(t.far ? 1 : 0), h: t.h, flip: t.flip, shadow: T.shade.bush });
    });
    this.spots.sort((a, b) => a.off - b.off); this.edges.sort((a, b) => a.off - b.off);
  }
  /** Start a frame: remember the device scale (the mip level depends on it) and rewind both depth lists. */
  begin(g: CanvasRenderingContext2D, y0: number, hud = 0, sky = 0): void {
    // `sky` units of open sky under the HUD band are kept clear of crowns (TB-232): the rows and the skirt base, and so the meadow, never move
    this.hud = hud; this.rowsN = this.count(y0, hud); this.orcMark = false; this.occluders = 0; this.layout(this.rowsN, Math.round(sky)); this.ri = 0; this.si = 0;
    this.q = g.imageSmoothingQuality; g.imageSmoothingQuality = 'high';  // the field's default is 'low': the sprites are always scaled, never 1:1
    const m = (g as { getTransform?: () => DOMMatrix }).getTransform?.(); const px = m ? Math.hypot(m.a, m.b) || 1 : 1; if (px !== this.px) exact.clear(); this.px = px;
  }
  /** Called once the trees and bushes are down and the forest orcs are about to be drawn. */
  orcsStart(): void { this.orcMark = true; }
  /** End of the frame's forest: put the smoothing back the way the rest of the field expects it. */
  end(g: CanvasRenderingContext2D): void { g.imageSmoothingQuality = this.q; }
  /** Draw every tree whose base is at or above world `y`, skipping what is already drawn. `Infinity` finishes the rows. */
  treesUpTo(g: CanvasRenderingContext2D, y0: number, x0: number, x1: number, y: number): void {
    const l = this.spots; while (this.ri < l.length && y0 + this.hud + l[this.ri]!.off <= y) this.put(g, l[this.ri++]!, y0 + this.hud, x0, x1);
  }
  /** Same for the bush skirt, which stands in front of the barricade's top and of any orc still behind it. */
  skirtUpTo(g: CanvasRenderingContext2D, y0: number, x0: number, x1: number, y: number): void {
    const l = this.edges; while (this.si < l.length && y0 + this.hud + l[this.si]!.off <= y) this.put(g, l[this.si++]!, y0 + this.hud, x0, x1);
  }
  /** World y of the HUD band's foot, where the open sky begins. */
  top(y0: number): number { return y0 + this.hud; }
  /** Highest crown top (world y) of the laid-out trees for the view at `y0`, and the band bottom it should sit under; for the capture audit. */
  crownTop(y0: number): number { let m = Infinity; for (const s of this.spots) m = Math.min(m, y0 + this.hud + s.off - s.h); return m; }
  /** World y above which a walker is still in the forest, behind the rows. */
  skirtEdge(y0: number): number { return this.skirtBase(y0) - T.skirt.offset; }
  /** One whole frame, far to near (used where no actor needs to stand between the rows). */
  draw(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, hud = 0): void {
    // a hidden or zero-size canvas gives a NaN view: createLinearGradient would throw and end the frame loop (ground.ts guards the same way)
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1)) return;
    this.begin(g, y0, hud); this.treesUpTo(g, y0, x0, x1, Infinity); this.skirtUpTo(g, y0, x0, x1, Infinity); this.end(g);
  }
  /** Baseline of the bush skirt: the barricade starts just above it so the bushes cover its cut top. */
  skirtBase(y0: number): number { return y0 + this.hud + T.first + (this.rowsN - 1) * T.gap + T.skirt.lift; }
  private put(g: CanvasRenderingContext2D, s: Spot, y0: number, x0: number, x1: number): void {
    const im = imgs.get(s.key); if (!im) return;
    if (this.orcMark) this.occluders++;
    const w = (im.width / im.height) * s.h; if (s.x + w / 2 < x0 || s.x - w / 2 > x1) return;
    const by = y0 + s.off, sh = shadowSprite();
    if (sh) { const sw = Math.min(w, s.h * 1.2) * s.shadow; g.drawImage(sh, s.x - sw / 2, by - sw * 0.25, sw, sw * 0.5); }
    // device-exact path: a pre-scaled copy blitted 1:1 on a whole device pixel, so the edge is as clean at 1x as at 2x
    const m = (g as { getTransform?: () => DOMMatrix }).getTransform?.();
    if (m && m.b === 0 && m.c === 0 && m.a > 0 && m.d > 0) {
      const ex = exactSprite(s.key, im, s.h * m.d, s.flip);
      if (ex) {
        const dx = Math.round(m.a * s.x + m.e - ex.width / 2), dy = Math.round(m.d * by + m.f - ex.height);
        g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(ex, dx, dy); g.setTransform(m);
        return;
      }
    }
    // no DOM or a skewed view: a fractional source rectangle (the padded mip keeps the sprite's exact aspect, so nothing squashes)
    const lv = level(s.key, im, s.h * this.px), sw = im.width / lv.k, shh = im.height / lv.k;
    if (s.flip) { g.save(); g.translate(s.x, 0); g.scale(-1, 1); g.drawImage(lv.src, 0, 0, sw, shh, -w / 2, by - s.h, w, s.h); g.restore(); }
    else g.drawImage(lv.src, 0, 0, sw, shh, s.x - w / 2, by - s.h, w, s.h);
  }
}
