import { NodeId } from '../data/skillTree';
import { HW_FX, HwLevels } from '../data/heartwood';
import { FOE_FX, OrcKind } from '../data/orcs';
import { ARROWS, BARRICADE, LOB, NODE_FX, PLAYER, SOURCES, VANGUARD, heartMult } from '../data/balance';

export type Levels = Partial<Record<NodeId, number>>;

/** Everything systems read. Derived from levels + heartwood + Heartwood tree; never read node ids elsewhere. */
export interface Stats {
  dmg: number; fireRate: number; lobCd: number; radius: number; arrows: number; pierce: number; crit: number;
  homing: boolean; fire: boolean;
  /** Arrow enchantments (TB-089): Rebound hops (0 = none), shock, stun, frost slow fraction (0 = none), shatter damage × player dmg (0 = none), starfall. */
  bounce: number; shock: boolean; stun: boolean; slow: number; shatter: number; starfall: boolean;
  starMult: number;
  /** Per orc kind: summoned yet, and its Fury/Swarm multipliers. The Warboss never marches; he comes only with a boss wave. */
  foes: Record<OrcKind, Foe>;
  kin: number; wolf: number; archers: number; hawk: boolean; treant: boolean;
  knives: { rate: number; dmg: number } | null;
  storm: boolean; ballista: number;
  // barricade
  barMax: number; barRegen: number; spikes: number; bulwark: boolean;
  // vanguard
  muster: boolean; vanCap: number; vanHp: number; vanDmg: number; vanMend: number; champion: boolean;
}

export interface Foe { on: boolean; hp: number; loot: number; spawn: number }

/** Each kind's nodes: [summon (null = always marching), fury, swarm]. */
const FOE_NODES: Partial<Record<OrcKind, [NodeId | null, NodeId, NodeId]>> = {
  grunt: [null, 'drums', 'horde'],
  runner: ['runners', 'runfury', 'runswarm'],
  brute: ['brutes', 'brutefury', 'bruteswarm'],
  elite: ['elites', 'elitefury', 'eliteswarm'],
};

export function deriveStats(lv: Levels, heartwood: number, hw: HwLevels = {}): Stats {
  const L = (id: NodeId): number => lv[id] ?? 0;
  const hm = heartMult(heartwood);
  const kin = Math.pow(NODE_FX.kinship, L('bond')) * hm;
  const muster = L('muster') > 0;
  return {
    dmg: PLAYER.baseDmg * Math.pow(NODE_FX.sharpDmg, L('sharp')) * (L('moon') ? NODE_FX.moonDmg : 1) * hm,
    fireRate: PLAYER.baseFireRate * Math.pow(NODE_FX.drawRate, L('draw')),
    lobCd: LOB.cd / Math.pow(NODE_FX.drawRate, L('draw')),
    radius: LOB.radius * Math.pow(NODE_FX.wideRadius, L('wide')),
    arrows: 1 + L('multi'),
    pierce: L('pierce'),
    crit: NODE_FX.critPerRank * L('crit'),
    homing: L('moon') > 0,
    fire: L('fire') > 0,
    bounce: L('bounce') ? 1 + L('bounce') : 0,
    shock: L('shock') > 0,
    stun: L('stun') > 0,
    slow: L('frost') ? ARROWS.frost.slow0 + ARROWS.frost.slowPerRank * (L('frost') - 1) : 0,
    shatter: L('shatter') ? ARROWS.shatter.mult * Math.pow(ARROWS.shatter.perRank, L('shatter') - 1) : 0,
    starfall: L('starfall') > 0,
    starMult: Math.pow(NODE_FX.gleanLoot, L('glean')) * hm,
    foes: { boss: { on: false, hp: 1, loot: 1, spawn: 1 }, ...Object.fromEntries(Object.entries(FOE_NODES).map(([k, [on, fury, swarm]]) => [k, {
      on: on === null || L(on) > 0,
      hp: Math.pow(FOE_FX.hp, L(fury)), loot: Math.pow(FOE_FX.loot, L(fury)), spawn: Math.pow(FOE_FX.spawn, L(swarm)),
    }])) } as Record<OrcKind, Foe>,
    kin,
    wolf: L('wolf') ? SOURCES.wolf.base * Math.pow(NODE_FX.fangsDmg, L('fangs')) * kin : 0,
    archers: L('ranger') + L('warden'),
    hawk: L('hawk') > 0,
    treant: L('treant') > 0,
    knives: L('knives') ? { rate: Math.pow(NODE_FX.knifeRate, L('knifespd')) / SOURCES.knives.cd, dmg: SOURCES.knives.base * Math.pow(NODE_FX.knifeDmg, L('knifespd')) * kin } : null,
    storm: L('storm') > 0,
    ballista: L('ballista') ? SOURCES.ballista.base * Math.pow(NODE_FX.boltDmg, L('bolt')) * kin : 0,
    barMax: BARRICADE.baseHp * (1 + HW_FX.timberPerRank * (hw.hw_timber ?? 0)) * Math.pow(BARRICADE.timberMult, L('timber')) * hm,
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
