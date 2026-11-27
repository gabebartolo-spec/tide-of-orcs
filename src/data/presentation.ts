import { BUILDINGS } from './camp';
/** Presentation timings (TB-061, ART-STYLE §M4 presentation). Render-only; the sim never reads these. */
export const SKY = {
  /** Seconds for one full day-dusk-day cycle. */
  dayCycle: 600,
  /** TB-261: where golden hour sits on the `dusk()` curve (0 midday, 1 deepest dusk); the sky tones (`SKY_TONE`) blend day -> gold -> dusk. */
  gold: 0.5,
  /** Lamplight radius on the grove bank at full night. */
  lampR: 150,
  /** TB-232: the painted sky over the treeline. Under the HUD band an open strip of sky `open.frac` x the canvas height (at least `open.min`
   *  CSS px, so a phone still shows real distance) is kept clear of crowns: trees that would reach into it are drawn shorter (one uniform
   *  scale, never below `shrink` x their height). The skirt and the meadow never move; the gradient runs top -> low -> haze down to the crowns. */
  open: { frac: 0.06, min: 20 }, shrink: 0.5,
  /** Below the crown line the sky deepens into the wood's shade by `wood` x the canopy row's base depth; an orc is hidden until its feet clear the
   *  bush skirt, then fades in over its first `emerge` units of meadow. */
  wood: 0.6, emerge: 30,
  /** The wood's shade thins to nothing over `fade` units either side of the bush skirt, so it melts into the grass with no ruled edge. */
  fade: 22,
  /** Soft clouds: `n` seeded puffs, each `lobes` overlapping radial blobs `r` units wide, drifting `drift` units/s, at most `alpha`. */
  clouds: { n: 7, lobes: 4, r: [26, 52] as const, drift: 2.5, alpha: 0.75, seed: 232 },
} as const;

/** Fake depth on the meadow (TB-232). Sprites are pre-rendered from one fixed camera, so depth is faked in render only, over the rows a
 *  player sees as meadow: from `top` (the world row just under the bush skirt; the plain above it is inside the wood) to the plain's bottom.
 *  Row spacing runs `squeeze` tighter at the back and looser at the front (both edges stay put); actors and props scale from `far` on the back
 *  row to `near` on the front, linear in the drawn (squeezed) row as a real ground plane would. A sky-coloured aerial haze is drawn over
 *  every actor and tree: none at the crown line, rising over `feather` units to `hazeSky` (so no edge cuts the crown tips), easing down through the wood to `haze` on the meadow's back row and gone
 *  `hazeTo` of the way to the front, one smooth curve with no edge.
 *  The elf's post is spread over the meadow so its back member's feet stand `postClear` units below the bush skirt, never on it. */
export const DEPTH = { top: 176, far: 0.62, near: 1, squeeze: 0.3, hazeSky: 0.16, haze: 0.12, hazeTo: 0.6, feather: 30, postClear: 6 } as const;

/** Treeline along the top of the view (TB-207, TB-220): sprites from the Sketchfab Handpainted Tree Pack (rudolfs, CC-BY), rendered
 *  in tide-assets/trees (512 px renders, shipped at 44 px per model unit so a tree is never drawn past its native pixels at 1080p DPR 2).
 *  Rows of trees stacked from the view top down to `stop` (units above the plain's top edge, at least `minRows` rows): each row nearer
 *  than the last, so taller, brighter and wider spaced. Rows behind the nearest use the depth-graded sprites `_d1`.. (TB-260). Every tree is drawn at its real
 *  model height (`kinds`, in model units) times `unit`, always with one uniform scale so nothing squashes or warps. */
export const TREELINE = {
  seed: 207, span: [-700, 1600] as const,
  first: 118, gap: 22, stop: -6, minRows: 2, skirt: { step: 17, h: [8, 30] as const, lift: 12, rows: 2, offset: 9, far: 0.35, gap: 0.9,
    /** Share of skirt spots that hold a young tree (one of `kinds`, `youngH` units tall) instead of a bush. */
    young: 0.3, kinds: ['oak_green_1', 'oak_green_2', 'spruce_2', 'spruce_3'] as const, youngH: [24, 38] as const },
  /** Pre-scaled sprite levels stop below `mipMin` px high; the soft ground shadow is `shadowPx` wide and `shade` x the sprite width under a tree and a bush. */
  mipMin: 24, shadowPx: 64, shade: { tree: 0.45, bush: 0.85 },
  /** Depth grades (TB-260): the sprites are lit in Cycles like the actors; a row 1, 2, 3+ behind the nearest draws `tree_<kind>_d1..d<depth>`
   *  (pack_trees.py: colour mixed 0.22 / 0.36 / 0.48 toward `woodDeep`). A `far` skirt bush draws grade 1. */
  depth: 3,
  /** Device-exact sprite cache: most entries kept before it is rebuilt. The first `fill.rows` rows (the canopy against the view top) hold only kinds at least `fill.min` x the tallest that fits. */
  exactCap: 700, fill: { rows: 3, min: 0.9 },
  /** World units per model unit, and the random size spread (x unit) of one tree. */
  unit: 9.5, size: [0.96, 1.04] as const,
  /** Rows hang from the view top (`first` + row x `gap` down to a base, `lift` of jitter); a row only holds kinds up to `slack` x its room, then shrinks as one. */
  slack: 1.12,
  /** The barricade's far end (TB-268 redo, director 13 Nov: the bushes over the cut were "the same problem in reverse"): the rendered wall
   *  is slid along its own line until its finished end stands on the meadow `foot` units below the bush skirt base, in front of the skirt,
   *  never cut and never covered. `up`: how far above that foot an orc's blow on the wall's hidden length throws its chips. */
  cap: { foot: 4, up: 10 },
  /** Row 0 (the canopy against the HUD band): each tree is sized (x0.95..`stretch` of natural, same aspect) so its crown top lands `crown[0]`..`crown[1]` units below the band, so no bare strip shows between the HUD and the crowns. `hudGap` css px of air is kept under the HUD's lowest control. */
  crown: [2, 9] as const, stretch: 1.2, hudGap: 18,
  grow: 0.06, step: 22, stepGrow: 0.18, jitter: 0.65, lift: 8, bush: 0.1, bushH: [18, 28] as const,
  /** Tree sprite keys and their real model heights (Handpainted Tree Pack), so the forest has a natural mix of tall and short. */
  kinds: ['oak_green_1', 'oak_green_2', 'pine_1', 'pine_2', 'pine_3', 'spruce_2', 'spruce_3'] as const,
  heights: { oak_green_1: 6.25, oak_green_2: 6.94, pine_1: 7.35, pine_2: 8.95, pine_3: 10.57, spruce_2: 5.31, spruce_3: 5.17 } as Readonly<Record<string, number>>,
} as const;

/** 0 at midday, 1 at deepest dusk. */
export const dusk = (t: number): number => (1 - Math.cos((2 * Math.PI * t) / SKY.dayCycle)) / 2;

/** Orc kinds with no sheet of their own draw another kind's approved sprite (director 3 Nov, TB-068): the sheet scales by the orc's
 *  radius. Kinds not listed draw `orc.<kind>`; the boss has its own fantasy-orc sheet (TB-229). */
export const ORC_SPRITE: Readonly<Partial<Record<string, string>>> = { elite: 'berserker' };

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
  strike: { spear: 72 / 99, blade: 34 / 110, orc: 44 / 69, archer: 33 / 44, ogre: 12 / 29, wolfrider: 12 / 41 },  // TB-194: same clip frames, now every frame at 30 fps (was 36/50, 17/55, 22/35 of the even frames); archer: the companion's release, frame 33 of 44 (TB-203)
  orcWind: { from: 0.6, lean: 0.4, leanBrute: 0.5, liftBoss: 0.35 },
  /** Orc release: crescent swipe radius × r, arc half-width (rad), life; runner scale; boss slam ring × r. */
  orcSwipe: { r: 1.1, half: 0.9, life: 0.15, width: 2, widthBrute: 3.5, runner: 0.75, elite: 1.35, slam: 1.6, slamLife: 0.3 },
  /** Wall impact: timber chips per kind, cream chips, chip speed, spray angle (rad, up and back over the wall) ± spread, shake bump (brute, boss). */
  wallHit: { chips: 3, chipsBrute: 5, chipsBoss: 8, cream: 2, speed: 60, chipAng: -2.2, chipSpread: 0.6, capPad: 6, shakeBrute: 0.08, shakeBoss: 0.2 },
  /** Vanguard: spear draw-back (px), thrust streak life/width, blade fold (rad), slash radius/half-arc/life. */
  spear: { draw: 6, life: 0.12, width: 2.5 },
  blade: { fold: 0.5, r: 26, half: 0.8, life: 0.15, width: 2.5 },
  /** Elf: string pull (px) at full draw. */
  bow: { pull: 5 },
  /** Elf shot loop (TB-202): seconds to crossfade full draw back to draw frame 0 after each lob (director 3 Nov), and idle <-> draw when aim starts or stops. */
  elfShot: { release: 0.25, aim: 0.15 },
  /** Worn cosmetics on the field (TB-250). Trails: ghosts behind the lobbed arrow (count, spacing in s), size, sparks per second
   *  (ember, with a halo glow × r) or twinkle rate (star) or spin (leaf, rad/s; autumn colours so they read on the green meadow). Rune ring: glyph count, gap outside the strike circle, glyph size, spin (rad/s). */
  cosmetic: {
    ember: { n: 7, spacing: 1.2, r: 3.2, glow: 2.2, sparks: 40, alpha: 0.9 },
    star: { n: 5, spacing: 1.5, r: 4.5, twinkle: 14, alpha: 0.95 },
    leaf: { n: 6, spacing: 1.6, len: 5, wide: 2.4, spin: 9, alpha: 0.95 },
    rune: { n: 8, gap: 7, size: 4, spin: 0.35, w: 1.4, alpha: 0.85, readyGlow: 0.5 },
  },
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

/** TB-278 unified look: the battlefield backdrop plate, painted to the director's day and night targets (docs/art/unified-look/target/).
 *  public/decor/plate_day.webp (and plate_night.webp, the dark end of the day cycle) hold the sky, mountain, forest and meadow in one image,
 *  laid over this world rect (units): the 1920x1080 view's field. Past its sides the plate repeats mirrored; above its top one clear-sky texel fills the view.
 *  While the day plate is loaded it replaces the vector sky, the tree rows, the ground bake and its tufts, rocks and flowers, and the aerial haze. */
export const BACKDROP = { x0: 0, y0: -26.25, x1: 900, y1: 480, /** clear-sky texel (plate u, pixel row) used above the plate */ skyU: 0.3, skyV: 4 } as const;

/** Field ground (TB-098, ART-STYLE §Ground). Seeded layout painted once to an offscreen canvas; field units. Ranges are [min, max]. */
export const GROUND = {
  seed: 0x6a7e31,
  /** Keep-clear strip in front of the wall (units). */
  wallGap: 22,
  /** Painted meadow (TB-259): public/decor/ground.webp, the plain baked top-down in Blender under the actors' sun (scripts/ground/bake_ground.py),
   *  laid over this world rect (units) between the vector colour drifts and the tufts, rocks and flowers. Its edges feather to alpha. */
  bake: { x0: -140, y0: 100, x1: 1040, y1: 490 },
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
  /** Vector meadow flowers (TB-166): drifts along the bottom border (edge = band depth as a fraction of H) and just below the forest at the top (`topY`, plain units: the forest covers the plain above it), flowers per
   *  drift, drift size; loose singles in the lane; petal radius; stem height; weight per kind. */
  flowers: { drifts: 16, per: [24, 36], driftW: 90, driftH: 22, edge: 0.22, topY: [150, 185] as const, lane: 40, r: [2.4, 3.8], stem: [3, 8], kinds: { daisy: 4, violet: 3, buttercup: 2, blossom: 1 } },
  /** Fence barricade (director 2 Nov, Sketchfab "the fence"): panel draw width, vertical step between stacked panels (units). */
} as const;

/** The wall art's camera (TB-268): a perspective render (yaw 17.6, pitch 30, scale falling 0.125% a row like `depthScale`). Its orc-side
 *  face at the foot is drawn at x = `face` on row 480 and runs `slope` px right per row up the screen, the line orcs stop on. */
export const WALL_VIEW = { slope: 0.616, face: 124.5 } as const;
/** Thornwall's spikes on the wall face (TB-274): one every `gap` screen rows, `len` long, `half` half-height. */
export const SPIKES = { gap: 24, len: 9, half: 4 } as const;

/** The wall's look per tier (TB-209): image set (rendered from the segmented Tripo models, one image per damage stage), field placement, `foot` (the field y where its finished far end meets the ground, stage 0), the field y of the rendered breaches, and the palette tokens of its flying chunks. */
export const WALL_ART = [
  { key: 'wall0', x: -265.7, y: 119.1, w: 612.7, h: 810.9, foot: 181.9, breaches: [543, 446, 348, 271, 201], chunks: ['wallPalisade', 'wallPalisadeDark'] },
  { key: 'wall1', x: -297.3, y: 119.8, w: 641.2, h: 810.2, foot: 179.8, breaches: [518, 429, 339, 266, 200], chunks: ['wallBattle', 'wallBattleDark'] },
  { key: 'wall2', x: -288.2, y: 131.7, w: 624.4, h: 798.3, foot: 178.2, breaches: [610, 489, 372, 282, 203], chunks: ['wallStone', 'wallStoneDark'] },
  { key: 'wall3', x: -199.8, y: 117.4, w: 541.4, h: 799.0, foot: 178.0, breaches: [601, 481, 404, 324, 259, 198], chunks: ['wallHeart', 'wallHeartDark'] },
] as const;

/** TB-250 wall cosmetics: spots on the visible wall, the same posts at every tier and damage stage. Printed by tools/wall_spots.py from
 *  wall0's tall posts (the 8 visible ones, nearest first, picked by hand on its render): `capW.tall` is each post's cap width (field units),
 *  `tall[tier][stage][post]` its [centre x, top y, foot y] in field units from the placed wall art's top-left (x, y). wall1-3 have no
 *  tall posts: the spot is the same distance from the wall's far end, on that tier's own top edge, the foot its near face's bottom. */
export const WALL_SPOTS = {
  capW: { tall: [17.4, 16.68, 13.16, 12.77, 10.39, 10.06, 8.28, 8.4], plain: [16.66, 16.27, 16.01, 15.77, 15.52, 15.24, 15.01, 14.71, 14.44, 14.26, 12.38, 12.21, 12.02, 11.86, 11.48, 11.33, 11.15, 9.9, 9.79, 9.66, 9.54, 9.38, 9.14, 8.98] },
  tall: [
    [[[341.5, 314.2, 446.0], [359.3, 289.5, 418.6], [444.4, 169.1, 279.9], [454.0, 155.7, 264.2], [513.3, 74.2, 165.7], [521.3, 62.9, 152.8], [564.2, 2.2, 82.5], [578.7, 6.2, 61.4]], [[341.5, 314.2, 446.0], [359.3, 289.5, 418.6], [444.4, 169.1, 334.7], [454.0, 155.7, 264.2], [513.3, 74.2, 165.7], [521.3, 62.9, 152.8], [564.2, 2.2, 82.5], [578.7, 6.2, 82.5]], [[341.5, 314.2, 446.0], [359.3, 289.5, 418.6], [444.4, 169.1, 312.4], [454.0, 167.5, 264.2], [513.3, 74.2, 228.8], [521.3, 62.9, 152.8], [564.2, 2.2, 82.5], [578.7, 6.2, 61.4]], [[343.9, 313.7, 490.6], [361.7, 287.2, 488.7], [446.8, 167.5, 275.9], [456.4, 154.6, 259.2], [515.7, 71.8, 160.3], [523.6, 61.0, 148.8], [566.5, 1.5, 99.1], [581.1, 5.5, 74.5]]],
    [[[380.7, 317.5, 443.2], [403.4, 272.2, 423.3], [485.0, 158.8, 279.4], [492.9, 147.8, 266.5], [550.6, 65.5, 165.5], [554.8, 59.8, 156.8], [596.8, 1.8, 83.7], [612.2, 1.3, 58.8]], [[388.4, 305.5, 443.2], [403.4, 272.2, 420.5], [486.4, 158.6, 316.7], [493.2, 147.8, 316.9], [553.2, 61.5, 165.5], [554.8, 59.8, 154.7], [600.7, 1.3, 83.7], [612.2, 1.3, 74.3]], [[395.4, 283.5, 436.7], [403.4, 272.2, 407.6], [493.2, 148.5, 266.5], [503.9, 146.8, 278.2], [555.0, 59.9, 220.3], [558.6, 60.1, 140.9], [601.7, 1.3, 115.3], [616.2, 1.5, 84.6]], [[400.3, 275.0, 517.8], [403.4, 272.2, 448.4], [492.2, 147.8, 332.1], [507.9, 142.6, 306.4], [555.0, 59.9, 167.1], [571.9, 58.2, 164.3], [612.2, 1.3, 87.2], [625.1, 58.3, 92.8]]],
    [[[368.7, 305.3, 440.4], [386.1, 277.3, 413.5], [469.2, 169.5, 275.4], [478.6, 157.9, 258.8], [536.6, 65.1, 160.1], [544.4, 52.3, 148.1], [586.3, 4.2, 78.5], [600.9, 5.0, 50.9]], [[375.0, 295.9, 431.0], [392.4, 270.7, 467.6], [475.6, 161.8, 262.5], [484.9, 148.7, 246.3], [542.9, 54.6, 150.7], [550.7, 46.0, 138.8], [592.6, 4.0, 65.9], [607.2, 5.4, 63.1]], [[372.2, 321.9, 485.0], [389.6, 307.5, 486.1], [472.7, 165.1, 329.1], [482.1, 153.4, 321.8], [540.1, 60.5, 154.7], [547.9, 48.1, 143.4], [589.8, 4.0, 71.5], [604.4, 5.2, 73.4]], [[374.5, 325.0, 488.5], [391.9, 306.6, 484.7], [475.1, 162.3, 334.9], [484.5, 149.7, 265.6], [542.5, 56.0, 179.5], [550.3, 46.2, 168.8], [592.2, 4.0, 102.4], [606.8, 5.4, 79.5]]],
    [[[280.3, 327.1, 445.1], [297.7, 302.4, 435.7], [380.9, 183.4, 279.9], [390.3, 158.3, 266.5], [448.2, 84.6, 166.9], [456.0, 76.2, 163.4], [498.0, 9.1, 84.8], [512.5, 5.0, 61.4]], [[287.6, 318.6, 507.9], [305.0, 288.8, 425.0], [388.1, 161.8, 269.1], [397.5, 155.8, 252.2], [455.5, 76.6, 163.4], [463.3, 65.7, 156.6], [505.2, 4.0, 74.8], [519.8, 5.9, 88.6]], [[292.7, 310.4, 481.7], [310.1, 280.1, 473.5], [393.3, 156.2, 335.2], [402.7, 152.5, 304.0], [460.7, 70.5, 161.5], [468.5, 49.3, 159.6], [510.4, 4.9, 98.2], [525.0, 73.2, 85.8]], [[300.4, 297.8, 481.7], [317.9, 270.3, 385.8], [401.0, 155.2, 304.9], [410.4, 142.4, 304.7], [468.4, 49.4, 199.7], [476.2, 43.2, 167.6], [518.1, 5.6, 105.2], [532.7, 63.3, 71.7]]],
  ],
  plain: [
    [[[379.7, 289.0, 406.4], [387.0, 275.6, 401.7], [393.1, 266.7, 380.4], [399.2, 258.5, 379.7], [405.0, 250.0, 344.6], [412.1, 240.1, 331.0], [419.3, 232.4, 320.4], [424.7, 222.0, 312.0], [430.3, 212.9, 302.6], [436.0, 206.8, 294.6], [480.7, 142.3, 237.2], [484.3, 136.7, 229.9], [487.5, 130.1, 229.7], [492.0, 124.5, 200.9], [500.7, 111.5, 187.0], [503.9, 106.6, 182.6], [508.2, 100.5, 174.9], [537.5, 57.7, 141.1], [540.3, 53.7, 140.6], [543.6, 49.3, 128.7], [546.4, 45.3, 128.7], [550.4, 39.6, 124.5], [556.2, 31.6, 95.6], [559.3, 26.2, 90.7]], [[379.7, 289.0, 406.4], [387.0, 275.6, 401.7], [393.1, 266.7, 380.4], [399.2, 261.5, 379.7], [405.0, 254.2, 344.6], [412.1, 240.1, 331.0], [419.3, 232.4, 320.4], [424.7, 222.0, 334.9], [430.3, 212.9, 337.8], [436.0, 206.8, 337.8], [480.7, 142.3, 237.2], [484.3, 136.7, 229.9], [487.5, 130.1, 229.7], [492.0, 124.5, 200.9], [500.7, 111.5, 238.4], [503.9, 106.6, 238.4], [508.2, 100.5, 238.4], [537.5, 57.7, 141.1], [540.3, 53.7, 140.6], [543.6, 49.3, 128.7], [546.4, 45.3, 128.7], [550.4, 39.6, 124.5], [556.2, 34.7, 95.6], [559.3, 33.2, 90.7]], [[379.7, 289.0, 448.9], [387.0, 275.6, 446.3], [393.1, 273.5, 430.6], [399.2, 261.5, 427.5], [405.0, 254.2, 344.6], [412.1, 252.3, 331.0], [419.3, 238.9, 335.2], [424.7, 222.0, 335.2], [430.3, 212.9, 334.7], [436.0, 206.8, 331.9], [480.7, 142.3, 237.2], [484.3, 136.7, 230.6], [487.5, 130.1, 230.6], [492.0, 124.5, 230.6], [500.7, 111.5, 234.2], [503.9, 106.6, 234.2], [508.2, 105.9, 234.2], [537.5, 57.7, 145.8], [540.3, 53.7, 145.8], [543.6, 49.3, 144.9], [546.4, 45.3, 143.2], [550.4, 39.6, 124.5], [556.2, 37.7, 95.6], [559.3, 33.2, 90.7]], [[382.1, 292.1, 406.7], [389.3, 274.0, 380.4], [395.4, 269.3, 389.3], [401.5, 257.8, 390.3], [407.4, 254.2, 390.3], [414.4, 248.6, 326.7], [421.7, 235.9, 316.2], [427.1, 227.0, 308.2], [432.7, 211.9, 325.8], [438.3, 204.9, 327.9], [483.1, 144.9, 269.1], [486.6, 135.5, 269.1], [489.9, 128.7, 269.1], [494.3, 122.6, 259.5], [503.0, 110.4, 183.8], [506.3, 109.2, 177.9], [510.5, 104.2, 170.9], [539.8, 54.9, 165.7], [542.6, 52.3, 165.7], [545.9, 48.1, 165.2], [548.7, 48.1, 163.8], [552.7, 42.9, 156.1], [558.6, 34.0, 91.6], [561.6, 30.7, 87.2]]],
    [[[420.7, 260.4, 390.5], [429.4, 246.8, 376.0], [436.4, 237.4, 375.7], [441.6, 235.5, 370.1], [447.5, 222.6, 360.3], [454.3, 212.5, 330.7], [461.8, 200.7, 317.1], [466.9, 192.0, 316.2], [469.3, 190.4, 304.2], [474.6, 180.3, 291.3], [520.6, 116.1, 233.5], [523.6, 112.8, 223.6], [527.1, 111.1, 222.2], [531.1, 103.8, 201.6], [539.6, 90.0, 190.3], [542.9, 85.0, 182.8], [545.9, 82.2, 179.5], [574.5, 42.2, 133.1], [577.5, 36.8, 132.9], [580.8, 31.0, 127.7], [582.7, 29.8, 125.2], [586.7, 23.7, 109.7], [593.0, 12.9, 96.8], [595.8, 8.6, 95.2]], [[420.7, 260.4, 419.3], [429.4, 246.8, 419.3], [438.5, 243.5, 417.7], [444.4, 226.6, 412.1], [447.5, 222.6, 357.4], [455.7, 212.2, 330.7], [462.5, 200.5, 317.1], [468.5, 190.6, 312.9], [474.2, 181.0, 303.3], [479.6, 177.0, 291.3], [522.2, 113.5, 230.6], [524.8, 112.6, 227.6], [529.0, 104.8, 228.1], [533.2, 100.1, 228.1], [540.3, 89.3, 183.1], [540.3, 89.3, 182.4], [548.7, 69.8, 173.7], [576.8, 39.0, 133.1], [578.7, 35.4, 132.0], [581.5, 30.0, 125.9], [582.7, 29.8, 119.8], [589.0, 19.0, 103.4], [593.0, 12.9, 96.6], [597.0, 1.8, 90.2]], [[433.6, 250.8, 413.2], [440.4, 241.4, 420.0], [446.3, 224.5, 420.0], [447.7, 222.6, 410.2], [457.8, 215.3, 399.6], [464.1, 200.3, 399.6], [469.5, 190.4, 304.2], [474.9, 180.3, 301.4], [481.7, 179.1, 289.0], [486.4, 159.4, 279.4], [530.0, 104.1, 214.5], [533.7, 99.7, 222.9], [536.5, 97.1, 223.4], [541.0, 96.3, 224.1], [549.2, 67.7, 226.2], [552.5, 65.4, 218.2], [555.5, 59.9, 219.9], [584.6, 42.0, 146.7], [587.2, 35.0, 146.7], [590.4, 33.5, 146.5], [592.8, 28.4, 146.5], [596.8, 2.1, 143.9], [601.2, 1.4, 83.4], [601.0, 1.4, 114.6]], [[437.6, 257.2, 431.0], [444.6, 245.6, 421.9], [446.3, 244.0, 416.3], [454.5, 231.5, 416.3], [461.0, 220.7, 317.1], [468.3, 205.4, 348.8], [475.6, 199.6, 349.9], [480.7, 191.6, 352.1], [486.1, 158.0, 352.1], [491.5, 148.6, 343.1], [534.4, 98.5, 253.1], [536.5, 97.1, 253.1], [541.0, 96.6, 253.1], [545.2, 89.6, 249.2], [553.4, 61.9, 233.7], [555.5, 60.0, 218.0], [555.5, 59.9, 155.9], [588.6, 34.3, 145.8], [591.4, 28.9, 142.7], [594.7, 24.4, 135.2], [597.2, 1.9, 118.1], [600.7, 1.6, 118.6], [601.4, 1.4, 117.4], [601.2, 1.4, 71.3]]],
    [[[406.5, 248.2, 382.3], [413.5, 240.3, 371.7], [419.5, 232.7, 361.0], [425.4, 224.1, 353.0], [431.1, 217.5, 343.4], [437.8, 209.1, 332.8], [445.2, 199.7, 320.2], [450.4, 193.9, 310.6], [455.9, 186.3, 301.4], [461.4, 180.1, 290.9], [505.1, 117.4, 210.7], [508.5, 110.7, 202.7], [511.7, 106.0, 197.8], [516.1, 98.6, 190.3], [524.6, 85.1, 178.4], [527.8, 80.3, 173.0], [531.9, 75.1, 167.6], [560.5, 34.2, 125.2], [563.2, 30.9, 119.8], [566.4, 27.1, 114.9], [569.2, 24.0, 110.4], [573.1, 19.5, 102.9], [578.8, 13.3, 91.2], [581.8, 9.2, 87.7]], [[412.8, 241.0, 373.2], [419.8, 232.6, 361.0], [425.8, 224.3, 353.0], [431.8, 216.6, 350.7], [437.5, 209.7, 356.5], [444.3, 200.9, 356.5], [451.5, 191.9, 344.6], [456.7, 189.9, 301.0], [462.2, 189.8, 288.5], [467.7, 172.8, 278.9], [511.5, 107.5, 198.3], [514.9, 101.1, 193.1], [518.1, 97.8, 187.5], [522.4, 94.4, 182.4], [530.9, 75.7, 169.5], [534.1, 71.2, 164.5], [538.2, 63.9, 157.5], [566.8, 27.7, 114.6], [569.6, 27.6, 109.9], [572.8, 19.8, 104.3], [575.5, 17.0, 100.1], [579.4, 12.2, 91.2], [585.1, 6.0, 81.8], [588.1, 4.3, 74.8]], [[410.0, 244.7, 377.8], [417.0, 234.9, 383.5], [423.0, 227.8, 383.5], [428.9, 220.6, 387.4], [434.7, 214.0, 388.4], [441.5, 204.2, 388.4], [448.7, 201.5, 384.4], [453.9, 201.4, 353.5], [459.4, 202.0, 353.5], [464.9, 176.4, 352.8], [508.6, 110.8, 259.0], [512.1, 109.3, 259.0], [515.2, 109.2, 255.0], [519.6, 107.3, 244.5], [528.1, 80.2, 245.2], [531.3, 75.4, 236.7], [535.4, 68.8, 162.4], [564.0, 33.5, 141.6], [566.8, 33.5, 141.8], [570.0, 33.6, 141.8], [572.7, 33.8, 104.3], [576.6, 16.4, 97.7], [582.3, 8.8, 86.7], [585.3, 5.7, 81.3]], [[412.3, 242.1, 405.7], [419.4, 233.3, 405.7], [425.3, 224.5, 394.5], [431.3, 217.3, 393.8], [437.0, 214.0, 391.9], [443.9, 213.8, 375.3], [451.0, 214.7, 339.6], [456.2, 212.9, 345.3], [461.7, 204.3, 346.9], [467.3, 198.4, 346.7], [511.0, 116.4, 248.0], [514.4, 116.4, 248.0], [517.6, 116.3, 247.5], [521.9, 115.3, 182.8], [530.4, 94.2, 170.2], [533.6, 71.4, 165.7], [537.7, 64.3, 179.1], [566.3, 39.6, 166.9], [569.1, 39.6, 142.0], [572.3, 39.5, 142.0], [575.1, 35.9, 142.0], [578.9, 32.1, 91.4], [584.7, 6.2, 82.3], [587.6, 4.3, 97.5]]],
    [[[318.1, 269.8, 385.1], [325.1, 257.2, 374.6], [331.1, 243.0, 366.1], [337.1, 235.6, 355.8], [342.8, 230.4, 344.1], [349.7, 226.0, 330.3], [356.8, 215.4, 321.6], [362.0, 209.8, 321.6], [367.5, 203.2, 319.7], [373.0, 196.3, 310.6], [416.8, 130.0, 233.0], [420.2, 123.9, 229.2], [423.4, 120.7, 223.4], [427.7, 114.8, 203.0], [436.2, 95.4, 190.8], [439.4, 92.5, 185.4], [443.5, 90.6, 176.3], [472.1, 44.3, 129.9], [474.9, 43.1, 126.3], [478.1, 43.0, 118.8], [480.8, 40.9, 114.4], [484.7, 35.6, 106.6], [490.5, 23.8, 106.6], [493.4, 20.7, 104.5]], [[325.4, 255.5, 374.8], [332.4, 241.5, 364.2], [338.4, 235.0, 381.6], [344.3, 230.2, 384.2], [350.0, 225.7, 384.2], [356.7, 215.7, 381.1], [364.1, 207.9, 379.0], [369.3, 201.4, 366.1], [374.8, 194.0, 366.1], [380.3, 184.8, 282.4], [424.0, 120.0, 222.7], [427.5, 115.4, 203.7], [430.6, 104.6, 207.9], [435.0, 97.0, 211.9], [443.5, 90.7, 212.4], [446.7, 86.2, 169.2], [450.8, 81.9, 164.3], [479.4, 43.1, 117.2], [482.1, 39.6, 112.0], [485.3, 34.3, 106.6], [488.1, 28.7, 106.6], [492.0, 23.0, 106.4], [497.7, 11.1, 96.8], [500.7, 4.7, 82.3]], [[330.5, 244.2, 367.8], [337.6, 235.6, 406.2], [343.5, 234.8, 406.9], [349.5, 227.0, 406.4], [355.2, 218.4, 385.3], [361.8, 210.3, 387.2], [369.2, 201.5, 387.2], [374.4, 195.1, 357.2], [379.9, 185.6, 353.9], [385.4, 166.3, 342.0], [429.2, 111.3, 273.3], [432.6, 100.7, 196.2], [435.8, 96.1, 212.6], [440.1, 93.9, 213.3], [448.6, 85.1, 203.9], [451.8, 81.3, 203.9], [455.9, 76.7, 163.4], [484.5, 36.3, 152.6], [487.3, 31.4, 140.2], [490.5, 24.0, 140.2], [493.3, 21.4, 139.5], [497.1, 13.8, 98.9], [502.9, 4.3, 80.6], [505.8, 4.3, 75.5]], [[338.3, 243.3, 406.7], [345.3, 232.1, 406.9], [351.3, 222.8, 405.5], [357.2, 215.5, 396.4], [362.9, 209.5, 321.8], [369.8, 201.4, 316.9], [377.0, 190.3, 342.9], [382.2, 182.9, 342.9], [387.7, 174.8, 340.6], [393.2, 167.0, 340.3], [436.9, 98.2, 237.2], [440.3, 97.8, 237.9], [443.5, 92.4, 237.9], [447.9, 85.5, 237.2], [456.3, 76.9, 207.0], [459.5, 72.6, 207.2], [463.7, 66.0, 207.2], [492.3, 23.2, 143.9], [495.0, 18.7, 143.9], [498.2, 9.7, 129.1], [501.0, 5.0, 97.5], [504.9, 4.5, 105.7], [510.6, 5.3, 108.5], [513.6, 5.2, 108.5]]],
  ],
} as const satisfies { capW: { tall: readonly number[]; plain: readonly number[] }; tall: readonly (readonly (readonly (readonly [number, number, number])[])[])[]; plain: readonly (readonly (readonly (readonly [number, number, number])[])[])[] };
/** Wall banners (TB-250; director 26 Nov): grove on the 2nd tall post, tide on the 4th (1-based, nearest first). On wall0 each standard
 *  stands on its post's cap; on wall1-3 it stands on a post of that tier (log, stone pillar, red pilaster: `post[tier]`) planted behind
 *  the wall, rising `postOver` cap widths above its top (stage 0, so it stays whole as the wall breaks); its foot is drawn `postSink` below the
 *  top, where the wall hides it (the orc-side foot row showed the post's base past the wall's sloped bottom edge). Sizes in cap widths:
 *  the standard's pole height `standardH`, the post's width `postW`. */
export const WALL_BANNERS = {
  spot: { wall_banner_grove: 2, wall_banner_tide: 4 },
  post: [null, 'wall_post_log', 'wall_post_stone', 'wall_post_pilaster'],
  postOver: 1.8, postSink: 3, postW: 0.8, standardH: 3.0,
} as const;
/** Wall lanterns and skulls (TB-250; director 26 Nov), the same spots on every tier (1-based, nearest first). Lanterns hang from
 *  alternate tall posts, skipping the two banner posts (`lantern.posts`): the bracket's top on the spot's top, the lantern down the
 *  orc-side face. Skulls stand on every 3rd plain post (`skull.posts`, about 8 at 1080p): the stake's tip on the spot's top. Both
 *  follow the top as the wall breaks and are drawn over the wall. Height in that post's cap widths (`h`). */
export const WALL_PROPS = {
  wall_lanterns: { row: 'tall', posts: [3, 5, 7], h: 3.0 },
  wall_skulls: { row: 'plain', posts: [3, 6, 9, 12, 15, 18, 21, 24], h: 1.4 },
} as const;
/** The wall cosmetic sprites (public/decor/<id>.webp, written by post_wall_decor.py from wall_standard.py / wall_post.py / wall_prop.py renders): image
 *  size, the foot (the pole's, post's or stake's bottom centre) and, for posts and props, the top (the post's near rim, the lantern bracket's top; px) and the px per post width (`unit`). */
export interface WallDecorRect { readonly w: number; readonly h: number; readonly foot: readonly [number, number]; readonly top?: readonly [number, number]; readonly unit?: number }
export const WALL_DECOR_ART = {
  wall_banner_grove: { w: 150, h: 420, foot: [74.9, 415.4] },
  wall_banner_tide: { w: 150, h: 420, foot: [74.9, 415.4] },
  wall_post_log: { w: 159, h: 640, foot: [39.6, 588.9], top: [39.6, 37.0], unit: 70.81 },
  wall_post_stone: { w: 162, h: 640, foot: [44.1, 579.6], top: [44.1, 37.6], unit: 69.55 },
  wall_post_pilaster: { w: 174, h: 640, foot: [56.8, 578.1], top: [56.8, 39.1], unit: 69.15 },
  wall_lanterns: { w: 91, h: 200, foot: [43.1, 199.5], top: [40.2, 1.8], unit: 168.32 },
  wall_skulls: { w: 115, h: 200, foot: [56.9, 198.7], top: [55.5, 12.4], unit: 225.09 },
} as const satisfies Readonly<Record<string, WallDecorRect>>;
export type WallDecorId = keyof typeof WALL_DECOR_ART;


/** The wall's visible damage (TB-238, TB-209). stages: the health fractions below which the next rendered stage shows. Debris on a stage change: chunks per breach, speed, life, size, spin, gravity. Dust: puffs per breach, per blow, speed, life, radius, growth/s, alpha.
 *  Flames burn in the breaches from flameStage on: tongues, height, half width, spacing, flicker rate, embers/s. maxBits caps flying bits. */
export const WALL_DAMAGE = {
  stages: [0.75, 0.5, 0.25],
  chunks: 9, chunkSpeed: 90, chunkLife: 0.9, chunkR: [2, 5], chunkSpin: 12, grav: 240,
  puffs: 10, hitPuffs: 2, dustSpeed: 26, dustLife: 0.8, dustR: 4, dustGrow: 12, dustAlpha: 0.55,
  flameStage: 2, tongues: 3, flameH: 11, flameW: 2.6, tongueGap: 3, tongueDrop: 1, flameCore: 0.5, flicker: 9, emberRate: 7, maxBits: 160,
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
  /** Phone tier (TB-218 P6): 1920x1125 plate (8.6 MB decoded instead of 61 MB). */
  srcPhone: 'decor/camp_backdrop_half.webp',
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
    { x: 92.2, y: -184.2, w: 232.8, h: 236.0, top: [227.0, -184.0] },
    { x: 73.2, y: -192.5, w: 248.5, h: 231.5, top: [220.0, -190.0] },
    { x: 67.2, y: -237.8, w: 279.8, h: 279.5, top: [227.8, -235.2] },
  ],
  forge: [
    { x: 371.5, y: -10.0, w: 192.2, h: 160.0, top: [461.9, -9.8] },
    { x: 340.8, y: -33.5, w: 228.0, h: 186.5, top: [450.4, -31.0] },
    { x: 340.8, y: -92.5, w: 255.5, h: 244.0, top: [469.4, -92.2] },
  ],
  kitchen: [
    { x: 591.8, y: -141.2, w: 236.2, h: 180.2, top: [797.6, -141.0] },
    { x: 580.5, y: -127.5, w: 257.2, h: 165.2, top: [666.9, -127.2] },
    { x: 586.5, y: -120.0, w: 262.2, h: 165.5, top: [713.8, -119.8] },
  ],
  training: [
    { x: 838.5, y: 27.8, w: 247.5, h: 121.2, top: [910.4, 28.0] },
    { x: 847.5, y: -5.8, w: 236.8, h: 151.5, top: [967.1, -5.8] },
    { x: 814.5, y: 8.2, w: 304.2, h: 141.5, top: [899.8, 8.5] },
  ],
}/*END*/;
/** Level-0 plot images (public/decor/camp/<id>0.webp, TB-188m): the unbuilt Tripo plots, rendered by render_camp_backdrop.py and post_camp.py like
 *  the levels above (printed by post_camp.py; do not edit by hand). Drawn in place of the vector placeholder once loaded. */
export const CAMP_ART0: Readonly<Record<keyof typeof CAMP_ART, CampArtRect>> = /*ART0*/{
  bowyer: { x: 110.2, y: -136.5, w: 204.0, h: 178.2, top: [283.9, -136.0] },
  forge: { x: 394.8, y: 74.8, w: 152.5, h: 75.2, top: [502.2, 75.0] },
  kitchen: { x: 635.5, y: -79.8, w: 179.5, h: 120.8, top: [724.0, -79.8] },
  training: { x: 878.0, y: -15.8, w: 175.0, h: 167.2, top: [968.1, -15.5] },
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
    { dx: -105, dy: -6, right: false, s: 1.0, phase: 0 }, { dx: -5, dy: -6, right: true, s: 0.92, phase: 0.55 },
    { dx: 285, dy: -12, right: false, s: 1.08, phase: 0.3 },
  ],
  birds: { n: 5, y0: -262, y1: -228, speed: [9, 16], flap: [1.4, 2.4], span: 7, a: 0.8, margin: 60 },
} as const;
/** Elk sheet layout (scene units for the rect; `n` frames in a grid of `cols`, played at `fps`), written by post_elk.py, which also
 *  trims each elk to one contact shadow under its hooves (the long antler streaks and a second hind-leg smear read as stray marks). */
export interface CampSheetRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly n: number; readonly cols: number; readonly fps: number }
export const CAMP_ELK_ART: CampSheetRect = /*ELK*/{ x: 567.7, y: -161.0, w: 57.3, h: 56.0, n: 64, cols: 8, fps: 6.0 }/*EEND*/;
export const CAMP_ELK_R_ART: CampSheetRect = /*ELKR*/{ x: 570.7, y: -161.0, w: 62.0, h: 56.3, n: 64, cols: 8, fps: 6.0 }/*EREND*/;
/** Scene point under the rendered elk's hooves (render_camp_backdrop.py ELK_AT): the anchor each elk scales about. */
export const CAMP_ELK_FOOT = { x: 600, y: -110 } as const;

/** Camp decor (TB-250 batch 2): each piece appears in the camp once the achievement whose cosmetic it is has been earned; it has no
 *  wear slot. Boss trophies (a boss's head cut from its model by build_trophy.py, on a shelf before a round wooden plaque on a post)
 *  stand in a row on the meadow between the kitchen and the training ground; path banners (a pennant in the path's deep tint with its sigil, on a pole)
 *  stand above the road; the seven camp_* props (Tripo Smart Mesh models, TB-250) stand on open meadow clear of the buildings and elk.
 *  Rendered by render_camp_backdrop.py's trophy_*, banner_* and camp_* passes with the buildings' camera, sun and
 *  4 px per unit, cropped by post_decor.py to public/decor/camp/<id>.webp, drawn at x, y (top-left), w x h scene units. `foot` is
 *  the scene y the piece stands on: decor and buildings are drawn back to front by it. Rects are printed by post_decor.py. */
export interface CampDecorRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly foot: number }
export const CAMP_DECOR_ART = {
  trophy_warboss: { x: 823.5, y: -79.8, w: 64.5, h: 74.0, foot: -28 },
  trophy_ogre: { x: 886.0, y: -91.8, w: 45.0, h: 62.0, foot: -40 },
  trophy_orc: { x: 929.5, y: -83.8, w: 44.5, h: 61.2, foot: -32 },
  trophy_raider: { x: 972.2, y: -95.8, w: 44.8, h: 62.2, foot: -44 },
  trophy_ogre_creature: { x: 1015.2, y: -85.8, w: 44.8, h: 62.2, foot: -34 },
  banner_serpent: { x: 607.2, y: 127.5, w: 48.2, h: 80.8, foot: 192 },
  banner_fox: { x: 651.0, y: 121.5, w: 59.8, h: 86.8, foot: 186 },
  banner_magpie: { x: 727.5, y: 127.5, w: 43.2, h: 69.0, foot: 192 },
  camp_bell: { x: 904.0, y: 132.8, w: 61.8, h: 67.8, foot: 198 },
  camp_campfire: { x: 677.2, y: 82.2, w: 57.5, h: 26.8, foot: 109 },
  camp_lantern_string: { x: 631.0, y: -213.2, w: 150.2, h: 91.5, foot: -122 },
  camp_sapling: { x: 377.0, y: -139.8, w: 72.0, h: 72.0, foot: -68 },
  camp_standing_stone: { x: 259.5, y: 146.5, w: 42.5, h: 46.0, foot: 192 },
  camp_wolf_statue: { x: 206.5, y: 88.2, w: 32.5, h: 46.8, foot: 133 },
} as const satisfies Readonly<Record<string, CampDecorRect>>;
export type CampDecorId = keyof typeof CAMP_DECOR_ART;

export const CAMP_LIFE = {
  cap: 120,
  sparks: { rate: 3.5, life: [0.45, 0.85], vx: [-7, 7], vy: [-30, -17], grav: 30, wind: 0, r0: 0.9, r1: 0.5, a: 1 },
  dust: { every: [1.6, 2.6], burst: 6, life: [0.5, 0.8], vx: [-11, 11], vy: [-8, -3], grav: 14, wind: 0, r0: 1.4, r1: 3.2, a: 0.55 },
  dustDy: 0.3,
  /** Upgrade moment (TB-188h): dust puffs along the building's base (`count`, spread = fraction of its width each side of centre, starting `rise` units above the base) and a few gold motes that float up. Same pool, so it is bounded by `cap`. */
  build: { count: 22, spread: 0.5, rise: 2, motes: 8, dust: { life: [0.7, 1.2], vx: [-16, 16], vy: [-14, -4], grav: 8, wind: 0, r0: 2, r1: 5, a: 0.7 }, mote: { life: [0.9, 1.5], vx: [-6, 6], vy: [-26, -14], grav: -4, wind: 0, r0: 1.1, r1: 0.4, a: 1 } },
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
   *  up; `glow` the halo radius × size; `flare` a bright ring at the origin (rem radius) and its life (s); `spawn` the radius (rem) sparks scatter from so frame 1 is no blob. Rem so 1080p and 4K match. */
  burst: { count: 64, speedMin: 6, speedMax: 19, lifeMin: 0.5, lifeMax: 1.0, sizeMin: 0.16, sizeMax: 0.4, gravity: 34, drag: 0.93, lift: 8, fan: 1.9, glow: 1.8, glowAlpha: 0.14, flare: 1.6, flareLife: 0.28, spawn: 5 },
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
  stampIn: 260, stampFrom: 1.5, stampHold: 1100, stampOut: 400,
  /** Wall bar shake on a hit: rem amplitude per hit fraction of max HP (capped at `shakeMax`), ms. */
  shakeK: 6, shakeMax: 0.6, shakeMs: 360,
  /** Odometer: ms each changed digit's strip rolls from its old digit to its new one (all together, no overshoot). */
  odoRoll: 480,
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
/** `hudFrac` x the canvas height (`phoneHud` CSS px on a phone) is the band from the view top kept clear of tree crowns: the top plaques, wall bar and buttons sit there (TB-220; they end at 8.9% of the height at 1080p, 10.7% at 720p). */
export const FIELD_VIEW = { reach: 24, phoneStripLift: 28, hudFrac: 0.11, phoneHud: 56 } as const;
/** Phone landscape (TB-218): coarse pointer on a short screen. The wave strip lifts `phoneStripLift` world px clear of the gesture bar. */
export const PHONE_QUERY = '(pointer: coarse) and (max-height: 540px)';

/** Baked burning/chilled sprite frames (TB-216d). A glowing frame bakes whole at its drawn device height snapped to
 *  `quantum` px, with its sub-pixel offset snapped to 1/`sub` px, and is blitted 1:1 on whole pixels (TB-216f); `steps` is the per-doubling bucket of heightBucket(); past `cap` baked
 *  frames the whole cache is dropped and rebuilt on demand. */
/** TB-278 night on the backdrop plate: each sprite frame gets a night copy (desaturated by `sat`, multiplied by P.nightSprite),
 *  baked once per frame and drawn over the day frame at the dusk weight, so characters cool and darken with the director's
 *  night target. Skipped below `min`; at most `cap` night frames are held (the cache drops whole past it). */
export const NIGHT_SPRITE = { sat: 0.7, min: 0.02, cap: 1024 } as const;
export const SPRITE_BAKE = { steps: 4, cap: 2048, quantum: 0.5, sub: 4 } as const;
/** Phone-tier bakes (TB-218 P1): the rim bake snaps its height to a coarser `quantum` and its offset to whole device px (`sub` 1),
 *  flash bakes too (no live brightness filter), and the cache is held under `maxBytes` of pixels (dropped whole past it). */
export const SPRITE_BAKE_PHONE = { cap: 2048, quantum: 4, sub: 1, maxBytes: 11_000_000 } as const;

/** Render quality (TB-218 P2, P3). Phone tier: weak or touch device. `ladder` is the field backing scale the governor steps along
 *  (slow = mean draw interval over `slowMs` across a `window`-frame stretch for `downAfter` s; fast = mean draw cost under `fastMs` for `upAfter` s, doubling to `upAfterMax` when a step up is undone within `undoWithin` s); `gap60` and
 *  `gapFloor` are the minimum ms between draws (60 Hz on a 120 Hz screen, then the 30 fps floor). `shared` and `sharedMp` cap every
 *  other canvas (camp, tree, juice). Desktop: scale cap 2, no frame cap, the old 900 particles. */
export const QUALITY = {
  weakMemGb: 2, weakCores: 2, ladder: [1.5, 1.25, 1] as readonly number[], phoneStart: 1.25, phoneHigh: 1.5, minScale: 1, desktopScale: 2,
  fieldMp: 1.0, haloK: 0.6, shadowPx: 64, phoneParts: 300, deskParts: 900, resizeSettleMs: 250, gap60: 15, gapFloor: 30, shared: 1.5, sharedMp: 1.0,
  governor: { window: 60, every: 15, slowMs: 20, fastMs: 8, downAfter: 3, upAfter: 10, upAfterMax: 80, undoWithin: 30 },
} as const;

/** Walk gait (TB-236): world units walked per walk-clip cycle, per unit of the actor's radius, by atlas key. The walk clip
 *  plays one cycle per stride of ground covered, so the feet match the march at any speed (chill, rage, drum, spd nodes)
 *  and stop when the actor stops. Measured from the packed frames (lowest-foot travel per cycle, slide audit 5 Nov);
 *  Jogging orcs (TB-255): old foot-sweep value x (jog root travel 1.69 m / that walk's sweep: Orc Walk 0.87, Sword And Shield 0.795); a foot's sweep is only the stance and under-reads the stride.
 *  Vanguard (TB-256): old sweep x 1.909, Walking XBot's root travel per cycle over its foot sweep (1.342 / 0.703 m); a walk covers two stances per cycle.
 *  Wolf (TB-265): the mean speed of every paw vertex in ground contact over the run clip (0.00229 gltf units/frame x 19.2 frames x 1142
 *  field units per gltf unit) = 50.3 units per cycle; 2.14 planted only the hind paws, so the gallop cycled 4.1/s at speed 105 (now 2.1/s).
 *  Roster bosses without a measured stride use `boss`. */
/** Ground shadow under an orc, in radii: centre offset dx (toward its back) and half-width/height. The wolf rider anchors at the wolf's chest (TB-210). */
export const ORC_SHADOW: Readonly<Partial<Record<string, { dx: number; rx: number; ry: number }>>> = { wolfrider: { dx: 2.4, rx: 1.6, ry: 0.4 } };
export const ORC_SHADOW_BASE = { dx: 0, rx: 0.9, ry: 0.35 } as const;

export const GAIT = {
  strideR: {
    'orc.grunt': 3.25, 'orc.runner': 2.53, 'orc.brute': 2.41, 'orc.berserker': 3.0, 'orc.shaman': 2.79, 'orc.drummer': 2.78,
    'orc.wolfrider': 2.54, 'orc.boss': 4.05, 'orc.orcBoss': 1.63, 'orc.ogreCreature': 1.68, 'orc.ogre': 1.89, 'van.spear': 4.01, 'van.blade': 3.4, wolf: 4.19,
  } as Readonly<Record<string, number>>,
  boss: 2.08,
} as const;

/** One-shot flipbooks: one strip of `n` frames `px` square in public/vfx, played at `fps`; (`ax`, `ay`) is the anchor as a fraction of the
 *  frame, placed on the event point. `lit` strips (TB-262) are Cycles renders under the actors' sun (render_vfx.py: dust, clods, splinters,
 *  ice shards with their ground shadow) and draw smoothed; the rest are unTied Games pixel strips (TB-240, CREDITS.md) drawn unsmoothed. */
export const FLIPBOOK = {
  impact: { src: 'vfx/impact.webp', n: 7, px: 192, fps: 15, ax: 0.5, ay: 0.5, lit: true },
  lightning: { src: 'vfx/lightning.webp', n: 7, px: 128, fps: 15, ax: 0.5, ay: 0.9, lit: false },
  shatter: { src: 'vfx/shatter.webp', n: 8, px: 160, fps: 15, ax: 0.5, ay: 0.5, lit: true },
  death: { src: 'vfx/death.webp', n: 10, px: 160, fps: 15, ax: 0.5, ay: 0.5, lit: true },
  walldust: { src: 'vfx/walldust.webp', n: 21, px: 128, fps: 15, ax: 0.5, ay: 0.5, lit: true },
  slam: { src: 'vfx/slam.webp', n: 9, px: 192, fps: 15, ax: 0.5, ay: 0.5, lit: true },
} as const;
export type FlipbookKey = keyof typeof FLIPBOOK;
/** Drawn frame width per event, in world px: × strike radius (impact, ring radius 46 of 96 px drawn at 1.15 r), × orc radius, or flat; wall dust sits wallDustDx in front of the wall line (orc side) so the wall does not hide it. */
export const FLIPBOOK_SIZE = { impactPerR: 2.4, lightningPerR: 7, shatterPerR: 2.4, deathPerR: 4, wallDust: 40, wallDustDx: 16, slamPerR: 3.2 } as const;
/** Most flipbooks alive at once (TB-240): a mass kill at the 160-orc cap must not cost a frame; extra ones are dropped. */
export const FLIPBOOK_CAP = 80;
/** The field's wave progress strip as a carved rail (TB-263, art/ui/carve_hud.py `wavebar`, lit like the HUD): source px of the 2x
 *  piece, the end caps that do not stretch (`cap`), where the channel's fill starts inside each end (`inset`, inner edge of the gilt
 *  band) and the channel's share of the piece height (`chan`). The fill is the wall bar's lit heartwood. */
export const WAVE_STRIP = { src: 'ui/wavebar@2x.webp', fill: 'ui/wallbar-fill@2x.webp', w: 1280, h: 64, cap: 80, inset: 66, chan: 0.3 } as const;
