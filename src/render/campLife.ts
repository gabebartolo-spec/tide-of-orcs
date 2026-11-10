import { BUILDINGS, BuildingId } from '../data/camp';
import { CAMP_ART, CAMP_LIFE } from '../data/presentation';
import { P } from './palette';

/** Camp idle life (TB-188f, docs/plans/elf-encampment.md §1): forge sparks, dust from the training
 *  ring, drawn over the Camp scene. One fixed pool of particles in typed arrays, no
 *  allocation per frame. It only advances when CampScene draws, and main.ts draws the scene only while the Camp tab is shown,
 *  so it stops with the tab. Reads levels; never touches sim state. */

type Ctx = CanvasRenderingContext2D;
type Kind = 'sparks' | 'dust' | 'buildDust' | 'mote';
const KINDS: readonly Kind[] = ['sparks', 'dust', 'buildDust', 'mote'];
const PROFILE = { sparks: CAMP_LIFE.sparks, dust: CAMP_LIFE.dust, buildDust: CAMP_LIFE.build.dust, mote: CAMP_LIFE.build.mote } as const;
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
  /** Levels seen on the previous draw; a rise is an upgrade (first draw only records). */
  private seen: Partial<Record<BuildingId, number>> | null = null;

  /** Advance to time `t` (s) and draw. `g` is in scene units. */
  draw(g: Ctx, levels: Partial<Record<BuildingId, number>>, t: number): void {
    const dt = this.last < 0 ? 0 : Math.min(MAX_DT, Math.max(0, t - this.last));
    this.last = t;
    for (let bi = 0; bi < BUILDINGS.length; bi++) {
      const b = BUILDINGS[bi]!, lv = Math.min(3, levels[b.id] ?? 0);
      if (lv <= 0) continue;
      const r = CAMP_ART[b.id][lv - 1]!;
      if (this.seen && lv > (this.seen[b.id] ?? 0)) this.build(r.x, r.y + r.h, r.w);
      if (b.id === 'forge') { if (dt > 0) this.emit(bi * 10 + lv, 'sparks', r.top[0], r.top[1], dt); }
      else if (b.id === 'training' && dt > 0) this.emit(bi * 10 + lv, 'dust', r.x + r.w / 2, r.y + r.h * (1 - CAMP_LIFE.dustDy), dt);
    }
    this.seen = { ...levels };
    this.step(dt);
    this.paint(g);
  }

  /** Upgrade moment (TB-188h): a puff of dust along the building's base and gold motes rising from it. */
  private build(x: number, base: number, w: number): void {
    const B = CAMP_LIFE.build, cx = x + w / 2;
    for (let i = 0; i < B.count; i++) this.spawn('buildDust', cx + (Math.random() * 2 - 1) * w * B.spread, base - B.rise);
    for (let i = 0; i < B.motes; i++) this.spawn('mote', cx + (Math.random() * 2 - 1) * w * B.spread, base - B.rise);
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
    const c = PROFILE[k];
    this.alive[i] = 1; this.kind[i] = KINDS.indexOf(k);
    this.x[i] = x; this.y[i] = y; this.vx[i] = rnd(c.vx); this.vy[i] = rnd(c.vy);
    this.age[i] = 0; this.life[i] = rnd(c.life);
  }

  private step(dt: number): void {
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      const c = PROFILE[KINDS[this.kind[i]!]!];
      this.age[i]! += dt;
      if (this.age[i]! >= this.life[i]!) { this.alive[i] = 0; continue; }
      this.vy[i]! += c.grav * dt;
      this.x[i]! += (this.vx[i]! + c.wind) * dt; this.y[i]! += this.vy[i]! * dt;
    }
  }

  private paint(g: Ctx): void {
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      const k = KINDS[this.kind[i]!]!, c = PROFILE[k], f = this.age[i]! / this.life[i]!;
      const r = c.r0 + (c.r1 - c.r0) * f;
      g.globalAlpha = c.a * (1 - f);
      g.fillStyle = k === 'dust' || k === 'buildDust' ? P.sand : k === 'mote' ? P.starGold : i % 2 ? P.spark : P.ember;
      g.beginPath(); g.arc(this.x[i]!, this.y[i]!, r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }
}
