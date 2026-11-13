import { WALL_ART, WALL_DAMAGE as D } from '../data/presentation';
import { P } from './palette';
import { Particles } from './particles';
import { wallFaceX as wallX, type PlacedWall as WallArt } from './wallArt';

/** Which rendered damage stage shows at this health fraction: 0 whole, up to one per WALL_DAMAGE.stages entry. */
export const wallStage = (frac: number): 0 | 1 | 2 | 3 => D.stages.filter((f) => frac < f).length as 0 | 1 | 2 | 3;

interface Bit { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; spin: number; rot: number; chunk: boolean; c: string }

/** The wall's visible damage (render only): which rendered stage shows, debris and dust at its breaches when the stage worsens, dust on every blow, small flames in the worst breaches. */
export class WallDamage {
  stage: 0 | 1 | 2 | 3 = 0;
  private seen = false;
  private art: WallArt = WALL_ART[0];
  private bits: Bit[] = [];

  /** Follow the health fraction and the wall tier. */
  update(dt: number, frac: number, art: WallArt, fx: Particles, reduced: boolean): void {
    this.art = art;
    const n = wallStage(frac);
    if (n > this.stage && this.seen && !reduced) for (const y of art.breaches) this.collapse(y);
    this.stage = n; this.seen = true;
    if (!reduced && n >= D.flameStage) for (const y of art.breaches) if (Math.random() < D.emberRate * dt) fx.flame(wallX(y), y, Math.random() < 0.5 ? P.fire : P.ember);
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const p = this.bits[i]!; p.life -= dt;
      if (p.life <= 0) { this.bits[i] = this.bits[this.bits.length - 1]!; this.bits.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      if (p.chunk) p.vy += D.grav * dt; else p.r += D.dustGrow * dt;
    }
  }

  private collapse(y: number): void {
    const x = wallX(y);
    for (let i = 0; i < D.chunks; i++) this.add(x + Math.random() * 20, y + (Math.random() - 0.5) * 40, (Math.random() + 0.1) * D.chunkSpeed, -Math.random() * D.chunkSpeed, D.chunkLife, D.chunkR[0] + Math.random() * (D.chunkR[1] - D.chunkR[0]), true, P[this.art.chunks[i % 2]!]);
    this.dust(x + 10, y, D.puffs);
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
    if (this.stage >= D.flameStage) this.art.breaches.forEach((by, i) => {
      for (let t = 0; t < D.tongues; t++) {
        const ph = clock * D.flicker + i * 2.1 + t * 1.7, h = D.flameH * (0.7 + 0.3 * Math.sin(ph)), x = wallX(by) + (t - (D.tongues - 1) / 2) * D.tongueGap, y = by + t * D.tongueDrop, sway = Math.sin(ph * 1.3) * D.flameW * 0.6;
        const tongue = (w: number, hh: number, c: string): void => {  // a teardrop: round belly low, thin licking tip
          g.fillStyle = c; g.beginPath(); g.moveTo(x, y);
          g.bezierCurveTo(x - w * 1.5, y, x - w, y - hh * 0.5, x + sway, y - hh); g.bezierCurveTo(x + w, y - hh * 0.5, x + w * 1.5, y, x, y); g.fill();
        };
        tongue(D.flameW, h, t % 2 ? P.ember : P.fire); tongue(D.flameW * D.flameCore, h * D.flameCore, P.fireCore);
      }
    });
    for (const p of this.bits) {
      const a = p.life / p.max; g.fillStyle = p.c;
      if (p.chunk) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, a * 2); g.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9); g.restore(); }
      else { g.globalAlpha = a * D.dustAlpha; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.fill(); g.globalAlpha = 1; }
    }
    g.globalAlpha = 1;
  }
}
