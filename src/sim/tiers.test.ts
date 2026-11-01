import { afterEach, describe, expect, it } from 'vitest';
import { TIERS, tierHp, tierLoot } from '../data/bosses';
import { EventBus } from './events';
import { createState } from './state';
import { spawnOrc } from './step';
import { bossStep, summonBoss } from './boss';
import { replant } from './prestige';
import { migrate } from '../save/migrate';
import { v8 } from '../save/fixtures/v8';

const base = { ...TIERS };
afterEach(() => { Object.assign(TIERS, base); });

/** Summon a boss wave at wave 25 and clear it at once. */
function clearBoss(tier: number, metaTier: number): { tier: number; events: string[] } {
  const s = createState(3), ev = new EventBus();
  s.run.wave = 25; s.run.tier = tier; s.meta.tier = metaTier;
  summonBoss(s, ev); s.run.boss!.left = 0; bossStep(s, ev, 1 / 30);
  return { tier: s.meta.tier, events: ev.drain().map((e) => e.t) };
}

describe('boss tiers (TB-148)', () => {
  it('Current values (P-148 set F): tier 1 multiplies by 1, tier 3 by hp 4 and loot 2.25, max 6', () => {
    expect(tierHp(1)).toBe(1); expect(tierLoot(1)).toBe(1);
    expect(tierHp(3)).toBe(4); expect(tierLoot(3)).toBe(2.25);
    expect(clearBoss(6, 6)).toEqual({ tier: 6, events: ['bossStart', 'bossEnd'] });
  });

  it('tiers off (max 1): no tier unlocks', () => {
    Object.assign(TIERS, { max: 1 });
    expect(clearBoss(1, 1)).toEqual({ tier: 1, events: ['bossStart', 'bossEnd'] });
  });

  it('a boss cleared at the highest tier unlocks the next, up to max; a lower tier unlocks nothing', () => {
    Object.assign(TIERS, { max: 3, hp: 2, loot: 2, hw: 0.5 });
    expect(clearBoss(1, 1)).toEqual({ tier: 2, events: ['bossStart', 'bossEnd', 'tierUnlocked'] });
    expect(clearBoss(1, 2).tier).toBe(2);
    expect(clearBoss(3, 3).tier).toBe(3);
  });

  it('a tier scales orc HP and starlight per kill from wave 1', () => {
    Object.assign(TIERS, { max: 3, hp: 2, loot: 1.5 });
    const a = createState(1), b = createState(1); b.run.tier = 3;
    spawnOrc(a, 'grunt', 100); spawnOrc(b, 'grunt', 100);
    const oa = a.orcs.items.find((o) => o.live)!, ob = b.orcs.items.find((o) => o.live)!;
    expect(ob.maxhp / oa.maxhp).toBeCloseTo(4); expect(ob.loot / oa.loot).toBeCloseTo(2.25);
  });

  it('a cleared boss pays more Heartwood at a higher tier', () => {
    Object.assign(TIERS, { max: 3, hw: 0.5 });
    const hw = (tier: number) => { const s = createState(3), ev = new EventBus(); s.run.wave = 25; s.run.tier = tier; s.meta.tier = 3; summonBoss(s, ev); s.run.boss!.left = 0; bossStep(s, ev, 1 / 30); return s.meta.heartwood; };
    expect(hw(1)).toBe(3); expect(hw(3)).toBe(6);
  });

  it('March plays the picked tier, clamped to those unlocked; the highest by default', () => {
    const s = createState(1), ev = new EventBus(); s.meta.tier = 3;
    s.run.fallen = true; replant(s, ev); expect(s.run.tier).toBe(3);
    s.run.fallen = true; replant(s, ev, 2); expect(s.run.tier).toBe(2);
    s.run.fallen = true; replant(s, ev, 9); expect(s.run.tier).toBe(3);
    s.run.fallen = true; replant(s, ev, 0); expect(s.run.tier).toBe(1);
  });

  it('v9 → v10 starts every save on the base tier', () => {
    const save = migrate(JSON.parse(JSON.stringify(v8)));
    expect(save.run.tier).toBe(1); expect(save.meta.tier).toBe(1);
  });
});
