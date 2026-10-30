# Architecture

Status: **Current** (v1.3, checked against the code 31 Oct 2026). Module boundaries are binding; internal details are guidance.

## Principles
1. Simulation is pure and deterministic given `(save, seed, inputs, dt)`. Rendering and UI are observers.
2. Fixed-step sim (50 Hz) decoupled from render (rAF). Render interpolates nothing; 50 Hz is enough for this art style.
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
                        waveInterval, waveSpeedMult, heartMult, prestigeGain, costWave, nodeCost, vanCost, vanBaseHp
      skillTree.ts      NODES[] (mirrors SKILL-TREE.md), TREE_CANVAS, TREE_VIEW, BRANCH_COLOR
      orcs.ts           ORC_TYPES, ORC_KINDS, FOE_FX (Fury/Swarm)
      bosses.ts         BOSS_WAVE, BOSS_SCRIPT (TB-081)
      heartwood.ts      HW_NODES, HW_FX (TB-053)
      audio.ts          AUDIO, CUES, cueFor(event) (TB-062)
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
      vanguard.ts       canRally(), rally(), placeVanguard(), vanguardStep(), engagedVanguard(), hurtVanguard()
      boss.ts           bossesReady(), canSummonBoss(), summonBoss(), bossStep()
      heartwood.ts      hwRank(), hwSpent(), hwAvailable(), hwCost(), canBuyHw(), buyHw(), startRun()
      events.ts         SimEvent union, EventBus (capped array, drained once per frame)
      tree.ts           rankOf(), costOf() (wave-scaled), unlocked(), canBuy(), buy()
      prestige.ts       gain(), canReplant() (forced when fallen, voluntary from wave 12), replant()
    render/
      palette.ts        colour tokens (ART-STYLE.md)
      field.ts          draws the battlefield from SimState; strike circle, lob arcs, sky and hills
      sprites.ts        sprite atlas loader (public/sprites/atlas.json) with vector fallback (TB-060)
      particles.ts      render-side particle pool fed by events
      ceremony.ts       replant ceremony: burn, seed, dawn; skippable (TB-051)
      camera.ts         tree camera: pan, zoom, clamp, ease (TB-021, TB-066)
      tree.ts           skill tree canvas, curved branches, hit-test, camera ease to selection
    ui/
      panel.ts          tabs (Grove / Replant / Settings), detail card, rally bar, boss button, fallen overlay + run summary,
                        Heartwood tree, settings, toasts, HUD numbers
      format.ts         number formatting (short / scientific)
      style.css         the stylesheet (tokens mirror render/palette.ts)
    audio/
      engine.ts         Web Audio: ambient loop, SFX from events, ducking; missing files skipped silently
    save/
      schema.ts         SaveV6 type, CURRENT_VERSION, retired-id lists, defaultSettings()
      migrate.ts        migrations[v] = (old) => new
      storage.ts        localStorage with try/catch (key `tide-of-orcs-v1`); export/import as base64 UTF-8 JSON
      telemetry.ts      local run log for testers, own key, JSON export (TB-070); not part of the save
      fixtures/v1.ts    v1 save fixture
  public/               (not yet created) sprites/ and audio/ assets; the game runs without them
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
- Autosave every 20 s and on `beforeunload`/`pagehide`; also after a Heartwood purchase and a replant.

## SimState (sketch, see `src/sim/state.ts`)
```ts
interface SimState {
  tick: number; t: number; rng: Rng;
  run: { wave; waveT; runTime; starlight; earned; kills; levels: Partial<Record<NodeId, number>>;
         barHp; bulwarkUsed; fallen;                          // barricade state
         bossDone; boss: { t; next; left } | null;            // boss waves (TB-081)
         foeT: Partial<Record<OrcKind, number>>;               // one spawn clock per orc kind (TB-080)
         stormT; shotT: number[]; knifeT; hawkT; treantT; ballT };
  meta: { heartwood; lifetimeKills; bestWave; prestiges; hwLevels };   // hwLevels since v6
  stats: Stats;                                // recomputed on buy/prestige/Heartwood buy (recompute() also heals new timber)
  orcs: Pool<Orc>; shots: Pool<Projectile>; vans: Pool<Vanguard>;   // capacities 160 / 600 / 8
  wolf: { x; y; tx; ty; biteT }; hawk: { x; y; a };
}
```
The seed lives only inside `rng`; the save version lives in the save, not in SimState. Pools expose `alloc()`, `release(item)`, `forEach(fn)` (live items only), `clear()` and `count`. Pooled items are reused, not freed, so references stay valid; projectiles do hold `target: Orc | null` and `hit: Set<Orc>` across ticks and check `live`/`dead` before use.

## Events
`SimEvent` union in `sim/events.ts`: `kill` (with `kind`), `hit` (with `crit`), `impact` (lob strike, with radius), `wave`, `bossReady`, `bossStart`, `bossEnd` (with `cleared`, `loot`), `storm`, `hawkDive`, `treantStamp`, `bite`, `barricadeHit` (with damage fraction, drives shake), `barricadeRegrow`, `barricadeFell` (with the run summary), `vanguardRallied`, `vanguardHit`, `vanguardFell`, `bought`, `hwBought`, `replant` (with `forced`). `EventBus` is a plain array capped at 2,000 per frame. Render turns these into particles, floating text, shake and toasts; audio turns them into SFX via `cueFor`. Sim never knows about either.

## Save
- `SaveV6 = { version: 6, savedAt: number, run, meta, settings: { volume, reducedMotion, numberFormat } }`. Pools are **not** saved; a load starts with an empty field (orcs respawn within seconds; this avoids serialising 160 orcs).
- History: v1→v2 (TB-028) drops retired node ids (`RETIRED_NODE_IDS`), fixture `src/save/fixtures/v1.ts`; v2→v3 (TB-080) retires Blood Banners and splits the spawn clock per orc kind; v3→v4 (TB-081) retires the Warboss nodes for boss waves; v4→v5 (TB-052) adds `run.earned`; v5→v6 (TB-055) adds `meta.hwLevels` (empty).
- `migrate.ts` runs `while (save.version < CURRENT) save = migrations[save.version](save)` and throws on a save newer than the build. Every schema bump adds a migration and a test (`src/save/save.test.ts`) with a save of the previous version (the v1 fixture file, or inline for v2–v5).
- Export: `btoa` of the UTF-8 JSON, shown in the Settings textarea for the player to copy. Import: decode, `JSON.parse`, `migrate()`, then replace state. There is no separate schema validation beyond `migrate`.
- Telemetry (TB-070) is a separate localStorage key (`tide-of-orcs-telemetry`, last 500 runs), written on replant, downloaded from Settings.

## Rendering
- One `<canvas>` for the field, one for the tree. `devicePixelRatio` capped at 2.
- Field draws in logical 900×480 via `setTransform`, with screen shake applied to the transform (not to the HUD bars). Draw order: plain → dusk tint → hills → grove side → lamplight → barricade (splintered planks from the top as HP drops, spikes if Thornwall) → treant → elf → strike circle and lob arc → rangers → ballista → wolf → vanguard (sorted by y) → orcs (sorted by y) → projectiles (lobs with ground shadow) → lob impacts → storm → hawk → particles → text → barricade/vanguard HUD → wave bar.
- Actors draw from the sprite atlas when a key is present, else the vector draw (TB-060).
- Batch by fill style where cheap (e.g. all grunts of same colour), but clarity over micro-optimisation until the profiler says otherwise.
- Tree canvas: nodes from `data/skillTree.ts` layout, camera in `render/camera.ts`, hit-test in logical space.
- Reduced motion: the Settings override (`settings.reducedMotion`, null = follow `prefers-reduced-motion`); render modules check `reducedMotion`.

## UI
Plain DOM, no framework. `ui/panel.ts` renders the detail card with template strings and owns the rally bar, the boss button, the fallen overlay, the Heartwood tree and Settings; it dispatches intents to `GameController`, which is the only thing allowed to call into `sim/`:
`tick(dt)`, `setAim(x, y)` / `clearAim()`, `buy(id)`, `rally(type)`, `summonBoss()`, `buyHw(id)`, `canReplant()`, `replant()`, `telemetry()`, `toSave()`, `save()`, `exportSave()`, `importSave(str)`, `wipe()`.
`[hidden] { display: none !important }` is in `style.css` because the standalone build has no host reset.

## Testing
- `src/**/*.test.ts`: formula pins (BALANCE.md reference tables), `deriveStats` changes for every node at max rank, tree buy rules and wave-scaled cost, timber heals the wall, vanguard cap/unlock, spearmen keep the wall healthier, the bare run eventually falls, a fallen run stops ticking, the lob hits the circle and never fires without aim, Fury/Swarm and summons, boss waves, Heartwood tree, forced and voluntary replant, migrations v1→v6, telemetry, camera, sprites, audio cue map.
- Determinism test: two sims with same seed and scripted inputs produce identical `starlight` and `kills` after 10,000 ticks.
- `sim/` runner is also a smoke test in CI (30 sim-minutes of greedy; the < 5 s real-time budget is a goal, not enforced).

## Performance budget
- 160 orcs (`ORC_CAP`) + 300 arrows + 500 particles at 60 fps on a 2020 mid-range Android.
- No GC pressure spikes: verify with Chrome performance panel, allocations per frame ≈ 0 in `step`.

## Build & deploy
- `vite build` → `dist/` static. Itch.io upload as HTML5 zip via `.github/workflows/itch.yml` (RELEASE.md). Later: Electron shell in `desktop/` for Steam, sharing `dist/`.
