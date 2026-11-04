# Architecture

Status: **Current** (v1.4, checked against the code 3 Nov 2026). Module boundaries are binding; internal details are guidance.

## Principles
1. Simulation is pure and deterministic given `(save, seed, inputs, dt)`. Rendering and UI are observers.
2. Fixed-step sim (50 Hz) decoupled from render (rAF, its own `performance.now` timestamp, frame dt clamped to 0.25 s so a stall never spirals). Render interpolates movers (TB-194, `src/render/interp.ts`): before the last sim step of a frame the loop snapshots orc, vanguard, shot, wolf and hawk positions, and the field draws each at `prev + (now − prev) · acc/STEP` (a jump over `INTERP.snap` snaps). The sim stays pure; the snapshot lives in render. Without it a 50 Hz sim on a 60 Hz screen moved actors 0 or 1 step per frame (45 % jitter, 137 % at 144 Hz).
3. Data over code: tree, orc types, boss script, Heartwood tree, strings, audio cues, palette are plain objects in `src/data/` (palette in `src/render/palette.ts`).
4. Zero per-frame allocation in hot paths: pooled orcs/arrows/vanguard, typed arrays where it pays off.

## Repo layout
```
tide-of-orcs/
  CLAUDE.md
  docs/                 design docs (this folder); docs/log/ session logs and devlogs
  index.html            shell: canvas + panel markup, loads /src/main.ts
  src/
    main.ts             boot: GameController, renderers, panel, audio; pointer aim; fixed-step loop; autosave; build stamp
    game.ts             GameController: the only caller into sim/ (see §UI)
    data/
      balance.ts        FIELD, PLAYER, LOB, BARRICADE, VANGUARD, SOURCES, NODE_FX, PRESTIGE, HP_RAMP, COST_WAVE; waveHP, waveLoot,
                        waveInterval, waveSpeedMult, costWave, nodeCost, vanCost, vanBaseHp
      skillTree.ts      NODES[] (mirrors SKILL-TREE.md), TREE_CANVAS, TREE_VIEW, BRANCH_COLOR
      orcs.ts           ORC_TYPES, ORC_KINDS, FOE_FX (Fury/Swarm)
      bosses.ts         BOSS_WAVE, BOSS_SCRIPT (TB-081)
      heartwood.ts      HW_NODES, HW_FX (TB-053)
      camp.ts           encampment buildings, levels, materials (TB-188a)
      paths.ts          specialisation paths serpent / fox / magpie (TB-193a)
      loot.ts, lootTables.ts  items, affixes, sets, mythics, SET_FX, MYTHIC_FX (TB-090–TB-100)
      itemArt.ts        item id → icon in public/items/
      settings.ts       settings limits (volume, text scale)
      audio.ts          AUDIO, CUES (optional `file` stem, e.g. ui/click), cueFor(event) (TB-062), uiSound hook (TB-195a)
      presentation.ts   SKY, dusk(t): render-only timings (TB-061)
      strings.ts        STR: all user-facing copy
    sim/
      state.ts          Orc, Projectile, Vanguard, RunState, MetaState, SimState; createState(), freshRun(), freshMeta(), recompute()
      stats.ts          Stats, deriveStats(levels, heartwood, hwLevels)
      rng.ts            seeded PRNG (mulberry32)
      pool.ts           Pool<T>: alloc(), release(item), forEach(fn), clear(), count
      step.ts           Inputs, spawnOrc(), step(): wave timer, per-kind spawn clocks, boss step, wall regen, vanguard,
                        orcs (engage → wall → advance), elf lob, rangers, knives, ballista, storm, wolf, hawk, treant, projectiles, cleanup
      combat.ts         nearestOrc(), damage(), kill(), shoot(), lob(), impact(), volley(), crowdAim() (player model for tests/sim)
      barricade.ts      barFrac(), barricadeHit() (damaged → Deep Roots → fallen), barricadeRegen()
      vanguard.ts       placeVanguard(), vanguardStep(), engagedVanguard(), hurtVanguard()
      boss.ts           bossesReady(), canSummonBoss(), summonBoss(), bossStep()
      heartwood.ts      hwRank(), hwSpent(), hwAvailable(), hwCost(), canBuyHw(), buyHw(), startRun()
      events.ts         SimEvent union, EventBus (capped array, drained once per frame)
      camp.ts           canUpgrade(), upgradeBuilding() (TB-188a)
      gear.ts           applyGear(), set tiers and counts
      loot.ts, lootRoll.ts  satchel ops (equip, salvage, reroll, lock, heirloom, filter); drop and affix rolls
      shaman.ts         shaman fireball cast and landing
      tree.ts           rankOf(), costOf() (wave-scaled), unlocked(), canBuy(), buy()
      prestige.ts       gain(), canReplant() (forced when fallen, voluntary from wave 12), canPullBack()/pullBack() (end a standing run from wave 12, TB-136), choosePath() (TB-193a), replant(s, ev, tier, path)
    render/
      palette.ts        colour tokens (ART-STYLE.md)
      field.ts          draws the battlefield from SimState; strike circle, lob arcs, sky and treeline
      sprites.ts        sprite atlas loader (public/sprites/atlas.json) with vector fallback (TB-060)
      particles.ts      preallocated pools (squares, blood droplets, strokes, ground splats, text) fed by events; sizes in `data/presentation.ts` VFX
      ceremony.ts       replant ceremony: burn, seed, dawn; skippable (TB-051)
      camera.ts         tree camera: pan, zoom, clamp below the legend strip, ease, whole-tree fit (TB-021, TB-066, TB-117, TB-189)
      interp.ts         render interpolation snapshot (TB-194)
      elfPose.ts        elf shot loop crossfades (TB-202); actorState.ts walk/attack clip state per actor
      ground.ts, ambience.ts  field ground and ambient decoration
      camp.ts           encampment building art: Tripo sprites per-building scaled, vector fallback (TB-188c/d/e)
      campScene.ts      Camp tab scene: buildings at house scale, elf for scale, click to scene units (TB-188e)
      sigil.ts          path sigils: flat vector emblems face-on in an ink disc with one path-coloured ring (TB-193c, TB-193i); the Meshy pictures are no longer drawn
      textScale.ts      applyTextScale(), textScale() (TB-191)
      treeNav.ts        keyboard Tab order through the tree (TB-116)
      tree.ts           skill tree canvas, curved branches, lit links: cached bloom, pulses, motes, buy bursts (TB-190b), hit-test, camera ease to selection, full-screen fit (TB-189)
    ui/
      panel.ts          page modes run / camp / settings (body[data-mode], setMode; TB-136), tabs, detail card, boss button, fallen overlay + run summary,
                        Heartwood tree, settings, toasts, HUD numbers
      hud.ts            game HUD: starlight gem, wave banner, cracking wall bar (TB-195b)
      juice.ts          UI motion kit: tweens, count-ups, buy burst (TB-195a)
      camp.ts           encampment page (TB-188b); paths.ts path cards (TB-193c); satchel.ts SatchelPane; glyphs.ts slot SVGs
      fit.ts            camp pages fit one screen (TB-153): scales a tab's content down when it still overflows after layout; `data-fit` modes `scroll`/`narrow` (narrow never scales a window under 861 px wide in portrait, TB-206c)
      format.ts         number formatting (short / scientific)
      style.css         the stylesheet (tokens mirror render/palette.ts)
    audio/
      engine.ts         Web Audio: ambient loop, SFX from events, ducking; missing files skipped silently
    save/
      schema.ts         SaveV15 type (the current shape), CURRENT_VERSION = 15, retired-id lists, defaultSettings()
      migrate.ts        migrations[v] = (old) => new
      storage.ts        localStorage with try/catch (key `tide-of-orcs-v1`); export/import as base64 UTF-8 JSON
      telemetry.ts      local run log (dev aid; there are no testers), own key, JSON export (TB-070); not part of the save
      fixtures/v1–v14.ts one save per old version; v2–v14 written by the last build at that version after 20 headless minutes (TB-140)
  public/               sprites/, audio/ (audio/ui/ UI sounds, TB-195g), ui/ (carved 9-slice pieces, 1x/2x WebP, TB-195h), items/, decor/; the game runs without sprites and audio; fonts are bundled from src/ui/fonts; favicon.png is the app icon at 64 px (TB-123)
  sim/run.ts            headless balance runner (node), imports src/sim + src/data
  test/                 cross-module tests (empty); unit tests sit beside code
```

## Game loop
```ts
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  acc += dt;
  if (field.ceremony.active) acc = 0;              // the field holds still during the replant ceremony
  while (acc >= STEP) { game.tick(STEP); acc -= STEP; }   // tick() passes { aim } (null when fallen) to step()
  const events = game.events.drain();
  field.consume(events, state); panel.handleEvents(events); audio.consume(events);
  if (!document.hidden) field.draw(state, dt, game.aim);
  // panel.update() and tree.draw() throttled to ~6.7 Hz; the tree also redraws every frame while the camera eases
  requestAnimationFrame(frame);
}
```
- When the tab is hidden, rAF pauses; on return the 0.25 s clamp means at most 12 steps run. The gap is not credited: there is no offline progress. While `run.fallen` is true, `step` returns immediately.
- Autosave every 20 s and on `beforeunload`/`pagehide`, and when the tab is hidden (`visibilitychange`, `src/saveTriggers.ts`, TB-216b: a hidden tab stops the frame loop and may be discarded without pagehide); also after a Heartwood purchase and a replant.

## SimState (sketch, see `src/sim/state.ts`)
```ts
interface SimState {
  tick: number; t: number; rng: Rng;
  run: { wave; waveT; runTime; starlight; earned; kills; levels: Partial<Record<NodeId, number>>;
         barHp; bulwarkUsed; fallen;                          // barricade state
         bossDone; boss: { t; next; left } | null;            // boss waves (TB-081)
         foeT: Partial<Record<OrcKind, number>>;               // one spawn clock per orc kind (TB-080)
         stormT; shotT: number[]; knifeT; hawkT; treantT; ballT;
         tier; path; hoardN; thunder; freeRallyUsed; found?; best? };   // see §Save
  meta: { heartwood; lifetimeKills; bestWave; prestiges; hwLevels; loot; tier; checkpoint; camp };
  stats: Stats;                                // recomputed on buy/prestige/Heartwood buy (recompute() also heals new timber)
  orcs: Pool<Orc>; shots: Pool<Projectile>; vans: Pool<Vanguard>;   // capacities 160 / 600 / 8
  wolf: { x; y; tx; ty; biteT }; hawk: { x; y; a };
}
```
The seed lives only inside `rng`; the save version lives in the save, not in SimState. Pools expose `alloc()`, `release(item)`, `forEach(fn)` (live items only), `clear()` and `count`. Pooled items are reused, not freed, so references stay valid; projectiles do hold `target: Orc | null` and `hit: Set<Orc>` across ticks and check `live`/`dead` before use.

## Events
`SimEvent` union in `sim/events.ts` (the file is the full list; it also carries loot, gear-power, status, shaman, drummer, tier and camp events). Core ones: `kill` (with `kind`), `hit` (with `crit`, `src` = shot kind), `impact` (lob strike, with radius), `wave`, `bossReady`, `bossStart`, `bossEnd` (with `cleared`, `loot`), `storm`, `hawkDive`, `treantStamp`, `bite`, `barricadeHit` (with damage fraction, drives shake), `barricadeRegrow`, `barricadeFell` (with the run summary; `chosen` when the player pulled back), `vanguardRallied`, `vanguardHit`, `vanguardFell`, `bought`, `orcSwing` (kind, from, target: melee release), `vanStrike` (vanguard type, from, target), `bleed` (melee wound, blood only); these three are presentation-only (TB-088), `hwBought`, `replant` (with `forced`). `EventBus` is a plain array capped at 2,000 per frame. Render turns these into particles, floating text, shake and toasts; audio turns them into SFX via `cueFor`. Sim never knows about either.

## Save
- `SaveV15 = { version: 15, savedAt: number, run, meta, settings: { volume, reducedMotion, numberFormat, textScale } }`. `run.hwEarned` (v15, TB-205): Heartwood banked from boss waves cleared this run, shown on the fallen overlay; v14 saves migrate to 0, replant clears it with the run. `run.path` and `run.hoardN` (v14, TB-193a): the specialisation path (`serpent`/`fox`/`magpie`, `src/data/paths.ts`) or null, picked while fallen (`choosePath`) and carried by `replant(tier, path)`; and the drop count toward Magpie's Hoard 6. v13 saves migrate to null and 0. Stats = `applyGear(deriveStats(levels, hw, camp, run.path), loot)`; a path node counts only on its path, and `rollDrop` offers path sets and mythics only on theirs. `meta.camp` (v13, TB-188a): `{ levels, mats }`, the encampment building levels (`src/data/camp.ts`) and the materials common orcs drop (`combat.dropMat`, on its own `SimState.matRng`, seed×17+3); kept across runs; v12 saves migrate to empty. Stats = `applyGear(deriveStats(levels, hwLevels, camp.levels), loot)`; `upgradeBuilding` (`sim/camp.ts`, GameController intent) spends Heartwood (shared with the Heartwood tree, only while fallen) plus the material. `settings.textScale` (v12, TB-191): Text size multiplier, old saves migrate to 1. `run.tier` and `meta.tier` (v10, TB-148): the boss tier this run plays at and the highest unlocked; v9 saves migrate to 1. `run.thunder` and `run.freeRallyUsed` (v8, TB-110) keep once-per-run gear state across a reload; replant clears them with the run; v8 also wrote `run.splinterUsed`, retired with the old Splinter (TB-128) and dropped from the type (TB-206): old saves still carry it and it is ignored. `meta.loot.heirloom` (v9, TB-101) is the Heirloom item's uid or null; `replant` grows it with Heartwood Heirloom, salvaging it clears it. `Item.rerolls` (TB-102) is optional, absent means 0, so it needs no version bump. `run.found` and `run.best` (TB-103, filled by `noteDrop`) are optional too: drops by rarity and a copy of the run's best item, cleared with the run. `meta.loot` (v7, TB-090) holds the satchel `items[]`, `equipped` uids by slot, `glimmer`, `lootFilter`, boss `pity` counters and `nextUid`; it survives replants. Stats = `applyGear(deriveStats(...), meta.loot)` (`sim/gear.ts`): worn affixes and set bonuses, mul stats ×(1+Σ), add stats +Σ (pierce/arrows whole points). Kills roll drops in `combat.kill` on `SimState.lootRng` (seed×31+7), separate from combat `rng`; `SimState.lootPolicy` (not saved) is `player` in the game, a runner policy in `npm run balance`. Pools are **not** saved; a load starts with an empty field (orcs respawn within seconds; this avoids serialising 160 orcs). A boss wave saved mid-challenge starts over from its first mini-wave on load (`restartBoss`, TB-216b), since its marched champions are gone and `left` could never reach 0.
- Set bonuses (TB-099): `SETS` lines name Stats fields; every number is in `SET_FX` (`data/lootTables.ts`); systems read Stats only. Run-only set state on `SimState` is not saved (`zones` pool for Cinderground/Moonwells, `pack` wolves, `knifeN`, `freeRallyT`); whether the free rally was spent is saved in `run` (v8).
- Mythics (TB-100): `MYTHICS[].lines` set Stats switches like set lines; numbers in `MYTHIC_FX`. Since TB-128 seven powers give the elf's lob reach, not damage: `combat.drawMult(s)` scales the draw time (Thunder's Memory while `run.thunder` (seconds left) > 0, First Wolf by `run.waveT`, Splinter by wall health), a Last Knife hit advances `run.shotT[0]`, Kiln widens `impact`'s catch radius for burning orcs, Oakspine widens `stats.radius` and roots in `impact`, Starfall Cloak rolls in `lob`. `prestige.gain(s)` is the one payout path.
- History: v1→v2 (TB-028) drops retired node ids (`RETIRED_NODE_IDS`); v2→v3 (TB-080) retires Blood Banners and splits the spawn clock per orc kind; v3→v4 (TB-081) retires the Warboss nodes for boss waves; v4→v5 (TB-052) `run.earned`; v5→v6 (TB-055) `meta.hwLevels`; v6→v7 `meta.loot`; v7→v8 once-per-run gear state; v8→v9 heirloom; v9→v10 tiers; v10→v11 `meta.checkpoint` (TB-172, from best wave); v11→v12 `textScale`; v12→v13 `meta.camp`; v13→v14 `run.path`, `run.hoardN`.
- Load failure (TB-199): if the stored save cannot be parsed or migrated, `readSave` copies the raw string to `tide-of-orcs-v1-backup`, the game starts fresh, and `writeSave` refuses every write until the player wipes or imports, so the unreadable save is never overwritten. A save that migrates but cannot be built into a state (wrong shape, e.g. `run.levels: null`) takes the same path (`markLoadFailed`, TB-216b). Boot, import and wipe all seed the RNGs from the clock (`clockSeed`); import and wipe drain old events, clear the aim and emit `gameReset`, on which audio ends the boss track and the field drops the mythic slow, beams and ceremony. Loaded and imported settings pass through `sanitizeSettings` (volume and text size clamped to `data/settings.ts` / `TEXT_SCALE_*`, bad fields default).
- `migrate.ts` runs `while (save.version < CURRENT) save = migrations[save.version](save)` and throws on a save newer than the build. Every schema bump adds a migration and a test (`src/save/save.test.ts`) with a save of the previous version (fixture files v1–v14). `src/save/oldSaves.test.ts` (TB-140) takes every fixture v1–v14, migrates it, loads it as `GameController` does, plays 60 s and checks no number goes NaN or infinite and that export/import round-trips. A schema bump adds the fixture for the version it retires: dump a played save from the last build at that version.
- Export: `btoa` of the UTF-8 JSON, shown in the Settings textarea for the player to copy. Import: decode, `JSON.parse`, `migrate()`, then replace state. There is no separate schema validation beyond `migrate`.
- Telemetry (TB-070) is a separate localStorage key (`tide-of-orcs-telemetry`, last 500 runs), written on replant, downloaded from Settings. Loot events (TB-107: drop, equip, salvage, reroll, set tier) go to `tide-of-orcs-loot-log` (last 5000), buffered by `GameController` and flushed on every save; `min` counts from `tide-of-orcs-telemetry-start`, set on the first event. The export carries `runs` and `loot`.

## Rendering
- One `<canvas>` for the field, one for the tree. `devicePixelRatio` capped at 2.
- UI scale (TB-143, TB-191): every CSS size in `style.css` is in rem, and the root font is `calc(clamp(16px, min(100vw / 96, 100vh / 54), 80px) * var(--text-scale))`: 20 px at 1920×1080, 40 px at 3840×2160, 16 px floor for smaller windows. `--text-scale` is `settings.textScale` (0.8–1.6, Settings › Text size), set on `<html>` by `render/textScale.ts` `applyTextScale`; field canvas text multiplies its font size by `textScale()`. The tree canvas works in 1080p layout px (CSS px ÷ `uiScale()`) with its backing store at full CSS px × DPR, so legend, labels, camera framing and hit-testing scale with the UI.
- Field draws in logical 900×480 via `setTransform`, with screen shake applied to the transform (not to the HUD bars). Draw order: plain → dusk tint → treeline (trees, ground shadows and bush skirt; the skirt is split at the orcs' feet y so orcs walk in front of or behind each bush, `Treeline.skirtUpTo`) → grove side → lamplight → barricade (splintered planks from the top as HP drops, spikes if Thornwall) → blood splats (`Particles.drawGround`) → treant → elf → strike circle and lob arc → rangers → ballista → wolf → vanguard (sorted by y) → orcs (sorted by y) → projectiles (lobs with ground shadow) → lob impacts → storm → hawk → particles → text → barricade/vanguard HUD → wave bar.
- Actors draw from the sprite atlas when a key is present, else the vector draw (TB-060).
- Batch by fill style where cheap (e.g. all grunts of same colour), but clarity over micro-optimisation until the profiler says otherwise.
- Full-screen tree (TB-189): `Panel.setTreeFull()` toggles `body.tree-full`, which fixes `#pane-grove` over the window (tree beside the detail card), then `TreeRenderer.setFull()` resizes the canvas and uses `wholeCamera()` (every node visible, no pan or zoom); leaving restores the saved camera. Esc, the Close button, or leaving the Grove tab or camp mode closes it.
- Tree canvas: nodes from `data/skillTree.ts` layout, camera in `render/camera.ts`, hit-test in logical space. The branch legend sits on an opaque strip `TREE_VIEW.legendH` px tall at the top; the camera never lets the tree's top edge rise under it, nodes panned beneath it are hidden, and clicks on it select nothing (TB-117).
- Reduced motion: the Settings override (`settings.reducedMotion`, null = follow `prefers-reduced-motion`); render modules check `reducedMotion`.

## UI
Plain DOM, no framework. `ui/panel.ts` renders the detail card with template strings and owns the boss button, the fallen overlay, the Heartwood tree and Settings, and creates `ui/satchel.ts` (SatchelPane: worn slots, satchel grid, item detail and its controls; each item shows a 128 px WebP icon from `public/items/<id>.webp`, rendered from its approved Meshy model and centred by `meshy_output/centre_icons.py`, looked up by `data/itemArt.ts` as the mythic id, else the path set piece `<set>-<slot>`, else the base id (path sigils: `public/sigils/<path>.webp` via `data/pathArt.ts`, TB-193d), with the `ui/glyphs.ts` slot SVG as fallback; SatchelPane preloads all icons). Kept drops (TB-192) raise a banner in `#loot-banners` (icon, rarity, name; `LOOT_BANNER`) and a Satchel tab badge counting items kept since the tab was last opened; the count lives in Panel memory, not the save, so no schema change; it dispatches intents to `GameController`, which is the only thing allowed to call into `sim/`:
`tick(dt)`, `setAim(x, y)` / `clearAim()`, `buy(id)`, `summonBoss()`, `castFireball(...)`, `buyHw(id)`, `upgradeBuilding(id)`, `equipItem(uid)`, `salvageItem(uid)`, `heirloomItem(uid)`, `rerollItem(uid, i)`, `lockItem(uid)`, `setLootFilter(rarity)`, `canPullBack()`, `pullBack()`, `canReplant()`, `choosePath(path)`, `replant(tier?, path?)`, `telemetry()`, `toSave()`, `save()`, `exportSave()`, `importSave(str)`, `wipe()`.
`[hidden] { display: none !important }` is in `style.css` because the standalone build has no host reset.

## Testing
- `src/**/*.test.ts`: formula pins (BALANCE.md reference tables), `deriveStats` changes for every node at max rank, tree buy rules and wave-scaled cost, timber heals the wall, vanguard cap/unlock, spearmen keep the wall healthier, the bare run eventually falls, a fallen run stops ticking, the lob hits the circle and never fires without aim, Fury/Swarm and summons, boss waves, Heartwood tree, forced and voluntary replant, migrations v1→v15 and every old save fixture v1–v14 loads and plays (TB-140), telemetry, camera, sprites, audio cue map.
- Determinism test: two sims with same seed and scripted inputs produce identical `starlight` and `kills` after 10,000 ticks.
- `sim/` runner is also a smoke test in CI (30 sim-minutes of greedy; the < 5 s real-time budget is a goal, not enforced).

## Performance budget
- 160 orcs (`ORC_CAP`) + 300 arrows + 900 particles (VFX.cap) at 60 fps in a desktop browser on a mid-range PC (CLAUDE.md rule 7; mobile comes later).
- Measured (QA run 5, 3 Nov, all eight kinds): 60 fps or better at 1080p and 4K down to a 2× slower CPU; about 60 at 1080p and 37 at 4K at 4× slower (TB-183 tracks headroom). `field.draw` costs the same at 4K; the browser's raster cost grows with pixels. Rerun with `tools/perf160.mjs`.
- No GC pressure spikes: verify with Chrome performance panel, allocations per frame ≈ 0 in `step`.

## Build & deploy
- `vite build` → `dist/` static. Itch.io upload as HTML5 zip via `.github/workflows/itch.yml` (RELEASE.md; no itch build for now, director 3 Nov). Desktop: `desktop/main.cjs` is an Electron shell (dev dependency `electron`, TB-074) that serves `dist/` over `app://tide`, so `fetch`, module scripts and `localStorage` behave as on a static host; `npm run desktop` builds and opens it. Background throttling stays on, so a minimised window stops the loop and nothing accrues (rule 2). Fonts are bundled (TB-118), so it runs offline. `npm run desktop:pack` (dev dependency `electron-builder`, config `electron-builder.yml`, TB-119) writes `release/win-unpacked/` with `Let's Hunt Some Orc!.exe`: the folder a SteamPipe depot uploads. No installer (Steam installs it), unsigned, app icon `desktop/icon.png` (the director's art, TB-120; electron-builder makes the .ico), English locale only. `userData` is pinned to `%APPDATA%/tide-of-orcs`, so the dev shell and the packaged exe share one save and a product rename never orphans it. Not yet uploaded to Steam.

## Mobile (TB-218)

Target: Pixel 8 in Chrome, landscape 915x412. `src/ui/fullscreen.ts` enters fullscreen and locks landscape on the first touch in the run view (preference `tide.fullscreen` in localStorage, Settings toggle). `public/manifest.webmanifest` sets display fullscreen. A coarse portrait viewport shows the rotate prompt and `main.ts` holds the sim behind it. `PHONE_QUERY` (`data/presentation.ts`) marks phone landscape: the canvas wave strip lifts `FIELD_VIEW.phoneStripLift` and the HUD plaques narrow (style.css, end of file). `FieldRenderer.resize()` only reallocates the backing store when the size changes. Touch input (I1-I5): `ui/aimTracker.ts` gives the aim to the first canvas contact only; when it lifts the aim clears (a still-held second finger does not take over; the next press can own it). `ui/touchAim.ts` lifts the circle above a finger (`TOUCH` in `data/touch.ts`), fades the lift to 0 over the bottom 5.25rem, remaps the touch y so the usable span (field minus the bottom safe inset) covers the whole plain, top edge to bottom edge (no HUD clamp: the HUD is pass-through), never places the circle below the gesture-bar line, and ignores presses in the outer 24 px or the bottom safe inset. On coarse pointers the HUD has `pointer-events:none` (rally buttons and Settings stay live), so a drag that starts on a plate still aims. `GameController` keeps a one-tick aim latch so a press and release inside one 16 ms tick still fires one arrow (`dropAim` discards it). Long-press menu and image drags are blocked on coarse pointers; satchel items are not draggable there. Audio unlocks on pointerup/touchend/keydown, suspends when the page hides, resumes on return; the rAF clock resyncs and dt is clamped to 0.25 s; a resize, rotation or tab return opens a 600 ms settle window in which a frame advances at most one tick. The audio graph is built at idle (suspended) and the first touch only resumes it; the decodes then run one at a time. Sprite sheets: the elf and first orcs gate the first frame, the other sheets load 2.5 s later one by one (vector fallback until then). Portrait hides `.wrap` behind the rotate prompt. The Grove canvas draws at most once per paced frame and never while hidden; touch full-screen opens at a readable zoom and pinches out to the whole tree. Mute is `tide.muted` in localStorage (Settings row and a run-mode corner button, M key). `ui/tapFallback.ts` fires a click from pointerup when Chrome swallows the click after a drag (Settings tap right after aiming). `armFullscreen` re-arms on `fullscreenchange`. Hover rules sit behind `(hover: hover) and (pointer: fine)`. The satchel shows list or detail on phones (`.picked`, Back to bag). Governor (`render/quality.ts`): tiers step down on slow frames, step back up when draw work time (not frame gap) is under budget, with backoff; ground, camp and tree canvases debounce resize (`QUALITY.resizeSettleMs`) and skip equal-size reallocations. Perf tier and UI touch rows are the rest of TB-218.
