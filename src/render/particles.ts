/** Render-side particles, strokes, blood splats and floating text, fed by sim events. Never touches sim state.
 *  Every pool is preallocated at construction and recycled in place (TB-088): no allocation per frame. */
import { VFX } from '../data/presentation';

/** Flames off a burning orc, per the prototype: ~15 sparks/s rising 40 px/s, 0.4 s life. */
export const FLAME = { rate: 15, rise: 40, drift: 20, life: 0.4, size: 2, lift: 6 } as const;

/** A square or a blood droplet. A droplet (`ground` > 0) falls under gravity and leaves a splat when it reaches `ground`. */
interface Part { x: number; y: number; vx: number; vy: number; life: number; c: string; r: number; ground: number; g: number; splat: number }
/** 0 = crescent arc (r, a0, a1), 1 = line to (x2, y2), 2 = ring growing to r. */
interface Stroke { kind: 0 | 1 | 2; x: number; y: number; x2: number; y2: number; r: number; a0: number; a1: number; c: string; c2: string; w: number; life: number; max: number }
interface Splat { x: number; y: number; rx: number; life: number; c: string }
interface Txt { x: number; y: number; s: string; c: string; life: number }

const fill = <T>(n: number, make: () => T): T[] => { const a: T[] = []; for (let i = 0; i < n; i++) a.push(make()); return a; };

export class Particles {
  private parts = fill<Part>(VFX.cap.parts, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, c: '', r: 0, ground: 0, g: 0, splat: 0 }));
  private strokes = fill<Stroke>(VFX.cap.strokes, () => ({ kind: 0, x: 0, y: 0, x2: 0, y2: 0, r: 0, a0: 0, a1: 0, c: '', c2: '', w: 0, life: 0, max: 1 }));
  private splats = fill<Splat>(VFX.cap.splats, () => ({ x: 0, y: 0, rx: 0, life: 0, c: '' }));
  private texts = fill<Txt>(VFX.cap.texts, () => ({ x: 0, y: 0, s: '', c: '', life: 0 }));
  private np = 0; private ns = 0; private nt = 0;
  /** Splats are a ring: when full, the oldest is overwritten. */
  private splatHead = 0;

  /** Live counts, for the pool test. */
  get counts(): { parts: number; strokes: number; texts: number } { return { parts: this.np, strokes: this.ns, texts: this.nt }; }

  /** Squares from (x, y): all round, or within ±spread of angle `ang` when spread > 0. */
  burst(x: number, y: number, c: string, n: number, sp: number, ang = 0, spread = 0): void {
    const B = VFX.burst;
    for (let i = 0; i < n && this.np < this.parts.length; i++) {
      const p = this.parts[this.np++]!, a = spread > 0 ? ang + (Math.random() * 2 - 1) * spread : Math.random() * 6.28, v = sp * (0.3 + Math.random());
      p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.life = B.life + Math.random() * B.lifeJitter; p.c = c; p.r = B.size + Math.random() * B.sizeJitter; p.ground = 0; p.g = 0; p.splat = 0;
    }
  }

  /** Blood: n droplets thrown up and out from (x, y), biased away from the blow (dir +1 right, -1 left, 0 either), landing near y + foot. */
  blood(x: number, y: number, foot: number, c: string, n: number, dir: number): void {
    const b = VFX.blood;
    for (let i = 0; i < n && this.np < this.parts.length; i++) {
      const p = this.parts[this.np++]!, v = b.speed * (0.4 + Math.random());
      const side = dir === 0 ? (Math.random() < 0.5 ? -1 : 1) : dir;
      p.x = x; p.y = y; p.vx = side * v * (0.3 + Math.random() * 0.7); p.vy = -b.lift * (0.4 + Math.random());
      p.life = 2; p.c = c; p.r = b.size; p.ground = y + foot + (Math.random() - 0.5) * b.drop; p.g = b.gravity; p.splat = b.dropSplat * (0.6 + Math.random() * 0.8);
    }
  }

  /** A flat ground splat at (x, y), half-width rx. */
  splat(x: number, y: number, rx: number, c: string): void {
    const s = this.splats[this.splatHead]!; this.splatHead = (this.splatHead + 1) % this.splats.length;
    s.x = x; s.y = y; s.rx = rx; s.life = VFX.blood.splatLife; s.c = c;
  }

  /** One rising spark; call at FLAME.rate per second per burning orc. */
  flame(x: number, y: number, c: string): void {
    if (this.np >= this.parts.length) return;
    const p = this.parts[this.np++]!;
    p.x = x; p.y = y - FLAME.lift; p.vx = (Math.random() - 0.5) * FLAME.drift; p.vy = -FLAME.rise; p.life = FLAME.life; p.c = c; p.r = FLAME.size; p.ground = 0; p.g = 0; p.splat = 0;
  }

  private stroke(kind: 0 | 1 | 2, c: string, c2: string, w: number, life: number): Stroke | null {
    if (this.ns >= this.strokes.length) return null;
    const k = this.strokes[this.ns++]!; k.kind = kind; k.c = c; k.c2 = c2; k.w = w; k.life = life; k.max = life; return k;
  }
  /** Crescent swipe centred on (x, y), facing angle `ang`; colour c, then c2 for its second half of life. */
  arc(x: number, y: number, r: number, ang: number, half: number, c: string, c2: string, w: number, life: number): void {
    const k = this.stroke(0, c, c2, w, life); if (!k) return; k.x = x; k.y = y; k.r = r; k.a0 = ang - half; k.a1 = ang + half;
  }
  line(x: number, y: number, x2: number, y2: number, c: string, w: number, life: number): void {
    const k = this.stroke(1, c, c, w, life); if (!k) return; k.x = x; k.y = y; k.x2 = x2; k.y2 = y2;
  }
  /** A ground ring flattened to the field's tilt, growing to r. */
  ring(x: number, y: number, r: number, c: string, w: number, life: number): void {
    const k = this.stroke(2, c, c, w, life); if (!k) return; k.x = x; k.y = y; k.r = r;
  }

  text(x: number, y: number, s: string, c: string): void {
    if (this.nt >= this.texts.length) return;
    const t = this.texts[this.nt++]!; t.x = x; t.y = y; t.s = s; t.c = c; t.life = VFX.textLife;
  }

  update(dt: number): void {
    const drag = VFX.burst.drag;
    for (let i = this.np - 1; i >= 0; i--) {
      const p = this.parts[i]!; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.ground) { p.vy += p.g * dt; if (p.vy > 0 && p.y >= p.ground) { this.splat(p.x, p.ground, p.splat, p.c); p.life = 0; } } else p.vx *= drag;
      if (p.life <= 0) this.swap(this.parts, i, --this.np);
    }
    for (let i = this.ns - 1; i >= 0; i--) { const k = this.strokes[i]!; k.life -= dt; if (k.life <= 0) this.swap(this.strokes, i, --this.ns); }
    for (const s of this.splats) if (s.life > 0) s.life -= dt;
    for (let i = this.nt - 1; i >= 0; i--) { const t = this.texts[i]!; t.life -= dt; t.y -= VFX.textRise * dt; if (t.life <= 0) this.swap(this.texts, i, --this.nt); }
  }

  /** Remove index i by swapping the last live element into it; the dead object moves to the free tail. */
  private swap<T>(a: T[], i: number, last: number): void { const t = a[i]!; a[i] = a[last]!; a[last] = t; }

  /** Ground layer: blood splats, drawn under every actor. */
  drawGround(g: CanvasRenderingContext2D): void {
    const b = VFX.blood;
    for (const s of this.splats) {
      if (s.life <= 0) continue;
      g.globalAlpha = b.splatAlpha * Math.min(1, s.life / (b.splatLife * 0.5)); g.fillStyle = s.c;
      g.beginPath(); g.ellipse(s.x, s.y, s.rx, s.rx * 0.4, 0, 0, 6.28); g.fill();
    }
    g.globalAlpha = 1;
  }

  draw(g: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.ns; i++) {
      const k = this.strokes[i]!, u = k.life / k.max;
      g.globalAlpha = u; g.strokeStyle = u > 0.5 ? k.c : k.c2; g.lineWidth = k.w * (0.5 + 0.5 * u); g.beginPath();
      if (k.kind === 0) g.arc(k.x, k.y, k.r, k.a0, k.a1);
      else if (k.kind === 1) { g.moveTo(k.x, k.y); g.lineTo(k.x2, k.y2); }
      else g.ellipse(k.x, k.y, k.r * (1.2 - u * 0.6), k.r * (1.2 - u * 0.6) * 0.4, 0, 0, 6.28);
      g.stroke();
    }
    for (let i = 0; i < this.np; i++) { const p = this.parts[i]!; g.globalAlpha = Math.max(0, Math.min(1, p.life)); g.fillStyle = p.c; g.fillRect(p.x, p.y, p.r, p.r); }
    g.globalAlpha = 1; g.font = '700 12px "Atkinson Hyperlegible", sans-serif'; g.textAlign = 'center';
    for (let i = 0; i < this.nt; i++) { const t = this.texts[i]!; g.globalAlpha = Math.min(1, t.life * 1.5); g.fillStyle = t.c; g.fillText(t.s, t.x, t.y); }
    g.globalAlpha = 1;
  }
}
