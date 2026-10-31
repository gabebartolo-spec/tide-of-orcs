# Backlog

Ids are stable (`TB-###`). Status: `todo` · `doing` · `review` · `done <hash>`. Owner is an agent name or `gabe`. One PR per row.

## M0 — Foundation
| Id | Task | Area | Depends | Owner | Status |
|---|---|---|---|---|---|
| TB-001 | Scaffold Vite + TS strict + eslint + vitest; `npm run` scripts from CLAUDE.md | infra | — | claude | done 4860f5b |
| TB-002 | `data/balance.ts` formulas + reference-table tests | data | 001 | claude | done 4860f5b |
| TB-003 | `data/skillTree.ts` from SKILL-TREE.md + schema test (ids unique, parents exist, coords in bounds) | data | 001 | claude | done 4860f5b |
| TB-004 | `sim/rng.ts` mulberry32 + determinism test | sim | 001 | claude | done 4860f5b |
| TB-005 | `sim/state.ts`, `sim/stats.ts` deriveStats with per-node max-rank tests | sim | 002,003 | claude | done 4860f5b |
| TB-006 | Generic `Pool<T>` for orcs, projectiles, vanguard; SoA only if profiling demands | sim | 001 | claude | done 4860f5b |
| TB-007 | Fixed-step loop in `main.ts`, DPR canvas, resize, hidden-tab clamp | app | 001 | claude | done 4860f5b |
| TB-008 | Save schema v1, migrate scaffold, storage try/catch, export/import | save | 005 | claude | done 4860f5b |
| TB-009 | Headless `sim/` runner with greedy/wall/nobuy policies and markdown report | sim | 005,006 | claude | done 4860f5b |
| TB-010 | GitHub Actions: lint, test, 30-min sim smoke; itch.io release on milestone tags | infra | 009 | claude | done 4860f5b |

## M1 — Vertical slice
| Id | Task | Area | Depends | Owner | Status |
|---|---|---|---|---|---|
| TB-011 | Spawner: wave timer, type rolls, boss gating, cap 160 | sim | 006 | claude | done 4860f5b |
| TB-012 | Orc movement, bob, hit flash timer, cleanup | sim | 011 | claude | done 4860f5b |
| TB-013 | Barricade: hit/regen/Deep Roots/fallen state machine + events | sim | 012 | claude | done 4860f5b |
| TB-014 | Player auto-target + volley (arrows, fan, pierce, crit) | sim | 012 | claude | done 4860f5b |
| TB-015 | Arrow–orc collision, damage, kill, loot grant | sim | 014 | claude | done 4860f5b |
| TB-016 | Vanguard: rally, walk to lane, engage, swing, cleave, mend, death | sim | 013 | claude | done 4860f5b |
| TB-017 | Pointer aiming: bow follows the pointer, auto-target fallback, reticle; no click-to-shoot | ui/sim/render | 014 | claude | done |
| TB-018 | `render/field.ts`: plain, barricade with splinters, elf, orcs, vanguard, projectiles, HUD bars, shake | render | 012 | claude | done 4860f5b (first pass; TB-060 polishes) |
| TB-019 | `render/particles.ts` + floating text from events | render | 015 | claude | done 4860f5b |
| TB-020 | Tree canvas: draw, select, buy, affordable pulse, legend | render/ui | 003,005 | claude | done 4860f5b |
| TB-021 | Tree pan (drag) and zoom (wheel/pinch) | render | 020 | claude | done ede6878 |
| TB-022 | Detail card, buy button, toasts, HUD numbers, `format.ts` | ui | 020 | claude | done 4860f5b |
| TB-026 | Rally bar: Spearman/Bladedancer buttons with cost, full/unaffordable states | ui | 016 | claude | done 4860f5b |
| TB-027 | Fallen overlay: summary, Heartwood, Replant button; forced replant flow | ui | 013 | claude | done 4860f5b |
| TB-028 | Save migration: drop deprecated node ids (River `tide`,`current`,`flood`,`silt`; `roots`) from v1 saves | save | 008 | claude | done ffe9c82 |
| TB-023 | Offline award: removed by director 2026-10-30, no offline progress | sim/ui | 008 | claude | won't do |
| TB-024 | Autosave 20 s, beforeunload/pagehide | save | 008 | claude | done 4860f5b |
| TB-025 | First-run flow check against BALANCE.md pacing targets; resolve P-001 | balance | 009,016 | claude | done 00a6c38 |

## M2 — Companions & armoury
| Id | Task | Area | Depends | Owner | Status |
|---|---|---|---|---|---|
| TB-030 | Wolf AI + bite + render | sim/render | 015 | claude | done 4860f5b (ported in M0) |
| TB-031 | Ranger/Warden archers | sim/render | 014 | claude | done 4860f5b (ported in M0) |
| TB-032 | Hawk circle + dive + burst | sim/render | 015 | claude | done 4860f5b (ported in M0) |
| TB-033 | Treant stamp | sim/render | 015 | claude | done 4860f5b (ported in M0) |
| TB-034 | Throwing knives | sim/render | 015 | claude | done 4860f5b (ported in M0) |
| TB-035 | Fire arrows burn + flame particles | sim/render | 015 | | done e221d10 |
| TB-036 | Storm Glade chain + lilac polyline | sim/render | 015 | claude | done 4860f5b (ported in M0) |
| TB-037 | Ballista + bolt render | sim/render | 015 | claude | done 4860f5b (ported in M0) |
| TB-038 | Moonbow homing | sim | 014 | claude | done 4860f5b (ported in M0) |
| TB-039 | Kinship/Bounty/Horde wiring + tests | sim | 005 | claude | done a2e391d |
| TB-040 | Sim policy `dps` (lookahead) | sim | 009 | claude | done b96cd93 |

## M3 — Prestige
| Id | Task | Area | Depends | Owner | Status |
|---|---|---|---|---|---|
| TB-050 | `prestige.ts` gain + forced/voluntary replant + tests | sim | 005 | claude | done 4860f5b |
| TB-051 | Replant ceremony (burn, seed, dawn) for both forced and voluntary replant; reduced-motion path | ui/render | 050 | claude | done 5fcc939 |
| TB-052 | Run summary screen | ui | 050 | claude | done 4bd58c9 |
| TB-053 | Heartwood tree data + stats + UI | data/sim/ui | 050 | claude | done dd09286 |
| TB-054 | Balance pass #1: hit BALANCE.md pacing targets; write Proposed | balance | 040,053 | claude | done 1185a3a |
| TB-085 | Re-run dps vs greedy after TB-080/TB-054 | balance | 054 | claude | done 0ea2a6f |
| TB-086 | Re-measure spearman vs Timber pacing target at wallMult 10 | balance | 054 | claude | done ad45cb6 |
| TB-055 | Save schema v6 (meta.hwLevels) + migration fixture test | save | 053,028 | claude | done dd09286 |

## M4 — Presentation
| Id | Task | Area | Depends | Owner | Status |
|---|---|---|---|---|---|
| TB-060 | Sprite-sheet loader with atlas JSON and vector fallback; draw actors from sheets when present | render | M2 | claude | done 47e4010 |
| TB-068 | Tripo models + Cascadeur loops → sheets for orcs, elf, vanguard, companions (ART-STYLE §Asset pipeline) | art | 060 | gabe | todo |
| TB-069 | ElevenLabs SFX set (14) + ambient bed, exported per ART-STYLE | audio | — | gabe | todo |
| TB-061 | Parallax hills, day/night tint, bank lamplight | render | 018 | claude | done 71d05f4 |
| TB-062 | Audio engine: ambient loop, SFX map from events, ducking | audio | 019,069 | claude | done 09b60cf |
| TB-063 | Music beds ×2, crossfade on Replant, boss-wave track (Suno MP3s in `public/audio/`) | audio | 062 | claude | done (PR #9) |
| TB-064 | Mobile layout, touch targets, pinch zoom on tree. M1 check (375×812): Learn and Replant buttons 33 px, tabs 39 px, Save now/Wipe 29 px (target 44); hint text says "move your pointer" (touch needs its own copy); field is 343×183 px | ui | 021 | claude | done ddc732d |
| TB-065 | Settings tab: volume, reduced motion override, number format, export/import | ui | 008 | claude | done 0ed4259 |
| TB-066 | Tree layout polish: curved branch lines, camera ease to selected | render | 021 | claude | done e4d999a |
| TB-067 | Strings table audit; all copy via `strings.ts` | ui | — | claude | done d26c4c5 |
| TB-088 | Attack and hit VFX for every unit: wind-up/release cue and impact per orc kind, elf lob, archers, spearman, bladedancer, companions; blood (spray + fading ground splats, new `bloodOrc`/`bloodElf` tokens); pooled, numbers in `data/presentation.ts` | render | 019 | claude | done (904b970, 0f6afd4) |

## M5 — Ship
| Id | Task | Area | Depends | Owner | Status |
|---|---|---|---|---|---|
| TB-070 | Local telemetry export (JSON of run stats) for testers | app | 052 | claude | done f31ce6b |
| TB-071 | Balance pass #2 from tester data | balance | 070 | gabe | todo |
| TB-072 | Perf verification on phone; profile and fix | perf | M4 | | dropped (mobile off roadmap, 31 Oct) |
| TB-073 | Itch.io page copy, screenshots, HTML5 zip pipeline | release | 072 | gabe | todo |
| TB-074 | Electron wrapper spike | release | 073 | | todo |
| TB-075 | Bug bash checklist run | qa | 072 | | todo |
| TB-076 | Move 6 colour literals in src/render (rgba/hex) into palette tokens (rule 6) | render | | claude | done c189562 |
| TB-077 | Move inline tree multipliers in sim/stats.ts (1.25, 1.15, 1.2, 1.4 …) into data/balance (rule 3) | sim/data | | claude | done c189562 |
| TB-078 | Fallen overlay clips on phones: at 375 px the field is 183 px tall and the Replant button starts at its bottom edge, so it is unreachable (rule 1). Fit overlay to field height or move it out of the canvas box | ui | 027 | | done 9bfcc0e |
| TB-079 | Aiming redesign: arcing lob every 2.5 s into a 40 px strike circle, all orcs inside hit; no fire without aim; Wide Volley node; Split Shot, Longshaft, Moonbow re-skinned | sim/render | | claude | done 16e3060 |
| TB-080 | Enemy types: only grunts at first; runners, brutes, elites (new), warboss summoned by Grove nodes; per-kind Fury and Swarm nodes; Blood Banners retired (save v3); orc wall damage raised so a bare run falls at wave 3–4 | sim/data | | claude | done 4ed98fb |
| TB-082 | Tree opens at 1:1 on Waking instead of fit-to-width (unreadable in the 378 px panel); enemy Fury/Swarm nodes stacked so labels don't collide | render | 021 | claude | done 5cb30c1 |
| TB-081 | Boss waves: every 10 waves a boss wave unlocks; the player summons it, starting a 60 s challenge of bespoke mini-waves. Replaces the Warboss summon, Fury, Swarm and Bounty nodes (save v4) | sim/ui | 080 | claude | done e3b4536 |

## Icebox
- Starfall, Owl, Mist, Lantern nodes (SKILL-TREE.md Planned).
- Second biome (fjord: ice wall that melts instead of splinters).
- Gatehouse, Standard Bearer nodes (SKILL-TREE.md Planned).
- Achievements. Cloud save. Localisation.
| TB-090 | Loot L0: item schema (`data/loot.ts`), `meta.loot`, save v7 migration + test | save | 054 | claude | done (tb-090-loot) |
| TB-091 | Loot L0: affix pool, 24 base types, 7 sets, 8 mythics in `data/loot.ts`; formula tests | data | 090 | claude | done (tb-090-loot) |
| TB-092 | Loot L0: `lootTier` per orc kind; seeded drop, rarity, affix and pity rolls, property-tested | sim | 091 | claude | done (tb-090-loot) |
| TB-093 | Loot L0: `sim/loot.ts` greedy/hoarder equip policies; loot columns in `npm run balance` | sim | 092 | claude | done (tb-090-loot) |
| TB-094 | Loot L1: kills roll drops on `lootRng` (own stream), `loot` event, player pick-up (empty slots only, loot filter), worn affixes + set bonuses into Stats via `sim/gear.ts` | sim | 093 | claude | done (tb-094-drops) |
| TB-095 | Loot L1: Satchel tab (`src/ui/satchel.ts`): six worn slots, satchel grid with count/cap and Glimmer, picked item with affixes, mythic power/cost and power delta against the worn item; rarity colours from palette tokens | ui | 094 | claude | done (tb-095-satchel) |
| TB-096 | Loot L1: satchel controls. Wear, Lock/Unlock, Salvage (worn and locked items refuse), "Keep" loot filter (common to legendary; sets and mythics always kept), toasts for epic and better pick-ups. Intents equipItem/salvageItem/lockItem/setLootFilter on GameController; equip recomputes Stats; each change saves | ui | 095 | claude | done (tb-096-satchel-controls) |
