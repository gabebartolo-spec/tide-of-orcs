import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BASES, MYTHICS } from './lootTables';
import { ITEM_ICON_DIR, ITEM_ICON_IDS, itemIconId } from './itemArt';

describe('item icons (TB-104)', () => {
  it('every base and mythic has an icon id and a file on disk', () => {
    for (const id of [...BASES.map((b) => b.id), ...MYTHICS.filter((m) => !m.path).map((m) => m.id)]) {
      expect(ITEM_ICON_IDS.has(id), id).toBe(true);
      expect(existsSync(resolve(__dirname, '../../public', ITEM_ICON_DIR, `${id}.webp`)), id).toBe(true);
    }
  });
  it('a mythic uses its own icon, a set piece its base', () => {
    expect(itemIconId({ base: 'leather-bracer', mythic: 'thunders-memory' })).toBe('thunders-memory');
    expect(itemIconId({ base: 'moss-cloak' })).toBe('moss-cloak');
    expect(itemIconId({ base: 'no-such-base' })).toBeNull();
  });
});
