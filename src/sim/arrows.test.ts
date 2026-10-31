import { describe, expect, it } from 'vitest';
import { createState, recompute } from './state';
import { EventBus } from './events';
import { noInputs, step } from './step';
import { impact, kill, starfall } from './combat';
import { ARROWS, STEP } from '../data/balance';
import { cueFor } from '../data/audio';

type S = ReturnType<typeof createState>;
const withNodes = (lv: Record<string, number>): S => { const s = createState(7); Object.assign(s.run.levels, lv); recompute(s); return s; };
const orcAt = (s: S, x: number, y: number, hp = 1e6) => {
  const o = s.orcs.alloc()!;
  Object.assign(o, { kind: 'grunt', x, y, hp, maxhp: hp, spd: 0, r: 10, loot: 0, atk: 0, dead: false, burn: 0, chill: 0, stun: 0, hitT: 0, wob: 0, swingT: 0, champ: false });
  return o;
};
const strike = (s: S, ev: EventBus, x: number, y: number, first = true) => impact(s, ev, { tx: x, ty: y, r: 30, dmg: 10 }, first);

describe('arrow arsenal (TB-089)', () => {
  it('the elf release ignites only with Fire Arrows', () => {
    for (const [lv, lit] of [[{}, false], [{ fire: 1, firechance: 5 }, true]] as const) {
      const s = withNodes(lv), ev = new EventBus();
      s.run.shotT[0] = s.stats.lobCd; step(s, STEP, { ...noInputs, aim: { x: 500, y: 100 } }, ev);
      const ts = ev.drain().map((e) => e.t);
      expect(ts).toContain('loose');
      expect(ts.includes('ignite')).toBe(lit);
    }
  });

  it('frost slow is 20% at rank 1 and 40% at rank 5', () => {
    expect(withNodes({ frost: 1 }).stats.slow).toBeCloseTo(0.2);
    expect(withNodes({ frost: 5 }).stats.slow).toBeCloseTo(0.4);
  });

  it('frost chills struck orcs and slows their march', () => {
    const s = withNodes({ frost: 5 }), ev = new EventBus(), o = orcAt(s, 500, 100); o.spd = 10;
    strike(s, ev, 500, 100);
    expect(o.chill).toBeCloseTo(ARROWS.frost.secs);
    const x0 = o.x; step(s, STEP, noInputs, ev);
    expect(x0 - o.x).toBeCloseTo(10 * 0.6 * STEP, 5);
  });

  it('a chilled orc that dies shatters onto its neighbours', () => {
    const s = withNodes({ frost: 1, shatter: 1 }), ev = new EventBus(), a = orcAt(s, 500, 100, 5), b = orcAt(s, 530, 100);
    a.chill = 1; kill(s, ev, a);
    expect(b.hp).toBeLessThan(b.maxhp);
    expect(ev.drain().some((e) => e.t === 'shatter')).toBe(true);
  });

  it('thunderclap stuns: a stunned orc does not move', () => {
    const s = withNodes({ fire: 1, storm: 1, shock: 1, stun: 1 }), ev = new EventBus(), o = orcAt(s, 500, 100); o.spd = 10;
    strike(s, ev, 500, 100);
    const x0 = o.x; step(s, STEP, noInputs, ev);
    expect(o.x).toBe(x0);
  });

  it('shock arrows chain to 3 orcs outside the circle for 30%', () => {
    const s = withNodes({ fire: 1, storm: 1, shock: 1 }), ev = new EventBus();
    orcAt(s, 500, 100); const out = [orcAt(s, 550, 100), orcAt(s, 500, 150), orcAt(s, 450, 100), orcAt(s, 500, 50)];
    strike(s, ev, 500, 100);
    expect(out.filter((o) => o.hp < o.maxhp)).toHaveLength(ARROWS.shock.targets);
    for (const o of out) if (o.hp < o.maxhp) expect(o.maxhp - o.hp).toBeCloseTo(10 * ARROWS.shock.mult);
  });

  it('rebound bounces 1 + rank times, weaker each bounce, only on a first strike', () => {
    const s = withNodes({ multi: 1, pierce: 1, bounce: 1 }), ev = new EventBus();
    const os = [orcAt(s, 500, 100), orcAt(s, 560, 100), orcAt(s, 620, 100), orcAt(s, 680, 100)];
    strike(s, ev, 500, 100, false);
    expect(s.shots.count).toBe(0);
    strike(s, ev, 500, 100);
    for (let i = 0; i < 200; i++) step(s, STEP, noInputs, ev);
    const dealt = os.map((o) => o.maxhp - o.hp);
    expect(dealt[1]).toBeCloseTo(10 * ARROWS.bounce.falloff);
    expect(dealt[2]).toBeCloseTo(10 * ARROWS.bounce.falloff ** 2);
    expect(dealt[3]).toBe(0);
  });

  it('starfall drops its arrows and strikes orcs', () => {
    const s = withNodes({}), ev = new EventBus(), o = orcAt(s, 500, 100);
    starfall(s, ev);
    expect(s.shots.count).toBe(ARROWS.starfall.arrows);
    for (let i = 0; i < 120; i++) step(s, STEP, noInputs, ev);
    expect(o.hp).toBeLessThan(o.maxhp);
  });

  it('each arrow event plays its own cue', () => {
    expect(cueFor({ t: 'chill', x: 0, y: 0, r: 1 })).toBe('frost');
    expect(cueFor({ t: 'starfall' })).toBe('starfall');
    expect(cueFor({ t: 'fireStrike', x: 0, y: 0, r: 1 })).toBe('fireArrow');
  });
});
