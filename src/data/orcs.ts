/** Orc archetypes. Mirrors docs/GDD.md §4. Grunts march from wave 1; each other kind joins the tide on its own from its `from` wave (TB-158). */
export type OrcKind = 'grunt' | 'runner' | 'brute' | 'elite' | 'berserker' | 'wolfrider' | 'shaman' | 'drummer' | 'boss';
export const ORC_KINDS: readonly OrcKind[] = ['grunt', 'runner', 'brute', 'elite', 'berserker', 'wolfrider', 'shaman', 'drummer', 'boss'];

/** every: seconds between spawns as a multiple of the wave's grunt interval; from: first wave it marches (0 = only with a boss wave, see bosses.ts). */
export interface OrcType { kind: OrcKind; hp: number; speed: number; loot: number; radius: number; every: number; from: number }

export const ORC_TYPES: Readonly<Record<OrcKind, OrcType>> = {
  grunt: { kind: 'grunt', hp: 1.0, speed: 48, loot: 1.0, radius: 12, every: 1, from: 1 },
  runner: { kind: 'runner', hp: 0.55, speed: 78, loot: 0.7, radius: 9, every: 1.5, from: 5 },
  brute: { kind: 'brute', hp: 3.2, speed: 34, loot: 3.0, radius: 16, every: 4, from: 10 },
  elite: { kind: 'elite', hp: 8, speed: 42, loot: 8, radius: 14, every: 10, from: 20 },
  // TB-087 (P-087): join waves are sim placeholders until the director picks them
  berserker: { kind: 'berserker', hp: 2.5, speed: 40, loot: 3.5, radius: 14, every: 6, from: 25 },
  wolfrider: { kind: 'wolfrider', hp: 2.0, speed: 90, loot: 3.0, radius: 15, every: 5, from: 30 },
  shaman: { kind: 'shaman', hp: 2.0, speed: 36, loot: 4.0, radius: 12, every: 9, from: 35 },
  drummer: { kind: 'drummer', hp: 4.0, speed: 30, loot: 6.0, radius: 16, every: 14, from: 40 },
  boss: { kind: 'boss', hp: 28, speed: 26, loot: 30, radius: 24, every: 0, from: 0 }, // marches only in a boss wave
};

/** The orc shaman's ranged fireball (TB-127, GDD §4): seconds aloft, arc height (units), strike radius,
 *  seconds between casts and damage as a multiple of a grunt's swing (TB-087). */
export const FIREBALL = { flight: 0.9, arc: 55, radius: 24, every: 4, gruntHits: 3 } as const;

/** TB-087 behaviours (P-087). Halts are units in front of the wall's face. */
export const ORC_FX = {
  /** Berserker: below this share of health it runs and hits harder. */
  rageAt: 0.5, rageSpeed: 1.8, rageHit: 2,
  /** Shaman and war drummer stop this far from the wall. */
  shamanHalt: 180, drummerHalt: 260,
  /** War drummer: orcs within reach march and hit this much harder (one drum's worth, never stacked). */
  drumReach: 100, drumBoost: 0.3,
} as const;

/** Per rank of a kind's two nodes: Fury (health and starlight) and Swarm (spawn rate). A kind that joins on its own marches at
 *  half rate until its summon node (TB-158), which doubles its base rate and adds half again to its starlight. */
export const FOE_FX = { hp: 1.3, loot: 1.4, spawn: 1.2, unsummonedSpawn: 0.5, summonSpawn: 2, summonLoot: 1.5 } as const;
