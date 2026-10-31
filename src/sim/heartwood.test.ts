import { describe, expect, it } from 'vitest';
import { HW_NODES } from '../data/heartwood';
import { BOSS_SCRIPT, BOSS_WAVE } from '../data/bosses';
import { waveLoot } from '../data/balance';
import { EventBus } from './events';
import { buyHw, canBuyHw, hwAvailable, hwSpent } from './heartwood';
import { bossStep, bossesReady } from './boss';
import { replant } from './prestige';
import { createState, freshMeta, freshRun } from './state';

const withHw = (hw: number, levels = {}) => createState(1, freshRun(), { ...freshMeta(), heartwood: hw, hwLevels: levels });

describe('Heartwood tree (TB-053)', () => {
  it('ids are unique and every node has a cost per rank', () => {
    expect(new Set(HW_NODES.map((n) => n.id)).size).toBe(HW_NODES.length);
    for (const n of HW_NODES) expect(n.costs.length).toBeGreaterThan(0);
  });
  it('buying spends available Heartwood but keeps the passive bonus', () => {
    const s = withHw(10), ev = new EventBus(), dmg = s.stats.dmg;
    expect(buyHw(s, ev, 'hw_dawn')).toBe(true); expect(buyHw(s, ev, 'hw_dawn')).toBe(true);
    expect(hwSpent(s.meta)).toBe(6); expect(hwAvailable(s.meta)).toBe(4); expect(s.meta.heartwood).toBe(10);
    expect(s.stats.dmg).toBe(dmg);
    expect(canBuyHw(s.meta, 'hw_dawn')).toBe(false); // rank 3 costs 8
  });
  it('max rank stops buying', () => {
    const s = withHw(100), ev = new EventBus();
    expect(buyHw(s, ev, 'hw_wolf')).toBe(true); expect(buyHw(s, ev, 'hw_wolf')).toBe(false);
  });
  it('Stout Timber raises barricade max at once', () => {
    const s = withHw(10), base = s.stats.barMax;
    buyHw(s, new EventBus(), 'hw_timber');
    expect(s.stats.barMax / base).toBeCloseTo(1.25);
  });
  it('a replant applies Early Dawn, Old Friend and Standing Orders', () => {
    const s = withHw(100, { hw_dawn: 5, hw_wolf: 1, hw_orders: 2 }), ev = new EventBus();
    s.run.fallen = true; replant(s, ev);
    expect(s.run.wave).toBe(11); expect(s.run.levels.wolf).toBe(1); expect(s.stats.wolf).toBeGreaterThan(0);
    expect(s.vans.count).toBe(2); expect(s.run.barHp).toBeCloseTo(s.stats.barMax);
    expect(bossesReady(s)).toBe(0); expect(s.run.bossDone).toBe(Math.floor(11 / BOSS_WAVE.every));
  });
  it('Warlords raises the boss wave clear bonus 50% per rank', () => {
    const s = withHw(100, { hw_boss: 2 }), ev = new EventBus(); s.run.wave = 10; s.run.bossDone = -1; // one boss waiting at low orc HP
    s.run.boss = { t: 59, next: BOSS_SCRIPT.length, left: 0 }; bossStep(s, ev, 0.1);
    const end = ev.drain().find((e) => e.t === 'bossEnd');
    expect(end).toMatchObject({ cleared: true }); expect(end && 'loot' in end ? end.loot : 0).toBeCloseTo(BOSS_WAVE.clearLoot * waveLoot(10) * s.stats.starMult * 2);
  });
});
