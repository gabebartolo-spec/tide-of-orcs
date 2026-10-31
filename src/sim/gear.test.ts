import { describe, expect, it } from 'vitest';
import { freshLoot, Item } from '../data/loot';
import { EventBus } from './events';
import { kill } from './combat';
import { createState, freshMeta, freshRun } from './state';
import { pickUp } from './loot';

const item = (uid: string, slot: Item['slot'], affixes: Item['affixes'], set?: string): Item => ({ uid, base: 'x', slot, rarity: 'rare', ilvl: 1, affixes, ...(set ? { set } : {}) });

describe('gear in play (TB-094)', () => {
  it('worn affixes and set bonuses scale Stats', () => {
    const meta = freshMeta(), l = meta.loot;
    const pieces = (['bow', 'quiver'] as const).map((sl, i) => item(`i${i}`, sl, [{ id: 'might', value: 0.1 }], 'packlord'));
    pieces.forEach((p) => pickUp(l, p, 'player'));
    const base = createState(1).stats, s = createState(1, freshRun(), meta).stats;
    expect(s.dmg).toBeCloseTo(base.dmg * 1.2);
    expect(s.petDmg).toBeCloseTo(base.petDmg * 1.2); // 2-piece Packlord: companion damage
  });
  it('the player policy never swaps a worn item and filters below minRarity', () => {
    const l = freshLoot(); l.lootFilter.minRarity = 'rare';
    pickUp(l, item('a', 'bow', [{ id: 'might', value: 0.01 }]), 'player');
    pickUp(l, item('b', 'bow', [{ id: 'might', value: 0.5 }]), 'player');
    expect(l.equipped.bow).toBe('a');
    pickUp(l, { ...item('c', 'boots', []), rarity: 'common' }, 'player');
    expect(l.items.map((x) => x.uid)).toEqual(['a', 'b']); expect(l.glimmer).toBe(1);
  });
  it('kills roll drops on the loot stream and emit loot events', () => {
    const s = createState(5), ev = new EventBus(), r0 = s.rng.next;
    let n = 0;
    for (let i = 0; i < 300; i++) { const o = s.orcs.alloc()!; Object.assign(o, { kind: 'boss', dead: false, loot: 1, champ: false }); kill(s, ev, o); s.orcs.release(o); }
    for (const e of ev.drain()) if (e.t === 'loot') n++;
    expect(n).toBe(300); expect(s.rng.next).toBe(r0);
    expect(s.meta.loot.items.length).toBeGreaterThan(0);
  });
});
