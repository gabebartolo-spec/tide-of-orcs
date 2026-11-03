import { describe, expect, it } from 'vitest';
import { Item } from '../data/loot';
import { CAMP_FX } from '../data/camp';
import { STEP } from '../data/balance';
import { Projectile } from './state';
import { barricadeRegen } from './barricade';
import { EventBus } from './events';
import { applyGear } from './gear';
import { growHeirloom, equip, pickUp, toggleHeirloom } from './loot';
import { ownedAffixes } from './lootRoll';
import { AFFIXES } from '../data/lootTables';
import { Levels, deriveStats } from './stats';
import { createState, freshMeta, freshRun } from './state';
import { noInputs, step } from './step';

const item = (uid: string, slot: Item['slot'], id?: string, value = 0.1): Item => ({ uid, base: 'x', slot, rarity: 'rare', ilvl: 10, affixes: id ? [{ id, value }] : [] });
const gear = (lv: Levels, id: string, value: number) => {
  const m = freshMeta(); pickUp(m.loot, item('g', 'bow', id, value), 'player');
  return applyGear(deriveStats(lv), m.loot);
};
const LV: Levels = { root: 1, wolf: 1, knives: 1, ballista: 1, muster: 1 };

describe('TB-219 stats and affixes', () => {
  it('Kinship gear scales wolf, knives, ballista and vanguard', () => {
    const a = deriveStats(LV), b = gear(LV, 'kinship', 0.1);
    expect(b.wolf).toBeCloseTo(a.wolf * 1.1); expect(b.knives!.dmg).toBeCloseTo(a.knives!.dmg * 1.1);
    expect(b.ballista).toBeCloseTo(a.ballista * 1.1); expect(b.vanDmg).toBeCloseTo(a.vanDmg * 1.1);
  });
  it('Kitchen regen is a small fraction of max HP per second', () => {
    const st = deriveStats({ root: 1 }, {}, { kitchen: 3 });
    expect(st.barRegen).toBeCloseTo(CAMP_FX.regenPlus[3]!); expect(st.barRegen).toBeLessThan(0.05);
    const s = createState(1); s.stats = st; s.run.barHp = st.barMax * 0.1; barricadeRegen(s, 1);
    expect(s.run.barHp / st.barMax).toBeLessThan(0.2);
  });
  it('Rangers take pet damage', () => {
    const shotDmg = (pet: number): number => {
      const s = createState(1, freshRun(), freshMeta()); s.stats = deriveStats({ root: 1, ranger: 1 }); s.stats.petDmg = pet;
      const o = s.orcs.alloc()!; Object.assign(o, { kind: 'grunt', dead: false, hp: 1e9, x: 500, y: 300 });
      let d = 0; for (let i = 0; i < 120 && !d; i++) { step(s, STEP, noInputs, new EventBus()); s.shots.forEach((p: Projectile) => { if (p.kind === 'arrow' && !d) d = p.dmg; }); }
      return d;
    };
    const base = shotDmg(1); expect(base).toBeGreaterThan(0); expect(shotDmg(2)).toBeCloseTo(base * 2);
  });
  it('Sap and Mending roll only when their stat exists; Pierce, Volley, Chain work from one item', () => {
    const sap = AFFIXES.find((a) => a.id === 'sap')!, mend = AFFIXES.find((a) => a.id === 'mending')!;
    expect(ownedAffixes(deriveStats({ root: 1 }))(sap)).toBe(false);
    expect(ownedAffixes(deriveStats({ root: 1, repair: 1 }))(sap)).toBe(true);
    expect(ownedAffixes(deriveStats({ root: 1, muster: 1 }))(mend)).toBe(false);
    expect(ownedAffixes(deriveStats({ root: 1, muster: 1, mend: 1 }))(mend)).toBe(true);
    for (const id of ['pierce', 'volley']) {
      const a = AFFIXES.find((x) => x.id === id)!;
      expect(a.max * 0.77).toBeGreaterThanOrEqual(0.5); // a top roll at ilvl 1 reaches a whole point
    }
    expect(gear({ root: 1 }, 'pierce', 0.6).pierce).toBe(deriveStats({ root: 1 }).pierce + 1);
    expect(gear({ root: 1 }, 'volley', 0.6).arrows).toBe(deriveStats({ root: 1 }).arrows + 1);
  });
  it('heirloom stops growing once taken off', () => {
    const l = freshMeta().loot; pickUp(l, item('a', 'bow'), 'player'); pickUp(l, item('b', 'bow'), 'player');
    equip(l, 'a'); toggleHeirloom(l, 'a'); equip(l, 'b');
    expect(l.heirloom).toBeNull(); growHeirloom(l, 5); expect(l.items.find((i) => i.uid === 'a')!.ilvl).toBe(10);
  });
  it('satchel capacity counts spare items only, as the counter shows', () => {
    const l = freshMeta().loot;
    for (let i = 0; i < 60; i++) pickUp(l, item('i' + i, (['bow', 'quiver', 'bracer', 'cloak', 'boots', 'charm'] as const)[i % 6]!), 'player', 40);
    const worn = Object.values(l.equipped).length;
    expect(l.items.length - worn).toBe(40);
  });
});
