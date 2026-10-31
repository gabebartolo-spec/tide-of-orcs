import { MetaState, RunState } from '../sim/state';

export const CURRENT_VERSION = 7;

/** Node ids removed from the tree; v1 to v2 drops them from saved levels. */
export const RETIRED_NODE_IDS = ['tide', 'current', 'flood', 'silt', 'roots'] as const;
/** v2 to v3: Blood Banners retired; one spawn clock became one per orc kind. */
export const RETIRED_V3 = ['banners'] as const;
/** v3 to v4: the Warboss summon and its nodes give way to boss waves (TB-081). */
export const RETIRED_V4 = ['warboss', 'bossfury', 'bossswarm', 'bounty'] as const;

export interface SaveV7 {
  version: 7;
  savedAt: number;
  run: RunState;
  meta: MetaState;
  settings: { volume: number; reducedMotion: boolean | null; numberFormat: 'short' | 'sci' };
}
/** v1 had the same shape but could hold retired node ids in run.levels. */
export type Save = SaveV7;

export const defaultSettings = (): SaveV7['settings'] => ({ volume: 0.7, reducedMotion: null, numberFormat: 'short' });
