import { describe, expect, it } from 'vitest';
import { FIELD, VANGUARD } from '../data/balance';
import { createState, type Orc } from '../sim/state';
import { orcAnimT, orcClipT, orcState, orcSwingT, strideT, vanState } from './actorState';
import { noInputs, step } from '../sim/step';
import { EventBus } from '../sim/events';
import { STEP } from '../data/balance';
import { Sprites } from './sprites';

type S = ReturnType<typeof createState>;
const orcAt = (s: S, x: number, y: number) => { const o = s.orcs.alloc()!; Object.assign(o, { kind: 'grunt', x, y, hp: 10, maxhp: 10, r: 12, dead: false }); return o; };
const vanAt = (s: S, x: number, tx: number, y: number) => { const v = s.vans.alloc()!; Object.assign(v, { type: 'spear', x, tx, y, ty: y, mv: x < tx, hp: 10, maxhp: 10 }); return v; };

describe('actor sprite state', () => {
  it('an orc walks on the plain and swings at the wall or a vanguard', () => {
    const s = createState(1);
    expect(orcState(s, orcAt(s, 600, 200))).toBe('walk');
    expect(orcState(s, orcAt(s, FIELD.barX + FIELD.barW + 12, 100))).toBe('attack');
    vanAt(s, 300, 300, 300);
    expect(orcState(s, orcAt(s, 300 + VANGUARD.engageRange, 300))).toBe('attack');
  });
  it('a vanguard walks while it marches, swings at an orc in reach and otherwise holds', () => {
    const s = createState(1);
    expect(vanState(s, vanAt(s, 200, 260, 100))).toBe('walk');
    const v = vanAt(s, 260, 260, 300);
    expect(vanState(s, v)).toBe('idle');
    const o = orcAt(s, 260 + VANGUARD.spear.reach, 300);
    expect(vanState(s, v)).toBe('attack');
    o.dead = true;
    expect(vanState(s, v)).toBe('idle');
  });
});

describe('drawActor fallbacks', () => {
  const anim = { image: 'x', frames: [[0, 0, 8, 8], [8, 0, 8, 8]] as [number, number, number, number][], fps: 10, ax: 0.5, ay: 1, hPerR: 2 };
  const drawn = (anims: Record<string, typeof anim>, state: 'walk' | 'attack' | 'idle', t = 0.15) => {
    const sp = new Sprites(); const calls: number[] = [];
    Object.assign(sp, { atlas: { images: ['x'], anims }, imgs: new Map([['x', {}]]) });
    const g = { drawImage: (...a: number[]) => calls.push(a[1]!), filter: 'none' } as unknown as CanvasRenderingContext2D;
    return sp.drawActor(g, 'k', state, t, 0, 0, 10) ? calls[0] : null;
  };
  const walk = { ...anim }, atk = { ...anim, frames: [[100, 0, 8, 8], [108, 0, 8, 8]] as [number, number, number, number][] };
  it('plays the matching loop, idle holds the walk frame 0', () => {
    expect(drawn({ k: walk, 'k.attack': atk }, 'walk')).toBe(8);
    expect(drawn({ k: walk, 'k.attack': atk }, 'attack')).toBe(108);
    expect(drawn({ k: walk, 'k.attack': atk }, 'idle')).toBe(0);
  });
  it('borrows the other loop when one is missing, and falls back to vector with none', () => {
    expect(drawn({ 'k.attack': atk }, 'walk')).toBe(100);
    expect(drawn({ k: walk }, 'attack')).toBe(8);
    expect(drawn({}, 'walk')).toBeNull();
  });
});

describe('orc sprite clock (TB-133)', () => {
  it('runs one second of clip per second of sim, not nine', () => {
    const s = createState(1), ev = new EventBus(), o = orcAt(s, 600, 200); o.spd = 40; o.wob = 0;
    for (let i = 0; i < 1 / STEP; i++) step(s, STEP, noInputs, ev);
    expect(orcAnimT(o)).toBeCloseTo(1, 5);
  });
});

describe('halted drummer drums on a loop (TB-186)', () => {
  it('plays orc.drummer.attack on the wob clock, not the frozen swing timer', () => {
    const s = createState(1), o = orcAt(s, FIELD.barX + FIELD.barW + 100, 200); o.kind = 'drummer'; o.wob = 1.3; o.swingT = 0;
    expect(orcState(s, o)).toBe('attack');
    expect(orcClipT(o, 'attack', 1.1, 0.5)).toBeCloseTo(orcAnimT(o), 6);
    o.wob += 0.4; expect(orcClipT(o, 'attack', 1.1, 0.5)).toBeCloseTo(orcAnimT(o), 6);
  });
  it('other orcs still play their attack once per swing', () => {
    const s = createState(1), o = orcAt(s, 600, 200); o.swingT = 0.2;
    expect(orcClipT(o, 'attack', 2, 0.5)).toBeCloseTo(orcSwingT(o, 2, 0.5), 6);
  });
});

describe('stride clock (TB-236)', () => {
  it('plays one walk cycle per stride walked, whatever the speed', () => {
    expect(strideT(30, 15, 1.2)).toBeCloseTo(2.4, 6);
    expect(strideT(0, 15, 1.2)).toBe(0);
    expect(strideT(30, 0, 1.2)).toBe(0);
  });
  it('a walking orc reads its clip from ground walked, so a stopped orc holds its frame', () => {
    const o = { kind: 'grunt', r: 10, walk: 45, wob: 3 } as unknown as Orc;
    const t = orcClipT(o, 'walk', 1, 0.5, 1.1, 1.5);
    expect(t).toBeCloseTo(3 * 1.1, 6);
    o.wob += 5; expect(orcClipT(o, 'walk', 1, 0.5, 1.1, 1.5)).toBeCloseTo(t, 6);
  });
});

describe('orc ground walked (TB-236)', () => {
  it('grows by the march, and a stunned orc holds its frame', () => {
    const s = createState(1), ev = new EventBus();
    const o = s.orcs.alloc()!; Object.assign(o, { kind: 'grunt', x: 800, y: 200, hp: 1e9, maxhp: 1e9, r: 12, spd: 40, dead: false, walk: 0 });
    for (let i = 0; i < 30; i++) step(s, 1 / 30, noInputs, ev);
    expect(o.walk).toBeCloseTo(800 - o.x, 6);
    const w = o.walk; o.stun = 5; for (let i = 0; i < 30; i++) step(s, 1 / 30, noInputs, ev);
    expect(o.walk).toBeCloseTo(w, 6);
  });
});
