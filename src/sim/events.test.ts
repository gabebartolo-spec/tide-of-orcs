/** TB-271: a full frame buffer drops render-only effects, never the fall, a boss result or a kill. */
import { describe, expect, it } from 'vitest';
import { EVENT_CAP } from '../data/balance';
import { EventBus } from './events';

describe('EventBus cap (TB-271)', () => {
  it('past the effects cap, hits are dropped but the fall, boss end and kills are kept', () => {
    const ev = new EventBus();
    for (let i = 0; i < EVENT_CAP.fxCap + 500; i++) ev.push({ t: 'hit', x: 0, y: 0, crit: false, src: 'lob' });
    ev.push({ t: 'kill', x: 0, y: 0, loot: 1, kind: 'grunt', by: 'lob', champ: false, beats: 0 });
    ev.push({ t: 'bossEnd', cleared: true, loot: 1, hw: 3, secs: 30 });
    ev.push({ t: 'barricadeFell', wave: 70, kills: 1, runTime: 60, heartwood: 0 });
    const out = ev.drain();
    expect(out.filter((e) => e.t === 'hit')).toHaveLength(EVENT_CAP.fxCap);
    expect(out.slice(-3).map((e) => e.t)).toEqual(['kill', 'bossEnd', 'barricadeFell']);
  });

  it('the hard cap still bounds the buffer', () => {
    const ev = new EventBus();
    for (let i = 0; i < EVENT_CAP.hardCap + 10; i++) ev.push({ t: 'wave', wave: i });
    expect(ev.drain()).toHaveLength(EVENT_CAP.hardCap);
  });
});
