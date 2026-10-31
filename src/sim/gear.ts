/** Worn gear → Stats (TB-094/098): affixes and set bonuses, summed per stat, then applied once. Pure. */
import { LootMeta } from '../data/loot';
import { AFFIXES, MYTHICS, MYTHIC_FX, SETS, StatLine } from '../data/lootTables';
import { equippedItems } from './loot';
import { Stats } from './stats';

export interface GearTotals { mul: Record<string, number>; add: Record<string, number> }

/** setBoost: Set Resonance (TB-101) counts every worn set one piece higher. */
export function gearTotals(l: LootMeta, setBoost = 0): GearTotals {
  const t: GearTotals = { mul: {}, add: {} };
  const put = (x: StatLine) => { const m = x.op === 'mul' ? t.mul : t.add; m[x.stat] = (m[x.stat] ?? 0) + x.value; };
  for (const it of equippedItems(l)) {
    for (const a of it.affixes) { const d = AFFIXES.find((x) => x.id === a.id); if (d) put({ stat: d.stat, op: d.op, value: a.value }); }
    if (it.mythic) MYTHICS.find((m) => m.id === it.mythic)?.lines.forEach(put);
  }
  const sets = setCounts(l);
  for (const s of SETS) for (const n of [2, 4, 6] as const) if (sets[s.id] && sets[s.id]! + setBoost >= n) s.bonus[n].forEach(put);
  return t;
}

/** Stats fields gear may scale; other affix stats (hawkDmg, fireDmg…) are read by their systems in later rows. */
const MUL_FIELDS = ['dmg', 'fireRate', 'radius', 'starMult', 'kin', 'wolf', 'ballista', 'barMax', 'barRegen', 'spikes', 'vanHp', 'vanDmg', 'vanMend', 'burn', 'chainJump', 'petDmg'] as const;
/** Integer stats take whole points only; crit is a chance. */
const ADD_FIELDS = {
  crit: false, pierce: true, arrows: true, barRegen: false, chain: true, rebound: true, bleedAmp: false, knifeFan: true, burnSpread: true, cinder: true,
  boltShove: true, boltPin: true, moonCrit: true, moonwell: true, petHaste: false, extraWolves: true, treantRoot: true, freeRally: true,
  knifeReturn: true, burnRamp: true, stormStore: true, stakes: true, fullMoon: true, petReturn: true, wallSplinter: true, starfall: true,
} as const;

export function applyGear(st: Stats, l: LootMeta): Stats {
  const t = gearTotals(l, st.setBoost);
  for (const f of MUL_FIELDS) if (t.mul[f]) st[f] *= 1 + t.mul[f];
  if (t.mul.fireRate) st.lobCd /= 1 + t.mul.fireRate;
  for (const [f, whole] of Object.entries(ADD_FIELDS) as [keyof typeof ADD_FIELDS, boolean][]) if (t.add[f]) st[f] += whole ? Math.floor(t.add[f]) : t.add[f];
  if (st.knives && t.mul.knifeDmg) st.knives.dmg *= 1 + t.mul.knifeDmg;
  // rate bonuses shorten a cooldown; Moonveil's only while the Moonbow is owned
  if (st.knives && t.mul.knifeRate) st.knives.rate *= 1 + t.mul.knifeRate;
  if (t.mul.stormRate) st.stormCd /= 1 + t.mul.stormRate;
  if (t.mul.ballRate) st.ballCd /= 1 + t.mul.ballRate;
  if (st.homing && t.mul.moonRate) st.lobCd /= 1 + t.mul.moonRate;
  // Pale Moon: with the Moonbow owned, the draw is near-instant (each shot costs wall, in step)
  if (st.homing && st.fullMoon) st.lobCd *= MYTHIC_FX.moonDraw / st.echo;
  return st;
}

/** Pieces worn per set, for the satchel's set panel. */
export function setCounts(l: LootMeta): Record<string, number> {
  const n: Record<string, number> = {};
  for (const it of equippedItems(l)) if (it.set) n[it.set] = (n[it.set] ?? 0) + 1;
  return n;
}

/** Gear Item Find and Luck plus the Heartwood and Spoils parts already in Stats (TB-101). */
export const lootMods = (l: LootMeta, st: Stats) => { const t = gearTotals(l, st.setBoost); return { itemFind: (t.add.itemFind ?? 0) + st.itemFind, luck: (t.add.luck ?? 0) + st.luck }; };
