import { describe, expect, it } from 'vitest';
import { FIELD, VANGUARD } from '../data/balance';
import { createState } from '../sim/state';
import { orcState, vanState } from './actorState';
import { Sprites } from './sprites';

type S = ReturnType<typeof createState>;
const orcAt = (s: S, x: number, y: number) => { const o = s.orcs.alloc()!; Object.assign(o, { kind: 'grunt', x, y, hp: 10, maxhp: 10, r: 12, dead: false }); return o; };
const vanAt = (s: S, x: number, tx: number, y: number) => { const v = s.vans.alloc()!; Object.assign(v, { type: 'spear', x, tx, y, hp: 10, maxhp: 10 }); return v; };

describe('actor sprite state', () => {
  it('an orc walks on the plain and swings at the wall or a vanguard', () => {
    const s = createState(1);
    expect(orcState(s, orcAt(s, 600, 200))).toBe('walk');
    expect(orcState(s, orcAt(s, FIELD.barX + FIELD.barW + 12, 100))).toBe('attack');
    vanAt(s, 300, 300, 300);
    expect(orcState(s, orcAt(s, 300 + VANGUARD.engageRange, 300))).toBe('attack');
  });
  it('a vanguard walks to its stand, swings at an orc in reach and otherwise holds', () => {
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
  const anim = { frames: [[0, 0, 8, 8], [8, 0, 8, 8]] as [number, number, number, number][], fps: 10, ax: 0.5, ay: 1, hPerR: 2 };
  const drawn = (anims: Record<string, typeof anim>, state: 'walk' | 'attack' | 'idle', t = 0.15) => {
    const sp = new Sprites(); const calls: number[] = [];
    Object.assign(sp, { atlas: { image: 'x', anims }, img: {} });
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
