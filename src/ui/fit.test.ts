import { describe, expect, it } from 'vitest';
import { fitFloor } from './fit';

describe('fitFloor', () => {
  it('never scales a scroll pane', () => { expect(fitFloor('scroll', false)).toBe(1); expect(fitFloor('scroll', true)).toBe(1); });
  it('stops at 0.8 on phones', () => expect(fitFloor(undefined, true)).toBe(0.8));
  it('lets a PC pane bisect down', () => expect(fitFloor(undefined, false)).toBe(0));
});
