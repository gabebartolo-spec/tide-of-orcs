import { OrcKind } from '../data/orcs';
import { FIELD, ORC_CAP, VanType } from '../data/balance';
import { Levels, Stats, deriveStats } from './stats';
import { Pool } from './pool';
import { Rng, createRng } from './rng';

export interface Orc {
  live: boolean; kind: OrcKind; x: number; y: number; hp: number; maxhp: number; spd: number; r: number; loot: number; atk: number;
  dead: boolean; burn: number; hitT: number; wob: number; swingT: number;
}
export type ProjectileKind = 'arrow' | 'knife' | 'bolt';
export interface Projectile {
  live: boolean; kind: ProjectileKind; x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; life: number;
  target: Orc | null; hit: Set<Orc>;
}
export interface Vanguard {
  live: boolean; type: VanType; x: number; y: number; tx: number; hp: number; maxhp: number; swingT: number; hitT: number;
}

export interface RunState {
  wave: number; waveT: number; runTime: number; starlight: number; kills: number; levels: Levels;
  barHp: number; bulwarkUsed: boolean; fallen: boolean;
  spawnT: number; stormT: number; shotT: number[]; knifeT: number; hawkT: number; treantT: number; ballT: number;
}
export interface MetaState { heartwood: number; lifetimeKills: number; bestWave: number; prestiges: number }

export interface SimState {
  tick: number; t: number;
  rng: Rng;
  run: RunState; meta: MetaState; stats: Stats;
  orcs: Pool<Orc>; shots: Pool<Projectile>; vans: Pool<Vanguard>;
  wolf: { x: number; y: number; tx: number; ty: number; biteT: number };
  hawk: { x: number; y: number; a: number };
}

export function freshRun(): RunState {
  return { wave: 1, waveT: 0, runTime: 0, starlight: 0, kills: 0, levels: { root: 1 }, barHp: -1, bulwarkUsed: false, fallen: false,
    spawnT: 0, stormT: 0, shotT: [0, 0, 0], knifeT: 0, hawkT: 0, treantT: 0, ballT: 0 };
}
export function freshMeta(): MetaState { return { heartwood: 0, lifetimeKills: 0, bestWave: 1, prestiges: 0 }; }

const makeOrc = (): Orc => ({ live: false, kind: 'grunt', x: 0, y: 0, hp: 0, maxhp: 0, spd: 0, r: 0, loot: 0, atk: 0, dead: false, burn: 0, hitT: 0, wob: 0, swingT: 0 });
const makeShot = (): Projectile => ({ live: false, kind: 'arrow', x: 0, y: 0, vx: 0, vy: 0, dmg: 0, pierce: 0, life: 0, target: null, hit: new Set() });
const makeVan = (): Vanguard => ({ live: false, type: 'spear', x: 0, y: 0, tx: 0, hp: 0, maxhp: 0, swingT: 0, hitT: 0 });

export function createState(seed = 1, run: RunState = freshRun(), meta: MetaState = freshMeta()): SimState {
  const s: SimState = {
    tick: 0, t: 0, rng: createRng(seed), run, meta, stats: deriveStats(run.levels, meta.heartwood),
    orcs: new Pool<Orc>(ORC_CAP, makeOrc), shots: new Pool<Projectile>(600, makeShot), vans: new Pool<Vanguard>(8, makeVan),
    wolf: { x: 260, y: FIELD.h / 2, tx: 260, ty: FIELD.h / 2, biteT: 0 },
    hawk: { x: 300, y: 100, a: 0 },
  };
  if (s.run.barHp < 0) s.run.barHp = s.stats.barMax;
  return s;
}

/** Re-derive stats after a purchase or prestige. Growing the wall heals the new timber. */
export function recompute(s: SimState): void {
  const before = s.stats.barMax;
  s.stats = deriveStats(s.run.levels, s.meta.heartwood);
  if (s.stats.barMax > before) s.run.barHp += s.stats.barMax - before;
  s.run.barHp = Math.min(s.run.barHp, s.stats.barMax);
}
