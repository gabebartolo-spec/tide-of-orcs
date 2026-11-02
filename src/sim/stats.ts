import { NodeId } from '../data/skillTree';
import { HW_FX, HwLevels } from '../data/heartwood';
import { SATCHEL, SPOILS_FX } from '../data/lootTables';
import { FOE_FX, OrcKind } from '../data/orcs';
import { ARROWS, BARRICADE, ELF_FX, LOB, NODE_FX, PLAYER, SHOT_FX, SOURCES, STACKING, UNIT_FX, VANGUARD } from '../data/balance';

export type Levels = Partial<Record<NodeId, number>>;

/** Everything systems read. Derived from levels + heartwood + Heartwood tree; never read node ids elsewhere. */
export interface Stats {
  dmg: number; fireRate: number; lobCd: number; radius: number; arrows: number; pierce: number; crit: number;
  homing: boolean; fire: boolean;
  /** Arrow enchantments (TB-089): Rebound hops (0 = none), shock, stun, frost slow fraction (0 = none), shatter damage × player dmg (0 = none), starfall. */
  bounce: number; shock: boolean; stun: boolean; slow: number; shatter: number; starfall: boolean;
  /** Per-type shot nodes (TB-111): chance per shot of each enchantment (0 = not owned), and what the type's damage and effect nodes set.
   *  moonMult multiplies a moon shot's damage; homeR is how far from the aim a moon shot settles; the elf's crits deal critMult. */
  fireP: number; frostP: number; shockP: number; rebP: number; moonP: number; starP: number;
  burnSecs: number; stunSecs: number; shockMult: number; rebMult: number; moonMult: number; homeR: number; starDmg: number; starArrows: number;
  critMult: number; knifeExtra: number; boltRoot: number;
  /** Per-unit nodes (TB-111) for companions and vanguard. */
  units: Record<Unit, UnitFx>;
  starMult: number;
  /** Per orc kind: summon node owned, and its spawn/health/loot multipliers. When a kind marches is set by ORC_TYPES.from. */
  foes: Record<OrcKind, Foe>;
  kin: number; wolf: number; archers: number; hawk: boolean; treant: boolean;
  knives: { rate: number; dmg: number } | null;
  storm: boolean; ballista: number;
  // barricade
  barMax: number; barRegen: number; spikes: number; bulwark: boolean;
  // vanguard
  muster: boolean; vanCap: number; vanHp: number; vanDmg: number; vanMend: number; vanRespawn: number; champion: boolean;
  // set bonuses (TB-099): 0 = off; numbers from SET_FX, applied by applyGear
  bleedAmp: number; knifeFan: number; burn: number; burnSpread: number; cinder: number;
  chain: number; chainJump: number; rebound: number; stormCd: number;
  ballCd: number; boltShove: number; boltPin: number; moonCrit: number; moonwell: number;
  petDmg: number; petHaste: number; extraWolves: number; treantRoot: number; freeRally: number;
  // mythic powers (TB-100): 0 = off; numbers from MYTHIC_FX
  knifeReturn: number; burnRamp: number; stormStore: number; stakes: number; fullMoon: number; petReturn: number; wallSplinter: number; starCloak: number;
  // loot (TB-101): Heartwood lines and the Spoils branch. salvageMult/Plus shape Glimmer; rerollMult is read by the reroll (TB-102)
  itemFind: number; luck: number; satchelCap: number; bossDrops: number; trophy: boolean; hoard: boolean;
  salvageMult: number; salvagePlus: number; rerollMult: number; setBoost: number; echo: number;
}

export type Unit = 'wolf' | 'ranger' | 'warden' | 'hawk' | 'treant' | 'spear' | 'blade';
/** dmg and rate multiply (the wolf's dmg is already inside Stats.wolf); crit is a chance, critMult what a crit deals; spd multiplies move speed. */
export interface UnitFx { dmg: number; rate: number; crit: number; critMult: number; spd: number }

/** Each unit's nodes: [damage, fire rate, crit chance, crit damage, move speed (null = stands still)]. */
const UNIT_NODES: Record<Unit, [NodeId, NodeId, NodeId, NodeId, NodeId | null]> = {
  wolf: ['fangs', 'wolfrate', 'wolfcrit', 'wolfcritx', 'wolfspd'],
  ranger: ['rangerdmg', 'rangerrate', 'rangercrit', 'rangercritx', null],
  warden: ['wardendmg', 'wardenrate', 'wardencrit', 'wardencritx', null],
  hawk: ['hawkdmg', 'hawkrate', 'hawkcrit', 'hawkcritx', null],
  treant: ['treantdmg', 'treantrate', 'treantcrit', 'treantcritx', null],
  spear: ['drill', 'spearrate', 'spearcrit', 'spearcritx', 'spearspd'],
  blade: ['bladedmg', 'bladerate', 'bladecrit', 'bladecritx', 'bladespd'],
};
/** Fangs and Spear Drill keep their own per-rank damage. */
const UNIT_DMG: Partial<Record<Unit, number>> = { wolf: NODE_FX.fangsDmg, spear: VANGUARD.dmgPerDrill };

export interface Foe { on: boolean; hp: number; loot: number; spawn: number }

/** Each kind's nodes: [summon (null = always marching), fury, swarm]. */
const FOE_NODES: Partial<Record<OrcKind, [NodeId | null, NodeId, NodeId]>> = {
  grunt: [null, 'drums', 'horde'],
  runner: ['runners', 'runfury', 'runswarm'],
  brute: ['brutes', 'brutefury', 'bruteswarm'],
  elite: ['elites', 'elitefury', 'eliteswarm'],
  berserker: ['berserkers', 'berserkfury', 'berserkswarm'],
  wolfrider: ['wolfriders', 'riderfury', 'riderswarm'],
  shaman: ['shamans', 'shamanfury', 'shamanswarm'],
  drummer: ['drummers', 'drummerfury', 'drummerswarm'],
};

/** A node line's factor at rank r (TB-147): m^r, or 1 + (m − 1) × r when STACKING.add (floored at 0.1 for shrinking lines). */
const fx = (m: number, r: number): number => (STACKING.add ? Math.max(0.1, 1 + (m - 1) * r) : Math.pow(m, r));

export function deriveStats(lv: Levels, hw: HwLevels = {}): Stats {
  const L = (id: NodeId): number => lv[id] ?? 0;
  const kin = fx(NODE_FX.kinship, L('bond'));
  const muster = L('muster') > 0;
  // a shot type's chance per shot: 0 until owned, then chance0 + chancePerRank per Quiver rank
  const chance = (on: NodeId, q: NodeId): number => (L(on) ? Math.min(1, SHOT_FX.chance0 + SHOT_FX.chancePerRank * L(q)) : 0);
  const units = Object.fromEntries(Object.entries(UNIT_NODES).map(([u, [d, r, c, x, m]]) => [u, {
    dmg: fx(UNIT_DMG[u as Unit] ?? UNIT_FX.dmg, L(d)), rate: fx(UNIT_FX.rate, L(r)),
    crit: UNIT_FX.critPerRank * L(c), critMult: UNIT_FX.critMult0 + UNIT_FX.critxPerRank * L(x), spd: m ? fx(UNIT_FX.spd, L(m)) : 1,
  }])) as Record<Unit, UnitFx>;
  return {
    dmg: PLAYER.baseDmg * fx(NODE_FX.sharpDmg, L('sharp')),
    fireRate: PLAYER.baseFireRate * fx(NODE_FX.drawRate, L('draw')),
    lobCd: LOB.cd / fx(NODE_FX.drawRate, L('draw')),
    radius: LOB.radius * fx(NODE_FX.wideRadius, L('wide')),
    arrows: 1 + L('multi'),
    pierce: L('pierce'),
    crit: NODE_FX.critPerRank * L('crit') + (L('hunter') ? SPOILS_FX.hunterCrit : 0),
    homing: L('moon') > 0,
    fire: L('fire') > 0,
    bounce: L('bounce') ? 1 + L('bounce') : 0,
    shock: L('shock') > 0,
    stun: L('stun') > 0,
    slow: L('frost') ? ARROWS.frost.slow0 + ARROWS.frost.slowPerRank * (L('frost') - 1) : 0,
    shatter: L('shatter') ? ARROWS.shatter.mult * fx(ARROWS.shatter.perRank, L('shatter') - 1) : 0,
    starfall: L('starfall') > 0,
    fireP: chance('fire', 'firechance'), frostP: chance('frost', 'frostchance'), shockP: chance('shock', 'shockchance'),
    rebP: chance('bounce', 'rebchance'), moonP: chance('moon', 'moonchance'),
    starP: L('starfall') ? Math.min(1, SHOT_FX.starChance0 + SHOT_FX.starChancePerRank * L('starchance')) : 0,
    burnSecs: SOURCES.burnSecs + SHOT_FX.burnSecsPerRank * L('wildfire'),
    stunSecs: ARROWS.stun.secs + SHOT_FX.stunSecsPerRank * Math.max(0, L('stun') - 1),
    shockMult: ARROWS.shock.mult * fx(SHOT_FX.dmg, L('static')),
    rebMult: fx(SHOT_FX.dmg, L('rebdmg')),
    moonMult: NODE_FX.moonDmg * fx(SHOT_FX.moonDmg, L('moondmg')),
    homeR: PLAYER.aimHomingRadius * (1 + SHOT_FX.homeReachPerRank * L('moonreach')),
    starDmg: fx(SHOT_FX.dmg, L('stardmg')), starArrows: ARROWS.starfall.arrows + SHOT_FX.starArrowsPerRank * L('starcount'),
    critMult: PLAYER.critMult + ELF_FX.deadlyPerRank * L('deadly'),
    knifeExtra: SHOT_FX.knivesPerRank * L('knifefan'), boltRoot: SHOT_FX.boltRootSecs * L('boltpin'),
    units,
    starMult: fx(NODE_FX.gleanLoot, L('glean')),
    foes: { boss: { on: false, hp: 1, loot: 1, spawn: 1 }, ...Object.fromEntries(Object.entries(FOE_NODES).map(([k, [on, fury, swarm]]) => [k, {
      on: on !== null && L(on) > 0,
      hp: Math.pow(FOE_FX.hp, L(fury)),
      loot: Math.pow(FOE_FX.loot, L(fury)) * (on && L(on) ? FOE_FX.summonLoot : 1),
      spawn: Math.pow(FOE_FX.spawn, L(swarm)) * (on === null ? 1 : L(on) ? FOE_FX.summonSpawn : FOE_FX.unsummonedSpawn),
    }])) } as Record<OrcKind, Foe>,
    kin,
    wolf: L('wolf') ? SOURCES.wolf.base * units.wolf.dmg * kin : 0,
    archers: L('ranger') + L('warden'),
    hawk: L('hawk') > 0,
    treant: L('treant') > 0,
    knives: L('knives') ? { rate: fx(NODE_FX.knifeRate, L('knifespd')) / SOURCES.knives.cd, dmg: SOURCES.knives.base * fx(SHOT_FX.dmg, L('knifedmg')) * kin } : null,
    storm: L('storm') > 0,
    ballista: L('ballista') ? SOURCES.ballista.base * fx(NODE_FX.boltDmg, L('bolt')) * kin : 0,
    barMax: BARRICADE.baseHp * (1 + HW_FX.timberPerRank * (hw.hw_timber ?? 0)) * fx(BARRICADE.timberMult, L('timber')),
    barRegen: BARRICADE.regenPerRank * L('repair'),
    spikes: BARRICADE.spikesPerRank * L('spikes'),
    bulwark: L('bulwark') > 0,
    muster,
    vanCap: muster ? VANGUARD.baseCap + L('ranks') : 0,
    vanHp: fx(VANGUARD.hpPerShield, L('shield')),
    vanDmg: kin,
    vanMend: VANGUARD.mendPerRank * L('mend'),
    vanRespawn: fx(VANGUARD.respawnPerRank, L('swiftmuster')),
    champion: L('champion') > 0,
    bleedAmp: 0, knifeFan: 0, burn: fx(SHOT_FX.dmg, L('kindle')), burnSpread: 0, cinder: 0,
    chain: SOURCES.storm.targets, chainJump: SOURCES.storm.jump, rebound: 0, stormCd: SOURCES.storm.cd,
    ballCd: SOURCES.ballista.cd * fx(SHOT_FX.windlass, L('windlass')), boltShove: 0, boltPin: 0, moonCrit: 0, moonwell: 0,
    petDmg: 1, petHaste: 0, extraWolves: 0, treantRoot: 0, freeRally: 0,
    knifeReturn: 0, burnRamp: 0, stormStore: 0, stakes: 0, fullMoon: 0, petReturn: 0, wallSplinter: 0, starCloak: 0,
    itemFind: HW_FX.find[hw.hw_find ?? 0]! + (L('sharpeyes') ? SPOILS_FX.sharpFind : 0), luck: HW_FX.fortune[hw.hw_fortune ?? 0]!,
    satchelCap: hw.hw_satchel ? SATCHEL.deep : SATCHEL.base, bossDrops: hw.hw_tithe ? HW_FX.titheDrops : 1,
    trophy: L('trophy') > 0, hoard: L('hoard') > 0,
    salvageMult: L('scavenger') ? SPOILS_FX.scavenger : 1, salvagePlus: hw.hw_glimmer ? HW_FX.salvagePlus : 0, rerollMult: hw.hw_glimmer ? 1 - HW_FX.rerollCut : 1,
    setBoost: L('resonance') ? SPOILS_FX.resonance : 0, echo: L('echo') ? SPOILS_FX.echo : 1,
  };
}
