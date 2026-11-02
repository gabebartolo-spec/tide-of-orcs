import { describe, expect, it } from 'vitest';
import { createState, freshRun, freshMeta, recompute } from './state';
import { EventBus } from './events';
import { Inputs, noInputs, step } from './step';
import { deriveStats } from './stats';
import { buy, canBuy, costOf } from './tree';
import { NODE, NODES } from '../data/skillTree';
import { FIELD, STEP, waveLoot } from '../data/balance';
import { BOSS_WAVE, bossHw } from '../data/bosses';
import { bossesReady, summonBoss } from './boss';
import { damage } from './combat';
import { hurtVanguard, nearestOrcTo } from './vanguard';
import { spawnOrc } from './step';
import { VANGUARD } from '../data/balance';
import { crowdAim } from './combat';
import { canPullBack, canReplant, pullBack, replant } from './prestige';
import { createRng } from './rng';

/** A still, very tough orc at (x, y), for hit tests. */
const spawnAt = (s: ReturnType<typeof createState>, x: number, y: number) => {
  const o = s.orcs.alloc()!; Object.assign(o, { kind: 'grunt', x, y, hp: 1e6, maxhp: 1e6, spd: 0, r: 10, loot: 0, atk: 0, dead: false, burn: 0, hitT: 0, wob: 0, swingT: 0, champ: false });
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
    const base = deriveStats({ root: 1 });
    for (const n of NODES) {
      if (n.id === 'root') continue;
      const lv: Record<string, number> = { root: 1 };
      // own the whole ancestor chain so dependent stats (e.g. ranks needs muster) resolve
      let p: typeof n | undefined = n; while (p) { lv[p.id] = p.max; p = p.parent ? NODE[p.parent] : undefined; }
      const st = deriveStats(lv);
      expect(JSON.stringify(st), n.id).not.toBe(JSON.stringify(base));
    }
  });
  it('Heartwood grants no passive bonus (P-142): stats depend only on the trees', () => {
    const a = createState(1), b = createState(1); b.meta.heartwood = 50; recompute(b);
    expect(b.stats.dmg).toBe(a.stats.dmg); expect(b.stats.starMult).toBe(a.stats.starMult); expect(b.stats.barMax).toBe(a.stats.barMax);
  });
});

describe('simulation', () => {
  it('is deterministic for the same seed', () => {
    const a = run(3, 60), b = run(3, 60);
    expect(a.s.run.starlight).toBe(b.s.run.starlight);
    expect(a.s.run.kills).toBe(b.s.run.kills);
  });
  it('spawns orcs, kills some and earns starlight before the first fall', () => {
    const { s, ev } = run(1, 20);
    expect(s.run.kills).toBeGreaterThan(0);
    expect(s.run.starlight).toBeGreaterThan(0);
    expect(s.run.wave).toBe(1);
    expect(ev.drain().some((e) => e.t === 'kill')).toBe(true);
  });
  it('the barricade takes damage and eventually falls with no purchases', () => {
    const { s } = run(2, 20 * 60);
    expect(s.run.fallen).toBe(true);
    expect(s.run.barHp).toBe(0);
    expect(s.run.wave).toBeGreaterThanOrEqual(2); expect(s.run.wave).toBeLessThanOrEqual(3); // a bare run falls at wave 2–3 (TB-154)
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
    const old: Parameters<typeof s.orcs.release>[0][] = []; s.orcs.forEach((o) => old.push(o)); old.forEach((o) => s.orcs.release(o));
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
    expect(deriveStats({ root: 1, wide: 2 }).radius / deriveStats({ root: 1 }).radius).toBeCloseTo(1.44);
    expect(deriveStats({ root: 1, draw: 1 }).lobCd).toBeCloseTo(1.25 / 1.15);
  });
});

describe('tree', () => {
  it('buys when affordable and unlocked, refuses otherwise', () => {
    const s = createState(1); const ev = new EventBus();
    s.run.fallen = true; // the Grove is bought between runs (TB-136)
    expect(canBuy(s, NODE.sharp)).toBe(false);
    s.run.starlight = 100;
    expect(buy(s, ev, 'draw')).toBe(false); // parent not owned
    expect(buy(s, ev, 'sharp')).toBe(true);
    expect(s.run.starlight).toBe(88);
    expect(s.stats.dmg).toBeCloseTo(11.25);
  });
  it('fury ranks toughen one kind and raise its starlight; swarm speeds its spawns', () => {
    const st = deriveStats({ root: 1, drums: 2, runners: 1, runswarm: 1 });
    expect(st.foes.grunt.hp).toBeCloseTo(1.69); expect(st.foes.grunt.loot).toBeCloseTo(1.96);
    expect(st.foes.runner.hp).toBe(1); expect(st.foes.runner.spawn).toBeCloseTo(2.4); expect(st.foes.runner.loot).toBeCloseTo(1.5);
    expect(st.foes.brute.on).toBe(false); expect(st.foes.brute.spawn).toBe(1);
  });
  it('runners join from wave 5, brutes from 10, Blackguard from 20; summoning doubles a kind (TB-158)', () => {
    const count = (wave: number, lv: Record<string, number> = {}) => {
      const s = createState(4); s.run.wave = wave; Object.assign(s.run.levels, lv); recompute(s); const ev = new EventBus();
      const n: Record<string, number> = {}; let live = new Set<object>();
      for (let i = 0; i < 23 / STEP; i++) { // one wave (WAVE_LEN 24)
        step(s, STEP, aimed(s), ev); const now = new Set<object>();
        s.orcs.forEach((o) => { now.add(o); if (!live.has(o)) n[o.kind] = (n[o.kind] ?? 0) + 1; }); live = now; // pooled: count arrivals
      }
      return (k: string) => n[k] ?? 0;
    };
    expect(count(4)('runner')).toBe(0);
    const w5 = count(5); expect(w5('runner')).toBeGreaterThan(0); expect(w5('brute')).toBe(0);
    const w10 = count(10); expect(w10('brute')).toBeGreaterThan(0); expect(w10('elite')).toBe(0);
    expect(count(20)('elite')).toBeGreaterThan(0);
    expect(count(5, { runners: 1 })('runner')).toBeGreaterThan(w5('runner') * 1.5);
  });
  it('only between runs: the tree refuses a buy while the wall stands', () => {
    const s = createState(1); const ev = new EventBus(); s.run.starlight = 100;
    expect(buy(s, ev, 'sharp')).toBe(false);
  });
  it('the tree and banked starlight carry over a replant', () => {
    const s = createState(1); const ev = new EventBus(); s.run.starlight = 100; s.run.fallen = true;
    buy(s, ev, 'sharp'); replant(s, ev);
    expect(s.run.levels.sharp).toBe(1); expect(s.run.starlight).toBe(88); expect(s.run.fallen).toBe(false);
  });
  it('node price scales with the wave past 10', () => {
    const s = createState(1);
    expect(costOf(s, NODE.sharp)).toBe(12);
    s.run.wave = 12;
    expect(costOf(s, NODE.sharp)).toBe(15); // 12 × 1.1² = 14.52
  });
  it('growing the wall heals the new timber', () => {
    const s = createState(1); const ev = new EventBus();
    s.run.barHp = 100; s.run.starlight = 1000; s.run.fallen = true;
    buy(s, ev, 'timber');
    expect(s.stats.barMax).toBeCloseTo(187.5); expect(s.run.barHp).toBeCloseTo(137.5);
  });
});

describe('vanguard', () => {
  it('only advance on orcs past halfway (TB-169)', () => {
    const s = createState(1); const ev = new EventBus();
    step(s, STEP, aimed(s), ev);
    s.run.starlight = 1000; s.run.fallen = true; buy(s, ev, 'muster'); s.run.fallen = false; step(s, STEP, aimed(s), ev);
    let v = null as null | Parameters<typeof nearestOrcTo>[1]; s.vans.forEach((x) => { v ??= x; });
    const old: Parameters<typeof s.orcs.release>[0][] = []; s.orcs.forEach((o) => old.push(o)); old.forEach((o) => s.orcs.release(o));
    spawnOrc(s, 'grunt', FIELD.h / 2); let o = null as null | ReturnType<typeof nearestOrcTo>; s.orcs.forEach((x) => { o = x; }); o!.dead = false;
    o!.x = (FIELD.barX + FIELD.w) / 2 + 5; expect(nearestOrcTo(s, v!)).toBeNull();
    o!.x = (FIELD.barX + FIELD.w) / 2 - 5; expect(nearestOrcTo(s, v!)).toBe(o);
    v!.face = -1; s.orcs.release(o!); step(s, STEP, aimed(s), ev); v!.x = v!.tx; v!.y = v!.ty;
    s.orcs.forEach((x) => { x.x = FIELD.w; }); step(s, STEP, aimed(s), ev); expect(v!.face).toBe(1);
  });
  it('Muster keeps the line full; the fallen return after the respawn timer', () => {
    const s = createState(1); const ev = new EventBus();
    step(s, STEP, aimed(s), ev); expect(s.vans.count).toBe(0);
    s.run.starlight = 1000; s.run.fallen = true; buy(s, ev, 'muster'); s.run.fallen = false;
    step(s, STEP, aimed(s), ev); expect(s.vans.count).toBe(2);
    let v = null as null | Parameters<typeof hurtVanguard>[2]; s.vans.forEach((x) => { v ??= x; });
    hurtVanguard(s, ev, v!, 1e9); expect(s.vans.count).toBe(1);
    for (let t = 0; t < VANGUARD.respawn - 1; t += STEP) step(s, STEP, aimed(s), ev);
    expect(s.vans.count).toBe(1);
    for (let t = 0; t < 2; t += STEP) step(s, STEP, aimed(s), ev);
    expect(s.vans.count).toBe(2);
  });
  it('spearmen keep the wall healthier over the first two minutes', () => {
    const a = run(9, 120);
    const s = createState(9); const ev = new EventBus(); s.run.starlight = 1000; s.run.fallen = true; buy(s, ev, 'muster'); s.run.fallen = false;
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
  it('pulling back from wave 12 ends the run like a fall (TB-136)', () => {
    const ev = new EventBus(), s = createState(1, { ...freshRun(), wave: 11, kills: 500 }, freshMeta());
    expect(pullBack(s, ev)).toBe(false); expect(s.run.fallen).toBe(false);
    s.run.wave = 12; expect(canPullBack(s)).toBe(true);
    expect(pullBack(s, ev)).toBe(true);
    expect(s.run.fallen).toBe(true); expect(s.meta.bestWave).toBe(12); expect(canPullBack(s)).toBe(false);
    expect(ev.drain().some((e) => e.t === 'barricadeFell' && e.chosen)).toBe(true);
  });
});

describe('kinship, horde (TB-039)', () => {
  const comp = { root: 1, ranger: 1, wolf: 1, knives: 1, ballista: 1, muster: 1 };
  it('kinship scales every companion and the vanguard by 1.2 per rank', () => {
    const a = deriveStats(comp), b = deriveStats({ ...comp, bond: 3 }), k = 1.2 ** 3;
    expect(b.kin / a.kin).toBeCloseTo(k);
    expect(b.wolf / a.wolf).toBeCloseTo(k);
    expect(b.knives!.dmg / a.knives!.dmg).toBeCloseTo(k);
    expect(b.ballista / a.ballista).toBeCloseTo(k);
    expect(b.vanDmg / a.vanDmg).toBeCloseTo(k);
    expect(b.dmg).toBeCloseTo(a.dmg);
  });
  it('horde spawns more orcs', () => {
    const count = (horde: number) => {
      const s = createState(3); s.run.levels.horde = horde; recompute(s); const ev = new EventBus();
      for (let i = 0; i < 60 / STEP; i++) step(s, STEP, aimed(s), ev);
      let live = 0; s.orcs.forEach((o) => { if (!o.dead) live++; });
      return s.run.kills + live;
    };
    expect(deriveStats({ root: 1, horde: 5 }).foes.grunt.spawn).toBeCloseTo(1.2 ** 5);
    expect(count(5)).toBeGreaterThan(count(0) * 1.5);
  });
});

describe('boss waves (TB-081)', () => {
  const at = (wave: number) => { const s = createState(6); s.run.wave = wave; s.stats.barMax = s.run.barHp = 1e9; return s; }; // a wall that never falls
  /** A boss waiting at a low wave (one owed), so its orcs stay weak enough to clear. */
  const owed = (wave: number) => { const s = at(wave); s.run.bossDone = -1; return s; };
  it('one unlocks every BOSS_WAVE.every waves and waits to be summoned', () => {
    const B = BOSS_WAVE.every;
    expect(bossesReady(at(B - 1))).toBe(0); expect(bossesReady(at(B))).toBe(1); expect(bossesReady(at(2 * B + 3))).toBe(2);
    const s = at(B), ev = new EventBus();
    for (let i = 0; i < 5 / STEP; i++) step(s, STEP, noInputs, ev);
    expect(s.run.boss).toBeNull();
    expect(summonBoss(s, ev)).toBe(true); expect(summonBoss(s, ev)).toBe(false);
    expect(bossesReady(s)).toBe(0);
  });
  it('plays its script for 60 s with regular marching paused, and the Warboss marches only in it', () => {
    const s = owed(10), ev = new EventBus(); summonBoss(s, ev);
    const kinds = new Set<string>(); let champs = 0;
    for (let i = 0; i < 30 / STEP; i++) { step(s, STEP, noInputs, ev); s.orcs.forEach((o) => { kinds.add(o.kind); if (!o.champ) champs = -1e9; }); }
    expect(kinds.has('boss')).toBe(true); expect(champs).toBe(0);
    for (let i = 0; i < 31 / STEP && !s.run.fallen; i++) step(s, STEP, noInputs, ev);
    expect(s.run.boss).toBeNull();
    const end = ev.drain().find((e) => e.t === 'bossEnd'); expect(end).toMatchObject({ t: 'bossEnd', cleared: false, loot: 0 });
    const plain = at(10); for (let i = 0; i < 60 / STEP; i++) { step(plain, STEP, aimed(plain), new EventBus()); plain.orcs.forEach((o) => { expect(o.kind).not.toBe('boss'); }); }
  });
  it('clearing every orc in time pays a starlight bounty and banks Heartwood at once (P-142)', () => {
    const s = owed(10), ev = new EventBus(); summonBoss(s, ev);
    let paid = 0, hw = 0;
    for (let i = 0; i < 60 / STEP && s.run.boss; i++) {
      step(s, STEP, noInputs, ev);
      s.orcs.forEach((o) => { if (!o.dead && o.champ && o.x < FIELD.w - 40) damage(s, ev, o, 1e9); });
      for (const e of ev.drain()) if (e.t === 'bossEnd') { expect(e.cleared).toBe(true); paid = e.loot; hw = e.hw; }
    }
    expect(paid).toBeCloseTo(BOSS_WAVE.clearLoot * waveLoot(s.run.wave) * s.stats.starMult);
    expect(hw).toBe(bossHw(s.run.wave)); expect(s.meta.heartwood).toBe(hw);
  });
  it('boss Heartwood: 3 per 25 waves reached, at least 3', () => {
    expect(bossHw(10)).toBe(3); expect(bossHw(25)).toBe(3); expect(bossHw(50)).toBe(6); expect(bossHw(99)).toBe(9);
  });
});
