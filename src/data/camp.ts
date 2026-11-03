import { OrcKind } from './orcs';

/** Elf encampment (TB-188a, docs/plans/elf-encampment.md). Permanent buildings paid in Heartwood plus each building's own
 *  material, which common orcs drop during a run and which is kept across runs. Every number here is a PLACEHOLDER, UNTUNED
 *  (director, 3 Nov: no balance sims yet); docs/BALANCE.md ## Proposed P-188 lists them. Ids are stable save keys. */

export type BuildingId = 'bowyer' | 'forge' | 'kitchen' | 'training';
export type MatId = 'sinew' | 'iron' | 'meat' | 'hide';
export type CampLevels = Partial<Record<BuildingId, number>>;
export type Mats = Partial<Record<MatId, number>>;

/** costs[n] is the price of level n+1; max level is costs.length (3, director 3 Nov). */
export interface Building { id: BuildingId; name: string; mat: MatId; costs: readonly { hw: number; mat: number }[]; desc: string }

const COSTS = [{ hw: 3, mat: 10 }, { hw: 8, mat: 30 }, { hw: 20, mat: 80 }] as const;

export const BUILDINGS: readonly Building[] = [
  { id: 'bowyer', name: 'Bowyer', mat: 'sinew', costs: COSTS, desc: 'Bow damage up, draw time down, strike circle wider.' },
  { id: 'forge', name: 'Forge', mat: 'iron', costs: COSTS, desc: 'Knives, ballista and storm hit harder; more Item Find; cheaper rerolls.' },
  { id: 'kitchen', name: 'Kitchen', mat: 'meat', costs: COSTS, desc: 'Barricade health and regen up; more starlight.' },
  { id: 'training', name: 'Training Area', mat: 'hide', costs: COSTS, desc: 'Vanguard health and damage up; faster respawn.' },
];
export const BUILDING: Readonly<Record<BuildingId, Building>> = Object.fromEntries(BUILDINGS.map((b) => [b.id, b])) as Record<BuildingId, Building>;
export const MAT_NAMES: Readonly<Record<MatId, string>> = { sinew: 'Sinew', iron: 'Orc Iron', meat: 'Game Meat', hide: 'Straw & Hide' };
export const MAT_IDS: readonly MatId[] = ['sinew', 'iron', 'meat', 'hide'];

/** Effects as totals by level (index 0 = unbuilt). Multipliers unless named Plus / Cut. */
export const CAMP_FX = {
  bowDmg: [1, 1.05, 1.1, 1.2], drawCut: [0, 0.03, 0.06, 0.1], radius: [1, 1.04, 1.08, 1.12],
  weaponDmg: [1, 1.05, 1.1, 1.2], findPlus: [0, 0.03, 0.06, 0.1], rerollCut: [0, 0.05, 0.1, 0.15],
  wallHp: [1, 1.05, 1.1, 1.2], regenPlus: [0, 0.5, 1, 2], starlight: [1, 1.03, 1.06, 1.1],
  vanHp: [1, 1.05, 1.1, 1.2], vanDmg: [1, 1.05, 1.1, 1.2], respawnCut: [0, 0.05, 0.1, 0.15],
} as const;

/** Common orcs drop materials: chance per kill, one unit of a random material. */
export const MAT_DROP = { chance: 0.05, kinds: ['grunt', 'runner', 'brute'] as readonly OrcKind[] } as const;
