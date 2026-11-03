# A UI that looks like a game, not a website (TB-195) — DRAFT plan

Director, 3 Nov: "make it wayyy sexier, not this ai slop POWERPOINT presentation shit … a UI that looks like a game, not a website."

## 1. Why it reads as a website now
- **It is laid out like a page.** It has DOM tabs, cards with a title, body text and a button, and rows of labels. That is a document
  structure: everything sits in rectangles in a column, and every screen is "a panel of text".
- **Its motion is web motion.** Panels appear or fade like slides. Nothing has weight, overshoot, sound or particles.
- **It is wordy.** Effects are described in sentences where a game shows an icon, a number and a change (+12% → +18%).
- **Its edges are flat and repeated.** The same wood 9-slice and plaque appear everywhere, so the parts don't feel like distinct objects.
- **Nothing responds to the player.** A hover or click gets a colour change and nothing else: no squash, glow, sound or particle burst.

## 2. Target: diegetic, physical, juicy
Reference feel (not to copy): Kingdom Rush, Hades, Slay the Spire, and Diablo's inventory. The menus are *objects in the world*,
and every input answers back.

| Element | Now | Becomes |
|---|---|---|
| Header stats | A text row | A **HUD**: a starlight gem counter with a ticking odometer and a sparkle on gain, the wave as a carved banner with a wave-clear stamp, and the wall HP as a lit timber bar that cracks |
| Tabs | DOM tabs | **Physical tokens** on the frame edge (bow, satchel, seed, cog) that pop forward when chosen, with a click sound |
| Node / item card | A text card | A **tooltip plate** that follows the cursor: icon, name, *now → next* numbers in big digits, the cost as a gem chip, and one line of flavour in italics at most |
| Buy | A button | **Press and hold, or a click with impact**: the plaque presses down, gold sparks fly, the node lights up along its neon link (TB-190), a coin sound plays, and the stat ticker in the HUD jumps |
| Satchel | A grid | A **leather satchel**: slots as sewn pockets, items as icons with a rarity glow (TB-192), drag and drop to equip with a snap and a sound, and compare-on-hover as two plates side by side |
| Screen changes | Swaps | **Camera moves**: Grove/Camp slide like panning the camp, Replant is the existing tree-burn ceremony, the fallen overlay drops in like a banner on ropes |
| Fallen / summary | A text summary | A **battle report**: big counters roll up one by one (waves, orcs slain, starlight, items, best), each with a thud and a stamp; *March again* is the one glowing gold plaque |
| Numbers | Static | Every changing number **counts up** and pops (scales 1.15 → 1), green or red flash on change |

## 3. Motion rules (replaces ART-STYLE §Motion's UI parts)
- Everything eases with **spring** curves (a slight overshoot), not linear fades. 120 ms in for pops, 220 ms for panels, 400 ms for screen moves.
- **Every input gets three answers:** a visual (press, glow), a sound (an ElevenLabs UI SFX set: click, hover tick, buy chime,
  error thunk, equip snap) and, for important actions, particles.
- Stagger lists: children enter 30 ms apart.
- Reduced motion keeps the sounds and colour, and drops the movement.

## 4. Build steps (one row and one PR each, in this order)
1. **TB-195a Motion and feedback kit:** `ui/juice.ts`, with spring tween helpers, count-up numbers, pop and press, a DOM particle
   burst (canvas overlay), and a UI sound hook in `data/audio.ts`. Numbers in `data/presentation.ts`. Everything else builds on it.
2. **TB-195b HUD:** starlight gem, wave banner and wall bar over the field, replacing the header text row.
3. **TB-195c Tooltip plates:** node and item info as cursor plates with *now → next* numbers. The detail card's prose is cut to one line.
4. **TB-195d Tabs as tokens + screen transitions.**
5. **TB-195e Satchel as an object:** drag to equip, compare plates. Builds on TB-192.
6. **TB-195f Battle report:** the fallen and summary screen.
7. **TB-195g UI sound set** (ElevenLabs, a tool the director has; files dropped into `public/audio/ui`).
8. **TB-195h New UI art:** distinct carved pieces per element (gem, banner, tokens, plates, satchel leather) via the Blender
   carve pipeline (`art/ui/carve.py`), so the frame isn't one 9-slice everywhere.

Each step ends with screenshots and a short screen capture (GIF) at 1080p and 4K, sent to the director before the next step.

## 5. Open choices for the director
1. ~~Reference game~~ **Decided (director, 3 Nov): Hades** (painterly, glowing, light and particles everywhere).
2. ~~Material~~ **Decided (director, 3 Nov): keep the carved wood, richer**: deeper carving, a warm rim light, gold or starlight inlay, glow (TB-195h).
3. ~~UI sounds~~ **Decided (director, 3 Nov): Claude generates them in ElevenLabs** (TB-195g).

## 6. TB-195h art manifest (carved pieces, `public/ui/`)
Built by `art/ui/carve_hud.py` (Blender 5.2, headless) and packed by `art/ui/pack_hud.py` (WebP, premultiplied downscale,
glow halo baked into `gem` and `march`). Each piece ships as `<name>.webp` (1x, 1080p) and `<name>@2x.webp` (4K): use
`image-set(url("/ui/x.webp") 1x, url("/ui/x@2x.webp") 2x)`. Insets are in **1x pixels** (double them when slicing `@2x`).
34 files, 444 KB in all.

| File | 1x size | Use | 9-slice insets (top right bottom left) |
|---|---|---|---|
| `gem` | 100×100 | HUD starlight counter. The gem is 72 px in the middle; 14 px of glow pads each side | fixed size |
| `banner` | 256×72 | HUD wave banner, swallowtail ends | `0 48 0 48` (3-slice: stretch width only) |
| `wallbar` | 320×40 | HUD wall HP frame, intact | `0 28 0 28`, height fixed |
| `wallbar-crack1` / `-crack2` / `-crack3` | 320×40 each | The same frame cracked: 1 split / 3 splits / 6 splits with gaps and knocked pieces (suggested under 75 %, 50 %, 25 % HP) | `0 28 0 28`, height fixed; scale the whole bar for large sizes so the splits keep their shape |
| `wallbar-fill` | 304×16 | Lit heartwood HP fill. Sits in the channel at left 28, top 12, right 28 of the 40-tall bar; clip by width, don't stretch | none |
| `token-bow`, `token-satchel`, `token-seed`, `token-cog` | 72×72 each | Tab tokens. Active state: scale up plus a CSS amber `drop-shadow` | fixed size |
| `plate` | 256×160 | Tooltip plate: dark stained wood, gilt inlay, starlight corner studs | `40 40 40 40` fill |
| `satchel` | 256×256 | Satchel leather panel with a saddle-stitched border | `32 32 32 32` fill, `round` (stitches repeat, never stretch) |
| `pocket` | 80×80 | One sewn pocket (an equip slot) with a stuffed middle | fixed size (or `14` fill `round`) |
| `report` | 480×360 | Battle-report board: timber frame, boards, gilt corner brackets | `68 68 68 68` fill |
| `stamp` | 120×120 | Wax seal with the starlight star, slammed onto the report | fixed size |
| `march` | 312×96 | The glowing gold *March again* plaque. 12 px of glow pads every side | `0 56 0 56` fill (3-slice), height fixed |

QA contact sheets: `C:/Users/DANTE/Documents/tide-assets/ui/tb195h_*.png` (raw pieces, in-game 1x on ink and on the plain, edge crops, 2x stretch).
