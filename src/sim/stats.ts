import { NodeId } from '../data/skillTree';
import { BARRICADE, PLAYER, PROVOKE, SOURCES, VANGUARD, heartMult } from '../data/balance';

export type Levels = Partial<Record<NodeId, number>>;

/** Everything systems read. Derived from levels + heartwood; never read node ids elsewhere. */
export interface Stats {
  dmg: number; fireRate: number; arrows: number; pierce: number; crit: number;
  homing: boolean; fire: boolean;
  starMult: number; orcHp: number; orcAtk: number; spawnMult: number; bounty: number;
  kin: number; wolf: number; archers: number; hawk: boolean; treant: boolean;
  knives: { rate: number; dmg: number } | null;
  storm: boolean; ballista: number;
  // barricade
  barMax: number; barRegen: number; spikes: number; bulwark: boolean;
  // vanguard
  muster: boolean; vanCap: number; vanHp: number; vanDmg: number; vanMend: number; champion: boolean;
}

export function deriveStats(lv: Levels, heartwood: number): Stats {
  const L = (id: NodeId): number => lv[id] ?? 0;
  const hm = heartMult(heartwood);
  const kin = Math.pow(1.2, L('bond')) * hm;
  const muster = L('muster') > 0;
  return {
    dmg: PLAYER.baseDmg * Math.pow(1.25, L('sharp')) * (L('moon') ? 1.6 : 1) * hm,
    fireRate: PLAYER.baseFireRate * Math.pow(1.15, L('draw')),
    arrows: 1 + L('multi'),
    pierce: L('pierce'),
    crit: 0.08 * L('crit'),
    homing: L('moon') > 0,
    fire: L('fire') > 0,
    starMult: Math.pow(1.15, L('glean')) * Math.pow(PROVOKE.drumsLoot, L('drums')) * Math.pow(PROVOKE.bannersLoot, L('banners')) * hm,
    orcHp: Math.pow(PROVOKE.drumsHp, L('drums')),
    orcAtk: Math.pow(PROVOKE.bannersAtk, L('banners')),
    spawnMult: Math.pow(1.2, L('horde')),
    bounty: 1 + L('bounty'),
    kin,
    wolf: L('wolf') ? SOURCES.wolf.base * Math.pow(1.4, L('fangs')) * kin : 0,
    archers: L('ranger') + L('warden'),
    hawk: L('hawk') > 0,
    treant: L('treant') > 0,
    knives: L('knives') ? { rate: Math.pow(1.2, L('knifespd')) / SOURCES.knives.cd, dmg: SOURCES.knives.base * Math.pow(1.35, L('knifespd')) * kin } : null,
    storm: L('storm') > 0,
    ballista: L('ballista') ? SOURCES.ballista.base * Math.pow(1.5, L('bolt')) * kin : 0,
    barMax: BARRICADE.baseHp * Math.pow(BARRICADE.timberMult, L('timber')) * hm,
    barRegen: BARRICADE.regenPerRank * L('repair'),
    spikes: BARRICADE.spikesPerRank * L('spikes'),
    bulwark: L('bulwark') > 0,
    muster,
    vanCap: muster ? VANGUARD.baseCap + L('ranks') : 0,
    vanHp: Math.pow(VANGUARD.hpPerShield, L('shield')) * hm,
    vanDmg: Math.pow(VANGUARD.dmgPerDrill, L('drill')) * kin,
    vanMend: VANGUARD.mendPerRank * L('mend'),
    champion: L('champion') > 0,
  };
}
