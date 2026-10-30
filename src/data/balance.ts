/** All tuning constants and formulas. Mirrors docs/BALANCE.md `## Current` and docs/prototype.html. */

export const FIELD = { w: 900, h: 480, barX: 150, barW: 14, elfX: 64 } as const;
export const WAVE_LEN = 24;
export const ORC_CAP = 160;
export const STEP = 1 / 50;

export const PLAYER = { baseDmg: 9, baseFireRate: 1.2, arrowSpeed: 520, critMult: 3, fanRad: 0.09, aimHomingRadius: 70 } as const;

export const BARRICADE = {
  baseHp: 400,
  timberMult: 1.25,     // per Seasoned Timber rank
  regenPerRank: 0.01,   // fraction of max per second per Patient Hands rank
  spikesPerRank: 0.2,   // fraction of player dmg per second per Thornwall rank
  bulwarkFrac: 0.5,     // Deep Roots regrow fraction
  orcAtkFrac: 0.025,     // orc dps to wall/vanguard = this × orc maxhp
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

/** Provoke nodes: tougher orcs for more starlight, per rank. */
export const PROVOKE = { drumsHp: 1.3, drumsLoot: 1.4, bannersAtk: 1.3, bannersLoot: 1.25 } as const;

export const PRESTIGE = { voluntaryWave: 12, heartPerHW: 0.12, waveOffset: 4, waveFactor: 0.75, killsPerHW: 400 } as const;
export const OFFLINE = { base: 0.25, perRoot: 0.2, capSecs: 8 * 3600, minAwaySecs: 60 } as const;

export const HP_RAMP = { from: 15, rate: 1.3 } as const;
export const waveHP = (w: number): number =>
  10 * Math.pow(1.17, Math.min(w, HP_RAMP.from) - 1) * Math.pow(HP_RAMP.rate, Math.max(0, w - HP_RAMP.from));
export const waveLoot = (w: number): number => 2 * Math.pow(1.13, w - 1);
export const waveInterval = (w: number): number => Math.max(0.3, 2.0 * Math.pow(0.93, w - 1));
export const waveSpeedMult = (w: number): number => 1 + 0.008 * w;
export const heartMult = (heartwood: number): number => 1 + PRESTIGE.heartPerHW * heartwood;

export const prestigeGain = (wave: number, runKills: number): number =>
  Math.max(0, Math.floor((wave - PRESTIGE.waveOffset) * PRESTIGE.waveFactor) + Math.floor(runKills / PRESTIGE.killsPerHW));

export const COST_WAVE = { from: 10, rate: 1.25 } as const;
/** Multiplier on every node price, by the wave at purchase (P-001). */
export const costWave = (w: number): number => Math.pow(COST_WAVE.rate, Math.max(0, w - COST_WAVE.from));

export const nodeCost = (base: number, growth: number, rank: number): number =>
  base === 0 ? 0 : Math.round(base * Math.pow(growth, rank));

export const vanCost = (type: VanType, wave: number): number => VANGUARD[type].cost * waveLoot(wave);
export const vanBaseHp = (type: VanType, wave: number): number => VANGUARD[type].hp * waveHP(wave);
