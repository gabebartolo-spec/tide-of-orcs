# Devlog 4 — 2 Nov: a real wolf, a living plain, honest swings

*Build: `html5-dev` from `main` (1346a52), 2 Nov 2026 (itch run 41419227567). Covers: everything since the 1 Nov build (8d20894). Posted: https://veniceissinking.itch.io/elves-vs-orcs/devlog/1746684*

This build is mostly about how the field looks and moves. The fights are the same; you can now see them properly.

## What's new
- **The Grey Wolf has a body.** The companion wolf is now an animated 3D-rendered sprite with a run cycle and a bite, and it turns to face the orc it is chasing. Model by blam (CC BY), credited in the game.
- **A living plain.** Grass, weeds, chamomile, violets and snowdrops are scattered across the field, and the barricade is now a stacked log pile instead of flat planks.
- **Swings you can read.** Orcs, spearmen and bladedancers play their attack once per real hit, at its true speed, with the blow landing on the strike frame. Swings are slower to match, and damage per swing went up, so damage per second is unchanged.
- **The vanguard marches.** Spearmen and bladedancers now walk out to the nearest orc, fight it, and return to their place in the line when the field is clear.

## What to test
- Does the wolf read clearly at game size, and does its bite line up with the damage?
- Does the plain feel alive without hiding orcs or arrows?
- Do the slower, heavier swings feel better or worse than the old fast loop?
- Does the marching vanguard help or get in the way?
- Early game: how far do you get with no upgrades, and does the wall take damage before wave 5?

## Feedback
Leave a comment below. Tell me what wave you reached and what you bought first.
