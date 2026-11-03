import { BUILDINGS } from './camp';
/** Presentation timings (TB-061, ART-STYLE §M4 presentation). Render-only; the sim never reads these. */
export const SKY = {
  /** Seconds for one full day-dusk-day cycle. */
  dayCycle: 600,
  /** Hill bands, far to near: scroll speed (units/s), crest height, bump width, top of band. */
  hills: [{ speed: 2, h: 26, w: 140, y: 0 }, { speed: 5, h: 18, w: 90, y: 14 }],
  /** Lamplight radius on the grove bank at full night. */
  lampR: 150,
} as const;

/** Treeline along the top of the view (TB-207): sprites from the Sketchfab Handpainted Tree Pack (rudolfs, CC-BY), rendered
 *  in tide-assets/trees. Rows of trees stacked from the view top down to `stop` (units above the plain's top edge, at least
 *  `minRows` rows): each row nearer than the last, so taller, brighter and wider spaced. The back rows use the hazed sprites. */
export const TREELINE = {
  seed: 207, span: [-700, 1600] as const,
  first: 38, gap: 26, stop: -6, minRows: 2, crown: -4, contact: 18, haze: 0.14, skirt: { step: 18, h: [10, 36] as const, lift: 14, rows: 2, offset: 9, far: 0.35, gap: 0.6 },
  h: [54, 92] as const, grow: 0.12, step: 22, stepGrow: 0.18, jitter: 0.45, lift: 8, bush: 0.2, bushH: [18, 28] as const,
  kinds: ['oak_green_1', 'oak_green_2', 'pine_1', 'pine_3', 'spruce_1', 'spruce_2', 'spruce_3'] as const,
} as const;

/** 0 at midday, 1 at deepest dusk. */
export const dusk = (t: number): number => (1 - Math.cos((2 * Math.PI * t) / SKY.dayCycle)) / 2;

/** Orc kinds with no sheet of their own draw another kind's approved sprite (director 3 Nov, TB-068): the sheet scales by the orc's
 *  radius, so the boss (r 24) reads half again as big as a brute (r 16). Kinds not listed draw `orc.<kind>`. */
export const ORC_SPRITE: Readonly<Partial<Record<string, string>>> = { elite: 'berserker', boss: 'brute' };

/** Render interpolation (TB-194): actors draw between their last two sim steps; a move longer than `snap` field units in one step (a pooled slot reused, a leap) snaps instead of sliding. */
export const INTERP = { snap: 40 };

/** Attack and hit VFX (TB-088, ART-STYLE §Attack and hit VFX). Render-only; sizes in field units, times in seconds. */
export const VFX = {
  /** Pool sizes: squares/droplets, strokes (swipes, streaks, rings), ground splats, floating text. */
  cap: { parts: 900, strokes: 120, splats: 220, texts: 120 },
  /** Square burst: life = life + rand * lifeJitter, size = size + rand * sizeJitter, speed scaled 0.3..1.3, drag per frame. */
  burst: { life: 0.5, lifeJitter: 0.4, size: 1.5, sizeJitter: 2, drag: 0.96 },
  /** Blood droplets: fly up then fall onto the ground plane and leave a splat. */
  blood: { hit: 4, kill: 10, vanHit: 4, vanFell: 10, speed: 70, lift: 60, gravity: 420, size: 2, drop: 6, splatLife: 6, splatAlpha: 0.55, dropSplat: 1.6, killSplat: 0.8, vanSplat: 9 },
  /** Orc wind-up: lean back over the last `from` fraction of the swing, `lean` × r (brute/boss own values). */
  /** Where the blow lands in each attack clip (0..1 of its frames), read off the frames: the clip is timed so this frame meets the sim hit (TB-161). */
  strike: { spear: 72 / 99, blade: 34 / 110, orc: 44 / 69, archer: 33 / 44 },  // TB-194: same clip frames, now every frame at 30 fps (was 36/50, 17/55, 22/35 of the even frames); archer: the companion's release, frame 33 of 44 (TB-203)
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
  /** Elf shot loop (TB-202): seconds to crossfade full draw back to draw frame 0 after each lob (director 3 Nov), and idle <-> draw when aim starts or stops. */
  elfShot: { release: 0.15, aim: 0.15 },
  /** Projectile trails: ghost count per kind, spacing along the path (s), alpha of the first ghost. */
  trail: { lob: 3, arrow: 3, bolt: 4, knife: 2, bounce: 8, star: 2, gap: 0.025, alpha: 0.45, lobSpacing: 2 },
  /** Lob landing: dust ring on the ground (× circle radius), its life. */
  lobDust: { r: 0.6, life: 0.35 },
  /** Existing bursts (count, speed), kept as they were before TB-088. */
  kill: [10, 90], hit: [2, 60], bite: [3, 50], hawk: [14, 120], treant: [16, 140], impact: [6, 70],
  regrow: [40, 160], rally: [8, 60], vanFell: [14, 100],
  /** Arrow enchantments (TB-089): burst [count, speed] per effect, ring widths/lives, stun star orbit. */
  arrows: { fire: [10, 70], frost: [8, 50], shatter: [18, 140], stun: [6, 50], bounce: [6, 60], ringLife: 0.4, shatterLife: 0.3, stunOrbit: 6, stunSpin: 8, starLen: 18, boltLen: 10,
    /** Element look (each must read at a glance): tinted lob head radius and width, ground patch life, ice shards, flames/s per burning orc,
     *  lightning glow/core width and jag, Rebound orb radius and hop ring, Starfall streak width. */
    headR: 4, lobW: 3, patchLife: 1.2, shards: 8, shardLen: 1.3, shardLife: 0.5, flameRate: 45, boltGlow: 16, boltW: 5, boltJag: 14, orbR: 4, rimBlur: 6, hopRing: 14, starW: 2.5 },
  /** Shaman fireball (TB-127, ART-STYLE §Shaman fireball VFX). In flight: ball radius, glow blur, ghost count, embers/s, ground shadow squash.
   *  Cast: ember burst [count, speed] in a ±spread cone toward the target, flames at the staff tip. Strike: flash puff (× r) and its life, then
   *  `puffs` rising fire puffs (× r, rise px/s, life), ground dust ring (× r) width/life, flame count, ember and fire bursts [count, speed] fountaining up within ±burstSpread
   *  of straight up, burning ground patch life, screen shake. */
  fireball: { r: 6, glow: 14, trail: 6, embers: 30, shadow: 0.4, cast: [8, 60], castSpread: 0.6, castFlames: 4, flash: 0.9, flashLife: 0.12, puffs: 7, puffR: 0.45, puffRise: 45, puffLife: 0.4, ring: 1.6, ringW: 2, ringLife: 0.4, flames: 24, burst: [20, 140], fireBurst: [10, 90], burstSpread: 1.1, patchLife: 1.4, shake: 0.08 },
  treantShake: 0.2, impactLife: 0.3, stormLife: 0.35, zoneFade: 0.6, zoneSquash: 0.45, textLife: 0.9, textRise: 28,
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
  /** Sunlit pale-green drifts that vary the greens (TB-166): count, blobs, radius, squash, scatter. */
  sunlit: { n: 8, blobs: [4, 7], r: [16, 30], squash: 0.45, spread: 38 },
  /** Vector meadow flowers (TB-166): drifts along the top/bottom borders (edge = band depth as a fraction of H), flowers per
   *  drift, drift size; loose singles in the lane; petal radius; stem height; weight per kind. */
  flowers: { drifts: 16, per: [24, 36], driftW: 90, driftH: 22, edge: 0.22, lane: 40, r: [2.4, 3.8], stem: [3, 8], kinds: { daisy: 4, violet: 3, buttercup: 2, blossom: 1 } },
  /** Fence barricade (director 2 Nov, Sketchfab "the fence"): panel draw width, vertical step between stacked panels (units). */
  fence: { w: 30, step: 22 },
} as const;

/** Loot moments (TB-105, plan §11). Lives in seconds, sizes in field units.
 *  beam: how long each rarity's light column stands; common only glints. motes: burst on the drop. foot: beam base below the corpse centre.
 *  mythic: hold (sim frozen), then slow (sim at slowScale), then the screen-edge shimmer's life. Reduced motion keeps beams, glows and rings but drops motes, pulse, spin and slow-motion. */
export const LOOT_VFX = {
  glint: [4, 60], beam: { common: 1.2, rare: 2.5, epic: 3, legendary: 3.5, mythic: 4.5 }, motes: { common: 0, rare: 6, epic: 12, legendary: 20, mythic: 30 }, moteSpeed: 90,
  /** TB-192: every drop stands a pillar; height and width scale by rarity (beamH × k, beamW × k), so rarer reads at a glance. */
  scale: { common: 0.6, rare: 1.3, epic: 1.7, legendary: 2.2, mythic: 2.8 },
  /** TB-192: legendary and mythic add a screen shake (0–1 added to the field shake) and a full-field flash of their colour (alpha, seconds). */
  shake: { legendary: 0.45, mythic: 0.8 }, flash: { legendary: 0.22, mythic: 0.35 }, flashLife: 0.45,
  foot: 10, beamH: 140, beamW: 16, beamAlpha: 0.8, core: 0.25, pulse: 9, spiral: 6, spin: 5, rise: 60, ringR: 34, groundAlpha: 0.25,
  mythic: { hold: 0.5, slow: 0.5, slowScale: 0.6, edge: 1.5, edgeW: 14, flicker: 20 },
  equip: 1, equipW: 4, leafLife: 2, leafN: 10, leafR: 30, leafSpin: 1.6,
} as const;

/** Field ambience (TB-166): glowing fairy motes and soft sun shafts. Render-only; field units, seconds. */
export const AMBIENCE = {
  /** Motes: count, core radius, halo scale, drift speed, glow pulse rate; alpha by day and at full dusk. */
  motes: { n: 50, r: [0.9, 1.8], halo: 4, speed: 7, pulse: 1.3, day: 0.55, night: 1 },
} as const;

/** Drop banner (TB-192): the DOM card under the wave toast that shows a kept drop's icon, name and rarity.
 *  life: seconds on screen by rarity (every kept drop gets one); max: banners stacked at once. */
export const LOOT_BANNER = {
  life: { common: 3, rare: 3.5, epic: 4, legendary: 5, mythic: 6 } as Record<string, number>,
  max: 3,
  /** Rarities whose banner plays the uiRarity reveal shimmer (TB-195k). */
  reveal: ['rare', 'epic', 'legendary', 'mythic'] as readonly string[],
} as const;

/** Skill-tree lighting (TB-190b, ART-STYLE §Arcane skill tree). World px at zoom 1; rates per second. Render-only. */
export const TREE_LIGHT = {
  /** Path links not yet grown (TB-193c): alpha of the chosen path's still neon, of a locked path's faint line, and its dash. */
  pathOpenA: 0.55, pathLockedA: 0.3, pathDash: [5, 5] as number[],
  /** Bloom round owned links, drawn additively into a cached layer: [extra width over the wood, alpha], widest first. */
  bloom: [[34, 0.05], [18, 0.1], [8, 0.22]] as readonly (readonly [number, number])[],
  /** Light pool under each owned node: radius and centre alpha. */
  poolR: 52, poolA: 0.32,
  /** The cached glow breathes: rate (rad/s) and depth (0..1). */
  breathRate: 1.3, breathDepth: 0.25,
  /** Core line over the wood: width as a share of the wood, minimum px, alpha. */
  coreK: 0.28, coreMin: 1.3, coreA: 0.9,
  /** Pulses run root→tip: tree depth crossed per second, depth units between pulses, head radius, hot centre radius. */
  pulseRate: 2.2, pulseGap: 5, pulseR: 9, pulseCore: 2.4,
  /** Drifting motes along owned links: per link, laps/s, sideways sway (px) and sway rate, radius. */
  motes: 3, moteSpeed: 0.12, moteSway: 7, moteSwayRate: 1.7, moteR: 1.6,
  /** Burst along the path when a node is bought: particles per link, speed (px/s), life (s), radius, drag (1/s), cap. */
  burstPer: 30, burstSpeed: 95, burstLife: 1.3, burstR: 3.6, burstDrag: 2.2, burstCap: 600,
} as const;

/** Camp scene (TB-188e, docs/plans/elf-encampment.md §1): the encampment has its own view on the Camp tab, drawn at house
 *  scale. Scene units match field units. TB-188k round 3 (director, 3 Nov): laid out for a full-screen camp, x0..x0+w by
 *  top..bottom (1194 x 672 units, 16:9), buildings 1.6x round 2 in two staggered rows (bowyer and kitchen behind, forge and
 *  training ground in front), foreground below the road under 20% of the view. The canvas covers the view (scale to the larger
 *  of width and height ratios, centred), so a wider or shorter canvas crops the middle of it. No elf. */
export const CAMP_SCENE = { x0: 0, w: 1194, top: -330, bottom: 342 } as const;
/** The Camp scene's backdrop (TB-188j, TB-188k): one plate rendered in Blender in the buildings' style (render_camp_backdrop.py,
 *  same camera, sun and pixel density as the building images) to public/decor/camp_backdrop.webp. `plate` is the scene-unit
 *  rectangle the image covers; keep it and `road` in step with the constants at the top of that script. Contact shadows are
 *  baked into each building image. `shade`: the bottom `h` share of the canvas darkens to alpha `a` (foreground vignette). */
export const CAMP_BACKDROP = {
  src: 'decor/camp_backdrop.webp',
  plate: { x0: -40, x1: 1240, y0: -370, y1: 380 },
  road: { y: 232, half: 13 },
  shade: { h: 0.36, a: 1 },
} as const;

/** One building image in the camp scene (TB-188k): public/decor/camp/<id><lv>.webp drawn at x, y (top-left), w x h scene units.
 *  `top` is the image's highest solid point (forge sparks, bowyer pennant). Written by post_camp.py; every building is rendered
 *  at 4 px per unit with its baked contact shadow, so it is only ever downsampled (crisp at DPR 2 up to ~1.2x the 1080p scale). */
export interface CampArtRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly top: readonly [number, number] }
/** Building images per level (index 0 = level 1). Generated by post_camp.py from the render; do not edit by hand. */
export const CAMP_ART: Readonly<Record<'bowyer' | 'forge' | 'kitchen' | 'training', readonly [CampArtRect, CampArtRect, CampArtRect]>> = /*ART*/{
  bowyer: [
    { x: 87.8, y: -194.0, w: 284.2, h: 266.5, top: [255.4, -194.0] },
    { x: 76.0, y: -168.2, w: 313.0, h: 238.8, top: [229.4, -168.2] },
    { x: 52.0, y: -242.2, w: 356.2, h: 314.5, top: [218.9, -242.2] },
  ],
  forge: [
    { x: 329.5, y: -9.2, w: 234.2, h: 174.2, top: [459.0, -9.2] },
    { x: 324.8, y: -14.8, w: 251.2, h: 179.8, top: [450.2, -14.8] },
    { x: 271.8, y: -95.0, w: 392.2, h: 277.5, top: [575.1, -94.5] },
  ],
  kitchen: [
    { x: 584.2, y: -130.2, w: 291.2, h: 170.5, top: [782.1, -130.0] },
    { x: 561.8, y: -127.5, w: 328.8, h: 167.5, top: [666.1, -127.2] },
    { x: 561.8, y: -118.5, w: 351.5, h: 163.5, top: [562.9, -118.0] },
  ],
  training: [
    { x: 837.2, y: 28.0, w: 251.5, h: 122.2, top: [1024.4, 28.2] },
    { x: 847.0, y: -3.5, w: 255.5, h: 154.2, top: [966.2, -3.5] },
    { x: 817.0, y: 9.2, w: 302.0, h: 140.8, top: [901.6, 9.5] },
  ],
}/*END*/;
/** Building image pixels per scene unit (render_camp_backdrop.py PX). */
export const CAMP_ART_PX = 4;

/** Each building's footprint in the camp scene (click target and level-0 placeholder): centre x, base y, width and height in
 *  scene units, taken from the level-3 image. */
export const CAMP_SPOTS = Object.fromEntries(Object.entries(CAMP_ART).map(([id, r]) => {
  const a = r[2]; return [id, { x: a.x + a.w / 2, y: a.y + a.h, w: a.w, h: a.h }];
})) as Readonly<Record<keyof typeof CAMP_ART, { readonly x: number; readonly y: number; readonly w: number; readonly h: number }>>;

/** Buildings back row first, so the front row overlaps it (TB-188k round 3). */
export const CAMP_DRAW_ORDER = [...BUILDINGS].sort((a, b) => CAMP_SPOTS[a.id].y - CAMP_SPOTS[b.id].y);

/** Camp idle life (TB-188f, TB-188k): ambient motion in the Camp scene, scene units and seconds. Particle kinds: `rate` per second
 *  per emitter (dust: one burst of `burst` every `every` s), life range, start velocity (vy negative = up), `grav` downward accel,
 *  `wind` sideways drift, size from `r0` to `r1` over life, peak alpha `a`. `cap` bounds the shared pool. TB-188k removed the
 *  smoke (it read as flat discs). Emitters are placed from CAMP_ART: forge sparks at the forge image's top point (the bowyer pennant
 *  was dropped: it floated off the building), training dust at the ring's centre (`dustDy` above the image's base). */
/** Elk grazing behind the camp and birds over the forest (TB-188k round 3; TB-208, director 4 Nov), kept in the background. Each
 *  elk plays the "Realistic Animated Elk" model's own Stand_Eating_01 graze loop rendered at one spot by render_camp_backdrop.py:
 *  public/decor/camp/elk.webp facing left (CAMP_ELK_ART), or elk_r.webp, a true right-facing pass whose shadow still falls with
 *  the camp sun (`right: true`, CAMP_ELK_R_ART). Each is shifted by (dx, dy) scene units, scaled by `s` about its hooves
 *  (CAMP_ELK_FOOT; the herd varies within ±8%), and starts at `phase` (0-1) of the loop so the herd does not move in step.
 *  Birds: `n` small two-stroke silhouettes drifting at `speed` units/s across the band y0..y1, wings beating at `flap` Hz, span `span`. */
export const CAMP_FAUNA = {
  elk: [
    { dx: -105, dy: -22, right: false, s: 1.0, phase: 0 }, { dx: 70, dy: -40, right: true, s: 0.92, phase: 0.55 },
    { dx: 300, dy: -26, right: false, s: 1.08, phase: 0.3 },
  ],
  birds: { n: 5, y0: -262, y1: -228, speed: [9, 16], flap: [1.4, 2.4], span: 7, a: 0.8 },
} as const;
/** Elk sheet layout (scene units for the rect; `n` frames in a grid of `cols`, played at `fps`), written by post_elk.py. */
export interface CampSheetRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly n: number; readonly cols: number; readonly fps: number }
export const CAMP_ELK_ART: CampSheetRect = /*ELK*/{ x: 557.0, y: -161.0, w: 68.0, h: 61.7, n: 64, cols: 8, fps: 6.0 }/*EEND*/;
export const CAMP_ELK_R_ART: CampSheetRect = /*ELKR*/{ x: 566.0, y: -161.0, w: 66.7, h: 60.7, n: 64, cols: 8, fps: 6.0 }/*EREND*/;
/** Scene point under the rendered elk's hooves (render_camp_backdrop.py ELK_AT): the anchor each elk scales about. */
export const CAMP_ELK_FOOT = { x: 600, y: -110 } as const;

export const CAMP_LIFE = {
  cap: 120,
  sparks: { rate: 3.5, life: [0.45, 0.85], vx: [-7, 7], vy: [-30, -17], grav: 30, wind: 0, r0: 0.9, r1: 0.5, a: 1 },
  dust: { every: [1.6, 2.6], burst: 6, life: [0.5, 0.8], vx: [-11, 11], vy: [-8, -3], grav: 14, wind: 0, r0: 1.4, r1: 3.2, a: 0.55 },
  dustDy: 0.3,
} as const;

/** UI motion and feedback kit (TB-195a, docs/plans/game-ui.md §3, ART-STYLE §Motion). Times in ms, sizes in CSS px. */
export const JUICE = {
  /** Spring durations: pops, panels, screen moves. */
  dur: { pop: 120, panel: 220, screen: 400 },
  /** easeOutBack overshoot constant (1.70158 is the classic; lower = a slighter overshoot). */
  overshoot: 1.2,
  /** Count-up: ms to roll to a new value, the pop's start scale (settles to 1), the colour flash length. */
  count: { dur: 400, popFrom: 1.15, flash: 450 },
  /** Press: scale at the bottom of the press, ms down, ms back up on the spring. */
  press: { scale: 0.9, down: 50, up: 120 },
  /** Particle burst (TB-195b: reads at 1080p, Hades-like): count, speed range (rem/s), life range (s), size range (rem), gravity (rem/s²),
   *  drag per 1/60 s; `lift` is an upward kick (rem/s) so sparks arc up then fall; `fan` the half-angle (rad) of the spray round straight
   *  up; `glow` the halo radius × size; `flare` a bright ring at the origin (rem radius) and its life (s). Rem so 1080p and 4K match. */
  burst: { count: 64, speedMin: 6, speedMax: 19, lifeMin: 0.5, lifeMax: 1.0, sizeMin: 0.16, sizeMax: 0.4, gravity: 34, drag: 0.93, lift: 8, fan: 1.9, glow: 3, flare: 2.4, flareLife: 0.28 },
  /** Stagger: ms between list children entering. */
  stagger: 30,
  /** Stagger: px each child rises from as it enters. */
  rise: 8,
} as const;

/** Game HUD over the field (TB-195b, docs/plans/game-ui.md §2): starlight gem with an odometer, the wave banner and its clear stamp,
 *  the lit timber wall bar. Times in ms, sizes in rem. */
export const HUD = {
  /** Wall bar crack stages: one more crack shows as the barricade falls below each fraction (highest first). */
  cracks: [0.75, 0.5, 0.25] as readonly number[],
  /** Wall bar fill colour bands: above `high` it glows grove, above `low` amber, else rose (and the bar throbs). */
  high: 0.5, low: 0.25,
  /** Odometer: ms each digit rolls to its new place. */
  roll: 380,
  /** Gem sparkle: smallest starlight gain that sparkles, ms between sparkles, burst scale. */
  sparkleMin: 1, sparkleGap: 900, sparkleScale: 0.3,
  /** Wave-clear stamp: ms it slams in (from `stampFrom` scale), ms it holds, ms it fades. */
  stampIn: 260, stampFrom: 2.4, stampHold: 1100, stampOut: 400,
  /** Wall bar shake on a hit: rem amplitude per hit fraction of max HP (capped at `shakeMax`), ms. */
  shakeK: 6, shakeMax: 0.35, shakeMs: 220,
} as const;

/** Tooltip plates (TB-195c): rows = most now → next lines shown; gap = rem from the cursor; in = ms spring-in; w = plate width in rem. */
export const PLATE = { rows: 3, gap: 1.25, in: 120, w: 19 } as const;

/** Battle report (TB-195f): ms before the first tally rolls, between tallies, each roll's length, pause before the seal;
 *  the seal drops from `stampFrom`x scale turned `stampTurn` degrees in `stampIn` ms; the board jolts `jolt` rem for `joltMs`. */
export const REPORT = { lead: 350, gap: 380, roll: 520, stampAfter: 300, stampIn: 240, stampFrom: 2.6, stampTurn: -28, jolt: 0.375, joltMs: 220 };
/** Satchel as an object (TB-195e): compare plates show at most `lines` affix lines each, sit `gap` rem from the cursor;
 *  a dropped item snaps into its pocket over `snap` ms. */
export const SATCHEL_UI = { lines: 4, gap: 1.25, snap: 260 } as const;

/** Full-screen field (TB-207): reach is the half width around the barricade that the wave bar clears. */
export const FIELD_VIEW = { reach: 24 } as const;
