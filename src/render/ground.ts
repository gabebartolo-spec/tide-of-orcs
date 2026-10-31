import { FIELD } from '../data/balance';
import { GROUND } from '../data/presentation';
import { createRng, Rng } from '../sim/rng';
import { P } from './palette';

const W = FIELD.w, H = FIELD.h, PAD = 10;
type Range = readonly [number, number];
export interface Blob { x: number; y: number; r: number; squash: number }
export interface Tuft { x: number; y: number; blades: { a: number; h: number; light: boolean }[] }
export interface Rock { x: number; y: number; r: number; squash: number }
export interface GroundLayout { lush: Blob[]; worn: Blob[]; bare: Blob[]; tufts: Tuft[]; rocks: Rock[] }

const span = (rng: Rng, [a, b]: Range): number => a + rng.next() * (b - a);
const count = (rng: Rng, [a, b]: Range): number => a + Math.floor(rng.next() * (b - a + 1));
/** Roughly normal offset (sum of two uniforms), so clusters thin out at the edges. */
const near = (rng: Rng, s: number): number => (rng.next() + rng.next() - 1) * s;
const x0 = FIELD.barX + FIELD.barW + GROUND.wallGap;
const clampX = (x: number): number => Math.min(W - 2, Math.max(x0, x));
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
  const rng = createRng(seed), L: GroundLayout = { lush: [], worn: [], bare: [], tufts: [], rocks: [] };
  const pt = (): [number, number] => [x0 + rng.next() * (W - x0), rng.next() * H];
  for (let i = 0; i < GROUND.lush.n; i++) { const [x, y] = pt(); drift(rng, L.lush, x, y, GROUND.lush); }
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
  L.tufts.sort((a, b) => a.y - b.y); L.rocks.sort((a, b) => a.y - b.y);
  return L;
}

/** Feathered blob: a few stacked low-alpha ellipses, so patches have soft edges without a blur filter. */
function blobs(g: CanvasRenderingContext2D, list: Blob[], fill: string): void {
  const S = GROUND.soft; g.fillStyle = fill; g.globalAlpha = S.alpha;
  for (let p = 0; p < S.passes; p++) { const k = 1 - p * S.step; g.beginPath(); for (const b of list) { g.moveTo(b.x + b.r * k, b.y); g.ellipse(b.x, b.y, b.r * k, b.r * k * b.squash, 0, 0, 6.28); } g.fill(); }
  g.globalAlpha = 1;
}

function paint(g: CanvasRenderingContext2D, L: GroundLayout): void {
  g.fillStyle = P.plain; g.fillRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);
  blobs(g, L.lush, P.plainLush); blobs(g, L.worn, P.plainWorn); blobs(g, L.bare, P.plainBare);
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
}

/** The plain, pre-rendered once per canvas size (field rect plus shake padding), then blitted each frame. */
export class Ground {
  private off: HTMLCanvasElement | null = null;
  private layout = layoutGround();

  draw(g: CanvasRenderingContext2D, cw: number, ch: number): void {
    const sx = cw / W, sy = ch / H, ow = Math.ceil((W + PAD * 2) * sx), oh = Math.ceil((H + PAD * 2) * sy);
    if (!this.off || this.off.width !== ow || this.off.height !== oh) {
      this.off = this.off ?? document.createElement('canvas'); this.off.width = ow; this.off.height = oh;
      const og = this.off.getContext('2d')!; og.setTransform(sx, 0, 0, sy, PAD * sx, PAD * sy); paint(og, this.layout);
    }
    g.drawImage(this.off, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
  }
}
