# Architecture

Status: **Current** (v1.1). Module boundaries are binding; internal details are guidance. The M0 code follows this layout; `src/render/tree.ts` pans and zooms through `src/render/camera.ts`; `src/audio/engine.ts` plays cues from `src/data/audio.ts` and skips missing files.

## Principles
1. Simulation is pure and deterministic given `(save, seed, inputs, dt)`. Rendering and UI are observers.
2. Fixed-step sim (50 Hz) decoupled from render (rAF). Render interpolates nothing; 50 Hz is enough for this art style.
3. Data over code: tree, orc types, strings, palette are plain objects in `src/data/`.
4. Zero per-frame allocation in hot paths: pooled orcs/arrows/particles, typed arrays where it pays off.

## Repo layout
```
tide-of-orcs/
  CLAUDE.md
  docs/                 design docs (this folder)
  index.html            shell: canvas + panel markup, loads /src/main.ts
  src/
    main.ts             boot: load save, create Game, start loops
    data/
      skillTree.ts      NODES[] (mirrors SKILL-TREE.md) + layout
      orcs.ts           ORC_TYPES
      balance.ts        formulas: hp(w), loot(w), interval(w), prestigeGain(...)
      heartwood.ts      HW tree (M3)
      strings.ts        all user-facing copy
    sim/
      state.ts          SimState type, createState(), Stats
      stats.ts          deriveStats(levels, heartwood) → Stats
      rng.ts            seeded PRNG (mulberry32)
      spawner.ts        wave timer, spawn rolls
      orcs.ts           (folded into step.ts for now) movement, engage, hack the wall, burn, cleanup
      combat.ts         nearestOrc(), damage(), kill(), shoot(), volley()
      barricade.ts      barricadeHit() state machine (damaged → Deep Roots → fallen), regen
      vanguard.ts       canRally(), rally(), vanguardStep(), engagedVanguard(), hurtVanguard()
      step.ts           one tick: waves, spawn, wall regen, vanguard, orcs (engage → wall → advance),
                        archers, knives, ballista, storm, wolf, hawk, treant, projectiles, cleanup
      events.ts         ring buffer of SimEvent for render/audio (kill, crit, flood, wave, boss)
      tree.ts           rankOf(), costOf(), unlocked(), canBuy(), buy()
      prestige.ts       gain(), canReplant() (forced when fallen, voluntary from wave 12), replant()
    render/
      palette.ts        colour tokens (ART-STYLE.md)
      field.ts          draws the battlefield from SimState
      sprites.ts        orc/elf/companion vector draw fns
      particles.ts      render-side particle pool fed by events
      tree.ts           skill tree canvas, pan/zoom, hit-test
    ui/
      panel.ts          tabs, detail card, rally bar, fallen overlay, prestige tab, toasts, HUD numbers
      format.ts         number formatting (K/M/B, scientific option)
      style.css         the stylesheet (tokens mirror render/palette.ts)
    game.ts             GameController: the only caller into sim/ — tick, aim, buy, rally, replant, save/export/import/wipe
    save/
      schema.ts         SaveV6 type, CURRENT_VERSION, retired-id lists
      migrate.ts        migrations[v] = (old) => new
      storage.ts        localStorage with try/catch; export/import as base64 JSON
    audio/              (M4) Web Audio: ambient loop, sfx map, music ducking
  sim/                  headless balance runner (node), imports src/sim + src/data
  test/                 cross-module tests; unit tests sit beside code
```

## Game loop
```ts
const STEP = 1 / 50;
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000); last = now;
  while (acc >= STEP) { step(state, STEP, inputs.drain()); acc -= STEP; }
  if (!document.hidden) { renderField(ctx, state, events.drain()); renderTree(...); }
  hud.update(state);               // throttled to ~6 Hz internally
  requestAnimationFrame(frame);
}
```
- When the tab is hidden, rAF pauses; on return the 0.25 s clamp means at most 12 steps run. The gap is not credited: there is no offline progress. While `run.fallen` is true, `step` returns immediately.
- Autosave every 20 s and on `beforeunload`/`pagehide`.

## SimState (sketch)
```ts
interface SimState {
  version: 1;
  seed: number; tick: number;
  run: { wave; waveT; runTime; starlight; kills; levels: Partial<Record<NodeId, number>>;
         barHp; bulwarkUsed; fallen;                       // barricade state
         spawnT; stormT; shotT: number[]; knifeT; hawkT; treantT; ballT };
  meta: { heartwood; lifetimeKills; bestWave; prestiges; hwLevels };  // hwLevels since v6
  orcs: Pool<Orc>; shots: Pool<Projectile>; vans: Pool<Vanguard>;   // object pools with free lists (SoA if the profiler asks)
  wolf: { x; y; tx; ty; biteT }; hawk: { x; y; a };
  stats: Stats;                                // recomputed on buy/prestige only (recompute() also heals new timber)
}
```
Pools expose `alloc()/free(i)` and `forEachLive(fn)`. Nothing in `sim/` holds object references across ticks except through pool indices.

## Events
`SimEvent` union in `sim/events.ts`: `kill`, `hit`, `wave`, `storm`, `hawkDive`, `treantStamp`, `bite`, `barricadeHit` (with damage fraction, drives shake), `barricadeRegrow`, `barricadeFell` (with the run summary), `vanguardRallied`, `vanguardHit`, `vanguardFell`, `bought`, `replant` (with `forced`). Render turns these into particles, floating text, shake and toasts; audio turns them into SFX. Sim never knows about either.

## Save
- `SaveV6 = { version: 6, savedAt: number, run, meta, settings }`. Pools are **not** saved; a load starts with an empty field (orcs respawn within seconds; this avoids serialising 160 orcs).
- History: v1→v2 (TB-028) drops retired node ids (`RETIRED_NODE_IDS`), fixture `src/save/fixtures/v1.ts`; v2→v3 (TB-080) retires Blood Banners and splits the spawn clock per orc kind; v3→v4 (TB-081) retires the Warboss nodes for boss waves; v4→v5 (TB-052) adds `run.earned`; v5→v6 (TB-055) adds `meta.hwLevels` (empty).
- `migrate.ts` runs `while (save.version < CURRENT) save = migrations[save.version](save)`. Every schema bump adds a migration and a test with a fixture of the previous version.
- Export: `btoa(JSON.stringify(save))` to clipboard; import parses, migrates, validates with a small schema check, then replaces state.

## Rendering
- One `<canvas>` for the field, one for the tree. `devicePixelRatio` capped at 2.
- Field draws in logical 900×480 via `setTransform`, with screen shake applied to the transform (not to the HUD bars). Draw order: plain → grove side → barricade (splintered planks from the top as HP drops, spikes if Thornwall) → treant → elves → wolf → vanguard (sorted by y) → orcs (sorted by y) → projectiles → storm → hawk → particles → text → barricade/vanguard HUD → wave bar.
- Batch by fill style where cheap (e.g. all grunts of same colour), but clarity over micro-optimisation until the profiler says otherwise.
- Tree canvas: nodes from `data/skillTree.ts` layout, pan/zoom transform stored in `render/tree.ts`, hit-test in logical space.
- Reduced motion: `matchMedia('(prefers-reduced-motion)')` read once; render modules check `motion.reduced`.

## UI
Plain DOM, no framework. `ui/panel.ts` renders the detail card with template strings and owns the rally bar and the fallen overlay; buttons dispatch intents to `GameController` (`buy(id)`, `rally(type)`, `replant()`, `setAim(x, y)` / `clearAim()`, `save()`, `exportSave()`, `importSave(str)`, `wipe()`), which is the only thing allowed to call into `sim/`. `[hidden] { display: none !important }` is in `style.css` because the standalone build has no host reset.

## Testing
- `src/**/*.test.ts`: formula pins (BALANCE.md reference tables), `deriveStats` changes for every node at max rank, tree buy rules, timber heals the wall, vanguard cap/unlock, spearmen keep the wall healthier, the bare archer falls (≥ 5 waves), a fallen run stops ticking, forced and voluntary replant, migration fixtures.
- Determinism test: two sims with same seed and scripted inputs produce identical `starlight` and `kills` after 10,000 ticks.
- `sim/` runner is also a smoke test in CI (30 sim-minutes must complete in < 5 s real time).

## Performance budget
- 200 orcs + 300 arrows + 500 particles at 60 fps on a 2020 mid-range Android.
- No GC pressure spikes: verify with Chrome performance panel, allocations per frame ≈ 0 in `step`.

## Build & deploy
- `vite build` → `dist/` static. Itch.io upload as HTML5 zip. Later: Electron shell in `desktop/` for Steam, sharing `dist/`.
