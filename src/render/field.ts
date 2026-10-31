import { ARROWS, BARRICADE, FIELD, LOB, VANGUARD, WAVE_LEN } from '../data/balance';
import { ORC_TYPES, OrcKind } from '../data/orcs';
import { SimEvent } from '../sim/events';
import { Orc, Projectile, SimState, Vanguard } from '../sim/state';
import { barFrac } from '../sim/barricade';
import { engagedVanguard } from '../sim/vanguard';
import { P } from './palette';
import { Particles } from './particles';
import { fmt } from '../ui/format';
import { STR } from '../data/strings';
import { Ceremony } from './ceremony';
import { Sprites } from './sprites';
import { orcState, vanState } from './actorState';
import { Ground } from './ground';
import { LOOT_VFX, SKY, VFX, dusk } from '../data/presentation';
import { SLOTS } from '../data/loot';
import { setTiers } from '../sim/gear';

const IMPACT_LIFE = VFX.impactLife;
/** Foot offset below an actor's centre, where its blood lands. */
const footOf = (r: number): number => r * 0.9;
const byY = (a: { y: number }, b: { y: number }): number => a.y - b.y;
/** Radius the elf and vanguard sprites are sized against (their vector bodies span ~12 units). */
const ACTOR_R = 12;
/** Drop beam and equip glow colour per rarity. */
const RAR_C: Record<string, string> = { common: P.cream, rare: P.spear, epic: P.lilac, legendary: P.starGold, mythic: P.rose };
const W = FIELD.w, H = FIELD.h, BAR_X = FIELD.barX, BAR_W = FIELD.barW, ELF_X = FIELD.elfX;

export class FieldRenderer {
  private g: CanvasRenderingContext2D;
  private fx = new Particles();
  private shake = 0;
  private storms: { pts: [number, number][]; life: number; c: string }[] = [];
  private impacts: { x: number; y: number; r: number; life: number }[] = [];
  /** Fire and frost ground patches left by an enchanted strike (TB-089). */
  private patches: { x: number; y: number; r: number; life: number; c: string; fire: boolean }[] = [];
  /** Colour of the elf's lob this frame: its first enchantment, or '' for plain cream. */
  private tint = '';
  reducedMotion = false;
  readonly ceremony = new Ceremony();
  readonly sprites = new Sprites();
  private ground = new Ground();
  /** Animation clock for sprite frames. */
  private clock = 0;
  /** Reused draw-order buffers and wind-up scratch (no per-frame allocation). */
  private vanBuf: Vanguard[] = [];
  private orcBuf: Orc[] = [];
  private wind = { dx: 0, dy: 0 };
  private sim: SimState | null = null;
  /** Loot moments (TB-105): drop beams, the equip glow on the bow, the set-bonus leaf ring, the mythic screen-edge shimmer and slow-motion clock. */
  private beams: { x: number; y: number; life: number; max: number; c: string; ground: boolean; spiral: boolean }[] = [];
  private glow = { t: 0, c: P.cream as string };
  private leaves = 0; private edge = 0; private slow = 0; private tiers = -1;
  private worn: Partial<Record<string, string>> = {};

  /** Sim speed for the main loop: a mythic drop holds the field still, then runs it at 0.6× (never under reduced motion). */
  get timeScale(): number { const M = LOOT_VFX.mythic; return this.slow <= 0 ? 1 : this.slow > M.slow ? 0 : M.slowScale; }

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
    const fx = this.fx, B = VFX.blood, A = VFX.arrows;
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
        case 'storm': this.storms.push({ pts: e.pts, life: VFX.stormLife, c: P.lilac }); for (let i = 1; i < e.pts.length; i++) fx.blood(e.pts[i]![0], e.pts[i]![1], footOf(ACTOR_R), P.bloodOrc, B.hit, 0); break;
        case 'burnSpread': fx.burst(e.tx, e.ty, P.amber, VFX.hit[0], VFX.hit[1]); break;
        case 'pinned': fx.burst(e.x, e.y, P.cream, VFX.hit[0], VFX.hit[1]); fx.text(e.x, e.y - 22, STR.pinned, P.cream); break;
        case 'freeRally': fx.burst(BAR_X, H / 2, P.grove, VFX.regrow[0], VFX.regrow[1]); fx.text(BAR_X + 60, H / 2 - 40, STR.freeRally, P.grove); break;
        case 'thunder': fx.burst(W / 2, H / 2, P.cream, VFX.regrow[0], VFX.regrow[1]); fx.text(W / 2, H / 2 - 40, STR.thunder, P.cream); break;
        case 'starCloak': fx.burst(e.x, e.y, P.starfall, VFX.hit[0], VFX.hit[1]); break;
        case 'stake': fx.burst(e.x, e.y, P.stake, VFX.hit[0], VFX.hit[1]); break;
        case 'splinter': fx.burst(BAR_X, H / 2, P.grove, VFX.regrow[0], VFX.regrow[1]); fx.text(BAR_X + 60, H / 2 - 40, STR.splinter, P.grove); break;
        case 'impact': this.impacts.push({ x: e.x, y: e.y, r: e.r, life: IMPACT_LIFE }); fx.burst(e.x, e.y, P.cream, VFX.impact[0], VFX.impact[1]); fx.ring(e.x, e.y, e.r * VFX.lobDust.r, P.sand, 2, VFX.lobDust.life); break;
        case 'fireStrike': this.patches.push({ x: e.x, y: e.y, r: e.r, life: A.patchLife, c: P.firePatch, fire: true }); fx.ring(e.x, e.y, e.r, P.fire, 3, A.ringLife); for (let i = 0; i < A.fire[0] * 3; i++) fx.flame(e.x + (Math.random() - 0.5) * e.r * 1.6, e.y + (Math.random() - 0.5) * e.r * 0.8, i % 2 ? P.fire : P.amber); fx.burst(e.x, e.y, P.fire, A.fire[0] * 2, A.fire[1]); break;
        case 'chill': this.patches.push({ x: e.x, y: e.y, r: e.r, life: A.patchLife, c: P.frostPatch, fire: false }); fx.ring(e.x, e.y, e.r, P.frost, 3, A.ringLife); this.shards(e.x, e.y, e.r); fx.burst(e.x, e.y, P.frost, A.frost[0] * 2, A.frost[1]); break;
        case 'stun': fx.burst(e.x, e.y, P.spark, A.stun[0], A.stun[1]); break;
        case 'shatter': fx.ring(e.x, e.y, e.r, P.frost, 3, A.shatterLife); this.shards(e.x, e.y, e.r * 0.8); fx.burst(e.x, e.y, P.frost, A.shatter[0], A.shatter[1]); fx.burst(e.x, e.y, P.cream, A.shatter[0] / 2, A.shatter[1]); break;
        case 'bounceHit': fx.ring(e.x, e.y, A.hopRing, P.arcane, 3, A.ringLife); fx.burst(e.x, e.y, P.arcane, A.bounce[0] * 2, A.bounce[1]); break;
        case 'shock': for (const q of e.pts) { this.storms.push({ pts: [[e.x, e.y], q], life: VFX.stormLife, c: P.spark }); fx.burst(q[0], q[1], P.spark, A.stun[0], A.stun[1]); } break;
        case 'orcSwing': this.orcSwing(e.kind, e.x, e.y, e.tx, e.ty, e.r); break;
        case 'vanStrike': this.vanStrike(e.type, e.x, e.y, e.tx, e.ty); break;
        case 'barricadeHit': this.shake = Math.min(1, this.shake + (e.amount / s.stats.barMax) * 4); break;
        case 'barricadeRegrow': fx.burst(BAR_X, H / 2, P.grove, VFX.regrow[0], VFX.regrow[1]); break;
        case 'vanguardRallied': fx.burst(e.x + 20, e.y, P.cream, VFX.rally[0], VFX.rally[1]); break;
        case 'vanguardHit': fx.blood(e.x, e.y, footOf(ACTOR_R) + 4, P.bloodElf, B.vanHit, -1); break;
        case 'vanguardFell': fx.burst(e.x, e.y, P.spear, VFX.vanFell[0], VFX.vanFell[1]); fx.blood(e.x, e.y, footOf(ACTOR_R) + 4, P.bloodElf, B.vanFell, 0); fx.splat(e.x, e.y + 16, B.vanSplat, P.bloodElf); break;
        case 'replant': this.ceremony.start(this.reducedMotion); break;
        case 'loot': this.lootDrop(e.x, e.y, e.rarity); break;
        default: break;
      }
    }
  }

  /** A drop: common glints; rarer items stand a beam in their colour, epic with a mote spiral, legendary and mythic with a lit ground ring; mythic also holds, slows and shimmers the screen edge. */
  private lootDrop(x: number, y: number, rarity: string): void {
    const L = LOOT_VFX, c = RAR_C[rarity] ?? P.cream;
    if (rarity === 'common') { this.fx.burst(x, y - 6, c, L.glint[0], L.glint[1]); return; }
    const life = L.beam[rarity as keyof typeof L.beam] ?? L.beam.rare, ground = rarity === 'legendary' || rarity === 'mythic';
    this.beams.push({ x, y: y + L.foot, life, max: life, c, ground, spiral: rarity === 'epic' });
    if (this.reducedMotion) return;
    this.fx.burst(x, y, c, L.motes[rarity as keyof typeof L.motes] ?? 0, L.moteSpeed);
    if (ground) this.fx.ring(x, y + L.foot, L.ringR, c, 2, life * 0.5);
    if (rarity === 'mythic') { this.edge = L.mythic.edge; this.slow = L.mythic.hold + L.mythic.slow; }
  }

  /** Watch what is worn: a newly equipped item glows the bow in its colour; a rise in set tiers rings the elf with leaves. Reads sim, never writes. */
  private watchGear(s: SimState): void {
    const l = s.meta.loot, first = this.tiers < 0;
    let changed = false;
    for (const slot of SLOTS) {
      const uid = l.equipped[slot];
      if (uid === this.worn[slot]) continue;
      this.worn[slot] = uid; changed = true;
      const it = uid && !first ? l.items.find((i) => i.uid === uid) : undefined;
      if (it) this.glow = { t: LOOT_VFX.equip, c: RAR_C[it.rarity] ?? P.cream };
    }
    if (!changed && !first) return;
    const t = setTiers(l, s.stats.setBoost);
    if (!first && t > this.tiers) this.leaves = LOOT_VFX.leafLife;
    this.tiers = t;
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
    this.watchGear(s);
    this.glow.t = Math.max(0, this.glow.t - dt); this.leaves = Math.max(0, this.leaves - dt); this.edge = Math.max(0, this.edge - dt); this.slow = Math.max(0, this.slow - dt);
    const sx = this.canvas.width / W, sy = this.canvas.height / H;
    const sh = this.reducedMotion ? 0 : this.shake;
    const shx = sh ? (Math.random() - 0.5) * 6 * sh : 0, shy = sh ? (Math.random() - 0.5) * 4 * sh : 0;
    g.setTransform(sx, 0, 0, sy, shx * sx, shy * sy);

    // plain
    this.ground.draw(g, this.canvas.width, this.canvas.height);
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
    this.gearFx();
    if (aim && aiming) this.reticle(aim.x, aim.y, s.stats.radius, drawn);
    if (s.stats.archers >= 1) this.elf(ELF_X - 10, H / 2 - 90, true);
    if (s.stats.archers >= 2) this.elf(ELF_X - 10, H / 2 + 90, true);
    if (s.stats.ballista) { g.fillStyle = P.bark; g.fillRect(ELF_X - 10, H / 2 - 48, 30, 10); g.fillStyle = P.cream; g.fillRect(ELF_X + 10, H / 2 - 45, 22, 3); }
    if (s.stats.wolf) { this.wolf(s.wolf); for (let i = 0; i < s.stats.extraWolves && i < s.pack.length; i++) this.wolf(s.pack[i]!); }

    const A = VFX.arrows, ss = s.stats;
    this.tint = ss.fire ? P.fire : ss.slow ? P.frost : ss.shock || ss.stun ? P.spark : ss.bounce ? P.arcane : '';
    for (let i = this.patches.length - 1; i >= 0; i--) {
      const pt = this.patches[i]!; pt.life -= dt; if (pt.life <= 0) { this.patches.splice(i, 1); continue; }
      g.globalAlpha = Math.min(1, pt.life / (A.patchLife * 0.4)); g.fillStyle = pt.c; g.beginPath(); g.ellipse(pt.x, pt.y, pt.r, pt.r * 0.45, 0, 0, 6.28); g.fill(); g.globalAlpha = 1;
      if (pt.fire && !this.reducedMotion && Math.random() < A.flameRate * dt) this.fx.flame(pt.x + (Math.random() - 0.5) * pt.r * 1.6, pt.y + (Math.random() - 0.5) * pt.r * 0.8 + 6, P.fire);
    }
    const vans = this.vanBuf, orcs = this.orcBuf; vans.length = 0; orcs.length = 0;
    s.vans.forEach((v) => { vans.push(v); }); vans.sort(byY); for (const v of vans) this.van(s, v);
    s.orcs.forEach((o) => { if (!o.dead) orcs.push(o); }); orcs.sort(byY);
    for (const o of orcs) { this.orc(s, o); if (o.burn > 0 && !this.reducedMotion && Math.random() < A.flameRate * dt) this.fx.flame(o.x + (Math.random() - 0.5) * o.r, o.y, Math.random() < 0.5 ? P.fire : P.amber); }

    this.drawBeams(dt);
    s.shots.forEach((a) => {
      if (a.kind === 'lob') { this.lob(a); return; }
      if (a.kind === 'star') { this.star(a); return; }
      if (a.kind === 'bounce') { g.fillStyle = P.arcaneGlow; g.beginPath(); g.arc(a.x, a.y, A.orbR * 2.2, 0, 6.28); g.fill(); g.fillStyle = P.arcane; g.beginPath(); g.arc(a.x, a.y, A.orbR * 1.4, 0, 6.28); g.fill(); g.fillStyle = P.arcaneCore; g.beginPath(); g.arc(a.x, a.y, A.orbR * 0.7, 0, 6.28); g.fill(); }
      const l = a.kind === 'bolt' ? 22 : a.kind === 'knife' ? 8 : a.kind === 'bounce' ? VFX.arrows.boltLen : 14, n = Math.hypot(a.vx, a.vy) || 1, ux = a.vx / n, uy = a.vy / n;
      g.strokeStyle = a.kind === 'bolt' ? P.bark : a.kind === 'knife' ? P.knife : a.kind === 'bounce' ? P.arcane : P.cream; g.lineWidth = a.kind === 'bolt' || a.kind === 'bounce' ? 3 : 1.5;
      if (!this.reducedMotion) {
        const T = VFX.trail, ghosts = T[a.kind], step = n * T.gap;
        for (let i = 1; i <= ghosts; i++) { const bx = a.x - ux * step * i, by = a.y - uy * step * i; g.globalAlpha = T.alpha * (1 - (i - 1) / ghosts); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - ux * l, by - uy * l); g.stroke(); }
        g.globalAlpha = 1;
      }
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - ux * l, a.y - uy * l); g.stroke();
    });
    for (const im of this.impacts) { const k = im.life / IMPACT_LIFE; g.globalAlpha = k; g.strokeStyle = P.cream; g.lineWidth = 2; g.beginPath(); g.arc(im.x, im.y, im.r * (1.15 - 0.15 * k), 0, 6.28); g.stroke(); g.globalAlpha = 1; }
    for (const sm of this.storms) {
      if (sm.c === P.lilac) { g.globalAlpha = sm.life / 0.35; g.strokeStyle = sm.c; g.lineWidth = 2; g.beginPath(); sm.pts.forEach((p, i) => (i ? g.lineTo(p[0] + (Math.random() - 0.5) * 6, p[1] + (Math.random() - 0.5) * 6) : g.moveTo(p[0], p[1]))); g.stroke(); g.globalAlpha = 1; continue; }
      // Shock: a thick jagged bolt with a glow, re-jagged every frame.
      g.beginPath();
      for (let i = 0; i < sm.pts.length; i++) {
        const p = sm.pts[i]!; if (!i) { g.moveTo(p[0], p[1]); continue; }
        const q = sm.pts[i - 1]!;
        for (let k = 1; k < 4; k++) g.lineTo(q[0] + ((p[0] - q[0]) * k) / 4 + (Math.random() - 0.5) * A.boltJag, q[1] + ((p[1] - q[1]) * k) / 4 + (Math.random() - 0.5) * A.boltJag);
        g.lineTo(p[0], p[1]);
      }
      g.globalAlpha = sm.life / VFX.stormLife; g.strokeStyle = P.sparkGlow; g.lineWidth = A.boltGlow; g.stroke(); g.strokeStyle = P.spark; g.lineWidth = A.boltW; g.stroke(); g.globalAlpha = 1;
    }
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
    if (this.edge > 0) { const M = LOOT_VFX.mythic; g.globalAlpha = (this.edge / M.edge) * (0.6 + 0.4 * Math.sin(this.clock * M.flicker)); g.strokeStyle = P.rose; g.lineWidth = M.edgeW; g.strokeRect(M.edgeW / 2, M.edgeW / 2, W - M.edgeW, H - M.edgeW); g.globalAlpha = 1; }
    this.ceremony.draw(g, dt);
  }

  /** Light columns over drops, fading over their life; a lit ground ellipse under legendary and mythic; motes spiralling up an epic beam. */
  private drawBeams(dt: number): void {
    const g = this.g, L = LOOT_VFX, rm = this.reducedMotion;
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]!; b.life -= dt; if (b.life <= 0) { this.beams.splice(i, 1); continue; }
      const k = b.life / b.max, w = L.beamW * (rm ? 1 : 1 + 0.25 * Math.sin(this.clock * L.pulse));
      if (b.ground) { g.globalAlpha = L.groundAlpha * k; g.fillStyle = b.c; g.beginPath(); g.ellipse(b.x, b.y, L.ringR, L.ringR * 0.4, 0, 0, 6.28); g.fill(); }
      const gr = g.createLinearGradient(0, b.y, 0, b.y - L.beamH); gr.addColorStop(0, b.c); gr.addColorStop(1, 'transparent');
      g.globalAlpha = Math.min(1, k * 2) * L.beamAlpha; g.fillStyle = gr; g.fillRect(b.x - w / 2, b.y - L.beamH, w, L.beamH);
      if (b.spiral && !rm) { g.fillStyle = b.c; for (let j = 0; j < L.spiral; j++) { const t = this.clock * L.spin + (j * 6.28) / L.spiral, yy = b.y - ((this.clock * L.rise + (j * L.beamH) / L.spiral) % L.beamH); g.fillRect(b.x + Math.cos(t) * w - 1.5, yy - 1.5, 3, 3); } }
      g.globalAlpha = 1;
    }
  }

  /** The equip glow along the elf's bow and the set-bonus ring of leaves (static under reduced motion). */
  private gearFx(): void {
    const g = this.g, L = LOOT_VFX, x = ELF_X, y = H / 2;
    if (this.glow.t > 0) { g.globalAlpha = this.glow.t / L.equip; g.strokeStyle = this.glow.c; g.lineWidth = L.equipW; g.beginPath(); g.arc(x + 12, y, 16, -1.3, 1.3); g.stroke(); g.globalAlpha = 1; }
    if (this.leaves <= 0) return;
    const spin = this.reducedMotion ? 0 : this.clock * L.leafSpin;
    g.globalAlpha = Math.min(1, (this.leaves / L.leafLife) * 2);
    for (let j = 0; j < L.leafN; j++) {
      const a = spin + (j * 6.28) / L.leafN;
      g.fillStyle = j % 2 ? P.grove : P.treantLeaf; g.beginPath(); g.ellipse(x + Math.cos(a) * L.leafR, y + Math.sin(a) * L.leafR * 0.6, 5, 2.5, a + 1.57, 0, 6.28); g.fill();
    }
    g.globalAlpha = 1;
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
    g.strokeStyle = this.tint || P.cream; g.lineWidth = this.tint ? VFX.arrows.lobW : 1.5;
    if (this.tint) { g.fillStyle = this.tint; g.beginPath(); g.arc(a.x, ay, VFX.arrows.headR, 0, 6.28); g.fill(); }
    if (!this.reducedMotion) {
      const T = VFX.trail;
      for (let i = 1; i <= T.lob; i++) {
        const v = Math.max(0, (a.t - T.gap * T.lobSpacing * i) / LOB.flight), gx = a.sx + (a.tx - a.sx) * v, gy = a.sy + (a.ty - a.sy) * v - LOB.arc * 4 * v * (1 - v);
        g.globalAlpha = T.alpha * (1 - (i - 1) / T.lob); g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx - (dx / n) * 14, gy - (dy / n) * 14); g.stroke();
      }
      g.globalAlpha = 1;
    } g.beginPath(); g.moveTo(a.x, ay); g.lineTo(a.x - (dx / n) * 14, ay - (dy / n) * 14); g.stroke();
  }

  /** Frost: ice shards radiating from a strike. */
  private shards(x: number, y: number, r: number): void {
    const A = VFX.arrows;
    for (let i = 0; i < A.shards; i++) {
      const t = (i / A.shards) * 6.28 + Math.random() * 0.3, l = r * A.shardLen * (0.6 + Math.random() * 0.4);
      this.fx.line(x + Math.cos(t) * r * 0.2, y + Math.sin(t) * r * 0.1, x + Math.cos(t) * l, y + Math.sin(t) * l * 0.45, i % 2 ? P.frost : P.cream, 3, A.shardLife);
    }
  }

  /** A Starfall arrow: shadow growing on the ground, shaft falling point-down onto it. Hidden until its stagger elapses. */
  private star(a: Projectile): void {
    if (a.t < 0) return;
    const g = this.g, L = VFX.arrows.starLen, k = 1 - a.h / ARROWS.starfall.height;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(a.x, a.y, 3 + 3 * k, 1.5 + k, 0, 0, 6.28); g.fill();
    g.strokeStyle = P.starGold; g.lineWidth = VFX.arrows.starW; g.beginPath(); g.moveTo(a.x, a.y - a.h); g.lineTo(a.x, a.y - a.h - L); g.stroke();
    g.fillStyle = P.starGold; g.beginPath(); g.arc(a.x, a.y - a.h, VFX.arrows.headR * 0.8, 0, 6.28); g.fill();
    if (!this.reducedMotion) { g.globalAlpha = VFX.trail.alpha; g.beginPath(); g.moveTo(a.x, a.y - a.h - L); g.lineTo(a.x, a.y - a.h - L * 5); g.stroke(); g.globalAlpha = 1; }
  }

  private orc(s: SimState, o: Orc): void {
    const g = this.g, wind = this.windUp(o); g.save(); g.translate(o.x + wind.dx, o.y);
    const bob = (this.reducedMotion ? 0 : Math.sin(o.wob) * 1.5) - wind.dy;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, o.r * 0.9, o.r * 0.9, o.r * 0.35, 0, 0, 6.28); g.fill();
    // Burning or chilled: the orc's own body takes the colour and a soft rim of it, so shading still reads (TB-089).
    const tint = o.burn > 0 ? P.fireTint : o.chill > 0 ? P.frostTint : '', glow = o.burn > 0 ? P.fire : o.chill > 0 ? P.frost : '';
    if (this.sprites.drawActor(g, `orc.${o.kind}`, orcState(s, o), this.clock + o.wob, 0, o.r * 0.9, o.r, o.hitT > 0, tint, glow, VFX.arrows.rimBlur)) { this.orcBars(o); g.restore(); return; }
    g.fillStyle = o.hitT > 0 ? P.cream : o.kind === 'boss' ? P.boss : o.kind === 'elite' ? P.elite : o.kind === 'brute' ? P.brute : P.orc;
    if (glow) { g.shadowColor = glow; g.shadowBlur = VFX.arrows.rimBlur; }
    g.beginPath(); g.ellipse(0, bob, o.r, o.r * 1.05, 0, 0, 6.28); g.fill(); g.shadowBlur = 0;
    if (tint && o.hitT <= 0) { g.fillStyle = tint; g.fill(); }
    g.fillStyle = P.tusk; g.fillRect(-o.r * 0.55, bob - o.r * 0.15, o.r * 0.32, o.r * 0.22); g.fillRect(o.r * 0.2, bob - o.r * 0.15, o.r * 0.32, o.r * 0.22);
    g.fillStyle = P.cream; g.fillRect(-o.r * 0.42, bob + o.r * 0.3, o.r * 0.14, o.r * 0.3); g.fillRect(o.r * 0.28, bob + o.r * 0.3, o.r * 0.14, o.r * 0.3);
    if (o.kind === 'boss') { g.fillStyle = P.amber; g.beginPath(); g.moveTo(-o.r * 0.8, -o.r * 0.7); g.lineTo(-o.r * 0.4, -o.r * 1.4); g.lineTo(0, -o.r * 0.8); g.lineTo(o.r * 0.4, -o.r * 1.4); g.lineTo(o.r * 0.8, -o.r * 0.7); g.closePath(); g.fill(); }
    this.orcBars(o);
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

  /** Thunderclap sparks, set-bonus marks (bleed, pin, root) and health bar, shared by the vector and sprite orc. */
  private orcBars(o: Orc): void {
    const g = this.g;
    if (o.stun > 0) { const A = VFX.arrows, sp = this.reducedMotion ? 0 : this.clock * A.stunSpin; g.fillStyle = P.spark; for (let i = 0; i < 3; i++) { const t = sp + i * 2.09; g.fillRect(Math.cos(t) * A.stunOrbit * 1.6 - 1.5, -o.r - 6 + Math.sin(t) * A.stunOrbit * 0.5 - 1.5, 3, 3); } }
    if (o.bleed > 0) { g.fillStyle = P.rose; g.beginPath(); g.arc(o.r * 0.5, -o.r * 0.2, 2.5, 0, 6.28); g.fill(); }
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

  private van(s: SimState, v: Vanguard): void {
    const g = this.g, T = VANGUARD[v.type]; g.save(); g.translate(v.x, v.y);
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, 16, 12, 4, 0, 0, 6.28); g.fill();
    if (this.sprites.drawActor(g, `van.${v.type}`, vanState(s, v), this.clock, 0, 16, ACTOR_R, v.hitT > 0)) { this.vanBar(v); g.restore(); return; }
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
