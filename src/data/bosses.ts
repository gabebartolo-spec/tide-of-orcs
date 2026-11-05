import { OrcKind } from './orcs';

/** Boss waves (TB-081). Every `every` waves one unlocks; the player summons it whenever they like. Mirrors docs/GDD.md §4. */
export const BOSS_WAVE = {
  every: 25,      // a boss wave unlocks at wave 25, 50, 75 … (P-142)
  secs: 60,       // the challenge lasts this long
  clearLoot: 40,  // clearing every orc in time pays this × waveLoot(w) starlight
  hwPerTier: 3,   // …and hwPerTier × (wave ÷ every) Heartwood: 3 at wave 25, 6 at 50 (P-142)
} as const;

/** Heartwood a cleared boss pays at this wave (P-142). The only source of Heartwood (TB-171). */
export const bossHw = (wave: number): number => BOSS_WAVE.hwPerTier * Math.max(1, Math.floor(wave / BOSS_WAVE.every));

/** One mini-wave: at `at` seconds into the challenge, one orc of `kind` per entry of `ys` (fraction of field height). */
export interface MiniWave { at: number; kind: OrcKind; ys: readonly number[] }

/** The bespoke arrangement every boss wave plays. Regular marching pauses while it runs. */
export const BOSS_SCRIPT: readonly MiniWave[] = [
  { at: 0, kind: 'grunt', ys: [0.2, 0.35, 0.5, 0.65, 0.8] },          // a shield line
  { at: 6, kind: 'runner', ys: [0.12, 0.28, 0.72, 0.88] },             // flankers on the edges
  { at: 12, kind: 'brute', ys: [0.35, 0.65] },                         // a pair of rams
  { at: 18, kind: 'grunt', ys: [0.5, 0.42, 0.58, 0.34, 0.66] },        // a wedge
  { at: 24, kind: 'boss', ys: [0.5] },                                 // the Warboss
  { at: 24, kind: 'elite', ys: [0.38, 0.62] },                         // his guard
  { at: 32, kind: 'runner', ys: [0.1, 0.25, 0.4, 0.55, 0.7, 0.85] },   // a scatter
  { at: 40, kind: 'brute', ys: [0.2, 0.5, 0.8] },                      // the last push
];

/** The escort a boss wave gains from each tier on (TB-087, director 3 Nov): every orc kind marches in boss stages by difficulty. */
export const TIER_ESCORT: readonly (MiniWave & { tier: number })[] = [
  { tier: 2, at: 12, kind: 'berserker', ys: [0.25, 0.75] },            // beside the rams
  { tier: 3, at: 30, kind: 'wolfrider', ys: [0.15, 0.85] },            // riders round the flanks
  { tier: 4, at: 18, kind: 'shaman', ys: [0.3, 0.7] },                 // fire behind the wedge
  { tier: 5, at: 24, kind: 'drummer', ys: [0.44, 0.56] },              // drums beside the Warboss
];

const scripts: MiniWave[][] = [];
/** The boss wave played at a tier: BOSS_SCRIPT plus every escort up to that tier, in marching order. */
export function bossScript(tier: number): readonly MiniWave[] {
  return (scripts[tier] ??= [...BOSS_SCRIPT, ...TIER_ESCORT.filter((e) => e.tier <= tier)].sort((a, b) => a.at - b.at));
}

/** Boss roster (TB-230, GDD §4, director 5 Nov): the orc in the boss wave's Warboss slot (`kind: 'boss'`) rotates in this
 *  fixed order by boss wave (wave 25 first, 50 second, …), repeating. Data only: every entry fights as OrcKind 'boss'.
 *  `sprite` is its atlas key under `orc.`; an entry whose art is not in the atlas draws exactly as the Warboss. */
export const BOSS_ROSTER = [
  { id: 'warboss', name: 'Warboss', sprite: 'boss' },
  { id: 'ogre', name: 'Ogre', sprite: 'ogre' },                          // TB-211 Troll_Orc
  { id: 'orc', name: 'Orc', sprite: 'orcBoss' },                         // TB-213 dartuchiwa "Orc"
  { id: 'packed', name: 'Orc Raider', sprite: 'packed' },                // TB-214 3DE_Study packed orc
  { id: 'ogreCreature', name: 'Ogre Creature', sprite: 'ogreCreature' }, // TB-228 Sazerac
] as const;
export type BossEntry = (typeof BOSS_ROSTER)[number];
export type BossId = BossEntry['id'];

/** The roster boss a boss wave at this wave brings: index wave ÷ every − 1 (25 → 0), repeating; below 25 counts as the first. */
export function bossFor(wave: number): BossEntry {
  const n = Math.max(0, Math.floor(wave / BOSS_WAVE.every) - 1);
  return BOSS_ROSTER[n % BOSS_ROSTER.length]!;
}

/** Boss tiers (TB-148, dev plan §8 #1, Nodebuster): clearing a boss wave while playing your highest tier unlocks the
 *  next one for good; at March the player picks any tier unlocked. Each tier above the first multiplies orc HP and
 *  starlight per kill, and boss Heartwood, from wave 1. `max: 1` keeps tiers off (P-148 proposes the numbers). */
export const TIERS = {
  max: 6,     // highest tier that can be unlocked; 1 = tiers off
  hp: 2,      // orc HP × hp^(tier − 1)
  loot: 1.5,  // starlight per kill and per boss clear × loot^(tier − 1)
  hw: 1,      // boss Heartwood × (1 + hw × (tier − 1))
};

export const tierHp = (tier: number): number => TIERS.hp ** (tier - 1);
export const tierLoot = (tier: number): number => TIERS.loot ** (tier - 1);
export const tierHw = (tier: number): number => 1 + TIERS.hw * (tier - 1);
