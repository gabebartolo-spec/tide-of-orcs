import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimerBag } from './timerBag';

describe('report timer bag (TB-219)', () => {
  afterEach(() => vi.useRealTimers());
  it('fires pending timers in time', () => {
    vi.useFakeTimers(); const hit: number[] = [], b = new TimerBag();
    b.add(() => hit.push(1), 100); b.add(() => hit.push(2), 300);
    vi.advanceTimersByTime(150); expect(hit).toEqual([1]); vi.advanceTimersByTime(200); expect(hit).toEqual([1, 2]);
  });
  it('clear() cancels everything still pending (Replant, wipe, import)', () => {
    vi.useFakeTimers(); let fired = 0; const b = new TimerBag();
    b.add(() => fired++, 100); b.add(() => fired++, 3100);
    b.clear(); expect(b.size).toBe(0); vi.advanceTimersByTime(5000); expect(fired).toBe(0);
  });
});
