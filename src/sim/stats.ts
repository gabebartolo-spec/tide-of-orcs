import { NodeId } from '../data/skillTree';
import { HW_FX, HwLevels } from '../data/heartwood';
import { FOE_FX, OrcKind } from '../data/orcs';
import { BARRICADE, LOB, NODE_FX, PLAYER, SOURCES, VANGUARD, heartMult } from '../data/balance';

export type Levels = Partial<Record<NodeId, number>>;

/** Everything systems read. Derived from levels + heartwood + Heartwood tree; never read node ids elsewhere. */
export interface Stats {
  dmg: number; fireRate: number; lobCd: number; radius: number; arrows: number; pierce: number; crit: number;
  homing: boolean; fire: boolean;
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
  // set bonuses (TB-099): 0 = off; numbers from SET_FX, applied by applyGear
  bleedAmp: number; knifeFan: number; burn: number; burnSpread: number; cinder: number;
  chain: number; chainJump: number; rebound: number; stormCd: number;
  ballCd: number; boltShove: number; boltPin: number; moonCrit: number; moonwell: number;
  petDmg: number; petHaste: number; extraWolves: number; treantRoot: number; freeRally: number;
  // mythic powers (TB-100): 0 = off; numbers from MYTHIC_FX
  knifeReturn: number; burnRamp: number; stormStore: number; stakes: number; fullMoon: number; petReturn: number; wallSplinter: number; starfall: number;
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
    bleedAmp: 0, knifeFan: 0, burn: 1, burnSpread: 0, cinder: 0,
    chain: SOURCES.storm.targets, chainJump: SOURCES.storm.jump, rebound: 0, stormCd: SOURCES.storm.cd,
    ballCd: SOURCES.ballista.cd, boltShove: 0, boltPin: 0, moonCrit: 0, moonwell: 0,
    petDmg: 1, petHaste: 0, extraWolves: 0, treantRoot: 0, freeRally: 0,
    knifeReturn: 0, burnRamp: 0, stormStore: 0, stakes: 0, fullMoon: 0, petReturn: 0, wallSplinter: 0, starfall: 0,
  };
}
