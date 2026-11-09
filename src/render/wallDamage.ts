import { WALL_LINE } from '../data/balance';
import { GROUND, WALL_DAMAGE as D } from '../data/presentation';
import { P } from './palette';
import { Particles } from './particles';

/** One fixed break in the wall: its depth, the health fraction it goes at, its half length in y, how far the bite reaches and its jagged edge. */
export interface WallBreak { y: number; at: number; half: number; cut: number; jag: readonly number[] }

/** Stable, seedless scatter: every run breaks in the same places, in an order that jumps along the wall. */
export const WALL_BREAKS: readonly WallBreak[] = Array.from({ length: D.count }, (_, i) => {
  const u = (n: number): number => ((i + 1) * n) % 1;
  return {
    y: D.yRange[0] + u(0.618034) * (D.yRange[1] - D.yRange[0]),
    at: D.first - (i / Math.max(1, D.count - 1)) * (D.first - D.last),
    half: D.half[0] + u(0.7548777) * (D.half[1] - D.half[0]),
    cut: D.cut[0] + u(0.5698403) * (D.cut[1] - D.cut[0]),
    jag: Array.from({ length: D.teeth + 1 }, (_, t) => ((i + 1) * (t + 1) * 0.381966 % 1 - 0.5) * D.jag),
  };
});

/** How many breaks are open at this health fraction. */
export const breaksAt = (frac: number): number => WALL_BREAKS.filter((b) => frac < b.at).length;

const lineX = (y: number): number => WALL_LINE.baseX + WALL_LINE.slope * (WALL_LINE.baseY - y);
/** How far in from the wall's outer edge a break reaches at its middle. */
const inner = (b: WallBreak): number => lineX(b.y) + D.leftEdge + b.cut;
/** The torn edge of a break, in field units: its depth swells from nothing at both ends, and every other point is a broken stake stub pointing out along the stakes. */
export const breakEdge = (b: WallBreak): [number, number][] => b.jag.map((j, t) => {
  const u = t / D.teeth, y = b.y - b.half + 2 * b.half * u, swell = Math.sin(Math.PI * u) ** D.swell, stub = t % 2 ? Math.abs(j) * swell : 0;
  return [lineX(y) + D.leftEdge + b.cut * swell - stub, y - stub * D.stakeRise];
});

interface Bit { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; spin: number; rot: number; chunk: boolean; c: string }

/** The wall's visible damage (render only): chunks bitten out of its upper side as health falls, tumbling debris and dust when one goes, dust on every blow, small flames in the worst breaks. */
export class WallDamage {
  private canvas: HTMLCanvasElement | null = null;
  private src: HTMLImageElement | HTMLCanvasElement | ImageBitmap | null = null;
  private open = -1;
  private bits: Bit[] = [];

  /** The wall image with the open breaks cut out. */
  image<T extends HTMLImageElement | HTMLCanvasElement | ImageBitmap>(fence: T): T | HTMLCanvasElement {
    if (this.open <= 0) return fence;
    if (this.src !== fence || !this.canvas) { this.src = fence; this.bake(fence); }
    return this.canvas!;
  }

  private bake(fence: HTMLImageElement | HTMLCanvasElement | ImageBitmap): void {
    const c = this.canvas ??= document.createElement('canvas'); c.width = fence.width; c.height = fence.height;
    const g = c.getContext('2d')!, L = GROUND.fence, k = fence.width / L.w;
    g.drawImage(fence, 0, 0); g.globalCompositeOperation = 'destination-out'; g.fillStyle = P.ink;
    for (let i = 0; i < this.open; i++) {
      const b = WALL_BREAKS[i]!;
      g.beginPath();
      breakEdge(b).forEach(([x, y], t) => { const px = (x - L.x) * k, py = (y - L.y) * k; if (t) g.lineTo(px, py); else g.moveTo(px, py); });
      g.lineTo((lineX(b.y + b.half) + D.leftEdge - D.margin - L.x) * k, (b.y + b.half - L.y) * k); g.lineTo((lineX(b.y - b.half) + D.leftEdge - D.margin - L.x) * k, (b.y - b.half - L.y) * k); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'source-atop'; g.strokeStyle = P.timberDark; g.lineWidth = D.rim * k; g.lineJoin = 'round';
    for (let i = 0; i < this.open; i++) {
      g.beginPath();
      breakEdge(WALL_BREAKS[i]!).forEach(([x, y], t) => { const px = (x - L.x) * k, py = (y - L.y) * k; if (t) g.lineTo(px, py); else g.moveTo(px, py); });
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  }

  /** Follow the health fraction; a break that opens throws its debris and dust. */
  update(dt: number, frac: number, fx: Particles, reduced: boolean): void {
    const n = breaksAt(frac);
    if (n !== this.open) {
      if (this.open >= 0 && n > this.open && !reduced) for (let i = this.open; i < n; i++) this.collapse(WALL_BREAKS[i]!);
      this.open = n; this.src = null;
    }
    if (!reduced) for (let i = 0; i < n; i++) {
      const b = WALL_BREAKS[i]!;
      if (b.at > D.flameBelow) continue;
      if (Math.random() < D.emberRate * dt) fx.flame(inner(b) + D.flameIn, b.y, Math.random() < 0.5 ? P.fire : P.ember);
    }
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const p = this.bits[i]!; p.life -= dt;
      if (p.life <= 0) { this.bits[i] = this.bits[this.bits.length - 1]!; this.bits.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      if (p.chunk) p.vy += D.grav * dt; else p.r += D.dustGrow * dt;
    }
  }

  private collapse(b: WallBreak): void {
    const x = inner(b);
    for (let i = 0; i < D.chunks; i++) this.add(x - Math.random() * 20, b.y + (Math.random() - 0.5) * 2 * b.half, (Math.random() - 0.3) * D.chunkSpeed, -Math.random() * D.chunkSpeed, D.chunkLife, D.chunkR[0] + Math.random() * (D.chunkR[1] - D.chunkR[0]), true, i % 2 ? P.timber : P.timberDark);
    this.dust(x - 10, b.y, D.puffs);
  }

  /** A puff of dust where a blow lands. */
  dust(x: number, y: number, n: number = D.hitPuffs): void {
    for (let i = 0; i < n; i++) this.add(x + (Math.random() - 0.5) * 14, y + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * D.dustSpeed, -Math.random() * D.dustSpeed, D.dustLife, D.dustR, false, P.wallDust);
  }

  private add(x: number, y: number, vx: number, vy: number, max: number, r: number, chunk: boolean, c: string): void {
    if (this.bits.length < D.maxBits) this.bits.push({ x, y, vx, vy, life: max, max, r, chunk, c, rot: Math.random() * 6, spin: chunk ? (Math.random() - 0.5) * D.chunkSpin : 0 });
  }

  /** Flames and flying bits, over the wall and the actors. */
  draw(g: CanvasRenderingContext2D, clock: number): void {
    for (let i = 0; i < this.open; i++) {
      const b = WALL_BREAKS[i]!; if (b.at > D.flameBelow) continue;
      for (let t = 0; t < D.tongues; t++) {
        const ph = clock * D.flicker + i * 2.1 + t * 1.7, h = D.flameH * (0.7 + 0.3 * Math.sin(ph)), x = inner(b) + D.flameIn + (t - (D.tongues - 1) / 2) * D.tongueGap, y = b.y + t * D.tongueDrop, sway = Math.sin(ph * 1.3) * D.flameW * 0.6;
        const tongue = (w: number, hh: number, c: string): void => {  // a teardrop: round belly low, thin licking tip
          g.fillStyle = c; g.beginPath(); g.moveTo(x, y);
          g.bezierCurveTo(x - w * 1.5, y, x - w, y - hh * 0.5, x + sway, y - hh); g.bezierCurveTo(x + w, y - hh * 0.5, x + w * 1.5, y, x, y); g.fill();
        };
        tongue(D.flameW, h, t % 2 ? P.ember : P.fire); tongue(D.flameW * D.flameCore, h * D.flameCore, P.fireCore);
      }
    }
    for (const p of this.bits) {
      const a = p.life / p.max; g.fillStyle = p.c;
      if (p.chunk) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, a * 2); g.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9); g.restore(); }
      else { g.globalAlpha = a * D.dustAlpha; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.fill(); g.globalAlpha = 1; }
    }
    g.globalAlpha = 1;
  }
}
