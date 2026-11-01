import { describe, expect, it } from 'vitest';
import { Item } from '../data/loot';
import { MYTHICS, MYTHIC_FX } from '../data/lootTables';
import { EventBus } from './events';
import { impact, lob, mythicMult } from './combat';
import { barricadeHit } from './barricade';
import { createState, freshMeta, freshRun, SimState } from './state';
import { Levels } from './stats';
import { pickUp } from './loot';
import { noInputs, spawnOrc, step } from './step';

/** A state wearing one mythic, with the given Grove levels. */
const wearing = (id: string, levels: Levels = {}): SimState => {
  const meta = freshMeta(), m = MYTHICS.find((x) => x.id === id)!;
  pickUp(meta.loot, { uid: 'm', base: 'x', slot: m.slot, rarity: 'mythic', ilvl: 1, affixes: [], mythic: id } as Item, 'player');
  return createState(1, { ...freshRun(), levels: { root: 1, ...levels } }, meta);
};
const orcAt = (s: SimState, x: number, y: number) => { spawnOrc(s, 'grunt', y); let o = null as ReturnType<typeof s.orcs.alloc>; s.orcs.forEach((q) => { if (q.y === y) o = q; }); o!.x = x; return o!; };
const first = <T,>(pool: { forEach(f: (x: T) => void): void }, f: (x: T) => boolean): T | null => { let r: T | null = null; pool.forEach((x) => { if (!r && f(x)) r = x; }); return r; };
const aim = (x: number, y: number) => ({ ...noInputs, aim: { x, y } });

describe('mythic powers (TB-100)', () => {
  it('each mythic switches on its power only while worn', () => {
    expect(createState().stats.knifeReturn).toBe(0);
    expect(wearing('last-knife').stats.knifeReturn).toBe(1);
    expect(wearing('starfall-cloak').stats.starCloak).toBe(1);
  });

  it('The Last Knife: a knife marks its orc; arrows deal x2 to marked orcs', () => {
    const s = wearing('last-knife', { knives: 1 }), ev = new EventBus(), o = orcAt(s, 500, 300);
    o.hp = o.maxhp = 1e6; s.run.knifeT = 99; step(s, 0, noInputs, ev);
    for (let i = 0; i < 60 && o.mark <= 0; i++) step(s, 1 / 60, noInputs, ev);
    expect(o.mark).toBeGreaterThan(0); expect(o.mark).toBeLessThanOrEqual(MYTHIC_FX.knifeMarkSecs);
    expect(mythicMult(s, o)).toBe(MYTHIC_FX.knifeMarkMult);
    o.mark = 0; expect(mythicMult(s, o)).toBe(1);
  });

  it('Heart of the Kiln: arrows deal +10% per second burned, capped', () => {
    const s = wearing('heart-of-kiln'), o = orcAt(s, 900, 300);
    o.burnT = 5; expect(mythicMult(s, o)).toBeCloseTo(1.5);
    o.burnT = 60; expect(mythicMult(s, o)).toBeCloseTo(1 + MYTHIC_FX.burnRampMax);
  });

  it("Thunder's Memory: after a storm the draw is twice as fast for a while", () => {
    const s = wearing('thunders-memory', { storm: 1 }), ev = new EventBus();
    const o = orcAt(s, 700, 300); o.hp = o.maxhp = 1e9;
    s.run.stormT = 99; step(s, 0, noInputs, ev);
    expect(s.run.thunder).toBeCloseTo(MYTHIC_FX.thunderDrawSecs);
    s.run.shotT[0] = s.stats.lobCd * MYTHIC_FX.thunderDraw; step(s, 0, aim(700, 300), ev);
    expect(first(s.shots, (p) => p.kind === 'lob')).not.toBeNull();
    const t = createState(1, { ...freshRun(), levels: { root: 1 } }), ev2 = new EventBus();
    t.run.shotT[0] = t.stats.lobCd * MYTHIC_FX.thunderDraw; step(t, 0, aim(700, 300), ev2);
    expect(first(t.shots, (p) => p.kind === 'lob')).toBeNull();
  });

  it('Oakspine: the circle is 50% wider and a lob roots what it hits', () => {
    const base = createState(1, { ...freshRun(), levels: { root: 1 } }), s = wearing('oakspine'), ev = new EventBus();
    expect(s.stats.radius).toBeCloseTo(base.stats.radius * MYTHIC_FX.oakRadius);
    const o = orcAt(s, 700, 300); o.hp = o.maxhp = 1e9;
    impact(s, ev, { tx: 700, ty: 300, r: s.stats.radius, dmg: 1 });
    expect(o.root).toBeCloseTo(MYTHIC_FX.oakRootSecs);
  });

  it('Pale Moon: faster draw with the Moonbow, each shot costs wall but never below the floor', () => {
    const base = createState(1, { ...freshRun(), levels: { root: 1, moon: 1 } }), s = wearing('pale-moon', { moon: 1, moonchance: 5 }), ev = new EventBus();
    expect(s.stats.lobCd).toBeCloseTo(base.stats.lobCd * MYTHIC_FX.moonDraw);
    s.run.shotT[0] = 99; const hp = s.run.barHp; step(s, 0, aim(700, 300), ev);
    expect(s.run.barHp).toBeCloseTo(hp - s.stats.barMax * MYTHIC_FX.moonCost);
    s.run.barHp = s.stats.barMax * MYTHIC_FX.moonCostFloor; s.run.shotT[0] = 99; step(s, 0, aim(700, 300), ev);
    expect(s.run.barHp).toBeCloseTo(s.stats.barMax * MYTHIC_FX.moonCostFloor);
  });

  it('The First Wolf: arrows deal +25% per 15 s of the wave, up to 4 stacks', () => {
    const s = wearing('first-wolf'), o = orcAt(s, 900, 300);
    s.run.waveT = 14; expect(mythicMult(s, o)).toBe(1);
    s.run.waveT = 30; expect(mythicMult(s, o)).toBeCloseTo(1.5);
    s.run.waveT = 600; expect(mythicMult(s, o)).toBeCloseTo(1 + MYTHIC_FX.wolfStack * MYTHIC_FX.wolfMax);
  });

  it('Heartwood Splinter: arrows grow to x3 as the wall falls; the wall still falls', () => {
    const s = wearing('heartwood-splinter'), ev = new EventBus(), o = orcAt(s, 900, 300), max = s.stats.barMax;
    s.run.barHp = max; expect(mythicMult(s, o)).toBeCloseTo(1);
    s.run.barHp = max * 0.55; expect(mythicMult(s, o)).toBeCloseTo(2);
    s.run.barHp = max * MYTHIC_FX.splinterFloor; expect(mythicMult(s, o)).toBeCloseTo(MYTHIC_FX.splinterMaxMult);
    s.run.barHp = 1; barricadeHit(s, ev, 1e12, 300); expect(s.run.fallen).toBe(true);
  });

  it('Starfall Cloak: a star arrow hits x4 over a 1.5x circle', () => {
    const s = wearing('starfall-cloak'), ev = new EventBus();
    s.rng.next = () => 0.99; lob(s, 100, 300, 700, 300, undefined, ev);
    const plain = first(s.shots, (p) => p.kind === 'lob')!, d = plain.dmg, r = plain.r; s.shots.release(plain);
    s.rng.next = () => 0; lob(s, 100, 300, 700, 300, undefined, ev);
    const star = first(s.shots, (p) => p.kind === 'lob')!;
    expect(star.dmg).toBeCloseTo(d * MYTHIC_FX.starfallMult); expect(star.r).toBeCloseTo(r * MYTHIC_FX.starfallRadius);
  });
});
