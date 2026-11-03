import { beforeEach, describe, expect, it } from 'vitest';
import { SAVE_BACKUP_KEY, SAVE_KEY, clearLoadFailed, clearSave, readSave, saveLoadFailed, writeSave } from './storage';
import { CURRENT_VERSION, Save, defaultSettings, sanitizeSettings } from './schema';
import { freshMeta, freshRun } from '../sim/state';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); },
};
const save = (): Save => ({ version: CURRENT_VERSION as 14, savedAt: 0, run: freshRun(), meta: freshMeta(), settings: defaultSettings() });

describe('failed save load (TB-199)', () => {
  beforeEach(() => { mem.clear(); clearLoadFailed(); });
  it('backs up the unreadable save and blocks writes over it', () => {
    mem.set(SAVE_KEY, '{broken');
    expect(readSave()).toBeNull();
    expect(saveLoadFailed()).toBe(true);
    expect(mem.get(SAVE_BACKUP_KEY)).toBe('{broken');
    expect(writeSave(save())).toBe(false);
    expect(mem.get(SAVE_KEY)).toBe('{broken');
  });
  it('a wipe lets writes resume', () => {
    mem.set(SAVE_KEY, '{broken'); readSave(); clearSave();
    expect(writeSave(save())).toBe(true);
    expect(mem.get(SAVE_BACKUP_KEY)).toBe('{broken');
  });
  it('a missing save is not a failure', () => {
    expect(readSave()).toBeNull(); expect(saveLoadFailed()).toBe(false); expect(writeSave(save())).toBe(true);
  });
});

describe('sanitizeSettings (TB-199)', () => {
  it('clamps numbers and coerces bad fields to defaults', () => {
    const s = sanitizeSettings({ volume: 9, textScale: 0.1, reducedMotion: 'yes', numberFormat: 'hex' });
    expect(s.volume).toBe(1); expect(s.textScale).toBe(0.8); expect(s.reducedMotion).toBe(null); expect(s.numberFormat).toBe('short');
    expect(sanitizeSettings({ volume: NaN, reducedMotion: true, numberFormat: 'sci' })).toEqual({ ...defaultSettings(), reducedMotion: true, numberFormat: 'sci' });
    expect(sanitizeSettings(null)).toEqual(defaultSettings());
  });
});
