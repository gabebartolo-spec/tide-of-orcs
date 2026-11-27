// Launch trailer shots (storyboard: claude.ai doc "Trailer plan and storyboard", approved 26 Nov 2026). Each scene sets up a
// save through the real buy and replant intents, warms the field with the sim alone, then records frames at 30 fps.
// Usage: node tools/trailer/scenes.mjs <outDir> [scene,scene,...]
import { openGame, record, FPS } from './rig.mjs';
const OUT = process.argv[2] ?? 'out/shots';
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
const CLEAN = `#toast, #loot-banners { display: none !important; }`;
const aimCrowd = (p) => p.evaluate(() => __tr.crowdAim());

const SCENES = {
  // 1. Arrival: the empty meadow, the first grunts walk in. No aim yet.
  async s01_arrival(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 2, levels: {}, wall: 1 });
    await page.evaluate(() => { __tr.pinWall(0.95); __tr.warm(5, 'none'); });
    await record(page, dir, sec(6));
  },
  // 2. Aim: the circle settles on a knot of grunts, arrows arc over, they fall.
  async s02_aim(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 6, levels: { sharp: 3, wide: 3, horde: 3 }, wall: 1 });
    await page.evaluate(() => { __tr.pinWall(0.9); __tr.warm(14, 'none'); });
    await record(page, dir, sec(7), { perFrame: (p, i) => i > 8 ? aimCrowd(p) : null });
  },
  // 3a. The Grove page: a node is bought and the branch lights.
  async s03a_grove(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 8, levels: { sharp: 4, draw: 3, wide: 3, horde: 3, timber: 2, muster: 1 }, wall: 1 });
    await page.evaluate(() => { const g = __tide.game, s = g.state; s.run.fallen = true; s.run.starlight = 900; __tide.panel.setMode('camp'); __tide.panel.setTab('grove'); });
    await page.clock.runFor(1500);
    await page.evaluate(() => { __tide.panel.tree.selected = 'wolf'; __tide.panel.renderDetail(); });
    await page.clock.runFor(1500);
    await record(page, dir, sec(4), { perFrame: (p, i) => i === sec(1.2) ? p.evaluate(() => { __tide.game.buy('wolf'); }) : null });
  },
  // 3b. Back on the field with the grey wolf and two rangers.
  async s03b_wolf(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 9, levels: { sharp: 5, draw: 3, wide: 3, horde: 4, wolf: 1, fangs: 3, ranger: 1, warden: 1 }, wall: 1 });
    await page.evaluate(() => __tr.warm(10));
    await record(page, dir, sec(4), { perFrame: aimCrowd });
  },
  // 4. Companions: wolf, hawk, rangers, knives.
  async s04_pals(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 16, levels: { ...ranks(BOW, 2), ...ranks(PALS, 3), horde: 5, runners: 1, runswarm: 5, brutes: 1, bruteswarm: 5 }, wall: 0.85 });
    await page.evaluate(() => { __tr.soften(0.05); __tr.warm(22); });
    await record(page, dir, sec(9), { perFrame: aimCrowd });
  },
  // 5. Armoury: fire, frost and shatter, chain lightning, the ballista bolt.
  async s05_arms(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 24, levels: { ...ranks(BOW, 2), ...ranks(ARMS, 3), horde: 5, runners: 1, runswarm: 5, brutes: 1, bruteswarm: 5, elites: 1, eliteswarm: 3 }, wall: 0.85 });
    await page.evaluate(() => { __tr.soften(0.05); __tr.warm(22); });
    await record(page, dir, sec(8), { perFrame: aimCrowd });
  },
  // 6. Hold the line: fox-tabard spearmen and bladedancers before the stone wall with banners, lanterns and skulls.
  async s06_vanguard(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 32, levels: { ...ranks(BOW, 7), ...ranks(VAN, 5), timber: 6, horde: 5, runners: 1, brutes: 1, bruteswarm: 3, elites: 1 }, ach: DECOR, wall: 1 });
    await page.evaluate(() => { __tr.pinWall(0.8); __tr.warm(14); });
    await record(page, dir, sec(7), { perFrame: aimCrowd });
  },
  // 7. The plain fills and the wall starts to splinter.
  async s07_tide(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 46, levels: { ...ranks(BOW, 7), ...ranks(ARMS, 3), ...ranks(VAN, 3), timber: 6, ...ranks(FOES, 5) }, ach: DECOR, wall: 0.9 });
    await page.evaluate(() => { __tr.soften(0.04); __tr.warm(10); const s = __tide.game.state; s.run.barHp = s.stats.barMax * 0.5; });
    await record(page, dir, sec(7), { perFrame: aimCrowd });
  },
  // 8. The boss wave: Summon pressed, the Warboss and his guard march in, everything fires, the Warboss falls. Recorded whole.
  async s08_boss(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 25, levels: { ...ranks(BOW, 5), ...ranks(PALS, 3), ...ranks(ARMS, 2), ...ranks(VAN, 3), timber: 10 }, ach: DECOR, wall: 1 });
    await page.evaluate(() => { __tr.soften(0.3); __tr.warm(6); });
    await record(page, dir, sec(3), { perFrame: (p, i) => i === sec(1.5) ? p.click('#dep-boss', { timeout: 3000 }).catch(() => p.evaluate(() => __tide.game.summonBoss())) : aimCrowd(p) });
    console.log('boss on', await page.evaluate(() => !!__tide.game.state.run.boss));
    for (let i = 0; i < sec(21); i++) { await aimCrowd(page); await page.clock.runFor(1000 / FPS); }
    await record(page, dir, sec(17), { perFrame: aimCrowd, start: sec(3) });
  },
  // 9. A far bigger tide: the wall breaks stage by stage and falls; the fallen panel fades up.
  async s09_fall(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 74, levels: { ...ranks(BOW, 5), timber: 10, ...ranks(FOES, 5) }, ach: DECOR, wall: 0.8 });
    await page.evaluate(() => { const s = __tide.game.state; __tr.warm(5); s.run.kills = 4810; s.run.runTime = 2290; s.run.barHp = s.stats.barMax * 0.55; });
    let i = 0; for (; i < sec(25) && !(await page.evaluate(() => __tide.game.state.run.fallen)); i += sec(1)) await record(page, dir, sec(1), { perFrame: aimCrowd, start: i });
    await record(page, dir, sec(6), { start: i });
  },
  // 10a. Replant: the three path cards.
  async s10a_paths(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 50, levels: { ...ranks(BOW, 5), timber: 6, muster: 1 }, ach: [...DECOR, ...CAMP_ACH], camp: { bowyer: 3, forge: 3, kitchen: 3, training: 3 } });
    await page.evaluate(() => { const s = __tide.game.state; s.meta.heartwood += 300; s.run.fallen = true; __tide.panel.setMode('camp'); __tide.panel.setTab('prestige'); });
    await page.clock.runFor(2500);
    await record(page, dir, sec(4));
  },
  // 10b. The camp with its trophies, banners and campfire.
  async s10b_camp(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 50, levels: {}, ach: [...DECOR, ...CAMP_ACH], camp: { bowyer: 3, forge: 3, kitchen: 3, training: 3 } });
    await page.evaluate(() => { const s = __tide.game.state; s.meta.heartwood += 300; s.run.fallen = true; __tide.panel.setMode('camp'); __tide.panel.setTab('camp'); });
    await page.clock.runFor(2500);
    await record(page, dir, sec(5));
  },
  // 11. March again: the late game, every companion, weapon and the vanguard at once, cosmetics worn.
  async s11_late(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 60, tier: 3, levels: { ...ranks(BOW, 10), ...ranks(PALS, 5), ...ranks(ARMS, 5), ...ranks(VAN, 5), timber: 10, ...ranks(FOES, 4), moon: 1, starfall: 1 },
      ach: [...DECOR, 'wave_50', 'set_emberwright', 'branch_bow', 'wave_100'], worn: { cloak: 'cloak_ember', trail: 'trail_ember', ring: 'ring_rune', bow: 'bow_thornwood' }, wall: 1 });
    await page.evaluate(() => { __tr.pinWall(0.75); __tr.warm(12); });
    await record(page, dir, sec(7), { perFrame: aimCrowd });
  },
};

const { browser, page } = await openGame();
await page.addStyleTag({ content: CLEAN });
for (const [name, fn] of Object.entries(SCENES)) {
  if (ONLY && !ONLY.includes(name)) continue;
  const t0 = Date.now();
  await page.evaluate(() => { __tr.pinWall(null); __tr.soften(1); __tide.panel.reportTimers?.clear(); document.getElementById('fallen').hidden = true; __tide.panel.setMode('run'); __tr.aimP = null; __tide.game.dropAim(); });
  (await import('node:fs')).rmSync(`${OUT}/${name}`, { recursive: true, force: true });
  try { await fn(page, `${OUT}/${name}`); } catch (e) { console.log(name, 'FAILED', e.message); continue; }
  console.log(name, 'done in', Math.round((Date.now() - t0) / 1000), 's');
}
await browser.close();
