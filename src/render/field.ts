import { FIELD, VANGUARD, WAVE_LEN } from '../data/balance';
import { SimEvent } from '../sim/events';
import { Orc, SimState, Vanguard } from '../sim/state';
import { barFrac } from '../sim/barricade';
import { P } from './palette';
import { FLAME, Particles } from './particles';
import { fmt } from '../ui/format';

const W = FIELD.w, H = FIELD.h, BAR_X = FIELD.barX, BAR_W = FIELD.barW, ELF_X = FIELD.elfX;

export class FieldRenderer {
  private g: CanvasRenderingContext2D;
  private fx = new Particles();
  private shake = 0;
  private storms: { pts: [number, number][]; life: number }[] = [];
  reducedMotion = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
  }

  /** Turn sim events into particles, text and shake. */
  consume(events: SimEvent[], s: SimState): void {
    for (const e of events) {
      switch (e.t) {
        case 'kill': this.fx.burst(e.x, e.y, P.orc, 10, 90); this.fx.text(e.x, e.y - 14, '+' + fmt(e.loot), P.amber); break;
        case 'hit': this.fx.burst(e.x, e.y, P.cream, 2, 60); if (e.crit) this.fx.text(e.x, e.y - 22, 'crit', P.cream); break;
        case 'bite': this.fx.burst(e.x, e.y, P.cream, 3, 50); break;
        case 'hawkDive': this.fx.burst(e.x, e.y, P.cream, 14, 120); break;
        case 'treantStamp': this.fx.burst(e.x, e.y, P.sage, 16, 140); this.shake = Math.min(1, this.shake + 0.2); break;
        case 'storm': this.storms.push({ pts: e.pts, life: 0.35 }); break;
        case 'barricadeHit': this.fx.burst(BAR_X + BAR_W, e.y, P.timber, 3, 60); this.shake = Math.min(1, this.shake + (e.amount / s.stats.barMax) * 4); break;
        case 'barricadeRegrow': this.fx.burst(BAR_X, H / 2, P.grove, 40, 160); break;
        case 'vanguardRallied': this.fx.burst(e.x + 20, e.y, P.cream, 8, 60); break;
        case 'vanguardFell': this.fx.burst(e.x, e.y, P.spear, 14, 100); break;
        default: break;
      }
    }
  }

  draw(s: SimState, dt: number, aim: { x: number; y: number } | null = null): void {
    const g = this.g;
    this.fx.update(dt);
    for (let i = this.storms.length - 1; i >= 0; i--) { this.storms[i]!.life -= dt; if (this.storms[i]!.life <= 0) this.storms.splice(i, 1); }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);
    const sx = this.canvas.width / W, sy = this.canvas.height / H;
    const sh = this.reducedMotion ? 0 : this.shake;
    const shx = sh ? (Math.random() - 0.5) * 6 * sh : 0, shy = sh ? (Math.random() - 0.5) * 4 * sh : 0;
    g.setTransform(sx, 0, 0, sy, shx * sx, shy * sy);

    // plain
    g.fillStyle = P.plain; g.fillRect(-10, -10, W + 20, H + 20);
    g.fillStyle = P.plainPatch; for (let i = 0; i < 40; i++) { const x = (i * 97 + 31) % W, y = (i * 61 + 17) % H; g.fillRect(x, y, 26, 14); }
    g.strokeStyle = P.grass; g.lineWidth = 1;
    for (let i = 0; i < 60; i++) { const x = (i * 143 + 11) % W, y = (i * 83 + 7) % H; if (x < BAR_X + 20) continue; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + 2, y - 3); g.moveTo(x + 4, y + 4); g.lineTo(x + 6, y - 2); g.stroke(); }
    g.fillStyle = P.groveSide; g.fillRect(-10, -10, BAR_X + 10, H + 20);

    // barricade
    const frac = barFrac(s);
    g.fillStyle = P.wallShade; g.fillRect(BAR_X + 4, 0, BAR_W + 4, H);
    for (let y = 0; y < H; y += 18) {
      const alive = y / H < frac || Math.random() < frac;
      g.fillStyle = alive ? (y % 36 ? P.timber : P.timberDark) : P.timberSplinter;
      g.fillRect(BAR_X, y, BAR_W, 16);
      g.fillStyle = P.timberBand; g.fillRect(BAR_X + 2, y - 2, BAR_W - 4, 3);
    }
    g.fillStyle = P.sand; g.fillRect(BAR_X - 3, 0, 3, H);
    if (s.stats.spikes) { g.fillStyle = P.cream; for (let y = 8; y < H; y += 24) { g.beginPath(); g.moveTo(BAR_X + BAR_W, y); g.lineTo(BAR_X + BAR_W + 9, y + 4); g.lineTo(BAR_X + BAR_W, y + 8); g.closePath(); g.fill(); } }

    if (s.stats.treant) { g.fillStyle = P.treantTrunk; g.fillRect(BAR_X + 40, H / 2 + 10, 14, 34); g.fillStyle = P.treantLeaf; g.beginPath(); g.arc(BAR_X + 47, H / 2 + 2, 22, 0, 6.28); g.fill(); g.fillStyle = P.treantLeaf2; g.beginPath(); g.arc(BAR_X + 40, H / 2 - 6, 14, 0, 6.28); g.fill(); }

    this.elf(ELF_X, H / 2, false);
    if (aim && aim.x > BAR_X + BAR_W && !s.run.fallen) this.reticle(aim.x, aim.y);
    if (s.stats.archers >= 1) this.elf(ELF_X - 10, H / 2 - 90, true);
    if (s.stats.archers >= 2) this.elf(ELF_X - 10, H / 2 + 90, true);
    if (s.stats.ballista) { g.fillStyle = P.bark; g.fillRect(ELF_X - 10, H / 2 - 48, 30, 10); g.fillStyle = P.cream; g.fillRect(ELF_X + 10, H / 2 - 45, 22, 3); }
    if (s.stats.wolf) { const w = s.wolf; g.save(); g.translate(w.x, w.y); g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, 8, 12, 4, 0, 0, 6.28); g.fill(); g.fillStyle = P.wolf; g.beginPath(); g.ellipse(0, 0, 13, 7, 0, 0, 6.28); g.fill(); g.beginPath(); g.arc(11, -4, 5, 0, 6.28); g.fill(); g.restore(); }

    const vans: Vanguard[] = []; s.vans.forEach((v) => vans.push(v)); vans.sort((a, b) => a.y - b.y).forEach((v) => this.van(v));
    const orcs: Orc[] = []; s.orcs.forEach((o) => { if (!o.dead) orcs.push(o); }); orcs.sort((a, b) => a.y - b.y).forEach((o) => { this.orc(o); if (o.burn > 0 && !this.reducedMotion && Math.random() < FLAME.rate * dt) this.fx.flame(o.x, o.y, P.amber); });

    s.shots.forEach((a) => { const l = a.kind === 'bolt' ? 22 : a.kind === 'knife' ? 8 : 14; const n = Math.hypot(a.vx, a.vy); g.strokeStyle = a.kind === 'bolt' ? P.bark : a.kind === 'knife' ? P.knife : P.cream; g.lineWidth = a.kind === 'bolt' ? 3 : 1.5; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - (a.vx / n) * l, a.y - (a.vy / n) * l); g.stroke(); });
    for (const st of this.storms) { g.globalAlpha = st.life / 0.35; g.strokeStyle = P.lilac; g.lineWidth = 2; g.beginPath(); st.pts.forEach((p, i) => (i ? g.lineTo(p[0] + (Math.random() - 0.5) * 6, p[1] + (Math.random() - 0.5) * 6) : g.moveTo(p[0], p[1]))); g.stroke(); g.globalAlpha = 1; }
    if (s.stats.hawk) { const h = s.hawk; g.save(); g.translate(h.x, h.y); g.fillStyle = P.bark; g.beginPath(); g.moveTo(-12, 0); g.lineTo(0, -3); g.lineTo(12, 0); g.lineTo(0, 3); g.closePath(); g.fill(); g.restore(); }

    this.fx.draw(g);

    // HUD overlays (no shake)
    g.setTransform(sx, 0, 0, sy, 0, 0);
    g.fillStyle = P.dim; g.fillRect(12, 10, 150, 10);
    g.fillStyle = frac > 0.5 ? P.wallBar : frac > 0.25 ? P.amber : P.rose; g.fillRect(12, 10, 150 * frac, 10);
    g.fillStyle = P.cream; g.font = '10px "Atkinson Hyperlegible", sans-serif'; g.textAlign = 'left';
    g.fillText(`BARRICADE ${fmt(Math.max(0, s.run.barHp))} / ${fmt(s.stats.barMax)}`, 12, 32);
    if (s.stats.muster) g.fillText(`VANGUARD ${s.vans.count} / ${s.stats.vanCap}`, 12, 46);
    g.fillStyle = P.dim45; g.fillRect(0, H - 5, W, 5); g.fillStyle = P.amber; g.fillRect(0, H - 5, W * (s.run.waveT / WAVE_LEN), 5);
  }

  private reticle(x: number, y: number): void {
    const g = this.g;
    g.strokeStyle = P.aimLine; g.lineWidth = 1; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(ELF_X + 16, H / 2); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
    g.strokeStyle = P.cream; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 9, 0, 6.28); g.stroke();
    g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x - 5, y); g.moveTo(x + 5, y); g.lineTo(x + 14, y); g.moveTo(x, y - 14); g.lineTo(x, y - 5); g.moveTo(x, y + 5); g.lineTo(x, y + 14); g.stroke();
  }

  private orc(o: Orc): void {
    const g = this.g; g.save(); g.translate(o.x, o.y);
    const bob = this.reducedMotion ? 0 : Math.sin(o.wob) * 1.5;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, o.r * 0.9, o.r * 0.9, o.r * 0.35, 0, 0, 6.28); g.fill();
    g.fillStyle = o.hitT > 0 ? P.cream : o.kind === 'boss' ? P.boss : o.kind === 'brute' ? P.brute : P.orc;
    g.beginPath(); g.ellipse(0, bob, o.r, o.r * 1.05, 0, 0, 6.28); g.fill();
    g.fillStyle = P.tusk; g.fillRect(-o.r * 0.55, bob - o.r * 0.15, o.r * 0.32, o.r * 0.22); g.fillRect(o.r * 0.2, bob - o.r * 0.15, o.r * 0.32, o.r * 0.22);
    g.fillStyle = P.cream; g.fillRect(-o.r * 0.42, bob + o.r * 0.3, o.r * 0.14, o.r * 0.3); g.fillRect(o.r * 0.28, bob + o.r * 0.3, o.r * 0.14, o.r * 0.3);
    if (o.kind === 'boss') { g.fillStyle = P.amber; g.beginPath(); g.moveTo(-o.r * 0.8, -o.r * 0.7); g.lineTo(-o.r * 0.4, -o.r * 1.4); g.lineTo(0, -o.r * 0.8); g.lineTo(o.r * 0.4, -o.r * 1.4); g.lineTo(o.r * 0.8, -o.r * 0.7); g.closePath(); g.fill(); }
    if (o.burn > 0) { g.fillStyle = P.burnGlow; g.beginPath(); g.arc(0, bob - 4, o.r * 0.7, 0, 6.28); g.fill(); }
    if (o.hp < o.maxhp) { g.fillStyle = P.dim; g.fillRect(-o.r, -o.r - 8, o.r * 2, 3); g.fillStyle = P.rose; g.fillRect(-o.r, -o.r - 8, o.r * 2 * Math.max(0, o.hp / o.maxhp), 3); }
    g.restore();
  }

  private elf(x: number, y: number, dim: boolean): void {
    const g = this.g; g.save(); g.translate(x, y); if (dim) g.globalAlpha = 0.85;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, 16, 12, 4, 0, 0, 6.28); g.fill();
    g.fillStyle = dim ? P.archerCloak : P.elfCloak; g.beginPath(); g.moveTo(-9, 14); g.lineTo(9, 14); g.lineTo(5, -6); g.lineTo(-5, -6); g.closePath(); g.fill();
    g.fillStyle = P.lilac; g.beginPath(); g.arc(0, -12, 7, 0, 6.28); g.fill();
    g.strokeStyle = P.cream; g.lineWidth = 2; g.beginPath(); g.arc(12, 0, 16, -1.3, 1.3); g.stroke();
    g.beginPath(); g.moveTo(16, -15); g.lineTo(16, 15); g.lineWidth = 1; g.stroke();
    g.restore();
  }

  private van(v: Vanguard): void {
    const g = this.g, T = VANGUARD[v.type]; g.save(); g.translate(v.x, v.y);
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, 16, 12, 4, 0, 0, 6.28); g.fill();
    g.fillStyle = v.hitT > 0 ? P.cream : v.type === 'spear' ? P.spear : P.blade; g.beginPath(); g.moveTo(-9, 14); g.lineTo(9, 14); g.lineTo(6, -6); g.lineTo(-6, -6); g.closePath(); g.fill();
    g.fillStyle = P.lilac; g.beginPath(); g.arc(0, -12, 7, 0, 6.28); g.fill();
    g.strokeStyle = P.cream; g.lineWidth = 2; g.beginPath();
    if (T.cleave) { g.moveTo(8, -4); g.lineTo(26, -14); g.moveTo(8, 4); g.lineTo(26, 14); } else { g.moveTo(6, 8); g.lineTo(30, -8); }
    g.stroke();
    if (v.type === 'spear') { g.fillStyle = P.timber; g.beginPath(); g.arc(-10, 2, 7, 0, 6.28); g.fill(); }
    if (v.hp < v.maxhp) { g.fillStyle = P.dim; g.fillRect(-12, -26, 24, 3); g.fillStyle = P.spear; g.fillRect(-12, -26, 24 * Math.max(0, v.hp / v.maxhp), 3); }
    g.restore();
  }
}
