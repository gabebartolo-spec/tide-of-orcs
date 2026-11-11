# Devlog 14 — Real camp buildings, pixel effects

*Build: `html5-dev` from `main` (8458044), 11 Nov 2026 (itch run 43002678594). Covers: everything since test build 7 (1690e41). Posted: https://veniceissinking.itch.io/elves-vs-orcs/devlog/1769503*

The camp now draws from real 3D models, and the combat effects are hand-pixelled flipbooks.

## What's new
- **Camp buildings from models.** The bowyer, forge, kitchen and training ring are rendered from 3D models at every upgrade level, with no stray shrubs, grass or sand patches. Banners and the training sword are fixed.
- **Pixel effects.** Strike, lightning, shatter, death, wall hits and the boss now play pixel flipbook animations.
- **Camp upgrade polish.** Upgrading a building throws dust and motes.
- **Heartwood UI.** Heartwood is the only display face again, and the system-UI body text is gone.

## What to test
- Open the camp at level 0 and after each upgrade: does every building look clean and readable?
- Do the new effects read clearly with 100+ orcs on screen, and does the frame rate hold?

## Feedback
Leave a comment below. Tell me which building or effect looks wrong, and your best wave.
