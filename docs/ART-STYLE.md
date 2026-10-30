# Art style

Status: **Current** (v1.1). References: Thronefall (soft pastoral low-poly, cream-and-sage, dusk lighting) and Esoteric Ebb (deep ink blues, lamplit amber, lilac highlights, hand-set serif UI). The prototype in `docs/prototype.html` already uses this palette; keep it.

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

Branch colours: Bow = lilac, Companions = amber, Armoury = rose, Grove = #9fc48f, Barricade = #c9a06a, Vanguard = #8fb7c9.

Rules: semantic colours (amber = money, timber = the wall, rose = permanent/danger, spear-blue = your troops) are not decorative; don't reuse them elsewhere. Neutrals are all slightly blue-biased; never pure grey.

## Shape language
- Everything is soft ellipses and chamfered blocks drawn in code. No sprites in 1.0; vector draws keep the Thronefall "toy board" feel and scale to any DPR.
- Shadows: flat 25% ink ellipses under every actor.
- Orcs: round body, two dark tusk-blocks, two cream teeth, size = threat. Boss gets an amber crown. Brute is darker and wider; runner is small and quick. No faces beyond this.
- Elf: lavender head, slate cloak triangle, cream bow arc. Archers share the cloak but dimmed.
- Vanguard: same silhouette as the elf. Spearman: spear-blue cloak, round timber shield on the left, long cream spear. Bladedancer: lilac cloak, two short cream blades. HP bar above when hurt.
- Barricade: 14 px column of alternating planks with dark cross-bands, sand edge on the grove side, cream spike triangles on the plain side once Thornwall is owned.
- Wolf: grey ellipse + head circle. Hawk: a bark-coloured diamond. Treant: stacked green circles on a trunk.
- Arrows are 14 px cream lines; knives 8 px pale; ballista bolt 22 px bark, 3 px wide.

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

## M4 presentation additions
- Parallax: two bands of distant hills (sageDeep darkened) scrolling very slowly.
- Day/night: a 10-minute cycle tinting the plain between day (#7c9676) and dusk (#5f6f72) with lamplight on the bank at night (amber radial, 20% alpha).
- Audio palette: wooden, breathy, watery. Wooden thuds for wall hits, a low horn on rally, a long creak-and-crash when the wall falls. Wind loop always under everything.
