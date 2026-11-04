/** UI motion and feedback kit (TB-195a, docs/plans/game-ui.md §3–4): spring tweens, count-up numbers, press, a particle burst
 *  on a canvas overlay, stagger. Reduced motion (`data-calm` on <html>) keeps colour and sound and drops movement. Numbers in JUICE. */
import { JUICE } from '../data/presentation';
import { uiSound } from '../data/audio';
import { P } from '../render/palette';
import { renderScale } from '../render/quality';

/** easeOutBack: 0 → 1 with a slight overshoot past 1 before settling. */
export function springEase(t: number, s: number = JUICE.overshoot): number {
  const u = Math.min(1, Math.max(0, t)) - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

/** Value of a count-up `from` → `to` at progress t (ease-out cubic, no overshoot so the digits never pass the target). */
export function countValue(from: number, to: number, t: number): number {
  const k = Math.min(1, Math.max(0, t)), e = 1 - (1 - k) ** 3;
  return from + (to - from) * e;
}

/** Pop scale at progress t: `from` (e.g. 1.15) settling to 1 on the spring. */
export function popScale(t: number, from: number = JUICE.count.popFrom): number {
  return from + (1 - from) * springEase(t);
}

/** Reduced motion on: the Settings choice when the player made one, otherwise the OS preference (TB-219). */
export function wantsCalm(setting: boolean | null | undefined, os: boolean): boolean { return setting ?? os; }

/** True when the player asked for reduced motion (main.ts sets `data-calm`). */
export function calm(): boolean { return typeof document !== 'undefined' && document.documentElement.hasAttribute('data-calm'); }

const now = (): number => performance.now();
const running = new WeakMap<Element, number>();

/** Run `apply(t)` for t 0 → 1 over `ms` on rAF; a new tween on the same element and key replaces the old one. */
export function tween(el: HTMLElement, ms: number, apply: (t: number) => void, done?: () => void): void {
  const id = (running.get(el) ?? 0) + 1; running.set(el, id);
  const t0 = now();
  const step = (): void => {
    if (running.get(el) !== id) return;
    const t = Math.min(1, (now() - t0) / ms); apply(t);
    if (t < 1) requestAnimationFrame(step); else done?.();
  };
  requestAnimationFrame(step);
}

/** Scale pop (1.15 → 1 by default) on the spring. No-op under reduced motion. */
export function pop(el: HTMLElement, ms: number = JUICE.dur.pop, from: number = JUICE.count.popFrom): void {
  if (calm()) return;
  tween(el, ms, (t) => { el.style.transform = t >= 1 ? '' : `scale(${popScale(t, from)})`; });
}

/** Hover tick (TB-195k): one soft uiHover each time the pointer enters a different live control under root (buttons, tabs,
 *  path cards, satchel items). Moving inside one control stays quiet; CUES.uiHover.gap caps a fast sweep. */
export function armHover(root: HTMLElement): void {
  let last: Element | null = null;
  root.addEventListener('pointerover', (e) => {
    const el = (e.target as HTMLElement).closest?.('button:not(:disabled), [role=tab], [data-uid]') ?? null;
    if (el && el !== last) uiSound('uiHover');
    last = el;
  });
}

/** Press feedback: the button sinks, then springs back, with the press sound. Reduced motion keeps the sound. */
export function press(el: HTMLElement): void {
  uiSound('uiPress');
  if (calm()) return;
  const { scale, down, up } = JUICE.press;
  tween(el, down, (t) => { el.style.transform = `scale(${1 + (scale - 1) * t})`; }, () =>
    tween(el, up, (t) => { el.style.transform = t >= 1 ? '' : `scale(${scale + (1 - scale) * springEase(t)})`; }));
}

/** Flash an element's text colour (green up, red down), kept under reduced motion. */
export function flash(el: HTMLElement, up: boolean): void {
  el.style.transition = 'none'; el.style.color = up ? P.grove : P.rose;
  window.clearTimeout(Number(el.dataset.flashT ?? 0));
  el.dataset.flashT = String(window.setTimeout(() => { el.style.transition = `color ${JUICE.count.flash}ms`; el.style.color = ''; }, JUICE.count.flash / 2));
}

/** A number that rolls to each new value, pops and flashes green (up) or red (down). */
export class CountUp {
  private shown: number | null = null;
  private target = 0;
  constructor(private el: HTMLElement, private format: (n: number) => string) {}
  set(v: number): void {
    if (this.shown === null) { this.shown = this.target = v; this.el.textContent = this.format(v); return; }
    if (v === this.target) return;
    const up = v > this.target, from = this.shown; this.target = v;
    flash(this.el, up);
    if (up) uiSound('uiCount'); // throttled by CUES.uiCount.gap so a fast climb ticks, not buzzes
    if (calm()) { this.shown = v; this.el.textContent = this.format(v); return; }
    pop(this.el);
    const box = this.el.parentElement ?? this.el; // drive the roll from the parent so it does not cancel the pop
    tween(box, JUICE.count.dur, (t) => { this.shown = t >= 1 ? v : countValue(from, v, t); this.el.textContent = this.format(Math.round(this.shown)); });
  }
}

interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string }
interface Flare { x: number; y: number; life: number; r: number; color: string }
let overlay: HTMLCanvasElement | null = null;
const sparks: Spark[] = [];
const flares: Flare[] = [];
let looping = false;
let overlayScale = 1;

function ensureOverlay(): CanvasRenderingContext2D | null {
  if (!overlay) {
    overlay = document.createElement('canvas'); overlay.id = 'juice-overlay';
    Object.assign(overlay.style, { position: 'fixed', inset: '0', width: '100%', height: '100dvh', pointerEvents: 'none', zIndex: '1000' });
    document.body.appendChild(overlay);
  }
  // the shared backing scale (TB-218 P3); the canvas is released (0x0) whenever no spark or flare is alive (P4)
  const dpr = overlayScale = renderScale(innerWidth, innerHeight), w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
  if (overlay.width !== w || overlay.height !== h) { overlay.width = w; overlay.height = h; }
  return overlay.getContext('2d');
}

/** Launch velocity for a spark at u ∈ 0..1 across the fan: ±fan round straight up, plus the lift kick. Pure, for tests. */
export function sparkVelocity(u: number, speed: number, fan: number = JUICE.burst.fan, lift: number = JUICE.burst.lift): { vx: number; vy: number } {
  const a = -Math.PI / 2 + (u * 2 - 1) * fan;
  return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - lift };
}

/** Root font px: burst sizes and speeds are in rem so they read the same at 1080p and 4K. */
const remPx = (): number => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/** Particle burst at client (x, y) on a canvas over the whole DOM: glowing sparks arc up and fall, with a flare ring at the
 *  origin. `scale` multiplies count and size (a HUD sparkle is ~0.3). Dropped under reduced motion. */
export function burst(x: number, y: number, colors: readonly string[] = [P.starGold, P.spark, P.amber], scale = 1): void {
  if (calm() || !ensureOverlay()) return;
  const B = JUICE.burst, rem = remPx(), r = (a: number, b: number): number => a + Math.random() * (b - a);
  const n = Math.max(4, Math.round(B.count * scale)), k = Math.sqrt(scale);
  for (let i = 0; i < n; i++) {
    const life = r(B.lifeMin, B.lifeMax), v = sparkVelocity(Math.random(), r(B.speedMin, B.speedMax) * rem * k, B.fan, B.lift * rem * k);
    const sa = Math.random() * Math.PI * 2, sd = Math.sqrt(Math.random()) * B.spawn * rem * k;
    sparks.push({ x: x + Math.cos(sa) * sd, y: y + Math.sin(sa) * sd, vx: v.vx, vy: v.vy, life, max: life, size: r(B.sizeMin, B.sizeMax) * rem * k, color: colors[i % colors.length]! });
  }
  flares.push({ x, y, life: B.flareLife, r: B.flare * rem * k, color: colors[0]! });
  if (!looping) { looping = true; let last = now(); const frame = (): void => {
    const t = now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
    const ctx = ensureOverlay(); if (!ctx) { looping = false; return; }
    const dpr = overlayScale, drag = B.drag ** (dt * 60), g = B.gravity * remPx();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, innerWidth, innerHeight); ctx.globalCompositeOperation = 'source-over';
    for (let i = flares.length - 1; i >= 0; i--) {
      const f = flares[i]!; f.life -= dt; if (f.life <= 0) { flares.splice(i, 1); continue; }
      const p = 1 - f.life / B.flareLife;
      ctx.globalAlpha = (1 - p) * 0.8; ctx.strokeStyle = f.color; ctx.lineWidth = f.r * 0.12 * (1 - p) + 1;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.3 + 0.7 * p), 0, Math.PI * 2); ctx.stroke();
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]!; s.life -= dt; if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.vx *= drag; s.vy = s.vy * drag + g * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const a = s.life / s.max, rad = s.size * (0.5 + 0.5 * a);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = a * B.glowAlpha; ctx.beginPath(); ctx.arc(s.x, s.y, rad * B.glow, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (sparks.length || flares.length) requestAnimationFrame(frame); else { overlay!.width = 0; overlay!.height = 0; looping = false; }
  }; requestAnimationFrame(frame); }
}

/** Burst from an element's centre. */
export function burstAt(el: Element, colors?: readonly string[], scale = 1): void {
  const b = el.getBoundingClientRect(); burst(b.left + b.width / 2, b.top + b.height / 2, colors, scale);
}

/** Delay (ms) of child i in a staggered list. */
export const staggerDelay = (i: number, gap: number = JUICE.stagger): number => i * gap;

/** Enter each child `gap` ms after the last: fade and rise on the panel spring. Reduced motion shows them at once. */
export function stagger(parent: HTMLElement, gap: number = JUICE.stagger): void {
  const kids = Array.from(parent.children) as HTMLElement[];
  if (calm()) return;
  kids.forEach((k, i) => {
    k.style.opacity = '0';
    window.setTimeout(() => tween(k, JUICE.dur.panel, (t) => {
      k.style.opacity = String(Math.min(1, t * 2)); k.style.transform = t >= 1 ? '' : `translateY(${(1 - springEase(t)) * JUICE.rise}px)`;
    }), staggerDelay(i, gap));
  });
}
