import { describe, expect, it } from 'vitest';
import { createState } from './state';
import { EventBus } from './events';
import { noInputs, step } from './step';
import { castFireball } from './combat';
import { barricadeHit } from './barricade';
import { replant } from './prestige';
import { FIREBALL } from '../data/orcs';
import { FIELD, SOURCES, STEP } from '../data/balance';

describe('bug bash TB-216a', () => {
  it('a fallen wall takes no more hits and falls only once', () => {
    const s = createState(5), ev = new EventBus();
    s.run.barHp = 1;
    barricadeHit(s, ev, 1000, 200); barricadeHit(s, ev, 1000, 300);
    expect(s.run.fallen).toBe(true);
    expect(ev.drain().filter((e) => e.t === 'barricadeFell')).toHaveLength(1);
  });
  it('two fireballs landing on the wall in the same step fire one barricadeFell', () => {
    const s = createState(5), ev = new EventBus();
    s.run.barHp = 1;
    const x = FIELD.barX + FIELD.barW;
    castFireball(s, ev, 700, 200, x, 200, 1000); castFireball(s, ev, 700, 300, x, 300, 1000);
    for (let t = 0; t < FIREBALL.flight + 0.2; t += STEP) step(s, STEP, noInputs, ev);
    expect(s.run.fallen).toBe(true);
    expect(ev.drain().filter((e) => e.t === 'barricadeFell')).toHaveLength(1);
  });
  it('replant resets the wolf, fox, hawk and wolf pack to their start posts', () => {
    const s = createState(5), ev = new EventBus(), fresh = createState(5);
    s.wolf.x = 900; s.wolf.biteT = 0.4; s.fox.x = 800; s.hawk.x = 50;
    s.pack.push({ ...s.wolf });
    s.run.fallen = true;
    replant(s, ev);
    expect(s.wolf).toEqual(fresh.wolf); expect(s.fox).toEqual(fresh.fox); expect(s.hawk).toEqual(fresh.hawk);
    expect(s.pack).toHaveLength(0);
  });
  it('wolf base damage is 4 (TB-157, BALANCE ## Current)', () => {
    expect(SOURCES.wolf.base).toBe(4);
  });
});
