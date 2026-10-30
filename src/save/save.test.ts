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
    expect(s.version).toBe(4);
    expect(s.run.levels).toEqual({ root: 1, draw: 3 });
    expect(s.run.starlight).toBe(512); expect(s.meta.heartwood).toBe(4); expect(s.settings.volume).toBe(0.5);
  });
});

describe('v2 → v3', () => {
  it('drops Blood Banners and moves the spawn clock to grunts', () => {
    const v2 = { version: 2, savedAt: 0, run: { ...freshRun(), foeT: undefined, spawnT: 0.4, levels: { root: 1, horde: 2, banners: 3 } }, meta: freshMeta(), settings: defaultSettings() };
    const s = migrate(JSON.parse(JSON.stringify(v2)));
    expect(s.version).toBe(4); expect(s.run.levels).toEqual({ root: 1, horde: 2 }); expect(s.run.foeT).toEqual({ grunt: 0.4 });
  });
});

describe('v3 → v4', () => {
  it('drops the Warboss nodes and his spawn clock; no boss wave is running', () => {
    const v3 = { version: 3, savedAt: 0, run: { ...freshRun(), bossDone: undefined, boss: undefined, foeT: { grunt: 0.2, boss: 9 }, levels: { root: 1, elites: 1, warboss: 1, bossfury: 2, bounty: 1 } }, meta: freshMeta(), settings: defaultSettings() };
    const s = migrate(JSON.parse(JSON.stringify(v3)));
    expect(s.version).toBe(4); expect(s.run.levels).toEqual({ root: 1, elites: 1 }); expect(s.run.foeT).toEqual({ grunt: 0.2 });
    expect(s.run.bossDone).toBe(0); expect(s.run.boss).toBeNull();
  });
});
