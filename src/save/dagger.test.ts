import { describe, expect, it } from 'vitest';
import { freshLoot, SLOTS } from '../data/loot';
import { BASES, MYTHICS } from '../data/lootTables';
import { createRng } from '../sim/rng';
import { rollDrop } from '../sim/lootRoll';
import { STR } from '../data/strings';
import { createState, freshMeta, freshRun } from '../sim/state';
import { migrate } from './migrate';
import { CURRENT_VERSION, defaultSettings } from './schema';

const knife = { uid: 'i3', base: 'hornbow', slot: 'bow', rarity: 'mythic', ilvl: 9, affixes: [{ id: 'dmg', value: 0.1 }], mythic: 'last-knife' };
const bow = { uid: 'i1', base: 'yew-longbow', slot: 'bow', rarity: 'rare', ilvl: 5, affixes: [] };
const v15 = (loot: object, run: object = {}) => ({ version: 15, savedAt: 1, run: { ...freshRun(), ...run }, meta: { ...freshMeta(), loot }, settings: defaultSettings() });

describe('dagger slot (TB-225)', () => {
  it('The Last Knife lives in the dagger slot, and the dagger slot can drop', () => {
    expect(MYTHICS.find((m) => m.id === 'last-knife')!.slot).toBe('dagger');
    expect(SLOTS).toContain('dagger');
    expect(BASES.filter((b) => b.slot === 'dagger').length).toBeGreaterThanOrEqual(1);
  });
  it('a worn Last Knife moves from the bow slot to dagger and keeps its bow', () => {
    const s = migrate(v15({ ...freshLoot(), items: [bow, knife], equipped: { bow: 'i3' } }));
    expect(s.version).toBe(CURRENT_VERSION);
    const k = s.meta.loot.items.find((i) => i.uid === 'i3')!;
    expect(k.slot).toBe('dagger'); expect(k.base).toBe('bronze-dirk'); expect(k.mythic).toBe('last-knife'); expect(k.ilvl).toBe(9); expect(k.affixes).toEqual([{ id: 'dmg', value: 0.1 }]);
    expect(s.meta.loot.equipped).toEqual({ dagger: 'i3' });
    expect(s.meta.loot.items.find((i) => i.uid === 'i1')!.slot).toBe('bow');
  });
  it('a spare Last Knife in the satchel moves too; the worn bow stays', () => {
    const s = migrate(v15({ ...freshLoot(), items: [bow, knife], equipped: { bow: 'i1' } }));
    expect(s.meta.loot.items.find((i) => i.uid === 'i3')!.slot).toBe('dagger');
    expect(s.meta.loot.equipped).toEqual({ bow: 'i1' });
  });
  it('the run summary best find is moved as well, and a save with no loot or no knife is untouched', () => {
    expect(migrate(v15(freshLoot(), { best: knife })).run.best!.slot).toBe('dagger');
    const s = migrate(v15({ ...freshLoot(), items: [bow], equipped: { bow: 'i1' } }));
    expect(s.meta.loot.items).toEqual([bow]); expect(s.meta.loot.equipped).toEqual({ bow: 'i1' });
  });
  it('the knife effect still reaches Stats from the dagger slot', () => {
    const s = migrate(v15({ ...freshLoot(), items: [knife], equipped: { bow: 'i3' } }));
    expect(createState(1, s.run, s.meta).stats.knifeReturn).toBe(1);
  });
  it('daggers drop, are labelled Dagger, set pieces never land in the slot, and the other six slots still drop', () => {
    const r = createRng(7), l = freshLoot(), got: Record<string, number> = {};
    for (let i = 0; i < 6000; i++) {
      const it = rollDrop(r, l, 'boss', 40, 0, { itemFind: 0, luck: 1 });
      if (!it) continue;
      got[it.slot] = (got[it.slot] ?? 0) + 1;
      if (it.set) expect(it.slot).not.toBe('dagger');
      if (it.mythic === 'last-knife') expect(it.slot).toBe('dagger');
      if (it.slot === 'dagger') expect(BASES.find((b) => b.id === it.base)!.slot).toBe('dagger');
    }
    for (const s of SLOTS) expect(got[s] ?? 0, s).toBeGreaterThan(100);
    expect(STR.slotName.dagger).toBe('Dagger');
  });
});
