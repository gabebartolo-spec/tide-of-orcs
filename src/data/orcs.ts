/** Orc archetypes. Mirrors docs/GDD.md §4. Only grunts march at first; every other kind is summoned by its tree node. */
export type OrcKind = 'grunt' | 'runner' | 'brute' | 'elite' | 'boss';
export const ORC_KINDS: readonly OrcKind[] = ['grunt', 'runner', 'brute', 'elite', 'boss'];

/** every: seconds between spawns as a multiple of the wave's grunt interval (the Warboss comes only with a boss wave, see bosses.ts). */
export interface OrcType { kind: OrcKind; hp: number; speed: number; loot: number; radius: number; every: number }

export const ORC_TYPES: Readonly<Record<OrcKind, OrcType>> = {
  grunt: { kind: 'grunt', hp: 1.0, speed: 48, loot: 1.0, radius: 12, every: 1 },
  runner: { kind: 'runner', hp: 0.55, speed: 78, loot: 0.7, radius: 9, every: 1.5 },
  brute: { kind: 'brute', hp: 3.2, speed: 34, loot: 3.0, radius: 16, every: 4 },
  elite: { kind: 'elite', hp: 8, speed: 42, loot: 8, radius: 14, every: 10 },
  boss: { kind: 'boss', hp: 28, speed: 26, loot: 30, radius: 24, every: 0 }, // marches only in a boss wave
};

/** The orc shaman's ranged fireball (TB-127, GDD §4): seconds aloft, arc height (units) and strike radius.
 *  Damage, cast cadence and the shaman's own stats come with its wave design (TB-087). */
export const FIREBALL = { flight: 0.9, arc: 55, radius: 24 } as const;

/** Per rank of a kind's two nodes: Fury (health and starlight) and Swarm (spawn rate). */
export const FOE_FX = { hp: 1.3, loot: 1.4, spawn: 1.2 } as const;
