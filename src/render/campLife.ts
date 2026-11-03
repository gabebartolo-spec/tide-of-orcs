import { BUILDINGS, BuildingId } from '../data/camp';
import { CAMP_LIFE } from '../data/presentation';
import { P } from './palette';

/** Camp idle life (TB-188f, docs/plans/elf-encampment.md §1): forge smoke and sparks, kitchen smoke, dust from the training
 *  ring and a swaying pennant on the bowyer, drawn over the Camp scene. One fixed pool of particles in typed arrays, no
 *  allocation per frame. It only advances when CampScene draws, and main.ts draws the scene only while the Camp tab is shown,
 *  so it stops with the tab. Reads levels; never touches sim state. */

type Ctx = CanvasRenderingContext2D;
type Kind = 'smoke' | 'sparks' | 'dust';
const KINDS: readonly Kind[] = ['smoke', 'sparks', 'dust'];
/** A long pause (tab hidden, window in the background) restarts the clock instead of replaying the gap. */
const MAX_DT = 0.1;

const rnd = (r: readonly [number, number]): number => r[0] + Math.random() * (r[1] - r[0]);

export class CampLife {
  private readonly n = CAMP_LIFE.cap;
  private x = new Float32Array(this.n); private y = new Float32Array(this.n);
  private vx = new Float32Array(this.n); private vy = new Float32Array(this.n);
  private age = new Float32Array(this.n); private life = new Float32Array(this.n);
  private kind = new Uint8Array(this.n); private alive = new Uint8Array(this.n);
  /** Spawn accumulator (smoke, sparks) or countdown to the next burst (dust), per building and emitter. */
  private acc = new Map<number, number>();
  private last = -1;

  /** Advance to time `t` (s) and draw. `g` is in scene units. */
  draw(g: Ctx, levels: Partial<Record<BuildingId, number>>, t: number): void {
    const dt = this.last < 0 ? 0 : Math.min(MAX_DT, Math.max(0, t - this.last));
    this.last = t;
    for (let bi = 0; bi < BUILDINGS.length; bi++) {
      const b = BUILDINGS[bi]!, lv = Math.min(3, levels[b.id] ?? 0);
      if (lv <= 0) continue;
      const list = CAMP_LIFE.emit[b.id][lv - 1]!;
      for (let i = 0; i < list.length; i++) {
        const e = list[i]!;
        if (e.k === 'pennant') { pennant(g, e.x, e.y, t); continue; }
        if (dt > 0) this.emit(bi * 100 + lv * 10 + i, e.k, e.x, e.y, dt);
      }
    }
    this.step(dt);
    this.paint(g);
  }

  private emit(key: number, k: Kind, x: number, y: number, dt: number): void {
    let a = this.acc.get(key) ?? 0;
    if (k === 'dust') {
      a -= dt;
      if (a <= 0) { for (let i = 0; i < CAMP_LIFE.dust.burst; i++) this.spawn(k, x, y); a = rnd(CAMP_LIFE.dust.every); }
    } else {
      a += dt * CAMP_LIFE[k].rate;
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
      // smoke fades in then out; sparks and dust fade out
      g.globalAlpha = c.a * (k === 'smoke' ? Math.min(1, f * 4) * (1 - f) : 1 - f);
      g.fillStyle = k === 'smoke' ? P.creamDim : k === 'dust' ? P.sand : i % 2 ? P.spark : P.ember;
      g.beginPath(); g.arc(this.x[i]!, this.y[i]!, r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }
}

/** A pennant on a short pole planted at (x, y), its tip swaying on two slow waves. */
function pennant(g: Ctx, x: number, y: number, t: number): void {
  const p = CAMP_LIFE.pennant, top = y - p.pole, tau = Math.PI * 2;
  const sway = p.amp * Math.sin(t * p.freq * tau) + p.amp2 * Math.sin(t * p.freq2 * tau);
  g.strokeStyle = P.bark; g.lineWidth = 1; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, top); g.stroke();
  g.fillStyle = P.elfCloak;
  g.beginPath(); g.moveTo(x, top); g.quadraticCurveTo(x + p.len / 2, top + sway * 0.4, x + p.len, top + p.w / 2 + sway); g.lineTo(x, top + p.w); g.closePath(); g.fill();
  g.fillStyle = P.starGold; g.beginPath(); g.arc(x, top, 0.8, 0, tau); g.fill();
}
