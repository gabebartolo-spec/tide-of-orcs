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
| TB-028 | Save migration: drop deprecated node ids (River `tide`,`current`,`flood`,`silt`; `roots`) from v1 saves | save | 008 | | todo |
| TB-023 | Offline award: removed by director 2026-10-30, no offline progress | sim/ui | 008 | claude | won't do |
| TB-024 | Autosave 20 s, beforeunload/pagehide | save | 008 | claude | done 4860f5b |
| TB-025 | First-run flow check against BALANCE.md pacing targets; resolve P-001 | balance | 009,016 | gabe | todo |

## M2 — Companions & armoury
| Id | Task | Area | Depends | Owner | Status |
|---|---|---|---|---|---|
| TB-030 | Wolf AI + bite + render | sim/render | 015 | | todo |
| TB-031 | Ranger/Warden archers | sim/render | 014 | | todo |
| TB-032 | Hawk circle + dive + burst | sim/render | 015 | | todo |
| TB-033 | Treant stamp | sim/render | 015 | | todo |
| TB-034 | Throwing knives | sim/render | 015 | | todo |
| TB-035 | Fire arrows burn + flame particles | sim/render | 015 | | todo |
| TB-036 | Storm Glade chain + lilac polyline | sim/render | 015 | | todo |
| TB-037 | Ballista + bolt render | sim/render | 015 | | todo |
| TB-038 | Moonbow homing | sim | 014 | | todo |
| TB-039 | Kinship/Bounty/Horde wiring + tests | sim | 005 | | todo |
| TB-040 | Sim policy `dps` (lookahead) | sim | 009 | | todo |

## M3 — Prestige
| Id | Task | Area | Depends | Owner | Status |
|---|---|---|---|---|---|
| TB-050 | `prestige.ts` gain + forced/voluntary replant + tests | sim | 005 | claude | done 4860f5b |
| TB-051 | Replant ceremony (burn, seed, dawn) for both forced and voluntary replant; reduced-motion path | ui/render | 050 | | todo |
| TB-052 | Run summary screen | ui | 050 | | todo |
| TB-053 | Heartwood tree data + stats + UI | data/sim/ui | 050 | | todo |
| TB-054 | Balance pass #1: hit BALANCE.md pacing targets; write Proposed | balance | 040,053 | | todo |
| TB-055 | Save schema v2 (hwLevels) + migration fixture test | save | 053,028 | | todo |

## M4 — Presentation
| Id | Task | Area | Depends | Owner | Status |
|---|---|---|---|---|---|
| TB-060 | Sprite-sheet loader with atlas JSON and vector fallback; draw actors from sheets when present | render | M2 | | todo |
| TB-068 | Tripo models + Cascadeur loops → sheets for orcs, elf, vanguard, companions (ART-STYLE §Asset pipeline) | art | 060 | gabe | todo |
| TB-069 | ElevenLabs SFX set (14) + ambient bed, exported per ART-STYLE | audio | — | gabe | todo |
| TB-061 | Parallax hills, day/night tint, bank lamplight | render | 018 | | todo |
| TB-062 | Audio engine: ambient loop, SFX map from events, ducking | audio | 019,069 | claude | done 09b60cf |
| TB-063 | Music beds ×2, crossfade on Replant | audio | 062 | | todo |
| TB-064 | Mobile layout, touch targets, pinch zoom on tree | ui | 021 | | todo |
| TB-065 | Settings tab: volume, reduced motion override, number format, export/import | ui | 008 | | todo |
| TB-066 | Tree layout polish: curved branch lines, camera ease to selected | render | 021 | | todo |
| TB-067 | Strings table audit; all copy via `strings.ts` | ui | — | | todo |

## M5 — Ship
| Id | Task | Area | Depends | Owner | Status |
|---|---|---|---|---|---|
| TB-070 | Local telemetry export (JSON of run stats) for testers | app | 052 | | todo |
| TB-071 | Balance pass #2 from tester data | balance | 070 | gabe | todo |
| TB-072 | Perf verification on phone; profile and fix | perf | M4 | | todo |
| TB-073 | Itch.io page copy, screenshots, HTML5 zip pipeline | release | 072 | gabe | todo |
| TB-074 | Electron wrapper spike | release | 073 | | todo |
| TB-075 | Bug bash checklist run | qa | 072 | | todo |

## Icebox
- Starfall, Owl, Mist, Lantern nodes (SKILL-TREE.md Planned).
- Second biome (fjord: ice wall that melts instead of splinters).
- Gatehouse, Standard Bearer nodes (SKILL-TREE.md Planned).
- Achievements. Cloud save. Localisation.
