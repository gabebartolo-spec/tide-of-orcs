/** Presentation timings (TB-061, ART-STYLE §M4 presentation). Render-only; the sim never reads these. */
export const SKY = {
  /** Seconds for one full day-dusk-day cycle. */
  dayCycle: 600,
  /** Peak dusk tint over the plain (keeps the patches readable). */
  duskAlpha: 0.85,
  /** Hill bands, far to near: scroll speed (units/s), crest height, bump width, top of band. */
  hills: [{ speed: 2, h: 26, w: 140, y: 0 }, { speed: 5, h: 18, w: 90, y: 14 }],
  /** Lamplight radius on the grove bank at full night. */
  lampR: 150,
} as const;

/** 0 at midday, 1 at deepest dusk. */
export const dusk = (t: number): number => (1 - Math.cos((2 * Math.PI * t) / SKY.dayCycle)) / 2;

/** Attack and hit VFX (TB-088, ART-STYLE §Attack and hit VFX). Render-only; sizes in field units, times in seconds. */
export const VFX = {
  /** Pool sizes: squares/droplets, strokes (swipes, streaks, rings), ground splats, floating text. */
  cap: { parts: 900, strokes: 120, splats: 220, texts: 120 },
  /** Square burst: life = life + rand * lifeJitter, size = size + rand * sizeJitter, speed scaled 0.3..1.3, drag per frame. */
  burst: { life: 0.5, lifeJitter: 0.4, size: 1.5, sizeJitter: 2, drag: 0.96 },
  /** Blood droplets: fly up then fall onto the ground plane and leave a splat. */
  blood: { hit: 4, kill: 10, vanHit: 4, vanFell: 10, speed: 70, lift: 60, gravity: 420, size: 2, drop: 6, splatLife: 6, splatAlpha: 0.55, dropSplat: 1.6, killSplat: 0.8, vanSplat: 9 },
  /** Orc wind-up: lean back over the last `from` fraction of the swing, `lean` × r (brute/boss own values). */
  orcWind: { from: 0.6, lean: 0.4, leanBrute: 0.5, liftBoss: 0.35 },
  /** Orc release: crescent swipe radius × r, arc half-width (rad), life; runner scale; boss slam ring × r. */
  orcSwipe: { r: 1.1, half: 0.9, life: 0.15, width: 2, widthBrute: 3.5, runner: 0.75, elite: 1.35, slam: 1.6, slamLife: 0.3 },
  /** Wall impact: timber chips per kind, cream chips, chip speed, spray angle (rad, up and back over the wall) ± spread, shake bump (brute, boss). */
  wallHit: { chips: 3, chipsBrute: 5, chipsBoss: 8, cream: 2, speed: 60, chipAng: -2.2, chipSpread: 0.6, shakeBrute: 0.08, shakeBoss: 0.2 },
  /** Vanguard: spear draw-back (px), thrust streak life/width, blade fold (rad), slash radius/half-arc/life. */
  spear: { draw: 6, life: 0.12, width: 2.5 },
  blade: { fold: 0.5, r: 26, half: 0.8, life: 0.15, width: 2.5 },
  /** Elf: string pull (px) at full draw. */
  bow: { pull: 5 },
  /** Projectile trails: ghost count per kind, spacing along the path (s), alpha of the first ghost. */
  trail: { lob: 3, arrow: 3, bolt: 4, knife: 2, gap: 0.025, alpha: 0.45, lobSpacing: 2 },
  /** Lob landing: dust ring on the ground (× circle radius), its life. */
  lobDust: { r: 0.6, life: 0.35 },
  /** Existing bursts (count, speed), kept as they were before TB-088. */
  kill: [10, 90], hit: [2, 60], bite: [3, 50], hawk: [14, 120], treant: [16, 140], impact: [6, 70],
  regrow: [40, 160], rally: [8, 60], vanFell: [14, 100],
  treantShake: 0.2, impactLife: 0.3, stormLife: 0.35, textLife: 0.9, textRise: 28,
} as const;

/** Field ground (TB-098, ART-STYLE §Ground). Seeded layout painted once to an offscreen canvas; field units. Ranges are [min, max]. */
export const GROUND = {
  seed: 0x6a7e31,
  /** Keep-clear strip in front of the wall (units). */
  wallGap: 22,
  /** Lusher, darker grass drifts: count, blobs per drift, blob radius, y squash, blob scatter. */
  lush: { n: 11, blobs: [4, 7], r: [14, 30], squash: 0.45, spread: 34 },
  /** Worn dry-grass patches with a barren earth core: count, blobs, radius, squash, scatter; bare core blobs and their scale. */
  worn: { n: 6, blobs: [5, 8], r: [18, 34], squash: 0.42, spread: 34, bare: [3, 5], bareScale: 0.5 },
  /** Soft-edge passes per blob (each at `alpha`, radius stepping down by `step`). */
  soft: { passes: 4, alpha: 0.3, step: 0.15 },
  /** Grass tufts: clusters, tufts per cluster, scatter; loose singles; blades per tuft, blade height, lean (rad), stroke width. */
  tufts: { clusters: 26, per: [3, 6], spread: 18, singles: 40, blades: [4, 7], h: [6, 12], lean: 0.6, width: 1.4 },
  /** Small rocks: count (half sit on worn patches), radius, y squash, pebbles beside each, pebble radius. */
  rocks: { n: 18, r: [2.6, 5.5], squash: 0.62, pebbles: [0, 3], pebbleR: [1, 1.8] },
} as const;
