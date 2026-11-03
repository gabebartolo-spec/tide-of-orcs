import { describe, expect, it } from 'vitest';
import { Item } from '../data/loot';
import { damage } from './combat';
import { EventBus } from './events';
import { pickUp, salvageGlimmer } from './loot';
import { createState, freshMeta, freshRun, SimState } from './state';

/** TB-201: each of the 11 once-dead affixes changes play when worn. */
const wearing = (id: string, value: number): SimState => {
  const meta = freshMeta();
  const it: Item = { uid: 'g', base: 'x', slot: 'bow', rarity: 'rare', ilvl: 1, affixes: [{ id, value }] };
  pickUp(meta.loot, it, 'player');
  return createState(1, freshRun(), meta);
};
const bare = (): SimState => createState(1);
/** HP an orc of this kind loses to a 10-damage hit. */
const hitLoss = (s: SimState, kind: 'grunt' | 'elite' | 'boss', champ = false): number => {
  const o = s.orcs.alloc()!; Object.assign(o, { kind, champ, dead: false, hp: 1e6, bleed: 0, pin: 0 });
  damage(s, new EventBus(), o, 10); return 1e6 - o.hp;
};

describe('gear affixes reach their systems (TB-201)', () => {
  it('talons: hawk hits harder', () => expect(wearing('talons', 0.1).stats.units.hawk.dmg).toBeCloseTo(bare().stats.units.hawk.dmg * 1.1));
  it('roots: treant hits harder', () => expect(wearing('roots', 0.1).stats.units.treant.dmg).toBeCloseTo(bare().stats.units.treant.dmg * 1.1));
  it('gleam: salvage pays more Glimmer', () => {
    const it: Item = { uid: 'z', base: 'x', slot: 'bow', rarity: 'mythic', ilvl: 1, affixes: [] }; // 16 × 1.12 floors to 17
    expect(salvageGlimmer(it, wearing('gleam', 0.12).stats)).toBe(salvageGlimmer(it, bare().stats) + 1);
  });
  it('bossbane: bosses and champions take more, grunts do not', () => {
    const s = wearing('bossbane', 0.1);
    expect(hitLoss(s, 'boss')).toBeCloseTo(11); expect(hitLoss(s, 'grunt', true)).toBeCloseTo(11); expect(hitLoss(s, 'grunt')).toBeCloseTo(10);
  });
  it('elitebane: elites take more, others do not', () => {
    const s = wearing('elitebane', 0.1);
    expect(hitLoss(s, 'elite')).toBeCloseTo(11); expect(hitLoss(s, 'grunt')).toBeCloseTo(10);
  });
  it('emberhead: burn deals more', () => expect(wearing('emberhead', 0.1).stats.burn).toBeCloseTo(bare().stats.burn * 1.1));
  it('kindling: burn lasts longer', () => expect(wearing('kindling', 0.1).stats.burnSecs).toBeCloseTo(bare().stats.burnSecs * 1.1));
  it('thunderhead: storm bolts hit harder', () => expect(wearing('thunderhead', 0.1).stats.stormDmg).toBeCloseTo(1.1));
  it('chain: a 0.5 roll adds a storm target, 0.4 does not', () => {
    expect(wearing('chain', 0.5).stats.chain).toBe(bare().stats.chain + 1);
    expect(wearing('chain', 0.4).stats.chain).toBe(bare().stats.chain);
  });
  it('moonhead: moon shots hit harder', () => expect(wearing('moonhead', 0.1).stats.moonMult).toBeCloseTo(bare().stats.moonMult * 1.1));
  it('paleglow: elf crits deal more', () => expect(wearing('paleglow', 0.1).stats.critMult).toBeCloseTo(bare().stats.critMult * 1.1));
});
