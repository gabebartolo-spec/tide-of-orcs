import { describe, expect, it } from 'vitest';
import { rootOrc, stunOrc } from './combat';
import { Orc } from './state';

describe('crowd control (TB-126)', () => {
  const orc = () => ({ stun: 0, root: 0 }) as Orc;
  it('a stun is not topped up while it holds, and lands again once the orc breaks free', () => {
    const o = orc();
    stunOrc(o, 1); o.stun = 0.4; stunOrc(o, 1);
    expect(o.stun).toBe(0.4);
    o.stun = 0; stunOrc(o, 1);
    expect(o.stun).toBe(1);
  });
  it('a root is not topped up or lengthened while it holds', () => {
    const o = orc();
    rootOrc(o, 1.5); o.root = 0.2; rootOrc(o, 1.5); rootOrc(o, 3);
    expect(o.root).toBe(0.2);
    o.root = 0; rootOrc(o, 1.5);
    expect(o.root).toBe(1.5);
  });
});
