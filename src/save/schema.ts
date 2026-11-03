import { MetaState, RunState } from '../sim/state';
import { VOLUME_MAX, VOLUME_MIN } from '../data/settings';
import { TEXT_SCALE_MAX, TEXT_SCALE_MIN } from '../render/textScale';

export const CURRENT_VERSION = 15;

/** Node ids removed from the tree; v1 to v2 drops them from saved levels. */
export const RETIRED_NODE_IDS = ['tide', 'current', 'flood', 'silt', 'roots'] as const;
/** v2 to v3: Blood Banners retired; one spawn clock became one per orc kind. */
export const RETIRED_V3 = ['banners'] as const;
/** v3 to v4: the Warboss summon and its nodes give way to boss waves (TB-081). */
export const RETIRED_V4 = ['warboss', 'bossfury', 'bossswarm', 'bounty'] as const;

export interface SaveV15 {
  version: 15;
  savedAt: number;
  run: RunState;
  meta: MetaState;
  settings: { volume: number; reducedMotion: boolean | null; numberFormat: 'short' | 'sci'; textScale: number };
}
/** v1 had the same shape but could hold retired node ids in run.levels. */
export type Save = SaveV15;

export const defaultSettings = (): SaveV15['settings'] => ({ volume: 0.7, reducedMotion: null, numberFormat: 'short', textScale: 1 });

const clampNum = (v: unknown, lo: number, hi: number, d: number): number => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
/** Imported or loaded settings, clamped and coerced field by field; anything unusable falls back to the default (TB-199). */
export function sanitizeSettings(raw: unknown): SaveV15['settings'] {
  const d = defaultSettings(), s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    volume: clampNum(s.volume, VOLUME_MIN, VOLUME_MAX, d.volume),
    reducedMotion: typeof s.reducedMotion === 'boolean' ? s.reducedMotion : null,
    numberFormat: s.numberFormat === 'sci' ? 'sci' : 'short',
    textScale: clampNum(s.textScale, TEXT_SCALE_MIN, TEXT_SCALE_MAX, d.textScale),
  };
}
