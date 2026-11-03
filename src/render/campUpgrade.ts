import { BUILDINGS, BuildingId } from '../data/camp';
import { CAMP_ART, CAMP_UPGRADE } from '../data/presentation';
import { P } from './palette';

/** Camp upgrade moment (TB-188h): build dust along the base and a banner raised beside the building when a building's level rises.
 *  It watches the levels it is drawn with, so it needs no event plumbing and never touches sim state. The first draw only records
 *  the levels, so loading a save does not celebrate. */

type Ctx = CanvasRenderingContext2D;
const U = CAMP_UPGRADE;
const rnd = (r: readonly [number, number]): number => r[0] + Math.random() * (r[1] - r[0]);
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const easeOut = (v: number): number => 1 - (1 - v) ** 3;

interface Moment { id: BuildingId; lv: number; t0: number }

export class CampUpgradeFx {
  private seen: Partial<Record<BuildingId, number>> | null = null;
  private moments: Moment[] = [];
  private readonly n = U.dust.n * BUILDINGS.length;
  private x = new Float32Array(this.n); private y = new Float32Array(this.n);
  private vx = new Float32Array(this.n); private vy = new Float32Array(this.n);
  private age = new Float32Array(this.n); private life = new Float32Array(this.n);
  private alive = new Uint8Array(this.n);
  private last = -1;

  /** Start a moment for building `id` reaching level `lv` at time `t` (s). */
  play(id: BuildingId, lv: number, t: number): void {
    const l = Math.min(3, lv); if (l <= 0) return;
    this.moments = this.moments.filter((m) => m.id !== id);
    this.moments.push({ id, lv: l, t0: t });
    const r = CAMP_ART[id][l - 1]!, base = r.y + r.h * (1 - U.dust.dy);
    for (let k = 0; k < U.dust.n; k++) {
      const i = this.alive.indexOf(0); if (i < 0) break;
      this.alive[i] = 1; this.age[i] = 0; this.life[i] = rnd(U.dust.life);
      this.x[i] = r.x + r.w / 2 + (Math.random() - 0.5) * r.w * U.dust.spread; this.y[i] = base - Math.random() * U.dust.lift;
      this.vx[i] = rnd(U.dust.vx); this.vy[i] = rnd(U.dust.vy);
    }
  }

  /** Detect level rises, then draw dust and banners over the buildings. */
  draw(g: Ctx, levels: Partial<Record<BuildingId, number>>, t: number): void {
    if (this.seen) for (const b of BUILDINGS) { const now = levels[b.id] ?? 0; if (now > (this.seen[b.id] ?? 0)) this.play(b.id, now, t); }
    this.seen = { ...levels };
    const dt = this.last < 0 ? 0 : Math.min(0.1, Math.max(0, t - this.last)); this.last = t;
    const d = U.dust;
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      this.age[i]! += dt;
      if (this.age[i]! >= this.life[i]!) { this.alive[i] = 0; continue; }
      this.vy[i]! += d.grav * dt; this.x[i]! += this.vx[i]! * dt; this.y[i]! += this.vy[i]! * dt;
      const f = this.age[i]! / this.life[i]!;
      g.globalAlpha = d.a * (1 - f) * clamp01(f * 6);
      g.fillStyle = i % 3 ? P.sand : P.plainBare;
      g.beginPath(); g.arc(this.x[i]!, this.y[i]!, d.r0 + (d.r1 - d.r0) * f, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    this.drawBanners(g, t);
  }

  /** True while any dust or banner is still showing. */
  get active(): boolean { return this.moments.length > 0 || this.alive.includes(1); }

  private drawBanners(g: Ctx, t: number): void {
    const B = U.banner;
    this.moments = this.moments.filter((m) => t - m.t0 < U.dur);
    for (const m of this.moments) {
      const e = t - m.t0, r = CAMP_ART[m.id][m.lv - 1]!;
      const at = B.at[m.id], fx = r.x + r.w * at[0], fy = r.y + r.h * (1 - at[1]) + B.sink;
      const ph = B.pole * easeOut(clamp01(e / B.poleT));
      g.globalAlpha = 1 - clamp01((e - (U.dur - B.fade)) / B.fade);
      g.save(); g.globalAlpha *= B.shadow[2] * clamp01(e / B.poleT); g.fillStyle = P.ink;
      g.beginPath(); g.ellipse(fx, fy, B.shadow[0], B.shadow[1], 0, 0, Math.PI * 2); g.fill(); g.restore();
      g.strokeStyle = P.timberDark; g.lineWidth = B.lineW; g.lineCap = 'round';
      g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - ph); g.stroke();
      const rise = easeOut(clamp01((e - B.raise[0]) / (B.raise[1] - B.raise[0])));
      if (rise <= 0) continue;
      const cy = fy - B.h - (B.pole - B.h) * rise, wv = Math.sin(e * B.wave * Math.PI * 2) * B.sway;
      // swallowtail cloth hung from the pole
      g.fillStyle = P.grove;
      g.beginPath(); g.moveTo(fx, cy);
      g.quadraticCurveTo(fx + B.w / 2, cy - wv, fx + B.w, cy);
      g.lineTo(fx + B.w * 0.75, cy + B.h / 2); g.lineTo(fx + B.w, cy + B.h);
      g.quadraticCurveTo(fx + B.w / 2, cy + B.h - wv, fx, cy + B.h);
      g.closePath(); g.fill();
      g.fillStyle = P.starGold;
      g.beginPath(); g.arc(fx + B.w * 0.36, cy + B.h / 2 - wv * 0.3, B.h * 0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(fx, fy - B.pole, B.lineW, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }
}
