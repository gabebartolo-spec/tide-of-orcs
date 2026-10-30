import { describe, expect, it } from 'vitest';
import { createState, freshRun, freshMeta } from './state';
import { EventBus } from './events';
import { Inputs, noInputs, step } from './step';
import { deriveStats } from './stats';
import { buy, canBuy, costOf } from './tree';
import { NODE, NODES } from '../data/skillTree';
import { STEP } from '../data/balance';
import { canRally, rally } from './vanguard';
import { canReplant, replant } from './prestige';
import { createRng } from './rng';

const run = (seed: number, secs: number, inputs: Inputs = noInputs) => {
  const s = createState(seed); const ev = new EventBus();
  for (let i = 0; i < secs / STEP; i++) step(s, STEP, inputs, ev);
  return { s, ev };
};

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(7), b = createRng(7), c = createRng(8);
    const xa = [a.next(), a.next()], xb = [b.next(), b.next()];
    expect(xa).toEqual(xb); expect(c.next()).not.toBe(xa[0]);
  });
});

describe('stats', () => {
  it('every node at max rank changes at least one stat', () => {
    const base = deriveStats({ root: 1 }, 0);
    for (const n of NODES) {
      if (n.id === 'root') continue;
      const lv: Record<string, number> = { root: 1 };
      // own the whole ancestor chain so dependent stats (e.g. ranks needs muster) resolve
      let p: typeof n | undefined = n; while (p) { lv[p.id] = p.max; p = p.parent ? NODE[p.parent] : undefined; }
      const st = deriveStats(lv, 0);
      expect(JSON.stringify(st), n.id).not.toBe(JSON.stringify(base));
    }
  });
  it('heartwood scales damage, starlight and the wall', () => {
    const a = deriveStats({ root: 1 }, 0), b = deriveStats({ root: 1 }, 5);
    expect(b.dmg / a.dmg).toBeCloseTo(1.6); expect(b.starMult / a.starMult).toBeCloseTo(1.6); expect(b.barMax / a.barMax).toBeCloseTo(1.6);
  });
});

describe('simulation', () => {
  it('is deterministic for the same seed', () => {
    const a = run(3, 60), b = run(3, 60);
    expect(a.s.run.starlight).toBe(b.s.run.starlight);
    expect(a.s.run.kills).toBe(b.s.run.kills);
  });
  it('spawns orcs, kills some and earns starlight within a minute', () => {
    const { s, ev } = run(1, 60);
    expect(s.run.kills).toBeGreaterThan(5);
    expect(s.run.starlight).toBeGreaterThan(10);
    expect(s.run.wave).toBe(3);
    expect(ev.drain().some((e) => e.t === 'kill')).toBe(true);
  });
  it('the barricade takes damage and eventually falls with no purchases', () => {
    const { s } = run(2, 20 * 60);
    expect(s.run.fallen).toBe(true);
    expect(s.run.barHp).toBe(0);
    expect(s.run.wave).toBeGreaterThanOrEqual(5); // a bare archer should hold a few waves, not fold instantly
  });
  it('a fallen run stops ticking', () => {
    const { s } = run(2, 20 * 60); const t = s.t; const ev = new EventBus();
    step(s, STEP, noInputs, ev); expect(s.t).toBe(t);
  });
  it('aiming sends the first volley toward the pointer, not the nearest orc', () => {
    const s = createState(5); const ev = new EventBus();
    s.run.shotT[0] = 10; // bow is ready
    step(s, STEP, { aim: { x: 700, y: 60 } }, ev);
    expect(s.shots.count).toBeGreaterThan(0);
    let dir = 0; s.shots.forEach((a) => { dir = Math.atan2(a.vy, a.vx); });
    expect(dir).toBeCloseTo(Math.atan2(60 - 240, 700 - 64), 1);
  });
  it('aim behind the wall is ignored and no arrows fly without a target', () => {
    const s = createState(5); const ev = new EventBus(); s.run.shotT[0] = 10;
    step(s, STEP, { aim: { x: 100, y: 240 } }, ev);
    expect(s.shots.count).toBe(0);
  });
});

describe('tree', () => {
  it('buys when affordable and unlocked, refuses otherwise', () => {
    const s = createState(1); const ev = new EventBus();
    expect(canBuy(s, NODE.sharp)).toBe(false);
    s.run.starlight = 100;
    expect(buy(s, ev, 'draw')).toBe(false); // parent not owned
    expect(buy(s, ev, 'sharp')).toBe(true);
    expect(s.run.starlight).toBe(88);
    expect(s.stats.dmg).toBeCloseTo(11.25);
  });
  it('provoke ranks toughen orcs and raise their starlight', () => {
    const s = createState(1);
    s.run.levels.drums = 2; s.run.levels.banners = 1;
    const st = deriveStats(s.run.levels, s.meta.heartwood);
    expect(st.orcHp).toBeCloseTo(1.69);
    expect(st.orcAtk).toBeCloseTo(1.3);
    expect(st.starMult).toBeCloseTo(1.96 * 1.25);
  });
  it('node price scales with the wave past 10', () => {
    const s = createState(1);
    expect(costOf(s, NODE.sharp)).toBe(12);
    s.run.wave = 12;
    expect(costOf(s, NODE.sharp)).toBe(19); // 12 × 1.25² = 18.75
  });
  it('growing the wall heals the new timber', () => {
    const s = createState(1); const ev = new EventBus();
    s.run.barHp = 200; s.run.starlight = 1000;
    buy(s, ev, 'timber');
    expect(s.stats.barMax).toBeCloseTo(500); expect(s.run.barHp).toBeCloseTo(300);
  });
});

describe('vanguard', () => {
  it('needs Muster, starlight and a free slot', () => {
    const s = createState(1); const ev = new EventBus();
    s.run.starlight = 1000;
    expect(canRally(s, 'spear')).toBe(false);
    buy(s, ev, 'muster');
    expect(rally(s, ev, 'spear')).toBe(true);
    expect(rally(s, ev, 'spear')).toBe(true);
    expect(rally(s, ev, 'spear')).toBe(false); // cap 2
    expect(canRally(s, 'blade')).toBe(false); // no champion
    expect(s.vans.count).toBe(2);
  });
  it('spearmen keep the wall healthier over the first two minutes', () => {
    const a = run(9, 120);
    const s = createState(9); const ev = new EventBus(); s.run.starlight = 200; buy(s, ev, 'muster'); rally(s, ev, 'spear'); rally(s, ev, 'spear');
    for (let i = 0; i < 120 / STEP; i++) step(s, STEP, noInputs, ev);
    expect(s.run.barHp).toBeGreaterThanOrEqual(a.s.run.barHp);
    expect(s.run.kills).toBeGreaterThan(a.s.run.kills);
  });
});

describe('prestige', () => {
  it('forced replant after a fall keeps heartwood and lifetime kills', () => {
    const { s, ev } = run(2, 20 * 60);
    expect(canReplant(s)).toBe(true);
    const kills = s.run.kills;
    replant(s, ev);
    expect(s.run.fallen).toBe(false); expect(s.run.wave).toBe(1); expect(s.run.barHp).toBeCloseTo(s.stats.barMax);
    expect(s.meta.lifetimeKills).toBe(kills); expect(s.meta.prestiges).toBe(1);
  });
  it('voluntary replant only from wave 12', () => {
    const s = createState(1, { ...freshRun(), wave: 11 }, freshMeta());
    expect(canReplant(s)).toBe(false);
    s.run.wave = 12; expect(canReplant(s)).toBe(true);
  });
});
