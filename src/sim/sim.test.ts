import { describe, expect, it } from 'vitest';
import { createState, freshRun, freshMeta, recompute } from './state';
import { EventBus } from './events';
import { Inputs, noInputs, step } from './step';
import { deriveStats } from './stats';
import { buy, canBuy, costOf } from './tree';
import { NODE, NODES } from '../data/skillTree';
import { STEP } from '../data/balance';
import { canRally, rally } from './vanguard';
import { crowdAim } from './combat';
import { canReplant, replant } from './prestige';
import { createRng } from './rng';

/** A still, very tough orc at (x, y), for hit tests. */
const spawnAt = (s: ReturnType<typeof createState>, x: number, y: number) => {
  const o = s.orcs.alloc()!; Object.assign(o, { kind: 'grunt', x, y, hp: 1e6, maxhp: 1e6, spd: 0, r: 10, loot: 0, atk: 0, dead: false, burn: 0, hitT: 0, wob: 0, swingT: 0 });
  return o;
};
/** Player model: aims at the thickest crowd every step. */
const aimed = (s: ReturnType<typeof createState>): Inputs => ({ aim: crowdAim(s, s.stats.radius) });
const run = (seed: number, secs: number, inputs?: Inputs) => {
  const s = createState(seed); const ev = new EventBus();
  for (let i = 0; i < secs / STEP; i++) step(s, STEP, inputs ?? aimed(s), ev);
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
    expect(s.run.wave).toBeGreaterThanOrEqual(3); expect(s.run.wave).toBeLessThanOrEqual(4); // a bare run falls at wave 3–4 (TB-080)
  });
  it('a fallen run stops ticking', () => {
    const { s } = run(2, 20 * 60); const t = s.t; const ev = new EventBus();
    step(s, STEP, noInputs, ev); expect(s.t).toBe(t);
  });
  it('the arrow lands on the aim point and hits every orc in the circle', () => {
    const s = createState(5); const ev = new EventBus();
    s.run.shotT[0] = 10; // bow is ready
    step(s, STEP, { aim: { x: 700, y: 200 } }, ev);
    expect(s.shots.count).toBe(1);
    let tx = 0, ty = 0; s.shots.forEach((a) => { tx = a.tx; ty = a.ty; });
    expect([tx, ty]).toEqual([700, 200]);
    s.orcs.forEach((o) => { o.dead = true; });
    const near = spawnAt(s, 700 + s.stats.radius - 5, 200), mid = spawnAt(s, 700, 200), far = spawnAt(s, 700 + s.stats.radius + 40, 200);
    for (let i = 0; i < 1 / STEP; i++) step(s, STEP, noInputs, ev);
    expect(near.hp).toBeLessThan(near.maxhp); expect(mid.hp).toBeLessThan(mid.maxhp); expect(far.hp).toBe(far.maxhp);
    expect(ev.drain().some((e) => e.t === 'impact')).toBe(true);
  });
  it('the elf never shoots without aim, or with aim behind the wall', () => {
    const s = createState(5); const ev = new EventBus(); s.run.shotT[0] = 10;
    step(s, STEP, noInputs, ev); step(s, STEP, { aim: { x: 100, y: 240 } }, ev);
    expect(s.shots.count).toBe(0);
  });
  it('Wide Volley widens the circle 20% per rank; Quick Draw shortens the draw', () => {
    expect(deriveStats({ root: 1, wide: 2 }, 0).radius / deriveStats({ root: 1 }, 0).radius).toBeCloseTo(1.44);
    expect(deriveStats({ root: 1, draw: 1 }, 0).lobCd).toBeCloseTo(2.5 / 1.15);
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
  it('fury ranks toughen one kind and raise its starlight; swarm speeds its spawns', () => {
    const st = deriveStats({ root: 1, drums: 2, runners: 1, runswarm: 1 }, 0);
    expect(st.foes.grunt.hp).toBeCloseTo(1.69); expect(st.foes.grunt.loot).toBeCloseTo(1.96);
    expect(st.foes.runner.hp).toBe(1); expect(st.foes.runner.spawn).toBeCloseTo(1.2);
    expect(st.foes.brute.on).toBe(false);
  });
  it('only grunts march until another kind is summoned', () => {
    const kinds = (lv: Record<string, number>) => {
      const s = createState(4); Object.assign(s.run.levels, lv); recompute(s); const ev = new EventBus(); const seen = new Set<string>();
      for (let i = 0; i < 90 / STEP; i++) { step(s, STEP, aimed(s), ev); s.orcs.forEach((o) => { seen.add(o.kind); }); }
      return seen;
    };
    expect([...kinds({})]).toEqual(['grunt']);
    expect(kinds({ runners: 1, brutes: 1 }).has('runner')).toBe(true);
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
    for (let i = 0; i < 120 / STEP; i++) step(s, STEP, aimed(s), ev);
    expect(s.run.barHp).toBeGreaterThanOrEqual(a.s.run.barHp);
    expect(s.run.kills).toBeGreaterThanOrEqual(a.s.run.kills); // the aimed bow already clears early waves
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

describe('kinship, bounty, horde (TB-039)', () => {
  const comp = { root: 1, ranger: 1, wolf: 1, knives: 1, ballista: 1, muster: 1 };
  it('kinship scales every companion and the vanguard by 1.2 per rank', () => {
    const a = deriveStats(comp, 0), b = deriveStats({ ...comp, bond: 3 }, 0), k = 1.2 ** 3;
    expect(b.kin / a.kin).toBeCloseTo(k);
    expect(b.wolf / a.wolf).toBeCloseTo(k);
    expect(b.knives!.dmg / a.knives!.dmg).toBeCloseTo(k);
    expect(b.ballista / a.ballista).toBeCloseTo(k);
    expect(b.vanDmg / a.vanDmg).toBeCloseTo(k);
    expect(b.dmg).toBeCloseTo(a.dmg);
  });
  it('bounty multiplies warboss starlight only', () => {
    expect(deriveStats({ root: 1 }, 0).bounty).toBe(1);
    expect(deriveStats({ root: 1, bounty: 2 }, 0).bounty).toBe(3);
  });
  it('horde spawns more orcs', () => {
    const count = (horde: number) => {
      const s = createState(3); s.run.levels.horde = horde; recompute(s); const ev = new EventBus();
      for (let i = 0; i < 60 / STEP; i++) step(s, STEP, aimed(s), ev);
      let live = 0; s.orcs.forEach((o) => { if (!o.dead) live++; });
      return s.run.kills + live;
    };
    expect(deriveStats({ root: 1, horde: 5 }, 0).foes.grunt.spawn).toBeCloseTo(1.2 ** 5);
    expect(count(5)).toBeGreaterThan(count(0) * 1.5);
  });
});
