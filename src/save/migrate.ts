import { checkpointFor } from '../data/balance';
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
  /** v7 → v8: once-per-run gear state moves into the saved run (TB-110); nothing stored or spent yet. */
  7: (s) => ({ ...s, version: 8, run: { ...(s.run as object), thunder: 0, freeRallyUsed: false } }),
  /** v8 → v9: Heirloom (TB-101); no item named yet. */
  8: (s) => { const m = s.meta as { loot: object }; return { ...s, version: 9, meta: { ...m, loot: { ...m.loot, heirloom: null } } }; },
  /** v9 → v10: boss tiers (TB-148); only the base tier unlocked, the run plays it. */
  9: (s) => ({ ...s, version: 10, run: { ...(s.run as object), tier: 1 }, meta: { ...(s.meta as object), tier: 1 } }),
  /** v10 → v11: checkpoints (TB-159); granted for the best wave already reached. */
  10: (s) => { const m = s.meta as { bestWave?: number }; return { ...s, version: 11, meta: { ...m, checkpoint: checkpointFor(m.bestWave ?? 1) } }; },
  /** v11 → v12: Settings › Text size (TB-191); old saves keep 100 %. */
  11: (s) => ({ ...s, version: 12, settings: { ...(s.settings as object), textScale: 1 } }),
  /** v12 to v13: the elf encampment (TB-188a); nothing built, no materials. */
  12: (s) => ({ ...s, version: 13, meta: { ...(s.meta as object), camp: { levels: {}, mats: {} } } }),
  /** v13 to v14: specialisation paths (TB-193a); no path chosen, nothing dropped toward Magpie's Hoard. */
  13: (s) => ({ ...s, version: 14, run: { ...(s.run as object), path: null, hoardN: 0 } }),
  /** v14 to v15: Heartwood from bosses cleared this run, for the fallen overlay (TB-205); an old run counts from 0. */
  14: (s) => ({ ...s, version: 15, run: { ...(s.run as object), hwEarned: 0 } }),
  /** v15 to v16: the dagger slot (TB-225, "a knife cannot be a bow"). A saved Last Knife (worn, in the satchel, or the run's best find) leaves the bow slot for dagger, on the dagger base of the same tier. */
  15: (s) => {
    const BOW_TO_DAGGER: Record<string, string> = { 'ashwood-bow': 'bone-knife', 'yew-longbow': 'flint-dagger', hornbow: 'bronze-dirk', 'ironbark-recurve': 'silver-stiletto' };
    type It = { uid?: string; slot?: string; base?: string; mythic?: string };
    const fix = (it: It): It => it && it.mythic === 'last-knife' && it.slot === 'bow' ? { ...it, slot: 'dagger', base: BOW_TO_DAGGER[it.base ?? ''] ?? 'bone-knife' } : it;
    const meta = { ...(s.meta as { loot?: { items?: It[]; equipped?: Record<string, string> } }) };
    if (meta.loot) {
      const loot = { ...meta.loot }, moved = new Set<string>();
      if (Array.isArray(loot.items)) loot.items = loot.items.map((it) => { const n = fix(it); if (n !== it && n.uid) moved.add(n.uid); return n; });
      if (loot.equipped) {
        const eq = { ...loot.equipped };
        if (eq.bow && moved.has(eq.bow)) { if (!eq.dagger) eq.dagger = eq.bow; delete eq.bow; }
        loot.equipped = eq;
      }
      meta.loot = loot;
    }
    const run = { ...(s.run as { best?: It }) };
    if (run.best) run.best = fix(run.best);
    return { ...s, version: 16, meta, run };
  },
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
