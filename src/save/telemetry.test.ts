import { describe, expect, it } from 'vitest';
import { createState } from '../sim/state';
import { LOOT_LOG_CAP, TELEMETRY_CAP, appendLoot, appendTelemetry, lootRecord, lootStart, readLoot, readTelemetry, runRecord, telemetryJson } from './telemetry';

const mem = (): Pick<Storage, 'getItem' | 'setItem'> => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };

describe('telemetry', () => {
  it('records the ending run', () => {
    const s = createState(1);
    s.run.wave = 14; s.run.runTime = 600; s.run.earned = 3000; s.run.kills = 250; s.run.fallen = true; s.meta.heartwood = 5;
    const r = runRecord(s, 3, new Date(0));
    expect(r).toMatchObject({ run: 1, forced: true, wave: 14, seconds: 600, kills: 250, starlightPerMin: 300, heartwoodGained: 3, heartwoodTotal: 8 });
  });
  it('appends, caps, and survives junk', () => {
    const st = mem(), r = runRecord(createState(1), 1);
    st.setItem('tide-of-orcs-telemetry', 'not json');
    expect(readTelemetry(st)).toEqual([]);
    for (let i = 0; i < TELEMETRY_CAP + 3; i++) appendTelemetry({ ...r, wave: i }, st);
    const all = readTelemetry(st);
    expect(all).toHaveLength(TELEMETRY_CAP); expect(all[0]!.wave).toBe(3);
    expect(JSON.parse(telemetryJson(all, 'test')).runs).toHaveLength(TELEMETRY_CAP);
  });
});

describe('loot telemetry (TB-107)', () => {
  it('stamps wave, run and minutes since the first logged event', () => {
    const st = mem(), s = createState(1); s.run.wave = 7; s.meta.prestiges = 2;
    const start = lootStart(1_000, st);
    expect(lootStart(999_999, st)).toBe(start);
    expect(lootRecord(s, 'drop', { rarity: 'epic', kept: true }, start + 90_000, start)).toEqual({ kind: 'drop', wave: 7, run: 3, min: 1.5, rarity: 'epic', kept: true });
  });
  it('appends in batches, caps, and rides in the export', () => {
    const st = mem(), r = lootRecord(createState(1), 'salvage', {}, 0, 0);
    appendLoot([], st); expect(readLoot(st)).toEqual([]);
    appendLoot(Array.from({ length: LOOT_LOG_CAP + 2 }, (_, i) => ({ ...r, wave: i })), st);
    const all = readLoot(st);
    expect(all).toHaveLength(LOOT_LOG_CAP); expect(all[0]!.wave).toBe(2);
    expect(JSON.parse(telemetryJson([], 'test', all)).loot).toHaveLength(LOOT_LOG_CAP);
  });
});
