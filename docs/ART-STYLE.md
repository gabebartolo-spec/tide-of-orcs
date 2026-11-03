# Art style

Status: **Current** (v1.4, docs bug bash 3 Nov 2026, TB-204). References: Thronefall (soft pastoral low-poly, cream-and-sage, dusk lighting) and Esoteric Ebb (deep ink blues, lamplit amber, lilac highlights, hand-set serif UI). The prototype in `docs/prototype.html` already uses this palette; keep it.

## Palette tokens (`src/render/palette.ts`)
| Token | Hex | Use |
|---|---|---|
| ink | #161d15 | Page background, night ground |
| ink2 | #1f281d | Panels |
| ink3 | #2a3527 | Raised controls, disabled |
| line | #3b4a37 | Borders, locked edges |
| cream | #efe6d2 | Primary text, arrows, hit flash |
| creamDim | #b9b09c | Secondary text, labels |
| sage | #8fa98a | Plain highlight patches |
| sageDeep | #6b8468 | Plain base (field is #7c9676 / #86a07e patches) |
| sand | #c9b78a | Wall's inner edge, fireball dust ring |
| ember | #ffb061 | Fireball body, ember sparks, cooling puffs (TB-127) |
| fireCore | #fff1c8 | Fireball pale core, strike flash |
| fireGlow | rgba(242,118,58,.55) | Fireball halo (shadow blur) |
| timber / timberDark | #8a6a46 / #7a5c3c | Barricade planks (alternating) |
| timberSplinter | #4e3a28 | Broken planks shown from the top as HP drops |
| timberBand | #5a4634 | Cross-bands on the wall, bark, hawk, bolts |
| treeWood / treeWoodLit | #5c4630 / #9a7650 | Skill-tree boughs and their lit core (TB-163) |
| treeGlow | rgba(205,189,234,.22) | Arcane halo round grown skill-tree wood (TB-163) |
| lightHot / linkDim / glowClear | #fff8ec / rgba(205,189,234,.26) / rgba(0,0,0,0) | Hot white core of owned tree links; thin still line of locked links; transparent gradient stop (TB-190b) |
| BRANCH_LIGHT | Bow #b98cff, Companions #ffb35a, Armoury #ff6f5e, Grove #8ff07a, Barricade #ffc46e, Vanguard #6fd2ff, Spoils #ffe98a | Per-branch light colour for skill-tree bloom, pools, pulses and motes (TB-190b) |
| PATH_TINT | Serpent #86c79a / light #5dffa8 / deep #2f5a3e / pale #d8f5c8; Fox #e39a5c / #ff8a3d / #7a3f1e / #fbe3c4; Magpie #a8bde0 / #7fb4ff / #28324a / #f2f4fa | Specialisation paths (TB-193c): node rings and labels, path-branch neon, sigils and the chosen card's glow; mirrored in style.css as `--path-<id>` |
| spear | #8fb7c9 | Spearman cloak, vanguard HP bars, Vanguard branch |
| blade | #cdbdea | Bladedancer cloak (shares lilac) |
| amber | #e2a85b | Starlight, affordable pulse, buy and rally buttons, boss crown, burn, wall bar when under 50% |
| rose | #c76f6f | Heartwood, orc HP bar, wall bar under 25%, the fallen overlay's big number |
| lilac | #cdbdea | Elf, lightning, Bow branch |
| moss | #7f8f52 | Grunt skin; brute #6c7a44; boss #9a7a46; tusks/eyes #39412a |
| wolf | #9aa3ad | Wolf |
| bark | #5a4634 | Hawk, ballista, bolts |
| wallBar | #c9a06a | Wall bar above 50%, Barricade branch |
| nodeOwned, nodeLabelLocked | #2b3448, #6b7383 | Tree: bought-not-maxed node fill, locked node label |
| wallShade, burnGlow | ink 30%, amber 50% | Barricade shadow strip, burning orc glow |
| plain, plainPatch | #7c9676, #86a07e | Field base, legacy patch tone |
| plainLush, plainWorn, plainBare | #728d6c, #8e9a72, #a09c80 | Ground (TB-098): lusher grass drifts, worn dry grass, barren earth core |
| tuft, tuftLight | #5e7858, #a3b993 | Grass tuft blades (dark, sunlit) |
| rock, rockLight | #8f9597, #b7bbb6 | Small rocks and pebbles, their top highlight |
| hillFar, hillNear | #5a7058, #4f644d | Parallax hill bands |
| lamp, lampClear | amber 20%, amber 0% | Lamplight on the grove bank at night |
| grove | #9fc48f | Grove branch, Deep Roots regrow burst |
| orc, brute, elite, boss, tusk | #7f8f52, #6c7a44, #4f5a3a, #9a7a46, #39412a | Orc skins by kind (`orc` = grunt and runner) |
| elfCloak, archerCloak | #5f6f8a, #8b9a7d | Elf cloak, ranger/warden cloak |
| knife | #d9d4c3 | Throwing knives |
| treantTrunk, treantLeaf, treantLeaf2 | #4e5e3f, #5f7d53, #6f8f60 | Treant |
| aimLine, aimFill | cream 25%, cream 8% | Strike circle outline and lob arc, circle fill |
| bloodOrc, bloodElf | #7a4a2c, #6e3a44 | Blood (TB-088): orc blood a dark rust-ochre, elf/vanguard blood a deep wine. Muted on purpose; never rose, which stays Heartwood/danger |
| shadow, dim, dim45 | ink-dark 25%, ink 60%, ink 45% | Actor shadows; HUD and HP bar backs, wave bar track |

Branch colours: Bow = lilac, Companions = amber, Armoury = rose, Grove = #9fc48f, Barricade = #c9a06a, Vanguard = #8fb7c9.

Rules: semantic colours (amber = money, timber = the wall, rose = permanent/danger, spear-blue = your troops) are not decorative; don't reuse them elsewhere. Neutrals are all slightly blue-biased; never pure grey.

## Shape language
- Everything is soft ellipses and chamfered blocks drawn in code. A sprite atlas loader (TB-060) draws an actor from a sheet when its key is present (§Asset pipeline lists the shipped keys); any actor without a key falls back to the vector draw, which keeps the Thronefall "toy board" feel and scales to any DPR.
- Shadows: flat 25% ink ellipses under every actor.
- Orcs: round body, two dark tusk-blocks, two cream teeth, size = threat. Boss gets an amber crown. Brute is darker and wider; runner is small and quick; Elite (Blackguard) is mid-sized (radius 14) in the darkest skin, `elite`. No faces beyond this.
- Elf: lavender head, slate cloak triangle, cream bow arc. Archers share the cloak but dimmed.
- Vanguard: same silhouette as the elf. Spearman: spear-blue cloak, round timber shield on the left, long cream spear. Bladedancer: lilac cloak, two short cream blades. HP bar above when hurt.
- Barricade: 14 px column of alternating planks with dark cross-bands, sand edge on the grove side, cream spike triangles on the plain side once Thornwall is owned.
- Wolf: grey ellipse + head circle. Hawk: the `hawk` flap sprite (bark diamond only while the sheet loads). Treant: stacked green circles on a trunk.
- Item glyphs (TB-097): one 24-unit line icon per gear slot (bow, quiver, bracer, cloak, boots, charm), round caps, 35% tinted fill, in the rarity colour. The frame shape also marks rarity so it never rests on colour alone: common faint, rare solid, epic double line, legendary square-cornered, mythic glowing. Fallback until TB-103 model renders.
- Arrows are 14 px cream lines; knives 8 px pale; ballista bolt 22 px bark, 3 px wide.
- Strike circle (TB-079): a disc of radius `stats.radius` (40 px × 1.2^Wide Volley) filled `aimFill` and outlined `aimLine`, with a cream ring that fills clockwise from the top as the bow draws; a dotted `aimLine` arc from the elf traces the lob's flight. In flight a lob is a short shaft along its arc with a ground shadow; on landing a cream ring flashes at the circle. The OS cursor is hidden over the field (`cursor: none`). Nothing is drawn when the pointer is over the grove side or the wall has fallen.

## Ground (TB-098)
The plain reads as natural, calm grassland, not a flat board. Layout is seeded (`GROUND.seed`, `src/data/presentation.ts`) and painted once to an offscreen canvas in `src/render/ground.ts`, repainted only when the canvas size or DPR changes, then blitted each frame (no per-frame decoration cost). One ground covers both sides of the wall (TB-174): the grove behind the elf is the same grass as the plain; only the wall and a strip `GROUND.wallGap` wide in front of it stay clear.
- Layers, bottom up: plain base; lusher drifts (`plainLush`); worn dry-grass patches (`plainWorn`) with a smaller barren-earth core (`plainBare`); rocks; tufts. Patches are clusters of squashed ellipses (same soft-ellipse language as the actors) feathered by a few stacked low-alpha passes, so edges are soft without a blur filter.
- Tufts: 4–7 curved blades fanning from one root, mostly `tuft` with about a third `tuftLight`; some grouped in clumps, some single. Kept low-contrast so orcs, blood, VFX and the strike circle read on top.
- Rocks: flat-ink shadow offset down-right, `rock` body, `rockLight` top-left highlight, 0–3 pebbles beside each; half sit on worn patches, where ground is thin.
- Hills draw over the ground each frame. No colour wash sits over the field (TB-174): the dusk tint and the sun shafts were cut because they muted every colour; dusk now shows only as brighter motes and the lamplight on the bank.
- Grove decor: none. TB-174's Sketchfab props were removed (TB-187, director 3 Nov); the grove becomes an elf encampment (TB-188).

## Typography
- Display: **Heartwood**, the game's own elf hand (TB-135). One weight (400), no italic: the title's "Orc!" is amber, not slanted, and big numbers are not bold. `font-synthesis: none` (on body) stops the browser faking either. There is no fallback face (TB-137): every glyph the game shows must exist in Heartwood (97 now, incl. · × − – … ∞ →); add new ones to `glyphs.py` before using them in text.
  - It is condensed (n advance 0.437 em vs Spectral's 0.590, same x-height 0.45 em), so display sizes are 2 to 4 px larger than they were in Spectral: title 30, stats 22, fallen title 34, big numbers 44 / 38, names 20.
  - Shape language: a broad nib at 30°, stems open with a wedge flag (a curved leaf flag on ascenders), pointed ogee shoulders, right legs end in an outward leaf flick, crossbars are thin leaves, dots are leaf lozenges.
  - Source: `tools/typeface/` (see its README). Rebuild, then copy `out/Heartwood-Regular.woff2` to `src/ui/fonts/heartwood-400.woff2`. Kerning pairs live in `glyphs.py` `KERN`; tabular figures (`tnum`) are generated by `build.py`.
- Body/UI: **Heartwood** too (TB-137): it is the only font, DOM and canvas (field, particles, tree). Labels uppercase at 0.875rem (17.5 px at 1080p) with 0.12 em tracking. Bold markup renders at 400.
- All fonts ship with the game as woff2 in `src/ui/fonts/`, declared in `src/ui/style.css`; no web font service (TB-118). Heartwood is original to the game; Spectral and Atkinson were removed in TB-137. A new weight or style needs its file added there.
- Tabular numerals everywhere numbers change.
- Readability (TB-138, TB-191): body 1rem = 1/54 of window height (20 px at 1920×1080, 40 px at 3840×2160 DPR 1, 20 CSS px = 40 device px at DPR 2; never under 16 px), so it reads from a couch on a TV. Floor: no text under 0.875rem (1.62% of screen height) on PC; only the ≤540 px phone layout goes smaller. Canvas: tree labels 14 layout px × `uiScale()`; field HUD 13 and damage numbers 15 field units (≈2.7% / 3.1% of screen height) × `textScale()`. Settings › Text size (80–160%) multiplies all of it; text is warm parchment `--text` / `P.text` (#ecdcb4), secondary `--text-dim` / `P.textDim`, every DOM text has a dark ink halo (`text-shadow`), canvas labels a 4 px ink shadow and +3 px.
- Run layout (TB-138): the 15:8 field fills the window (fit, letterboxed), frame 16 px; header stats float over the field. The far hills run across grove, barricade and plain, drawn over the fence.

## Motion
- Orc walk: 1.5 px vertical bob at 8 rad/s. At the wall or on a vanguard: stop, keep bobbing, timber splinters fly on each swing.
- Hit flash: body fills cream for 0.12 s.
- Kill burst: 10 moss squares; crit: text "crit". Wall hit: 3 timber squares. Vanguard rallied: 8 cream squares at the wall; vanguard fell: 14 spear-blue squares.
- Screen shake: transform jitter up to 6×4 px, decays at 3/s; grows with wall damage fraction ×4, and +0.2 on each treant stamp. HUD bars don't shake.
- Deep Roots regrow: 40 grove-green squares bursting from the wall's centre.
- Fallen overlay: field dims to 82% ink, title in Heartwood, summary line, big rose number for the Heartwood this run's cleared boss waves paid (0 if none; a fall pays none), one amber button.
- Storm: jittered lilac polyline, 0.35 s fade.
- Affordable node: amber ring, 0.5–1.0 alpha sine at 4 rad/s. Rally buttons: border turns amber on hover when affordable.
- Replant: tree desaturates, amber particles rise, one seed falls, field fades up through a #e2a85b-tinted overlay. ≤ 4 s.
- UI eases (TB-194): camp pages and tabs fade in over 200 ms (`--ui-in`); the fallen overlay and toasts fade in over 200 ms and out over 150 ms (`--ui-out`), the toast also drops 6 px into place. Opacity only on pages and tabs. All off under reduced motion (`data-calm` on `<html>`, from the Motion setting).
- UI motion and feedback kit (TB-195a, `src/ui/juice.ts`, numbers in `JUICE`, plan docs/plans/game-ui.md §3): UI moves on a spring (easeOutBack, overshoot 1.2): 120 ms pops, 220 ms panels, 400 ms screen moves. Changing numbers count up over 400 ms (ease-out, never past the target), pop 1.15 → 1 and flash `grove` green up or `rose` red down (the header starlight counter first). Buttons press to 0.9 in 50 ms and spring back in 120 ms with the `uiPress` sound; buying a tree node also bursts 64 glowing star-gold/spark/amber sparks in an upward fan with a flare ring on a full-screen canvas overlay (TB-195b). Lists stagger children 30 ms apart, rising 8 px. UI sounds go through `uiSound` (`src/data/audio.ts`), silent until the TB-195g files land. Reduced motion keeps colour flashes and sounds, drops scale, roll, rise and particles.
- Game HUD (TB-195b, numbers in `HUD`): the wall bar fill eases on the spring over 380 ms, tone grove > 50 % > amber > 25 % > rose (rose throbs); the carved bar swaps to its cracked pieces (`wallbar-crack1/2/3`, TB-195h) at 75/50/25 %, and the lit `wallbar-fill` is clipped by width, never stretched; the gem and the wave banner are the `gem` and `banner` pieces, the banner reading WAVE and its number on one line; a hit shakes the bar up to 0.35 rem for 220 ms. The starlight gem pops and sprinkles a small burst on gains; its odometer digits roll 380 ms. A wave clear slams a CLEARED stamp from 2.4x in 260 ms onto the hanging wave banner, holds 1.1 s, fades 400 ms. Reduced motion: no shake, roll, slam or sparkle.
- Tooltip plates (TB-195c, `src/ui/plate.ts`, numbers in `PLATE`): hovering a tree node floats the carved `plate` piece (9-slice 40 px) 1.25 rem below-right of the cursor, flipped to stay on screen; a new node springs it in (120 ms pop). It shows name and rank, then up to 3 changed stats as big *now → next* digits (next in `grove` if better, `rose` if worse), one italic line of flavour, and the cost as a gem chip. The detail card keeps one line of prose. Reduced motion: no pop.
- Tab tokens (TB-195d, numbers in `--tok*` on `:root`): each panel tab wears its carved token (`token-bow` tree, `token-satchel`, `token-seed` replant, `token-cog` settings) 2.4 rem above the label, dimmed until chosen; the chosen token springs forward (scale 1.3, raised 0.25 rem, amber glow) in 220 ms on easeOutBack and its pane fades in while rising 0.75 rem. They replace the active-tab sprout. Reduced motion: no spring, no rise.
- Satchel as an object (TB-195e, numbers in `--sat-*`/`--pocket-*` on `:root` and `SATCHEL_UI`): the bag and the worn row are stitched leather (`satchel` piece, 32 px edges repeating, its leather centre scaled under the middle so no tiles show); the six worn slots are sewn pockets (`pocket` piece) in one row, icon and slot name only. Dragging gear from the bag lights its pocket amber (dashed edge, glow); dropping it there wears it, the pocket snaps (scale 1.18 to 0.94 to 1 in 260 ms) and flashes its rarity with the equip cue. Hovering a bag item shows two plates side by side, the item and what is worn in its slot, with the power difference in green or rose. Reduced motion: no snap or swell.
- Satchel v2 (TB-195j, numbers in `--doll-*`/`--bag-pocket` on `:root`): one frame per item. Each item is a single sewn pocket; its rarity is the pocket glow (none for common); no text under icons, the name lives only in the hover plate. Worn gear is a paper doll: six pockets around an elf silhouette (`doll` piece, a mask of the game-angle elf sprite until a front-view doll exists), bow, bracer and boots left, quiver, cloak and charm right. A dragged item makes its socket pulse amber; the bag is a loose grid of pockets. Reduced motion: no pulse or lift.
- HUD bar (TB-195i): in the run the HUD (wall bar, starlight, wave plank, Slain/Heartwood, Settings) sits in a dark carved bar (--hudbar, 5.25 rem) above the field, never over it; the field fits under it at 15:8.
- UI sound set (TB-195g, ElevenLabs SFX v2, `public/audio/ui/*.ogg|mp3`): carved wood with a soft elven shimmer, one take each, trimmed to the first transient, -3 dBFS peak, short squared fade. click (buttons, `click` and `uiPress`), tab (tab token pop, `uiPop`), buy (`bought`), error (`denied`), equip (`equip`), panel (whoosh on run/camp/settings change, `uiPanel`), count (starlight count-up, rising only, `uiCount`, 0.25 s gap). Wired in TB-195k: hover (`uiHover`, once on entering a button, tab or satchel item, 0.09 s gap), stamp (`uiStamp`, a skill buy and an equip), rarity (`uiRarity`, a rare-or-better drop banner, `LOOT_BANNER.reveal`), path (`uiPath`, picking a path on Replant; clearing one clicks). All go through the engine, so Volume and mute apply. A cue's `file` field in `CUES` names its file under `public/audio/`.
- Reduced motion: no bob, no pulse, no shake; replant becomes a 300 ms cross-fade.

## Attack and hit VFX (TB-088)
Every attack reads in three beats: **wind-up** (the actor draws back, derived from its swing/shot timer, no extra state), **release** (a short cream streak or arc in the direction of the blow) and **impact** (a burst at the target). All counts, sizes and timings live in `VFX` in `src/data/presentation.ts`; all shapes come from one preallocated pool (no per-frame allocation). Cream stays the "strike" colour, as for hit flash, arrows and the lob ring.

| Unit | Wind-up | Release | Impact |
|---|---|---|---|
| Grunt / runner | Leans back up to 0.4 r over the last 40% of its 1 s swing | Cream crescent swipe in front, 0.15 s (runner's is smaller) | On the wall: 3 timber chips + 2 cream chips thrown up and back over the wall. On a vanguard: wine blood spray |
| Brute | Same lean, 0.5 r | Wider, thicker crescent | Wall: 5 timber chips + small shake bump; vanguard: heavier spray |
| Elite (Blackguard) | Same lean | Double crescent (second one 1.35× wider) | As grunt, more spray |
| Warboss | Rises 0.35 r (overhead) | Downward slam: cream shock ring on the ground, radius 1.6 r | 8 timber chips + shake bump on the wall |
| Elf (strike circle) | Bowstring pulls back with the draw ring (up to 5 px) | Lob carries a 3-ghost fading trail along its arc | Existing cream ring + 6 cream chips, a dust ring on the ground, rust blood on every orc struck |
| Ranger / warden, knives, ballista | — | Fading trail behind each shaft (arrow 3 ghosts, bolt 4, knife 2) | Cream chips + blood on the orc hit |
| Spearman | Spear draws back up to 6 px over the cooldown | Cream thrust streak out to its reach, 0.12 s | Blood spray on the orc, small cream chip |
| Bladedancer | Blades fold in (cross) over the cooldown | Two lilac→cream slash crescents, 0.15 s | Blood spray on every orc caught |
| Wolf / hawk / treant / storm | — | (existing bite, dive, stamp, bolt) | Existing bursts + blood on the orc(s) hit |

Blood: droplets fall in a short arc (gravity) and land as a flat splat (ellipse, 25%→0 alpha over 6 s) drawn on the ground under every actor. Hit: 4 droplets; kill: 10 droplets + one larger splat, size scaled by orc radius. Vanguard hit: 4 wine droplets; vanguard fell: 10 + a splat, beside the existing 14 spear-blue squares. Kill burst (moss squares), rally and fall bursts are unchanged. Splats are capped (oldest recycled first). Reduced motion: wind-ups and trails are skipped, impacts and blood still show, no shake bumps.

## Arrow enchantment VFX (TB-089)
Each enchanted arrow must be told apart at a glance, by colour and by shape, and its colours come from the cast: Starfall's gold is the bow's amber, Rebound's plum is the bladedancer's cape. Tokens in `palette.ts`, sizes in `VFX.arrows`.

| Node | Colour token | Lob | Strike | On the orc |
|---|---|---|---|---|
| Fire Arrows | `fire` #f2763a | Orange arrow with a round head | Orange ring, flames, burning ground patch (1.2 s) | Body tinted `fireTint`, orange rim, flames rise |
| Frost Arrows / Shatter | `frost` #bfe3ee | Icy blue arrow | Ice-shard starburst, frost ground patch; Shatter adds a shard ring | Body tinted `frostTint`, frost rim |
| Shock Arrows / Thunderclap | `spark` #f4eaa6, glow `sparkGlow` | Yellow arrow | Thick jagged glowing bolts (glow 16, core 5, jag 14) to up to 3 orcs | Thunderclap: 3 sparks orbit the head |
| Rebound | `arcane` #9b6bd6, core `arcaneCore` #ece8ff | Plum arrow | A plum orb with a pale core and halo hops orc to orc, a ring at each hit | — |
| Starfall | `starGold` #ffd36b | — | Gold streaks fall straight down onto orcs on the plain | — |

Burning and chilled orcs are tinted on their own body, never with a shape laid over them: sprites tint only the frame's own pixels (`Sprites.draw` tint, `source-atop` on a scratch canvas) plus a `drop-shadow` rim of `rimBlur` 6; vector orcs fill their body shape again in the tint. Shading stays visible under the colour. The lob takes the colour of the first enchantment owned (fire, frost, shock, Rebound, in that order).

## Shaman fireball VFX (TB-127)
The shaman's ranged attack is a lobbed fireball, not an arrow: round, glowing, trailing. Sizes in `VFX.fireball`, flight in `FIREBALL` (orcs.ts). Damage is TB-087.

- **In flight**: an `fire` disc (r 6) with an `ember` body and an off-centre `fireCore` highlight, halo `fireGlow` blur 14; a comet tail of 6 shrinking, fading ghosts behind it; embers (30/s) peel off and fall; a squashed shadow slides along the ground under the arc so the height reads.
- **Cast**: 8 embers burst from the staff tip in a ±0.6 rad cone toward the target plus 4 flames, timed with the throw frame of `orc.shaman.attack`.
- **Strike**: a `fireCore` flash puff (0.9 r, 0.12 s), then 7 fire puffs rise (45 px/s, 0.4 s) and cool from core to ember to fire as they fade; a `sand` dust ring runs out to 1.6 r; 20 embers and 10 fire squares fountain up (±1.1 rad of straight up); 24 flames and a `firePatch` scorch (1.4 s); screen shake 0.08.
- No ring-inside-a-disc: the first two versions read as a bullseye; the shockwave is dust-coloured and outside the fire for that reason.
- Reduced motion: the strike draws in full but the screen does not shake (`reducedMotion` zeroes `shake` at draw time, as for every other hit).

## Loot VFX (TB-105)

Numbers in `LOOT_VFX` and `LOOT_BANNER` (`src/data/presentation.ts`), colours per rarity: common cream, rare spear blue, epic lilac, legendary star gold, mythic rose. Every drop stands a light column with a cream core, fading over its life (common 1.2 / rare 2.5 / epic 3 / legendary 3.5 / mythic 4.5 s) and scaled by rarity (height and width × 0.6 / 1.3 / 1.7 / 2.2 / 2.8; TB-192); common also glints, epic gets motes spiralling up, legendary and mythic a lit ground ellipse and ring, a screen shake (0.45 / 0.8) and a full-field flash of their colour (alpha 0.22 / 0.35, 0.45 s). Mythic holds the field 0.5 s, runs it at 0.6x for 0.5 s and flickers a rose screen edge. Each kept drop also shows a banner under the toast: the item icon in its rarity frame, the rarity in its colour and the item name, for 3–6 s by rarity, at most three stacked. Satchel and worn cards stack an 88 px icon (from the 128 px WebP) over the name, framed and tinted in the rarity colour, legendary and mythic glowing. Equipping glows the bow 1 s in the item colour and flashes the worn card; a new set tier rings the elf with leaves for 2 s. Reduced motion keeps beams, the flash, banners, glows and colour flashes and drops motes, pulse, spin, shake, the edge and slow-motion.

## UI wood (TB-136)
Carved living wood, not a template: no cards, glows or gradients standing in for material.
- Base: deep forest green (ink tokens above; the old blue-grey is gone). A gold vine tile (`src/ui/wood/gilt.svg`, 320 px, 16% opacity) runs behind the page and the panels.
- Frame and buttons are rendered in Blender, not drawn in CSS: `art/ui/carve.py` (headless: `blender -b --factory-startup --python art/ui/carve.py -- <outdir>`). Planks carry relief grain (stretched clouds displacement), corners are sawn log ends with ring grain and a bark collar, with two carved leaves. Render 256 px per unit, Cycles, transparent film, orthographic top camera.
- `frame.png` (512 px, from a 1024 px render) is a 9-slice: `border-image: url(frame.png) 125 / 58px / 0 stretch` on a 30 px border, so knots and leaves stay whole and lap over the content.
- `button.png` (385×94, alpha-cropped from the render at half size) skins `.deploy` and `.ghost`: `border-image 20 30 fill / 8px 12px`. Build the plaque as a coarse quad grid: an ngon cap pinches at its centre under subdivision, and a fine grid clamps the bevel flat. `.buy` stays amber: the one gold action on a page.
- Roots (`root.svg`) replace rules, carved tokens mark the tabs (TB-195d).

## Carved HUD pieces (TB-195h)
The richer carved wood (director 3 Nov, Hades reference): the TB-136 material pushed further, one distinct object per UI element.
- `art/ui/carve_hud.py` renders every piece at 2x (`blender -b --factory-startup --python art/ui/carve_hud.py -- <outdir> [piece ...]`,
  run hidden). Deeper relief than `carve.py` (0.04–0.05 grain displacement), a warm low rim sun from the top right (74°) that
  catches every carved edge, the key from the top left as before, a cool fill. Gilt is metallic gold; the gem and corner studs
  are a faceted amber stone with a faint emission.
- `art/ui/pack_hud.py` writes `public/ui/<name>.webp` and `<name>@2x.webp`, bakes an amber glow halo into `gem` and `march`
  only (on a padded canvas, so the halo never clips), and downsizes premultiplied so edges carry no dark fringe. Manifest and
  9-slice insets: `docs/plans/game-ui.md` §6.
- Wall-bar cracks are real splits: each rail is built from pieces between jagged crack lines, and per state the gaps widen
  and loose pieces tilt. Swallowtail ends are two convex halves (a concave ngon bevels into a stepped edge).
- The report stamp is red-brown wax (#7a2a2a), a material colour, not the rose token; rose stays Heartwood and danger.

## Arcane skill tree (TB-163)

The node layout draws a tree: Waking is the trunk base, Muster and Grey Wolf the trunk, Bow / Companions / Armoury the canopy boughs, Vanguard the low left bough, Barricade / Spoils / Grove the roots. Each link is a faint `line` outline until its node is owned, then wood grows along it (`TREE_VIEW.growRate`) in `treeGlow` halo, `treeWood` body, `treeWoodLit` core and a thin vein in the branch colour. Width is `woodBase + woodPerNode·√(nodes carried)`, so the trunk is thickest. Two `spark` motes drift outward along each grown link. Reduced motion: wood snaps grown, no motes.

**Tree lighting (TB-190b, Hades-like painterly glow).** Locked links: one batched thin, still `linkDim` line. Owned links: a wide additive bloom (`'lighter'`, `TREE_LIGHT.bloom` width/alpha layers) in the branch's `BRANCH_LIGHT` colour plus a soft light pool under each owned node, both rendered to a cached offscreen layer rebuilt only when camera, size or owned set change, then blitted with a slow breath. Over the wood: a branch-colour core and a `lightHot` hairline. Light pulses travel root to tip along owned links (cascading by depth), motes drift along them, and buying a node throws a particle burst along its path. Reduced motion keeps the glow, drops pulses, motes and bursts. All numbers in `TREE_LIGHT` (`src/data/presentation.ts`).

**Full-screen tree (TB-189).** A Full screen button at the top right of the Grove tree covers the window with the Grove pane: the whole tree fits beside the detail card (`TREE_VIEW.wholeMargin` of the space), the camera stays fixed (no pan or zoom), and clicking selects and buys as usual. Close or Esc returns to the normal view and its camera.

## Asset pipeline (Tripo, Meshy, Cascadeur, ElevenLabs, Suno)
Vector draws stay the baseline so the game is always playable without assets. Actors ship as **pre-rendered sprite sheets** on top of the same palette. Agents run Tripo, Meshy and ElevenLabs themselves, each job only with the director's written spend yes:
- **Tripo** generates the 3D models (orc grunt/runner/brute/warboss, elf, spearman, bladedancer, wolf, hawk, treant). Prompt with the palette hexes and "soft low-poly toy-board, flat shading, no outlines". Colour reference (director, 31 Oct): Esoteric Ebb and Thronefall: muted, painterly, low-poly, flat shading, matte hand-painted textures (dusty sage, rust, ochre, bone). One model per actor; variants by tint in-engine, not by new models.
- **Mixamo** clips animate them (retargeted in headless Blender by the `mixamo-animate` project skill, `.claude/skills/mixamo-animate/`); Cascadeur stays available for hand-keyed motion. Each clip is approved by the director from a game-view GIF before it ships.
- Render to sheets with `scripts/build_sprites.ps1` (in that skill): orthographic camera at the field's 20° top-down tilt, 512 px frames, then `pack_sprites.py` crops each loop to its frames' union, scales to 110 px per metre, mirrors orcs (they march screen-left) and packs four WebP sheets (`public/sprites/sheet_orcs.webp` grunt/berserker/drummer/shaman, `sheet_orcs2.webp` runner/brute/wolf rider/hawk, `sheet_elf.webp` elf and wolf, `sheet_van.webp` vanguard; TB-129, TB-194) with one `atlas.json` beside them. Every clip plays every frame at 30 fps (TB-194; attacks were every second frame at 15 fps) except the wolf and wolf rider run (25 fps) and the wolf rider attack (20 frames at 15 fps, its own render script). Flat ink shadow added in-engine.
- Atlas (TB-060, `src/render/sprites.ts`): `public/sprites/atlas.json` = `{ images: [sheet…], anims: { key: { image, frames: [[x,y,w,h]…], fps, ax, ay, hPerR } } }`; each anim names its sheet, and the loader decodes every sheet in `images` (an atlas-wide `image` still works as the default for old files). Keys: `orc.grunt|runner|brute|elite|boss`, `elf`, `archer`, `van.spear|blade`; each key is the walk loop and `<key>.attack` the attack loop. `drawActor` picks the loop from `src/render/actorState.ts` (orcs swing at the wall or a vanguard; vanguard walk to their stand, swing with an orc in reach, otherwise idle on the walk's frame 0); a missing loop borrows the other. Shipped (TB-068): `orc.grunt` + `.attack`, `van.spear` + `.attack`, `van.blade.attack`, `orc.berserker` + `.attack`, `orc.shaman` + `.attack`, `elf` + `.attack`. The elf never walks, so `elf` is its idle loop (Standing Idle 03 Examine, all 153 frames at 30 fps, TB-144) and plays in the walk slot; `elf.attack` (Standing Draw Arrow, 32 frames) does not free-run: `field.ts` scrubs it with the bow's charge (`shotT / lobCd`, via `Sprites.duration`) so the string reaches full draw as the lob leaves, in both motion settings. Shot loop (TB-202, `src/render/elfPose.ts`): the clip ends at full draw and no Mixamo clip runs full draw back to the nock on this rig (Standing Aim Recoil, Aim Overdraw, Aim Idle 01, Idle 01 and Shooting Arrow all gap 6–18× the median hand step at the joins), so after each lob the full-draw frame crossfades into draw frame 0 over `VFX.elfShot.release` (0.15 s, director 3 Nov) while the next draw runs; aim start and stop crossfade idle and draw over `VFX.elfShot.aim` (0.15 s). (ax, ay) is the foot anchor as a fraction of the frame; drawn height = hPerR × actor radius (elf/vanguard radius 12). Any missing key, or no atlas, draws the vector actor.
- Sheet budget: ≤ 2 MB per sheet for 1.0 so the itch build stays snappy (TB-068 first sheet: 869 KB; split 1 Nov at 2753 KB into orcs 1776 KB + elf/vanguard 945 KB, TB-129; 30 fps attacks put two sheets at 2593 + 2276 KB, so 3 Nov split into four: orcs 1522, orcs2 1227, elf 1373, van 1078 KB, TB-194).
- **ElevenLabs** produces the audio: sound-effects generation for the 16 cues in `src/data/audio.ts` `CUES` (`loose`, `arrowHit`, `knife`, `ignite`, `orcHit`, `orcDeath`, `bruteDeath`, `bossRoar`, `wallThud`, `wallCreak`, `wallFall`, `rallyHorn`, `replant`, `click`, `bought`, `denied`; TB-127 adds `fireballCast` (a whoosh of flame leaving a staff) and `fireballHit` (a soft fiery thump with crackle)), and an ambient wind-and-grove bed (`ambient`). File names are the cue names. Export 44.1 kHz OGG + MP3 fallback, normalised to −16 LUFS, under `public/audio/` (silence trimmed; a limiter holds peaks at −1 dBFS, so the most transient cues, `ignite` and the wall hits, sit 1–3 LU under). No voice lines in 1.0. **Suno** makes the two music beds (`music-a` grove, `music-b` dusk, TB-063) and the boss-wave track (`music-boss`, plays from its start on a boss wave, 1.5 s fades): instrumental, 2–3 min, loopable; MP3 alone is fine (the loader falls back from OGG to MP3).

## M4 presentation additions
- Parallax: two bands of distant hills (sageDeep darkened) scrolling very slowly.
- Day/night: a 10-minute cycle; at dusk the motes brighten and lamplight glows on the bank (amber radial, 20% alpha). No tint over the plain (cut in TB-174, it muted the colours).
- Audio palette: wooden, breathy, watery. Wooden thuds for wall hits, a low horn on rally, a long creak-and-crash when the wall falls. Wind loop always under everything.

## Encampment placeholder (TB-188c)
Until the TB-188d sprites load, `src/render/camp.ts` draws the four buildings as palette-token vector shapes at their
`CAMP_SPOTS` footprints in the Camp tab's scene (TB-188e; the field no longer shows the camp). The Tripo sprites are drawn
per building so each level 3 stands `CAMP_SCENE.l3H` (135 units, ~3x the elf's 38) tall. Three looks: **level 0**
a canvas tent beside a bare timber frame and one hint of the trade; **level 1** built (bowyer lean-to with bow rack and arrow
bundle, forge chimney with ember hearth and anvil, kitchen awning with bread table and pot over a cook fire, training ring with
straw dummies and a spear rack); **level 2** the level-1 look plus a blue pennant; **level 3** adds a gold-edged pennant, a lit
lantern and one more of each trade (sparks, smoke, a third dummy, a quiver, a fourth bow). Each look is painted once per
scene pixel scale to an offscreen canvas and blitted, so the camp costs four `drawImage` calls a frame. No motion yet (TB-188f).
