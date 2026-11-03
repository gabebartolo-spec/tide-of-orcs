import { describe, expect, it } from 'vitest';
import { fitFloor } from './fit';

describe('fitFloor', () => {
  it('never scales a scroll pane', () => { expect(fitFloor('scroll', false)).toBe(1); expect(fitFloor('scroll', true)).toBe(1); });
  it('never scales on phones (TB-218: a touch target keeps its size)', () => expect(fitFloor(undefined, true)).toBe(1));
  it('lets a PC pane bisect down', () => expect(fitFloor(undefined, false)).toBe(0));
});
