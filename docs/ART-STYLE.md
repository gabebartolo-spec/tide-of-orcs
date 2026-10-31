# Art style

Status: **Current** (v1.3, checked against `src/render/palette.ts` and `src/data/audio.ts` 31 Oct 2026). References: Thronefall (soft pastoral low-poly, cream-and-sage, dusk lighting) and Esoteric Ebb (deep ink blues, lamplit amber, lilac highlights, hand-set serif UI). The prototype in `docs/prototype.html` already uses this palette; keep it.

## Palette tokens (`src/render/palette.ts`)
| Token | Hex | Use |
|---|---|---|
| ink | #1b2130 | Page background, night ground |
| ink2 | #242d3f | Panels |
| ink3 | #30394d | Raised controls, disabled |
| line | #3e4a60 | Borders, locked edges |
| cream | #efe6d2 | Primary text, arrows, hit flash |
| creamDim | #b9b09c | Secondary text, labels |
| sage | #8fa98a | Plain highlight patches |
| sageDeep | #6b8468 | Plain base (field is #7c9676 / #86a07e patches) |
| groveSide | #9fb391 | The grove behind the wall |
| sand | #c9b78a | Wall's inner edge |
| timber / timberDark | #8a6a46 / #7a5c3c | Barricade planks (alternating) |
| timberSplinter | #4e3a28 | Broken planks shown from the top as HP drops |
| timberBand | #5a4634 | Cross-bands on the wall, bark, hawk, bolts |
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
| plain, plainPatch, grass | #7c9676, #86a07e, cream 18% | Field base, field patches, grass strokes |
| plainDusk | #5f6f72 | Dusk tint over the plain |
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
- Everything is soft ellipses and chamfered blocks drawn in code. A sprite atlas loader exists (TB-060) and draws an actor from a sheet when its key is present; with no atlas (today) every actor uses the vector draw, which keeps the Thronefall "toy board" feel and scales to any DPR.
- Shadows: flat 25% ink ellipses under every actor.
- Orcs: round body, two dark tusk-blocks, two cream teeth, size = threat. Boss gets an amber crown. Brute is darker and wider; runner is small and quick; Elite (Blackguard) is mid-sized (radius 14) in the darkest skin, `elite`. No faces beyond this.
- Elf: lavender head, slate cloak triangle, cream bow arc. Archers share the cloak but dimmed.
- Vanguard: same silhouette as the elf. Spearman: spear-blue cloak, round timber shield on the left, long cream spear. Bladedancer: lilac cloak, two short cream blades. HP bar above when hurt.
- Barricade: 14 px column of alternating planks with dark cross-bands, sand edge on the grove side, cream spike triangles on the plain side once Thornwall is owned.
- Wolf: grey ellipse + head circle. Hawk: a bark-coloured diamond. Treant: stacked green circles on a trunk.
- Arrows are 14 px cream lines; knives 8 px pale; ballista bolt 22 px bark, 3 px wide.
- Strike circle (TB-079): a disc of radius `stats.radius` (40 px × 1.2^Wide Volley) filled `aimFill` and outlined `aimLine`, with a cream ring that fills clockwise from the top as the bow draws; a dotted `aimLine` arc from the elf traces the lob's flight. In flight a lob is a short shaft along its arc with a ground shadow; on landing a cream ring flashes at the circle. The OS cursor is hidden over the field (`cursor: none`). Nothing is drawn when the pointer is over the grove side or the wall has fallen.

## Typography
- Display: **Spectral** (serif, 500/700, italic for the title's "Orcs"). Headings, big numbers.
- Body/UI: **Atkinson Hyperlegible**. Labels uppercase at 11 px with 0.12 em tracking.
- Tabular numerals everywhere numbers change.

## Motion
- Orc walk: 1.5 px vertical bob at 8 rad/s. At the wall or on a vanguard: stop, keep bobbing, timber splinters fly on each swing.
- Hit flash: body fills cream for 0.12 s.
- Kill burst: 10 moss squares; crit: text "crit". Wall hit: 3 timber squares. Vanguard rallied: 8 cream squares at the wall; vanguard fell: 14 spear-blue squares.
- Screen shake: transform jitter up to 6×4 px, decays at 3/s; grows with wall damage fraction ×4, and +0.2 on each treant stamp. HUD bars don't shake.
- Deep Roots regrow: 40 grove-green squares bursting from the wall's centre.
- Fallen overlay: field dims to 82% ink, title in Spectral, summary line, big rose Heartwood number, one amber button.
- Storm: jittered lilac polyline, 0.35 s fade.
- Affordable node: amber ring, 0.5–1.0 alpha sine at 4 rad/s. Rally buttons: border turns amber on hover when affordable.
- Replant: tree desaturates, amber particles rise, one seed falls, field fades up through a #e2a85b-tinted overlay. ≤ 4 s.
- Reduced motion: no bob, no pulse, no shake; replant becomes a 300 ms cross-fade.

## Attack and hit VFX (TB-088)
Every attack reads in three beats: **wind-up** (the actor draws back, derived from its swing/shot timer, no extra state), **release** (a short cream streak or arc in the direction of the blow) and **impact** (a burst at the target). All counts, sizes and timings live in `VFX` in `src/data/presentation.ts`; all shapes come from one preallocated pool (no per-frame allocation). Cream stays the "strike" colour, as for hit flash, arrows and the lob ring.

| Unit | Wind-up | Release | Impact |
|---|---|---|---|
| Grunt / runner | Leans back up to 0.2 r over the last 40% of its 1 s swing | Cream crescent swipe in front, 0.15 s (runner's is smaller) | On the wall: 3 timber chips (as before) + 2 cream chips. On a vanguard: wine blood spray |
| Brute | Same lean, 0.3 r | Wider, thicker crescent | Wall: 5 timber chips + small shake bump; vanguard: heavier spray |
| Elite (Blackguard) | Same lean | Two crossed crescents (X) | As grunt, more spray |
| Warboss | Rises 0.25 r (overhead) | Downward slam: cream shock ring on the ground, radius 1.6 r | 8 timber chips + shake bump on the wall |
| Elf (strike circle) | Bowstring pulls back with the draw ring (up to 5 px) | Lob carries a 3-ghost fading trail along its arc | Existing cream ring + 6 cream chips, a dust ring on the ground, rust blood on every orc struck |
| Ranger / warden, knives, ballista | — | Fading trail behind each shaft (arrow 3 ghosts, bolt 4, knife 2) | Cream chips + blood on the orc hit |
| Spearman | Spear draws back up to 6 px over the cooldown | Cream thrust streak out to its reach, 0.12 s | Blood spray on the orc, small cream chip |
| Bladedancer | Blades fold in (cross) over the cooldown | Two lilac→cream slash crescents, 0.15 s | Blood spray on every orc caught |
| Wolf / hawk / treant / storm | — | (existing bite, dive, stamp, bolt) | Existing bursts + blood on the orc(s) hit |

Blood: droplets fall in a short arc (gravity) and land as a flat splat (ellipse, 25%→0 alpha over 6 s) drawn on the ground under every actor. Hit: 4 droplets; kill: 10 droplets + one larger splat, size scaled by orc radius. Vanguard hit: 4 wine droplets; vanguard fell: 10 + a splat, beside the existing 14 spear-blue squares. Kill burst (moss squares), rally and fall bursts are unchanged. Splats are capped (oldest recycled first). Reduced motion: wind-ups and trails are skipped, impacts and blood still show, no shake bumps.

## Asset pipeline (tools Gabe has: Tripo, Cascadeur, ElevenLabs)
Vector draws stay the baseline so the game is always playable without assets. M4 may upgrade actors to **pre-rendered sprite sheets** on top of the same palette:
- **Tripo** generates the 3D models (orc grunt/runner/brute/warboss, elf, spearman, bladedancer, wolf, hawk, treant). Prompt with the palette hexes and "soft low-poly toy-board, flat shading, no outlines". One model per actor; variants by tint in-engine, not by new models.
- **Cascadeur** animates them: walk, attack, hit, death; vanguard idle/stance; wall-hack swing. Loops of 8–12 frames at 12 fps.
- Render to sheets with an orthographic camera at the field's ~20° top-down tilt, 64 px tall for grunts, scaled by `radius`, flat 25% ink shadow added in-engine. PNG sheets under `public/sprites/`, atlas JSON beside them, loaded lazily with vector fallback.
- Atlas (TB-060, `src/render/sprites.ts`): `public/sprites/atlas.json` = `{ image, anims: { key: { frames: [[x,y,w,h]…], fps, ax, ay, hPerR } } }`. Keys: `orc.grunt|runner|brute|elite|boss`, `elf`, `archer`, `van.spear|blade`. (ax, ay) is the foot anchor as a fraction of the frame; drawn height = hPerR × actor radius (elf/vanguard radius 12). Any missing key, or no atlas, draws the vector actor.
- Sheet budget: ≤ 2 MB total for 1.0 so the itch build stays snappy.
- **ElevenLabs** produces the audio: sound-effects generation for the 16 cues in `src/data/audio.ts` `CUES` (`loose`, `arrowHit`, `knife`, `ignite`, `orcHit`, `orcDeath`, `bruteDeath`, `bossRoar`, `wallThud`, `wallCreak`, `wallFall`, `rallyHorn`, `replant`, `click`, `bought`, `denied`), and an ambient wind-and-grove bed (`ambient`). File names are the cue names. Export 44.1 kHz OGG + MP3 fallback, normalised to −16 LUFS, under `public/audio/`. No voice lines in 1.0. **Suno** makes the two music beds (`music-a` grove, `music-b` dusk, TB-063) and the boss-wave track (`music-boss`, plays from its start on a boss wave, 1.5 s fades): instrumental, 2–3 min, loopable; MP3 alone is fine (the loader falls back from OGG to MP3).

## M4 presentation additions
- Parallax: two bands of distant hills (sageDeep darkened) scrolling very slowly.
- Day/night: a 10-minute cycle tinting the plain between day (#7c9676) and dusk (#5f6f72) with lamplight on the bank at night (amber radial, 20% alpha).
- Audio palette: wooden, breathy, watery. Wooden thuds for wall hits, a low horn on rally, a long creak-and-crash when the wall falls. Wind loop always under everything.
