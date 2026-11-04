import { BUILDINGS, BuildingId } from '../data/camp';
import { CAMP_ART, CAMP_UPGRADE } from '../data/presentation';
import { P } from './palette';

/** Camp upgrade moment (TB-188h): soft build dust along the base and the camp banner unrolled from a point on the building when its
 *  level rises. The banner is painted from palette tokens.
 *  It watches the levels it is drawn with, so it needs no event plumbing and never touches sim state. The first draw
 *  only records the levels, so loading a save does not celebrate. Its own seeded RNG makes every replay identical. */

type Ctx = CanvasRenderingContext2D;
const U = CAMP_UPGRADE;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const easeIn = (v: number): number => v * v;
const easeOut = (v: number): number => 1 - (1 - v) ** 3;

/** Mulberry32: small seeded RNG for render-only scatter. */
const seeded = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** A soft round puff: dense core fading to a clear rim, painted once. */
const puff = (core: string, clear: string): HTMLCanvasElement | null => {
  if (typeof document === 'undefined') return null;
  const px = U.dust.tex, c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'); if (!g) return null;
  const r = px / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, core); gr.addColorStop(U.dust.core, core); gr.addColorStop(1, clear);
  g.fillStyle = gr; g.fillRect(0, 0, px, px); return c;
};

/** The banner, painted once from palette tokens: a rod with knobs, a crimson cloth hung below it with a deep swallow-tail fork, a gold
 *  trim following the edge, and a starlight star over a pair of leaves, so it shares no silhouette or glyph with the banners in the
 *  building art. `px` texture pixels per scene unit. */
const paintBanner = (): HTMLCanvasElement | null => {
  if (typeof document === 'undefined') return null;
  const B = U.banner, K = B.art, W = Math.round(B.w * K.px), H = Math.round(B.h * K.px);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); if (!g) return null;
  const x0 = W * K.cloth[0], x1 = W * K.cloth[1], xm = W / 2, y0 = H * K.top, yb = H * K.tip, yn = H * K.notch;
  const cloth = new Path2D();
  cloth.moveTo(x0, y0); cloth.lineTo(x1, y0); cloth.lineTo(x1, yb); cloth.lineTo(xm, yn); cloth.lineTo(x0, yb); cloth.closePath();
  const sh = g.createLinearGradient(x0, 0, x1, 0);
  sh.addColorStop(0, P.bannerDark); sh.addColorStop(K.lit, P.bannerCloth); sh.addColorStop(1, P.bannerDark);
  g.fillStyle = sh; g.fill(cloth);
  g.lineJoin = 'round'; g.strokeStyle = P.starGold; g.globalAlpha = K.trimA; g.lineWidth = K.trim * K.px;
  const ins = K.inset * K.px, trim = new Path2D();
  trim.moveTo(x0 + ins, y0 + ins); trim.lineTo(x1 - ins, y0 + ins); trim.lineTo(x1 - ins, yb - ins * 2.4); trim.lineTo(xm, yn - ins * 1.2);
  trim.lineTo(x0 + ins, yb - ins * 2.4); trim.closePath(); g.stroke(trim); g.globalAlpha = 1;
  // four-point star, long vertical arms, short horizontal ones
  const sx = xm, sy = H * K.star.y, R = W * K.star.r, r = R * K.star.pinch;
  g.fillStyle = P.starGold; g.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r : i % 4 === 0 ? R * K.star.tall : R;
    g.lineTo(sx + Math.cos(ang) * rr, sy + Math.sin(ang) * rr);
  }
  g.closePath(); g.fill();
  // two leaves opening upward under the star
  const ly = H * K.leaf.y, lw = W * K.leaf.w, lh = H * K.leaf.h;
  for (const sg of [-1, 1]) {
    g.beginPath(); g.moveTo(xm, ly + lh);
    g.quadraticCurveTo(xm + sg * lw * 1.1, ly + lh * 0.7, xm + sg * lw, ly);
    g.quadraticCurveTo(xm + sg * lw * 0.15, ly + lh * 0.25, xm, ly + lh); g.fill();
  }
  // rod over the cloth's top edge, a knob at each end
  const rh = H * K.rod, ky = rh / 2, kr = rh * K.knob;
  g.fillStyle = P.bannerRod; g.beginPath(); g.roundRect(W * K.rodX, 0, W * (1 - 2 * K.rodX), rh, rh / 2); g.fill();
  g.fillStyle = P.bannerKnob;
  for (const kx of [W * K.rodX, W * (1 - K.rodX)]) { g.beginPath(); g.arc(kx, ky, kr, 0, Math.PI * 2); g.fill(); }
  return c;
};

interface Moment { id: BuildingId; lv: number; t0: number }

export class CampUpgradeFx {
  private seen: Partial<Record<BuildingId, number>> | null = null;
  private moments: Moment[] = [];
  private readonly rnd = seeded(U.seed);
  private readonly n = U.dust.n * BUILDINGS.length;
  private x = new Float32Array(this.n); private y = new Float32Array(this.n);
  private vx = new Float32Array(this.n); private vy = new Float32Array(this.n);
  private age = new Float32Array(this.n); private life = new Float32Array(this.n);
  private r0 = new Float32Array(this.n); private kind = new Uint8Array(this.n);
  private alive = new Uint8Array(this.n);
  private last = -1;
  private puffs: (HTMLCanvasElement | null)[] | null = null;
  private banner: CanvasImageSource | null = null;
  private bannerW = 0; private bannerH = 0;

  constructor() {
    this.banner = paintBanner(); this.bannerW = this.banner?.width ?? 0; this.bannerH = this.banner?.height ?? 0;
  }

  private range(r: readonly [number, number]): number { return r[0] + this.rnd() * (r[1] - r[0]); }

  /** Start a moment for building `id` reaching level `lv` at time `t` (s). */
  play(id: BuildingId, lv: number, t: number): void {
    const arts = CAMP_ART[id], l = Math.min(arts.length, lv); if (l <= 0) return;
    this.moments = this.moments.filter((m) => m.id !== id);
    this.moments.push({ id, lv: l, t0: t });
    const r = arts[l - 1]!, d = U.dust, base = r.y + r.h * (1 - d.dy);
    const cx = r.x + r.w / 2;
    for (let k = 0; k < d.n; k++) {
      const i = this.alive.indexOf(0); if (i < 0) break;
      this.alive[i] = 1; this.age[i] = 0; this.life[i] = this.range(d.life); this.r0[i] = this.range(d.r0);
      this.kind[i] = this.rnd() < d.earth ? 1 : 0;
      // one stratum of the base per pair, its mirror on the other side, so the cloud is whole and level on both sides
      const u = (((k >> 1) + this.rnd()) / (d.n >> 1)) ** d.centre, off = u * r.w * d.spread * 0.5, sgn = k & 1 ? -1 : 1;
      this.x[i] = cx + sgn * off; this.y[i] = base - this.rnd() * d.lift * (1 - d.dome * u);
      this.vx[i] = sgn * Math.abs(this.range(d.vx)) * (0.4 + u); this.vy[i] = this.range(d.vy);
    }
  }

  /** Detect level rises, then draw dust and banners over the buildings. */
  draw(g: Ctx, levels: Partial<Record<BuildingId, number>>, t: number): void {
    if (this.seen) for (const b of BUILDINGS) { const now = levels[b.id] ?? 0; if (now > (this.seen[b.id] ?? 0)) this.play(b.id, now, t); }
    this.seen = { ...levels };
    const dt = this.last < 0 ? 0 : Math.min(U.maxDt, Math.max(0, t - this.last)); this.last = t;
    this.puffs ??= [puff(P.dustSand, P.dustSandClear), puff(P.dustEarth, P.dustEarthClear)];
    const d = U.dust, keep = Math.exp(-d.drag * dt);
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      this.age[i]! += dt;
      if (this.age[i]! >= this.life[i]!) { this.alive[i] = 0; continue; }
      this.vx[i]! *= keep; this.vy[i] = this.vy[i]! * keep + d.grav * dt;
      this.x[i]! += this.vx[i]! * dt; this.y[i]! += this.vy[i]! * dt;
      const f = this.age[i]! / this.life[i]!, im = this.puffs[this.kind[i]!]; if (!im) continue;
      const rw = this.r0[i]! * (d.from + (d.grow - d.from) * easeOut(f)), rh = rw * d.squash;
      g.globalAlpha = d.a * (1 - f) * clamp01(d.floor + f / d.fadeIn);
      g.drawImage(im, this.x[i]! - rw, this.y[i]! - rh, rw * 2, rh * 2);
    }
    g.globalAlpha = 1;
    this.drawBanners(g, t);
  }

  /** True while any dust or banner is still showing. */
  get active(): boolean { return this.moments.length > 0 || this.alive.includes(1); }

  private drawBanners(g: Ctx, t: number): void {
    const B = U.banner, im = this.banner;
    this.moments = this.moments.filter((m) => t - m.t0 < U.dur);
    if (!im) return;
    for (const m of this.moments) {
      const e = t - m.t0, r = CAMP_ART[m.id][m.lv - 1]!, at = B.at[m.id][m.lv - 1]!;
      const roll = easeOut(clamp01((e - B.roll[0]) / (B.roll[1] - B.roll[0]))); if (roll <= 0) continue;
      const ang = Math.sin(e * B.wave * Math.PI * 2) * B.swing * Math.exp(-B.damp * e);
      const a = Math.min(clamp01((e - B.roll[0]) / B.in), 1 - easeIn(clamp01((e - B.out[0]) / (B.out[1] - B.out[0])))); if (a < 0.02) continue;
      g.save(); g.globalAlpha = a;
      g.translate(r.x + r.w * at[0], r.y + r.h * at[1]); g.rotate(ang);
      g.drawImage(im, 0, 0, this.bannerW, this.bannerH * roll, -B.w / 2, 0, B.w, B.h * roll);
      g.restore();
    }
  }
}
