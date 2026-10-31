import { describe, expect, it } from 'vitest';
import { Item } from '../data/loot';
import { MYTHICS, MYTHIC_FX } from '../data/lootTables';
import { PRESTIGE, prestigeGain } from '../data/balance';
import { EventBus } from './events';
import { kill } from './combat';
import { barricadeHit } from './barricade';
import { createState, freshMeta, freshRun, SimState } from './state';
import { Levels } from './stats';
import { pickUp } from './loot';
import { gain, replant } from './prestige';
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

  it('The Last Knife: a knife that hits turns back and strikes on the way', () => {
    const s = wearing('last-knife', { knives: 1 }), ev = new EventBus(), o = orcAt(s, 500, 300);
    o.hp = o.maxhp = 1e6; s.run.knifeT = 99; step(s, 0, noInputs, ev);
    for (let i = 0; i < 60 && !first(s.shots, (p) => !!p.back); i++) step(s, 1 / 60, noInputs, ev);
    const k = first(s.shots, (p) => p.kind === 'knife')!;
    expect(k.back).toBe(true); expect(k.vx).toBeLessThan(0);
  });

  it('Heart of the Kiln: burn never runs out and ramps', () => {
    const s = wearing('heart-of-kiln'), ev = new EventBus(), o = orcAt(s, 2000, 300);
    o.hp = o.maxhp = 1e9; o.spd = 0; o.burn = 1;
    for (let i = 0; i < 300; i++) step(s, 1 / 60, noInputs, ev);
    expect(o.burn).toBe(1); expect(o.burnT).toBeCloseTo(5);
  });

  it("Thunder's Memory: ten stored storms make the next shot hit every orc", () => {
    const s = wearing('thunders-memory', { storm: 1 }), ev = new EventBus();
    const a = orcAt(s, 600, 100), b = orcAt(s, 900, 500); a.hp = a.maxhp = b.hp = b.maxhp = 1e9;
    s.run.thunder = MYTHIC_FX.thunderCharges - 1; s.run.stormT = 99; step(s, 0, noInputs, ev);
    expect(s.run.thunder).toBe(MYTHIC_FX.thunderCharges);
    s.run.shotT[0] = 99; step(s, 0, aim(700, 300), ev);
    expect(s.run.thunder).toBe(0); expect(a.hp).toBeLessThan(1e9); expect(b.hp).toBeLessThan(1e9);
  });

  it('Oakspine: a bolt through three orcs drives a stake that holds one orc', () => {
    const s = wearing('oakspine', { ballista: 1 }), ev = new EventBus();
    for (let i = 0; i < 3; i++) { const o = orcAt(s, 400 + i * 40, 260); o.hp = o.maxhp = 1e9; }
    s.run.ballT = 99;
    for (let i = 0; i < 90 && !first(s.zones, (z) => z.kind === 'stake'); i++) step(s, 1 / 60, noInputs, ev);
    const z = first(s.zones, (q) => q.kind === 'stake')!; expect(z.life).toBeGreaterThan(0);
    step(s, 1 / 60, noInputs, ev); expect(z.used).toBe(true);
  });

  it('Pale Moon: faster draw with the Moonbow, each shot costs wall but never below the floor', () => {
    const base = createState(1, { ...freshRun(), levels: { root: 1, moon: 1 } }), s = wearing('pale-moon', { moon: 1, moonchance: 5 }), ev = new EventBus();
    expect(s.stats.lobCd).toBeCloseTo(base.stats.lobCd * MYTHIC_FX.moonDraw);
    s.run.shotT[0] = 99; const hp = s.run.barHp; step(s, 0, aim(700, 300), ev);
    expect(s.run.barHp).toBeCloseTo(hp - s.stats.barMax * MYTHIC_FX.moonCost);
    s.run.barHp = s.stats.barMax * MYTHIC_FX.moonCostFloor; s.run.shotT[0] = 99; step(s, 0, aim(700, 300), ev);
    expect(s.run.barHp).toBeCloseTo(s.stats.barMax * MYTHIC_FX.moonCostFloor);
  });

  it('The First Wolf: companion damage stacks with run time, capped', () => {
    const s = wearing('first-wolf', { wolf: 1 }), ev = new EventBus(), o = orcAt(s, s.wolf.x + 5, s.wolf.y);
    o.hp = o.maxhp = 1e9; s.run.runTime = 1e4; s.wolf.biteT = 99; step(s, 0, noInputs, ev);
    expect(o.maxhp - o.hp).toBeCloseTo(s.stats.wolf * (1 + MYTHIC_FX.wolfStack * MYTHIC_FX.wolfMax));
  });

  it('Heartwood Splinter: the wall stands again once, and that run pays half (at least the minimum)', () => {
    const s = wearing('heartwood-splinter'), ev = new EventBus();
    s.run.wave = 30; s.run.kills = 500; const full = prestigeGain(30, 500);
    s.run.barHp = 1; barricadeHit(s, ev, 1e12, 300);
    expect(s.run.fallen).toBe(false); expect(s.run.barHp).toBeCloseTo(s.stats.barMax * MYTHIC_FX.splinterFrac);
    expect(gain(s)).toBe(Math.max(PRESTIGE.minGain, Math.floor(full * MYTHIC_FX.splinterHw)));
    s.run.barHp = 1; barricadeHit(s, ev, 1e12, 300); expect(s.run.fallen).toBe(true);
    replant(s, ev); expect(s.run.splinterUsed).toBe(false);
  });

  it('Starfall Cloak: starlight gathered strikes the strongest orc; Item Find +15%', () => {
    const s = wearing('starfall-cloak'), ev = new EventBus();
    const big = orcAt(s, 900, 200), small = orcAt(s, 600, 300); big.hp = big.maxhp = 1e9; small.loot = MYTHIC_FX.starfallEvery;
    kill(s, ev, small);
    expect(big.hp).toBeCloseTo(1e9 - s.stats.dmg * MYTHIC_FX.starfallMult); expect(s.starfallT).toBe(MYTHIC_FX.starfallCd);
  });
});
