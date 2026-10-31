import { BARRICADE, FIELD, LOB, VANGUARD, WAVE_LEN } from '../data/balance';
import { ORC_TYPES, OrcKind } from '../data/orcs';
import { SimEvent } from '../sim/events';
import { Orc, Projectile, SimState, Vanguard } from '../sim/state';
import { barFrac } from '../sim/barricade';
import { engagedVanguard } from '../sim/vanguard';
import { P } from './palette';
import { FLAME, Particles } from './particles';
import { fmt } from '../ui/format';
import { STR } from '../data/strings';
import { Ceremony } from './ceremony';
import { Sprites } from './sprites';
import { SKY, VFX, dusk } from '../data/presentation';

const IMPACT_LIFE = VFX.impactLife;
/** Foot offset below an actor's centre, where its blood lands. */
const footOf = (r: number): number => r * 0.9;
const byY = (a: { y: number }, b: { y: number }): number => a.y - b.y;
/** Radius the elf and vanguard sprites are sized against (their vector bodies span ~12 units). */
const ACTOR_R = 12;
const W = FIELD.w, H = FIELD.h, BAR_X = FIELD.barX, BAR_W = FIELD.barW, ELF_X = FIELD.elfX;

export class FieldRenderer {
  private g: CanvasRenderingContext2D;
  private fx = new Particles();
  private shake = 0;
  private storms: { pts: [number, number][]; life: number }[] = [];
  private impacts: { x: number; y: number; r: number; life: number }[] = [];
  reducedMotion = false;
  readonly ceremony = new Ceremony();
  readonly sprites = new Sprites();
  /** Animation clock for sprite frames. */
  private clock = 0;
  /** Reused draw-order buffers and wind-up scratch (no per-frame allocation). */
  private vanBuf: Vanguard[] = [];
  private orcBuf: Orc[] = [];
  private wind = { dx: 0, dy: 0 };
  private sim: SimState | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
  }

  /** Turn sim events into particles, strokes, blood, text and shake. */
  consume(events: SimEvent[], s: SimState): void {
    const fx = this.fx, B = VFX.blood;
    for (const e of events) {
      switch (e.t) {
        case 'kill': {
          const r = ORC_TYPES[e.kind as OrcKind]?.radius ?? ACTOR_R;
          fx.burst(e.x, e.y, P.orc, VFX.kill[0], VFX.kill[1]); fx.blood(e.x, e.y, footOf(r), P.bloodOrc, B.kill, 0); fx.splat(e.x, e.y + footOf(r), r * B.killSplat, P.bloodOrc);
          fx.text(e.x, e.y - 14, '+' + fmt(e.loot), P.amber); break;
        }
        case 'hit': fx.burst(e.x, e.y, P.cream, VFX.hit[0], VFX.hit[1]); fx.blood(e.x, e.y, footOf(ACTOR_R), P.bloodOrc, B.hit, e.src === 'lob' ? 0 : 1); if (e.crit) fx.text(e.x, e.y - 22, 'crit', P.cream); break;
        case 'bleed': fx.blood(e.x, e.y, footOf(e.r), P.bloodOrc, B.hit, 1); break;
        case 'bite': fx.burst(e.x, e.y, P.cream, VFX.bite[0], VFX.bite[1]); fx.blood(e.x, e.y, footOf(ACTOR_R), P.bloodOrc, B.hit, 0); break;
        case 'hawkDive': fx.burst(e.x, e.y, P.cream, VFX.hawk[0], VFX.hawk[1]); fx.blood(e.x, e.y, footOf(ACTOR_R), P.bloodOrc, B.kill, 0); break;
        case 'treantStamp': fx.burst(e.x, e.y, P.sage, VFX.treant[0], VFX.treant[1]); fx.blood(e.x + 30, e.y - 20, footOf(ACTOR_R), P.bloodOrc, B.hit, 1); this.shake = Math.min(1, this.shake + VFX.treantShake); break;
        case 'storm': this.storms.push({ pts: e.pts, life: VFX.stormLife }); for (let i = 1; i < e.pts.length; i++) fx.blood(e.pts[i]![0], e.pts[i]![1], footOf(ACTOR_R), P.bloodOrc, B.hit, 0); break;
        case 'burnSpread': fx.burst(e.tx, e.ty, P.amber, VFX.hit[0], VFX.hit[1]); break;
        case 'pinned': fx.burst(e.x, e.y, P.cream, VFX.hit[0], VFX.hit[1]); fx.text(e.x, e.y - 22, STR.pinned, P.cream); break;
        case 'freeRally': fx.burst(BAR_X, H / 2, P.grove, VFX.regrow[0], VFX.regrow[1]); fx.text(BAR_X + 60, H / 2 - 40, STR.freeRally, P.grove); break;
        case 'thunder': fx.burst(W / 2, H / 2, P.cream, VFX.regrow[0], VFX.regrow[1]); fx.text(W / 2, H / 2 - 40, STR.thunder, P.cream); break;
        case 'starfall': fx.burst(e.x, e.y, P.starfall, VFX.hit[0], VFX.hit[1]); break;
        case 'stake': fx.burst(e.x, e.y, P.stake, VFX.hit[0], VFX.hit[1]); break;
        case 'splinter': fx.burst(BAR_X, H / 2, P.grove, VFX.regrow[0], VFX.regrow[1]); fx.text(BAR_X + 60, H / 2 - 40, STR.splinter, P.grove); break;
        case 'impact': this.impacts.push({ x: e.x, y: e.y, r: e.r, life: IMPACT_LIFE }); fx.burst(e.x, e.y, P.cream, VFX.impact[0], VFX.impact[1]); fx.ring(e.x, e.y, e.r * VFX.lobDust.r, P.sand, 2, VFX.lobDust.life); break;
        case 'orcSwing': this.orcSwing(e.kind, e.x, e.y, e.tx, e.ty, e.r); break;
        case 'vanStrike': this.vanStrike(e.type, e.x, e.y, e.tx, e.ty); break;
        case 'barricadeHit': this.shake = Math.min(1, this.shake + (e.amount / s.stats.barMax) * 4); break;
        case 'barricadeRegrow': fx.burst(BAR_X, H / 2, P.grove, VFX.regrow[0], VFX.regrow[1]); break;
        case 'vanguardRallied': fx.burst(e.x + 20, e.y, P.cream, VFX.rally[0], VFX.rally[1]); break;
        case 'vanguardHit': fx.blood(e.x, e.y, footOf(ACTOR_R) + 4, P.bloodElf, B.vanHit, -1); break;
        case 'vanguardFell': fx.burst(e.x, e.y, P.spear, VFX.vanFell[0], VFX.vanFell[1]); fx.blood(e.x, e.y, footOf(ACTOR_R) + 4, P.bloodElf, B.vanFell, 0); fx.splat(e.x, e.y + 16, B.vanSplat, P.bloodElf); break;
        case 'replant': this.ceremony.start(this.reducedMotion); break;
        default: break;
      }
    }
  }

  /** An orc's blow lands: crescent swipe (an X for elites, a ground slam for the boss); on the wall, timber and cream chips. Vanguard blood comes from vanguardHit. */
  private orcSwing(kind: string, x: number, y: number, tx: number, ty: number, r: number): void {
    const fx = this.fx, S = VFX.orcSwipe, Wh = VFX.wallHit, ang = Math.atan2(ty - y, tx - x), wall = tx === BAR_X + BAR_W;
    if (kind === 'boss') fx.ring(x - r * 0.6, y + footOf(r), r * S.slam, P.cream, S.widthBrute, S.slamLife);
    else {
      const rr = r * S.r * (kind === 'runner' ? S.runner : 1), w = kind === 'brute' ? S.widthBrute : S.width, elite = kind === 'elite';
      fx.arc(x, y, rr, ang, S.half, P.cream, P.cream, w, S.life);
      if (elite) fx.arc(x, y, rr * S.elite, ang, S.half, P.cream, P.cream, w, S.life);
    }
    if (!wall) return;
    const chips = kind === 'boss' ? Wh.chipsBoss : kind === 'brute' ? Wh.chipsBrute : Wh.chips;
    fx.burst(tx, ty, P.timber, chips, Wh.speed, Wh.chipAng, Wh.chipSpread); fx.burst(tx, ty, P.cream, Wh.cream, Wh.speed, Wh.chipAng, Wh.chipSpread);
    if (!this.reducedMotion) this.shake = Math.min(1, this.shake + (kind === 'boss' ? Wh.shakeBoss : kind === 'brute' ? Wh.shakeBrute : 0));
  }

  /** A vanguard's blow connects: a spear thrust streak, or two bladedancer slashes. */
  private vanStrike(type: string, x: number, y: number, tx: number, ty: number): void {
    const ang = Math.atan2(ty - y, tx - x), cx = Math.cos(ang), cy = Math.sin(ang);
    if (type === 'spear') { const Sp = VFX.spear, reach = VANGUARD.spear.reach + 10; this.fx.line(x + cx * 10, y + cy * 10, x + cx * reach, y + cy * reach, P.cream, Sp.width, Sp.life); return; }
    const Bl = VFX.blade;
    this.fx.arc(x, y - 4, Bl.r, ang - 0.25, Bl.half, P.blade, P.cream, Bl.width, Bl.life);
    this.fx.arc(x, y + 4, Bl.r, ang + 0.25, Bl.half, P.blade, P.cream, Bl.width, Bl.life);
  }

  draw(s: SimState, dt: number, aim: { x: number; y: number } | null = null): void {
    const g = this.g; this.sim = s;
    this.fx.update(dt); this.clock += dt;
    for (let i = this.storms.length - 1; i >= 0; i--) { this.storms[i]!.life -= dt; if (this.storms[i]!.life <= 0) this.storms.splice(i, 1); }
    for (let i = this.impacts.length - 1; i >= 0; i--) { this.impacts[i]!.life -= dt; if (this.impacts[i]!.life <= 0) this.impacts.splice(i, 1); }
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
    const n = dusk(this.clock);
    g.globalAlpha = SKY.duskAlpha * n; g.fillStyle = P.plainDusk; g.fillRect(BAR_X, -10, W - BAR_X + 10, H + 20); g.globalAlpha = 1;
    this.hills();
    g.fillStyle = P.groveSide; g.fillRect(-10, -10, BAR_X + 10, H + 20);
    if (n > 0.01) { const lg = g.createRadialGradient(ELF_X, H / 2, 0, ELF_X, H / 2, SKY.lampR); lg.addColorStop(0, P.lamp); lg.addColorStop(1, P.lampClear); g.globalAlpha = n; g.fillStyle = lg; g.fillRect(ELF_X - SKY.lampR, H / 2 - SKY.lampR, SKY.lampR * 2, SKY.lampR * 2); g.globalAlpha = 1; }

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

    this.fx.drawGround(g);
    s.zones.forEach((z) => {
      if (z.kind === 'stake') { g.strokeStyle = P.stake; g.lineWidth = 4; g.beginPath(); g.moveTo(z.x, z.y + z.r); g.lineTo(z.x + 3, z.y - z.r * 1.6); g.stroke(); return; }
      const cin = z.kind === 'cinder';
      g.globalAlpha = Math.min(1, z.life / VFX.zoneFade); g.fillStyle = cin ? P.cinder : P.moonwell; g.strokeStyle = cin ? P.cinderEdge : P.moonwellEdge; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * VFX.zoneSquash, 0, 0, 6.28); g.fill(); g.stroke(); g.globalAlpha = 1;
    });

    if (s.stats.treant) { g.fillStyle = P.treantTrunk; g.fillRect(BAR_X + 40, H / 2 + 10, 14, 34); g.fillStyle = P.treantLeaf; g.beginPath(); g.arc(BAR_X + 47, H / 2 + 2, 22, 0, 6.28); g.fill(); g.fillStyle = P.treantLeaf2; g.beginPath(); g.arc(BAR_X + 40, H / 2 - 6, 14, 0, 6.28); g.fill(); }

    const drawn = Math.min(1, (s.run.shotT[0] ?? 0) / s.stats.lobCd), aiming = aim !== null && aim.x > BAR_X + BAR_W && !s.run.fallen;
    this.elf(ELF_X, H / 2, false, aiming && !this.reducedMotion ? drawn * VFX.bow.pull : 0);
    if (aim && aiming) this.reticle(aim.x, aim.y, s.stats.radius, drawn);
    if (s.stats.archers >= 1) this.elf(ELF_X - 10, H / 2 - 90, true);
    if (s.stats.archers >= 2) this.elf(ELF_X - 10, H / 2 + 90, true);
    if (s.stats.ballista) { g.fillStyle = P.bark; g.fillRect(ELF_X - 10, H / 2 - 48, 30, 10); g.fillStyle = P.cream; g.fillRect(ELF_X + 10, H / 2 - 45, 22, 3); }
    if (s.stats.wolf) { this.wolf(s.wolf); for (let i = 0; i < s.stats.extraWolves && i < s.pack.length; i++) this.wolf(s.pack[i]!); }

    const vans = this.vanBuf, orcs = this.orcBuf; vans.length = 0; orcs.length = 0;
    s.vans.forEach((v) => { vans.push(v); }); vans.sort(byY); for (const v of vans) this.van(v);
    s.orcs.forEach((o) => { if (!o.dead) orcs.push(o); }); orcs.sort(byY);
    for (const o of orcs) { this.orc(o); if (o.burn > 0 && !this.reducedMotion && Math.random() < FLAME.rate * dt) this.fx.flame(o.x, o.y, P.amber); }

    s.shots.forEach((a) => {
      if (a.kind === 'lob') { this.lob(a); return; }
      const l = a.kind === 'bolt' ? 22 : a.kind === 'knife' ? 8 : 14, n = Math.hypot(a.vx, a.vy) || 1, ux = a.vx / n, uy = a.vy / n;
      g.strokeStyle = a.kind === 'bolt' ? P.bark : a.kind === 'knife' ? P.knife : P.cream; g.lineWidth = a.kind === 'bolt' ? 3 : 1.5;
      if (!this.reducedMotion) {
        const T = VFX.trail, ghosts = T[a.kind], step = n * T.gap;
        for (let i = 1; i <= ghosts; i++) { const bx = a.x - ux * step * i, by = a.y - uy * step * i; g.globalAlpha = T.alpha * (1 - (i - 1) / ghosts); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - ux * l, by - uy * l); g.stroke(); }
        g.globalAlpha = 1;
      }
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - ux * l, a.y - uy * l); g.stroke();
    });
    for (const im of this.impacts) { const k = im.life / IMPACT_LIFE; g.globalAlpha = k; g.strokeStyle = P.cream; g.lineWidth = 2; g.beginPath(); g.arc(im.x, im.y, im.r * (1.15 - 0.15 * k), 0, 6.28); g.stroke(); g.globalAlpha = 1; }
    for (const st of this.storms) { g.globalAlpha = st.life / 0.35; g.strokeStyle = P.lilac; g.lineWidth = 2; g.beginPath(); st.pts.forEach((p, i) => (i ? g.lineTo(p[0] + (Math.random() - 0.5) * 6, p[1] + (Math.random() - 0.5) * 6) : g.moveTo(p[0], p[1]))); g.stroke(); g.globalAlpha = 1; }
    if (s.stats.hawk) { const h = s.hawk; g.save(); g.translate(h.x, h.y); g.fillStyle = P.bark; g.beginPath(); g.moveTo(-12, 0); g.lineTo(0, -3); g.lineTo(12, 0); g.lineTo(0, 3); g.closePath(); g.fill(); g.restore(); }

    this.fx.draw(g);

    // HUD overlays (no shake)
    g.setTransform(sx, 0, 0, sy, 0, 0);
    g.fillStyle = P.dim; g.fillRect(12, 10, 150, 10);
    g.fillStyle = frac > 0.5 ? P.wallBar : frac > 0.25 ? P.amber : P.rose; g.fillRect(12, 10, 150 * frac, 10);
    g.fillStyle = P.cream; g.font = '10px "Atkinson Hyperlegible", sans-serif'; g.textAlign = 'left';
    g.fillText(STR.barricadeHud(fmt(Math.max(0, s.run.barHp)), fmt(s.stats.barMax)), 12, 32);
    if (s.stats.muster) g.fillText(STR.vanguardHud(s.vans.count, s.stats.vanCap), 12, 46);
    g.fillStyle = P.dim45; g.fillRect(0, H - 5, W, 5); g.fillStyle = P.amber; g.fillRect(0, H - 5, W * (s.run.waveT / WAVE_LEN), 5);
    this.ceremony.draw(g, dt);
  }

  /** Two bands of distant hills along the far edge, drifting slowly (still under reduced motion). */
  private hills(): void {
    const g = this.g;
    SKY.hills.forEach((b, i) => {
      const off = this.reducedMotion ? 0 : (this.clock * b.speed) % b.w;
      g.fillStyle = i ? P.hillNear : P.hillFar; g.beginPath(); g.moveTo(BAR_X, b.y);
      for (let k = 0, x = BAR_X - off; x <= W + b.w; k++, x += b.w / 2) g.quadraticCurveTo(x + b.w / 4, b.y + (k % 2 ? b.h * 0.6 : b.h), x + b.w / 2, b.y + b.h * 0.3);
      g.lineTo(W + 10, b.y + b.h * 0.3); g.lineTo(W + 10, -10); g.lineTo(BAR_X, -10); g.closePath(); g.fill();
    });
  }

  /** Aim circle: dotted flight arc from the elf, the strike circle, and a ring that fills as the bow draws. */
  private reticle(x: number, y: number, r: number, ready: number): void {
    const g = this.g, sx = ELF_X, sy = H / 2;
    g.strokeStyle = P.aimLine; g.lineWidth = 1; g.setLineDash([4, 6]); g.beginPath();
    for (let i = 0; i <= 16; i++) { const u = i / 16; const px = sx + (x - sx) * u, py = sy + (y - sy) * u - LOB.arc * 4 * u * (1 - u); if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke(); g.setLineDash([]);
    g.fillStyle = P.aimFill; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill();
    g.strokeStyle = P.aimLine; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.stroke();
    g.strokeStyle = P.cream; g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + ready * 6.28); g.stroke();
  }

  /** An arcing arrow: shadow on the ground, shaft in the air pointing along its flight. */
  private lob(a: Projectile): void {
    const g = this.g, u = Math.min(1, a.t / LOB.flight);
    if (u >= 1) return;
    const dx = a.tx - a.sx, dy = a.ty - a.sy - LOB.arc * 4 * (1 - 2 * u), n = Math.hypot(dx, dy) || 1, ay = a.y - a.h;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(a.x, a.y, 4, 1.5, 0, 0, 6.28); g.fill();
    g.strokeStyle = P.cream; g.lineWidth = 1.5;
    if (!this.reducedMotion) {
      const T = VFX.trail;
      for (let i = 1; i <= T.lob; i++) {
        const v = Math.max(0, (a.t - T.gap * T.lobSpacing * i) / LOB.flight), gx = a.sx + (a.tx - a.sx) * v, gy = a.sy + (a.ty - a.sy) * v - LOB.arc * 4 * v * (1 - v);
        g.globalAlpha = T.alpha * (1 - (i - 1) / T.lob); g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx - (dx / n) * 14, gy - (dy / n) * 14); g.stroke();
      }
      g.globalAlpha = 1;
    } g.beginPath(); g.moveTo(a.x, ay); g.lineTo(a.x - (dx / n) * 14, ay - (dy / n) * 14); g.stroke();
  }

  private orc(o: Orc): void {
    const g = this.g, wind = this.windUp(o); g.save(); g.translate(o.x + wind.dx, o.y);
    const bob = (this.reducedMotion ? 0 : Math.sin(o.wob) * 1.5) - wind.dy;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, o.r * 0.9, o.r * 0.9, o.r * 0.35, 0, 0, 6.28); g.fill();
    if (this.sprites.draw(g, `orc.${o.kind}`, this.clock + o.wob, 0, o.r * 0.9, o.r, o.hitT > 0)) { this.orcBars(o, 0); g.restore(); return; }
    g.fillStyle = o.hitT > 0 ? P.cream : o.kind === 'boss' ? P.boss : o.kind === 'elite' ? P.elite : o.kind === 'brute' ? P.brute : P.orc;
    g.beginPath(); g.ellipse(0, bob, o.r, o.r * 1.05, 0, 0, 6.28); g.fill();
    g.fillStyle = P.tusk; g.fillRect(-o.r * 0.55, bob - o.r * 0.15, o.r * 0.32, o.r * 0.22); g.fillRect(o.r * 0.2, bob - o.r * 0.15, o.r * 0.32, o.r * 0.22);
    g.fillStyle = P.cream; g.fillRect(-o.r * 0.42, bob + o.r * 0.3, o.r * 0.14, o.r * 0.3); g.fillRect(o.r * 0.28, bob + o.r * 0.3, o.r * 0.14, o.r * 0.3);
    if (o.kind === 'boss') { g.fillStyle = P.amber; g.beginPath(); g.moveTo(-o.r * 0.8, -o.r * 0.7); g.lineTo(-o.r * 0.4, -o.r * 1.4); g.lineTo(0, -o.r * 0.8); g.lineTo(o.r * 0.4, -o.r * 1.4); g.lineTo(o.r * 0.8, -o.r * 0.7); g.closePath(); g.fill(); }
    this.orcBars(o, bob);
    g.restore();
  }

  /** Wind-up: an engaged orc leans away from its target (the boss rises) over the last part of its swing. Zero while walking or under reduced motion. Reads sim, never writes. */
  private windUp(o: Orc): { dx: number; dy: number } {
    const w = this.wind; w.dx = 0; w.dy = 0;
    if (this.reducedMotion || !this.sim) return w;
    if (o.x > BAR_X + BAR_W + o.r + 0.01 && !engagedVanguard(this.sim, o)) return w;
    const Wd = VFX.orcWind, u = (o.swingT / BARRICADE.orcSwing - (1 - Wd.from)) / Wd.from;
    if (u <= 0) return w;
    const k = Math.min(1, u) * o.r;
    if (o.kind === 'boss') w.dy = k * Wd.liftBoss; else w.dx = k * (o.kind === 'brute' ? Wd.leanBrute : Wd.lean);
    return w;
  }

  private wolf(w: { x: number; y: number }): void {
    const g = this.g; g.save(); g.translate(w.x, w.y); g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, 8, 12, 4, 0, 0, 6.28); g.fill(); g.fillStyle = P.wolf; g.beginPath(); g.ellipse(0, 0, 13, 7, 0, 0, 6.28); g.fill(); g.beginPath(); g.arc(11, -4, 5, 0, 6.28); g.fill(); g.restore();
  }

  /** Burn glow, set-bonus marks (bleed, pin, root) and health bar, shared by the vector and sprite orc. */
  private orcBars(o: Orc, bob: number): void {
    const g = this.g;
    if (o.burn > 0) { g.fillStyle = P.burnGlow; g.beginPath(); g.arc(0, bob - 4, o.r * 0.7, 0, 6.28); g.fill(); }
    if (o.bleed > 0) { g.fillStyle = P.rose; g.beginPath(); g.arc(o.r * 0.5, bob - o.r * 0.2, 2.5, 0, 6.28); g.fill(); }
    if (o.root > 0) { g.strokeStyle = P.sage; g.lineWidth = 2; g.beginPath(); g.ellipse(0, o.r * 0.9, o.r, o.r * 0.35, 0, 0, 6.28); g.stroke(); }
    if (o.pin > 0) { g.strokeStyle = P.cream; g.lineWidth = 3; g.beginPath(); g.moveTo(-o.r * 0.6, -o.r); g.lineTo(o.r * 0.3, o.r * 1.1); g.stroke(); }
    if (o.hp < o.maxhp) { g.fillStyle = P.dim; g.fillRect(-o.r, -o.r - 8, o.r * 2, 3); g.fillStyle = P.rose; g.fillRect(-o.r, -o.r - 8, o.r * 2 * Math.max(0, o.hp / o.maxhp), 3); }
  }

  private elf(x: number, y: number, dim: boolean, pull = 0): void {
    const g = this.g; g.save(); g.translate(x, y); if (dim) g.globalAlpha = 0.85;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, 16, 12, 4, 0, 0, 6.28); g.fill();
    if (this.sprites.draw(g, dim ? 'archer' : 'elf', this.clock, 0, 16, ACTOR_R)) { g.restore(); return; }
    g.fillStyle = dim ? P.archerCloak : P.elfCloak; g.beginPath(); g.moveTo(-9, 14); g.lineTo(9, 14); g.lineTo(5, -6); g.lineTo(-5, -6); g.closePath(); g.fill();
    g.fillStyle = P.lilac; g.beginPath(); g.arc(0, -12, 7, 0, 6.28); g.fill();
    g.strokeStyle = P.cream; g.lineWidth = 2; g.beginPath(); g.arc(12, 0, 16, -1.3, 1.3); g.stroke();
    g.beginPath(); g.moveTo(16, -15); g.lineTo(16 - pull, 0); g.lineTo(16, 15); g.lineWidth = 1; g.stroke();
    g.restore();
  }

  private van(v: Vanguard): void {
    const g = this.g, T = VANGUARD[v.type]; g.save(); g.translate(v.x, v.y);
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, 16, 12, 4, 0, 0, 6.28); g.fill();
    if (this.sprites.draw(g, `van.${v.type}`, this.clock, 0, 16, ACTOR_R, v.hitT > 0)) { this.vanBar(v); g.restore(); return; }
    g.fillStyle = v.hitT > 0 ? P.cream : v.type === 'spear' ? P.spear : P.blade; g.beginPath(); g.moveTo(-9, 14); g.lineTo(9, 14); g.lineTo(6, -6); g.lineTo(-6, -6); g.closePath(); g.fill();
    g.fillStyle = P.lilac; g.beginPath(); g.arc(0, -12, 7, 0, 6.28); g.fill();
    g.strokeStyle = P.cream; g.lineWidth = 2; g.beginPath();
    const u = this.reducedMotion ? 0 : Math.min(1, v.swingT / T.cd);
    if (T.cleave) { const f = u * VFX.blade.fold, sn = Math.sin(f) * 18, c = Math.cos(f); g.moveTo(8, -4); g.lineTo(8 + 18 * c, -14 + sn); g.moveTo(8, 4); g.lineTo(8 + 18 * c, 14 - sn); }
    else { const d = u * VFX.spear.draw; g.moveTo(6 - d, 8 + d * 0.67); g.lineTo(30 - d, -8 + d * 0.67); }
    g.stroke();
    if (v.type === 'spear') { g.fillStyle = P.timber; g.beginPath(); g.arc(-10, 2, 7, 0, 6.28); g.fill(); }
    this.vanBar(v);
    g.restore();
  }

  private vanBar(v: Vanguard): void {
    const g = this.g;
    if (v.hp < v.maxhp) { g.fillStyle = P.dim; g.fillRect(-12, -26, 24, 3); g.fillStyle = P.spear; g.fillRect(-12, -26, 24 * Math.max(0, v.hp / v.maxhp), 3); }
  }
}
