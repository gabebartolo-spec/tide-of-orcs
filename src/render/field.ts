import { Treeline } from './treeline';
import { elfLayers, stepAimMix } from './elfPose';
import { ARROWS, BARRICADE, FIELD, LOB, SOURCES, VANGUARD, WAVE_LEN } from '../data/balance';
import { FIREBALL, ORC_TYPES, OrcKind } from '../data/orcs';
import { SimEvent } from '../sim/events';
import { nearestOrc } from '../sim/combat';
import { Orc, Projectile, SimState, Vanguard, Wolf } from '../sim/state';
import { barFrac } from '../sim/barricade';
import { engagedVanguard } from '../sim/vanguard';
import { P } from './palette';
import { Particles } from './particles';
import { fmt } from '../ui/format';
import { STR } from '../data/strings';
import { Ceremony } from './ceremony';
import { plainPoint } from './viewMap';
import { Sprites } from './sprites';
import { orcAnimT, orcState, orcSwingT, swingClipT, vanState } from './actorState';
import { Ground, decorImg } from './ground';
import { Ambience } from './ambience';
import { Interp } from './interp';
import { FIELD_VIEW, PHONE_QUERY, QUALITY, GROUND, LOOT_VFX, ORC_SPRITE, SKY, TREELINE, VFX, dusk } from '../data/presentation';
import { SLOTS } from '../data/loot';
import { quality, fitScale } from './quality';
import { setTiers } from '../sim/gear';

const IMPACT_LIFE = VFX.impactLife;
/** Foot offset below an actor's centre, where its blood lands. */
const footOf = (r: number): number => r * 0.9;
/** In-place insertion sort by y (TB-218 P7): the draw order barely changes frame to frame, so this is near O(n) and allocates nothing. */
function sortByY(a: { y: number }[]): void {
  for (let i = 1; i < a.length; i++) {
    const v = a[i]!; let j = i - 1;
    while (j >= 0 && a[j]!.y > v.y) { a[j + 1] = a[j]!; j--; }
    a[j + 1] = v;
  }
}
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
  /** Fire puffs where a fireball landed (TB-127): discs that rise, swell and cool from pale core to ember to fire as they fade. */
  private puffs: { x: number; y: number; r: number; vy: number; life: number; max: number }[] = [];
  /** Fire and frost ground patches left by an enchanted strike (TB-089). */
  private patches: { x: number; y: number; r: number; life: number; c: string; fire: boolean }[] = [];
  /** Colour of the elf's lob this frame: its first enchantment, or '' for plain cream. */
  private tint = '';
  reducedMotion = false;
  readonly ceremony = new Ceremony();
  readonly sprites = new Sprites();
  /** Draws movers between sim steps (TB-194); main.ts snaps it and sets alpha. */
  readonly interp = new Interp();
  private ground = new Ground();
  private ambience = new Ambience(BAR_X + BAR_W);
  /** Animation clock for sprite frames. */
  private clock = 0;
  /** Elf shot loop (TB-202): idle<->draw mix (0 idle, 1 draw), clock at the last elf draw, last aimed charge, current lob cooldown. */
  private aimMix = 0; private elfClock = 0; private lastCharge = 0; private lobCd = 1;
  /** Reused draw-order buffers and wind-up scratch (no per-frame allocation). */
  private vanBuf: Vanguard[] = [];
  private orcBuf: Orc[] = []; private orcsIn = 0;  // orcs [0, orcsIn) were drawn inside the forest
  private wind = { dx: 0, dy: 0 };
  private sim: SimState | null = null;
  /** This frame's base transform (scale and shake offset): actors set theirs from it instead of save/translate/restore (TB-183). */
  private base = { sx: 1, sy: 1, ex: 0, ey: 0 };
  /** The canvas fills the window (TB-207): one scale k for both axes, the 900x480 plain fitted to the width and set on
   *  the bottom edge (or to the height and centred on wider screens); (ox, oy) is its top-left in CSS px. The rest of the
   *  window shows more meadow. */
  readonly view = { k: 1, ox: 0, oy: 0 };
  private treeline = new Treeline();
  /** Client px to plain coordinates; null off the plain unless `clamp` pins it to the edge (TB-216c). */
  toWorld(cx: number, cy: number, clamp: boolean): { x: number; y: number } | null {
    const r = this.canvas.getBoundingClientRect();
    return plainPoint(cx - r.left, cy - r.top, this.view, clamp);
  }
  /** Visible world rect this frame. */
  private vis: { x0: number; y0: number; x1: number; y1: number } = { x0: 0, y0: 0, x1: W, y1: H };
  /** Sprite keys per orc kind, built once so the draw loop builds no strings (TB-183). */
  private orcKeys = new Map<string, { key: string; atk: string }>();
  /** Loot moments (TB-105): drop beams, the equip glow on the bow, the set-bonus leaf ring, the mythic screen-edge shimmer and slow-motion clock. */
  private beams: { x: number; y: number; life: number; max: number; c: string; ground: boolean; spiral: boolean; k: number }[] = [];
  /** Legendary/mythic field flash (TB-192): seconds left, peak alpha, colour. */
  private flash = 0; private flashA = 0; private flashC: string = P.cream;
  private glow = { t: 0, c: P.cream as string };
  private leaves = 0; private edge = 0; private slow = 0; private tiers = -1;
  private worn: Partial<Record<string, string>> = {};

  /** Sim speed for the main loop: a mythic drop holds the field still, then runs it at 0.6× (never under reduced motion). */
  get timeScale(): number { const M = LOOT_VFX.mythic; return this.slow <= 0 ? 1 : this.slow > M.slow ? 0 : M.slowScale; }

  constructor(private canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!;
    this.resize();
    // the canvas fills the window and its box changes with the HUD mode and full screen, not only on window resize
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.resizeSoon()).observe(canvas);
  }

  private resizeTimer = 0;
  /** A URL-bar slide or rotation fires many size callbacks: wait until the box has held still for `QUALITY.resizeSettleMs`, then resize once (TB-218).
   *  The canvas box is CSS-sized, so it stays stretched to the window meanwhile. */
  resizeSoon(): void {
    if (quality.tier !== 'phone') { this.resize(); return; }
    clearTimeout(this.resizeTimer); this.resizeTimer = window.setTimeout(() => this.resize(), QUALITY.resizeSettleMs);
  }

  /** Resizing clears the canvas and reallocates its backing store, so a URL-bar animation (many equal-size callbacks) must not redo it (TB-218). */
  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    // phone tier: the governor's scale, held under QUALITY.fieldMp megapixels; desktop keeps the device ratio capped at 2 (TB-218 P2)
    const dpr = quality.tier === 'phone' ? fitScale(window.devicePixelRatio || 1, quality.q.scale, r.width, r.height, QUALITY.fieldMp) : Math.min(QUALITY.desktopScale, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    this.phone = typeof matchMedia === 'function' && matchMedia(PHONE_QUERY).matches;
    if (w === this.canvas.width && h === this.canvas.height) return;
    this.canvas.width = w; this.canvas.height = h; this.resizes++;
    this.sprites.clearBakes();   // bakes are in device px: a new scale needs new ones
  }
  /** Phone landscape layout (coarse pointer, short screen). */
  phone = false;
  /** Backing-store reallocations, for the resize regression check. */
  resizes = 0;

  /** Turn sim events into particles, strokes, blood, text and shake. */
  consume(events: SimEvent[], s: SimState): void {
    const fx = this.fx, B = VFX.blood, A = VFX.arrows, F = VFX.fireball;
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
        case 'impact': this.impacts.push({ x: e.x, y: e.y, r: e.r, life: IMPACT_LIFE }); fx.burst(e.x, e.y, P.cream, VFX.impact[0], VFX.impact[1]); fx.ring(e.x, e.y, e.r * VFX.lobDust.r, P.sand, 2, VFX.lobDust.life); break;
        case 'fireStrike': this.patches.push({ x: e.x, y: e.y, r: e.r, life: A.patchLife, c: P.firePatch, fire: true }); fx.ring(e.x, e.y, e.r, P.fire, 3, A.ringLife); for (let i = 0; i < A.fire[0] * 3; i++) fx.flame(e.x + (Math.random() - 0.5) * e.r * 1.6, e.y + (Math.random() - 0.5) * e.r * 0.8, i % 2 ? P.fire : P.amber); fx.burst(e.x, e.y, P.fire, A.fire[0] * 2, A.fire[1]); break;
        case 'fireballCast': fx.burst(e.x, e.y, P.ember, F.cast[0], F.cast[1], Math.atan2(e.ty - e.y, e.tx - e.x), F.castSpread); for (let i = 0; i < F.castFlames; i++) fx.flame(e.x + (Math.random() - 0.5) * F.r, e.y, i % 2 ? P.fire : P.ember); break;
        case 'fireballStrike':
          this.patches.push({ x: e.x, y: e.y, r: e.r, life: F.patchLife, c: P.firePatch, fire: true });
          this.puffs.push({ x: e.x, y: e.y, r: e.r * F.flash, vy: 0, life: F.flashLife, max: F.flashLife });
          for (let i = 0; i < F.puffs; i++) { const life = F.puffLife * (0.7 + Math.random() * 0.6); this.puffs.push({ x: e.x + (Math.random() - 0.5) * e.r, y: e.y + (Math.random() - 0.5) * e.r * 0.4, r: e.r * F.puffR * (0.6 + Math.random() * 0.6), vy: F.puffRise * (0.6 + Math.random() * 0.8), life, max: life }); }
          fx.ring(e.x, e.y, e.r * F.ring, P.sand, F.ringW, F.ringLife); fx.burst(e.x, e.y, P.ember, F.burst[0], F.burst[1], -1.57, F.burstSpread); fx.burst(e.x, e.y, P.fire, F.fireBurst[0], F.fireBurst[1], -1.57, F.burstSpread);
          for (let i = 0; i < F.flames; i++) fx.flame(e.x + (Math.random() - 0.5) * e.r * 1.6, e.y + (Math.random() - 0.5) * e.r * 0.8, i % 2 ? P.fire : P.ember);
          this.shake = Math.min(1, this.shake + F.shake); break;
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
        case 'gameReset': this.ceremony.skip(); this.slow = 0; this.edge = 0; this.flash = 0; this.beams.length = 0; break;
        case 'loot': this.lootDrop(e.x, e.y, e.rarity); break;
        default: break;
      }
    }
  }

  /** A drop (TB-192): every rarity stands a pillar in its colour, taller and wider by rarity; common also glints, epic gets a mote spiral,
   *  legendary and mythic a lit ground ring, a screen shake and a field flash; mythic also holds, slows and shimmers the screen edge. */
  private lootDrop(x: number, y: number, rarity: string): void {
    const L = LOOT_VFX, c = RAR_C[rarity] ?? P.cream, r = rarity as keyof typeof L.scale;
    const life = L.beam[r] ?? L.beam.rare, ground = rarity === 'legendary' || rarity === 'mythic';
    this.beams.push({ x, y: y + L.foot, life, max: life, c, ground, spiral: rarity === 'epic', k: L.scale[r] ?? 1 });
    if (rarity === 'common') this.fx.burst(x, y - 6, c, L.glint[0], L.glint[1]);
    if (ground) { const g = r as keyof typeof L.flash; this.flash = L.flashLife; this.flashA = L.flash[g]; this.flashC = c; }
    if (this.reducedMotion) return;
    this.fx.burst(x, y, c, L.motes[r] ?? 0, L.moteSpeed);
    if (ground) { this.fx.ring(x, y + L.foot, L.ringR * L.scale[r], c, 3, life * 0.5); this.shake = Math.min(1, this.shake + L.shake[r as keyof typeof L.shake]); }
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
    for (let i = this.puffs.length - 1; i >= 0; i--) { const pf = this.puffs[i]!; pf.life -= dt; pf.y -= pf.vy * dt; if (pf.life <= 0) this.puffs.splice(i, 1); }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);
    this.watchGear(s);
    this.glow.t = Math.max(0, this.glow.t - dt); this.leaves = Math.max(0, this.leaves - dt); this.edge = Math.max(0, this.edge - dt); this.slow = Math.max(0, this.slow - dt);
    const cw = this.canvas.width, ch = this.canvas.height, dpr = cw / Math.max(1, this.canvas.clientWidth || cw);
    const k = cw / ch <= W / H ? cw / W : ch / H, ox = (cw - W * k) / 2, oy = ch - H * k;
    const vw = this.view; vw.k = k / dpr; vw.ox = ox / dpr; vw.oy = oy / dpr;
    const sx = k, sy = k, vis = this.vis; vis.x0 = -ox / k; vis.y0 = -oy / k; vis.x1 = W + ox / k; vis.y1 = H;
    const sh = this.reducedMotion ? 0 : this.shake;
    const shx = sh ? (Math.random() - 0.5) * 6 * sh : 0, shy = sh ? (Math.random() - 0.5) * 4 * sh : 0;
    g.setTransform(sx, 0, 0, sy, ox + shx * sx, oy + shy * sy);
    const bt = this.base; bt.sx = sx; bt.sy = sy; bt.ex = ox + shx * sx; bt.ey = oy + shy * sy;

    // plain (and the meadow beyond it, wherever the window reaches past the plain)
    this.ground.draw(g, k, vis.x0, vis.y0, vis.x1, vis.y1);
    const n = dusk(this.clock);
    if (n > 0.01) { const lg = g.createRadialGradient(ELF_X, H / 2, 0, ELF_X, H / 2, SKY.lampR); lg.addColorStop(0, P.lamp); lg.addColorStop(1, P.lampClear); g.globalAlpha = n; g.fillStyle = lg; g.fillRect(ELF_X - SKY.lampR, H / 2 - SKY.lampR, SKY.lampR * 2, SKY.lampR * 2); g.globalAlpha = 1; }

    // the forest edge stands behind the barricade, so the palisade is drawn over it and shows its own capped top. Orcs still inside the
    // forest (feet above the bush skirt) are drawn between its rows, so a walker is behind the trunks in front of it, never over them.
    const orcs = this.orcBuf; orcs.length = 0; for (const o of s.orcs.items) if (o.live && !o.dead) orcs.push(o);
    sortByY(orcs);
    this.forest(s, orcs, dt);

    // barricade
    const frac = barFrac(s);
    const top = Math.max(vis.y0, this.treeline.skirtBase(vis.y0) - TREELINE.cap.up);  // the wall rises a little into the bush skirt; its stake tips are the cap, and no trunk stands on its column
    g.fillStyle = P.wallShade; g.fillRect(BAR_X + 4, top + GROUND.fence.shadeFrom, BAR_W + 4, H - top - GROUND.fence.shadeFrom);
    const fence = decorImg('fence');
    if (fence) {
      // stacked fence panels running into the field, top to bottom so each overlaps the one behind it
      const L = GROUND.fence, lh = L.w * fence.height / fence.width;
      // the top panel stands whole with its own pointed stakes as the wall's cap (TB-220): its top edge is `top`, nothing clips it or hides it
      for (let i = 0, y = top; y < H; i++, y += L.step) {
        const alive = y < 0 || y / H < frac || (i * 0.618034) % 1 < frac;  // same fixed break scatter as the planks
        g.globalAlpha = alive ? 1 : 0.3;
        g.drawImage(fence, BAR_X + BAR_W / 2 - L.w / 2 + (alive ? 0 : 5), y, L.w, lh);
      }
      g.globalAlpha = 1;
    } else for (let y = top - ((top % 18) + 18) % 18; y < H; y += 18) {
      // each plank breaks at a fixed point (golden-ratio scatter), so damage never flickers frame to frame
      const alive = y < 0 || y / H < frac || ((y / 18) * 0.618034) % 1 < frac;
      g.fillStyle = alive ? (y % 36 ? P.timber : P.timberDark) : P.timberSplinter;
      g.fillRect(BAR_X, y, BAR_W, 16);
      g.fillStyle = P.timberBand; g.fillRect(BAR_X + 2, y - 2, BAR_W - 4, 3);
    }
    if (s.stats.spikes) { g.fillStyle = P.cream; for (let y = 8; y < H; y += 24) { g.beginPath(); g.moveTo(BAR_X + BAR_W, y); g.lineTo(BAR_X + BAR_W + 9, y + 4); g.lineTo(BAR_X + BAR_W, y + 8); g.closePath(); g.fill(); } }

    this.fx.drawGround(g);
    s.zones.forEach((z) => {
      const cin = z.kind === 'cinder';
      g.globalAlpha = Math.min(1, z.life / VFX.zoneFade); g.fillStyle = cin ? P.cinder : P.moonwell; g.strokeStyle = cin ? P.cinderEdge : P.moonwellEdge; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * VFX.zoneSquash, 0, 0, 6.28); g.fill(); g.stroke(); g.globalAlpha = 1;
    });

    if (s.stats.treant) { g.fillStyle = P.treantTrunk; g.fillRect(BAR_X + 40, H / 2 + 10, 14, 34); g.fillStyle = P.treantLeaf; g.beginPath(); g.arc(BAR_X + 47, H / 2 + 2, 22, 0, 6.28); g.fill(); g.fillStyle = P.treantLeaf2; g.beginPath(); g.arc(BAR_X + 40, H / 2 - 6, 14, 0, 6.28); g.fill(); }

    this.lobCd = s.stats.lobCd;
    const drawn = Math.min(1, (s.run.shotT[0] ?? 0) / s.stats.lobCd), aiming = aim !== null && aim.x > BAR_X + BAR_W && !s.run.fallen;
    this.elf(ELF_X, H / 2, aiming ? drawn : -1);
    this.gearFx();
    if (aim && aiming) this.reticle(aim.x, aim.y, s.stats.radius, drawn);
    for (let i = 1; i <= s.stats.archers && i < 3; i++) this.archer(s, i, ELF_X - 10, H / 2 + (i === 1 ? -SOURCES.archerOffsetY : SOURCES.archerOffsetY));
    if (s.stats.ballista) { g.fillStyle = P.bark; g.fillRect(ELF_X - 10, H / 2 - 48, 30, 10); g.fillStyle = P.cream; g.fillRect(ELF_X + 10, H / 2 - 45, 22, 3); }
    if (s.stats.wolf) { this.wolf(s, s.wolf); for (let i = 0; i < s.stats.extraWolves && i < s.pack.length; i++) this.wolf(s, s.pack[i]!); }

    const A = VFX.arrows, ss = s.stats;
    this.tint = ss.fire ? P.fire : ss.slow ? P.frost : ss.shock || ss.stun ? P.spark : ss.bounce ? P.arcane : '';
    for (let i = this.patches.length - 1; i >= 0; i--) {
      const pt = this.patches[i]!; pt.life -= dt; if (pt.life <= 0) { this.patches.splice(i, 1); continue; }
      g.globalAlpha = Math.min(1, pt.life / (A.patchLife * 0.4)); g.fillStyle = pt.c; g.beginPath(); g.ellipse(pt.x, pt.y, pt.r, pt.r * 0.45, 0, 0, 6.28); g.fill(); g.globalAlpha = 1;
      if (pt.fire && !this.reducedMotion && Math.random() < A.flameRate * dt) this.fx.flame(pt.x + (Math.random() - 0.5) * pt.r * 1.6, pt.y + (Math.random() - 0.5) * pt.r * 0.8 + 6, P.fire);
    }
    const vans = this.vanBuf; vans.length = 0;
    for (const v of s.vans.items) if (v.live) vans.push(v);
    sortByY(vans); for (const v of vans) this.van(s, v);
    // the bush skirt is already down (behind every orc), so no walker's feet or legs are ever hidden
    for (let i = this.orcsIn; i < orcs.length; i++) this.orcDraw(s, orcs[i]!, dt);
    this.treeline.end(g);

    this.drawBeams(dt);
    s.shots.forEach((a) => { const d = this.interp.off(a); g.translate(d.dx, d.dy); this.shot(a, dt); g.translate(-d.dx, -d.dy); });
    if (this.puffs.length) {
      const blur = !quality.q.cheap;   // phone tier: no shadowBlur pass (TB-218 P2)
      if (blur) { g.shadowColor = P.fireGlow; g.shadowBlur = VFX.fireball.glow; }  // set and cleared by hand: restore() with a shadow set is dear (TB-183)
      for (const pf of this.puffs) { const k = pf.life / pf.max, r = pf.r * (1.4 - 0.5 * k); g.globalAlpha = Math.min(1, k * 1.5); g.fillStyle = k > 0.66 ? P.fireCore : k > 0.33 ? P.ember : P.fire; g.beginPath(); g.arc(pf.x, pf.y, r, 0, 6.28); g.fill(); }
      if (blur) { g.shadowBlur = 0; g.shadowColor = P.noShadow; }
      g.globalAlpha = 1;
    }
    for (const im of this.impacts) { const k = im.life / IMPACT_LIFE; g.globalAlpha = k; g.strokeStyle = P.cream; g.lineWidth = 2; g.beginPath(); g.arc(im.x, im.y, im.r * (1.15 - 0.15 * k), 0, 6.28); g.stroke(); g.globalAlpha = 1; }
    for (const sm of this.storms) {
      if (sm.c === P.lilac) { g.globalAlpha = sm.life / VFX.stormLife; g.strokeStyle = sm.c; g.lineWidth = 2; g.beginPath(); sm.pts.forEach((p, i) => (i ? g.lineTo(p[0] + (Math.random() - 0.5) * 6, p[1] + (Math.random() - 0.5) * 6) : g.moveTo(p[0], p[1]))); g.stroke(); g.globalAlpha = 1; continue; }
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
    if (s.stats.hawk) {  // TB-068: flapping hawk sprite centred on the bird, facing its heading (x moves by -sin a); bark diamond until the sheet loads
      const h = s.hawk, i = this.interp.off(h); g.save(); g.translate(h.x + i.dx, h.y + i.dy); if (Math.sin(h.a) > 0) g.scale(-1, 1);
      if (!this.sprites.draw(g, 'hawk', this.clock, 0, 0, ACTOR_R)) { g.fillStyle = P.bark; g.beginPath(); g.moveTo(-12, 0); g.lineTo(0, -3); g.lineTo(12, 0); g.lineTo(0, 3); g.closePath(); g.fill(); }
      g.restore();
    }

    this.ambience.motesDraw(g, this.clock, n, this.reducedMotion, Math.max(this.vis.y0, this.treeline.skirtBase(this.vis.y0)));  // the meadow only: no glow points over the trees
    this.fx.draw(g);

    // HUD overlays (no shake)
    g.setTransform(sx, 0, 0, sy, ox, oy);
    // The wall bar, barricade and vanguard counts are the DOM HUD now (TB-195b, src/ui/hud.ts); the wave strip stays on the field.
    // TB-207: the strip floats inside the field (inset clear of the full-screen side crop), rounded, instead of running along its edge
    const wx = BAR_X + BAR_W / 2 + FIELD_VIEW.reach + 12, wy = H - 15 - (this.phone ? FIELD_VIEW.phoneStripLift : 0), ww = W - 40 - wx, wh = 6, wt = Math.min(1, s.run.waveT / WAVE_LEN);
    g.fillStyle = P.ink; g.globalAlpha = 0.6; g.beginPath(); g.roundRect(wx - 2, wy - 2, ww + 4, wh + 4, wh / 2 + 2); g.fill(); g.globalAlpha = 1;
    g.fillStyle = P.dim45; g.beginPath(); g.roundRect(wx, wy, ww, wh, wh / 2); g.fill();
    if (wt > 0) { g.fillStyle = P.amber; g.beginPath(); g.roundRect(wx, wy, Math.max(wh, ww * wt), wh, wh / 2); g.fill(); }
    // a cream rim and a glowing bead at the leading edge, so the strip reads as a finished gauge
    g.strokeStyle = P.cream; g.globalAlpha = 0.35; g.lineWidth = 1; g.beginPath(); g.roundRect(wx - 1, wy - 1, ww + 2, wh + 2, wh / 2 + 1); g.stroke(); g.globalAlpha = 1;
    if (wt > 0) { const bx = wx + Math.max(wh, ww * wt) - wh / 2; g.fillStyle = P.amber; g.globalAlpha = 0.3; g.beginPath(); g.arc(bx, wy + wh / 2, wh * 1.4, 0, 6.28); g.fill(); g.globalAlpha = 1; g.fillStyle = P.cream; g.beginPath(); g.arc(bx, wy + wh / 2, wh * 0.45, 0, 6.28); g.fill(); }
    if (this.flash > 0) { this.flash -= dt; g.globalAlpha = Math.max(0, this.flash / LOOT_VFX.flashLife) * this.flashA; g.fillStyle = this.flashC; g.fillRect(this.vis.x0, this.vis.y0, this.vis.x1 - this.vis.x0, H - this.vis.y0); g.globalAlpha = 1; }
    if (this.edge > 0) { const M = LOOT_VFX.mythic; g.globalAlpha = (this.edge / M.edge) * (0.6 + 0.4 * Math.sin(this.clock * M.flicker)); g.strokeStyle = P.rose; g.lineWidth = M.edgeW; g.strokeRect(this.vis.x0 + M.edgeW / 2, this.vis.y0 + M.edgeW / 2, this.vis.x1 - this.vis.x0 - M.edgeW, H - this.vis.y0 - M.edgeW); g.globalAlpha = 1; }
    this.ceremony.draw(g, dt, this.vis.x0, this.vis.y0, this.vis.x1, H);
  }

  /** Light columns over drops, fading over their life; a lit ground ellipse under legendary and mythic; motes spiralling up an epic beam. */
  private drawBeams(dt: number): void {
    const g = this.g, L = LOOT_VFX, rm = this.reducedMotion;
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]!; b.life -= dt; if (b.life <= 0) { this.beams.splice(i, 1); continue; }
      const k = b.life / b.max, h = L.beamH * b.k, w = L.beamW * b.k * (rm ? 1 : 1 + 0.25 * Math.sin(this.clock * L.pulse)), a = Math.min(1, k * 2);
      if (b.ground) { g.globalAlpha = L.groundAlpha * k; g.fillStyle = b.c; g.beginPath(); g.ellipse(b.x, b.y, L.ringR * b.k, L.ringR * b.k * 0.4, 0, 0, 6.28); g.fill(); }
      const gr = g.createLinearGradient(0, b.y, 0, b.y - h); gr.addColorStop(0, b.c); gr.addColorStop(1, 'transparent');
      g.globalAlpha = a * L.beamAlpha; g.fillStyle = gr; g.fillRect(b.x - w / 2, b.y - h, w, h);
      // a bright core down the middle so the pillar reads against any ground
      g.globalAlpha = a * L.beamAlpha; g.fillStyle = P.cream; g.fillRect(b.x - (w * L.core) / 2, b.y - h * 0.8, w * L.core, h * 0.8);
      if (b.spiral && !rm) { g.fillStyle = b.c; for (let j = 0; j < L.spiral; j++) { const t = this.clock * L.spin + (j * 6.28) / L.spiral, yy = b.y - ((this.clock * L.rise + (j * h) / L.spiral) % h); g.fillRect(b.x + Math.cos(t) * w - 1.5, yy - 1.5, 3, 3); } }
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


  /** The forest edge along the top of the view (TB-220): the tree rows, then every orc still walking inside the forest (whole, never cut to a head or a weapon by a trunk); the wall and the bush skirt, which still hides their feet, follow. */
  private forest(s: SimState, orcs: Orc[], dt: number): void {
    const { x0, y0, x1 } = this.vis, tl = this.treeline, edge = tl.skirtEdge(y0), g = this.g;
    tl.begin(g, y0, (this.phone ? FIELD_VIEW.phoneHud : FIELD_VIEW.hudFrac * this.canvas.clientHeight) / this.view.k); tl.treesUpTo(g, y0, x0, x1, Infinity); tl.skirtUpTo(g, y0, x0, x1, Infinity);
    let i = 0;
    for (; i < orcs.length && orcs[i]!.y < edge; i++) this.orcDraw(s, orcs[i]!, dt);
    this.orcsIn = i;
  }

  /** One orc and the flames it sheds when burning. */
  private orcDraw(s: SimState, o: Orc, dt: number): void {
    const A = VFX.arrows; this.orc(s, o);
    if (o.burn > 0 && !this.reducedMotion && Math.random() < A.flameRate * dt) this.fx.flame(o.x + (Math.random() - 0.5) * o.r, o.y, Math.random() < 0.5 ? P.fire : P.amber);
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

  /** The shaman's fireball (TB-127): a shadow on the ground, a glowing ball (pale core, ember body, fire rim and halo) along its arc,
   *  a comet tail of ghost balls behind it and embers rising off it. */
  private fireball(a: Projectile, dt: number): void {
    const g = this.g, F = VFX.fireball, T = VFX.trail, u = Math.min(1, a.t / FIREBALL.flight);
    if (u >= 1) return;
    const ay = a.y - a.h;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(a.x, a.y, F.r, F.r * F.shadow, 0, 0, 6.28); g.fill();
    if (!this.reducedMotion) {
      g.fillStyle = P.fire;
      for (let i = 1; i <= F.trail; i++) {
        const v = Math.max(0, (a.t - T.gap * i) / FIREBALL.flight), gx = a.sx + (a.tx - a.sx) * v, gy = a.sy + (a.ty - a.sy) * v - FIREBALL.arc * 4 * v * (1 - v);
        g.globalAlpha = T.alpha * (1 - (i - 1) / F.trail); g.beginPath(); g.arc(gx, gy, F.r * (0.9 - (0.7 * i) / (F.trail + 1)), 0, 6.28); g.fill();
      }
      g.globalAlpha = 1;
      if (Math.random() < F.embers * dt) this.fx.flame(a.x + (Math.random() - 0.5) * F.r, ay, Math.random() < 0.5 ? P.fire : P.ember);
    }
    if (quality.q.cheap) {   // phone tier: a plain halo disc instead of a shadowBlur pass
      g.fillStyle = P.fireGlow; g.beginPath(); g.arc(a.x, ay, F.r + F.glow * QUALITY.haloK, 0, 6.28); g.fill();
      g.fillStyle = P.fire; g.beginPath(); g.arc(a.x, ay, F.r, 0, 6.28); g.fill();
    } else { g.shadowColor = P.fireGlow; g.shadowBlur = F.glow; g.fillStyle = P.fire; g.beginPath(); g.arc(a.x, ay, F.r, 0, 6.28); g.fill(); g.shadowBlur = 0; g.shadowColor = P.noShadow; }
    g.fillStyle = P.ember; g.beginPath(); g.arc(a.x, ay, F.r * 0.65, 0, 6.28); g.fill();
    g.fillStyle = P.fireCore; g.beginPath(); g.arc(a.x - F.r * 0.1, ay - F.r * 0.1, F.r * 0.35, 0, 6.28); g.fill();
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

  /** One projectile at its sim position (the caller offsets it for interpolation). */
  private shot(a: Projectile, dt: number): void {
    const g = this.g, A = VFX.arrows;
    if (a.kind === 'lob') { this.lob(a); return; }
    if (a.kind === 'fireball') { this.fireball(a, dt); return; }
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
  }

  private orc(s: SimState, o: Orc): void {
    // Orcs draw at their world position under the frame's base transform: no per-orc setTransform (TB-218 P7), which dominated a 160-orc frame.
    const g = this.g, wind = this.windUp(o), d = this.interp.off(o), x = o.x + d.dx + wind.dx, y = o.y + d.dy;
    if (quality.q.cheap) { const sh = this.shadowBlit(); g.drawImage(sh, x - o.r * 0.9, y + o.r * 0.55, o.r * 1.8, o.r * 0.7); }   // phone tier: one prebaked blit
    else { g.fillStyle = P.shadow; g.beginPath(); g.ellipse(x, y + o.r * 0.9, o.r * 0.9, o.r * 0.35, 0, 0, 6.28); g.fill(); }
    // Burning or chilled: the orc's own body takes the colour and a soft rim of it, so shading still reads (TB-089).
    const tint = o.burn > 0 ? P.fireTint : o.chill > 0 ? P.frostTint : '', glow = o.burn > 0 ? P.fire : o.chill > 0 ? P.frost : '';
    let k = this.orcKeys.get(o.kind);
    if (!k) { const key = `orc.${ORC_SPRITE[o.kind] ?? o.kind}`; k = { key, atk: key + '.attack' }; this.orcKeys.set(o.kind, k); }
    const ost = orcState(s, o), ot = ost === 'attack' ? orcSwingT(o, this.sprites.duration(k.atk), VFX.strike.orc) : orcAnimT(o);
    this.sprites.drawActor(g, k.key, ost, ot, x, y + o.r * 0.9, o.r, o.hitT > 0, tint, glow, VFX.arrows.rimBlur);
    this.orcBars(o, x, y);
  }

  /** The orc's ground shadow as a small canvas (ellipse in P.shadow), built once; a blit is cheaper than a path fill (TB-218 P2). */
  private shadowCanvas: HTMLCanvasElement | null = null;
  private shadowBlit(): HTMLCanvasElement {
    if (!this.shadowCanvas) {
      const c = document.createElement('canvas'), n = QUALITY.shadowPx; c.width = n; c.height = Math.round(n * 0.35 / 0.9 / 2) * 2 || 1;
      const cg = c.getContext('2d')!; cg.fillStyle = P.shadow; cg.beginPath(); cg.ellipse(n / 2, c.height / 2, n / 2, c.height / 2, 0, 0, 6.28); cg.fill();
      this.shadowCanvas = c;
    }
    return this.shadowCanvas;
  }

  /** Set the transform to the frame's base translated to (x, y), mirrored when `flip`: the same matrix save/translate/scale
   *  would build, without the per-actor save/restore cost (TB-183). (0, 0, false) puts the base back. */
  private at(x: number, y: number, flip: boolean): void {
    const b = this.base, g = this.g; g.setTransform(b.sx, 0, 0, b.sy, b.ex, b.ey);
    if (x || y) g.translate(x, y);
    if (flip) g.scale(-1, 1);
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

  /** Companion wolf (TB-160): runs while it closes on its target, the bite clip scrubbed by the bite cooldown; faces its target. */
  private wolf(s: SimState, w: Wolf): void {
    const g = this.g, i = this.interp.off(w); g.save(); g.translate(w.x + i.dx, w.y + i.dy); g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, 8, 12, 4, 0, 0, 6.28); g.fill();
    if (w.tx < w.x - 2) g.scale(-1, 1);
    const d = Math.hypot(w.tx - w.x, w.ty - w.y), near = !!nearestOrc(s, w.x, w.y, (o) => Math.hypot(o.x - w.x, o.y - w.y) < SOURCES.wolf.reach), t = near ? Math.min(1, w.biteT / SOURCES.wolf.biteCd) * this.sprites.duration('wolf.attack') * 0.999 : this.clock;
    this.sprites.drawActor(g, 'wolf', near ? 'attack' : d > 2 ? 'walk' : 'idle', t, 0, 8, ACTOR_R); g.restore();
  }

  /** Thunderclap sparks, set-bonus marks (bleed, pin, root) and health bar. */
  private orcBars(o: Orc, x: number, y: number): void {
    const g = this.g;
    if (o.stun > 0 || o.bleed > 0 || o.root > 0 || o.pin > 0) {   // rare marks draw in the orc's local frame
      this.at(x, y, false);
      if (o.stun > 0) { const A = VFX.arrows, sp = this.reducedMotion ? 0 : this.clock * A.stunSpin; g.fillStyle = P.spark; for (let i = 0; i < 3; i++) { const t = sp + i * 2.09; g.fillRect(Math.cos(t) * A.stunOrbit * 1.6 - 1.5, -o.r - 6 + Math.sin(t) * A.stunOrbit * 0.5 - 1.5, 3, 3); } }
      if (o.bleed > 0) { g.fillStyle = P.rose; g.beginPath(); g.arc(o.r * 0.5, -o.r * 0.2, 2.5, 0, 6.28); g.fill(); }
      if (o.root > 0) { g.strokeStyle = P.sage; g.lineWidth = 2; g.beginPath(); g.ellipse(0, o.r * 0.9, o.r, o.r * 0.35, 0, 0, 6.28); g.stroke(); }
      if (o.pin > 0) { g.strokeStyle = P.cream; g.lineWidth = 3; g.beginPath(); g.moveTo(-o.r * 0.6, -o.r); g.lineTo(o.r * 0.3, o.r * 1.1); g.stroke(); }
      this.at(0, 0, false);
    }
    if (o.hp < o.maxhp) { g.fillStyle = P.dim; g.fillRect(x - o.r, y - o.r - 8, o.r * 2, 3); g.fillStyle = P.rose; g.fillRect(x - o.r, y - o.r - 8, o.r * 2 * Math.max(0, o.hp / o.maxhp), 3); }
  }

  /** `draw` is the bow's charge (0..1) while the player aims, -1 otherwise. The sprite elf plays its idle loop (`elf`) at rest
   *  and its draw clip (`elf.attack`) in step with the charge, so the string is at full draw as the lob leaves. */
  private elf(x: number, y: number, draw = -1): void {
    const g = this.g; g.save(); g.translate(x, y);
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, 16, 12, 4, 0, 0, 6.28); g.fill();
    const key = 'elf', aiming = draw >= 0;
    this.aimMix = stepAimMix(this.aimMix, aiming, this.clock - this.elfClock, VFX.elfShot.aim); this.elfClock = this.clock;
    if (aiming) this.lastCharge = draw;
    const a0 = g.globalAlpha;
    for (const l of elfLayers(this.lastCharge, this.lastCharge * this.lobCd, this.aimMix, this.sprites.duration('elf.attack'), VFX.elfShot.release)) {
      g.globalAlpha = a0 * l.alpha; this.sprites.drawActor(g, key, l.state, l.state === 'walk' ? this.clock : l.t, 0, 16, ACTOR_R);
    }
    g.restore();
  }

  /** Companion archer i (TB-203): its idle loop (`archer`), and its draw clip (`archer.attack`) timed off its volley timer so the
   *  string releases as the volley leaves. With no orc in range its timer runs past the interval and it stands at idle. */
  private archer(s: SimState, i: number, x: number, y: number): void {
    const g = this.g; g.save(); g.translate(x, y); g.globalAlpha = 0.85;
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, 16, 12, 4, 0, 0, 6.28); g.fill();
    const U = s.stats.units[i === 1 ? 'ranger' : 'warden'], cd = 1 / (s.stats.fireRate * U.rate), shotT = s.run.shotT[i] ?? 0;
    const dur = this.sprites.duration('archer.attack'), shooting = dur > 0 && shotT < cd;
    this.sprites.drawActor(g, 'archer', shooting ? 'attack' : 'walk', shooting ? swingClipT(shotT, cd, dur, VFX.strike.archer) : this.clock, 0, 16, ACTOR_R);
    g.restore();
  }

  /** `van.<type>` and its attack key, built once per type so drawing builds no strings (TB-218). */
  private vanKeys = new Map<string, { key: string; atk: string }>();
  private vanKey(type: string): { key: string; atk: string } {
    let k = this.vanKeys.get(type);
    if (!k) { const key = `van.${type}`; k = { key, atk: key + '.attack' }; this.vanKeys.set(type, k); }
    return k;
  }

  private van(s: SimState, v: Vanguard): void {
    const g = this.g, T = VANGUARD[v.type]; const i = this.interp.off(v); this.at(v.x + i.dx, v.y + i.dy, v.face < 0);
    g.fillStyle = P.shadow; g.beginPath(); g.ellipse(0, 16, 12, 4, 0, 0, 6.28); g.fill();
    const vk = this.vanKey(v.type), vst = vanState(s, v), vt = vst === 'attack' ? swingClipT(v.swingT, T.cd, this.sprites.duration(vk.atk), VFX.strike[v.type]) : this.clock;
    this.sprites.drawActor(g, vk.key, vst, vt, 0, 16, ACTOR_R, v.hitT > 0);
    this.vanBar(v); this.at(0, 0, false);
  }

  private vanBar(v: Vanguard): void {
    const g = this.g;
    if (v.face < 0) g.scale(-1, 1);  // undo van()'s facing flip so the bar drains right to left
    if (v.hp < v.maxhp) { g.fillStyle = P.dim; g.fillRect(-12, -26, 24, 3); g.fillStyle = P.spear; g.fillRect(-12, -26, 24 * Math.max(0, v.hp / v.maxhp), 3); }
  }
}
