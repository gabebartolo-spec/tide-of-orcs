# Elf military encampment (TB-188) — plan (a–c built)

Director, 3 Nov: the grove props are gone (TB-187). The area behind the wall becomes an elf military encampment with a
**bowyer, a forge, a kitchen and a training area, each upgradable.** Data, UI and placeholder art are built
(TB-188a–c, save v13); final art and life remain.

## 1. Where it sits
**TB-188e (director, 3 Nov):** the camp has its own scene on the **Camp** tab of the between-runs pages, at house scale.
In the field's grove strip (143 x 480 field units, with the HUD, archers, elf and ballista to keep clear) the buildings
could only be about 0.7x the elf's height; at house scale the four need ~700 units of width. The field no longer draws them.

The scene (`render/campScene.ts`, `CAMP_SCENE` and `CAMP_SPOTS` in `src/data/presentation.ts`) stands the four in one row
on grass, left to right **bowyer, forge, kitchen, training yard**, with the elf at the east end for scale. Scene units equal
field units: the elf is drawn ~38 units tall and every level-3 sprite `CAMP_SCENE.l3H` = 135 (its frame includes the ground
island, so the structure reads ~3x the elf). Each building gets its own scale from its level-3 sprite, so the four finished
buildings stand equally tall; TB-188g: `CAMP_LV_SCALE` scales levels 1-2 per building so each upgrade grows (level 1 ~0.81, level 2 ~0.9 of that building's level-3 height; measured in the Camp tab from roof top to ground line, level 3 reads 2.3-2.9x the elf). The box is fitted to the
canvas and centred. TB-188j (replaces the TB-188i vector backdrop; the elf is no longer drawn in the scene): behind the row sits a plate rendered in Blender in the buildings' own camera and lights (`.claude/skills/mixamo-animate/scripts/render_camp_backdrop.py` → `public/decor/camp_backdrop.webp`, mapped by `CAMP_BACKDROP.plate`): a chunky stylised forest wall, a mossy meadow and a stone-lined dirt road at y 197±13 that runs in front of the building row (ground line y 148), never under it. `render/campBackdrop.ts` draws the plate plus a soft contact shadow under each building, once per canvas size to an offscreen canvas. TB-188k (director's 11 fixes, 3 Nov): each building and level is its own image (`public/decor/camp/<id><lv>.webp`, `CAMP_ART`), rendered in the same Blender scene as the plate at 4 px per scene unit with its contact shadow baked in, so the canvas only downsamples (crisp). `post_camp.py` crops them and prints the rects. One warm sun and a cool sky fill; meadow hue ~97° in 2-3 blade tones with flower and clover clumps; dark tufts (60-70 % of the grass value) cluster on the road edges and building bases; the road has ruts and value noise, no outline; fences, log piles, stumps, barrels and bushes dress the meadow; the forest stands in three layers with mist (blur on the farthest only) and a hedge line behind the row. The view fits `CAMP_SCENE` (830 wide, anchored at the bottom) so building gaps stay 120-200 px and edge margins 80+ px at 1600 and 1920 wide; the bottom 20 % of the canvas darkens. Smoke is gone; forge sparks, the bowyer pennant and training dust are placed from `CAMP_ART`. Round 3 (director, 3 Nov): the scene is laid out for a full-screen camp (`CAMP_SCENE` 1194 x 672 units, 16:9); the canvas covers it, centred, so the current bordered panel shows its middle. Buildings are 1.6x round 2 in two staggered rows (bowyer and kitchen behind at y 40, forge and training ground in front at y 150, overlapping slightly; drawn back to front, clicked front first); road at y 232±13 with feathered edges; no stones, tufts, stumps or mid-field logs; props only in the foreground at 3x; varied hedge clumps; forest from y -305 with mist from -205; the bottom 30% darkens. `render/campFauna.ts` adds elk grazing behind the camp (TB-208, director 4 Nov: the Sketchfab "Realistic Animated Elk" playing its own Stand_Eating_01 loop, rendered frame by frame in the camp scene to the grid sheet `elk.webp` by `render_camp_backdrop.py` pass `elk` + `post_elk.py`, placed, mirrored and phase-offset per `CAMP_FAUNA`) and a few birds drifting over the forest. The training-ground fence is fused into the Tripo mesh; cutting it shreds the model, and the director kept the fence rather than regenerate the models (3 Nov).

Each building has three looks: **level 0** (a frame or tent), **level 1** (built; level 2 adds a banner), and **level 3** (finished, with a banner,
lights and a working animation such as forge sparks, cook smoke or a swinging dummy). The level drawn is the building's
upgrade level, so the camp grows visibly as the player invests. That is the GDD's "watch the field change".

## 2. What each building does (an existing system each, no new mechanic)
| Building | Upgrades feed | Example effect per level (numbers go to BALANCE ## Proposed) |
|---|---|---|
| Bowyer | The elf's bow | + bow damage %, − draw time %, + strike radius |
| Forge | Armoury and items | + weapon damage % (knives, ballista, storm), + loot drop chance, cheaper rerolls |
| Kitchen | The wall and economy | + wall max HP %, + wall regen, + starlight % |
| Training area | Vanguard | + vanguard HP and damage %, − respawn time |

Each building's levels live beside the Heartwood tree (paid with Heartwood plus its material), so systems still read only `Stats` (CLAUDE.md rule 4). Clicking a building in
the Camp scene opens its card with its level, costs and the next upgrade; upgrades are bought only while the run has fallen. The skill tree stays as it is.

## 3. Build steps (one backlog row and one PR each)
1. **TB-188a Data and sim (done):** `src/data/camp.ts` (buildings, levels, costs, effects) → `Stats`. Save migration for the camp levels.
  . Placeholder costs (P-188) in BALANCE ## Proposed; tuning waits for the balance phase.
2. **TB-188b UI (done):** click a building → its card (upgrade, cost, effect). A "Camp" section on the Replant tab lists all four.
3. **TB-188c Placeholder art (done):** palette-token vector drawings of each building at levels 0/1/3, so the loop plays before the final art.
4. **TB-188d Final art (done, 470f4c3):** buildings as sprites at the game angle (GAMECAM 20), like the fence. The source is Tripo (H3.1 text to 3D, one model per building per level, 12 in all), rendered headless in Blender by `render_camp.ps1` into `sheet_camp.webp` (keys `camp.<id>.<lv>`); the vector art stays as the fallback until the sheet loads.
5. **TB-188e Camp scene (done):** the camp leaves the field for its own Camp tab at house scale (§1).
6. **TB-188f Life (done):** idle life in the Camp scene (`render/campLife.ts`, numbers in `CAMP_LIFE`): forge smoke and sparks, kitchen chimney smoke, dust puffs in the training ring, a swaying pennant on the bowyer; one fixed 160-particle pool, drawn only while the Camp tab is shown. Upgrade moments (build dust, banner raise, sound) are TB-188h.

## 4. Decisions (director, 3 Nov)
1. **Currency:** Heartwood plus a farmable material per building, dropped by common orcs. Buildings
   are permanent. Each building has its own material, e.g. bowyer = sinew, forge = iron, kitchen = meat,
   training = hide (`src/data/camp.ts`). Grunts and other common orcs drop them during a run, and they are kept across runs. Drop rates go to BALANCE ## Proposed.
2. **Art source:** Tripo, not Meshy (the director switched the source to Tripo for TB-188d). **Spend: the director approved 780 Tripo credits** for the 12 models at H3.1 best quality (65 each), above the usual 500-per-session threshold.
3. **Levels:** 3 per building.
