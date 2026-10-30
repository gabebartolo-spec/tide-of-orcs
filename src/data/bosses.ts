import { OrcKind } from './orcs';

/** Boss waves (TB-081). Every `every` waves one unlocks; the player summons it whenever they like. Mirrors docs/GDD.md §4. */
export const BOSS_WAVE = {
  every: 10,      // a boss wave unlocks at wave 10, 20, 30 …
  secs: 60,       // the challenge lasts this long
  clearLoot: 40,  // clearing every orc in time pays this × waveLoot(w) starlight
} as const;

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
