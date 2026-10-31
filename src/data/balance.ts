/** All tuning constants and formulas. Mirrors docs/BALANCE.md `## Current` and docs/prototype.html. */

export const FIELD = { w: 900, h: 480, barX: 150, barW: 14, elfX: 64 } as const;
export const WAVE_LEN = 24;
export const ORC_CAP = 160;
export const STEP = 1 / 50;

export const PLAYER = { baseDmg: 9, baseFireRate: 1.2, arrowSpeed: 520, critMult: 3, fanRad: 0.09, aimHomingRadius: 70 } as const;
/** The elf's arcing shot: fired only while the player aims; lands on the aim circle and hits every orc inside it. */
export const LOB = {
  cd: 2.5,          // seconds between shots before Quick Draw
  dmgMult: 3,       // × player damage, to every orc in the circle
  radius: 40,       // circle radius before Wide Volley
  flight: 0.7,      // seconds in the air
  arc: 90,          // apex height, px
  pulseGap: 0.35,   // seconds between repeat strikes (Longshaft)
  splitSpread: 0.6, // Split Shot extra arrows land within this fraction of the radius
} as const;

export const BARRICADE = {
  baseHp: 400,
  timberMult: 1.25,     // per Seasoned Timber rank
  regenPerRank: 0.01,   // fraction of max per second per Patient Hands rank
  spikesPerRank: 0.2,   // fraction of player dmg per second per Thornwall rank
  bulwarkFrac: 0.5,     // Deep Roots regrow fraction
  orcAtkFrac: 0.025,     // orc dps to vanguard = this × orc maxhp
  wallMult: 10,         // the wall takes this × an orc's hit: a bare run falls at wave 3–4 (TB-080)
  orcSwing: 1.0,        // seconds between orc swings
} as const;

export const VANGUARD = {
  baseCap: 2,
  hpPerShield: 1.3, dmgPerDrill: 1.3, mendPerRank: 0.03,
  walkSpeed: 60, standX: 44, laneGap: 70, engageRange: 18,
  spear: { cost: 6, hp: 5, dmg: 1.6, cd: 0.8, reach: 28, cleave: false },
  blade: { cost: 18, hp: 4, dmg: 1.4, cd: 0.45, reach: 34, cleave: true },
} as const;
export type VanType = 'spear' | 'blade';

export const SOURCES = {
  burnSecs: 3, burnFrac: 0.35,
  storm: { cd: 6, mult: 4, targets: 5, jump: 140, seekX: 200 },
  hawk: { cd: 4, mult: 2.5, radius: 60 },
  treant: { cd: 3, mult: 3, range: 160 },
  ballista: { cd: 4, base: 40, speed: 760 },
  knives: { cd: 1.4, base: 5, speed: 640 },
  wolf: { base: 6, biteCd: 0.5, speed: 210, reach: 22 },
  archerDmgFrac: 0.7, archerOffsetY: 90,
} as const;

/** Arrow enchantments (TB-089): effects on the elf's lob strikes. */
export const ARROWS = {
  /** Rebound: a magic bolt leaps from the strike to the nearest orc within `jump`, 1 + rank times; each hop deals `falloff` × the last. */
  bounce: { jump: 120, falloff: 0.6, speed: 420 },
  /** Shock Arrows: lightning from the struck orc to up to `targets` others within `jump`, `mult` × lob damage each. */
  shock: { targets: 3, mult: 0.3, jump: 90 },
  /** Thunderclap: struck orcs stop moving and swinging for `secs`. */
  stun: { secs: 0.5 },
  /** Frost Arrows: struck orcs move and swing slower for `secs`; slow = slow0 + slowPerRank × (rank − 1), 20% → 40% at rank 5. */
  frost: { secs: 3, slow0: 0.2, slowPerRank: 0.05 },
  /** Shatter: a chilled orc that dies deals `mult` × perRank^(rank − 1) × player damage to orcs within `radius`. */
  shatter: { radius: 50, mult: 1, perRank: 1.4 },
  /** Starfall: a lob that rolls Starfall also rains `arrows` arrows on orcs across the plain, each a small strike circle, falling `stagger` s apart. */
  starfall: { arrows: 8, r: 26, height: 260, flight: 0.6, stagger: 0.08 },
} as const;

/** Per-type shot nodes (TB-103). Fire, frost, shock, Rebound and Moonbow each roll per shot: `chance0` once owned, + `chancePerRank` per Quiver rank.
 *  Starfall rolls its own `starChance0` + `starChancePerRank`. Damage nodes multiply by `dmg` per rank. */
export const SHOT_FX = {
  chance0: 0.25, chancePerRank: 0.15, starChance0: 0.1, starChancePerRank: 0.05,
  dmg: 1.3, moonDmg: 1.2,
  burnSecsPerRank: 1, stunSecsPerRank: 0.25, homeReachPerRank: 0.25, starArrowsPerRank: 2,
  knivesPerRank: 1, boltRootSecs: 0.3, windlass: 0.9,
} as const;

/** Per-unit nodes (TB-103) for companions and vanguard: damage ×dmg, rate ×rate, crit chance +critPerRank (a crit deals critMult0 + critxPerRank × Crit-damage rank), move speed ×spd, per rank. */
export const UNIT_FX = { dmg: 1.3, rate: 1.15, critPerRank: 0.05, critMult0: 2, critxPerRank: 0.5, spd: 1.15 } as const;
/** The elf's crits: PLAYER.critMult + deadlyPerRank × Deadly Aim rank. */
export const ELF_FX = { deadlyPerRank: 0.5 } as const;

/** Per-rank multipliers and flat effects of tree nodes (SKILL-TREE.md effect column). */
export const NODE_FX = {
  sharpDmg: 1.25, moonDmg: 1.6, drawRate: 1.15, critPerRank: 0.08, gleanLoot: 1.15, kinship: 1.2,
  wideRadius: 1.2,
  fangsDmg: 1.4, knifeRate: 1.2, boltDmg: 1.5,
} as const;

export const PRESTIGE = { voluntaryWave: 12, heartPerHW: 0.12, waveOffset: 4, waveFactor: 0.75, killsPerHW: 400, minGain: 1 } as const;

export const HP_RAMP = { from: 15, rate: 1.3 } as const;
export const waveHP = (w: number): number =>
  10 * Math.pow(1.17, Math.min(w, HP_RAMP.from) - 1) * Math.pow(HP_RAMP.rate, Math.max(0, w - HP_RAMP.from));
export const waveLoot = (w: number): number => 2 * Math.pow(1.13, w - 1);
export const waveInterval = (w: number): number => Math.max(0.3, 2.0 * Math.pow(0.93, w - 1));
export const waveSpeedMult = (w: number): number => 1 + 0.008 * w;
export const heartMult = (heartwood: number): number => 1 + PRESTIGE.heartPerHW * heartwood;

export const prestigeGain = (wave: number, runKills: number): number =>
  Math.max(PRESTIGE.minGain, Math.floor((wave - PRESTIGE.waveOffset) * PRESTIGE.waveFactor) + Math.floor(runKills / PRESTIGE.killsPerHW));

export const COST_WAVE = { from: 10, rate: 1.25 } as const;
/** Multiplier on every node price, by the wave at purchase (P-001). */
export const costWave = (w: number): number => Math.pow(COST_WAVE.rate, Math.max(0, w - COST_WAVE.from));

export const nodeCost = (base: number, growth: number, rank: number): number =>
  base === 0 ? 0 : Math.round(base * Math.pow(growth, rank));

export const vanCost = (type: VanType, wave: number): number => VANGUARD[type].cost * waveLoot(wave);
export const vanBaseHp = (type: VanType, wave: number): number => VANGUARD[type].hp * waveHP(wave);
