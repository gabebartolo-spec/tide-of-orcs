# Devlog 18 — The wall reaches the forest, sharper walls, no blank field after the camp

*Build: `html5-dev` from `main` (359199d), 14 Nov 2026 (itch run 43445789829). Covers: everything since devlog 17 (e237bca). Posted: https://veniceissinking.itch.io/elves-vs-orcs/devlog/1775072*

A small build: the barricade gets a proper rework, and one more freeze is fixed.

## What's new
- **The wall runs all the way to the forest.** The barricade used to stop short of the treeline. That left a gap the orcs could have walked round. It now runs right up to the forest edge, in front of the bushes, so the line is unbroken.
- **The wall has depth.** It stays straight and gets smaller as it runs back toward the forest, at the same rate as the orcs and the bushes. The far end also sits in the same light haze as the rest of the back of the meadow.
- **Sharper walls.** Every look the wall takes as you upgrade Seasoned Timber has been re-rendered at twice the detail, so wood grain and stonework read clearly.
- **No blank field after the camp.** Buying upgrades and starting a new run could leave the field blank under a working HUD. The field now draws as normal.

## What to test
- Does the far end of the wall meet the forest edge with no gap, on your screen size?
- Do orcs attacking the wall stand right against it, all along its length?
- Upgrade Seasoned Timber: does each new look of the wall stay sharp?
- Buy upgrades at the camp and start a new run a few times: does the field always appear?

## Feedback
Leave a comment below. Tell me how many Seasoned Timber ranks you reached and your best wave on this build.
