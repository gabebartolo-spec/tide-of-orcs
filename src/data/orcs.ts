/** Orc archetypes. Mirrors docs/GDD.md §4. */
export type OrcKind = 'grunt' | 'runner' | 'brute' | 'boss';

export interface OrcType { kind: OrcKind; hp: number; speed: number; loot: number; radius: number }

export const ORC_TYPES: Readonly<Record<OrcKind, OrcType>> = {
  grunt: { kind: 'grunt', hp: 1.0, speed: 48, loot: 1.0, radius: 12 },
  runner: { kind: 'runner', hp: 0.55, speed: 78, loot: 0.7, radius: 9 },
  brute: { kind: 'brute', hp: 3.2, speed: 34, loot: 3.0, radius: 16 },
  boss: { kind: 'boss', hp: 28, speed: 26, loot: 30, radius: 24 },
};

/** Spawn roll shares as functions of wave. Boss handled separately (waves % 10, 8% roll, one at a time). */
export const runnerShare = (w: number): number => 0.15 + Math.min(0.2, w * 0.01);
export const bruteShare = (w: number): number => 0.18 + Math.min(0.15, w * 0.005);
export const BOSS = { everyWaves: 10, rollChance: 0.08 } as const;
