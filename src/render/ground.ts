import { FIELD } from '../data/balance';
import { GROUND } from '../data/presentation';
import { createRng, Rng } from '../sim/rng';
import { P } from './palette';

const W = FIELD.w, H = FIELD.h, PAD = 10;
type Range = readonly [number, number];
export interface Blob { x: number; y: number; r: number; squash: number }
export interface Tuft { x: number; y: number; blades: { a: number; h: number; light: boolean }[] }
export interface Rock { x: number; y: number; r: number; squash: number }
export type FlowerKind = keyof typeof GROUND.flowers.kinds;
export interface Flower { x: number; y: number; kind: FlowerKind; r: number; stem: number; rot: number }
export interface GroundLayout { lush: Blob[]; sunlit: Blob[]; worn: Blob[]; bare: Blob[]; tufts: Tuft[]; rocks: Rock[]; flowers: Flower[] }

const span = (rng: Rng, [a, b]: Range): number => a + rng.next() * (b - a);
const count = (rng: Rng, [a, b]: Range): number => a + Math.floor(rng.next() * (b - a + 1));
/** Roughly normal offset (sum of two uniforms), so clusters thin out at the edges. */
const near = (rng: Rng, s: number): number => (rng.next() + rng.next() - 1) * s;
// one ground both sides of the wall (TB-174); only the strip from the wall to `wallGap` past it stays clear
const gapL = FIELD.barX, gapR = FIELD.barX + FIELD.barW + GROUND.wallGap, gapW = gapR - gapL;
const clampX = (x: number): number => { const c = Math.min(W - 2, Math.max(2, x)); return c <= gapL || c >= gapR ? c : c < gapL + gapW / 2 ? gapL : gapR; };
/** A uniform x over the ground, skipping the wall strip. */
const across = (u: number): number => { const x = u * (W - gapW); return x < gapL ? x : x + gapW; };
const clampY = (y: number): number => Math.min(H - 2, Math.max(2, y));

function drift(rng: Rng, out: Blob[], cx: number, cy: number, c: { blobs: Range; r: Range; squash: number; spread: number }, scale = 1): void {
  for (let i = count(rng, c.blobs); i > 0; i--) out.push({ x: clampX(cx + near(rng, c.spread * scale)), y: clampY(cy + near(rng, c.spread * c.squash * scale)), r: span(rng, c.r) * scale, squash: c.squash * (0.85 + rng.next() * 0.3) });
}

function tuft(rng: Rng, x: number, y: number): Tuft {
  const T = GROUND.tufts, blades = [];
  for (let i = count(rng, T.blades); i > 0; i--) blades.push({ a: near(rng, T.lean), h: span(rng, T.h), light: rng.next() < 0.3 });
  return { x: clampX(x), y: clampY(y), blades };
}

/** Deterministic ground layout for a seed: pure data, so it is testable without a canvas. */
export function layoutGround(seed: number = GROUND.seed, wild = false): GroundLayout {
  const rng = createRng(seed), L: GroundLayout = { lush: [], sunlit: [], worn: [], bare: [], tufts: [], rocks: [], flowers: [] };
  const pt = (): [number, number] => [across(rng.next()), rng.next() * H];
  for (let i = 0; i < GROUND.lush.n; i++) { const [x, y] = pt(); drift(rng, L.lush, x, y, GROUND.lush); }
  for (let i = 0; i < GROUND.sunlit.n; i++) { const [x, y] = pt(); drift(rng, L.sunlit, x, y, GROUND.sunlit); }
  const wornAt: [number, number][] = [];
  for (let i = 0; i < GROUND.worn.n; i++) {
    const [x, y] = pt(); wornAt.push([x, y]); drift(rng, L.worn, x, y, GROUND.worn);
    drift(rng, L.bare, x, y, { ...GROUND.worn, blobs: GROUND.worn.bare }, GROUND.worn.bareScale);
  }
  const T = GROUND.tufts;
  // the wild meadow above the plain is forest floor behind the crowns: no tufts or pebbles (their pale stalks and grey dots read as stray flecks between the crown tips)
  for (let i = 0; i < (wild ? 0 : T.clusters); i++) { const [x, y] = pt(); for (let k = count(rng, T.per); k > 0; k--) L.tufts.push(tuft(rng, x + near(rng, T.spread), y + near(rng, T.spread * 0.6))); }
  for (let i = 0; i < (wild ? 0 : T.singles); i++) { const [x, y] = pt(); L.tufts.push(tuft(rng, x, y)); }
  const R = GROUND.rocks;
  for (let i = 0; i < (wild ? 0 : R.n); i++) {
    const w = wornAt[i % wornAt.length]!, [x, y] = i % 2 ? pt() : [w[0] + near(rng, GROUND.worn.spread), w[1] + near(rng, GROUND.worn.spread * 0.5)];
    const r = span(rng, R.r), sq = R.squash * (0.85 + rng.next() * 0.3);
    L.rocks.push({ x: clampX(x), y: clampY(y), r, squash: sq });
    for (let k = count(rng, R.pebbles); k > 0; k--) L.rocks.push({ x: clampX(x + near(rng, r * 3)), y: clampY(y + near(rng, r * 1.5)), r: span(rng, R.pebbleR), squash: sq });
  }
  // meadow: flower drifts strung along the top and bottom borders, a few loose singles in the fighting lane
  const F = GROUND.flowers, kinds = Object.entries(F.kinds) as [FlowerKind, number][], total = kinds.reduce((t, [, w]) => t + w, 0);
  const pick = (): FlowerKind => { let r = rng.next() * total; for (const [k, w] of kinds) if ((r -= w) < 0) return k; return kinds[0]![0]; };
  const flower = (x: number, y: number, kind: FlowerKind, scale = 1): void => { L.flowers.push({ x: clampX(x), y: clampY(y), kind, r: span(rng, F.r) * scale, stem: span(rng, F.stem) * scale, rot: rng.next() * 1.26 }); };
  const band = H * F.edge, slot = W / Math.ceil(F.drifts / 2);
  for (let i = 0; i < (wild ? 0 : F.drifts); i++) {  // the wild meadow above the plain is forest floor: no flowers (they showed through the trees as stray flecks)
    const top = i % 2 === 0, cx = slot * (Math.floor(i / 2) + 0.5 + (top ? 0 : 0.5)) + near(rng, slot * 0.45);  // a wide nudge so the drifts never fall into a visible even rhythm
    const cy = top ? F.topY[0] + rng.next() * (F.topY[1] - F.topY[0]) : H - band * (0.25 + rng.next() * 0.5), main = pick();
    // each drift leans on one kind with a sprinkle of others, so it reads as a wild meadow
    for (let k = count(rng, F.per); k > 0; k--) flower(cx + near(rng, F.driftW / 2), cy + near(rng, F.driftH), rng.next() < 0.7 ? main : pick());
  }
  for (let i = 0; i < (wild ? 0 : F.lane); i++) flower(across(rng.next()), band + rng.next() * (H - band * 2), pick(), 0.75);
  // the forest covers the plain above `topY`: a tuft or pebble there only shows as a stray fleck between the crown tips
  L.tufts = L.tufts.filter((t) => t.y >= F.topY[0]); L.rocks = L.rocks.filter((r) => r.y >= F.topY[0]);
  L.tufts.sort((a, b) => a.y - b.y); L.rocks.sort((a, b) => a.y - b.y); L.flowers.sort((a, b) => a.y - b.y);
  return L;
}

/** Feathered blob: a few stacked low-alpha ellipses, so patches have soft edges without a blur filter. */
function blobs(g: CanvasRenderingContext2D, list: Blob[], fill: string): void {
  const S = GROUND.soft; g.fillStyle = fill; g.globalAlpha = S.alpha;
  for (let p = 0; p < S.passes; p++) { const k = 1 - p * S.step; g.beginPath(); for (const b of list) { g.moveTo(b.x + b.r * k, b.y); g.ellipse(b.x, b.y, b.r * k, b.r * k * b.squash, 0, 0, 6.28); } g.fill(); }
  g.globalAlpha = 1;
}

/** Decor sprites (public/decor). Loaded once; `null` until ready, so callers fall back to vector art. */
const DECOR = ['fence'] as const;
export type DecorKey = (typeof DECOR)[number];
const imgs = new Map<string, HTMLImageElement>();
let started = false;
function loadDecor(): void {
  if (started || typeof Image === 'undefined') return;
  started = true;
  for (const k of DECOR) { const im = new Image(); im.onload = (): void => { imgs.set(k, im); }; im.src = `${import.meta.env.BASE_URL}decor/${k}.webp`; }
}
export const decorImg = (k: DecorKey): HTMLImageElement | null => imgs.get(k) ?? null;

function paint(g: CanvasRenderingContext2D, L: GroundLayout): void {
  g.fillStyle = P.plain; g.fillRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);
  blobs(g, L.lush, P.plainLush); blobs(g, L.sunlit, P.plainSun); blobs(g, L.worn, P.plainWorn); blobs(g, L.bare, P.plainBare);
  for (const r of L.rocks) {
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(r.x + r.r * 0.25, r.y + r.r * r.squash * 0.55, r.r * 1.1, r.r * r.squash * 0.7, 0, 0, 6.28); g.fill();
    g.fillStyle = P.rock; g.beginPath(); g.ellipse(r.x, r.y, r.r, r.r * r.squash, 0, 0, 6.28); g.fill();
    g.fillStyle = P.rockLight; g.beginPath(); g.ellipse(r.x - r.r * 0.25, r.y - r.r * r.squash * 0.3, r.r * 0.55, r.r * r.squash * 0.45, 0, 0, 6.28); g.fill();
  }
  g.lineWidth = GROUND.tufts.width; g.lineCap = 'round';
  for (const light of [false, true]) {
    g.strokeStyle = light ? P.tuftLight : P.tuft; g.beginPath();
    for (const t of L.tufts) for (const b of t.blades) {
      if (b.light !== light) continue;
      const tx = t.x + Math.sin(b.a) * b.h, ty = t.y - Math.cos(b.a) * b.h;
      g.moveTo(t.x + b.a * 2, t.y); g.quadraticCurveTo(t.x + Math.sin(b.a) * b.h * 0.3, t.y - b.h * 0.6, tx, ty);
    }
    g.stroke();
  }
  g.lineCap = 'butt';
  flowers(g, L.flowers);
}

const PETAL: Record<FlowerKind, string> = { daisy: P.daisy, violet: P.violet, buttercup: P.buttercup, blossom: P.blossom };

/** Stems, a leaf each, then five petals round a heart; back to front so nearer flowers overlap. */
function flowers(g: CanvasRenderingContext2D, list: Flower[]): void {
  g.lineWidth = 0.9; g.lineCap = 'round'; g.strokeStyle = P.tuft; g.beginPath();
  for (const f of list) { g.moveTo(f.x, f.y); g.lineTo(f.x, f.y - f.stem); }
  g.stroke(); g.lineCap = 'butt';
  g.fillStyle = P.tuft; g.beginPath();
  for (const f of list) { const ly = f.y - f.stem * 0.4; g.moveTo(f.x + f.r * 1.4, ly); g.ellipse(f.x + f.r * 0.7, ly, f.r * 0.7, f.r * 0.28, -0.5, 0, 6.28); }
  g.fill();
  for (const f of list) {
    const hx = f.x, hy = f.y - f.stem;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(hx + 0.4, hy + 0.6, f.r * 1.2, f.r * 0.7, 0, 0, 6.28); g.fill();
    g.fillStyle = PETAL[f.kind]; g.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = f.rot + k * 1.2566, px = hx + Math.cos(a) * f.r * 0.62, py = hy + Math.sin(a) * f.r * 0.45;
      g.moveTo(px + f.r * 0.5, py); g.ellipse(px, py, f.r * 0.5, f.r * 0.36, a, 0, 6.28);
    }
    g.fill();
    g.fillStyle = f.kind === 'daisy' || f.kind === 'buttercup' ? P.flowerHeart : P.flowerHeartPale;
    g.beginPath(); g.arc(hx, hy, f.r * 0.32, 0, 6.28); g.fill();
  }
}

/** The plain, pre-rendered once per canvas size (field rect plus shake padding), then blitted each frame. */
export class Ground {
  private off: HTMLCanvasElement | null = null;
  private layout = layoutGround();
  private above = layoutGround(GROUND.seed + 1, true);
  private painted = -1; private key = '';

  constructor() { loadDecor(); }

  /** Paint the meadow over the visible world rect (x0, y0)-(x1, y1) at k device px per world unit. The field fills the
   *  whole window (TB-207), so the view can reach past the 900x480 plain: more meadow continues above (a second seed)
   *  and to the sides (the plain again), never a flat colour. */
  draw(g: CanvasRenderingContext2D, k: number, x0: number, y0: number, x1: number, y1: number): void {
    const ow = Math.ceil((x1 - x0 + PAD * 2) * k), oh = Math.ceil((y1 - y0 + PAD * 2) * k);
    if (ow <= 0 || oh <= 0 || !(k > 0)) return;  // a hidden canvas has no size: drawImage of a 0x0 buffer throws and stops the frame loop
    const key = `${ow}x${oh}:${x0.toFixed(1)},${y0.toFixed(1)}`;
    // decor sprites arrive after the first frames: repaint each time another one lands
    if (!this.off || this.key !== key || this.painted !== imgs.size) {
      this.painted = imgs.size; this.key = key;
      this.off = this.off ?? document.createElement('canvas');
      // the buffer only grows (in 128 px steps) or drops when far too big, so a one-pixel URL-bar step never reallocates it (TB-218)
      const cw = Math.ceil(ow / 128) * 128, ch = Math.ceil(oh / 128) * 128;
      if (this.off.width < ow || this.off.height < oh || this.off.width > cw + 256 || this.off.height > ch + 256) { this.off.width = cw; this.off.height = ch; }
      const og = this.off.getContext('2d')!; og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, this.off.width, this.off.height);
      for (let ty = Math.floor(y0 / H) * H; ty < y1; ty += H) for (let tx = Math.floor(x0 / W) * W; tx < x1; tx += W) {
        og.setTransform(k, 0, 0, k, (tx - x0 + PAD) * k, (ty - y0 + PAD) * k);
        paint(og, ty < 0 ? this.above : this.layout);
      }
    }
    g.drawImage(this.off, 0, 0, ow, oh, x0 - PAD, y0 - PAD, x1 - x0 + PAD * 2, y1 - y0 + PAD * 2);
  }
}
