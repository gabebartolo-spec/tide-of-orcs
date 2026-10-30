import { CURRENT_VERSION, Save } from './schema';

type AnySave = { version: number } & Record<string, unknown>;

/** migrations[v] upgrades a save at version v to v+1. Add one for every schema bump. */
export const migrations: Record<number, (s: AnySave) => AnySave> = {
  // 1: (s) => ({ ...s, version: 2, meta: { ...(s.meta as object), hwLevels: {} } }),
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
