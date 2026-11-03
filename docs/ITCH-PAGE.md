# itch.io page (TB-073)

The store page for **https://veniceissinking.itch.io/elves-vs-orcs**. This file is the source of truth for the page text; paste it into itch → Edit game when it changes. Build upload is already automated (`.github/workflows/itch.yml`, butler → `html5-dev` / `html5`, see RELEASE.md), so this row covers only the page.

## Page settings
- Title: **Let's Hunt Some Orc!**
- Short description (tagline, 120 chars max): *Hold the barricade against an endless orc tide. Aim the bow, grow the grove, fall, replant, and stand longer.*
- Kind: HTML, played in browser. Viewport 1280 × 720, *Click to launch in fullscreen* on, *Mobile friendly* on with orientation *Landscape* (TB-155, GDD §11).
- Genre: Strategy. Tags: incremental, tower-defense, idle, fantasy, prestige, singleplayer, mouse-only.
- Release status: In development.

## Description

> You are the last warden of a grove on the western edge of a wide plain. Between you and the orc tide stands a timber barricade. The tide comes from the east, forever, and one day the wall will fall.
>
> That day isn't a loss. Every boss wave you clear pays Heartwood, which you keep for good, and the next wall stands longer.
>
> **How to play**
> - Move your pointer over the field to aim. The bow looses on its own, lobbing an arrow into the circle; skill is where you place it, not how fast you click.
> - Slain orcs drop starlight. Spend it on the Grove (sharper arrows, a grey wolf, throwing knives, a thicker wall) or muster spearmen and bladedancers to hold the line at the wall.
> - Waves grow every 24 seconds. New orc kinds join as the waves climb; summon them sooner when you want more danger for more starlight.
> - When the barricade falls, walk back to the grove. Spend Heartwood on the Heartwood tree and the camp, choose a path, then march again.
> - Every 25 waves a boss wave waits for you to call it: one minute, a fixed war party, a Warboss.
>
> **Features**
> - A branching skill tree of bow, companions, armoury, barricade, vanguard and spoils nodes
> - Three specialisation paths (Serpent, Fox, Magpie), each with its own nodes, set and mythic
> - An elf encampment behind the wall to build up between runs
> - Loot drops for six gear slots, from Common to Mythic
> - Heartwood prestige tree, spent only between runs
> - Saves in your browser; export and import from Settings
>
> Keyboard: the whole panel is reachable with Tab, Enter and Space.
>
> Work in progress. Each milestone gets a devlog post with what's new and what to test; feedback in the comments is very welcome.

## Screenshots
Captured from the real game at 1920 × 1080 (headless Chrome over CDP, sim-progressed save, pointer aiming with `crowdAim`; `node /tmp/perf/shots3.mjs` and `shots2.mjs`, scratch scripts not kept). Upload in this order:

| File | Shows |
|---|---|
| `itch/1-field.png` | Wave 7, 15 orcs on the plain, two hacking a 57 / 400 wall, the elf drawing on the aim circle |
| `itch/2-fallen.png` | "The barricade has fallen": wave, slain, minutes held, best drop, +1 Heartwood (stale: falls pay no Heartwood since TB-171; retake before the page goes public) |
| `itch/3-grove.png` | The Grove page between runs: the full skill tree around Waking |

Cover image (630 × 500) is not made yet; it needs art, not a crop.

## Status
Saved on itch 2 Nov: title, tagline, description (the older text, before this file's 3 Nov edit), genre, tags, 1280 × 720, Mobile friendly on, Landscape (TB-155), the three screenshots. Page updates and builds are paused (director, 3 Nov). Visibility stays **Restricted**: only the director makes the page public.
