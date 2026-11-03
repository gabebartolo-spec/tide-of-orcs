import { describe, expect, it } from 'vitest';
import type { Item } from '../data/loot';
import { SATCHEL_UI } from '../data/presentation';
import { cmpSide, dropOk, powerDelta } from './compare';

const item = (n: number, v = 0.1): Item => ({ uid: `u${n}`, slot: 'bow', base: 'b', rarity: 'rare', ilvl: 1, affixes: Array.from({ length: n }, (_, i) => ({ id: `a${i}`, value: v })) } as unknown as Item);

describe('compare plates (TB-195e)', () => {
  it('power delta matches the detail card rounding', () => {
    expect(powerDelta(item(2, 0.1), item(1, 0.1))).toBe(10);
    expect(powerDelta(item(1, 0.1), item(2, 0.1))).toBe(-10);
    expect(powerDelta(item(1, 0.25))).toBe(25);
  });
  it('a plate shows at most SATCHEL_UI.lines affixes and counts the rest', () => {
    const s = cmpSide(item(SATCHEL_UI.lines + 2), 'Bow', (a) => a.id);
    expect(s.lines).toHaveLength(SATCHEL_UI.lines);
    expect(s.more).toBe(2);
    expect(cmpSide(item(1), 'Bow', (a) => a.id).more).toBe(0);
  });
  it('an item drops only on its own pocket', () => {
    expect(dropOk('bow', 'bow')).toBe(true);
    expect(dropOk('bow', 'ring' as never)).toBe(false);
    expect(dropOk(undefined, 'bow')).toBe(false);
  });
});
