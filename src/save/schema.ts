import { MetaState, RunState } from '../sim/state';

export const CURRENT_VERSION = 2;

/** Node ids removed from the tree; v1 to v2 drops them from saved levels. */
export const RETIRED_NODE_IDS = ['tide', 'current', 'flood', 'silt', 'roots'] as const;

export interface SaveV2 {
  version: 2;
  savedAt: number;
  run: RunState;
  meta: MetaState;
  settings: { volume: number; reducedMotion: boolean | null; numberFormat: 'short' | 'sci' };
}
/** v1 had the same shape but could hold retired node ids in run.levels. */
export type Save = SaveV2;

export const defaultSettings = (): SaveV2['settings'] => ({ volume: 0.7, reducedMotion: null, numberFormat: 'short' });
