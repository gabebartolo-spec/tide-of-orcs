import { describe, expect, it } from 'vitest';
import { v1 } from './fixtures/v1';
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

describe('v1 → v2', () => {
  it('drops retired node ids and keeps everything else', () => {
    const s = migrate(JSON.parse(JSON.stringify(v1)));
    expect(s.version).toBe(2);
    expect(s.run.levels).toEqual({ root: 1, draw: 3 });
    expect(s.run.starlight).toBe(512); expect(s.meta.heartwood).toBe(4); expect(s.settings.volume).toBe(0.5);
  });
});
