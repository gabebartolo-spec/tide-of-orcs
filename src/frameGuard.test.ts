import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_KEEP, ERROR_KEY, guard, resetReported } from './frameGuard';

const mem = (): Pick<Storage, 'getItem' | 'setItem'> & { m: Map<string, string> } => {
  const m = new Map<string, string>(); return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe('frame guard (TB-267)', () => {
  beforeEach(() => { resetReported(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
  it('a throwing step returns false and the next step still runs', () => {
    const st = mem(); let after = false;
    expect(guard('draw', () => { throw new TypeError('bad gradient'); }, st)).toBe(false);
    expect(guard('panel', () => { after = true; }, st)).toBe(true);
    expect(after).toBe(true);
    const list = JSON.parse(st.m.get(ERROR_KEY)!); expect(list).toHaveLength(1); expect(list[0].msg).toBe('TypeError: bad gradient'); expect(list[0].tag).toBe('draw');
  });
  it('the same error every frame is reported once; storage keeps only the newest few', () => {
    const st = mem();
    for (let i = 0; i < 100; i++) guard('draw', () => { throw new Error('same'); }, st);
    expect(console.error).toHaveBeenCalledTimes(1);
    for (let i = 0; i < ERROR_KEEP + 3; i++) guard('draw', () => { throw new Error(`e${i}`); }, st);
    const list = JSON.parse(st.m.get(ERROR_KEY)!); expect(list).toHaveLength(ERROR_KEEP); expect(list.at(-1).msg).toBe(`Error: e${ERROR_KEEP + 2}`);
  });
  it('blocked storage never throws', () => {
    const st = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(guard('draw', () => { throw new Error('x'); }, st)).toBe(false);
  });
});
