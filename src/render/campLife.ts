import { BUILDINGS, BuildingId } from '../data/camp';
import { CAMP_ART, CAMP_LIFE } from '../data/presentation';
import { P } from './palette';

/** Camp idle life (TB-188f, docs/plans/elf-encampment.md §1): forge sparks, dust from the training
 *  ring, drawn over the Camp scene. One fixed pool of particles in typed arrays, no
 *  allocation per frame. It only advances when CampScene draws, and main.ts draws the scene only while the Camp tab is shown,
 *  so it stops with the tab. Reads levels; never touches sim state. */

type Ctx = CanvasRenderingContext2D;
type Kind = 'sparks' | 'dust' | 'build';
const KINDS: readonly Kind[] = ['sparks', 'dust', 'build'];
/** A long pause (tab hidden, window in the background) restarts the clock instead of replaying the gap. */
const MAX_DT = 0.1;

const rnd = (r: readonly [number, number]): number => r[0] + Math.random() * (r[1] - r[0]);

export class CampLife {
  private readonly n = CAMP_LIFE.cap;
  private x = new Float32Array(this.n); private y = new Float32Array(this.n);
  private vx = new Float32Array(this.n); private vy = new Float32Array(this.n);
  private age = new Float32Array(this.n); private life = new Float32Array(this.n);
  private kind = new Uint8Array(this.n); private alive = new Uint8Array(this.n);
  /** Spawn accumulator (sparks) or countdown to the next burst (dust), per building and emitter. */
  private acc = new Map<number, number>();
  private last = -1;
  /** Levels seen on the last draw, and the start time of each building's upgrade moment (TB-188h). */
  private seen = new Map<BuildingId, number>();
  private moments = new Map<BuildingId, number>();

  /** Notice level rises. One made while the scene was drawing plays its moment; one made while it was hidden just syncs.
   *  Call it before the buildings draw, so the pop starts on the same frame. */
  watch(levels: Partial<Record<BuildingId, number>>, t: number): void {
    const live = this.last >= 0 && t - this.last <= MAX_DT;
    for (const b of BUILDINGS) {
      const lv = Math.min(3, levels[b.id] ?? 0), was = this.seen.get(b.id);
      this.seen.set(b.id, lv);
      if (live && was !== undefined && lv > was) this.upgraded(b.id, lv, t);
    }
  }

  /** Advance to time `t` (s) and draw. `g` is in scene units. */
  draw(g: Ctx, levels: Partial<Record<BuildingId, number>>, t: number): void {
    const dt = this.last < 0 ? 0 : Math.min(MAX_DT, Math.max(0, t - this.last));
    this.last = t;
    for (let bi = 0; bi < BUILDINGS.length; bi++) {
      const b = BUILDINGS[bi]!, lv = Math.min(3, levels[b.id] ?? 0);
      if (lv <= 0) continue;
      const r = CAMP_ART[b.id][lv - 1]!;
      if (b.id === 'forge') { if (dt > 0) this.emit(bi * 10 + lv, 'sparks', r.top[0], r.top[1], dt); }
      else if (b.id === 'training' && dt > 0) this.emit(bi * 10 + lv, 'dust', r.x + r.w / 2, r.y + r.h * (1 - CAMP_LIFE.dustDy), dt);
    }
    this.step(dt);
    this.paint(g);
    this.banners(g, levels, t);
  }

  /** Pop scale [width, height] for a building's image right now (1, 1 outside a moment). The image grows from its base. */
  popScale(id: BuildingId, t: number): [number, number] {
    const t0 = this.moments.get(id), C = CAMP_LIFE.pop;
    if (t0 === undefined || t - t0 >= C.pop) return [1, 1];
    const u = Math.max(0, (t - t0) / C.pop) - 1, e = 1 + (C.back + 1) * u ** 3 + C.back * u ** 2;
    return [C.from2 + (1 - C.from2) * e, C.from + (1 - C.from) * e];
  }

  /** Start an upgrade moment: build dust along the new image's base. */
  private upgraded(id: BuildingId, lv: number, t: number): void {
    const r = CAMP_ART[id][lv - 1]!;
    for (let i = 0; i < CAMP_LIFE.build.n; i++) this.spawn('build', r.x + r.w * (0.15 + 0.7 * Math.random()), r.y + r.h * (1 - 0.08 * Math.random()));
    this.moments.set(id, t);
  }

  /** The pennant climbing its pole at the building's top point, fluttering, then fading. */
  private banners(g: Ctx, levels: Partial<Record<BuildingId, number>>, t: number): void {
    const M = CAMP_LIFE.moment;
    for (const [id, t0] of this.moments) {
      const e = t - t0, end = M.raise + M.hold + M.fade;
      if (e >= end) { this.moments.delete(id); continue; }
      const lv = Math.min(3, levels[id] ?? 0); if (lv <= 0) continue;
      const r = CAMP_ART[id][lv - 1]!, x = r.x + r.w * M.px, base = r.y + r.h * M.py, top = base - M.pole;
      const up = Math.min(1, e / M.raise), ease = 1 - (1 - up) ** 3;
      g.globalAlpha = e > M.raise + M.hold ? 1 - (e - M.raise - M.hold) / M.fade : 1;
      g.strokeStyle = P.bark; g.lineWidth = M.poleW; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, base); g.lineTo(x, top); g.stroke();
      const fy = base - M.flag * 0.8 - (base - top - M.flag * 0.8) * ease, f = M.flag, wv = Math.sin(e * M.flutter) * f * 0.12;
      g.fillStyle = P.elfCloak; g.beginPath();
      g.moveTo(x, fy); g.lineTo(x + f, fy + f * 0.2 + wv); g.lineTo(x + f * 0.72, fy + f * 0.4); g.lineTo(x + f, fy + f * 0.62 + wv); g.lineTo(x, fy + f * 0.8);
      g.closePath(); g.fill();
      g.strokeStyle = P.starGold; g.lineWidth = 1.6; g.beginPath();
      g.moveTo(x + f, fy + f * 0.2 + wv); g.lineTo(x + f * 0.72, fy + f * 0.4); g.lineTo(x + f, fy + f * 0.62 + wv); g.stroke();
      g.fillStyle = P.starGold; g.beginPath(); g.arc(x, top, 3, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }

  private emit(key: number, k: Kind, x: number, y: number, dt: number): void {
    let a = this.acc.get(key) ?? 0;
    if (k === 'dust') {
      a -= dt;
      if (a <= 0) { for (let i = 0; i < CAMP_LIFE.dust.burst; i++) this.spawn(k, x, y); a = rnd(CAMP_LIFE.dust.every); }
    } else {
      a += dt * CAMP_LIFE.sparks.rate;
      while (a >= 1) { this.spawn(k, x, y); a -= 1; }
    }
    this.acc.set(key, a);
  }

  private spawn(k: Kind, x: number, y: number): void {
    const i = this.alive.indexOf(0);
    if (i < 0) return;
    const c = CAMP_LIFE[k];
    this.alive[i] = 1; this.kind[i] = KINDS.indexOf(k);
    this.x[i] = x; this.y[i] = y; this.vx[i] = rnd(c.vx); this.vy[i] = rnd(c.vy);
    this.age[i] = 0; this.life[i] = rnd(c.life);
  }

  private step(dt: number): void {
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      const c = CAMP_LIFE[KINDS[this.kind[i]!]!];
      this.age[i]! += dt;
      if (this.age[i]! >= this.life[i]!) { this.alive[i] = 0; continue; }
      this.vy[i]! += c.grav * dt;
      this.x[i]! += (this.vx[i]! + c.wind) * dt; this.y[i]! += this.vy[i]! * dt;
    }
  }

  private paint(g: Ctx): void {
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      const k = KINDS[this.kind[i]!]!, c = CAMP_LIFE[k], f = this.age[i]! / this.life[i]!;
      const r = c.r0 + (c.r1 - c.r0) * f;
      g.globalAlpha = c.a * (1 - f);
      if (k === 'build') {
        // a soft puff: full colour at the centre falling to clear at the rim
        const gr = g.createRadialGradient(this.x[i]!, this.y[i]!, 0, this.x[i]!, this.y[i]!, r);
        gr.addColorStop(0, P.sand); gr.addColorStop(1, P.dustClear);
        g.fillStyle = gr;
      } else g.fillStyle = k === 'dust' ? P.sand : i % 2 ? P.spark : P.ember;
      g.beginPath(); g.arc(this.x[i]!, this.y[i]!, r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }
}
