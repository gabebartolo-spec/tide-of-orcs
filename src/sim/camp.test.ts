import { describe, expect, it } from 'vitest';
import { BUILDING, BUILDINGS, BuildingId, CAMP_FX, MAT_DROP } from '../data/camp';
import { migrate } from '../save/migrate';
import { CURRENT_VERSION } from '../save/schema';
import { campSpent, upgradeBuilding } from './camp';
import { dropMat, kill } from './combat';
import { EventBus } from './events';
import { hwAvailable } from './heartwood';
import { Levels, deriveStats } from './stats';
import { createState, freshMeta, freshRun } from './state';

const LV: Levels = { root: 1, knives: 1, ballista: 1, muster: 1 };
const at = (id: BuildingId, n: number) => deriveStats(LV, {}, { [id]: n });
const levels = [1, 2, 3];

describe('camp effects (TB-188a), one test per building level', () => {
  for (const n of levels) {
    it(`bowyer ${n}: bow damage, draw time, strike radius`, () => {
      const a = at('bowyer', n - 1), b = at('bowyer', n);
      expect(b.dmg / a.dmg).toBeCloseTo(CAMP_FX.bowDmg[n]! / CAMP_FX.bowDmg[n - 1]!);
      expect(b.lobCd).toBeLessThan(a.lobCd); expect(b.radius).toBeGreaterThan(a.radius);
    });
    it(`forge ${n}: knife, ballista, storm damage, Item Find, reroll cost`, () => {
      const a = at('forge', n - 1), b = at('forge', n);
      expect(b.knives!.dmg).toBeGreaterThan(a.knives!.dmg); expect(b.ballista).toBeGreaterThan(a.ballista);
      expect(b.stormDmg).toBeGreaterThan(a.stormDmg); expect(b.itemFind).toBeGreaterThan(a.itemFind);
      expect(b.rerollMult).toBeLessThan(a.rerollMult); expect(b.dmg).toBe(a.dmg);
    });
    it(`kitchen ${n}: wall health, regen, starlight`, () => {
      const a = at('kitchen', n - 1), b = at('kitchen', n);
      expect(b.barMax).toBeGreaterThan(a.barMax); expect(b.barRegen).toBeGreaterThan(a.barRegen); expect(b.starMult).toBeGreaterThan(a.starMult);
    });
    it(`training ${n}: vanguard health, damage, respawn`, () => {
      const a = at('training', n - 1), b = at('training', n);
      expect(b.vanHp).toBeGreaterThan(a.vanHp); expect(b.vanDmg).toBeGreaterThan(a.vanDmg); expect(b.vanRespawn).toBeLessThan(a.vanRespawn);
    });
  }
  it('kitchen changes the outcome: a kill pays more starlight', () => {
    const pay = (k: number) => { const s = createState(1, freshRun(), { ...freshMeta(), camp: { levels: { kitchen: k }, mats: {} } });
      const o = s.orcs.alloc()!; o.kind = 'elite'; o.loot = 10; kill(s, new EventBus(), o); return s.run.starlight; };
    expect(pay(3)).toBeGreaterThan(pay(0));
  });
});

describe('camp upgrades and materials (TB-188a)', () => {
  const rich = () => { const s = createState(1, freshRun(), { ...freshMeta(), heartwood: 100, camp: { levels: {}, mats: { sinew: 200 } } }); s.run.fallen = true; return s; };
  it('costs Heartwood plus the building material, three levels max, only while fallen', () => {
    const s = rich(), ev = new EventBus();
    s.run.fallen = false; expect(upgradeBuilding(s, ev, 'bowyer')).toBe(false); s.run.fallen = true;
    expect(upgradeBuilding(s, ev, 'forge')).toBe(false); // no orc iron
    for (let i = 0; i < 3; i++) expect(upgradeBuilding(s, ev, 'bowyer')).toBe(true);
    expect(upgradeBuilding(s, ev, 'bowyer')).toBe(false);
    const c = BUILDING.bowyer.costs;
    expect(s.meta.camp.mats.sinew).toBe(200 - c.reduce((a, x) => a + x.mat, 0));
    expect(campSpent(s.meta)).toBe(c.reduce((a, x) => a + x.hw, 0)); expect(hwAvailable(s.meta)).toBe(100 - campSpent(s.meta));
    expect(s.stats.dmg).toBeCloseTo(deriveStats(s.run.levels, {}, { bowyer: 3 }).dmg);
  });
  it('common orcs drop materials into meta; elites never do', () => {
    const s = createState(3), ev = new EventBus();
    for (let i = 0; i < 2000; i++) { const o = s.orcs.alloc()!; o.kind = 'grunt'; o.dead = false; dropMat(s, ev, o); s.orcs.release(o); }
    const got = Object.values(s.meta.camp.mats).reduce((a, b) => a + (b ?? 0), 0);
    expect(got).toBeGreaterThan(2000 * MAT_DROP.chance * 0.5); expect(got).toBeLessThan(2000 * MAT_DROP.chance * 1.5);
    const e = createState(3); for (let i = 0; i < 500; i++) { const o = e.orcs.alloc()!; o.kind = 'elite'; dropMat(e, ev, o); e.orcs.release(o); }
    expect(e.meta.camp.mats).toEqual({});
  });
  it('every building has its own material', () => { expect(new Set(BUILDINGS.map((b) => b.mat)).size).toBe(4); });
});

describe('save v12 -> v13 (TB-188a)', () => {
  it('adds an empty camp and keeps everything else', () => {
    const v12 = { version: 12, savedAt: 5, run: freshRun(), meta: { ...freshMeta(), heartwood: 9, camp: undefined },
      settings: { volume: 0.7, reducedMotion: null, numberFormat: 'short', textScale: 1 } };
    const s = migrate(JSON.parse(JSON.stringify(v12)));
    expect(CURRENT_VERSION).toBe(13); expect(s.version).toBe(13);
    expect(s.meta.camp).toEqual({ levels: {}, mats: {} }); expect(s.meta.heartwood).toBe(9);
  });
});
