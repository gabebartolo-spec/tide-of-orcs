import { describe, expect, it } from 'vitest';
import { applyTune, pickChoice } from './cli';
import { PATH_IDS } from '../src/data/paths';
import { BUILDINGS } from '../src/data/camp';

describe('balance runner args (TB-216e)', () => {
  it('applies a known tune key', () => {
    const t = { LOB: { cd: 1.25, inner: { a: 1 } } };
    applyTune(t, 'LOB.cd=2,LOB.inner.a=3');
    expect(t.LOB.cd).toBe(2); expect(t.LOB.inner.a).toBe(3);
  });
  it('rejects a typo in the last key instead of adding a property', () => {
    const t = { LOB: { cd: 1.25 } };
    expect(() => applyTune(t, 'LOB.cdx=2')).toThrow('unknown tune key LOB.cdx');
    expect('cdx' in t.LOB).toBe(false);
  });
  it('rejects an unknown table with a clear message', () => {
    expect(() => applyTune({ LOB: { cd: 1 } }, 'FOO.x=1')).toThrow('unknown tune key FOO.x');
  });
  it('rejects a non-numeric value', () => {
    expect(() => applyTune({ LOB: { cd: 1 } }, 'LOB.cd=abc')).toThrow('not a number');
  });
  it('accepts a listed policy and rejects a typo', () => {
    expect(pickChoice('policy', 'wall', ['greedy', 'wall', 'dps', 'nobuy'] as const)).toBe('wall');
    expect(() => pickChoice('policy', 'gredy', ['greedy', 'wall', 'dps', 'nobuy'] as const)).toThrow("unknown --policy 'gredy'");
  });
  it('--path accepts every real path and rejects a typo (TB-246)', () => {
    for (const id of PATH_IDS) expect(pickChoice('path', id, ['none', ...PATH_IDS] as const)).toBe(id);
    expect(() => pickChoice('path', 'wolf', ['none', ...PATH_IDS] as const)).toThrow("unknown --path 'wolf'");
  });
  it('--camp all covers all four buildings', () => {
    expect(BUILDINGS.map(b => b.id).sort()).toEqual(['bowyer', 'forge', 'kitchen', 'training']);
  });
});
