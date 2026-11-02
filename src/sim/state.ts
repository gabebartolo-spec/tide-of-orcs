import { OrcKind } from '../data/orcs';
import { HwLevels } from '../data/heartwood';
import { Item, LootMeta, Rarity, freshLoot } from '../data/loot';
import { SET_FX } from '../data/lootTables';
import { FIELD, ORC_CAP, VanType } from '../data/balance';
import { Levels, Stats, deriveStats } from './stats';
import { Pool } from './pool';
import { Rng, createRng } from './rng';
import { applyGear } from './gear';
import { EquipPolicy } from './loot';

export interface Orc {
  live: boolean; kind: OrcKind; x: number; y: number; hp: number; maxhp: number; spd: number; r: number; loot: number; atk: number;
  dead: boolean; burn: number; hitT: number; wob: number; swingT: number;
  /** Set-bonus timers in seconds (TB-099): bleeding takes more damage, slowed walks slower, pinned/rooted stand still. */
  bleed: number; slow: number; pin: number; root: number;
  /** Heart of the Kiln (TB-100): seconds this orc has burned, for the ramp. The Last Knife (TB-128): seconds left marked. */
  /** Seconds left chilled (Frost Arrows) and stunned (Thunderclap). */
  chill: number; stun: number;
  /** Marched in a boss wave: the challenge is cleared when none are left. */
  champ: boolean;
  /** TB-087: a wolf rider has leapt its one vanguard; a shaman's seconds to its next fireball (a drummer's to its next beat); within a war drummer's beat this step. */
  leapt: boolean; castT: number; drum: boolean;
}
export type ProjectileKind = 'arrow' | 'knife' | 'bolt' | 'lob' | 'bounce' | 'star' | 'fireball';
export interface Projectile {
  live: boolean; kind: ProjectileKind; x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; life: number;
  /** Enchantments this shot rolled (combat FX bits), and its crit chance and crit multiplier (TB-111). */
  fx: number; crit: number; critX: number;
  target: Orc | null; hit: Set<Orc>;
  /** The Last Knife (TB-100): this knife is flying back to the quiver, hitting everything. */
  back: boolean;
  /** Lob only: launch and landing points, time aloft, height above ground, strike radius. */
  sx: number; sy: number; tx: number; ty: number; t: number; h: number; r: number;
}
/** A patch of ground left by a set bonus (TB-099): Cinderground burns and slows, a Moonwell slows and mends the wall. */
export interface Zone { live: boolean; kind: 'cinder' | 'moonwell'; x: number; y: number; r: number; life: number; used: boolean }
export interface Wolf { x: number; y: number; tx: number; ty: number; biteT: number }
export interface Vanguard {
  /** A line slot that respawns (TB-167); Standing Orders extras do not. */
  line: boolean;
  live: boolean; type: VanType; x: number; y: number;
  /** Home stand at the wall (its lane); it returns here when the field is clear (TB-156). */
  tx: number; ty: number;
  /** Moved this step, and which way it faces (1 right, -1 left). */
  mv: boolean; face: number;
  hp: number; maxhp: number; swingT: number; hitT: number;
}

export interface RunState {
  wave: number; waveT: number; runTime: number; starlight: number; kills: number; levels: Levels;
  /** Starlight earned this run (never spent down); feeds the run summary's starlight per minute. */
  earned: number;
  barHp: number; bulwarkUsed: boolean; fallen: boolean;
  /** Once-per-run gear state, saved so a reload cannot reset it (v8, TB-110): Thunder's Memory's stored charges, whether Heartwood Splinter stood the wall again, whether Rootwarden's free rally was spent. */
  thunder: number; splinterUsed: boolean; freeRallyUsed: boolean;
  /** Boss waves summoned this run, and the one running now (t: seconds in, next: script index, left: its orcs not yet slain). */
  bossDone: number; boss: { t: number; next: number; left: number } | null;
  foeT: Partial<Record<OrcKind, number>>; stormT: number; shotT: number[]; knifeT: number; hawkT: number; treantT: number; ballT: number;
  /** Unused since TB-111 (Starfall rolls per shot); older saves may still carry it. */
  lobN?: number;
  /** Items dropped this run by rarity, and a copy of the best one, for the Replant summary (TB-103). Optional: older saves lack them. */
  found?: Partial<Record<Rarity, number>>; best?: Item;
  /** Boss tier this run plays at (TB-148), picked at March; 1 is the base tide. */
  tier: number;
}
/** heartwood: all Heartwood ever earned (spent on the Heartwood tree; no passive bonus since P-142); hwLevels: ranks bought;
 *  tier: the highest boss tier unlocked (TB-148). */
export interface MetaState { heartwood: number; lifetimeKills: number; bestWave: number; prestiges: number; hwLevels: HwLevels; loot: LootMeta; tier: number;
  /** Wave the next run starts at: one past the last checkpoint wave cleared (TB-159). 1 = none yet. */
  checkpoint: number }

export interface SimState {
  tick: number; t: number;
  rng: Rng;
  /** Loot rolls use their own stream so drops never shift combat randomness. */
  lootRng: Rng;
  /** How pick-ups are equipped: the player by hand, or a balance-runner policy. Not saved. */
  lootPolicy: EquipPolicy;
  run: RunState; meta: MetaState; stats: Stats;
  orcs: Pool<Orc>; shots: Pool<Projectile>; vans: Pool<Vanguard>;
  wolf: Wolf;
  /** Packlord's extra wolves, grown to stats.extraWolves on demand. */
  pack: Wolf[];
  hawk: { x: number; y: number; a: number };
  zones: Pool<Zone>;
  /** Run-only set state, not saved (TB-099): knives thrown toward the next Fan, Rootwarden's free-rally window. */
  knifeN: number;
  /** Seconds left on each fallen line vanguard's return (TB-167). */
  vanRespawn: number[];
  /** Run-only mythic state, not saved (TB-100): starlight toward the next Starfall and its cooldown. */
}

export function freshRun(): RunState {
  return { wave: 1, waveT: 0, runTime: 0, starlight: 0, earned: 0, kills: 0, levels: { root: 1 }, barHp: -1, bulwarkUsed: false, fallen: false, bossDone: 0, boss: null, thunder: 0, splinterUsed: false, freeRallyUsed: false,
    foeT: {}, stormT: 0, shotT: [0, 0, 0], knifeT: 0, hawkT: 0, treantT: 0, ballT: 0, tier: 1 };
}
export function freshMeta(): MetaState { return { heartwood: 0, lifetimeKills: 0, bestWave: 1, prestiges: 0, hwLevels: {}, loot: freshLoot(), tier: 1, checkpoint: 1 }; }

const makeOrc = (): Orc => ({ live: false, kind: 'grunt', x: 0, y: 0, hp: 0, maxhp: 0, spd: 0, r: 0, loot: 0, atk: 0, dead: false, burn: 0, hitT: 0, wob: 0, swingT: 0, champ: false, bleed: 0, slow: 0, pin: 0, root: 0, chill: 0, stun: 0, leapt: false, castT: 0, drum: false });
const makeShot = (): Projectile => ({ live: false, kind: 'arrow', x: 0, y: 0, vx: 0, vy: 0, dmg: 0, pierce: 0, life: 0, fx: 0, crit: 0, critX: 1, target: null, hit: new Set(), sx: 0, sy: 0, tx: 0, ty: 0, t: 0, h: 0, r: 0, back: false });
const makeZone = (): Zone => ({ live: false, kind: 'cinder', x: 0, y: 0, r: 0, life: 0, used: false });
const makeVan = (): Vanguard => ({ live: false, type: 'spear', line: false, x: 0, y: 0, tx: 0, ty: 0, mv: false, face: 1, hp: 0, maxhp: 0, swingT: 0, hitT: 0 });

export function createState(seed = 1, run: RunState = freshRun(), meta: MetaState = freshMeta()): SimState {
  const s: SimState = {
    tick: 0, t: 0, rng: createRng(seed), lootRng: createRng(seed * 31 + 7), lootPolicy: 'player', run, meta, stats: applyGear(deriveStats(run.levels, meta.hwLevels), meta.loot),
    orcs: new Pool<Orc>(ORC_CAP, makeOrc), shots: new Pool<Projectile>(600, makeShot), vans: new Pool<Vanguard>(8, makeVan),
    wolf: { x: 260, y: FIELD.h / 2, tx: 260, ty: FIELD.h / 2, biteT: 0 },
    pack: [],
    hawk: { x: 300, y: 100, a: 0 },
    zones: new Pool<Zone>(SET_FX.zoneCap, makeZone),
    knifeN: 0, vanRespawn: [],
  };
  if (s.run.barHp < 0) s.run.barHp = s.stats.barMax;
  return s;
}

/** Re-derive stats after a purchase or prestige. Growing the wall heals the new timber. */
export function recompute(s: SimState): void {
  const before = s.stats.barMax;
  s.stats = applyGear(deriveStats(s.run.levels, s.meta.hwLevels), s.meta.loot);
  if (s.stats.barMax > before) s.run.barHp += s.stats.barMax - before;
  s.run.barHp = Math.min(s.run.barHp, s.stats.barMax);
}
