import { MetaState, RunState } from '../sim/state';

export const CURRENT_VERSION = 3;

/** Node ids removed from the tree; v1 to v2 drops them from saved levels. */
export const RETIRED_NODE_IDS = ['tide', 'current', 'flood', 'silt', 'roots'] as const;
/** v2 to v3: Blood Banners retired; one spawn clock became one per orc kind. */
export const RETIRED_V3 = ['banners'] as const;

export interface SaveV3 {
  version: 3;
  savedAt: number;
  run: RunState;
  meta: MetaState;
  settings: { volume: number; reducedMotion: boolean | null; numberFormat: 'short' | 'sci' };
}
/** v1 had the same shape but could hold retired node ids in run.levels. */
export type Save = SaveV3;

export const defaultSettings = (): SaveV3['settings'] => ({ volume: 0.7, reducedMotion: null, numberFormat: 'short' });
