/** Worn gear â†’ Stats (TB-094/098): affixes and set bonuses, summed per stat, then applied once. Pure. */
import { LootMeta } from '../data/loot';
import { AFFIXES, MYTHICS, MYTHIC_FX, SETS, StatLine } from '../data/lootTables';
import { equippedItems } from './loot';
import { PATH_FX } from '../data/paths';
import { Stats, companions } from './stats';

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

/** Stats fields gear may scale. */
const MUL_FIELDS = ['dmg', 'stormDmg', 'bossDmg', 'eliteDmg', 'fireRate', 'radius', 'starMult', 'kin', 'wolf', 'ballista', 'barMax', 'barRegen', 'spikes', 'vanHp', 'vanDmg', 'vanMend', 'burn', 'chainJump', 'petDmg', 'vanRespawn'] as const;
/** Integer stats take whole points only; crit is a chance. */
const ADD_FIELDS = {
  crit: false, pierce: true, arrows: true, barRegen: false, chain: true, rebound: true, bleedAmp: false, knifeFan: true, burnSpread: true, cinder: true,
  boltShove: true, boltPin: true, moonCrit: true, moonwell: true, petHaste: false, extraWolves: true, treantRoot: true, freeRally: true,
  knifeReturn: true, burnRamp: true, stormStore: true, stakes: true, fullMoon: true, petReturn: true, wallSplinter: true, starCloak: true,
  // path sets and mythics (TB-193a)
  venom: false, venomBurst: true, fang: true, packBuff: false, foxfire: true, shardP: false, hoardEvery: true, talon: true,
} as const;

export function applyGear(st: Stats, l: LootMeta): Stats {
  const t = gearTotals(l, st.setBoost);
  for (const f of MUL_FIELDS) if (t.mul[f]) st[f] *= 1 + t.mul[f];
  if (t.mul.fireRate) st.lobCd /= 1 + t.mul.fireRate;
  for (const [f, whole] of Object.entries(ADD_FIELDS) as [keyof typeof ADD_FIELDS, boolean][]) if (t.add[f]) st[f] += whole ? Math.round(t.add[f]) : t.add[f];
  // affixes that scale an existing Stats line (TB-201)
  if (t.mul.hawkDmg) st.units.hawk = { ...st.units.hawk, dmg: st.units.hawk.dmg * (1 + t.mul.hawkDmg) };
  if (t.mul.treantDmg) st.units.treant = { ...st.units.treant, dmg: st.units.treant.dmg * (1 + t.mul.treantDmg) };
  // Kinship gear: deriveStats baked the tree's Kinship into these lines, so the affix scales them too (the live readers use st.kin)
  if (t.mul.kin) {
    const k = 1 + t.mul.kin;
    st.wolf *= k; st.ballista *= k; st.vanDmg *= k;
    if (st.knives) st.knives = { ...st.knives, dmg: st.knives.dmg * k };
  }
  if (t.mul.glimmerMult) st.salvageMult *= 1 + t.mul.glimmerMult;
  if (t.mul.critDmg) st.critMult *= 1 + t.mul.critDmg;
  if (t.mul.burnDur) st.burnSecs *= 1 + t.mul.burnDur;
  if (t.mul.fireDmg) st.burn *= 1 + t.mul.fireDmg;
  if (t.mul.homingDmg) st.moonMult *= 1 + t.mul.homingDmg;
  // Chain rolls 0.2â€“0.5 per item: summed, then rounded to whole jumps (one item at 0.5+ adds a target)
  if (t.add.stormChain) st.chain += Math.round(t.add.stormChain);
  if (st.knives && t.mul.knifeDmg) st.knives.dmg *= 1 + t.mul.knifeDmg;
  // rate bonuses shorten a cooldown; Moonveil's only while the Moonbow is owned
  if (st.knives && t.mul.knifeRate) st.knives.rate *= 1 + t.mul.knifeRate;
  if (t.mul.stormRate) st.stormCd /= 1 + t.mul.stormRate;
  if (t.mul.ballRate) st.ballCd /= 1 + t.mul.ballRate;
  if (st.homing && t.mul.moonRate) st.lobCd /= 1 + t.mul.moonRate;
  // Pale Moon: with the Moonbow owned, the draw is near-instant (each shot costs wall, in step)
  if (st.homing && st.fullMoon) st.lobCd *= MYTHIC_FX.moonDraw; // Echo never draws faster (TB-198)
  // Oakspine: a wider strike circle (its root is in combat.impact)
  if (st.stakes) st.radius *= MYTHIC_FX.oakRadius;
  // Foxfire Pack 6: the vanguard hits harder for every companion in the field; Foxfire Tail: the fox grows with them
  const pack = companions(st);
  if (st.packBuff) st.vanDmg *= 1 + st.packBuff * pack;
  if (st.foxfire) st.foxfire = st.dmg * PATH_FX.foxMult * (1 + PATH_FX.foxGrow * pack);
  return st;
}

/** Pieces worn per set, for the satchel's set panel. */
/** Set-bonus tiers earned across every worn set (2, 4 and 6 pieces each count one), Set Resonance included; the renderer rings the elf when it rises (TB-105). */
export function setTiers(l: LootMeta, boost = 0): number {
  let t = 0;
  for (const n of Object.values(setCounts(l))) for (const k of [2, 4, 6]) if (n + boost >= k) t++;
  return t;
}

export function setCounts(l: LootMeta): Record<string, number> {
  const n: Record<string, number> = {};
  for (const it of equippedItems(l)) if (it.set) n[it.set] = (n[it.set] ?? 0) + 1;
  return n;
}

/** Gear Item Find and Luck plus the Heartwood and Spoils parts already in Stats (TB-101). */
export const lootMods = (l: LootMeta, st: Stats) => { const t = gearTotals(l, st.setBoost); return { itemFind: (t.add.itemFind ?? 0) + st.itemFind, luck: (t.add.luck ?? 0) + st.luck }; };
