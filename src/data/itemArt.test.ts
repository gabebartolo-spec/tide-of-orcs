import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BASES, MYTHICS, SETS } from './lootTables';
import { SLOTS } from './loot';
import { ITEM_ICON_DIR, ITEM_ICON_IDS, itemIconId } from './itemArt';

describe('item icons (TB-104)', () => {
  it('every base and mythic has an icon id and a file on disk', () => {
    for (const id of [...BASES.map((b) => b.id), ...MYTHICS.map((m) => m.id),
      ...SETS.filter((x) => x.path).flatMap((x) => SLOTS.map((slot) => `${x.id}-${slot}`))]) {
      expect(ITEM_ICON_IDS.has(id), id).toBe(true);
      expect(existsSync(resolve(__dirname, '../../public', ITEM_ICON_DIR, `${id}.webp`)), id).toBe(true);
    }
  });
  it('a mythic uses its own icon, a path set piece its set slot icon, any other set piece its base', () => {
    expect(itemIconId({ base: 'leather-bracer', mythic: 'thunders-memory' })).toBe('thunders-memory');
    expect(itemIconId({ base: 'moss-cloak' })).toBe('moss-cloak');
    expect(itemIconId({ base: 'no-such-base' })).toBeNull();
    expect(itemIconId({ base: 'hornbow', slot: 'bow', set: 'nightknife' })).toBe('hornbow');
    expect(itemIconId({ base: 'hornbow', slot: 'bow', set: 'serpents-coil' })).toBe('serpents-coil-bow');
    expect(itemIconId({ base: 'hornbow', slot: 'bow', set: 'serpents-coil', mythic: 'serpent-fang' })).toBe('serpent-fang');
  });
});
