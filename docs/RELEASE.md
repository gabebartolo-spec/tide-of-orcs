# Releasing to itch.io

Every development milestone ships a playable web build to **https://veniceissinking.itch.io/elves-vs-orcs**. Milestones go to the `html5-dev` channel; tagged versions (`v1.0.0`) go to `html5`.

## One-time setup (Gabe)
1. On itch.io, open the project → Edit → set **Kind of project: HTML** and tick *This file will be played in the browser*. Set viewport to 1280 × 720 (or "Click to launch in fullscreen"), enable *Mobile friendly*.
2. Get a butler API key: itch.io → Settings → API keys → Generate.
3. In the GitHub repo: Settings → Secrets and variables → Actions → New repository secret `BUTLER_API_KEY` with that key. *(Done 30 Oct 2026.)*
4. Optional later: move the job behind a GitHub environment with a required reviewer so an agent can tag but a human approves the upload.

## Shipping a milestone
```
git tag m1 -m "M1 vertical slice"
git push origin m1
```
From a Claude session the tag push is blocked by the GitHub proxy; create the tag from GitHub → Releases → *Draft a new release* → new tag `m1` on `main` → Publish. Same workflow fires.
`.github/workflows/itch.yml` runs lint, tests, build, stamps `dist/build.json` with tag/sha/date, and pushes `dist/` with butler to channel `html5-dev` (version label = tag). The game shows the tag in the footer (ui reads `build.json`).

Manual push: Actions → "Release to itch.io" → Run workflow → pick a channel.

## Milestone tags
| Tag | Milestone | Channel |
|---|---|---|
| m0 | Foundation (full prototype port) · **shipped 30 Oct 2026** | html5-dev |
| m1 | Vertical slice | html5-dev |
| m2 | Companions & armoury | html5-dev |
| m3 | Prestige | html5-dev |
| m4 | Presentation | html5-dev |
| v1.0.0 | Ship | html5 |

The itch page's "development log" gets a short post per milestone: what's new, what to test, where to leave feedback. Draft it from `docs/log/` for that milestone.

## Checklist before tagging
- `npm run lint && npm test` green on main.
- `npm run balance -- --minutes 30` shows no stall (wave rising, purchases happening).
- Build opened locally with `npm run preview`; save/load works; a fresh save plays.
- BACKLOG rows for the milestone are `done`.
