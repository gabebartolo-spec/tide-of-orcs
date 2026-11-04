import { describe, expect, it } from 'vitest';
import { Item, SLOTS } from '../data/loot';
import { MYTHICS, SETS } from '../data/lootTables';
import { PATH_FX as P, PathId } from '../data/paths';
import { NODE, NodeId } from '../data/skillTree';
import { EventBus } from './events';
import { damage, FX, impact, kill } from './combat';
import { createState, freshMeta, freshRun, SimState } from './state';
import { deriveStats, Levels, Stats } from './stats';
import { pickUp } from './loot';
import { rollDrop } from './lootRoll';
import { noInputs, spawnOrc, step } from './step';
import { choosePath, replant } from './prestige';
import { buy, unlocked } from './tree';
import { migrate } from '../save/migrate';
import { createRng } from './rng';
import { CURRENT_VERSION } from '../save/schema';

/** A run on `path`, wearing n pieces of `set` (or one `mythic`), with the given Grove levels. */
const on = (path: PathId | null, o: { levels?: Levels; set?: string; n?: number; mythic?: string } = {}): SimState => {
  const meta = freshMeta();
  if (o.set) SLOTS.slice(0, o.n ?? 6).forEach((slot, i) => pickUp(meta.loot, { uid: `s${i}`, base: 'x', slot, rarity: 'legendary', ilvl: 1, affixes: [], set: o.set } as Item, 'player'));
  if (o.mythic) { const m = MYTHICS.find((x) => x.id === o.mythic)!; pickUp(meta.loot, { uid: 'm', base: 'x', slot: m.slot, rarity: 'mythic', ilvl: 1, affixes: [], mythic: m.id } as Item, 'player'); }
  return createState(1, { ...freshRun(), path, levels: { root: 1, ...o.levels } }, meta);
};
const orcAt = (s: SimState, x: number, y: number) => { s.orcs.forEach((q) => { if (q.dead) s.orcs.release(q); }); const o = spawnOrc(s, 'grunt', y)!; o.x = x; o.hp = o.maxhp = 1e6; return o; };
const chain = (id: NodeId): Levels => { const lv: Levels = { root: 1 }; let n = NODE[id]; while (n) { lv[n.id] = n.max; n = n.parent ? NODE[n.parent] : undefined!; } return lv; };

describe('paths: starting bonus (TB-193a)', () => {
  const none = deriveStats({ root: 1 });
  it('Serpent starts with crit', () => expect(deriveStats({ root: 1 }, {}, {}, 'serpent').crit).toBeCloseTo(none.crit + P.startCrit));
  it('Fox starts with vanguard and companion damage', () => {
    const f = deriveStats({ root: 1 }, {}, {}, 'fox');
    expect(f.vanDmg).toBeCloseTo(none.vanDmg * (1 + P.startFox)); expect(f.petDmg).toBeCloseTo(none.petDmg * (1 + P.startFox));
  });
  it('Magpie starts with starlight', () => expect(deriveStats({ root: 1 }, {}, {}, 'magpie').starMult).toBeCloseTo(none.starMult * (1 + P.startStar)));
});

describe('paths: branch nodes count only on their path (TB-193a)', () => {
  const cases: [NodeId, PathId, (s: Stats) => number, Levels?][] = [
    ['coil', 'serpent', (s) => s.crit], ['viper', 'serpent', (s) => s.critMult], ['venom', 'serpent', (s) => s.venom],
    ['toxin', 'serpent', (s) => s.venomMult], ['gaze', 'serpent', (s) => s.radius],
    ['foxden', 'fox', (s) => s.vanDmg + s.petDmg], ['foxhide', 'fox', (s) => s.vanHp], ['foxrun', 'fox', (s) => s.vanRespawn],
    ['foxpack', 'fox', (s) => s.vanCap, { muster: 1 }], ['cunning', 'fox', (s) => s.units.wolf.rate],
    ['magpie', 'magpie', (s) => s.starMult], ['glitter', 'magpie', (s) => s.itemFind], ['trinket', 'magpie', (s) => s.luck],
    ['haggle', 'magpie', (s) => s.rerollMult], ['shiny', 'magpie', (s) => s.salvageMult],
  ];
  for (const [id, path, f, extra] of cases) it(`${id} changes its stat on ${path} only`, () => {
    const lv = { ...chain(id), ...extra }, base = { ...lv, [id]: 0 };
    expect(f(deriveStats(lv, {}, {}, path))).not.toBeCloseTo(f(deriveStats(base, {}, {}, path)), 6);
    const other: PathId = path === 'fox' ? 'magpie' : 'fox';
    expect(f(deriveStats(lv, {}, {}, other))).toBeCloseTo(f(deriveStats(base, {}, {}, other)), 6);
  });

  it('a path node unlocks and buys only on its path', () => {
    const s = on('magpie'); s.run.starlight = 1e9; s.run.fallen = true; // the Grove opens while fallen
    expect(unlocked(s, NODE.coil)).toBe(false); expect(buy(s, new EventBus(), 'coil')).toBe(false);
    expect(unlocked(s, NODE.magpie)).toBe(true); expect(buy(s, new EventBus(), 'magpie')).toBe(true);
  });
});

describe('paths: sets (TB-193a)', () => {
  it("Serpent's Coil 2: +crit", () => expect(on('serpent', { set: 'serpents-coil', n: 2 }).stats.crit).toBeCloseTo(on('serpent').stats.crit + P.setCrit));
  it("Serpent's Coil 4: crits poison", () => {
    const s = on('serpent', { set: 'serpents-coil', n: 4 }), o = orcAt(s, 600, 300); s.stats.crit = 1;
    impact(s, new EventBus(), { tx: 600, ty: 300, r: 40, dmg: 1 });
    expect(o.poison).toBe(P.venomSecs); expect(o.poisonDps).toBeCloseTo(s.stats.dmg * P.setVenom);
    const hp = o.hp; step(s, 0.5, noInputs, new EventBus()); expect(o.hp).toBeLessThan(hp);
  });
  it("Serpent's Coil 6: a poisoned orc bursts on death", () => {
    const s = on('serpent', { set: 'serpents-coil', n: 6 }), ev = new EventBus(), a = orcAt(s, 600, 300), b = orcAt(s, 630, 300);
    a.poison = 1; a.poisonDps = 5; kill(s, ev, a);
    expect(b.poison).toBe(P.venomSecs); expect(b.hp).toBeCloseTo(b.maxhp - s.stats.dmg * P.burst);
  });
  it('Foxfire Pack 2: +vanguard and companion damage', () => {
    const s = on('fox', { set: 'foxfire-pack', n: 2 }), b = on('fox');
    expect(s.stats.vanDmg).toBeCloseTo(b.stats.vanDmg * (1 + P.setFoxDmg)); expect(s.stats.petDmg).toBeCloseTo(b.stats.petDmg * (1 + P.setFoxDmg));
  });
  it('Foxfire Pack 4: vanguard return faster', () => expect(on('fox', { set: 'foxfire-pack', n: 4 }).stats.vanRespawn).toBeCloseTo(on('fox', { set: 'foxfire-pack', n: 2 }).stats.vanRespawn * (1 - P.setReturn)));
  it('Foxfire Pack 6: vanguard damage per companion', () => {
    const lv = { wolf: 1 }, four = on('fox', { set: 'foxfire-pack', n: 4, levels: lv }), six = on('fox', { set: 'foxfire-pack', n: 6, levels: lv });
    expect(six.stats.vanDmg).toBeCloseTo(four.stats.vanDmg * (1 + P.packBuff * 1));
  });
  it("Magpie's Hoard 2: +starlight", () => expect(on('magpie', { set: 'magpies-hoard', n: 2 }).stats.starMult).toBeCloseTo(on('magpie').stats.starMult * (1 + P.setStar)));
  it("Magpie's Hoard 4: kills drop bonus shards", () => {
    const s = on('magpie', { set: 'magpies-hoard', n: 4 }), ev = new EventBus(); s.stats.shardP = 1;
    const o = orcAt(s, 600, 300); s.run.starlight = 0; kill(s, ev, o);
    expect(s.run.starlight).toBeCloseTo(o.loot * s.stats.starMult * (1 + P.shardMult));
  });
  it("Magpie's Hoard 6: every fifth drop rolls a rarity higher", () => {
    const s = on('magpie', { set: 'magpies-hoard', n: 6 }), ev = new EventBus();
    s.stats.itemFind = 1e9; s.stats.satchelCap = 999;
    for (let i = 0; i < 500 && s.run.hoardN < P.hoardEvery; i++) kill(s, ev, orcAt(s, 600, 300));
    expect(s.run.hoardN).toBe(P.hoardEvery);
    // the same rolls without the bump: the fifth item comes out one rarity lower somewhere across seeds
    const lo = (bump: number) => rollDrop(createRng(7), freshMeta().loot, 'grunt', 1, 0, { itemFind: 1e9, luck: 0, bump })!.rarity;
    expect(lo(1)).not.toBe(lo(0));
  });
});

describe('paths: mythics (TB-193a)', () => {
  it('Fang: every fifth shot is a venom arrow that splits', () => {
    const s = on('serpent', { mythic: 'serpent-fang' }), ev = new EventBus();
    let lobs = 0, venom = 0;
    for (let i = 0; i < P.fangEvery; i++) { s.run.shotT[0] = 99; step(s, 0, { ...noInputs, aim: { x: 600, y: 300 } }, ev); }
    s.shots.forEach((p) => { if (p.kind === 'lob') { lobs++; if (p.fx & FX.VENOM) venom++; } });
    expect(venom).toBe(s.stats.arrows + P.fangSplit); expect(lobs).toBe(P.fangEvery - 1 + venom);
    const o = orcAt(s, 700, 200); impact(s, ev, { tx: 700, ty: 200, r: 40, dmg: 0, fx: FX.VENOM });
    expect(o.poisonDps).toBeCloseTo(s.stats.dmg * P.fangVenom);
  });
  it('Foxfire Tail: a fox bites, harder per companion', () => {
    const s = on('fox', { mythic: 'foxfire-tail', levels: { wolf: 1 } }), ev = new EventBus();
    expect(s.stats.foxfire).toBeCloseTo(s.stats.dmg * P.foxMult * (1 + P.foxGrow * 1));
    const o = orcAt(s, s.fox.x + 5, s.fox.y); s.wolf.x = 2000; s.fox.biteT = 99;
    step(s, 1 / 60, noInputs, ev); expect(o.hp).toBeLessThan(o.maxhp);
    expect(on('fox').stats.foxfire).toBe(0);
  });
  it("Magpie's Talon: arrow kills steal more starlight; other kills do not", () => {
    const s = on('magpie', { mythic: 'magpies-talon' }), ev = new EventBus();
    const a = orcAt(s, 600, 300); s.run.starlight = 0; a.hp = 1; damage(s, ev, a, 10, true);
    expect(s.run.starlight).toBeCloseTo(a.loot * s.stats.starMult * (1 + P.talonStar));
    const b = orcAt(s, 600, 300); s.run.starlight = 0; b.hp = 1; damage(s, ev, b, 10);
    expect(s.run.starlight).toBeCloseTo(b.loot * s.stats.starMult);
  });
  it("Magpie's Talon: an arrow kill can roll an extra drop", () => {
    // a boss always drops, so each roll lands; force the Talon's chance to 1 to see the extra roll
    const fx = P as { talonDrop: number }, was = fx.talonDrop; fx.talonDrop = 1;
    const drops = (talon: boolean) => {
      const s = on('magpie', talon ? { mythic: 'magpies-talon' } : {}), ev = new EventBus(), o = orcAt(s, 600, 300);
      s.stats.satchelCap = 999; o.kind = 'boss'; o.hp = 1; damage(s, ev, o, 10, true);
      return ev.drain().filter((e) => e.t === 'loot').length;
    };
    try { expect(drops(true)).toBe(drops(false) + 1); } finally { fx.talonDrop = was; }
  });
});

describe('paths: drops are gated by the chosen path (TB-193a)', () => {
  const ids = (path: PathId | null, pool: 'set' | 'mythic') => {
    const rng = createRng(3), loot = freshMeta().loot, seen = new Set<string>();
    for (let i = 0; i < 3000; i++) { const it = rollDrop(rng, loot, 'boss', 50, 5, { itemFind: 1e9, luck: 10, path }); const v = it?.[pool]; if (v) seen.add(v); }
    return seen;
  };
  it('no path: no path set or mythic ever drops', () => {
    for (const x of [...SETS, ...MYTHICS].filter((d) => d.path)) { expect(ids(null, 'set').has(x.id)).toBe(false); expect(ids(null, 'mythic').has(x.id)).toBe(false); }
  });
  it("on a path: its own set and mythic drop, never another path's", () => {
    expect(ids('fox', 'set').has('foxfire-pack')).toBe(true); expect(ids('fox', 'mythic').has('foxfire-tail')).toBe(true);
    expect(ids('fox', 'set').has('serpents-coil')).toBe(false); expect(ids('fox', 'mythic').has('magpies-talon')).toBe(false);
  });
});

describe('paths: choosing and replanting (TB-193a)', () => {
  it('the path is picked only while fallen, and carries through Replant', () => {
    const s = on(null);
    expect(choosePath(s, 'fox')).toBe(false);
    s.run.fallen = true;
    expect(choosePath(s, 'fox')).toBe(true); expect(s.run.path).toBe('fox'); expect(s.stats.path).toBe('fox');
    expect(choosePath(s, 'bogus' as PathId)).toBe(false);
    replant(s, new EventBus()); expect(s.run.path).toBe('fox');
    s.run.fallen = true; replant(s, new EventBus(), undefined, 'serpent'); expect(s.run.path).toBe('serpent');
  });
  it('v13 saves migrate to v14 with no path', () => {
    const m = migrate({ version: 13, savedAt: 0, run: { ...freshRun(), path: undefined, hoardN: undefined }, meta: freshMeta(), settings: {} }) as { version: number; run: { path: unknown; hoardN: unknown } };
    expect(m.version).toBe(CURRENT_VERSION); expect(m.run.path).toBeNull(); expect(m.run.hoardN).toBe(0);
  });
});
