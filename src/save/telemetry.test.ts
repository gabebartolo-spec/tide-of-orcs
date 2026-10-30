import { describe, expect, it } from 'vitest';
import { createState } from '../sim/state';
import { TELEMETRY_CAP, appendTelemetry, readTelemetry, runRecord, telemetryJson } from './telemetry';

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
