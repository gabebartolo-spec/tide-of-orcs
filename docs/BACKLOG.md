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
| TB-068 | Tripo models + Cascadeur loops → sheets for orcs, elf, vanguard, companions (ART-STYLE §Asset pipeline) | art | 060 | gabe, claude | doing (in game: every orc kind, elf, both vanguard, wolf; elite draws the berserker sheet and the boss the brute sheet via `ORC_SPRITE`, director 3 Nov; wolf rider run v8 approved 3 Nov (blam wolf run copied onto the rider wolf, orc at rest); hawk flight v1 approved 3 Nov (OSU CC BY Sketchfab hawk, own flap clip, on the orc sheet); nothing left vector) |
| TB-069 | ElevenLabs SFX set (16) + ambient bed, exported per ART-STYLE | audio | — | claude | SFX done b3e4c5f (16 cues, OGG+MP3, −16 LUFS; loose, knife, bossRoar, click, denied wired); ambient bed done (30 s seamless loop, take A, director pick); `ignite` plays on the elf's release with Fire Arrows (director call); `warDrum` cue added 1 Nov (100 credits, acked), unwired until the drummer unit exists |
| TB-061 | Parallax hills, day/night tint, bank lamplight | render | 018 | claude | done 71d05f4 |
| TB-062 | Audio engine: ambient loop, SFX map from events, ducking | audio | 019,069 | claude | done 09b60cf |
| TB-063 | Music beds ×2, crossfade on Replant, boss-wave track (Suno MP3s in `public/audio/`) | audio | 062 | claude | done (PR #9) |
| TB-064 | Mobile layout, touch targets, pinch zoom on tree. M1 check (375×812): Learn and Replant buttons 33 px, tabs 39 px, Save now/Wipe 29 px (target 44); hint text says "move your pointer" (touch needs its own copy); field is 343×183 px | ui | 021 | claude | done ddc732d |
| TB-065 | Settings tab: volume, reduced motion override, number format, export/import | ui | 008 | claude | done 0ed4259 |
| TB-066 | Tree layout polish: curved branch lines, camera ease to selected | render | 021 | claude | done e4d999a |
| TB-067 | Strings table audit; all copy via `strings.ts` | ui | — | claude | done d26c4c5 |
| TB-088 | Attack and hit VFX for every unit: wind-up/release cue and impact per orc kind, elf lob, archers, spearman, bladedancer, companions; blood (spray + fading ground splats, new `bloodOrc`/`bloodElf` tokens); pooled, numbers in `data/presentation.ts` | render | 019 | claude | done (904b970, 0f6afd4) |
| TB-089 | Arrow arsenal: Rebound, Starfall, Frost Arrows, Shatter, Shock Arrows, Thunderclap nodes; VFX for each plus Fire Arrows strike; 7 ElevenLabs SFX (P-002 numbers) | sim/render/audio | 088 | claude | done (PR #15, c069ff1; P-002 simmed 2 Nov) |

## M5 — Ship
| Id | Task | Area | Depends | Owner | Status |
|---|---|---|---|---|---|
| TB-070 | Local telemetry export (JSON of run stats) for testers | app | 052 | claude | done f31ce6b |
| TB-071 | Balance pass #2 from tester data | balance | 070 | gabe | dropped (director 1 Nov: no testers; the sim answers balance) |
| TB-072 | Perf verification on phone; profile and fix | perf | M4 | | dropped (mobile off roadmap, 31 Oct) |
| TB-073 | Itch.io page copy, screenshots, HTML5 zip pipeline (pipeline: itch.yml; page: ITCH-PAGE.md, docs/itch/) | release | — | claude | done (PR 96, 972440b; page text and screenshots on itch 1 Nov, page kept Restricted) |
| TB-074 | Electron wrapper spike | release | 073 | claude | done (0965ce2) |
| TB-075 | Bug bash checklist run (`docs/QA-CHECKLIST.md`; run 1 hidden, run 2 visible, both 1 Nov) | qa | — | claude | done (c8e9264, run 2 in this PR) |
| TB-076 | Move 6 colour literals in src/render (rgba/hex) into palette tokens (rule 6) | render | | claude | done c189562 |
| TB-077 | Move inline tree multipliers in sim/stats.ts (1.25, 1.15, 1.2, 1.4 …) into data/balance (rule 3) | sim/data | | claude | done c189562 |
| TB-078 | Fallen overlay clips on phones: at 375 px the field is 183 px tall and the Replant button starts at its bottom edge, so it is unreachable (rule 1). Fit overlay to field height or move it out of the canvas box | ui | 027 | | done 9bfcc0e |
| TB-079 | Aiming redesign: arcing lob every 2.5 s into a 40 px strike circle, all orcs inside hit; no fire without aim; Wide Volley node; Split Shot, Longshaft, Moonbow re-skinned | sim/render | | claude | done 16e3060 |
| TB-080 | Enemy types: only grunts at first; runners, brutes, elites (new), warboss summoned by Grove nodes; per-kind Fury and Swarm nodes; Blood Banners retired (save v3); orc wall damage raised so a bare run falls at wave 3–4 | sim/data | | claude | done 4ed98fb |
| TB-082 | Tree opens at 1:1 on Waking instead of fit-to-width (unreadable in the 378 px panel); enemy Fury/Swarm nodes stacked so labels don't collide | render | 021 | claude | done 5cb30c1 |
| TB-081 | Boss waves: every 10 waves a boss wave unlocks; the player summons it, starting a 60 s challenge of bespoke mini-waves. Replaces the Warboss summon, Fury, Swarm and Bounty nodes (save v4) | sim/ui | 080 | claude | done e3b4536 |
| TB-087 | New orc kinds (director, 31 Oct): berserker, war drummer, shaman, wolf rider. Models made in TB-068; behaviour, stats (BALANCE.md) and wave mix need director design first | sim | 068 | | done 3 Nov (#148): four kinds, behaviours, tier escort, Grove nodes; join waves 25/30/35/40 (director); Grove costs still draft, see P-087 |
| TB-098 | Field ground redesign (director, 31 Oct): seeded grass tufts, small rocks, worn and barren patches, pre-rendered offscreen | render | | claude | done (PR) |
| TB-099 | Loot sets: 7 sets with 2/4/6-piece effects on the field (planned as "TB-098" on the loot branch; renumbered, TB-098 is the field ground) | sim/render | 097 | claude | superseded by the L3 TB-099 row below |
| TB-100 | Loot mythic powers (planned as "TB-099" on the loot branch) | sim/render | 099 | claude | superseded by the L3 TB-100 row below |

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
| TB-097 | Loot L2: glyph icons per slot (`src/ui/glyphs.ts`, inline SVG in currentColor) with rarity frames whose shape differs too (common faint, rare solid, epic double, legendary square, mythic glow); used in worn slots, satchel grid and item detail. Fallback until TB-103 models | ui | 096 | claude | done (tb-097-glyphs) |
| TB-099 | Loot L3: set bonus engine and all 7 sets' 2/4/6 effects on the field (bleed, burn spread, Cinderground, rebound chains, bolt shove and pin, Moonwells, extra wolf, treant root, Rootwarden free rally); worn-set panel in the Satchel. Numbers in `SET_FX` (lootTables) | sim | 097 | claude | done (tb-098-sets) |
| TB-100 | Loot L3: the 8 mythic powers on the field (Last Knife return, Kiln burn ramp, Thunder charges, Oakspine stakes, Pale Moon draw, First Wolf stacks, Heartwood Splinter second wall, Starfall). Numbers in `MYTHIC_FX` (lootTables) | sim | 098 | claude | done (tb-099-mythics) |
| TB-110 | Save v8: Thunder charges, Heartwood Splinter's used flag and Rootwarden's free-rally flag move into the saved `run`, so a reload cannot reset them; 7→8 migration + test | save | 100 | claude | done (tb-110-save-v8) |
| TB-111 | Per-type upgrade nodes (director 1 Nov): 3 nodes per shot type (damage, effect, chance per shot), damage/rate/crit→crit damage per companion and vanguard unit, move speed for melee units, Deadly Aim for the elf; 48 nodes, 56 → 104; tree canvas 1288×1262. Numbers P-103 | sim/data | 101 | claude | done (616a8c0, PR 31; renumbered from TB-103, which the loot plan holds) |
| TB-112 | Tree tooltip says "needs <parent>" even when the parent is owned (`ui/panel.ts`); show it only while the parent is unowned | ui | 075 | claude | done (f288c68) |
| TB-113 | Perf: rerun QA J1 in a visible browser (160 orcs); the hidden-pane run showed 4–6% of frames over 16.7 ms with draw spikes up to 330 ms. Profile and fix if they reproduce | perf | 075 | claude | done (QA run 2: no spikes in visible rAF frames; still untested on a mid-range PC) |
| TB-150 | Perf: measure 160 orcs at 1080p and 4K, with a slower CPU standing in for a mid-range PC (`tools/perf160.mjs`) | perf | 113 | claude | done (PR 95, 5924c80; QA run 4: 60 fps or better at 1080p down to 6× slower CPU, at 4K down to 4× slower, 53 fps at 6×) |
| TB-151 | Balance: price run-tree nodes by power (P-147 table); sim Quick Draw, Keen Eye and Nimble Wrist price sets, propose in BALANCE P-151 | balance | — | claude | done (79a9b02) |
| TB-155 | Mobile controls for the itch web build (director 2 Nov): hold-to-aim with the circle lifted above the finger, second finger free for Rally, portrait asks for landscape, short-landscape layout for run and camp, phone fit floor 80 % with in-tab scroll (director 2 Nov: "yes, phones only"; TB-153 no-scroll stays for PC), no browser touch gestures (GDD §11) | ui | — | claude | done (e4911f2, PR 117) |
| TB-156 | Vanguard march to the nearest orc (director playtest 2 Nov: "can't walk yet, relatively useless"): each unit walks out to engage the closest orc on the field and returns to its wall lane when the field is clear; tests for target pick, return, lane spacing | sim | — | claude | done (in 1346a52 build) |
| TB-157 | Wolf nerf (director playtest 2 Nov: "trivialises the early game"; director chose price + nerf AND gate it later): raise the Grey Wolf node price, cut bite damage, move the node deeper in the tree so it is not a first buy; `npm run balance` before/after in BALANCE | balance | — | claude | done (836ae22, PR 126) |
| TB-158 | Orc mix by wave (director playtest 2 Nov: "only saw grunts"; chose join by wave): runners and brutes join the tide on their own from set waves; summon nodes add more of them for more starlight; GDD §4 update, sim check. Director: join waves 5/10/20; summon node = 2× spawn, +50% starlight | sim | — | claude | done (270d815, PR 135) |
| TB-159 | Checkpoint waves (director playtest 2 Nov: pacing; chose every 10, start at last; 10 not fixed): clearing wave 10, 20, 30… saves a checkpoint and the next run starts there; sim the interval and report if another number fits better; save migration + GDD | sim | — | claude | done (ba521f8, PR 136) |
| TB-160 | Wolf model (director 2 Nov: "we need a dog model"): replace the two-ellipse vector wolf (`render/field.ts` wolf()) with a sprite in the elf/orc atlas style; run, bite, idle frames. Spend: director's written yes 2 Nov for Meshy, about 100 credits; model made 2 Nov (preview 20 + texture 10 = 30 credits); our mesh did not fit a free rig, so blam's CC BY Sketchfab wolf (credited in CREDITS.md) retextured from ours (10 credits), project C:/Users/DANTE/meshy/20261102_172807_wolf_c071 | art | — | claude | done (PR 122) |
| TB-161 | Animation speed matches the game (director 2 Nov: spearman attack "wayy too fast", grunts once walked too fast too): spear attack loop is 50 frames at 15 fps against a 0.8 s swing; play each attack once per sim swing at the source clip's real-time rate, and check every vanguard and new orc kind (TB-158) against its source clip before it ships | render | — | claude | done |
| TB-163 | Arcane tree skill tree (director 2 Nov: "let the shape of a tree inform the design of the tree"): the node layout itself draws a beautiful arcane tree — root at the trunk base, branches as boughs, leaf nodes as foliage; the links render as trunk, branches and leaves that grow as nodes are bought, with sparkles and particle effects on links and nodes. Re-lay node x/y in skillTree.ts and SKILL-TREE.md to fit the tree shape | ui | — | claude | done 44216ac |
| TB-154 | Early game tuning (director 1 Nov): no one-shot lobs, thinner wall, harder-hitting orcs. Hard set: `LOB.dmgMult` 1, `LOB.cd` 1.25, wall 150, `wallMult` 25 (BALANCE P-154) | sim | — | claude | done (PR 101, 9d598b7) |
| TB-153 | Camp pages fit one screen (director 1 Nov: "scrolling is aids"): Satchel, Replant and Settings never scroll; the Grove page fits and only the skill tree pans. Replant and Settings in two columns, slimmer chrome under 800 px tall, `src/ui/fit.ts` scales a page down only as a last resort | ui | 136 | claude | done (PR 102, dd6ce11) |
| TB-114 | Loot: affixes that scale a feature the player does not own (Packbond without the wolf, Thorns without Spikes) roll and do nothing; director chose gate: they roll only while the feature is owned | loot | 075 | claude | done (1d3063f) |
| TB-115 | Rename pass in the elf's voice (director's doc, 1 Nov): 49 skill nodes, 5 Grudges lines, currency Teeth/Grudge, Burn It Down, Fence, Lads, orc kinds and the player copy; then (director: do it yourself) the 55 later nodes, 6 loot Grudges lines, 7 sets and 8 mythics in the same voice; game title A Lot of Orcs (director, 1 Nov); branch display labels; ids and save unchanged | data/ui | 111 | claude | done (PR #35, e08d2ca) |
| TB-116 | Tree keyboard access (QA B5): the tree canvas takes no focus or keys. Make nodes reachable by Tab or arrows and buyable by Enter (GDD §13) | ui | 075 | claude | done (33cf889) |
| TB-117 | Tree: the branch legend (BOW, COMPANIONS …) is drawn over node labels at the top of the tree (QA run 2) | ui | 075 | claude | done (831aef2) |
| TB-118 | Desktop: bundle the Spectral and Atkinson Hyperlegible fonts instead of loading Google Fonts, so the Electron build looks right offline (TB-074 finding) | release | 074 | claude | done (4e10b33) |
| TB-119 | Desktop: package the Electron shell into a Windows build for Steam (electron-builder, `npm run desktop:pack` → `release/win-unpacked/`) | release | 074 | claude | done (a0a0dc5) |
| TB-120 | Desktop: app icon (the director's art, `desktop/icon.png` → exe .ico via electron-builder) | release | 119 | claude | done (2e28a11) |
| TB-121 | Rename the game to Let's Hunt Some Orc! (director, 1 Nov): page title, header, strings title, desktop productName, doc headings; repo name and save keys unchanged | ui/docs | 115 | claude | done (e439fcf) |
| TB-122 | Desktop: first SteamPipe depot upload of `release/win-unpacked/` (needs the Steam app id, i.e. the ~$100 Steam Direct fee: spend, needs the director's written yes) | release | 119 | | dropped (director 1 Nov: commercial release is a maybe for later) |
| TB-123 | Bug bash run 3 on main after sprites, fonts, rename, affix gate and desktop icon (`docs/QA-CHECKLIST.md`) | qa | 075 | claude | done (4fc3a48) |
| TB-124 | Waves: grunts held at the wall can fill the 160-orc cap and starve the summoned kinds (runner, brute, blackguard) of slots; needs a design call (reserved slots per kind, or a grunt share of the cap) | sim | 123 | claude | won't fix: 3 headless 2 h runs (greedy, best wave 60–61) sat at the cap 0.4–0.7% of ticks and refused 0.7–1.1% of spawns, spread over the kinds by spawn rate (each kind has its own clock); director closed it 1 Nov |
| TB-125 | Balance: at high waves one orc swing can exceed the wall's max HP (QA run 2), so the wall can fall in one hit; propose a cap or a gentler damage curve under BALANCE `## Proposed` with sim output | balance | 123 | claude | done (40219c5): one hit capped at 25% of the wall's max (P-125 A) |
| TB-101 | Loot L4: Spoils branch (7 Grove nodes) and 6 Heartwood loot lines (Far Sight, Fortune's Favour, Deep Satchel, Warboss Tithe, Heirloom, Glimmerwork) with requirements; save v9 adds the Heirloom uid. Numbers P-101 | sim | 110 | claude | done (9e8b756) |
| TB-102 | Loot L5: spend Glimmer to reroll one affix on a worn item; cost doubles per reroll on that item, Glimmerwork ×0.6. Numbers P-102 | sim | 101 | claude | done (4d924fe) |
| TB-103 | Loot L6: Replant screen lists items found this run by rarity and the best drop, in its rarity colour | ui | 102 | claude | done (d74f6a5) |
| TB-105 | Loot L8: loot VFX. Drop beams per rarity (common glint; rare/epic/legendary/mythic beams 1/1.5/2/3 s, epic mote spiral, legendary+ ground ring), mythic 0.5 s hold then 0.6× for 0.5 s with a rose screen edge; equip glows the bow and flashes the worn card; set tier rise rings the elf with leaves 2 s; salvage flashes the count; reroll line fades in. Reduced motion keeps beams and colour flashes only. HUD quiver streak/bounce skipped (no HUD quiver). SFX are TB-106 | render/ui | 103 | claude | done (be4e1b7) |
| TB-107 | Loot L9: loot telemetry. Drop, equip, salvage, reroll and set-tier events (wave, run, minutes since the first logged event, rarity/slot/base/set) in their own localStorage key (cap 5000), buffered in GameController and written with each save; the Settings export gains `loot`. No save schema change | app | 105 | claude | done (PR #36, 54ab3db) |
| TB-108 | Loot L10: balance pass. sim/run.ts reports loot milestones (first drop, first of each rarity by run/minute/boss, first 6-piece set), gear and mythic power ratios, `--hw` ranks and a `--bare` baseline; tuning proposed in BALANCE.md `## Proposed` | sim | 107 | claude | done (P-108 applied, PR 50) |
| TB-127 | Shaman fireball VFX + SFX: `fireball` projectile (arc, flight, radius in `FIREBALL`, damage 0 until TB-087), `fireballCast`/`fireballStrike` events, in-flight comet ball with embers and shadow, strike flash → fire puffs → dust ring → ember fountain → scorch patch, cues `fireballCast`/`fireballHit` (ElevenLabs, ≈14.7 credits, yes 1 Nov) | render/audio | 068, 087 | claude | done (06c88e0) |
| TB-126 | Combat stalls past wave ~117: 0 kills/min, wall 100%, waves keep ticking (sim seed 3, bosses every 60, reached wave 463). Find the overflow or spawn stall and fix | sim | 108 | claude | done (179a2ec) |
| TB-128 | Loot L11: mythic and reroll tuning. Runner `--mythic <id>` (forced, locked, power-off trial) and `--reroll` policy; 8 mythics and Glimmer reroll measured on 4 seeds; retune proposed as P-128, closing P-100 and P-102 | sim | 108 | claude | done 7409e52 (2 Nov: all seven reworked onto the lob, then onto reach; Starfall B and Thunder B applied (PR 112), reach versions of Knife, Kiln, Splinter, Wolf merged (PR 113); results in P-128) |
| TB-104 | Loot L7: item models for the worn slots and satchel, replacing the TB-097 glyph fallback (Meshy, Smart Topology; director yes 1 Nov) | art | 097 | claude | done (0cb5c6e, PR 63; icons centred in TB-131) |
| TB-129 | Split the sprite sheet: `sheet_orcs.webp` (orc.* keys) + `sheet_elf.webp` (elf, vanguard), one atlas with `image` per anim, loader decodes every sheet; the single sheet had reached 2753 KB against a 2 MB budget | art | 068 | claude | done (orcs 1776 KB, elf 945 KB) |
| TB-130 | Restore real names for the 76 skill nodes, Heartwood nodes, sets and mythics that TB-115 renamed as jokes (ids unchanged; director 1 Nov: "actual names") | data | 115 | claude | done (5b1aa11, PR 66) |
| TB-131 | Loot icons: new Last Knife, Heartwood Splinter, Yew Longbow, Ashwood Bow, Ranger Boots, First Wolf and Acorn Charm models (image route, 177 credits), every satchel icon centred in its square (centre_icons.py) | art | 104 | claude | done (PR 67) |
| TB-132 | Starting aim circle 40 → 20 px radius: at 40 (52 px reach on a grunt) one wave-1 arrow killed several orcs (director 1 Nov). Wide Volley ×1.2^r unchanged, so rank 4 restores 41 px | sim | 079 | claude | done (871d50f, PR 69) |
| TB-134 | Elf floating quiver bobs like magic: 4 cm bob in ~40-frame cycles with drift and wobble (was 1.5 cm once per loop), quiver 0.38 m so the drawn arrowhead stays inside, elf sheet frames at ORTHO 1.6 (director 1 Nov) | art | 068 | claude | done (a981dae) |
| TB-106 | Loot L8b: loot SFX per rarity drop, mythic drop, equip, salvage, reroll, set tier rise (ElevenLabs, needs the director's spend yes) | audio | 105 | claude | done (9bf87a4, PR 58) |
| TB-133 | Orc sprites play in fast forward: `field.ts` drew `clock + o.wob`, and the sim adds 8 to `wob` per second, so every orc clip ran at 9x (grunt walk 1.1 s loop in 0.12 s). Sprite clock is now `wob / ORC_WOB` (real speed, random phase per orc) | render | 068 | claude | done (6af8f57, PR 70) |
| TB-135 | Heartwood, the game's own elf display face: broad-nib stroke engine in `tools/typeface/` (Python: fonttools, skia-pathops, brotli), 95 characters, kerning, tabular figures; replaces Spectral in every display slot (one weight, no italic, sizes +2 to 4 px). Director 1 Nov: "Yes, wire it in" | art | 118 | claude | done (c237d5d) |
| TB-136 | Living-wood UI: deep forest green replaces the blue, gilded vine background, Blender-carved frame and button PNGs (`art/ui/carve.py`), run / camp / settings pages (the Grove tree and Satchel only after a fall; starlight spent there and carried over; replant keeps Grove levels), remaining TB-112 joke names restored (director 1 Nov) | ui | 130 | claude | done (9d9fc56) |
| TB-137 | Heartwood everywhere: the game's own face is the only font, DOM and canvas; Spectral and Atkinson removed; ∞ and → added to the face (97 glyphs) | ui | 136 | claude | done (ff134b3) |
| TB-138 | Fullscreen run and readable text: field fits the window with overlay HUD, thinner frame; parchment text +2 px with ink halo; hills span grove and fence | ui | 137 | claude | done (54a4e37) |
| TB-139 | Balance bot buys between runs: since TB-136 nodes are bought only after a fall, but `sim/run.ts` replanted at once and never bought (best wave 16 in 300 min, seed 1). The policy now shops on each fall until nothing is affordable; dps trials replant the copy. Best wave now 65 greedy, 67 dps (seed 1) | sim | 136 | claude | done (4667644, PR 81) |
| TB-140 | Save: version migration test suite (M5). Real v2–v8 fixtures, each played 20 min and saved by the last build at its version; every old save v1–v8 must migrate, load as GameController does, play 60 s with no NaN, and round-trip export/import | save | 110 | claude | done ae4aedc |
| TB-141 | Barricade planks flicker: below the HP line each plank re-rolled `Math.random() < frac` every frame, so a damaged wall strobed. Each plank now has a fixed break point (golden-ratio scatter), so damage reads steady | render | — | claude | done e02cef3 |
| TB-142 | Tree-gated balance (P-142): Heartwood only from bosses (every 25 waves) plus a flat 1 per fall, no Heartwood passive, Gleaning moved under War Drums and weakened to +8%/rank × 5 | balance | — | claude | done 3276a16 |
| TB-143 | Scale the game to a 4K screen: all UI sizes in rem off a root font that grows from 16 px at 1080p to 32 px at 3840×2160; tree canvas draws in layout px at full backing resolution | render | — | claude | done aad928f |
| TB-144 | Smoother elf animation: the idle sprite plays every clip frame at 30 fps (was every 3rd at 10 fps) and the bow draw has all 32 clip frames (was 16), so the scrubbed draw doubles its frame rate. Same approved recipes; sheet_elf.webp stays under 2 MB | render | — | claude | done dcf5bbd |
| TB-145 | Research synthesis: design directions from the active-incremental research written into the dev plan §8 | docs | — | claude | done 42bafc1 |
| TB-146 | Sim: measure runs and minutes to the first Heartwood purchase and to the first boss on a fresh save (dev plan §8 #3) | sim | — | claude | done (PR 93, 9fa38ce; BALANCE §TB-146: first buy end of run 2, first boss run 19–20 at 81–105 min) |
| TB-147 | Balance: sim additive stacking inside a node line against today's per-rank multiply, and check prices against node power; propose in BALANCE `## Proposed` (dev plan §8 #2, #4) | balance | 146 | claude | done (PR 94, eeb1e9b; director 1 Nov: keep multiply. BALANCE P-147: add with today's numbers puts the first boss at 147–162 min; add matched at rank 6 keeps it at 84–91 min, best wave −2; sim switch `STACKING.add`, default unchanged) |
| TB-148 | Boss tiers, unlock across runs (director 1 Nov): clearing a boss at your highest tier unlocks the next; pick any unlocked tier at March; tier multiplies orc HP, starlight and boss Heartwood (dev plan §8 #1). Save v10. Set F in Current (director 2 Nov); BALANCE P-148 | sim/ui | — | claude | done (PR 103, 3dfa1d9) |
| TB-149 | Heartwood spent only at a prestige (director, 1 Nov): `canBuyHw` needs a fallen run; the fall's flat 1 counts before Replant pays it; closed-tree text mid-run | sim/ui | — | claude | done (PR 92, ea05320) |
| TB-164 | Sim player aims at the front orc, led by the lob's flight | sim | — | claude | done (9d39e4c, PR 128) |
| TB-165 | Remove the 3D flower and weed sprites from the field (director 2 Nov) | render | — | claude | done (24dff89, PR 129) |
| TB-166 | Drawn meadow flowers, motes and sun shafts | render | — | claude | done (1f4b60f, PR 130) |
| TB-167 | Standing vanguard line: units hold the wall, respawn on a timer, Swift Muster node; rally buttons gone | sim/ui | — | claude | done (fc28c85, PR 131) |
| TB-168 | Remove vector stand-in shapes; actors draw only from sprites (director 2 Nov) | render | — | claude | done (cae614f, PR 132) |
| TB-169 | Vanguard only advance on orcs past halfway (director 2 Nov) | sim | — | claude | done (1f9c58f, PR 133) |
| TB-180 | Perf: `tools/perf160.mjs` never advanced its kind index, so every 160-orc run (QA run 4 too) drew one kind; it now cycles all eight incl. the TB-087 four and holds the wall so shaman fire cannot freeze the run (QA run 5) | perf | 150 | claude | done (bf84fc4) |
| TB-181 | Stale comments: `game.castFireball` said the shaman does not cast yet; the war-drum cue said the drummer is not in the sim (QA run 5) | audio | 087 | claude | done (e5ca4b5) |
| TB-182 | Audio: the war-drum cue (`warDrum`, ElevenLabs) never plays; no sim event fires when a drummer halts and drums. Needs a cadence (per beat, or once when it halts) (QA run 5). Director 3 Nov: every beat; drumBeat event every 0.8 s plays it | audio | 087 | claude | done |
| TB-183 | Perf: 160-orc headroom shrank since run 4. All eight kinds, 1080p at 4× CPU throttle: 58–61 fps (run 4: 92, one kind), 6×: 24 fps; `field.draw` median 7.7 ms at 4× against 6.1 for the old four kinds and 5.7 grunts only. 1× and 2× still hold 60 fps at 1080p and 4K. Profile `field.draw` (QA run 5). **Done:** CPU profile showed per-actor `save`/`restore` and `restore` after the fireball and fire-puff glows as the biggest script costs after `drawImage`; orcs and vanguard now set their transform from the frame base (same matrix ops, pixel-identical), the glows clear `shadowBlur` by hand, and sprite keys and filter strings are no longer built per orc per frame. `tools/perf160.mjs` 1080p 4×, four interleaved runs each on the same PC: `field.draw` median 6.1–7.7 (mid 6.8) → 5.7–6.2 ms (mid 5.8), fps 57–70 (mid 62) → 67–73 (mid 69.5). Seeded deterministic frames before/after match exactly where the old code matches itself | perf | 180 | claude | done |
| TB-184 | Checkpoint stall (QA run 5, soak from the wave-48 player): checkpoint 51, March at the highest tier (2) by default, each run falls at wave 51–52 within a minute, 23 runs in a row, 0 Heartwood (falls pay none, next boss wave 75). Intended grind, or should March default to tier 1 / checkpoints step back? | balance | 172 | claude | proposed P-184 (BALANCE ## Proposed): set F lifts the wave-48 player to 53; 55+ needs a new late progression source |
| TB-185 | Docs drift: `CLAUDE.md` still lists a `rally` intent (gone since TB-167); QA-CHECKLIST C3, C4, D2, E1 were stale (fixed in run 5) | docs | 167 | claude | done (CLAUDE.md + ARCHITECTURE.md rally refs removed) |
| TB-186 | Art: the war drummer has one clip (`orc.drummer`, no `.attack`), so it plays the same loop marching and halted drumming (QA run 5) | art | 068 | — | open (director) |
| TB-187 | Remove the grove props (director 3 Nov: "look awful"): `GROVE_DECOR` and its nine Sketchfab sprites (elf house, trees, stump, chests, lantern, arch, unused log pile) gone; the fence stays | art | 174 | claude | done |
| TB-191 | Text readable on a 4K TV (director 3 Nov: "hard to read … very small"): root font 1/54 of the window height (20 px at 1080p, 40 px at 4K), smallest text 0.875rem (1.62% of screen height), canvas text follows; Settings › Text size 80–160% (save v12) | ui | 143 | claude | done |
| TB-188 | Elf military encampment behind the wall: bowyer, forge, kitchen, training area, each upgradable. Plan: docs/plans/elf-encampment.md (DRAFT) | design | 187 | claude | planning |
| TB-189 | Full-screen skill tree (director 3 Nov: "we need to be able to see it all"): a Full screen button on the Grove opens the tree over the window with every node fitted at once beside the detail card; buying works; Esc or Close returns | ui | 163 | claude | done |
| TB-190 | Neon arcane links (director 3 Nov): links glow as neon arcane light, bright with a slow pulse and flowing light on owned paths, dim on locked ones; `neon*` palette tokens; still under reduced motion | ui | 163 | claude | done |
| TB-190b | Tree lighting (director 3 Nov, "beautiful lighting and particle effects"): cached additive branch-colour bloom, node light pools, root-to-tip pulses, drifting motes, buy burst; dim still locked links; `TREE_LIGHT` numbers, `BRANCH_LIGHT` tokens | ui | TB-190 | claude | done |
| TB-193 | Specialisation paths: Serpent (archery), Fox (vanguard/companions), Magpie (economy), each with an item set and a mythic weapon. Plan: docs/plans/specialisation.md (DRAFT) | design | — | claude | planning |
| TB-195 | Game-feel UI (director 3 Nov: "looks like a website"): HUD, tooltip plates, juice kit, tokens, satchel object, battle report, UI sounds. Plan: docs/plans/game-ui.md (DRAFT) | ui | 194 | claude | planning |
| TB-192 | Item hype (director 3 Nov: "icons way too small, impossible to know when you got a drop"): 88 px satchel/worn cards with rarity frames, every drop stands a rarity-scaled light pillar, a drop banner (icon, rarity, name), a Satchel tab "n new" badge, legendary/mythic shake + field flash | ui | 105 | claude | done dc2c614 |
| TB-201 | Wire the 11 dead gear affixes (director 3 Nov "make them work"): hawk, treant, Glimmer, boss/champion, elite, fire, burn time, storm damage and chain, moon, crit damage; roll ranges unchanged | sim | 094 | claude | done |
| TB-194 | Smoother animation (director 3 Nov): render interpolates movers between sim steps, orc and vanguard attacks packed at 30 fps (every clip frame), UI pages/tabs/pop-ups/toasts ease in and out | render | 068 | claude | done |
| TB-198 | Sim bug-bash fixes: gear swap no longer heals the wall, boss-wave rider grunt spawn failure no longer clears the wave early, bolt pin checks the orc's spawn generation, lob first-strike flag set at launch, Mythic Echo no longer speeds Pale Moon's draw, hawk orbit/homing numbers moved to src/data, loot drop snapshots worn gear only when a drop lands | sim | 094 | claude | in progress |
| TB-175 | Late orcs toned down (director 3 Nov: "do them all, test it all"): wolf rider health first (director picked health, wall at wave 46 ~70 s), drums and shaman casts trimmed; arena + 4-hour sims | balance | 087 | claude | done (set A applied: rider hp 1.7, drumBoost 0.25, shaman every 10) |
| TB-170 | Vanguard turn back to face the field once home (director 2 Nov) | sim | — | claude | done (5031cc4, PR 134) |
| TB-174 | Grove matches the plain (director 2 Nov): one ground both sides of the wall, Sketchfab grove decor behind the elf (`GROVE_DECOR`), dusk tint and sun shafts cut (they hazed the field); a 0-size canvas no longer throws in `Ground.draw` | render | — | claude | done (dbe7eed, PR 141) |
| TB-173 | Vanguard spread (director 2 Nov): each vanguard targets a different orc, and vanguard push apart under `VANGUARD.spread` | sim | — | claude | done (PR 140) |
| TB-172 | Checkpoint every 5 waves, was 10 (director 2 Nov): `CHECKPOINT.every` 10 → 5; saved checkpoints rise on the next wave cleared, no migration | balance | — | claude | done (PR 139) |
| TB-171 | Heartwood only from bosses (director 2 Nov): a fall or voluntary replant pays 0 (`PRESTIGE.fallGain`), rule 1 reworded; voluntary Replant no longer gated on a payout | balance | — | claude | done (PR 138) |
