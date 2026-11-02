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
export function layoutGround(seed: number = GROUND.seed): GroundLayout {
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
  for (let i = 0; i < T.clusters; i++) { const [x, y] = pt(); for (let k = count(rng, T.per); k > 0; k--) L.tufts.push(tuft(rng, x + near(rng, T.spread), y + near(rng, T.spread * 0.6))); }
  for (let i = 0; i < T.singles; i++) { const [x, y] = pt(); L.tufts.push(tuft(rng, x, y)); }
  const R = GROUND.rocks;
  for (let i = 0; i < R.n; i++) {
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
  for (let i = 0; i < F.drifts; i++) {
    const top = i % 2 === 0, cx = slot * (Math.floor(i / 2) + 0.5 + (top ? 0 : 0.5)) + near(rng, slot * 0.2);
    const cy = top ? band * (0.25 + rng.next() * 0.5) : H - band * (0.25 + rng.next() * 0.5), main = pick();
    // each drift leans on one kind with a sprinkle of others, so it reads as a wild meadow
    for (let k = count(rng, F.per); k > 0; k--) flower(cx + near(rng, F.driftW / 2), cy + near(rng, F.driftH), rng.next() < 0.7 ? main : pick());
  }
  for (let i = 0; i < F.lane; i++) flower(across(rng.next()), band + rng.next() * (H - band * 2), pick(), 0.75);
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
const DECOR = ['logpile', 'fence', 'elfhouse', 'autumntree', 'pine', 'stump', 'chest', 'alchchest', 'lantern', 'arch'] as const;
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
  private painted = -1;

  constructor() { loadDecor(); }

  draw(g: CanvasRenderingContext2D, cw: number, ch: number): void {
    if (cw <= 0 || ch <= 0) return;  // a hidden canvas has no size: drawImage of a 0x0 buffer throws and stops the frame loop
    const sx = cw / W, sy = ch / H, ow = Math.ceil((W + PAD * 2) * sx), oh = Math.ceil((H + PAD * 2) * sy);
    // decor sprites arrive after the first frames: repaint each time another one lands
    if (!this.off || this.off.width !== ow || this.off.height !== oh || this.painted !== imgs.size) {
      this.painted = imgs.size;
      this.off = this.off ?? document.createElement('canvas'); this.off.width = ow; this.off.height = oh;
      const og = this.off.getContext('2d')!; og.setTransform(sx, 0, 0, sy, PAD * sx, PAD * sy); paint(og, this.layout);
    }
    g.drawImage(this.off, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
  }
}
