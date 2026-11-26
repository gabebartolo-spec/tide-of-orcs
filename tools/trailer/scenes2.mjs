// Launch trailer take 2 (TB-277): every shot recorded through rig2's virtual camera at native sprite resolution, HUD and health
// bars off. Each shot is recorded a little longer than its slot in the cut; edl2.py picks the in-point (often from an event in
// meta.json, so a loose, a bite or an impact lands on the beat).
// Usage: node scenes2.mjs <outDir> [shot,shot,...]   (needs `npx vite --port 5270` from the repo root)
import { rmSync } from 'node:fs';
import { openGame, record, recordPage, FPS } from './rig2.mjs';
const OUT = process.argv[2] ?? 'out2/shots';
const ONLY = process.argv[3]?.split(',');
const sec = (s) => Math.round(s * FPS);
const ranks = (ids, r = 10) => Object.fromEntries(ids.map((id) => [id, r]));

const BOW = ['sharp', 'draw', 'wide', 'crit', 'multi', 'pierce'];
const PALS = ['wolf', 'fangs', 'ranger', 'warden', 'hawk', 'bond', 'knives', 'knifespd', 'knifefan'];
const ARMS = ['fire', 'firechance', 'frost', 'frostchance', 'shatter', 'storm', 'shock', 'shockchance', 'ballista', 'bolt'];
const VAN = ['muster', 'shield', 'drill', 'ranks', 'mend', 'champion', 'bladedmg'];
const FOES = ['horde', 'runners', 'runswarm', 'brutes', 'bruteswarm', 'elites', 'wolfriders', 'drummers', 'shamans', 'berserkers'];
const DECOR = ['wave_10', 'boss_50', 'branch_barricade', 'slain_100k', 'branch_vanguard'];
const CAMP_ACH = ['first_boss', 'boss_streak', 'boss_roster', 'boss_swift', 'boss_tier6', 'camp_first', 'camp_full', 'replant_1', 'path_fox', 'path_serpent', 'path_magpie', 'branch_companions', 'hold_60m', 'secret_last_plank'];

// ---- camera helpers: world units, z = 1 shows the whole plain ----
const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
const mix = (a, b, u) => a + (b - a) * u;
/** A move from camera a to b over n frames, eased in and out. */
const move = (a, b, n) => (i) => { const u = smooth(i / (n - 1)); return { x: mix(a.x, b.x, u), y: mix(a.y, b.y, u), z: mix(a.z, b.z, u), drawn: a.drawn }; };
/** Follow a moving point (pick(meta) -> {x, y} or null) with a critically damped spring; offset frames the subject off-centre. */
function follow(pick, { z, zEnd = z, n = 1, k = 2.2, off = { x: 0, y: 0 }, start }) {
  let p = start ? { ...start } : null, v = { x: 0, y: 0 }, last = null, tv = { x: 0, y: 0 };
  return (i, m) => {
    const t = pick(m); const raw = t ? { x: t.x + off.x, y: t.y + off.y } : null;
    if (raw && last) for (const a of ['x', 'y']) tv[a] += ((raw[a] - last[a]) * FPS - tv[a]) * 0.1;   // the subject's own velocity, smoothed
    if (raw) last = raw; else { v.x *= 0.85; v.y *= 0.85; }
    const tgt = raw ? { x: raw.x + tv.x * 2 / k, y: raw.y + tv.y * 2 / k } : p ? { x: p.x + v.x / k, y: p.y + v.y / k } : { x: 450, y: 300 };   // lead it, so a steady march stays framed
    if (!p) p = { ...(raw ?? tgt) };
    const dt = 1 / FPS, w = k;
    for (const a of ['x', 'y']) { const acc = w * w * (tgt[a] - p[a]) - 2 * w * v[a]; v[a] += acc * dt; p[a] += v[a] * dt; }
    return { x: p.x, y: p.y, z: mix(z, zEnd, smooth(i / Math.max(1, n - 1))) };
  };
}
const ELF = { x: 64, y: 300 };
const aimCrowd = (xMin) => (p) => p.evaluate((x) => __tr.crowdAim(0.18, x), xMin ?? 230);

const SHOTS = {
  // 1a. The tide comes from the east: a dense band of grunts marches out along the treeline at golden hour; the camera walks with them.
  async s01a_band(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 3, levels: {}, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.55); __tr.warm(1, 'none'); __tr.clearOrcs();
      await __tr.knot('grunt', 18, 800, 285, 80, 32, 3); });
    const n = sec(5);
    await record(page, dir, n, { cam: follow((m) => m.group, { z: 3.3, zEnd: 3.0, n, k: 1.2, off: { x: -30, y: -22 } }) });
  },
  // 1b. Establishing: the whole plain at golden hour, the band crossing toward the wall and the elf; a slow push in.
  async s01b_wide(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 3, levels: {}, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.6); __tr.warm(1, 'none'); __tr.clearOrcs();
      await __tr.knot('grunt', 18, 640, 300, 80, 40, 3); await __tr.knot('grunt', 14, 800, 390, 70, 35, 5); await __tr.knot('grunt', 10, 890, 280, 40, 25, 8); });
    const n = sec(5);
    await record(page, dir, n, { cam: move({ x: 450, y: 228, z: 1.0 }, { x: 420, y: 250, z: 1.18 }, n) });
  },
  // 2. The elf draws and looses; the wall at her right, the plain beyond.
  async s02_elf(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 4, levels: { sharp: 3, wide: 3 }, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.5); __tr.warm(1, 'none'); __tr.clearOrcs();
      await __tr.knot('grunt', 6, 400, 330, 20, 16, 7); __tr.aimAt(390, 330); });
    const n = sec(6);
    await record(page, dir, n, { cam: move({ x: 122, y: 268, z: 3.6, drawn: true }, { x: 128, y: 268, z: 3.3, drawn: true }, n), perFrame: (p) => p.evaluate(() => { const c = __tr.groupC(); if (c) __tr.aimAt(c.x - 10, c.y); }) });
  },
  // 3. The strike: the circle rides a knot of grunts, the arrow drops in and the whole knot falls; starlight drifts up.
  async s03_strike(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 4, levels: { sharp: 4, wide: 4 }, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.5); __tr.warm(1, 'none'); __tr.clearOrcs();
      await __tr.knot('grunt', 7, 560, 330, 22, 16, 11); });
    const n = sec(6);
    await record(page, dir, n, { cam: move({ x: 548, y: 328, z: 3.0 }, { x: 536, y: 330, z: 3.4 }, n),   // held on the knot: the strike lands, the field settles
      perFrame: (p) => p.evaluate(() => { const c = __tr.groupC(); if (c) __tr.aimAt(c.x - 8, c.y); }) });
  },
  // 5. Back on the field after the buy: the grey wolf bounds out to a knot at the wall; two rangers shoot from the wall top.
  async s05_wolf(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 6, levels: { sharp: 4, wide: 3, muster: 1, wolf: 1, fangs: 3, ranger: 1, warden: 1, rangerrate: 3 }, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.35); __tr.warm(1, 'none'); __tr.clearOrcs();
      await __tr.knot('grunt', 8, 360, 330, 40, 40, 13); await __tr.knot('grunt', 6, 470, 300, 30, 25, 17); });
    const n = sec(6);
    await record(page, dir, n, { cam: move({ x: 250, y: 300, z: 2.4 }, { x: 262, y: 305, z: 2.7 }, n), perFrame: aimCrowd(300) });
  },
  // 6a. Companions, quick: the wolf bites (follow the wolf, close).
  async s06a_bite(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 10, levels: { muster: 1, wolf: 1, fangs: 5, wolfrate: 3, wolfspd: 3 }, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.35); __tr.warm(1, 'none'); __tr.clearOrcs(); await __tr.knot('grunt', 10, 330, 330, 45, 40, 19); });
    const n = sec(5);
    await record(page, dir, n, { cam: follow((m) => m.wolf, { z: 4.2, zEnd: 4.4, n, k: 2.2, off: { x: 10, y: -8 } }) });
  },
  // 6b. The hawk dives into the thickest knot.
  async s06b_hawk(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 10, levels: { muster: 1, wolf: 1, fangs: 1, hawk: 1, hawkrate: 5 }, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.35); __tr.warm(1, 'none'); __tr.clearOrcs(); await __tr.knot('grunt', 14, 560, 340, 35, 30, 23); });
    const n = sec(8);
    await record(page, dir, n, { cam: follow((m) => m.group, { z: 3.4, n, k: 1.5, off: { x: -10, y: -14 } }) });
  },
  // 6c. The treant stamps before the wall.
  async s06c_treant(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 10, levels: { muster: 1, wolf: 1, fangs: 1, hawk: 1, treant: 1, treantrate: 5 }, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.35); __tr.warm(1, 'none'); __tr.clearOrcs(); await __tr.knot('grunt', 12, 300, 330, 40, 45, 29); });
    const n = sec(8);
    await record(page, dir, n, { cam: move({ x: 245, y: 315, z: 3.4 }, { x: 250, y: 318, z: 3.6 }, n) });
  },
  // 6d. A fan of throwing knives into the orcs at the wall.
  async s06d_knives(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 10, levels: { knives: 1, knifespd: 5, knifefan: 3, knifedmg: 3 }, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.35); __tr.warm(1, 'none'); __tr.clearOrcs(); await __tr.knot('grunt', 12, 260, 320, 30, 50, 31); });
    const n = sec(6);
    await record(page, dir, n, { cam: move({ x: 170, y: 300, z: 2.9 }, { x: 178, y: 300, z: 3.1 }, n) });
  },
  // 7a. Armoury: fire arrows set a crowd alight.
  async s07a_fire(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 14, levels: { sharp: 3, wide: 6, multi: 2, knives: 1, fire: 1, firechance: 5, kindle: 3, wildfire: 3 }, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.45); __tr.warm(1, 'none'); __tr.clearOrcs(); await __tr.knot('grunt', 22, 520, 330, 60, 45, 37); });
    const n = sec(6);
    await record(page, dir, n, { cam: follow((m) => m.group, { z: 2.9, zEnd: 3.2, n, k: 1.3, off: { x: -10, y: -10 } }), perFrame: (p) => p.evaluate(() => { const c = __tr.groupC(); if (c) __tr.aimAt(c.x - 6, c.y); }) });
  },
  // 7b. Frost arrows chill a crowd, then the strike shatters it.
  async s07b_frost(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 14, levels: { sharp: 3, wide: 6, multi: 2, knives: 1, fire: 1, frost: 1, frostchance: 5, shatter: 5 }, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.45); __tr.warm(1, 'none'); __tr.clearOrcs(); await __tr.knot('grunt', 22, 520, 330, 60, 45, 41); });
    const n = sec(7);
    await record(page, dir, n, { cam: follow((m) => m.group, { z: 2.9, zEnd: 3.2, n, k: 1.3, off: { x: -10, y: -10 } }), perFrame: (p) => p.evaluate(() => { const c = __tr.groupC(); if (c) __tr.aimAt(c.x - 6, c.y); }) });
  },
  // 7c. Lightning leaps through the pack (Storm Glade and Shock Arrows).
  async s07c_storm(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 14, levels: { sharp: 3, wide: 4, knives: 1, fire: 1, storm: 1, shock: 1, shockchance: 5, static: 3, stun: 2 }, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.5); __tr.warm(1, 'none'); __tr.clearOrcs(); await __tr.knot('grunt', 18, 520, 330, 70, 50, 43); });
    const n = sec(8);
    await record(page, dir, n, { cam: follow((m) => m.group, { z: 2.7, zEnd: 2.9, n, k: 1.3, off: { x: -10, y: -10 } }), perFrame: (p) => p.evaluate(() => { const c = __tr.groupC(); if (c) __tr.aimAt(c.x - 6, c.y); }) });
  },
  // 7d. The ballista bolt punches through a whole file of orcs.
  async s07d_ballista(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 14, levels: { knives: 1, knifespd: 1, ballista: 1, bolt: 5, windlass: 3, boltpin: 2 }, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0); __tr.light(0.5); __tr.warm(1, 'none'); __tr.clearOrcs();
      // two files of grunts strung out along the bolt's line from the ballista (70, 200), so each bolt punches down the row
      const { spawnOrc } = await import('/src/sim/step.ts'); const s = __tide.game.state; const g = [];
      for (let i = 0; i < 12; i++) { const o = spawnOrc(s, 'grunt'); o.x = 400 + i * 26; o.y = 200 + (o.x - 70) * 0.06 + (i % 2 ? 6 : -6); g.push(o); }
      for (let i = 0; i < 5; i++) { const o = spawnOrc(s, 'brute'); o.x = 430 + i * 60; o.y = 200 + (o.x - 70) * 0.06 + 30; g.push(o); }
      __tr.group = g; s.run.ballT = s.stats.ballCd - 0.5; s.run.knifeT = -3; });
    const n = sec(8);
    await record(page, dir, n, { cam: move({ x: 500, y: 222, z: 3.0 }, { x: 470, y: 222, z: 3.2 }, n) });
  },
  // 8. Hold the line: fox-tabard spearmen and bladedancers before the stone wall with its banners, lanterns and skull posts.
  async s08_hold(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 30, levels: { ...ranks(BOW, 4), ...ranks(VAN, 5), timber: 6 }, ach: DECOR, wall: 1 });
    await page.evaluate(async () => { __tr.soften(0.02); __tr.light(0.55); __tr.warm(3, 'none'); __tr.clearOrcs();
      await __tr.knot('grunt', 12, 330, 300, 40, 30, 47); await __tr.knot('grunt', 12, 360, 400, 40, 30, 53); await __tr.knot('brute', 3, 420, 350, 30, 50, 59); });
    const n = sec(8);
    // no bow here: the vanguard hold on their own, so kills come one at a time instead of a pile of death smoke under the strike circle
    await record(page, dir, n, { cam: move({ x: 200, y: 430, z: 2.7 }, { x: 260, y: 300, z: 2.5 }, n), perFrame: (p) => p.evaluate(() => { __tr.aimP = null; __tide.game.clearAim(); }) });
  },
  // 9a. The plain fills: runners, brutes, wolf riders, drummers, berserkers; a slow push over the whole tide.
  async s09a_tide(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 46, levels: { ...ranks(BOW, 4), timber: 6 }, ach: DECOR, wall: 1 });
    // a mixed host, placed: grunt files with brutes, wolf riders on the flanks, berserkers out front, drummers at the back
    await page.evaluate(async () => { __tr.soften(0.05); __tr.light(0.7); __tr.warm(1, 'none'); __tr.clearOrcs();
      await __tr.knot('grunt', 14, 560, 250, 50, 60, 71); await __tr.knot('grunt', 12, 600, 380, 50, 50, 73);
      await __tr.knot('brute', 3, 640, 300, 30, 70, 79); await __tr.knot('wolfrider', 4, 520, 150, 40, 25, 83);
      await __tr.knot('wolfrider', 3, 540, 440, 40, 20, 89); await __tr.knot('berserker', 4, 480, 320, 30, 60, 97);
      await __tr.knot('drummer', 2, 720, 310, 20, 50, 101); await __tr.knot('runner', 6, 500, 230, 40, 50, 103);
      __tr.group = __tide.game.state.orcs.items.filter((o) => o.live && !o.dead); });
    const n = sec(7);
    await record(page, dir, n, { cam: follow((m) => m.group, { z: 2.0, zEnd: 2.2, n, k: 1.0, off: { x: -60, y: 0 } }), perFrame: aimCrowd(260) });
  },
  // 9b. The wall takes the blows and splinters (close on the timber under attack).
  async s09b_splinter(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 30, levels: { ...ranks(BOW, 3), timber: 3, ...ranks(FOES, 5) }, ach: DECOR, wall: 0.7 });
    await page.evaluate(async () => { __tr.wallFloor = 0.6; __tr.soften(0.25); __tr.light(0.72); __tr.warm(1, 'none'); __tr.clearOrcs();
      await __tr.knot('brute', 3, 245, 360, 20, 40, 61); await __tr.knot('grunt', 8, 260, 320, 30, 50, 67); });
    const n = sec(7);
    // framed on the orc side of the timber so the attackers read in front of it, not behind the posts
    // the timber is battered but never gives way here (that is the fall's shot): hold it near 45%
    await record(page, dir, n, { cam: move({ x: 225, y: 345, z: 3.1 }, { x: 222, y: 345, z: 3.4 }, n),
      });
  },
  // 10a. The boss wave: the Warboss strides in with his Blackguard (follow him; the roar lands on the cut).
  async s10a_boss(page, dir) {
    // a clean loadout (bow and vanguard only) so the Warboss is never buried under armoury effects
    await page.evaluate((spec) => __tr.setup(spec), { wave: 25, levels: { ...ranks(BOW, 3), ...ranks(VAN, 3), timber: 6 }, ach: DECOR, wall: 1 });
    // the wall is propped while he marches in: unpropped, the wave's grunts broke it during the wait and the run froze with no boss
    await page.evaluate(() => { __tr.wallFloor = 0.9; __tr.soften(0.05); __tr.light(0.8); __tr.warm(4, 'none'); __tide.game.summonBoss(); });
    for (let i = 0; i < 40; i++) { const on = await page.evaluate(() => { __tr.warm(1, 'none'); return !!__tide.game.state.orcs.items.find((o) => o.live && !o.dead && o.kind === 'boss'); }); if (on) break; }
    if (!await page.evaluate(() => !!__tide.game.state.orcs.items.find((o) => o.live && !o.dead && o.kind === 'boss'))) throw new Error('no Warboss on the field');
    const n = sec(14), aimFrom = sec(6);
    // he strides in unopposed for six seconds; then the elf turns the bow on him
    await record(page, dir, n, { cam: follow((m) => m.boss ?? m.group, { z: 3.5, zEnd: 3.1, n, k: 1.3, off: { x: -25, y: -14 } }),
      perFrame: (p, i) => p.evaluate(([on]) => { const b = __tide.game.state.orcs.items.find((o) => o.live && !o.dead && o.kind === 'boss');
        if (on && b) __tr.aimAt(b.x - 10, b.y); else { __tr.aimP = null; __tide.game.clearAim(); } }, [i >= aimFrom]) });
  },  // 10b. The Warboss reaches the wall; the vanguard close on him (no bow, so his strikes and theirs stay readable).
  async s10b_wall(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 25, levels: { ...ranks(BOW, 3), ...ranks(VAN, 3), timber: 6 }, ach: DECOR, wall: 1 });
    await page.evaluate(() => { __tr.wallFloor = 0.9; __tr.soften(0.05); __tr.light(0.82); __tr.warm(4, 'none'); __tide.game.summonBoss(); });
    for (let i = 0; i < 40; i++) { const on = await page.evaluate(() => { __tr.warm(1, 'none'); return !!__tide.game.state.orcs.items.find((o) => o.live && !o.dead && o.kind === 'boss'); }); if (on) break; }
    await page.evaluate(() => { const s = __tide.game.state; for (const o of s.orcs.items) if (o.live && !o.dead) { o.x -= 560; if (o.kind === 'boss') o.x = Math.max(o.x, 300); } });
    const n = sec(10);
    await record(page, dir, n, { cam: follow((m) => m.boss ?? m.group, { z: 2.7, zEnd: 3.0, n, k: 1.6, off: { x: -20, y: -10 } }),
      perFrame: (p) => p.evaluate(() => { const s = __tide.game.state; __tr.aimP = null; __tide.game.clearAim(); }) });
  },


  // 11. A far bigger tide at dusk: the wall breaks stage by stage and falls.
  async s11_fall(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 74, levels: { ...ranks(BOW, 5), timber: 6, ...ranks(FOES, 5) }, ach: DECOR, wall: 0.1 });
    // the timber at its worst stage, propped for two seconds so the swarm is seen on it, then let go; the run freezes where it falls
    await page.evaluate(() => { __tr.wallFloor = 0.06; __tr.light(0.9); __tr.warm(4); });
    const n = sec(8);
    await record(page, dir, n, { cam: move({ x: 250, y: 330, z: 2.3 }, { x: 242, y: 335, z: 2.75 }, n),
      perFrame: (p, i) => p.evaluate((go) => { if (go) __tr.wallFloor = 0; __tr.crowdAim(0.18, 300); }, i >= sec(2)) });
  },
  // 12a. March again: the late game, every companion, weapon and the vanguard at once, cosmetics worn.
  async s12a_late(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 60, tier: 3, levels: { ...ranks(BOW, 7), multi: 1, wide: 1, ...ranks(['wolf', 'fangs', 'hawk'], 5), ...ranks(['fire', 'firechance', 'storm', 'shock'], 5), ...ranks(VAN, 5), timber: 10, ...ranks(FOES, 4), moon: 1, starfall: 1, starcount: 3 },
      ach: [...DECOR, 'wave_50', 'set_emberwright', 'branch_bow', 'wave_100'], worn: { cloak: 'cloak_ember', trail: 'trail_ember', ring: 'ring_rune', bow: 'bow_thornwood' }, wall: 1 });
    // keep the wall standing through the warm-up and the take: this is the strong late run, not the fall
    const hold = () => { const s = __tide.game.state; s.run.barHp = s.stats.barMax; };
    await page.evaluate(`(${hold})(); __tr.soften(0.1); __tr.light(0.3); for (let i = 0; i < 5; i++) { __tr.warm(1); (${hold})(); }`);
    const n = sec(8);
    await record(page, dir, n, { cam: move({ x: 330, y: 320, z: 2.0 }, { x: 350, y: 320, z: 2.3 }, n),
      perFrame: (p) => p.evaluate((h) => { eval(h)(); __tr.crowdAim(0.18, 320); }, `(${hold})`) });
  },
  // 13. End card plate: golden hour over the wall and the elf, late-game field, a slow push (darkened under the title in the edit).
  async s13_end(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 20, tier: 3, levels: { ...ranks(BOW, 6), ...ranks(VAN, 3), timber: 10, muster: 1, wolf: 1 },
      ach: [...DECOR, 'wave_50', 'set_emberwright', 'branch_bow', 'wave_100'], worn: { cloak: 'cloak_ember', bow: 'bow_thornwood' }, wall: 1 });
    await page.evaluate(() => { __tr.soften(0); __tr.light(0.62); __tr.warm(2, 'none'); __tr.clearOrcs(); });
    const n = sec(6);
    await record(page, dir, n, { cam: move({ x: 300, y: 250, z: 1.35 }, { x: 290, y: 255, z: 1.5 }, n) });
  },
};

const { browser, page } = await openGame({ scale: +(process.env.SCALE ?? 3) });
await page.evaluate(() => __tr.clean(true));
for (const [name, fn] of Object.entries(SHOTS)) {
  if (ONLY && !ONLY.includes(name)) continue;
  const t0 = Date.now();
  await page.evaluate(() => { __tr.soften(1); document.getElementById('fallen').hidden = true; __tide.panel.setMode('run'); __tr.aimP = null; __tide.game.dropAim?.(); });
  rmSync(`${OUT}/${name}`, { recursive: true, force: true });
  try { await fn(page, `${OUT}/${name}`); } catch (e) { console.log(name, 'FAILED', e.stack); continue; }
  console.log(name, 'done in', Math.round((Date.now() - t0) / 1000), 's');
}
await browser.close();
