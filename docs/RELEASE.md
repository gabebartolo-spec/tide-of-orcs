# Releasing to itch.io

Web builds go to **https://veniceissinking.itch.io/elves-vs-orcs** (page Restricted, a private proof of concept; see ITCH-PAGE.md). Builds of `main` go to the `html5-dev` channel by manual workflow run; a tagged `v1.0.0` would go to `html5`. The director skipped further itch builds for now (3 Nov); the last is main bdc029f, 3 Nov.

## One-time setup (Gabe)
1. On itch.io, open the project → Edit → set **Kind of project: HTML** and tick *This file will be played in the browser*. Set viewport to 1280 × 720 (or "Click to launch in fullscreen"), enable *Mobile friendly* with orientation *Landscape* (TB-155).
2. Get a butler API key: itch.io → Settings → API keys → Generate.
3. In the GitHub repo: Settings → Secrets and variables → Actions → New repository secret `BUTLER_API_KEY` with that key. *(Done 30 Oct 2026.)*

## Pushing a build
Actions → "Release to itch.io" → Run workflow → pick a channel. `.github/workflows/itch.yml` runs lint, tests, build, stamps `dist/build.json` with tag/sha/date, and pushes `dist/` with butler. The game shows the build in the footer (ui reads `build.json`). A tag push (`m0`, `m1`, shipped 30 Oct) fires the same workflow; tags stop at `m1` and later milestones are untagged.

## Checklist before a build
- `npm run lint && npm test` green on main.
- `npm run balance -- --minutes 30` shows no stall (wave rising, purchases happening).
- Build opened locally with `npm run preview`; save/load works; a fresh save plays.
- BACKLOG rows for the milestone are `done`.
