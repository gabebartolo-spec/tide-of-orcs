import { describe, expect, it } from 'vitest';
import { shotTint } from './shotTint';
import { FX } from '../sim/combat';
import { deriveStats } from '../sim/stats';
import { P } from './palette';

describe('shotTint', () => {
  const st = deriveStats({ root: 1, knives: 1, fire: 1 });
  it('shows flames only on a shot that rolled fire, not on every arrow once Fire Arrows is owned', () => {
    expect(st.fire).toBe(true);
    expect(shotTint(st, 0)).toBe('');
    expect(shotTint(st, FX.FIRE)).toBe(P.fire);
  });
  it('ignores a rolled bit whose enchantment is not owned', () => {
    expect(shotTint(deriveStats({ root: 1 }), FX.ALL)).toBe('');
  });
});
