/** Game HUD over the field (TB-195b, refined TB-195c, docs/plans/game-ui.md §2): the starlight gem with an odometer, the wave banner with a
 *  wave-clear stamp, the lit timber wall bar that cracks as the barricade falls. Reads state; never mutates it. Numbers in HUD. */
import { HUD, JUICE } from '../data/presentation';
import { STR } from '../data/strings';
import { P } from '../render/palette';
import { burst, calm, pop, springEase, tween } from './juice';

/** How many cracks show at this barricade fraction (0..HUD.cracks.length). */
export function crackStage(frac: number): number { return HUD.cracks.filter((c) => frac < c).length; }

/** Fill tone band for the wall bar. */
export function wallTone(frac: number): 'high' | 'mid' | 'low' { return frac > HUD.high ? 'high' : frac > HUD.low ? 'mid' : 'low'; }

/** Low-HP throb period in seconds: `HUD.throbAt25` at the low band edge, quickening linearly to `HUD.throbAt10` at 10 % and below. */
export function throbPeriod(frac: number): number {
  const k = Math.min(1, Math.max(0, (HUD.low - frac) / (HUD.low - 0.1)));
  return HUD.throbAt25 + (HUD.throbAt10 - HUD.throbAt25) * k;
}

/** Wave-clear stamp at `ms` since the call: anticipation (draw back, fade up), slam (ease-in to under-size, turn), settle (spring to 1). */
export function stampAt(ms: number): { scale: number; opacity: number; rot: number; contact: boolean; done: boolean } {
  const pre = HUD.stampPre, slam = HUD.stampSlam, settle = HUD.stampSettle;
  if (ms < pre) { const u = ms / pre; return { scale: HUD.stampPreScale + (HUD.stampFrom - HUD.stampPreScale) * u, opacity: 0.4 * u, rot: HUD.stampTurnFrom, contact: false, done: false }; }
  if (ms < pre + slam) { const u = (ms - pre) / slam, e = u * u; return { scale: HUD.stampFrom + (HUD.stampLow - HUD.stampFrom) * e, opacity: 0.4 + 0.6 * u, rot: HUD.stampTurnFrom + (HUD.stampTurn - HUD.stampTurnFrom) * e, contact: false, done: false }; }
  const u = Math.min(1, (ms - pre - slam) / settle);
  return { scale: HUD.stampLow + (1 - HUD.stampLow) * springEase(u, HUD.ease.settleBack), opacity: 1, rot: HUD.stampTurn, contact: true, done: u >= 1 };
}

/** Odometer layout of a formatted number: `mask` has `d` for each digit and the literal character otherwise; `digits` the digit values.
 *  A new mask means the cells are rebuilt; the same mask means the digits roll in place. */
export function odometerLayout(text: string): { mask: string; digits: number[] } {
  let mask = ''; const digits: number[] = [];
  for (const ch of text) { if (ch >= '0' && ch <= '9') { mask += 'd'; digits.push(Number(ch)); } else mask += ch; }
  return { mask, digits };
}

/** A number whose digits roll like a mechanical counter. Each digit is a 0–9 strip that slides to its place on the spring. */
let stampT = 0; // pending stamp fade timer, shared so a new clear cancels the old one
export class Odometer {
  private mask = '';
  private strips: HTMLElement[] = [];
  constructor(private el: HTMLElement, private format: (n: number) => string) {}
  set(v: number): void {
    const text = this.format(v), { mask, digits } = odometerLayout(text);
    this.el.setAttribute('aria-label', text);
    if (mask !== this.mask) {
      this.mask = mask; this.el.textContent = ''; this.strips = [];
      for (const m of mask) {
        const cell = document.createElement('span');
        if (m === 'd') { cell.className = 'od'; const s = document.createElement('span'); s.className = 'strip'; s.textContent = '0123456789'.split('').join('\n'); cell.appendChild(s); this.strips.push(s); }
        else { cell.className = 'oc'; cell.textContent = m; }
        cell.setAttribute('aria-hidden', 'true'); this.el.appendChild(cell);
      }
    }
    // TB-195c: each changed digit rolls from where its strip is NOW (read live, so a second gain mid-roll never snaps back) to its new
    // place, right to left on a stagger, from a faint blur, then the number flashes as it lands. One driver: WAAPI, no CSS transition.
    let last = 0;
    digits.forEach((d, i) => {
      const s = this.strips[i]!, old = s.dataset.d, to = `translateY(${-d * 10}%)`, fromPx = new DOMMatrixReadOnly(getComputedStyle(s).transform).m42;
      s.dataset.d = String(d); s.style.transform = to;
      if (old === undefined || old === String(d) || calm()) return;
      s.getAnimations().forEach((x) => x.cancel());
      const delay = (digits.length - 1 - i) * HUD.odoStagger, an = s.animate([{ transform: `translateY(${fromPx}px)`, filter: `blur(${HUD.odoBlur}rem)` }, { transform: to, filter: 'blur(0)' }], { duration: HUD.odoRoll, delay, fill: 'backwards', easing: HUD.ease.settle });
      last = Math.max(last, delay + HUD.odoRoll); void an;
    });
    if (last > 0) { window.clearTimeout(this.landT); this.landT = window.setTimeout(() => this.el.animate([{ filter: 'brightness(1.55)' }, { filter: 'brightness(1)' }], { duration: HUD.odoLand, easing: HUD.ease.drain }), last); }
  }
  private landT = 0;
}

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

export class Hud {
  private star: Odometer;
  private lastStar: number | null = null;
  private wantStar = 0;
  private lastRoll = -1e9;
  private starT = 0;
  private lastSparkle = 0;
  private lastHp: number | null = null;
  private toneT = 0;
  constructor(format: (n: number) => string) {
    this.star = new Odometer($('st-star'), format);
    const hud = $('hud').style;
    hud.setProperty('--hud-roll', `${HUD.fillUp}ms`); hud.setProperty('--hud-down', `${HUD.fillDown}ms`);
    hud.setProperty('--hud-trail-delay', `${HUD.trailDelay}ms`); hud.setProperty('--hud-trail', `${HUD.trailDrain}ms`);
    hud.setProperty('--hud-stamp-out', `${HUD.stampOut}ms`); hud.setProperty('--hud-ease-settle', HUD.ease.settle); hud.setProperty('--hud-ease-drain', HUD.ease.drain);
    $('hud-stamp').textContent = STR.waveCleared;
  }

  /** Starlight: digits roll (a kill stream coalesces to one roll per `odoGap`); a gain glints the gem (throttled, sized by the gain). */
  starlight(v: number): void {
    this.wantStar = v;
    const t = performance.now(), wait = HUD.odoGap - (t - this.lastRoll);
    if (wait <= 0 || calm() || this.lastStar === null) { window.clearTimeout(this.starT); this.starT = 0; this.rollStar(); }
    else if (!this.starT) this.starT = window.setTimeout(() => { this.starT = 0; this.rollStar(); }, wait);
  }

  private rollStar(): void {
    const v = this.wantStar, prev = this.lastStar; this.lastStar = v; this.lastRoll = performance.now(); this.star.set(v);
    if (prev === null || v === prev) return;
    const t = performance.now();
    if (v - prev >= HUD.sparkleMin && t - this.lastSparkle > HUD.sparkleGap) {
      this.lastSparkle = t; const gem = $('hud-gem'), b = gem.getBoundingClientRect(), big = v - prev >= v * HUD.sparkleBig;
      if (big) pop(gem, JUICE.dur.pop, 1.12);
      burst(b.left + b.width * 0.3, b.top + b.height * 0.3, [P.starGold, P.spark], big ? HUD.sparkleBigScale : HUD.sparkleScale); // upper-left facet, clear of the digits
    }
  }

  /** Wall bar: lit fill by fraction, tone band, cracks; a drop in HP shakes it, flashes it and leaves a rose trail that drains after. */
  wall(hp: number, max: number, label: string): void {
    const frac = Math.max(0, Math.min(1, hp / Math.max(1, max))), bar = $('hud-wall'), prevCrack = Number(bar.dataset.crack ?? 0), crack = crackStage(frac);
    const tone = wallTone(frac), hit = this.lastHp !== null && hp < this.lastHp, newCrack = hit && crack > prevCrack;
    bar.dataset.dir = hit ? 'down' : 'up'; bar.dataset.crack = String(crack);
    $('hud-wall-fill').style.setProperty('--frac', String(frac)); $('hud-wall-trail').style.setProperty('--frac', String(frac));
    bar.style.setProperty('--throb', `${throbPeriod(frac).toFixed(3)}s`);
    // a new crack lands first; the tone band follows `toneLag` ms later so the two read in sequence
    window.clearTimeout(this.toneT);
    if (newCrack && !calm()) this.toneT = window.setTimeout(() => { bar.dataset.tone = tone; }, HUD.toneLag); else bar.dataset.tone = tone;
    $('hud-wall-t').textContent = label;
    if (hit) { const k = (this.lastHp! - hp) / Math.max(1, max); this.flash(); if (newCrack) this.crackFx(crack); this.shake(newCrack ? HUD.crackShake : Math.max(HUD.shakeMin, Math.min(HUD.shakeMax, k * HUD.shakeK))); }
    this.lastHp = hp;
  }

  /** A hit: a white-to-rose blink over the bar (kept under reduced motion; colour, not movement). */
  private flash(): void {
    const f = $('hud-wall-flash'); f.style.animationDuration = `${HUD.flashMs}ms`; f.style.setProperty('--flash', String(HUD.flashAlpha));
    f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  }

  /** A new crack: timber chips fly from the split. */
  private crackFx(stage: number): void {
    if (calm()) return;
    const b = $('hud-wall').getBoundingClientRect();
    burst(b.left + b.width * (HUD.crackX[stage - 1] ?? 0.5), b.top + b.height * 0.5, [P.timber, P.woodRim, P.timberDark], HUD.chips / JUICE.burst.count);
  }

  /** Two-axis shake that decays: `shakeHz` over `shakeMs`, e^(-shakeDecay t), the second axis a quarter turn behind at `shakeY`. */
  private shake(amp: number): void {
    if (calm()) return;
    const bar = $('hud-wall');
    tween(bar, HUD.shakeMs, (t) => {
      const s = t * HUD.shakeMs / 1000, d = amp * Math.exp(-HUD.shakeDecay * s), w = 2 * Math.PI * HUD.shakeHz * s;
      bar.style.transform = t >= 1 ? '' : `translate(${Math.sin(w) * d}rem, ${Math.cos(w) * d * HUD.shakeY}rem)`;
    });
  }

  /** A wave cleared: the stamp draws back, slams under-size onto the banner (ring, jolt, banner pop at contact), settles, holds, and
   *  crossfades with the wave text. Reduced motion shows and fades it, no slam. */
  waveCleared(): void {
    const st = $('hud-stamp'), banner = $('hud-wave'), total = HUD.stampPre + HUD.stampSlam + HUD.stampSettle;
    window.clearTimeout(stampT); banner.classList.remove('stamp-ending'); st.style.opacity = '0'; st.classList.remove('ring');
    st.hidden = false;
    const fade = (): void => { stampT = window.setTimeout(() => { banner.classList.add('stamp-ending'); tween(st, HUD.stampOut, (t) => {
      st.style.opacity = String(1 - t);
      if (t >= 1) { st.hidden = true; banner.classList.remove('stamp-ending'); } }); }, HUD.stampHold); };
    if (calm()) { st.style.transform = ''; st.style.opacity = '1'; fade(); return; }
    let hit = false;
    tween(st, total, (t) => {
      const a = stampAt(t * total);
      st.style.opacity = String(a.opacity); st.style.transform = `translate(-50%, -50%) rotate(${a.rot}deg) scale(${a.scale})`;
      if (a.contact && !hit) { hit = true; this.contact(banner, st); }
    }, fade);
  }

  /** Contact beat: the banner pops 1.08 and jolts down `stampJolt` rem for `stampJoltMs`, and the stamp throws a ring. */
  private contact(banner: HTMLElement, st: HTMLElement): void {
    pop(banner, JUICE.dur.pop, 1.08);
    st.style.setProperty('--ring', `${HUD.stampRing}rem`); st.classList.add('ring');
    tween(banner, HUD.stampJoltMs, (t) => { banner.style.translate = t >= 1 ? '' : `0 ${Math.sin(t * Math.PI) * HUD.stampJolt}rem`; });
  }
}
