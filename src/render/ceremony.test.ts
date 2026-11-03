import { describe, expect, it } from 'vitest';
import { Ceremony, CEREMONY } from './ceremony';

const fakeCtx = (rects: number[][]): CanvasRenderingContext2D => new Proxy({}, {
  get: (_t, k) => (k === 'fillRect' ? (...a: number[]) => rects.push(a) : () => undefined),
  set: () => true,
}) as unknown as CanvasRenderingContext2D;

describe('replant ceremony (TB-216c)', () => {
  it('the dark covers the whole visible rect, not only the plain', () => {
    for (const reduced of [true, false]) {
      const rects: number[][] = [], c = new Ceremony();
      c.start(reduced);
      c.draw(fakeCtx(rects), reduced ? CEREMONY.reduced / 2 : (CEREMONY.burn + CEREMONY.seed) / 2, -100, -200, 1000, 480);
      expect(rects[0]).toEqual([-100, -200, 1100, 680]);
    }
  });
});
