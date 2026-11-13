import { describe, expect, it } from 'vitest';
import { createState } from './state';
import { spawnOrc, spawnRow } from './step';
import { FIELD, SIM_MISC } from '../data/balance';
import { bossScript } from '../data/bosses';
import { ORC_KINDS } from '../data/orcs';

// Orcs march only on meadow rows every screen shows: above SIM_MISC.spawnTop the treeline covers the field, and an orc there
// was never drawn yet still struck the wall (director 13 Nov: "the wall takes damage from invisible enemies").
const lo = SIM_MISC.spawnTop, hi = FIELD.h - SIM_MISC.spawnYPad;

describe('spawn rows', () => {
  it('random spawns stay on the visible meadow band', () => {
    const s = createState(7);
    for (let i = 0; i < 2000; i++) {
      const o = spawnOrc(s, ORC_KINDS[i % ORC_KINDS.length]!);
      if (!o) { s.orcs.clear(); continue; }
      expect(o.y).toBeGreaterThanOrEqual(lo); expect(o.y).toBeLessThanOrEqual(hi);
    }
  });
  it('every boss-script line lands on the band, in its scripted order', () => {
    for (let tier = 0; tier <= 6; tier++) for (const m of bossScript(tier)) for (const f of m.ys) {
      const y = spawnRow(f); expect(y).toBeGreaterThanOrEqual(lo); expect(y).toBeLessThanOrEqual(hi);
    }
    expect(spawnRow(0.2)).toBeLessThan(spawnRow(0.8));
  });
});
