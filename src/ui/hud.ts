/** Game HUD over the field (TB-195b, TB-195c, docs/plans/game-ui.md §2): the starlight gem with a rolling odometer, the wave banner with a
 *  wave-clear stamp, the lit timber wall bar that cracks as the barricade falls. Reads state; never mutates it. Numbers in HUD. */
import { HUD, JUICE } from '../data/presentation';
import { STR } from '../data/strings';
import { P } from '../render/palette';
import { burst, calm, pop, springEase, tween } from './juice';

/** How many cracks show at this barricade fraction (0..HUD.cracks.length). */
export function crackStage(frac: number): number { return HUD.cracks.filter((c) => frac < c).length; }

/** Fill tone band for the wall bar. */
export function wallTone(frac: number): 'high' | 'mid' | 'low' { return frac > HUD.high ? 'high' : frac > HUD.low ? 'mid' : 'low'; }

/** Seconds per throb beat at this barricade fraction: slow at the low band's edge, quickening to fast by `HUD.deep`. */
export function throbPeriod(frac: number): number {
  const u = Math.min(1, Math.max(0, (frac - HUD.deep) / (HUD.low - HUD.deep)));
  return HUD.throbFast + (HUD.throbSlow - HUD.throbFast) * u;
}

/** Odometer layout of a formatted number: `mask` has `d` for each digit and the literal character otherwise; `digits` the digit values.
 *  A new mask means the cells are rebuilt; the same mask means the digits roll in place. */
export function odometerLayout(text: string): { mask: string; digits: number[] } {
  let mask = ''; const digits: number[] = [];
  for (const ch of text) { if (ch >= '0' && ch <= '9') { mask += 'd'; digits.push(Number(ch)); } else mask += ch; }
  return { mask, digits };
}

let stampT = 0; // pending stamp fade timer, shared so a new clear cancels the old one

/** A number whose digits roll like a mechanical counter. Each changed digit's strip rolls from where it is NOW (so a fast stream
 *  of gains never snaps back) to its new place, right-hand digits first, with a little blur, a small overshoot and a brightness
 *  flash as it lands. */
export class Odometer {
  private mask = '';
  private strips: HTMLElement[] = [];
  constructor(private el: HTMLElement, private format: (n: number) => string) {}
  /** The strip's live offset in % of its height (mid-roll too). */
  private static live(s: HTMLElement): number {
    const m = new DOMMatrixReadOnly(getComputedStyle(s).transform);
    return s.offsetHeight ? (m.m42 / s.offsetHeight) * 100 : 0;
  }
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
    let rank = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
      const s = this.strips[i]!, d = digits[i]!, old = s.dataset.d;
      if (old === String(d)) continue;
      const to = -d * 10, from = old !== undefined && !calm() ? Odometer.live(s) : to;
      s.dataset.d = String(d); s.getAnimations().forEach((a) => a.cancel()); s.style.transform = `translateY(${to}%)`;
      if (old === undefined || calm()) continue;
      const over = to + (to < from ? -HUD.odoOver : HUD.odoOver), blur = `blur(${HUD.odoBlur}rem) brightness(1)`;
      s.animate([
        { transform: `translateY(${from}%)`, filter: blur, offset: 0, easing: 'cubic-bezier(.2, .7, .3, 1)' },
        { transform: `translateY(${over}%)`, filter: blur, offset: 0.8, easing: 'ease-out' },
        { transform: `translateY(${to}%)`, filter: 'blur(0) brightness(1.6)', offset: 0.9, easing: 'ease-out' },
        { transform: `translateY(${to}%)`, filter: 'blur(0) brightness(1)', offset: 1 },
      ], { duration: HUD.odoRoll, delay: rank * HUD.odoStagger, fill: 'backwards' });
      rank++;
    }
  }
}

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

export class Hud {
  private star: Odometer;
  private lastStar: number | null = null;
  private lastSparkle = 0;
  private lastHp: number | null = null;
  private lastCrack: number | null = null;
  private toneT = 0;
  private crackT = 0;
  constructor(format: (n: number) => string) {
    this.star = new Odometer($('st-star'), format);
    $('hud').style.setProperty('--hud-roll', `${HUD.toneMs}ms`);
    $('hud-stamp').textContent = STR.waveCleared;
  }

  /** Starlight: digits roll; a gain glints the gem's upper-left facet, clear of the number (throttled); a big gain pops it too. */
  starlight(v: number): void {
    const prev = this.lastStar; this.lastStar = v; this.star.set(v);
    if (prev === null || v - prev < HUD.sparkleMin) return;
    const t = performance.now(); if (t - this.lastSparkle < HUD.sparkleGap) return;
    this.lastSparkle = t;
    const gem = $('hud-gem'), big = prev > 0 && v - prev >= prev * HUD.sparkleBig, b = gem.getBoundingClientRect();
    gem.classList.remove('glint'); void gem.offsetWidth; gem.classList.add('glint');
    if (big) pop(gem, undefined, 1.12);
    burst(b.left + b.width * 0.3, b.top + b.height * 0.28, [P.starGold, P.spark], big ? HUD.sparkleBigScale : HUD.sparkleScale);
  }

  /** Wall bar: lit stakes by fraction, tone band, cracks, a trailing red chunk; a drop in HP shakes and flashes it, and a new crack opens with chips. */
  wall(hp: number, max: number, label: string): void {
    const frac = Math.max(0, Math.min(1, hp / Math.max(1, max))), bar = $('hud-wall'), stage = crackStage(frac), tone = wallTone(frac);
    const opened = this.lastCrack !== null && stage > this.lastCrack;
    bar.style.setProperty('--frac', String(frac)); bar.style.setProperty('--throb', `${throbPeriod(frac)}s`);
    bar.dataset.crack = String(stage);
    window.clearTimeout(this.toneT);
    // the tone band follows a new crack by a beat so the two read in sequence
    if (opened && bar.dataset.tone !== tone) this.toneT = window.setTimeout(() => { bar.dataset.tone = tone; }, HUD.toneLag);
    else bar.dataset.tone = tone;
    $('hud-wall-t').textContent = label;
    if (opened) this.crackOpens(stage, bar);
    if (this.lastHp !== null && hp < this.lastHp) this.shake((this.lastHp - hp) / Math.max(1, max), opened);
    this.lastHp = hp; this.lastCrack = stage;
  }

  /** A new crack: it wipes in and flashes, and timber chips fly from it. */
  private crackOpens(stage: number, bar: HTMLElement): void {
    window.clearTimeout(this.crackT); bar.dataset.opening = String(stage);
    this.crackT = window.setTimeout(() => { delete bar.dataset.opening; }, HUD.crackWipe + 200);
    const b = bar.getBoundingClientRect(), x = HUD.crackX[stage - 1] ?? 0.5;
    burst(b.left + b.width * x, b.top + b.height * 0.55, [P.timber, P.timberDark, P.hudLip], HUD.chips / JUICE.burst.count);
  }

  private shake(k: number, opened: boolean): void {
    const bar = $('hud-wall'), amp = opened ? HUD.crackShake : Math.min(HUD.shakeMax, Math.max(HUD.shakeMin, k * HUD.shakeK));
    bar.classList.remove('hit'); void bar.offsetWidth; bar.classList.add('hit');
    if (calm()) return;
    tween(bar, HUD.shakeMs, (t) => {
      if (t >= 1) { bar.style.transform = ''; return; }
      const a = amp * Math.exp(-HUD.shakeDecay * t), w = t * Math.PI * 2 * HUD.cycles;
      bar.style.transform = `translate(${Math.sin(w) * a}rem, ${Math.cos(w) * a * HUD.shakeY}rem)`;
    });
  }

  /** A wave cleared: the stamp winds up, slams onto the banner (which jolts and rings at contact), settles, holds, fades.
   *  Reduced motion shows and fades it, no slam. */
  waveCleared(): void {
    const S = HUD.stamp, st = $('hud-stamp'), banner = $('hud-wave');
    window.clearTimeout(stampT); banner.classList.remove('stamp-ending'); st.style.opacity = '0';
    st.hidden = false;
    // The wave text crossfades back in as the stamp fades, so the plaque is never blank; a new call cancels the old timer.
    const fade = (): void => { stampT = window.setTimeout(() => tween(st, S.out, (t) => {
      st.style.opacity = String(1 - t); if (t >= 0.95) banner.classList.add('stamp-ending');
      if (t >= 1) { st.hidden = true; banner.classList.remove('stamp-ending'); } }), S.hold); };
    if (calm()) { st.style.transform = ''; st.style.opacity = '1'; fade(); return; }
    const total = S.wind + S.slam + S.settle; let landed = false;
    tween(st, total, (t) => {
      const ms = t * total; let sc: number, op: number, rot: number;
      if (ms < S.wind) { const u = ms / S.wind; sc = S.from + (S.pre - S.from) * u; op = 0.4 * u; rot = S.turnFrom; }
      else if (ms < S.wind + S.slam) { const u = ((ms - S.wind) / S.slam) ** 2; sc = S.pre + (S.land - S.pre) * u; op = 0.4 + 0.6 * u; rot = S.turnFrom + (S.turn - S.turnFrom) * u; }
      else {
        const u = (ms - S.wind - S.slam) / S.settle; sc = S.land + (1 - S.land) * springEase(u, S.overshoot); op = 1; rot = S.turn;
        if (!landed) { landed = true; this.contact(st, banner); }
      }
      st.style.opacity = String(op); st.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${sc})`;
    }, () => { st.style.transform = `translate(-50%, -50%) rotate(${S.turn}deg)`; fade(); });
  }

  /** The stamp's contact: the banner pops and drops a notch, and a ring spreads from the stamp. */
  private contact(st: HTMLElement, banner: HTMLElement): void {
    const S = HUD.stamp;
    pop(banner, JUICE.dur.pop, 1.08);
    banner.animate([{ translate: '0 0' }, { translate: `0 ${S.jolt}rem` }, { translate: '0 0' }], { duration: S.joltMs, easing: 'ease-out' });
    st.animate([{ boxShadow: `0 0 0 0 ${P.grove}` }, { boxShadow: `0 0 0 ${S.ring}rem transparent` }], { duration: S.ringMs, easing: 'ease-out' });
  }
}
