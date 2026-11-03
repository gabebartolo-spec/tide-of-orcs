import { beforeEach, describe, expect, it } from 'vitest';
import { GameController } from './game';
import { SAVE_BACKUP_KEY, SAVE_KEY, clearLoadFailed, saveLoadFailed } from './save/storage';
import { bossScript } from './data/bosses';
import { bossStep } from './sim/boss';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); },
};

describe('GameController load and reset (TB-216b)', () => {
  beforeEach(() => { mem.clear(); clearLoadFailed(); });
  it('a boss wave saved mid-challenge starts over on load, so it can still be cleared', () => {
    const g = new GameController(3);
    g.state.run.wave = 30; expect(g.summonBoss()).toBe(true);
    for (let i = 0; i < 15 * 30; i++) bossStep(g.state, g.events, 1 / 30);
    expect(g.state.run.boss!.next).toBeGreaterThan(0);
    g.save();
    const h = new GameController(4), full = bossScript(h.state.run.tier).reduce((n, m) => n + m.ys.length, 0);
    expect(h.state.run.boss).toEqual({ t: 0, next: 0, left: full });
    expect(h.state.run.bossDone).toBe(1);
  });
  it('a save that migrates but has the wrong shape is backed up and blocks writes instead of crashing boot', () => {
    for (const bad of ['{"version":15,"run":{"levels":null},"meta":{}}', '{"version":14,"run":{},"meta":{"camp":null}}']) {
      mem.clear(); clearLoadFailed(); mem.set(SAVE_KEY, bad);
      const g = new GameController(1);
      expect(g.state.run.wave).toBe(1);
      expect(saveLoadFailed()).toBe(true);
      expect(mem.get(SAVE_BACKUP_KEY)).toBe(bad);
      expect(g.save()).toBe(false); expect(mem.get(SAVE_KEY)).toBe(bad);
    }
  });
  it('wipe and import reseed the RNG from the clock, not a fixed 1', () => {
    const g = new GameController(1), blob = g.exportSave();
    const rolls = (): number[] => [g.state.rng.next(), g.state.lootRng.next(), g.state.matRng.next()];
    const a: number[][] = [];
    const now = Date.now; let t = 1_000_000;
    Date.now = () => (t += 7919);
    try { g.wipe(); a.push(rolls()); g.wipe(); a.push(rolls()); g.importSave(blob); a.push(rolls()); g.importSave(blob); a.push(rolls()); } finally { Date.now = now; }
    expect(a[0]).not.toEqual(a[1]); expect(a[2]).not.toEqual(a[3]); expect(g.state.rng.seed).not.toBe(1);
  });
  it('wipe and import emit gameReset (audio ends the boss track) and drop the old aim and events', () => {
    const g = new GameController(1);
    g.state.run.wave = 30; g.summonBoss(); g.setAim(10, 10);
    g.wipe();
    expect(g.events.drain()).toEqual([{ t: 'gameReset' }]); expect(g.aim).toBeNull();
    g.summonBoss(); g.setAim(5, 5); g.importSave(g.exportSave());
    expect(g.events.drain()).toEqual([{ t: 'gameReset' }]); expect(g.aim).toBeNull();
  });
});
