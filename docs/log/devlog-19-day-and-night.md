# Devlog 19 — A new look by day and night, a wall that holds to wave 117, and camp trophies

*Build: `html5-dev` from `main` (6e15782), 27 Nov 2026 (itch run 45951303744). Covers: everything since devlog 18 (359199d). Posted: https://veniceissinking.itch.io/elves-vs-orcs/devlog/1810384*

A big build: the battlefield has a new look, the late game no longer stalls, and achievements now pay out in things you can see.

## What's new
- **A new look for the battlefield.** The sky, mountains, forest and meadow are one painted backdrop in an inked, flat-colour cartoon style, and the barricade with its stakes and two watchtowers is painted to match. Every character has an ink outline so they sit in the same world.
- **Day and night.** As the day cycle turns, the field fades to a night version of the same scene, and the orcs, elf and vanguard darken with it.
- **A restyled run HUD.** Cream banners, a red Replant button and a slate Settings plank, to match the new field.
- **The late game keeps going.** Runs used to stall at about wave 85 with nothing left to buy. Twelve of the upgrades that scale your damage and your wall now go to twice as many ranks, orc health grows more gently after wave 65, and past wave 75 a boss wave comes every 10 waves instead of every 25. In our test runs the wall now holds to about wave 117.
- **Four new late bosses.** After the Orc Raider (85) and the Ogre Creature (95) come the Hound-Master, the Fire-Witch, the War-Chief and the Unbroken, each with its own trait.
- **Cosmetic rewards.** Achievements now unlock things to wear and show: three arrow trails (ember, leaf, star), a rune ring, three bow woods (moonsilver, thornwood, heartwood) and a fox tabard. None of them change stats.
- **A camp that remembers.** Boss trophies, path banners and six camp props appear in the camp as you earn them, and banners, lanterns and skull posts can hang on the barricade.
- **More orc voices.** Orcs now have four voices, with several death cries, pain grunts when hit and barks when they strike, so kills no longer repeat the same sound.
- **Fixes.**
  - The elf no longer shows two bodies and two bows for a moment after each shot.
  - Toasts ("Boss wave ready", achievements) now show under the HUD instead of behind it, and on the grove pages too.
  - The run HUD fits windows down to 960 px wide, and Settings stays reachable.
  - The wave plaque and vanguard count no longer overlap other labels at high tiers.
  - Thornwall spikes sit on the wall's face instead of running up into the sky.
  - In very busy frames the game could lose the wall's fall or a boss result. It now keeps those.
  - The playtest "Download run log" button is gone from this build.

## What to test
- Play through a full day cycle: does the field fade to night and back smoothly, and do the characters read clearly at night?
- How far does your wall hold now? Do upgrades still feel worth buying past wave 80?
- Meet a late boss (wave 105 and up): does its trait feel fair?
- Earn an achievement with a cosmetic: does it show on the elf or in the camp?
- In a narrow browser window, can you still reach Settings?

## Feedback
Leave a comment below. Tell me your best wave on this build and which boss stopped you.
