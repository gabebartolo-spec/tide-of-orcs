import { describe, expect, it } from 'vitest';
import { createState } from './state';
import { EventBus } from './events';
import { noInputs, spawnOrc, step } from './step';
import { bounce, shoot } from './combat';
import { SIM_MISC, STEP } from '../data/balance';

describe('bug bash TB-219c combat/sim', () => {
  it('shoot() and bounce() stamp the target generation', () => {
    const s = createState(3);
    const o = spawnOrc(s, 'grunt', 200)!; o.x = 400;
    shoot(s, 'arrow', 100, 200, 0, 300, 5, 0, o);
    let p = s.shots.items.find((q) => q.live)!;
    expect(p.tgen).toBe(o.gen);
    s.shots.items.forEach((q) => { q.live = false; });
    bounce(s, 400, 200, 5, 1, new Set());
    p = s.shots.items.find((q) => q.live)!;
    expect(p.kind).toBe('bounce'); expect(p.tgen).toBe(o.gen);
    expect(p.life).toBe(SIM_MISC.shotLife);
  });
  it('a bounce shot is dropped when its target slot was reused by a new orc', () => {
    const s = createState(3), ev = new EventBus();
    const a = spawnOrc(s, 'grunt', 200)!; a.x = 400;
    bounce(s, 380, 200, 5, 0, new Set());
    const shot = s.shots.items.find((q) => q.live)!;
    a.gen++; // the slot is freed and reallocated: same object, new generation
    const hp = a.hp;
    step(s, STEP, noInputs, ev);
    expect(shot.live).toBe(false);
    expect(a.hp).toBe(hp);
  });
  it('a homing arrow ignores a reused target slot', () => {
    const s = createState(3), ev = new EventBus();
    s.stats.homing = true;
    const a = spawnOrc(s, 'grunt', 100)!; a.x = 600;
    shoot(s, 'arrow', 300, 300, 0, 100, 5, 0, a);
    const shot = s.shots.items.find((q) => q.live)!;
    a.gen++;
    step(s, STEP, noInputs, ev);
    expect(shot.vy).toBe(0); // flew straight on, did not steer toward y=100
  });
  it('step re-reads stats after a mid-step recompute', () => {
    const s = createState(3), ev = new EventBus();
    const a = spawnOrc(s, 'grunt', 100)!; a.x = 600;
    // shot 1 (a star) triggers a stats swap, as dropLoot -> recompute does; shot 2 is an arrow that must see the new stats
    const star = s.shots.alloc()!;
    star.kind = 'star'; star.tx = 800; star.ty = 400; star.r = 1; star.dmg = 0; star.fx = 0; star.life = Infinity; star.target = null; star.hit.clear();
    let tv = 0;
    Object.defineProperty(star, 't', { get: () => tv, set: (v: number) => { tv = v; s.stats = { ...s.stats, homing: true }; } });
    shoot(s, 'arrow', 300, 300, 0, 100, 5, 0, a);
    s.stats.homing = false;
    step(s, STEP, noInputs, ev);
    const arrow = s.shots.items.find((q) => q.live && q.kind === 'arrow')!;
    expect(arrow.vy).toBeLessThan(0); // steered toward the orc at y=100 using the fresh stats
  });
});
