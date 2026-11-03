import { BUILDINGS, BuildingId } from '../data/camp';
import { CAMP_ART, CAMP_UPGRADE } from '../data/presentation';
import { P } from './palette';

/** Camp upgrade moment (TB-188h): soft build dust along the base and the camp banner unrolled from a point on the building when its
 *  level rises. The banner is public/decor/camp/upgrade_banner.webp, cut from the forge level 3 render, so it is lit like the
 *  buildings. It watches the levels it is drawn with, so it needs no event plumbing and never touches sim state. The first draw
 *  only records the levels, so loading a save does not celebrate. Its own seeded RNG makes every replay identical. */

type Ctx = CanvasRenderingContext2D;
const U = CAMP_UPGRADE;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
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
  private banner: HTMLImageElement | null = null;

  constructor() {
    if (typeof Image === 'undefined') return;
    const im = new Image(); im.onload = (): void => { this.banner = im; };
    im.src = `${import.meta.env.BASE_URL}decor/camp/upgrade_banner.webp`;
  }

  private range(r: readonly [number, number]): number { return r[0] + this.rnd() * (r[1] - r[0]); }

  /** Start a moment for building `id` reaching level `lv` at time `t` (s). */
  play(id: BuildingId, lv: number, t: number): void {
    const arts = CAMP_ART[id], l = Math.min(arts.length, lv); if (l <= 0) return;
    this.moments = this.moments.filter((m) => m.id !== id);
    this.moments.push({ id, lv: l, t0: t });
    const r = arts[l - 1]!, d = U.dust, base = r.y + r.h * (1 - d.dy);
    for (let k = 0; k < d.n; k++) {
      const i = this.alive.indexOf(0); if (i < 0) break;
      this.alive[i] = 1; this.age[i] = 0; this.life[i] = this.range(d.life); this.r0[i] = this.range(d.r0);
      this.kind[i] = this.rnd() < d.earth ? 1 : 0;
      this.x[i] = r.x + r.w / 2 + (this.rnd() - 0.5) * r.w * d.spread; this.y[i] = base - this.rnd() * d.lift;
      this.vx[i] = this.range(d.vx); this.vy[i] = this.range(d.vy);
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
      const rw = this.r0[i]! * (1 + (d.grow - 1) * easeOut(f)), rh = rw * d.squash;
      g.globalAlpha = d.a * (1 - f) * clamp01(f / d.fadeIn);
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
      g.save(); g.globalAlpha = 1 - clamp01((e - (U.dur - B.fade)) / B.fade);
      g.translate(r.x + r.w * at[0], r.y + r.h * at[1]); g.rotate(ang);
      g.drawImage(im, 0, 0, im.width, im.height * roll, -B.w / 2, 0, B.w, B.h * roll);
      g.restore();
    }
  }
}
