import { describe, expect, it } from 'vitest';
import { Item } from '../data/loot';
import { MYTHICS, MYTHIC_FX } from '../data/lootTables';
import { EventBus } from './events';
import { drawMult, impact, lob } from './combat';
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

  it('The Last Knife: a knife that lands brings the next arrow closer', () => {
    const s = wearing('last-knife', { knives: 1 }), ev = new EventBus(), o = orcAt(s, 500, 300);
    o.hp = o.maxhp = 1e6; s.run.knifeT = 99; s.run.shotT[0] = 0; step(s, 0, noInputs, ev);
    let t = 0; for (let i = 0; i < 60 && (s.run.shotT[0] ?? 0) <= t + 1e-9; i++) { t += 1 / 60; step(s, 1 / 60, noInputs, ev); }
    expect(s.run.shotT[0]).toBeGreaterThanOrEqual(t + MYTHIC_FX.knifeDraw - 1e-9);
  });

  it('Heart of the Kiln: the circle catches burning orcs farther out', () => {
    const s = wearing('heart-of-kiln'), ev = new EventBus(), r = 50;
    const k = (1 + MYTHIC_FX.kilnReach) / 2, near = orcAt(s, 700 + r * k, 300), off = orcAt(s, 700, 300 + r * k);
    near.hp = near.maxhp = off.hp = off.maxhp = 1e9; near.r = off.r = 0; near.burn = 5;
    impact(s, ev, { tx: 700, ty: 300, r, dmg: 10 });
    expect(near.hp).toBeLessThan(1e9); expect(off.hp).toBe(1e9);
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

  it('The First Wolf: the draw quickens with every few seconds of the wave, capped', () => {
    const s = wearing('first-wolf'), W = MYTHIC_FX;
    s.run.waveT = W.wolfEvery - 0.1; expect(drawMult(s)).toBe(1);
    s.run.waveT = W.wolfEvery * 2; expect(drawMult(s)).toBeCloseTo(1 / (1 + 2 * W.wolfDraw));
    s.run.waveT = 600; expect(drawMult(s)).toBeCloseTo(1 / (1 + W.wolfMax * W.wolfDraw));
  });

  it('Heartwood Splinter: the draw quickens as the wall falls; the wall still falls', () => {
    const s = wearing('heartwood-splinter'), ev = new EventBus(), max = s.stats.barMax, W = MYTHIC_FX;
    s.run.barHp = max; expect(drawMult(s)).toBeCloseTo(1);
    s.run.barHp = max * (1 + W.splinterFloor) / 2; expect(drawMult(s)).toBeCloseTo(1 / (1 + (W.splinterDraw - 1) / 2));
    s.run.barHp = max * W.splinterFloor; expect(drawMult(s)).toBeCloseTo(1 / W.splinterDraw);
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
