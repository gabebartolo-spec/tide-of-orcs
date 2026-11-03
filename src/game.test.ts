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
