/** Worn gear → Stats (TB-094): affixes and set bonuses, summed per stat, then applied once. Pure. */
import { LootMeta } from '../data/loot';
import { AFFIXES, SETS, StatLine } from '../data/lootTables';
import { equippedItems } from './loot';
import { Stats } from './stats';

export interface GearTotals { mul: Record<string, number>; add: Record<string, number> }

export function gearTotals(l: LootMeta): GearTotals {
  const t: GearTotals = { mul: {}, add: {} };
  const put = (x: StatLine) => { const m = x.op === 'mul' ? t.mul : t.add; m[x.stat] = (m[x.stat] ?? 0) + x.value; };
  const worn = equippedItems(l), sets: Record<string, number> = {};
  for (const it of worn) {
    for (const a of it.affixes) { const d = AFFIXES.find((x) => x.id === a.id); if (d) put({ stat: d.stat, op: d.op, value: a.value }); }
    if (it.set) sets[it.set] = (sets[it.set] ?? 0) + 1;
  }
  for (const s of SETS) for (const n of [2, 4, 6] as const) if ((sets[s.id] ?? 0) >= n) s.bonus[n].forEach(put);
  return t;
}

/** Stats fields gear may scale; other affix stats (hawkDmg, fireDmg…) are read by their systems in later rows. */
const MUL_FIELDS = ['dmg', 'fireRate', 'radius', 'starMult', 'kin', 'wolf', 'ballista', 'barMax', 'barRegen', 'spikes', 'vanHp', 'vanDmg', 'vanMend'] as const;
/** Integer stats take whole points only; crit is a chance. */
const ADD_FIELDS = { crit: false, pierce: true, arrows: true } as const;

export function applyGear(st: Stats, l: LootMeta): Stats {
  const t = gearTotals(l);
  for (const f of MUL_FIELDS) if (t.mul[f]) st[f] *= 1 + t.mul[f];
  if (t.mul.fireRate) st.lobCd /= 1 + t.mul.fireRate;
  for (const [f, whole] of Object.entries(ADD_FIELDS) as [keyof typeof ADD_FIELDS, boolean][]) if (t.add[f]) st[f] += whole ? Math.floor(t.add[f]) : t.add[f];
  if (st.knives && t.mul.knifeDmg) st.knives.dmg *= 1 + t.mul.knifeDmg;
  return st;
}

export const lootMods = (l: LootMeta) => { const t = gearTotals(l); return { itemFind: t.add.itemFind ?? 0, luck: t.add.luck ?? 0 }; };
