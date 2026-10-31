import { describe, expect, it } from 'vitest';
import { Item, SLOTS } from '../data/loot';
import { SET_FX } from '../data/lootTables';
import { BARRICADE, SOURCES } from '../data/balance';
import { EventBus } from './events';
import { damage, impact, kill } from './combat';
import { barricadeHit } from './barricade';
import { createState, freshMeta, freshRun, SimState } from './state';
import { Levels } from './stats';
import { pickUp } from './loot';
import { noInputs, spawnOrc, step } from './step';
import { rallyCost } from './vanguard';

/** A state wearing n pieces of one set, with the given Grove levels. */
const wearing = (set: string, n: number, levels: Levels = {}): SimState => {
  const meta = freshMeta();
  SLOTS.slice(0, n).forEach((slot, i) => pickUp(meta.loot, { uid: `s${i}`, base: 'x', slot, rarity: 'legendary', ilvl: 1, affixes: [], set } as Item, 'player'));
  return createState(1, { ...freshRun(), levels: { root: 1, ...levels } }, meta);
};
const orcAt = (s: SimState, x: number, y: number) => { spawnOrc(s, 'grunt', y); let o = null as ReturnType<typeof s.orcs.alloc>; s.orcs.forEach((q) => { if (q.y === y) o = q; }); o!.x = x; return o!; };

describe('set bonuses (TB-099)', () => {
  it('tiers turn on at 2, 4 and 6 pieces only', () => {
    expect(wearing('nightknife', 1, { knives: 1 }).stats.knives!.rate).toBeCloseTo(createState(1, { ...freshRun(), levels: { root: 1, knives: 1 } }).stats.knives!.rate);
    expect(wearing('nightknife', 3).stats.bleedAmp).toBe(0);
    expect(wearing('nightknife', 4).stats.bleedAmp).toBe(SET_FX.bleedAmp);
    expect(wearing('nightknife', 5).stats.knifeFan).toBe(0);
    expect(wearing('nightknife', 6).stats.knifeFan).toBe(1);
  });

  it('Nightknife: bleeding orcs take more; every third throw is a five-knife Fan', () => {
    const s = wearing('nightknife', 6, { knives: 1 }), ev = new EventBus(), o = orcAt(s, 600, 300);
    o.hp = o.maxhp = 1000; o.bleed = 1; damage(s, ev, o, 100);
    expect(o.hp).toBeCloseTo(1000 - 100 * (1 + SET_FX.bleedAmp));
    let knives = 0;
    for (let i = 0; i < 3; i++) { s.run.knifeT = 99; step(s, 0, noInputs, ev); }
    s.shots.forEach((p) => { if (p.kind === 'knife') knives++; });
    expect(knives).toBe(2 + SET_FX.fanKnives);
  });

  it('Emberwright: burn spreads on death and fire lobs leave Cinderground', () => {
    const s = wearing('emberwright', 6, { fire: 1 }), ev = new EventBus();
    const a = orcAt(s, 600, 300), b = orcAt(s, 620, 310); a.burn = 1;
    kill(s, ev, a); expect(b.burn).toBe(SOURCES.burnSecs);
    impact(s, ev, { tx: 700, ty: 200, r: 40, dmg: 0 }); expect(s.zones.count).toBe(1);
    const c = orcAt(s, 700, 200); c.burn = 0; step(s, 1 / 60, noInputs, ev);
    expect(c.burn).toBeGreaterThan(0); expect(c.slow).toBeGreaterThan(0);
  });

  it('Stormcaller: +1 chain and a killing link rebounds', () => {
    const s = wearing('stormcaller', 6, { storm: 1 }), ev = new EventBus();
    expect(s.stats.chain).toBe(SOURCES.storm.targets + 1); expect(s.stats.stormCd).toBeLessThan(SOURCES.storm.cd);
    for (let i = 0; i < 10; i++) { const o = orcAt(s, 400 + i * 30, 300); o.hp = i < 3 ? 0.001 : 1e9; }
    s.run.stormT = 99; step(s, 0, noInputs, ev);
    const st = ev.drain().find((e) => e.t === 'storm') as { pts: unknown[] };
    expect(st.pts.length).toBe(s.stats.chain + 3);
  });

  it('Siegebreaker: pinned orcs stand still and take double damage', () => {
    const s = wearing('siegebreaker', 6, { ballista: 1 }), ev = new EventBus(), o = orcAt(s, 600, 300);
    o.hp = o.maxhp = 1000; o.pin = 1; const x = o.x;
    damage(s, ev, o, 100); expect(o.hp).toBeCloseTo(800);
    step(s, 0.1, noInputs, ev); expect(o.x).toBe(x);
  });

  it('Moonveil: moon shots always crit and leave a Moonwell that mends the wall', () => {
    const s = wearing('moonveil', 6, { moon: 1 }), ev = new EventBus(), o = orcAt(s, 600, 300);
    o.hp = o.maxhp = 1e6; s.stats.crit = 0;
    impact(s, ev, { tx: 600, ty: 300, r: 40, dmg: 10 });
    expect(o.maxhp - o.hp).toBeCloseTo(10 * SET_FX.moonCritMult);
    s.run.barHp = s.stats.barMax / 2; o.x = 2000; step(s, 1, noInputs, ev);
    expect(s.run.barHp).toBeGreaterThan(s.stats.barMax / 2);
  });

  it('Packlord: a second wolf hunts, treants root', () => {
    const s = wearing('packlord', 6, { wolf: 1, treant: 1 }), ev = new EventBus();
    orcAt(s, 300, 300); step(s, 1 / 60, noInputs, ev);
    expect(s.pack.length).toBe(1);
    const o = orcAt(s, 260, 320); s.run.treantT = 99; step(s, 1 / 60, noInputs, ev);
    expect(o.root).toBeGreaterThan(0);
  });

  it('Rootwarden: once per run, the wall below a quarter makes rallies free', () => {
    const s = wearing('rootwarden', 6), ev = new EventBus();
    s.run.barHp = s.stats.barMax * 0.3; barricadeHit(s, ev, s.stats.barMax * 0.1, 300);
    expect(s.freeRallyT).toBe(SET_FX.freeRallySecs); expect(rallyCost(s, 'spear')).toBe(0);
    s.freeRallyT = 0; barricadeHit(s, ev, 1, 300);
    expect(s.freeRallyT).toBe(0); expect(rallyCost(s, 'spear')).toBeGreaterThan(0);
  });

  it('one hit takes at most a quarter of the wall, so a late orc cannot fell a full wall (TB-125)', () => {
    const s = wearing('rootwarden', 0), ev = new EventBus(), max = s.stats.barMax;
    s.run.barHp = max; barricadeHit(s, ev, max * 750, 300);
    expect(s.run.barHp).toBeCloseTo(max * (1 - BARRICADE.maxHitFrac)); expect(s.run.fallen).toBe(false);
    barricadeHit(s, ev, max * 0.01, 300); expect(s.run.barHp).toBeCloseTo(max * (1 - BARRICADE.maxHitFrac - 0.01));
    for (let i = 0; i < 3; i++) barricadeHit(s, ev, 1e12, 300);
    expect(s.run.fallen).toBe(true);
  });
});
