import { describe, expect, it } from 'vitest';
import { Item } from '../data/loot';
import { HW_FX, HwLevels } from '../data/heartwood';
import { NODE_FX } from '../data/balance';
import { MYTHIC_FX, SATCHEL, SPOILS_FX, affixScale } from '../data/lootTables';
import { EventBus } from './events';
import { kill } from './combat';
import { createState, freshMeta, freshRun, SimState } from './state';
import { Levels, deriveStats } from './stats';
import { canBuyHw } from './heartwood';
import { growHeirloom, pickUp, salvage, salvageGlimmer, toggleHeirloom } from './loot';
import { lootMods } from './gear';
import { rollDrop } from './lootRoll';
import { createRng } from './rng';
import { replant } from './prestige';
import { spawnOrc } from './step';

const item = (uid: string, extra: Partial<Item> = {}): Item => ({ uid, base: 'x', slot: 'bow', rarity: 'epic', ilvl: 10, affixes: [{ id: 'sharp', value: 0.1 }], ...extra });
const st = (lv: Levels = {}, hw: HwLevels = {}) => deriveStats({ root: 1, ...lv }, 0, hw);
const orc = (s: SimState, kind: 'grunt' | 'boss') => { spawnOrc(s, kind, 300); let o = null as ReturnType<typeof s.orcs.alloc>; s.orcs.forEach((q) => { o = q; }); return o!; };
const drops = (ev: EventBus) => ev.drain().filter((e) => e.t === 'loot').length;

describe('Heartwood loot lines (TB-101)', () => {
  it('Far Sight and Fortune give their totals by rank', () => {
    expect(st({}, { hw_find: 3 }).itemFind).toBeCloseTo(0.6); expect(st({}, { hw_find: 1 }).itemFind).toBeCloseTo(0.15);
    expect(st({}, { hw_fortune: 2 }).luck).toBeCloseTo(0.25); expect(st().itemFind).toBe(0);
    expect(lootMods(freshMeta().loot, st({}, { hw_find: 2, hw_fortune: 3 }))).toEqual({ itemFind: HW_FX.find[2], luck: HW_FX.fortune[3] });
  });
  it('lines need their prerequisites', () => {
    const m = freshMeta(); m.heartwood = 1000;
    expect(canBuyHw(m, 'hw_satchel')).toBe(false); m.hwLevels.hw_find = 1; expect(canBuyHw(m, 'hw_satchel')).toBe(true);
    expect(canBuyHw(m, 'hw_tithe')).toBe(false); m.hwLevels.hw_find = 2; m.hwLevels.hw_fortune = 1; expect(canBuyHw(m, 'hw_tithe')).toBe(true);
    expect(canBuyHw(m, 'hw_heirloom')).toBe(false); m.hwLevels.hw_fortune = 2; expect(canBuyHw(m, 'hw_heirloom')).toBe(true);
    expect(canBuyHw(m, 'hw_glimmer')).toBe(false); m.hwLevels.hw_satchel = 1; expect(canBuyHw(m, 'hw_glimmer')).toBe(true);
  });
  it('Deep Satchel holds 80', () => {
    expect(st().satchelCap).toBe(SATCHEL.base); expect(st({}, { hw_satchel: 1 }).satchelCap).toBe(SATCHEL.deep);
  });
  it('Warboss Tithe: a boss drops 2 items', () => {
    const s = createState(1, freshRun(), { ...freshMeta(), hwLevels: { hw_tithe: 1 } }), ev = new EventBus();
    kill(s, ev, orc(s, 'boss'));
    expect(drops(ev)).toBe(HW_FX.titheDrops);
  });
  it('Heirloom: only a worn item; it gains levels past the cap each Replant and its affixes grow', () => {
    const l = freshMeta().loot; pickUp(l, item('a'), 'player'); l.items.push(item('b'));
    expect(toggleHeirloom(l, 'b')).toBe(false); expect(toggleHeirloom(l, 'a')).toBe(true);
    growHeirloom(l, HW_FX.heirloomIlvl);
    expect(l.items[0]!.ilvl).toBe(10 + HW_FX.heirloomIlvl);
    expect(l.items[0]!.affixes[0]!.value).toBeCloseTo(0.1 * affixScale(15) / affixScale(10), 3);
    const s = createState(1, { ...freshRun(), fallen: true }, { ...freshMeta(), hwLevels: { hw_heirloom: 1 }, loot: l });
    replant(s, new EventBus()); expect(l.items[0]!.ilvl).toBe(10 + 2 * HW_FX.heirloomIlvl);
  });
  it('Glimmerwork: +1 per salvage and a cheaper reroll', () => {
    const fx = st({}, { hw_glimmer: 1 });
    expect(salvageGlimmer(item('a'), fx)).toBe(4 + HW_FX.salvagePlus); expect(fx.rerollMult).toBeCloseTo(1 - HW_FX.rerollCut);
  });
});

describe('Spoils branch (TB-101)', () => {
  it("Hunter's Eye adds 5% crit on top of Keen Eye", () => {
    expect(st({ hunter: 1, crit: 2 }).crit).toBeCloseTo(2 * NODE_FX.critPerRank + SPOILS_FX.hunterCrit);
  });
  it('Scavenger: salvage +50%, rounded down', () => {
    const l = freshMeta().loot; l.items.push(item('a')); salvage(l, 'a', st({ scavenger: 1 }));
    expect(l.glimmer).toBe(Math.floor(4 * SPOILS_FX.scavenger));
  });
  it('Trophy: kills on a tenth wave roll twice', () => {
    const a = createState(3, { ...freshRun(), wave: 10, levels: { root: 1, trophy: 1 } }), b = createState(3, { ...freshRun(), wave: 10 });
    let na = 0, nb = 0;
    for (let i = 0; i < 400; i++) { const ea = new EventBus(), eb = new EventBus(); kill(a, ea, orc(a, 'grunt')); kill(b, eb, orc(b, 'grunt')); na += drops(ea); nb += drops(eb); }
    expect(na).toBeGreaterThan(nb * 1.5);
  });
  it('Sharp Eyes: Item Find +10% this run', () => {
    expect(st({ sharpeyes: 1 }, { hw_find: 1 }).itemFind).toBeCloseTo(0.25);
  });
  it('Boss Hoard: one rarity higher, never past legendary', () => {
    const l = freshMeta().loot, r = createRng(5);
    for (let i = 0; i < 50; i++) { const it = rollDrop(r, l, 'boss', 30, 0, { itemFind: 0, luck: 0, bump: 1 })!; expect(['epic', 'legendary', 'mythic']).toContain(it.rarity); }
  });
  it('Set Resonance: 5 pieces earn the 6-piece bonus', () => {
    const meta = freshMeta();
    (['bow', 'quiver', 'bracer', 'cloak', 'boots'] as const).forEach((slot, i) => pickUp(meta.loot, item(`s${i}`, { slot, rarity: 'legendary', set: 'nightknife', affixes: [] }), 'player'));
    expect(createState(1, freshRun(), meta).stats.knifeFan).toBe(0);
    expect(createState(1, { ...freshRun(), levels: { root: 1, resonance: 1 } }, meta).stats.knifeFan).toBe(1);
  });
  it('Mythic Echo: mythic thresholds shrink by 25%', () => {
    expect(st().echo).toBe(1); expect(st({ echo: 1 }).echo).toBe(SPOILS_FX.echo);
    expect(Math.ceil(MYTHIC_FX.thunderCharges / st({ echo: 1 }).echo)).toBeLessThan(MYTHIC_FX.thunderCharges);
  });
});
