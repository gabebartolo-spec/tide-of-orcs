import { freshLoot } from '../data/loot';
import { CURRENT_VERSION, RETIRED_NODE_IDS, RETIRED_V3, RETIRED_V4, Save } from './schema';

type AnySave = { version: number } & Record<string, unknown>;

/** migrations[v] upgrades a save at version v to v+1. Add one for every schema bump. */
export const migrations: Record<number, (s: AnySave) => AnySave> = {
  1: (s) => {
    const run = { ...(s.run as { levels?: Record<string, number> }) };
    if (run.levels) {
      const levels = { ...run.levels };
      for (const id of RETIRED_NODE_IDS) delete levels[id];
      run.levels = levels;
    }
    return { ...s, version: 2, run };
  },
  2: (s) => {
    const { spawnT, ...run } = s.run as { spawnT?: number; levels?: Record<string, number> };
    if (run.levels) { const levels = { ...run.levels }; for (const id of RETIRED_V3) delete levels[id]; run.levels = levels; }
    return { ...s, version: 3, run: { ...run, foeT: { grunt: spawnT ?? 0 } } };
  },
  3: (s) => {
    const run = { ...(s.run as { levels?: Record<string, number>; foeT?: Record<string, number> }) };
    if (run.levels) { const levels = { ...run.levels }; for (const id of RETIRED_V4) delete levels[id]; run.levels = levels; }
    if (run.foeT) { const foeT = { ...run.foeT }; delete foeT.boss; run.foeT = foeT; }
    return { ...s, version: 4, run: { ...run, bossDone: 0, boss: null } };
  },
  // v4 to v5: run.earned (starlight earned this run) for the run summary; old runs start counting from 0
  4: (s) => ({ ...s, version: 5, run: { ...(s.run as object), earned: 0 } }),
  // v5 to v6: meta.hwLevels, the Heartwood tree (TB-055); nothing bought yet
  5: (s) => ({ ...s, version: 6, meta: { ...(s.meta as object), hwLevels: {} } }),
  /** v6 → v7: loot (TB-090): empty satchel, nothing equipped, no Glimmer, pity at 0. */
  6: (s) => ({ ...s, version: 7, meta: { ...(s.meta as object), loot: freshLoot() } }),
};

export function migrate(raw: unknown): Save {
  if (!raw || typeof raw !== 'object' || typeof (raw as AnySave).version !== 'number') throw new Error('not a save');
  let s = raw as AnySave;
  while (s.version < CURRENT_VERSION) {
    const m = migrations[s.version];
    if (!m) throw new Error(`no migration from v${s.version}`);
    s = m(s);
  }
  if (s.version !== CURRENT_VERSION) throw new Error(`save v${s.version} is newer than this build`);
  return s as unknown as Save;
}
