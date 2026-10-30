/** Audio cue table: which SFX file each sim event plays, at what gain, how often. Files live in public/audio/<cue>.ogg|.mp3. */
import type { SimEvent } from '../sim/events';

export type Cue =
  | 'loose' | 'arrowHit' | 'knife' | 'ignite' | 'orcHit' | 'orcDeath' | 'bruteDeath' | 'bossRoar'
  | 'wallThud' | 'wallCreak' | 'wallFall' | 'rallyHorn' | 'replant' | 'click' | 'bought' | 'denied';

export const AMBIENT = 'ambient';

/** Music beds, alternated each run; Replant crossfades to the next. Files: public/audio/<bed>.ogg|.mp3. */
export const MUSIC = ['music-a', 'music-b'] as const;
export type Bed = (typeof MUSIC)[number];

/** Boss-wave track: plays from its start on `bossStart`, fades back to the run's bed on `bossEnd` or Replant. */
export const BOSS_BED = 'music-boss';

/** Bed that follows `bed` on Replant. */
export function nextBed(bed: Bed): Bed { return bed === 'music-a' ? 'music-b' : 'music-a'; }

export const AUDIO = {
  sfxGain: 0.8,
  ambientGain: 0.35,
  duckGain: 0.12,       // ambient level while a ducking cue plays
  duckRelease: 1.6,     // seconds back to full ambient
  musicGain: 0.3,
  musicDuckGain: 0.1,   // music level while a ducking cue plays
  crossfade: 4,         // seconds to swap music beds on Replant
  bossFade: 1.5,        // seconds into / out of the boss track
  pitchJitter: 0.06,    // ± playbackRate spread so repeats don't machine-gun
  creakFrac: 0.5,       // a hit that leaves the wall below this fraction creaks instead of thuds
} as const;

/** Per-cue gain and minimum seconds between plays (throttle for high-rate events). */
export const CUES: Record<Cue, { gain: number; gap: number; duck?: boolean }> = {
  loose: { gain: 0.5, gap: 0.08 },
  arrowHit: { gain: 0.45, gap: 0.05 },
  knife: { gain: 0.5, gap: 0.08 },
  ignite: { gain: 0.5, gap: 0.2 },
  orcHit: { gain: 0.6, gap: 0.12 },
  orcDeath: { gain: 0.6, gap: 0.1 },
  bruteDeath: { gain: 0.8, gap: 0.25 },
  bossRoar: { gain: 1, gap: 2, duck: true },
  wallThud: { gain: 0.7, gap: 0.15 },
  wallCreak: { gain: 0.7, gap: 1.2 },
  wallFall: { gain: 1, gap: 2, duck: true },
  rallyHorn: { gain: 0.9, gap: 0.5, duck: true },
  replant: { gain: 0.9, gap: 1, duck: true },
  click: { gain: 0.5, gap: 0.03 },
  bought: { gain: 0.7, gap: 0.05 },
  denied: { gain: 0.6, gap: 0.15 },
};

/** Pure mapping from one sim event to the cue it plays, or null. */
export function cueFor(e: SimEvent): Cue | null {
  switch (e.t) {
    case 'hit': return 'arrowHit';
    case 'kill': return e.kind === 'boss' || e.kind === 'brute' || e.kind === 'elite' ? 'bruteDeath' : 'orcDeath';
    case 'barricadeHit': return e.frac < AUDIO.creakFrac ? 'wallCreak' : 'wallThud';
    case 'barricadeFell': return 'wallFall';
    case 'vanguardRallied': return 'rallyHorn';
    case 'vanguardHit': return 'orcHit';
    case 'bought': return 'bought';
    case 'replant': return 'replant';
    default: return null;
  }
}
