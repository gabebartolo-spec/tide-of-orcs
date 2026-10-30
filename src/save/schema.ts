import { MetaState, RunState } from '../sim/state';

export const CURRENT_VERSION = 1;

export interface SaveV1 {
  version: 1;
  savedAt: number;
  run: RunState;
  meta: MetaState;
  settings: { volume: number; reducedMotion: boolean | null; numberFormat: 'short' | 'sci' };
}
export type Save = SaveV1;

export const defaultSettings = (): SaveV1['settings'] => ({ volume: 0.7, reducedMotion: null, numberFormat: 'short' });
