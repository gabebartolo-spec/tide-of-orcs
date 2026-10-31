import { describe, expect, it } from 'vitest';
import { createState } from './state';
import { EventBus } from './events';
import { noInputs, step } from './step';
import { castFireball } from './combat';
import { FIREBALL } from '../data/orcs';
import { STEP } from '../data/balance';

type S = ReturnType<typeof createState>;
const orcAt = (s: S, x: number, y: number, hp = 100) => {
  const o = s.orcs.alloc()!;
  Object.assign(o, { kind: 'grunt', x, y, hp, maxhp: hp, spd: 0, r: 10, loot: 0, atk: 0, dead: false, burn: 0, chill: 0, stun: 0, hitT: 0, wob: 0, swingT: 0, champ: false });
  return o;
};
const count = (s: S) => { let n = 0; s.shots.forEach(() => { n++; }); return n; };

describe('shaman fireball (TB-127)', () => {
  it('leaves the staff as a fireball projectile and announces the cast', () => {
    const s = createState(3), ev = new EventBus();
    castFireball(s, ev, 700, 240, 200, 250);
    expect(count(s)).toBe(1);
    s.shots.forEach((p) => { expect(p.kind).toBe('fireball'); expect(p.r).toBe(FIREBALL.radius); expect(p.dmg).toBe(0); });
    expect(ev.drain()).toEqual([{ t: 'fireballCast', x: 700, y: 240, tx: 200, ty: 250 }]);
  });
  it('arcs to its landing point in FIREBALL.flight and strikes there, then is gone', () => {
    const s = createState(3), ev = new EventBus();
    castFireball(s, ev, 700, 240, 200, 250); ev.drain();
    let peak = 0;
    for (let t = 0; t < FIREBALL.flight / 2; t += STEP) { step(s, STEP, noInputs, ev); s.shots.forEach((p) => { peak = Math.max(peak, p.h); }); }
    expect(peak).toBeGreaterThan(FIREBALL.arc * 0.9);
    for (let t = 0; t < FIREBALL.flight / 2 + STEP; t += STEP) step(s, STEP, noInputs, ev);
    expect(count(s)).toBe(0);
    const strike = ev.drain().find((e) => e.t === 'fireballStrike');
    expect(strike).toEqual({ t: 'fireballStrike', x: 200, y: 250, r: FIREBALL.radius });
  });
  it('hurts no one yet: damage waits on the shaman design (TB-087)', () => {
    const s = createState(3), ev = new EventBus(), o = orcAt(s, 200, 250);
    castFireball(s, ev, 700, 240, 200, 250);
    for (let t = 0; t < FIREBALL.flight + STEP; t += STEP) step(s, STEP, noInputs, ev);
    expect(o.hp).toBe(100);
    expect(ev.drain().some((e) => e.t === 'hit')).toBe(false);
  });
});
