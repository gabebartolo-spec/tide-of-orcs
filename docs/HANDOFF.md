# Handoff, 27 Nov 2026

Written for a new Claude account picking this work up cold, with none of the old project chat, threads or memory. Read this first, then `CLAUDE.md`, then `docs/00-DEVELOPMENT-PLAN.md`. The director is **Baggins** (GitHub `gabebartolo-spec`, timezone Australia/Sydney). Elsewhere in the docs "the director" means Baggins.

## 1. Baggins's standing rules (read these before doing anything)

These came from Baggins over many sessions. Breaking them has cost trust and usage before.

**Goal**
- Launch is a polished, full game on **itch.io only** (no Steam). It needs a trailer. Leave room for later content updates. Don't propose cutting features to a 1.x.

**How to ask and when**
- Ask few questions. Once a task and its budget are approved, do the work without asking more. Ask only for real design choices, going over an approved budget, or a destructive or outward step.
- When you do ask, ask properly: one question per decision card (multiple choice with a recommended option), never a question buried in a message. Never read a vague reply such as "continue" as the answer to a pending question.
- Don't ask about steps that the docs or the pipeline already settle.
- No emoji reactions on Baggins's messages. Post only real updates.

**Do it yourself**
- Never ask Baggins to do manual steps on their PC (killing processes, running commands, clicking in apps, signing in). Use a session on their PC (Remote Control), computer use, the browser tools or other workarounds. Escalate only if every route truly fails. Never type passwords.
- Use the method Baggins specifies, exactly as written. Don't swap in your own approach without asking.

**Quality**
- High bar, no sloppy work, never show AI slop. Before doing specialist work, research it and load the skills or plugins that help.
- Check output fully before showing it: art at game size and zoomed, video at full size with sound, every shot. Thumbnails and technical checks alone don't count (trailer draft 1 was rejected outright because of this).
- **Nothing counts as "in the game" until Baggins has seen and approved it.** Say "built on the branch", never "already in the game". Don't merge look work before their go-ahead.

**Speed**
- Usage is tight. Work fast and lean: one check per change, no redundant renders, no multi-round self-review loops, straight to concrete results (but keep the quality bar).
- Long runs (sim batches, full builds, anything over ~10 min) go to **GitHub Actions from a pushed branch** (`balance-batch` workflow, see §5). Short runs can go in the cloud container.

**Art tools**
- **Tripo only through the website**, studio.tripo3d.ai, in Baggins's own signed-in Chrome (Claude in Chrome) or the desktop app's built-in browser if it is signed in. **Never the Tripo API**, not even to check a balance (an API key on the PC has a separate, empty wallet; the ~12k credits live in Studio).
- **Always Smart Mesh, never HD.** Studio's "Multi-view to 3D" opens in HD Model every time and resets polycount to 5000: click Smart Mesh before every Generate.
- Workflow for every model: reference image (Image tab, free) → multi-view (free) → show Baggins and get approval → Smart Mesh model from the multi-view. T-pose humanoids that will be rigged. Never press Generate on a text prompt in the Model tab (100 credits were wasted that way).
- Avoid designs that are hard to animate (mounted riders etc.). Reuse the existing Mixamo rig recipes (`mixamo-animate` skill, `docs/ART-STYLE.md` §Asset pipeline).
- Any paid job (Tripo, Meshy, ElevenLabs) needs Baggins's written spend yes for that job, on a decision card with the credit cost. Log the Studio balance before and after.
- Costs seen in Studio (26 Nov): reference images and multi-views free, Smart Mesh 100, texture 30, Auto Rig 20 per model. Last logged Studio balance: 12,112 (26 Nov, before the ~130-credit grunt test).

**The unified look**
- Uses **dream-loop** (github.com/achimala/dream-loop) **exactly as written**: live screenshot → image-model dream target edited from it → build → judge → loop. Home-made graded targets and Blender look renders were rejected.
- Dreams must have **neutral white balance, no warm or yellow cast** (measure Lab da/db and saturation against the live baseline before showing; reject any warm shift).
- For the battlefield, Baggins supplied their own targets (`docs/art/unified-look/target/battlefield_day.png`, `battlefield_night.png`): inked flat-colour cartoon. Generate no new battlefield dreams. Day = midday of the 10-min day cycle, night = its dark end, blended.

**Balance**
- Pace the existing upgrades (ranks, costs, effects) to the waves. **No new systems or bandaids** (endless ranks etc. were rejected). Keep sim batches small.
- Order of work is in CLAUDE.md; balance proposals go in `docs/BALANCE.md ## Proposed` until approved.

## 2. Current state of `main` (4d0dcc4, 27 Nov)

Merged on 27 Nov:
- **PR #351, trailer tools** (`tools/trailer/`): frame-stepped capture rig with a virtual camera (`rig2.mjs`), scripted shots (`scenes2.mjs`, `scenes_dom.mjs`), beat-grid edit and mix (`edit2.py`, `audio2.py`, `captions2.mjs`), review tools (`review2.py`). Game code untouched.
- **PR #355, day/night battlefield look** (TB-281): backdrop plate and wall with watchtowers cut from Baggins's day target, night plate and wall from the night target, faded with `dusk()`; ink outline on every sprite; night grade on sprites; run HUD restyled (cream banners, red Replant, slate Settings). Falls back to the old vector path if a plate is missing.
- **PR #356, upgrades paced to the waves** (TB-277): twelve scaling nodes get double max ranks; orc HP ×1.10 a wave past 65 instead of ×1.20; boss waves every 10 past wave 75 with four late roster bosses and traits (`BOSS_FX`). At 240 sim min the wall moved from about wave 85 to **117** (BALANCE P-277). **Still open: the sim clears no boss past wave 50.** The four late bosses draw as the Warboss until their art lands.
- **PR #357, itch release**: main 6e15782 on the `html5-dev` channel (run 45951303744), **Devlog 19** posted (veniceissinking.itch.io/elves-vs-orcs/devlog/1810384). The page is owned by the itch account **VeniceIsSinking**, not aussierulesdynasties (Baggins's other projects). Builds go up through the "Release to itch.io" GitHub workflow (`BUTLER_API_KEY` secret), no browser needed. Devlogs need a browser signed in as VeniceIsSinking: check the signed-in name before posting. The page is still Restricted; making it public is Baggins's call.

Earlier the same week (all merged): TB-250 cosmetics done (31 pieces), TB-276 balance batches B to D (Fox path in band), TB-279 archer release fix, TB-280 orc voice variety (8 ElevenLabs grunts).

## 3. In flight

- **PR #358, fire arrow flames only on shots that roll fire (TB-282)**: Fire Arrows burns 1 shot in 4, but every arrow looked alight because the tint came from owned enchantments. The lob now takes its colour from what that shot rolled (`src/render/shotTint.ts`). Status when this was written: **open, not merged**; lint and tests passed locally. Check its CI, then merge it if it is green (the repo has no auto-merge; sessions merge their own PRs by hand).

## 4. Next steps, in order

Baggins's order of work (27 Nov): **unified look → late bosses through that look → trailer reshoot.** The trailer is paused until the look lands.

1. **Unified look, enemies (TB-281).** Grunt v7 is **approved** as the look for every enemy. Recipe: `docs/art/unified-look/grunt_test/README.md`, sections v6 and v7 (Mixamo Walking clip, blurred-normal toon ramp, ink, chest strap removed, spine/neck/head offsets, lit shield face). Blends live on Baggins's PC in `C:\Users\DANTE\Documents\tide-assets\grunt_dream\`.
   - Rebuild the **other 11 enemies** the grunt v7 way. Candidates on main: orc kinds runner, brute, elite, berserker, wolfrider, shaman, drummer (`src/data/orcs.ts`) and the roster bosses Warboss, Ogre, Orc, Orc Raider, Ogre Creature (`BOSS_ROSTER` in `src/data/bosses.ts`). That is 12, so confirm the exact list of 11 with Baggins on the cost card (the wolf rider is the likely odd one out: mounted riders are hard to animate).
   - A Tripo spend of **about 1,650 credits (~150 each, cap 1,800)** was proposed and is **not yet approved**. Put it on a decision card before any spend. Then: reference image → multi-view → Baggins's approval → Smart Mesh → texture → rig → Mixamo clip → render → ink.
   - Other open look items: wall bar frame, wall tiers and damage states on the plate wall, Thornwall spikes always shown on the plate wall, the treant has no art.
2. **Late bosses through that look (TB-277).** Grisk the Hound-Master, Mother Ashka the Fire-Witch, Thrumm the War-Chief, Gorrak the Unbroken. Textured models and Mixamo-preset rigs are already on Baggins's PC in Downloads (`boss_<id>.glb`, `boss_<id>_rig.fbx` for houndmaster, firewitch, warchief, unbroken). **Thrumm (the drum orc)'s emblem looks too close to Warcraft's Horde symbol and must become an original mark** before it ships. Balance follow-up: the sim clears no boss past wave 50; pace upgrades to fix it, no new systems.
3. **Trailer reshoot (TB-278).** Draft 1 was rejected; take 3 was delivered and then paused because the look changed. Reshoot only after the look lands: in `tools/trailer` run `npx vite --port 5270`, `node scenes2.mjs out2/shots <shots>`, `python3 edit2.py`, then review every half second at full size and with sound (`review2.py frames`, `review2.py sound`). Known weak spots: the wall shows no collapse on fall; the s08 hold shot's action sits near the top edge. Itch plays trailers from YouTube or Vimeo, so uploading and linking are outward steps that each need a card.
4. **Bug bash (TB-075), unfinished.** Remaining: the 60 fps check J1 with 160 orcs (`tools/perf160.mjs`) on an **idle** PC. QA run 8 (25 Nov) looked like a regression (1080p 83 fps vs 120 on 3 Nov) but the PC was loaded by other projects' Godot jobs, so it is unreliable. Measure CPU load first and run only if idle; treat a real regression as a launch blocker. `docs/QA-CHECKLIST.md` has the full list.

## 5. How things run

- Repo: `gabebartolo-spec/tide-of-orcs`. Branch per backlog row, PR, merge by hand when CI (`ci.yml`) is green. `npm run lint && npm run test` before every commit.
- Sim batches: push a `claude/**` branch that changes `sim/batches/RUN`; `.github/workflows/balance-batch.yml` runs each label as a job and commits results to `sim/results/<batch>/` on the branch (the cloud proxy blocks Actions artifact downloads).
- Baggins's PC: Windows, `DESKTOP-J3JG7C4`, repo at `C:\Users\DANTE\tide-of-orcs`, assets at `C:\Users\DANTE\Documents\tide-assets`. Blender renders and Mixamo work run there through Remote Control (see the `mixamo-animate` skill). Don't touch the PC repo's working tree or branch; use a `git worktree`.
- ElevenLabs: the cloud proxy blocks `elevenlabsusercontent.com`, so generations can't be downloaded in a cloud session. Workaround: cut and check in the ElevenLabs sandbox, then a Remote Control job on the PC downloads and pushes to a `claude/` branch; re-master with `tools/sfx-master.sh` (previews are 128 kb/s). Scribe transcription costs far more than its estimate.
- Itch: `docs/RELEASE.md`, `docs/ITCH-PAGE.md`. Every itch push ships with a devlog.

## 6. Where to read more

- Daily logs with decisions and lessons: `docs/log/2026-11-25.md`, `2026-11-26.md`, `2026-11-27.md`.
- Backlog: `docs/BACKLOG.md` rows TB-075, TB-277, TB-278, TB-281, TB-282.
- Balance evidence: `docs/BALANCE.md` P-276, P-277.
- Look: `docs/art/unified-look/` (targets, grunt test renders and README).
