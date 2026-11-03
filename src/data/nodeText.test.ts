import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARROWS, BARRICADE, NODE_FX, SHOT_FX } from './balance';
import { NODE } from './skillTree';

const pct = (x: number): string => `${Math.round(x * 100)}%`;
const doc = (f: string): string => readFileSync(`docs/${f}`, 'utf8');

describe('node descriptions match the applied values (TB-219)', () => {
  const cases: [keyof typeof NODE, string][] = [
    ['bond', `+${pct(NODE_FX.kinship - 1)} damage`],
    ['bolt', `+${pct(NODE_FX.boltDmg - 1)} damage`],
    ['repair', `${pct(BARRICADE.regenPerRank)} of its health`],
    ['starfall', `rains ${ARROWS.starfall.arrows} arrows`],
    ['starcount', `+${SHOT_FX.starArrowsPerRank} Starfall arrows`],
    ['starchance', `+${pct(SHOT_FX.starChancePerRank)} chance`],
  ];
  for (const [id, text] of cases) {
    it(`${id} text states the applied number`, () => {
      expect(NODE[id].desc).toContain(text);
      expect(doc('SKILL-TREE.md')).toContain(NODE[id].desc);
    });
  }
  it('docs carry the current wave rate, wolf bite and Replant reset', () => {
    expect(doc('SKILL-TREE.md')).toContain('1.1^max(0, w − 10)');
    expect(doc('GDD.md')).toContain('bites every 0.5 s for 4 ×');
    expect(doc('GDD.md')).toContain('mends 2% of max per second');
    expect(doc('GDD.md')).not.toContain('Reset: tree ranks, starlight');
  });
});
