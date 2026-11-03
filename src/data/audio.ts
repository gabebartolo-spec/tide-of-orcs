/** Audio cue table: which SFX file each sim event plays, at what gain, how often. Files live in public/audio/<cue>.ogg|.mp3. */
import type { SimEvent } from '../sim/events';

export type Cue =
  | 'loose' | 'arrowHit' | 'knife' | 'ignite' | 'orcHit' | 'orcDeath' | 'bruteDeath' | 'bossRoar'
  | 'wallThud' | 'wallCreak' | 'wallFall' | 'rallyHorn' | 'replant' | 'click' | 'bought' | 'denied'
  | 'fireArrow' | 'bounce' | 'shock' | 'stun' | 'frost' | 'shatter' | 'starfall'
  | 'fireballCast' | 'fireballHit'
  | 'lootDrop' | 'lootRare' | 'lootEpic' | 'lootLegendary' | 'lootMythic' | 'equip' | 'salvage' | 'reroll' | 'setRise'
  | 'warDrum'
  | 'uiPress' | 'uiPop' | 'uiHover' | 'uiPanel' | 'uiCount' | 'uiStamp' | 'uiRarity' | 'uiPath';

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

/** Per-cue gain, minimum seconds between plays (throttle) and an optional `file` stem under public/audio/ (default: the cue name). */
export const CUES: Record<Cue, { gain: number; gap: number; duck?: boolean; file?: string }> = {
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
  // UI clicks, buys and refusals use the carved-wood UI set (TB-195g, public/audio/ui)
  click: { gain: 0.5, gap: 0.03, file: 'ui/click' },
  bought: { gain: 0.7, gap: 0.05, file: 'ui/buy' },
  denied: { gain: 0.6, gap: 0.15, file: 'ui/error' },
  // Arrow enchantments (TB-089, ElevenLabs)
  fireArrow: { gain: 0.5, gap: 0.2 },
  bounce: { gain: 0.45, gap: 0.08 },
  shock: { gain: 0.55, gap: 0.2 },
  stun: { gain: 0.5, gap: 0.25 },
  frost: { gain: 0.5, gap: 0.2 },
  shatter: { gain: 0.6, gap: 0.12 },
  starfall: { gain: 0.8, gap: 1 },
  // Orc shaman fireball (TB-127, ElevenLabs): the whoosh-ignite as it leaves the staff, the blast where it lands
  fireballCast: { gain: 0.55, gap: 0.2 },
  fireballHit: { gain: 0.65, gap: 0.15 },
  // Loot (TB-106, ElevenLabs): a drop chimes by rarity, satchel actions from the UI
  lootDrop: { gain: 0.35, gap: 0.15 },
  lootRare: { gain: 0.5, gap: 0.2 },
  lootEpic: { gain: 0.65, gap: 0.3 },
  lootLegendary: { gain: 0.8, gap: 0.5, duck: true },
  lootMythic: { gain: 1, gap: 1, duck: true },
  equip: { gain: 0.6, gap: 0.05, file: 'ui/equip' },
  salvage: { gain: 0.55, gap: 0.05 },
  reroll: { gain: 0.55, gap: 0.05 },
  setRise: { gain: 0.8, gap: 0.5, duck: true },
  // Orc war drum (ElevenLabs), on every drumBeat (TB-182)
  warDrum: { gain: 1, gap: 0.4 },
  // UI sound set (TB-195a hooks, TB-195g ElevenLabs files in public/audio/ui): carved wood with a soft elven shimmer.
  // TB-195k: hover ticks on entering a control (ui/juice armHover), stamp on buy and equip, rarity on a rare+ drop banner, path on picking a path.
  uiPress: { gain: 0.3, gap: 0.03, file: 'ui/click' },
  uiPop: { gain: 0.45, gap: 0.05, file: 'ui/tab' },
  uiHover: { gain: 0.2, gap: 0.09, file: 'ui/hover' },
  uiPanel: { gain: 0.4, gap: 0.2, file: 'ui/panel' },
  uiCount: { gain: 0.12, gap: 0.25, file: 'ui/count' },
  uiStamp: { gain: 0.7, gap: 0.3, file: 'ui/stamp' },
  uiRarity: { gain: 0.8, gap: 1, duck: true, file: 'ui/rarity' },
  uiPath: { gain: 0.7, gap: 0.5, file: 'ui/path' },
};

/** UI sound hook (TB-195a): the kit calls `uiSound(cue)`; main.ts points it at the audio engine. Never throws, so a missing engine or file is silent. */
let uiSink: (c: Cue) => void = () => {};
export function setUiSound(fn: (c: Cue) => void): void { uiSink = fn; }
export function uiSound(c: Cue): void { try { uiSink(c); } catch { /* silent until the UI sound set lands */ } }

/** Drop chime per rarity; a common one is the quiet tick. */
export const LOOT_CUE: Record<string, Cue> = { common: 'lootDrop', rare: 'lootRare', epic: 'lootEpic', legendary: 'lootLegendary', mythic: 'lootMythic' };

/** Pure mapping from one sim event to the cue it plays, or null. */
export function cueFor(e: SimEvent): Cue | null {
  switch (e.t) {
    case 'loose': return 'loose';
    case 'knife': return 'knife';
    case 'ignite': return 'ignite';
    case 'hit': return 'arrowHit';
    case 'kill': return e.kind === 'boss' || e.kind === 'brute' || e.kind === 'elite' || e.kind === 'drummer' ? 'bruteDeath' : 'orcDeath';
    case 'barricadeHit': return e.frac < AUDIO.creakFrac ? 'wallCreak' : 'wallThud';
    case 'barricadeFell': return 'wallFall';
    case 'bossStart': return 'bossRoar';
    case 'vanguardRallied': return 'rallyHorn';
    case 'vanguardHit': return 'orcHit';
    case 'bought': return 'bought';
    case 'fireStrike': return 'fireArrow';
    case 'bounceHit': return 'bounce';
    case 'shock': return 'shock';
    case 'stun': return 'stun';
    case 'chill': return 'frost';
    case 'shatter': return 'shatter';
    case 'starfall': return 'starfall';
    case 'fireballCast': return 'fireballCast';
    case 'drumBeat': return 'warDrum';
    case 'fireballStrike': return 'fireballHit'
    case 'loot': return e.kept ? LOOT_CUE[e.rarity] ?? 'lootDrop' : null;
    case 'replant': return 'replant';
    default: return null;
  }
}
