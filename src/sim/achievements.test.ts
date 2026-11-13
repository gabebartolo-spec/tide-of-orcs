import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, ACH_GROUPS, ACH_N, COSMETICS, steamName } from '../data/achievements';
import { NODES } from '../data/skillTree';
import { SETS } from '../data/lootTables';
import { SimEvent } from './events';
import { SimState, createState } from './state';
import { freshAchPending, setTitle, sweepAchievements, trackAchievements } from './achievements';
import { step } from './step';
import { EventBus } from './events';

const kill = (o: Partial<Extract<SimEvent, { t: 'kill' }>> = {}): SimEvent => ({ t: 'kill', x: 0, y: 0, loot: 1, kind: 'grunt', by: 'other', champ: false, beats: 0, ...o });
const run = (s: SimState, evs: SimEvent[]): string[] => trackAchievements(s, evs, s.achPend);

describe('achievement list (TB-248)', () => {
  it('has 100 stable snake_case ids in the five groups, each with exactly one reward', () => {
    expect(ACHIEVEMENTS).toHaveLength(100);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(100);
    const n = Object.fromEntries(ACH_GROUPS.map((g) => [g, ACHIEVEMENTS.filter((a) => a.group === g).length]));
    expect(n).toEqual({ progress: 28, collection: 34, challenge: 18, fun: 12, secret: 8 });
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toMatch(/^[a-z0-9_]+$/);
      expect(Number(!!a.title) + Number(!!a.cosmetic)).toBe(1);
    }
    expect(steamName('slain_1k')).toBe('ACH_SLAIN_1K');
  });
  it('gives every cosmetic to exactly one achievement', () => {
    const given = ACHIEVEMENTS.flatMap((a) => (a.cosmetic ? [a.cosmetic] : []));
    expect(new Set(given).size).toBe(given.length);
    expect(given.sort()).toEqual(Object.keys(COSMETICS).sort());
  });
  it('has a set achievement for every set', () => {
    for (const x of SETS) expect(ACHIEVEMENTS.some((a) => a.id === `set_${x.id.replace(/-/g, '_')}`)).toBe(true);
  });
});

describe('achievement checks (TB-249)', () => {
  it('a kill earns First Blood once, and lifetime thresholds as they pass', () => {
    const s = createState(1); s.meta.lifetimeKills = 1;
    expect(run(s, [kill()])).toContain('first_blood');
    expect(run(s, [kill()])).not.toContain('first_blood');
    s.meta.lifetimeKills = ACH_N.slain.slain_1k;
    expect(run(s, [kill()])).toEqual(expect.arrayContaining(['slain_100', 'slain_1k']));
  });
  it('counts one lob\'s kills up to its impact', () => {
    const s = createState(1), lob = Array.from({ length: ACH_N.oneLob }, () => kill({ by: 'lob' }));
    expect(run(s, [...lob.slice(1), { t: 'impact', x: 0, y: 0, r: 1 }])).not.toContain('one_lob_10');
    expect(run(s, [...lob, { t: 'impact', x: 0, y: 0, r: 1 }])).toContain('one_lob_10');
  });
  it('a hand replant at wave 12 is the secret; a fall is not', () => {
    const s = createState(1);
    expect(run(s, [{ t: 'barricadeFell', wave: 12, kills: 0, runTime: 0, heartwood: 0 }])).toEqual(['first_fall']);
    expect(run(s, [{ t: 'barricadeFell', wave: 12, kills: 0, runTime: 0, heartwood: 0, chosen: true }])).toEqual(['secret_twelve']);
  });
  it('wave challenges need the run to start below the wave', () => {
    const s = createState(1); s.run.ach.from = 26;
    expect(run(s, [{ t: 'wave', wave: 27 }])).not.toContain('no_vanguard');
    const t = createState(1); t.run.wave = 25;
    expect(run(t, [{ t: 'wave', wave: 25 }])).toEqual(expect.arrayContaining(['no_vanguard', 'bow_only', 'lean_tree', 'untouched_10', 'first_run_25', 'wave_25']));
  });
  it('a wall hit spoils Not a Scratch', () => {
    const s = createState(1);
    run(s, [{ t: 'barricadeHit', y: 0, amount: 1, frac: 0.9 }]);
    expect(run(s, [{ t: 'wave', wave: 10 }])).not.toContain('untouched_10');
  });
  it('a cleared boss wave checks its challenges, path and roster', () => {
    const s = createState(1); s.run.wave = 25; s.run.bossDone = 1; s.run.path = 'fox';
    const got = run(s, [{ t: 'bossStart' }, { t: 'bossEnd', cleared: true, loot: 0, hw: 3, secs: 30 }]);
    expect(got).toEqual(expect.arrayContaining(['first_boss', 'boss_unscathed', 'boss_swift', 'boss_naked', 'path_fox']));
    expect(got).not.toContain('boss_last_plank');
    expect(s.meta.ach.bosses).toEqual(['warboss']); expect(s.meta.ach.n.boss).toBe(1);
  });
  it('a boss wave left to run out untouched is Let Them March', () => {
    const s = createState(1);
    expect(run(s, [{ t: 'bossStart' }, { t: 'bossEnd', cleared: false, loot: 0, hw: 0, secs: 60 }])).toEqual(['secret_let_march']);
  });
  it('a drummer slain within two beats; a Warboss by thorns', () => {
    const s = createState(1);
    expect(run(s, [kill({ kind: 'drummer', beats: 3 })])).not.toContain('drummer_quick');
    expect(run(s, [kill({ kind: 'drummer', beats: 2 })])).toContain('drummer_quick');
    expect(run(s, [kill({ kind: 'boss', by: 'thorns' })])).toContain('secret_thorn_boss');
  });
  it('the sweep grants what an old save already holds', () => {
    const s = createState(1);
    s.meta.lifetimeKills = 12_000; s.meta.bestWave = 60; s.meta.prestiges = 11; s.meta.tier = 3;
    s.meta.camp.levels = { bowyer: 3, forge: 3, kitchen: 3, training: 3 };
    for (const n of NODES) if (!n.path && n.branch === 'Bow') s.run.levels[n.id] = n.max;
    const got = sweepAchievements(s);
    expect(got).toEqual(expect.arrayContaining(['slain_10k', 'wave_50', 'replant_10', 'tier_3', 'camp_full', 'camp_bowyer', 'branch_bow', 'first_node']));
    expect(got).not.toContain('slain_100k'); expect(got).not.toContain('first_fall');
    expect(sweepAchievements(s)).toEqual([]);
  });
  it('titles: only an earned achievement whose reward is a title', () => {
    const s = createState(1);
    expect(setTitle(s, 'first_blood')).toBe(false);
    s.meta.ach.earned.push('first_blood', 'slain_1k');
    expect(setTitle(s, 'first_blood')).toBe(true); expect(s.meta.ach.title).toBe('first_blood');
    expect(setTitle(s, 'slain_1k')).toBe(false); // a cosmetic, not a title
    expect(setTitle(s, null)).toBe(true);
  });
  it('real play earns First Blood through the sim events (pure, deterministic)', () => {
    const s = createState(3), ev = new EventBus(), pend = freshAchPending(), got: string[] = [];
    for (let i = 0; i < 30 * 40; i++) {
      let aim: { x: number; y: number } | null = null;
      for (const o of s.orcs.items) if (o.live && (!aim || o.x < aim.x)) aim = { x: o.x, y: o.y };
      step(s, 1 / 30, { aim }, ev); got.push(...trackAchievements(s, ev.drain(), pend));
    }
    expect(got).toEqual(expect.arrayContaining(['first_blood', 'first_fall']));
  });
});
