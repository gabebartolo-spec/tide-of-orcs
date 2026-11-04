import { describe, expect, it } from 'vitest';
import { fitFloor } from './fit';

describe('fitFloor', () => {
  it('never scales a scroll pane', () => { expect(fitFloor('scroll', false)).toBe(1); expect(fitFloor('scroll', true)).toBe(1); });
  it('never scales on phones (TB-218: a touch target keeps its size)', () => expect(fitFloor(undefined, true)).toBe(1));
  it('never scales a narrow pane in a narrow window, else bisects', () => { expect(fitFloor('narrow', false, true)).toBe(1); expect(fitFloor('narrow', false, false)).toBe(0); expect(fitFloor(undefined, false, true)).toBe(0); });
  it('lets a PC pane bisect down', () => expect(fitFloor(undefined, false)).toBe(0));
});
