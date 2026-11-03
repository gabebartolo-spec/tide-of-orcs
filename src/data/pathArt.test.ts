import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PATH_IDS } from './paths';
import { pathSigilFile } from './pathArt';

describe('path sigils (TB-193d)', () => {
  it('every path has a sigil file on disk', () => {
    for (const id of PATH_IDS) expect(existsSync(resolve(__dirname, '../../public', pathSigilFile(id))), id).toBe(true);
  });
});
