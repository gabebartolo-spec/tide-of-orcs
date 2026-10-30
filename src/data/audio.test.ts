import { describe, expect, it } from 'vitest';
import { AUDIO, CUES, cueFor } from './audio';

describe('audio cue map', () => {
  it('maps kills by orc kind', () => {
    expect(cueFor({ t: 'kill', x: 0, y: 0, loot: 1, kind: 'grunt' })).toBe('orcDeath');
    expect(cueFor({ t: 'kill', x: 0, y: 0, loot: 1, kind: 'brute' })).toBe('bruteDeath');
  });
  it('creaks below the creak fraction, thuds above', () => {
    expect(cueFor({ t: 'barricadeHit', y: 0, amount: 1, frac: AUDIO.creakFrac - 0.01 })).toBe('wallCreak');
    expect(cueFor({ t: 'barricadeHit', y: 0, amount: 1, frac: 0.9 })).toBe('wallThud');
  });
  it('maps fall, rally, buy and replant; ignores wave', () => {
    expect(cueFor({ t: 'barricadeFell', wave: 1, kills: 0, runTime: 0, heartwood: 0 })).toBe('wallFall');
    expect(cueFor({ t: 'vanguardRallied', type: 'x', x: 0, y: 0 })).toBe('rallyHorn');
    expect(cueFor({ t: 'bought', id: 'x', firstRank: true })).toBe('bought');
    expect(cueFor({ t: 'replant', heartwood: 1, forced: true })).toBe('replant');
    expect(cueFor({ t: 'wave', wave: 2 })).toBeNull();
  });
  it('ducks only on big moments', () => {
    expect(Object.entries(CUES).filter(([, c]) => c.duck).map(([k]) => k).sort()).toEqual(['bossRoar', 'rallyHorn', 'replant', 'wallFall']);
  });
});
