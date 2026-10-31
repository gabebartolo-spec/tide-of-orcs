/**
 * Local telemetry for testers (TB-070): one record per finished run, kept in its own localStorage key (not part of
 * the save schema) and exported as a JSON file from Settings. Nothing leaves the machine unless the tester sends it.
 */
import { SimState } from '../sim/state';

export const TELEMETRY_KEY = 'tide-of-orcs-telemetry';
/** Oldest runs drop off past this many. */
export const TELEMETRY_CAP = 500;

export interface RunRecord {
  at: string; run: number; forced: boolean; wave: number; seconds: number; kills: number;
  earned: number; starlightPerMin: number; heartwoodGained: number; heartwoodTotal: number;
  ranks: number; vanguardsOnField: number; hwLevels: Record<string, number>;
}

/** Snapshot of the run that is ending; call before replant resets it. */
export function runRecord(s: SimState, heartwoodGained: number, now = new Date()): RunRecord {
  const r = s.run, mins = r.runTime / 60;
  return {
    at: now.toISOString(), run: s.meta.prestiges + 1, forced: r.fallen, wave: r.wave, seconds: Math.round(r.runTime), kills: r.kills,
    earned: Math.round(r.earned), starlightPerMin: mins > 0 ? Math.round(r.earned / mins) : 0,
    heartwoodGained, heartwoodTotal: s.meta.heartwood + heartwoodGained,
    ranks: Object.values(r.levels).reduce((a, b) => a + (b ?? 0), 0), vanguardsOnField: s.vans.count, hwLevels: { ...s.meta.hwLevels },
  };
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;
const store = (): Store | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };

export function readTelemetry(st: Store | null = store()): RunRecord[] {
  try { const v: unknown = JSON.parse(st?.getItem(TELEMETRY_KEY) ?? '[]'); return Array.isArray(v) ? (v as RunRecord[]) : []; } catch { return []; }
}

export function appendTelemetry(rec: RunRecord, st: Store | null = store()): void {
  const all = [...readTelemetry(st), rec].slice(-TELEMETRY_CAP);
  try { st?.setItem(TELEMETRY_KEY, JSON.stringify(all)); } catch { /* storage full: drop it */ }
}

/** The export file's contents. */
/** Loot events (TB-107, loot plan §13): their own key, capped; `min` counts from the first one this browser logged (its own key, so the save schema is untouched). */
export const LOOT_LOG_KEY = 'tide-of-orcs-loot-log';
export const LOOT_START_KEY = 'tide-of-orcs-telemetry-start';
export const LOOT_LOG_CAP = 5000;
export type LootKind = 'drop' | 'equip' | 'salvage' | 'reroll' | 'set';

export interface LootRecord {
  kind: LootKind; wave: number; run: number; min: number;
  rarity?: string; slot?: string; base?: string; set?: string; kept?: boolean; affix?: number; tiers?: number;
}

/** When this browser first logged loot, set on the first call. */
export function lootStart(now: number, st: Store | null = store()): number {
  try {
    const v = Number(st?.getItem(LOOT_START_KEY));
    if (v > 0) return v;
    st?.setItem(LOOT_START_KEY, String(now));
  } catch { /* no storage: count from now */ }
  return now;
}

export function lootRecord(s: SimState, kind: LootKind, extra: Partial<LootRecord>, now: number, start: number): LootRecord {
  return { kind, wave: s.run.wave, run: s.meta.prestiges + 1, min: Math.round(((now - start) / 60000) * 10) / 10, ...extra };
}

export function readLoot(st: Store | null = store()): LootRecord[] {
  try { const v: unknown = JSON.parse(st?.getItem(LOOT_LOG_KEY) ?? '[]'); return Array.isArray(v) ? (v as LootRecord[]) : []; } catch { return []; }
}

export function appendLoot(recs: LootRecord[], st: Store | null = store()): void {
  if (!recs.length) return;
  const all = [...readLoot(st), ...recs].slice(-LOOT_LOG_CAP);
  try { st?.setItem(LOOT_LOG_KEY, JSON.stringify(all)); } catch { /* storage full: drop it */ }
}

/** The export file's contents. */
export const telemetryJson = (runs: RunRecord[], build = import.meta.env.MODE, loot: LootRecord[] = []): string =>
  JSON.stringify({ game: 'tide-of-orcs', build, exportedAt: new Date().toISOString(), runs, loot }, null, 2);
