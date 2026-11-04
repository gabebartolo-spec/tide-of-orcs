import { describe, expect, it } from 'vitest';
import { freshLoot, SLOTS } from '../data/loot';
import { BASES, MYTHICS } from '../data/lootTables';
import { createRng } from '../sim/rng';
import { rollDrop } from '../sim/lootRoll';
import { STR } from '../data/strings';
import { createState, freshMeta, freshRun } from '../sim/state';
import { itemIconId } from '../data/itemArt';
import { glyph } from '../ui/glyphs';
import { v7 } from './fixtures/v7';
import { v14 } from './fixtures/v14';
import { v15 as v15Fixture } from './fixtures/v15';
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
  it('maps each bow tier to its dagger tier, and an unknown base falls back to the Bone Knife', () => {
    const want: Record<string, string> = { 'ashwood-bow': 'bone-knife', 'yew-longbow': 'flint-dagger', hornbow: 'bronze-dirk', 'ironbark-recurve': 'silver-stiletto', 'no-such-bow': 'bone-knife' };
    for (const [from, to] of Object.entries(want)) {
      const s = migrate(v15({ ...freshLoot(), items: [{ ...knife, base: from }], equipped: { bow: 'i3' } }));
      const k = s.meta.loot.items[0]!;
      expect(k.base, from).toBe(to); expect(BASES.find((b) => b.id === k.base)!.slot).toBe('dagger');
    }
  });
  it('leaves other shapes alone: a dagger-slot knife, a bow mythic, a non-knife', () => {
    const oak = { uid: 'i4', base: 'yew-longbow', slot: 'bow', rarity: 'mythic', ilvl: 5, affixes: [], mythic: 'oakspine' };
    const done = { ...knife, uid: 'i5', slot: 'dagger', base: 'flint-dagger' };
    const s = migrate(v15({ ...freshLoot(), items: [oak, done], equipped: { bow: 'i4', dagger: 'i5' } }));
    expect(s.meta.loot.items).toEqual([oak, done]); expect(s.meta.loot.equipped).toEqual({ bow: 'i4', dagger: 'i5' });
  });
  it('a knife worn in the bow socket never displaces a dagger already worn; the bow socket empties', () => {
    const other = { ...knife, uid: 'i6', slot: 'dagger', base: 'flint-dagger', mythic: undefined, rarity: 'rare' };
    const s = migrate(v15({ ...freshLoot(), items: [knife, other], equipped: { bow: 'i3', dagger: 'i6' } }));
    expect(s.meta.loot.equipped).toEqual({ dagger: 'i6' });
    expect(s.meta.loot.items.find((i) => i.uid === 'i3')!.slot).toBe('dagger');
  });
  it('survives a null item, a missing loot, a missing equipped map and a missing run best', () => {
    const s = migrate(v15({ ...freshLoot(), items: [null, knife], equipped: { bow: 'i3' } }));
    expect(s.meta.loot.items[0]).toBeNull(); expect(s.meta.loot.items[1]!.slot).toBe('dagger'); expect(s.meta.loot.equipped).toEqual({ dagger: 'i3' });
    const noLoot = { version: 15, savedAt: 1, run: freshRun(), meta: {}, settings: defaultSettings() };
    expect(migrate(noLoot).version).toBe(CURRENT_VERSION);
    const { equipped: _drop, ...bare } = freshLoot(); void _drop;
    expect(migrate(v15({ ...bare, items: [knife] })).meta.loot.items[0]!.slot).toBe('dagger');
    expect(migrate({ version: 15, savedAt: 1, run: { ...freshRun(), best: undefined }, meta: freshMeta(), settings: defaultSettings() }).version).toBe(CURRENT_VERSION);
  });
  it('a migrated knife keeps its own art (icon by mythic id), its dagger base resolves, and the glyph frame draws it', () => {
    const k = migrate(v15({ ...freshLoot(), items: [knife], equipped: { bow: 'i3' } })).meta.loot.items[0]!;
    expect(itemIconId(k)).toBe('last-knife');
    expect(glyph('dagger', k)).toContain('items/last-knife.webp');
    expect(BASES.find((b) => b.id === k.base)!.slot).toBe(k.slot);
    // a dagger base with no icon file draws the vector knife, never a missing image
    const { mythic: _m, ...plain } = k; void _m;
    expect(glyph('dagger', { ...plain, rarity: 'rare' })).toContain('<svg');
  });
  it('a Last Knife in an old save (v7, v14, v15 fixtures) rides the whole chain, loads as GameController does, and still gives its knife effect', () => {
    for (const fixture of [v7, v14, v15Fixture]) {
      const raw = JSON.parse(JSON.stringify(fixture)) as { meta: { loot: { items: object[]; equipped: Record<string, string> } } };
      raw.meta.loot.items.push({ ...knife, uid: 'kx' }); raw.meta.loot.equipped.bow = 'kx';
      const s = migrate(raw);
      expect(s.version).toBe(CURRENT_VERSION);
      expect(s.meta.loot.equipped.dagger).toBe('kx'); expect(s.meta.loot.equipped.bow).toBeUndefined();
      const sim = createState(7, { ...freshRun(), ...s.run }, { ...freshMeta(), ...s.meta });
      expect(sim.stats.knifeReturn).toBe(1);
    }
  });
  it('the v15 fixture keeps its knife in the dagger slot after migration', () => {
    const s = migrate(JSON.parse(JSON.stringify(v15Fixture)));
    expect(s.meta.loot.equipped.dagger).toBe('knife15'); expect(s.meta.loot.equipped.bow).toBeUndefined();
  });
});
