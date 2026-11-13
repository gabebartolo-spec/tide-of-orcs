# Devlog 17 — No more invisible orcs, a tidier forest edge, no freezes

*Build: `html5-dev` from `main` (e237bca), 13 Nov 2026 (itch run 43415345862). Covers: everything since devlog 16 (d428c06). Posted: https://veniceissinking.itch.io/elves-vs-orcs/devlog/1774580*

A small fix build: three bugs found in play, all fixed.

## What's new
- **No more invisible orcs.** Some orcs used to walk the whole way behind the treeline and hit the barricade without ever being seen. Every orc now marches on the open meadow where you can see it, and boss lines keep their order. The early waves are a little easier as a result.
- **The barricade stops at the forest edge.** The far end of the wall used to stick up among the trees. It now runs into the bushes along the forest edge.
- **No more freezes.** If something goes wrong while the game is drawing, the run now carries on instead of freezing. The game keeps a note of the error so it can be fixed.

## What to test
- Do you ever see an orc hit the barricade that you didn't see coming?
- Does the far end of the barricade look right where it meets the bushes, on your screen size?
- Did the game freeze or stop drawing at any point? If it did, tell me the wave and what was on screen.

## Feedback
Leave a comment below. Tell me your best wave on this build and whether the early waves feel too easy now.
