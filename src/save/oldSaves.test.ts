import { describe, expect, it } from 'vitest';
import { v1 } from './fixtures/v1';
import { v2 } from './fixtures/v2';
import { v3 } from './fixtures/v3';
import { v4 } from './fixtures/v4';
import { v5 } from './fixtures/v5';
import { v6 } from './fixtures/v6';
import { v7 } from './fixtures/v7';
import { v8 } from './fixtures/v8';
import { v9 } from './fixtures/v9';
import { v10 } from './fixtures/v10';
import { v11 } from './fixtures/v11';
import { v12 } from './fixtures/v12';
import { v13 } from './fixtures/v13';
import { v14 } from './fixtures/v14';
import { migrate } from './migrate';
import { CURRENT_VERSION, Save, defaultSettings } from './schema';
import { exportSave, importSave } from './storage';
import { EventBus } from '../sim/events';
import { SimState, createState, freshMeta, freshRun } from '../sim/state';
import { step } from '../sim/step';

/** Every save version a shipped build ever wrote (TB-140). v2–v10 were played and saved by the build of their day. */
const OLD: Record<string, object> = { v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14 };

/** Load a migrated save the way GameController does (src/game.ts): fresh defaults under the saved fields. */
const load = (save: Save): SimState => createState(7, { ...freshRun(), ...save.run }, { ...freshMeta(), ...save.meta });
const toSave = (s: SimState, settings: Save['settings']): Save => ({ version: CURRENT_VERSION, savedAt: 0, run: s.run, meta: s.meta, settings });

/** Paths of every number in v that is not finite. */
function badNumbers(v: unknown, path = ''): string[] {
  if (typeof v === 'number') return Number.isFinite(v) ? [] : [path];
  if (!v || typeof v !== 'object') return [];
  return Object.entries(v).flatMap(([k, x]) => badNumbers(x, `${path}.${k}`));
}

/** Play 60 s, aiming at the front orc, replanting if the wall falls. */
function play(s: SimState): void {
  const ev = new EventBus();
  for (let t = 0; t < 60 * 30; t++) {
    let aim: { x: number; y: number } | null = null;
    for (const o of s.orcs.items) if (o.live && (!aim || o.x < aim.x)) aim = { x: o.x, y: o.y };
    step(s, 1 / 30, { aim: s.run.fallen ? null : aim }, ev);
    ev.drain();
  }
}

describe('every old save loads and plays', () => {
  for (const [name, fixture] of Object.entries(OLD)) {
    it(`${name} migrates, plays 60 s with no bad numbers, and round-trips export/import`, () => {
      const save = migrate(JSON.parse(JSON.stringify(fixture)));
      expect(save.version).toBe(CURRENT_VERSION);
      const settings = { ...defaultSettings(), ...save.settings };
      const s = load(save);
      expect(badNumbers(s.run, 'run')).toEqual([]); expect(badNumbers(s.meta, 'meta')).toEqual([]);
      const before = { kills: s.run.kills, runTime: s.run.runTime };
      play(s);
      expect(s.run.runTime).toBeGreaterThan(before.runTime);
      expect(badNumbers(s.run, 'run')).toEqual([]); expect(badNumbers(s.meta, 'meta')).toEqual([]);
      const out = toSave(s, settings);
      expect(importSave(exportSave(out))).toEqual(JSON.parse(JSON.stringify(out)));
    });
  }
  it('grants the checkpoint for the best wave an old save reached (TB-159)', () => {
    expect(migrate(JSON.parse(JSON.stringify(v10))).meta.checkpoint).toBe(11);
    expect(migrate(JSON.parse(JSON.stringify(v10))).settings.textScale).toBe(1);
    expect(migrate(JSON.parse(JSON.stringify(v9))).meta.checkpoint).toBe(11);
  });
  it('keeps the path and camp a v13/v14 save carried (TB-216b)', () => {
    expect(migrate(JSON.parse(JSON.stringify(v14))).run.path).toBe('serpent');
    expect(migrate(JSON.parse(JSON.stringify(v13))).meta.camp.mats).toEqual(v13.meta.camp.mats);
    expect(migrate(JSON.parse(JSON.stringify(v12))).run.path).toBeNull();
  });
  it('keeps the progress an old save carried', () => {
    for (const fixture of [v2, v5, v8]) {
      const save = migrate(JSON.parse(JSON.stringify(fixture)));
      const old = fixture as unknown as { run: { wave: number; levels: Record<string, number> }; meta: { heartwood: number; prestiges: number } };
      expect(save.run.wave).toBe(old.run.wave); expect(save.meta.heartwood).toBe(old.meta.heartwood);
      expect(save.meta.prestiges).toBe(old.meta.prestiges);
      for (const [id, lv] of Object.entries(old.run.levels)) expect(save.run.levels[id as keyof typeof save.run.levels]).toBe(lv);
    }
  });
});
