# Elf military encampment (TB-188) — plan (a–c built)

Director, 3 Nov: the grove props are gone (TB-187). The area behind the wall becomes an elf military encampment with a
**bowyer, a forge, a kitchen and a training area, each upgradable.** Data, UI and placeholder art are built
(TB-188a–c, save v13); final art and life remain.

## 1. Where it sits
The grove is the strip west of the barricade: the elf stands mid-strip, with archers and the ballista on their spots.
The four buildings take the free bands, as the props did, so no unit lane is covered:

| Spot | Building | Why there |
|---|---|---|
| Top-left | Bowyer (workbench, racks of bows, bundled arrows) | Nearest the elf's draw arm; arrows feed the bow |
| Top-right, behind the wall | Forge (anvil, chimney, ember glow) | Fire and noise are by the wall, where the fighting is |
| Bottom-left | Kitchen (cook fire, pot, bread table, smoke) | The quiet back corner |
| Bottom-right, behind the wall | Training area (straw dummies, sparring ring, spear rack) | The vanguard muster from here to the wall |

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

Each building's levels live beside the Heartwood tree (paid with Heartwood plus its material), so systems still read only `Stats` (CLAUDE.md rule 4). Clicking a building on
the field opens its card with its level, costs and the next upgrade; upgrades are bought only while the run has fallen. The skill tree stays as it is.

## 3. Build steps (one backlog row and one PR each)
1. **TB-188a Data and sim (done):** `src/data/camp.ts` (buildings, levels, costs, effects) → `Stats`. Save migration for the camp levels.
  . Placeholder costs (P-188) in BALANCE ## Proposed; tuning waits for the balance phase.
2. **TB-188b UI (done):** click a building → its card (upgrade, cost, effect). A "Camp" section on the Replant tab lists all four.
3. **TB-188c Placeholder art (done):** palette-token vector drawings of each building at levels 0/1/3, so the loop plays before the final art.
4. **TB-188d Final art:** buildings as sprites at the game angle (GAMECAM 20), like the fence. The source is Tripo; every frame is screened, then sent to the director before packing.
5. **TB-188e Life:** idle animations (sparks, smoke, dummy hits) and upgrade moments (build dust, banner raise, sound).

## 4. Decisions (director, 3 Nov)
1. **Currency:** Heartwood plus a farmable material per building, dropped by common orcs. Buildings
   are permanent. Each building has its own material, e.g. bowyer = sinew, forge = iron, kitchen = meat,
   training = hide (`src/data/camp.ts`). Grunts and other common orcs drop them during a run, and they are kept across runs. Drop rates go to BALANCE ## Proposed.
2. **Art source:** Tripo for the camp models.
3. **Levels:** 3 per building.
