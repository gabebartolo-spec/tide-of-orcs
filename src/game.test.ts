import { describe, expect, it } from 'vitest';
import { GameController } from './game';
import { readTelemetry } from './save/telemetry';

describe('GameController (TB-199)', () => {
  it('replant on a standing early run does nothing and logs no telemetry', () => {
    const g = new GameController(1), before = readTelemetry().length;
    expect(g.canReplant()).toBe(false);
    expect(g.replant()).toBe(0);
    expect(readTelemetry().length).toBe(before);
    expect(g.state.meta.prestiges).toBe(0);
  });
  it('import clamps bad settings', () => {
    const g = new GameController(1), s = g.toSave();
    const blob = btoa(JSON.stringify({ ...s, settings: { volume: 5, reducedMotion: 'x', numberFormat: 'sci', textScale: 99 } }));
    g.importSave(blob);
    expect(g.settings).toEqual({ volume: 1, reducedMotion: null, numberFormat: 'sci', textScale: 1.6 });
  });
});

describe('aim latch (TB-218 I3)', () => {
  const shots = (g: GameController, n: number): number => { let k = 0; for (let i = 0; i < n; i++) { g.tick(0.02); k += g.events.drain().filter((e) => e.t === 'loose').length; } return k; };
  it('a press and release between two ticks still looses one arrow', () => {
    const g = new GameController(1); g.state.run.shotT[0] = 99;
    g.setAim(500, 240); g.clearAim();
    expect(shots(g, 1)).toBe(1);
    expect(shots(g, 60)).toBe(0);          // used once; nothing keeps firing
  });
  it('no touch, no shots (rule 2)', () => {
    const g = new GameController(1); g.state.run.shotT[0] = 99;
    expect(shots(g, 250)).toBe(0);
  });
  it('a cancelled touch or blur drops the aim with no latched shot', () => {
    const g = new GameController(1); g.state.run.shotT[0] = 99;
    g.setAim(500, 240); g.dropAim();
    expect(shots(g, 5)).toBe(0);
  });
});
