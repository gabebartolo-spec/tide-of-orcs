import { describe, expect, it } from 'vitest';
import { migrate } from './migrate';
import { CURRENT_VERSION, defaultSettings } from './schema';
import { freshMeta, freshRun } from '../sim/state';

describe('save migration', () => {
  it('accepts a current save unchanged', () => {
    const s = { version: CURRENT_VERSION, savedAt: 0, run: freshRun(), meta: freshMeta(), settings: defaultSettings() };
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('rejects garbage and newer saves', () => {
    expect(() => migrate(null)).toThrow();
    expect(() => migrate({ version: CURRENT_VERSION + 1 })).toThrow();
  });
});
