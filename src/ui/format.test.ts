import { describe, expect, it } from 'vitest';
import { fmt } from './format';

describe('fmt (TB-216c)', () => {
  it('rounds before picking the unit, so it never shows 1000K or 100.0K', () => {
    expect(fmt(999999, 'short')).toBe('1.00M');
    expect(fmt(999500, 'short')).toBe('1.00M');
    expect(fmt(99999, 'short')).toBe('100K');
    expect(fmt(9999, 'short')).toBe('10.0K');
  });
  it('keeps the normal bands', () => {
    expect(fmt(999, 'short')).toBe('999');
    expect(fmt(1234, 'short')).toBe('1.23K');
    expect(fmt(12345, 'short')).toBe('12.3K');
    expect(fmt(123456, 'short')).toBe('123K');
    expect(fmt(2.5e9, 'short')).toBe('2.50B');
  });
});
