/** Render quality tier and adaptive governor (TB-218 P2, P3). Pure decisions plus one small runtime state the renderers read.
 *  Desktop keeps its old look: scale cap 2, live shadows and glow, no frame cap. The phone tier lowers the field's backing
 *  scale, bakes the cheap stand-ins, caps the draw rate at 60 on a 120 Hz screen and steps the scale down on sustained load. */
import { QUALITY } from '../data/presentation';

export type Tier = 'phone' | 'desktop';
export type QualityPref = 'auto' | 'high' | 'low';
export interface Probe { coarse: boolean; memGb: number; cores: number }

/** Phone tier on a touch screen, or on a weak device whatever the pointer (<= QUALITY.weakMemGb GB or <= QUALITY.weakCores cores). */
export function pickTier(p: Probe): Tier {
  return p.coarse || p.memGb <= QUALITY.weakMemGb || p.cores <= QUALITY.weakCores ? 'phone' : 'desktop';
}

/** Backing-store scale (device px per CSS px) for a canvas of css size w x h: the device ratio capped at `cap`, then reduced
 *  until the backing store fits `mpCap` megapixels (0 = no limit). Pure. */
export function fitScale(dpr: number, cap: number, w: number, h: number, mpCap: number): number {
  let s = Math.max(1, Math.min(dpr, cap));
  if (mpCap > 0 && w > 0 && h > 0) s = Math.min(s, Math.sqrt(mpCap * 1e6 / (w * h)));
  return Math.max(QUALITY.minScale, s);
}

/** The governor: feeds on draw-to-draw frame times, steps down the scale ladder after a sustained slow stretch, back up after a
 *  long fast one; at the lowest rung a still-slow phone drops to the 30 fps floor. Pure state machine, ms in. */
export class Governor {
  rung: number;
  /** True while at the lowest rung and still slow: the draw cap is the slow gap. */
  floor = false;
  /** Ring of the last `window` frame times; the mean is judged every `every` frames, and the time since the last judgement is credited to slow or fast. */
  private ring = new Float64Array(QUALITY.governor.window); private work = new Float64Array(QUALITY.governor.window);
  private n = 0; private sum = 0; private workSum = 0; private since = 0; private ms = 0; private slow = 0; private fast = 0;
  /** Seconds the governor has judged, when it last stepped up, and how long a calm stretch must now last (doubles after a step up that was undone at once). */
  private clock = 0; private lastUp = -Infinity; private upAfter: number = QUALITY.governor.upAfter;
  constructor(private ladder: readonly number[], start: number) { this.rung = Math.max(0, ladder.indexOf(start)); }
  get scale(): number { return this.ladder[this.rung]!; }
  /** One frame: `ms` since the previous draw, `workMs` the time the draw call itself took. Slow is judged on the draw-to-draw interval
   *  (never at the floor, where the interval is the cap itself); fast on the draw's own cost, because a paced draw can never arrive sooner
   *  than the cap and the interval alone could not show spare time. Returns true when the scale or floor changed. */
  frame(ms: number, workMs: number = ms): boolean {
    const G = QUALITY.governor, i = this.n % G.window; ms = Math.min(ms, 100); workMs = Math.min(workMs, 100);   // a stall (tab away, camp) is not load
    this.sum += ms - this.ring[i]!; this.ring[i] = ms; this.workSum += workMs - this.work[i]!; this.work[i] = workMs; this.n++; this.since++; this.ms += ms;
    if (this.n < G.window || this.since < G.every) return false;
    const mean = this.sum / G.window, workMean = this.workSum / G.window, secs = this.ms / 1000; this.since = 0; this.ms = 0; this.clock += secs;
    if (mean > G.slowMs && !this.floor) { this.slow += secs; this.fast = 0; }
    else if (workMean < G.fastMs) { this.fast += secs; this.slow = 0; }
    else { this.slow = 0; this.fast = 0; }
    if (this.slow >= G.downAfter) {
      this.slow = 0;
      if (this.clock - this.lastUp < G.undoWithin) this.upAfter = Math.min(this.upAfter * 2, G.upAfterMax);
      if (this.rung < this.ladder.length - 1) { this.rung++; return true; }
      if (!this.floor) { this.floor = true; return true; }
    } else if (this.fast >= this.upAfter) {
      this.fast = 0; this.lastUp = this.clock;
      if (this.floor) { this.floor = false; return true; }
      if (this.rung > 0) { this.rung--; return true; }
    }
    return false;
  }
}

export interface Quality {
  tier: Tier;
  /** Field backing scale cap right now. */
  scale: number;
  /** Minimum ms between draws (0 = every frame). */
  drawGap: number;
  /** Phone tier: prebaked orc shadow, no shadowBlur, baked flash frames. */
  cheap: boolean;
  /** Particle pool cap. */
  parts: number;
}

const probeNow = (): Probe => {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return { coarse: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches, memGb: nav.deviceMemory ?? 8, cores: nav.hardwareConcurrency ?? 8 };
};
const PREF_KEY = 'tide.quality';
export function storedPref(): QualityPref {
  try { const v = localStorage.getItem(PREF_KEY); return v === 'high' || v === 'low' ? v : 'auto'; } catch { return 'auto'; }
}

class State {
  tier: Tier = 'desktop';
  pref: QualityPref = 'auto';
  gov: Governor | null = null;
  /** Bumped whenever scale or tier changes, so renderers know to resize. */
  rev = 0;
  init(probe: Probe = probeNow(), pref: QualityPref = storedPref()): void {
    this.tier = pickTier(probe); this.pref = pref;
    this.gov = this.tier === 'phone' && pref === 'auto' ? new Governor(QUALITY.ladder, QUALITY.phoneStart) : null;
    this.rev++;
  }
  setPref(p: QualityPref): void {
    try { localStorage.setItem(PREF_KEY, p); } catch { /* storage blocked: lasts this page only */ }
    this.init(probeNow(), p);
  }
  get q(): Quality {
    const phone = this.tier === 'phone', Q = QUALITY;
    const scale = !phone ? Q.desktopScale : this.pref === 'high' ? Q.phoneHigh : this.pref === 'low' ? Q.minScale : this.gov!.scale;
    const slowFloor = this.pref === 'low' || (this.gov?.floor ?? false);
    const o = this.qObj;   // one reused record: this getter runs several times a frame, so it must not allocate (TB-218)
    o.tier = this.tier; o.scale = scale; o.drawGap = !phone ? 0 : slowFloor ? Q.gapFloor : Q.gap60; o.cheap = phone; o.parts = phone ? Q.phoneParts : Q.deskParts;
    return o;
  }
  private qObj = { tier: 'desktop', scale: 1, drawGap: 0, cheap: false, parts: 0 } as unknown as { -readonly [K in keyof Quality]: Quality[K] };
  /** Feed one draw interval; true when the field should resize. */
  frame(ms: number, workMs: number = ms): boolean { if (this.gov?.frame(ms, workMs)) { this.rev++; return true; } return false; }
}
export const quality = new State();
quality.init();

/** One backing scale for every canvas (field, camp, tree, juice): the device ratio, capped on the phone tier at QUALITY.shared and
 *  QUALITY.sharedMp megapixels; the desktop tier is unchanged (device ratio, no cap beyond the caller's own). */
export function renderScale(cssW: number, cssH: number, dpr = window.devicePixelRatio || 1): number {
  return quality.tier === 'phone' ? fitScale(dpr, QUALITY.shared, cssW, cssH, QUALITY.sharedMp) : dpr;
}
