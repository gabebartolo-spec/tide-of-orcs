import { describe, expect, it } from 'vitest';
import { createState } from '../sim/state';
import { pathLocked } from '../sim/tree';
import { NODE } from '../data/skillTree';
import { PATH_FX } from '../data/paths';
import type { Item } from '../data/loot';
import { itemPath, nextPath, pathHint, pathTag, startBonus } from './paths';

const item = (x: Partial<Item>): Item => ({ uid: 'u1', slot: 'bow', base: 'b', rarity: 'rare', ilvl: 1, affixes: [], ...x } as Item);

describe('path UI (TB-193c)', () => {
  it('locks path nodes of every path but the chosen one, with a Replant hint', () => {
    const s = createState();
    expect(pathLocked(s, NODE.coil)).toBe(true); expect(pathLocked(s, NODE.sharp)).toBe(false);
    expect(pathHint(s, NODE.coil)).toBe('Choose the Path of the Serpent at Replant');
    s.run.path = 'serpent';
    expect(pathLocked(s, NODE.coil)).toBe(false); expect(pathHint(s, NODE.coil)).toBeNull();
    expect(pathLocked(s, NODE.foxden)).toBe(true); expect(pathHint(s, NODE.magpie)).toBe('Choose the Path of the Magpie at Replant');
  });
  it('reads each starting bonus from PATH_FX', () => {
    expect(startBonus('serpent')).toContain(`+${Math.round(PATH_FX.startCrit * 100)}% crit`);
    expect(startBonus('fox')).toContain(`+${Math.round(PATH_FX.startFox * 100)}%`);
    expect(startBonus('magpie')).toContain(`+${Math.round(PATH_FX.startStar * 100)}% starlight`);
  });
  it('picks a path, and clicking the chosen card again clears it', () => {
    expect(nextPath(null, 'fox')).toBe('fox'); expect(nextPath('fox', 'serpent')).toBe('serpent');
    expect(nextPath('fox', 'fox')).toBeNull(); expect(nextPath('fox', null)).toBeNull();
  });
  it('tags path set pieces and path mythics, and nothing else', () => {
    expect(itemPath(item({ set: 'serpents-coil' }))).toBe('serpent');
    expect(itemPath(item({ mythic: 'foxfire-tail' }))).toBe('fox');
    expect(itemPath(item({ mythic: 'magpies-talon' }))).toBe('magpie');
    expect(itemPath(item({}))).toBeNull();
    expect(pathTag(item({ set: 'magpies-hoard' }))).toContain('data-path="magpie"');
    expect(pathTag(item({}))).toBe('');
  });
});
