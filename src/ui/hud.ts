/** Game HUD over the field (TB-195b, docs/plans/game-ui.md §2): the starlight gem with an odometer, the wave banner with a
 *  wave-clear stamp, the lit timber wall bar that cracks as the barricade falls. Reads state; never mutates it. Numbers in HUD. */
import { HUD, JUICE } from '../data/presentation';
import { STR } from '../data/strings';
import { P } from '../render/palette';
import { burstAt, calm, pop, springEase, tween } from './juice';

/** How many cracks show at this barricade fraction (0..HUD.cracks.length). */
export function crackStage(frac: number): number { return HUD.cracks.filter((c) => frac < c).length; }

/** Fill tone band for the wall bar. */
export function wallTone(frac: number): 'high' | 'mid' | 'low' { return frac > HUD.high ? 'high' : frac > HUD.low ? 'mid' : 'low'; }

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
    // TB-195b: each changed digit rolls its strip from the old digit to the new one; all start and land together, with no
    // overshoot, so at rest every digit sits on one baseline.
    digits.forEach((d, i) => {
      const s = this.strips[i]!, old = s.dataset.d, to = `translateY(${-d * 10}%)`;
      s.dataset.d = String(d); s.style.transform = to;
      if (old !== undefined && old !== String(d) && !calm()) s.animate([{ transform: `translateY(${-Number(old) * 10}%)` }, { transform: to }], { duration: HUD.odoRoll, easing: 'cubic-bezier(.25, .6, .3, 1)' });
    });
  }
}

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

export class Hud {
  private star: Odometer;
  private lastStar: number | null = null;
  private lastSparkle = 0;

  private lastHp: number | null = null;
  constructor(format: (n: number) => string) {
    this.star = new Odometer($('st-star'), format);
    $('hud').style.setProperty('--hud-roll', `${HUD.roll}ms`);
    $('hud-stamp').textContent = STR.waveCleared;
  }

  /** Starlight: digits roll; a gain sparkles the gem (throttled). */
  starlight(v: number): void {
    const prev = this.lastStar; this.lastStar = v; this.star.set(v);
    if (prev === null || v === prev) return;
    const t = performance.now();
    if (v - prev >= HUD.sparkleMin && t - this.lastSparkle > HUD.sparkleGap) { this.lastSparkle = t; pop($('hud-gem')); burstAt($('hud-gem'), [P.starGold, P.spark], HUD.sparkleScale); }
  }

  /** Wall bar: lit fill by fraction, tone band, cracks; a drop in HP shakes it. */
  wall(hp: number, max: number, label: string): void {
    const frac = Math.max(0, Math.min(1, hp / Math.max(1, max))), bar = $('hud-wall');
    $('hud-wall-fill').style.setProperty('--frac', String(frac));
    bar.dataset.tone = wallTone(frac); bar.dataset.crack = String(crackStage(frac));
    $('hud-wall-t').textContent = label;
    if (this.lastHp !== null && hp < this.lastHp) this.shake((this.lastHp - hp) / Math.max(1, max));
    this.lastHp = hp;
  }

  private shake(k: number): void {
    if (calm()) return;
    const bar = $('hud-wall'), amp = Math.min(HUD.shakeMax, k * HUD.shakeK);
    tween(bar, HUD.shakeMs, (t) => { bar.style.transform = t >= 1 ? '' : `translateX(${Math.sin(t * Math.PI * 6) * amp * (1 - t)}rem)`; });
  }

  /** A wave cleared: the banner pops and the CLEARED stamp slams onto it, holds, fades. Reduced motion shows and fades it, no slam. */
  waveCleared(): void {
    const st = $('hud-stamp'), banner = $('hud-wave');
    window.clearTimeout(stampT); banner.classList.remove('stamp-ending'); st.style.opacity = '0';
    st.hidden = false;
    // The wave text crossfades back in as the stamp fades, so the plaque is never blank; a new call cancels the old timer.
    const fade = (): void => { stampT = window.setTimeout(() => tween(st, HUD.stampOut, (t) => {
      st.style.opacity = String(1 - t);
      if (t >= 1) { st.hidden = true; banner.classList.remove('stamp-ending'); } }), HUD.stampHold); };
    if (calm()) { st.style.transform = ''; st.style.opacity = '1'; fade(); return; }
    tween(st, HUD.stampIn, (t) => {
      const e = springEase(t, JUICE.overshoot); st.style.opacity = String(Math.min(1, t * 6));
      st.style.transform = `translate(-50%, -50%) rotate(-3deg) scale(${HUD.stampFrom + (1 - HUD.stampFrom) * e})`;
    }, () => { pop(banner, JUICE.dur.pop, 1.08); fade(); });
  }
}
