# Releasing to itch.io

Web builds go to **https://veniceissinking.itch.io/elves-vs-orcs** (page Restricted, a private proof of concept; see ITCH-PAGE.md). Builds of `main` go to the `html5-dev` channel by manual workflow run; a tagged `v1.0.0` would go to `html5`. Phone test builds go to the `mobile-test` channel (since 4 Nov). The latest is main 69ce8bf on `html5-dev` (12 Nov, run 43113252146, devlog 1771071); the latest `mobile-test` is build 7, main 1690e41 (9 Nov, run 42610725014). Every itch push ships with a patch-notes devlog on the project page, posted as VeniceIsSinking (build 5: devlog 1753168).

## One-time setup (Gabe)
1. On itch.io, open the project → Edit → set **Kind of project: HTML** and tick *This file will be played in the browser*. Set viewport to 1280 × 720 (or "Click to launch in fullscreen"), enable *Mobile friendly* with orientation *Landscape* (TB-155).
2. Get a butler API key: itch.io → Settings → API keys → Generate.
3. In the GitHub repo: Settings → Secrets and variables → Actions → New repository secret `BUTLER_API_KEY` with that key. *(Done 30 Oct 2026.)*

## Pushing a build
Actions → "Release to itch.io" → Run workflow → pick a channel. `.github/workflows/itch.yml` runs lint, tests, build, stamps `dist/build.json` with tag/sha/date, and pushes `dist/` with butler. The game shows the build in the footer (ui reads `build.json`). A tag push (`m0`, `m1`, shipped 30 Oct) fires the same workflow; tags stop at `m1` and later milestones are untagged.

## Devlog rule (director, 4 Nov)
Itch posts 1 to 13 (M1 to test build 7) are titled `Devlog N — …` in order with `What's new` / `What to test` headings (retitled 11 Nov, old links redirect). Posts 6 to 13 have no file in `docs/log/`.

Every build posted to itch, on any channel (`html5`, `html5-dev`, `mobile-test`), needs a patch-notes devlog post for that build. Do not report a push as done until the notes are written and posted.
1. Write `docs/log/devlog-NN-<slug>.md` (NN = the next number in sequence) in the house format: title `Devlog N — <headline>` (same on itch and in the file; the date goes in the meta line), one italic meta line (`Build: … Covers: … Posted: …`), a short intro, then `## What's new`, `## What to test`, `## Feedback`. Commit it.
2. Post it on the itch dashboard: `https://itch.io/dashboard/game/5261926/new-devlog` (butler has no devlog command and the itch API cannot create posts), signed in as VeniceIsSinking. Fill the title and body, tick Published, Save. The 4 Nov post is `/dashboard/post/1750213/edit`.
3. Name the channel and the main sha in the post.

## Checklist before a build
- `npm run lint && npm test` green on main.
- `npm run balance -- --minutes 30` shows no stall (wave rising, purchases happening).
- Build opened locally with `npm run preview`; save/load works; a fresh save plays.
- BACKLOG rows for the milestone are `done`.
