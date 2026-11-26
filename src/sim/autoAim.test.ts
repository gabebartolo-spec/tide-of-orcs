import { describe, expect, it } from 'vitest';
import { createState, recompute } from './state';
import { EventBus } from './events';
import { step } from './step';
import { autoTarget } from './autoAim';
import { FIELD, STEP } from '../data/balance';

type S = ReturnType<typeof createState>;
const fresh = (): S => { const s = createState(7); recompute(s); return s; };
const orcAt = (s: S, x: number, y: number) => {
  const o = s.orcs.alloc()!;
  Object.assign(o, { kind: 'grunt', x, y, hp: 1e6, maxhp: 1e6, spd: 0, r: 10, loot: 0, atk: 0, dead: false, burn: 0, chill: 0, stun: 0, hitT: 0, wob: 0, swingT: 0, champ: false });
  return o;
};

describe('Auto fire target (TB-223)', () => {
  it('holds fire with no orc on the plain', () => {
    const s = fresh(); expect(autoTarget(s)).toBeNull();
    orcAt(s, FIELD.w + 24, 200);   // still marching in off the right edge
    expect(autoTarget(s)).toBeNull();
  });
  it('picks the orc whose circle catches the most orcs', () => {
    const s = fresh(); const r = s.stats.radius;
    orcAt(s, 220, 100);   // alone but nearest the wall
    orcAt(s, 600, 400); orcAt(s, 600 + r * 0.4, 400); orcAt(s, 600, 400 - r * 0.4);
    const t = autoTarget(s)!;
    expect(t.x).toBeGreaterThanOrEqual(600); expect(t.y).toBeGreaterThan(300);
  });
  it('a tie goes to the orc nearest the barricade, then the lowest, and reaches the bottom row', () => {
    const s = fresh(); orcAt(s, 700, 100); orcAt(s, 300, 420); orcAt(s, 300, 60);
    expect(autoTarget(s)).toEqual({ x: 300, y: 420 });
  });
  it('counts an orc by centre distance within radius plus its own radius, like the strike', () => {
    const s = fresh(); const r = s.stats.radius;
    // the middle orc catches both flanks at r + 10 - 1 apart; each flank reaches only the middle one
    orcAt(s, 520, 430); orcAt(s, 520 + r + 9, 430); orcAt(s, 520 - r - 9, 430);
    expect(autoTarget(s)).toEqual({ x: 520, y: 430 });
  });
  it('never picks an orc at the wall, where the elf does not loose', () => {
    const s = fresh(); orcAt(s, FIELD.barX + FIELD.barW, 200);
    expect(autoTarget(s)).toBeNull();
    orcAt(s, 400, 100);
    expect(autoTarget(s)).toEqual({ x: 400, y: 100 });
  });
  it('is pure: the same state gives the same pick', () => {
    const s = fresh(); orcAt(s, 400, 410); orcAt(s, 500, 200);
    expect(autoTarget(s)).toEqual(autoTarget(s)); expect(autoTarget(s)).toEqual({ x: 400, y: 410 });
  });
  it('the elf looses on her own with auto, onto the bottom-row orc, only with auto; a manual aim wins', () => {
    const run = (inputs: Parameters<typeof step>[2]) => {
      const s = fresh(); orcAt(s, 500, 430); s.run.shotT[0] = s.stats.lobCd; const ev = new EventBus(); step(s, STEP, inputs, ev);
      let tgt: { tx: number; ty: number } | null = null; s.shots.forEach((p) => { if (p.kind === 'lob') tgt = { tx: p.tx, ty: p.ty }; });
      return { loosed: ev.drain().some((e) => e.t === 'loose'), tgt };
    };
    expect(run({ aim: null }).loosed).toBe(false);   // desktop: no aim, no shot
    const a = run({ aim: null, auto: true });
    expect(a.loosed).toBe(true); expect(a.tgt).toEqual({ tx: 500, ty: 430 });
    const m = run({ aim: { x: 300, y: 50 }, auto: true });
    expect(m.loosed).toBe(true); expect(m.tgt).toEqual({ tx: 300, ty: 50 });
  });
});
