import { describe, expect, it } from 'vitest';
import { createState } from './state';
import { EventBus } from './events';
import { noInputs, spawnOrc, step } from './step';
import { kill } from './combat';
import { FIREBALL, ORC_FX, OrcKind } from '../data/orcs';
import { BOSS_SCRIPT, bossScript } from '../data/bosses';
import { FIELD, STEP } from '../data/balance';

type S = ReturnType<typeof createState>;
const WALL = FIELD.barX + FIELD.barW;
const orc = (s: S, kind: OrcKind, x: number, y = 240) => { const o = spawnOrc(s, kind, y)!; o.x = x; o.hp = o.maxhp = 1e9; return o; };
const live = (s: S) => { const a: { kind: string; x: number; champ: boolean }[] = []; s.orcs.forEach((o) => { if (!o.dead) a.push(o); }); return a; };

describe('new orcs (TB-087)', () => {
  it('a berserker below half health runs ORC_FX.rageSpeed times as fast', () => {
    const s = createState(5), ev = new EventBus();
    const o = orc(s, 'berserker', 700); step(s, STEP, noInputs, ev); const calm = 700 - o.x;
    o.x = 700; o.hp = o.maxhp * 0.4; step(s, STEP, noInputs, ev);
    expect((700 - o.x) / calm).toBeCloseTo(ORC_FX.rageSpeed, 5);
  });
  it('a war drummer quickens orcs within reach, once however many drums beat', () => {
    const s = createState(5), ev = new EventBus();
    const far = orc(s, 'grunt', 700, 60), near = orc(s, 'grunt', 700, 300);
    orc(s, 'drummer', 720, 300); orc(s, 'drummer', 720, 320);
    step(s, STEP, noInputs, ev);
    expect((700 - near.x) / (700 - far.x)).toBeCloseTo(1 + ORC_FX.drumBoost, 5);
  });
  it('a shaman halts short of the wall and its fireball strikes the timber', () => {
    const s = createState(5), ev = new EventBus();
    const o = orc(s, 'shaman', WALL + ORC_FX.shamanHalt + 1); o.castT = 0.01;
    const hp0 = s.run.barHp;
    for (let t = 0; t < FIREBALL.flight + 0.2; t += STEP) step(s, STEP, noInputs, ev);
    expect(o.x).toBe(WALL + ORC_FX.shamanHalt);
    expect(s.run.barHp).toBeLessThan(hp0);
  });
  it('a slain wolf rider leaves a grunt where it fell, still part of its boss wave', () => {
    const s = createState(5), ev = new EventBus();
    s.run.boss = { t: 0, next: 99, left: 1 };
    const o = orc(s, 'wolfrider', 500); o.champ = true;
    kill(s, ev, o);
    const g = live(s).find((q) => q.kind === 'grunt')!;
    expect(g.x).toBe(500); expect(g.champ).toBe(true); expect(s.run.boss.left).toBe(1);
  });
  it('the boss escort grows with tier and marches in order', () => {
    expect(bossScript(1)).toHaveLength(BOSS_SCRIPT.length);
    const kinds = (t: number) => new Set(bossScript(t).map((m) => m.kind));
    expect(kinds(2).has('berserker')).toBe(true); expect(kinds(2).has('wolfrider')).toBe(false);
    expect([...kinds(6)]).toEqual(expect.arrayContaining(['berserker', 'wolfrider', 'shaman', 'drummer', 'boss']));
    const at = bossScript(6).map((m) => m.at); expect(at).toEqual([...at].sort((a, b) => a - b));
  });
});
