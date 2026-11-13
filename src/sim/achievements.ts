/** Achievements (TB-249): event-driven checks over the events a frame drained. Pure: no DOM, no clock.
 *  Each rule reads the event that triggers it and the state it needs; docs/ACHIEVEMENTS.md says which event each listens to. */
import { ACH, ACHIEVEMENTS, ACH_N } from '../data/achievements';
import { NODES, Branch } from '../data/skillTree';
import { HW_NODES, HW_FX } from '../data/heartwood';
import { BUILDINGS, BuildingId } from '../data/camp';
import { ORC_KINDS } from '../data/orcs';
import { BOSS_ROSTER, BOSS_WAVE, TIERS, bossFor } from '../data/bosses';
import { MYTHICS, SETS } from '../data/lootTables';
import { ORC_CAP } from '../data/balance';
import { SimEvent } from './events';
import { SimState } from './state';
import { setCounts } from './gear';
import { hwRank } from './heartwood';

/** Run-scoped tallies (saved in run.ach, v17); a replant starts them over with the run. */
export interface AchRun {
  /** Wave the run began at (a checkpoint start is past 1); a "reach wave N" challenge needs a start below N. */
  from: number;
  /** The wall took a hit this run; during the running boss wave; Deep Roots regrew it this run. */
  hit: boolean; bossHit: boolean; rooted: boolean;
  /** Boss waves cleared this run; thorn kills this run; champions slain in the running boss wave. */
  bosses: number; thorns: number; champKills: number;
  /** This wave: kills, shatters, legendary-or-better drops; whether an arrow was loosed; whether the wave was seen from its start. */
  waveKills: number; waveShatter: number; waveLegends: number; waveLoosed: boolean; waveWhole: boolean;
  /** The wall fell under 1% since the last wave; the field held ORC_CAP orcs since the last wave. */
  plank: boolean; crowd: boolean;
}
export const freshAchRun = (from = 1): AchRun => ({ from, hit: false, bossHit: false, rooted: false, bosses: 0, thorns: 0, champKills: 0,
  waveKills: 0, waveShatter: 0, waveLegends: 0, waveLoosed: false, waveWhole: false, plank: false, crowd: false });

export type AchCount = 'boss' | 'wolf' | 'unhorsed' | 'salvage' | 'reroll' | 'heirloom';
/** Kept for good (meta.ach, v17). */
export interface AchMeta {
  earned: string[];
  /** The worn title (an earned achievement's id whose reward is a title), shown on the HUD tag; null = none. */
  title: string | null;
  /** Lifetime tallies. */
  n: Partial<Record<AchCount, number>>;
  /** Orc kinds slain, mythic ids found, roster bosses whose boss wave was cleared. */
  kinds: string[]; mythics: string[]; bosses: string[];
  /** Prestige count when the last tier unlocked (Climber). */
  tierAt: number;
}
export const freshAchMeta = (): AchMeta => ({ earned: [], title: null, n: {}, kinds: [], mythics: [], bosses: [], tierAt: 0 });

/** Kills by one strike, waiting for the strike's closing event (`impact`, `storm`, `treantStamp`). Not saved. */
export interface AchPending { lob: number; storm: number; treant: number }
export const freshAchPending = (): AchPending => ({ lob: 0, storm: 0, treant: 0 });

const BRANCH_ACH: Readonly<Record<Branch, string>> = { Bow: 'branch_bow', Companions: 'branch_companions', Armoury: 'branch_armoury',
  Grove: 'branch_grove', Barricade: 'branch_barricade', Vanguard: 'branch_vanguard', Spoils: 'branch_spoils' };
const CAMP_ACH: Readonly<Record<BuildingId, string>> = { bowyer: 'camp_bowyer', forge: 'camp_forge', kitchen: 'camp_kitchen', training: 'camp_training' };
const SUMMONS = ['runners', 'brutes', 'elites', 'berserkers', 'wolfriders', 'shamans', 'drummers'] as const;
const TREE = NODES.filter((n) => !n.path);
const setAch = (setId: string): string => `set_${setId.replace(/-/g, '_')}`;
const SET_ACH = SETS.map((x) => setAch(x.id));
const LEGEND = new Set(['legendary', 'mythic']);
const SET_SIZE = 6;

/** Award id once; returns whether it was new. */
function earn(s: SimState, id: string, out: string[]): void {
  const a = s.meta.ach;
  if (!ACH[id] || a.earned.includes(id)) return;
  a.earned.push(id); out.push(id);
}
const bump = (s: SimState, k: AchCount, by = 1): number => (s.meta.ach.n[k] = (s.meta.ach.n[k] ?? 0) + by);
const owns = (s: SimState, id: string): boolean => (s.run.levels[id as keyof typeof s.run.levels] ?? 0) > 0;
const thresholds = (s: SimState, table: Readonly<Record<string, number>>, v: number, out: string[]): void => {
  for (const [id, n] of Object.entries(table)) if (v >= n) earn(s, id, out);
};

/** State-only rules: safe to run any time (load, a purchase, a replant). An old save earns what it already holds. */
export function sweepAchievements(s: SimState, out: string[] = []): string[] {
  const m = s.meta, lv = s.run.levels;
  if (m.lifetimeKills > 0) earn(s, 'first_blood', out);
  thresholds(s, ACH_N.slain, m.lifetimeKills, out);
  thresholds(s, ACH_N.wave, Math.max(m.bestWave, s.run.wave), out);
  thresholds(s, ACH_N.replant, m.prestiges, out);
  thresholds(s, ACH_N.tier, m.tier, out);
  thresholds(s, ACH_N.boss, m.ach.n.boss ?? 0, out);
  if (Object.entries(lv).some(([id, r]) => id !== 'root' && (r ?? 0) > 0)) earn(s, 'first_node', out);
  for (const b of Object.keys(BRANCH_ACH) as Branch[]) if (TREE.filter((n) => n.branch === b).every((n) => (lv[n.id] ?? 0) >= n.max)) earn(s, BRANCH_ACH[b], out);
  if (TREE.every((n) => (lv[n.id] ?? 0) >= n.max)) earn(s, 'tree_full', out);
  if (HW_NODES.every((n) => hwRank(m, n.id) >= n.costs.length)) earn(s, 'heartwood_full', out);
  const camp = m.camp.levels;
  if (BUILDINGS.some((b) => (camp[b.id] ?? 0) > 0)) earn(s, 'camp_first', out);
  for (const b of BUILDINGS) if ((camp[b.id] ?? 0) >= b.costs.length) earn(s, CAMP_ACH[b.id], out);
  if (BUILDINGS.every((b) => (camp[b.id] ?? 0) >= b.costs.length)) earn(s, 'camp_full', out);
  for (const [set, n] of Object.entries(setCounts(m.loot))) if (n >= SET_SIZE) earn(s, setAch(set), out);
  for (const it of m.loot.items) if (it.mythic && !m.ach.mythics.includes(it.mythic)) m.ach.mythics.push(it.mythic);
  if (m.ach.mythics.length) earn(s, 'mythic_first', out);
  if (MYTHICS.every((x) => m.ach.mythics.includes(x.id))) earn(s, 'mythic_all', out);
  if (m.loot.items.some((it) => LEGEND.has(it.rarity))) earn(s, 'legendary_first', out);
  if (ORC_KINDS.every((k) => m.ach.kinds.includes(k))) earn(s, 'bestiary', out);
  if (BOSS_ROSTER.every((b) => m.ach.bosses.includes(b.id))) earn(s, 'boss_roster', out);
  if ((m.ach.n.wolf ?? 0) >= ACH_N.wolfKills) earn(s, 'wolf_1k', out);
  if ((m.ach.n.unhorsed ?? 0) >= ACH_N.unhorsed) earn(s, 'unhorsed_100', out);
  if ((m.ach.n.salvage ?? 0) >= ACH_N.salvages) earn(s, 'salvage_1k', out);
  if ((m.ach.n.reroll ?? 0) >= ACH_N.rerolls) earn(s, 'reroll_100', out);
  if ((m.ach.n.heirloom ?? 0) >= ACH_N.heirloomLevels) earn(s, 'heirloom_50', out);
  // the two that need every other: sets, then everything
  if (SET_ACH.every((id) => m.ach.earned.includes(id))) earn(s, 'set_all', out);
  if (ACHIEVEMENTS.every((a) => a.id === 'secret_all' || m.ach.earned.includes(a.id))) earn(s, 'secret_all', out);
  return out;
}

/** Wave-reached challenges: the run must have started below the wave, and own (or not own) what the rule says. */
function waveChallenges(s: SimState, wave: number, out: string[]): void {
  const r = s.run.ach, W = ACH_N.challengeWave, from = (w: number): boolean => wave >= w && r.from < w;
  const ranks = Object.entries(s.run.levels).reduce((t, [id, n]) => t + (id === 'root' ? 0 : n ?? 0), 0);
  const ownsBranch = (b: Branch): boolean => NODES.some((n) => n.branch === b && n.id !== 'root' && owns(s, n.id));
  if (from(W.no_vanguard) && !owns(s, 'muster')) earn(s, 'no_vanguard', out);
  if (from(W.bow_only) && !ownsBranch('Companions') && !ownsBranch('Armoury')) earn(s, 'bow_only', out);
  if (from(W.lean_tree) && ranks <= ACH_N.leanRanks) earn(s, 'lean_tree', out);
  if (from(W.bare_wall) && !ownsBranch('Barricade')) earn(s, 'bare_wall', out);
  if (from(W.untouched_10) && !r.hit) earn(s, 'untouched_10', out);
  if (wave >= W.all_summoned && SUMMONS.every((id) => owns(s, id))) earn(s, 'all_summoned', out);
  if (from(W.first_run_25) && s.meta.prestiges === 0) earn(s, 'first_run_25', out);
  if (s.run.runTime >= ACH_N.holdSecs) earn(s, 'hold_60m', out);
}

/** Check a frame's drained events. Returns the ids newly earned, in order. */
export function trackAchievements(s: SimState, events: readonly SimEvent[], pend: AchPending): string[] {
  const out: string[] = [], m = s.meta, a = m.ach;
  let sweep = false;
  for (const e of events) {
    const r = s.run.ach;
    switch (e.t) {
      case 'kill': {
        if (!a.kinds.includes(e.kind)) { a.kinds.push(e.kind); sweep = true; }
        r.waveKills++;
        if (r.waveKills >= ACH_N.floodKills) earn(s, 'flood_200', out);
        if (e.champ && s.run.boss) r.champKills++;
        if (e.by === 'lob') pend.lob++;
        else if (e.by === 'storm') pend.storm++;
        else if (e.by === 'treant') pend.treant++;
        else if (e.by === 'wolf') { if (bump(s, 'wolf') >= ACH_N.wolfKills) earn(s, 'wolf_1k', out); }
        else if (e.by === 'thorns') {
          if (++r.thorns >= ACH_N.thornsRun) earn(s, 'thorns_50', out);
          if (e.kind === 'boss') earn(s, 'secret_thorn_boss', out);
        }
        if (e.kind === 'wolfrider' && bump(s, 'unhorsed') >= ACH_N.unhorsed) earn(s, 'unhorsed_100', out);
        if (e.kind === 'drummer' && e.beats <= ACH_N.drummerBeats) earn(s, 'drummer_quick', out);
        if (m.lifetimeKills > 0) earn(s, 'first_blood', out);
        thresholds(s, ACH_N.slain, m.lifetimeKills, out);
        break;
      }
      case 'impact': if (pend.lob >= ACH_N.oneLob) earn(s, 'one_lob_10', out); pend.lob = 0; break;
      case 'storm': if (pend.storm >= ACH_N.storm) earn(s, 'storm_5', out); pend.storm = 0; break;
      case 'treantStamp': if (pend.treant >= ACH_N.treant) earn(s, 'treant_10', out); pend.treant = 0; break;
      case 'shatter': if (++r.waveShatter >= ACH_N.shatterWave) earn(s, 'shatter_20', out); break;
      case 'loose': r.waveLoosed = true; break;
      case 'loot':
        if (LEGEND.has(e.rarity)) { earn(s, 'legendary_first', out); if (++r.waveLegends >= ACH_N.legendsWave) earn(s, 'double_legend', out); }
        if (e.rarity === 'mythic') sweep = true;
        if (!e.kept) bump(s, 'salvage');
        if (e.kept && m.loot.items.length >= s.stats.satchelCap) earn(s, 'secret_full_satchel', out);
        sweep ||= !e.kept;
        break;
      case 'barricadeHit':
        r.hit = true; if (s.run.boss) r.bossHit = true;
        if (e.frac < ACH_N.secretPlankFrac && e.frac > 0) r.plank = true;
        break;
      case 'barricadeRegrow': r.rooted = true; break;
      case 'wave': {
        const prev = e.wave - 1;
        if (r.plank && !s.run.fallen) earn(s, 'secret_last_plank', out);
        if (r.crowd && !s.run.fallen) earn(s, 'full_tide', out);
        if (r.waveWhole && !r.waveLoosed && prev >= ACH_N.handsOffFrom && r.waveKills > 0) earn(s, 'secret_hands_off', out);
        thresholds(s, ACH_N.wave, e.wave, out);
        waveChallenges(s, e.wave, out);
        r.waveKills = 0; r.waveShatter = 0; r.waveLegends = 0; r.waveLoosed = false; r.waveWhole = true; r.plank = false; r.crowd = false;
        break;
      }
      case 'bossReady':
        if (Math.floor(s.run.wave / BOSS_WAVE.every) - s.run.bossDone >= ACH_N.bossesWaiting) earn(s, 'secret_hoarder', out);
        break;
      case 'bossStart': r.bossHit = false; r.champKills = 0; break;
      case 'bossEnd': {
        if (!e.cleared) { if (r.champKills === 0) earn(s, 'secret_let_march', out); break; }
        r.bosses++; bump(s, 'boss'); sweep = true;
        const boss = bossFor(s.run.bossDone * BOSS_WAVE.every).id;
        if (!a.bosses.includes(boss)) a.bosses.push(boss);
        if (!r.bossHit) earn(s, 'boss_unscathed', out);
        if (BOSS_WAVE.secs - e.secs >= ACH_N.swiftSecsLeft) earn(s, 'boss_swift', out);
        if (Object.keys(m.loot.equipped).length === 0) earn(s, 'boss_naked', out);
        if (s.run.tier >= TIERS.max) earn(s, 'boss_tier6', out);
        if (s.run.barHp < s.stats.barMax * ACH_N.lastPlankFrac) earn(s, 'boss_last_plank', out);
        if (r.bosses >= ACH_N.bossStreak) earn(s, 'boss_streak', out);
        if (r.rooted) earn(s, 'boss_after_roots', out);
        if (s.run.path) earn(s, `path_${s.run.path}`, out);
        break;
      }
      case 'tierUnlocked':
        if (m.prestiges - a.tierAt <= ACH_N.tierUpWithin) earn(s, 'tier_up_fast', out);
        a.tierAt = m.prestiges; sweep = true;
        break;
      case 'barricadeFell':
        if (!e.chosen) earn(s, 'first_fall', out);
        else if (e.wave === ACH_N.voluntaryWave) earn(s, 'secret_twelve', out);
        if (e.runTime >= ACH_N.holdSecs) earn(s, 'hold_60m', out);
        break;
      case 'replant':
        if (hwRank(m, 'hw_heirloom') && m.loot.heirloom && Object.values(m.loot.equipped).includes(m.loot.heirloom)) bump(s, 'heirloom', HW_FX.heirloomIlvl);
        s.run.ach = freshAchRun(s.run.wave); sweep = true;
        break;
      case 'salvage': bump(s, 'salvage'); sweep = true; break;
      case 'reroll': bump(s, 'reroll'); sweep = true; break;
      case 'bought': case 'hwBought': case 'buildingUpgraded': case 'equip': sweep = true; break;
      default: break;
    }
  }
  if (s.orcs.count >= ORC_CAP && !s.run.fallen) s.run.ach.crowd = true;
  if (sweep) sweepAchievements(s, out);
  return out;
}

/** Wear an earned title (or none). Returns whether it changed. */
export function setTitle(s: SimState, id: string | null): boolean {
  if (id !== null && (!s.meta.ach.earned.includes(id) || !ACH[id]?.title)) return false;
  s.meta.ach.title = id; return true;
}
