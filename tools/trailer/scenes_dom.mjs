// Launch trailer take 2 (TB-277): the DOM shots (the Grove tree, the fallen report, the path cards, the camp), recorded as full
// page screenshots at deviceScaleFactor 2 (3840 x 2160). The tree is framed by its own camera (drawn at device resolution);
// the other pages are framed in the edit with a crop of at most 2x, so every pixel is native.
// Usage: node scenes_dom.mjs <outDir> [shot,...]   (needs `npx vite --port 5270` from the repo root)
import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { openGame, FPS } from './rig2.mjs';
const OUT = process.argv[2] ?? 'out2/shots';
const ONLY = process.argv[3]?.split(',');
const sec = (s) => Math.round(s * FPS);
const ranks = (ids, r = 10) => Object.fromEntries(ids.map((id) => [id, r]));
const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
const mix = (a, b, u) => a + (b - a) * u;
const BOW = ['sharp', 'draw', 'wide', 'crit', 'multi', 'pierce'];
const DECOR = ['wave_10', 'boss_50', 'branch_barricade', 'slain_100k', 'branch_vanguard'];
const CAMP_ACH = ['first_boss', 'boss_streak', 'boss_roster', 'boss_swift', 'boss_tier6', 'camp_first', 'camp_full', 'replant_1', 'path_fox', 'path_serpent', 'path_magpie', 'branch_companions', 'hold_60m', 'secret_last_plank'];

async function shoot(page, dir, n, perFrame) {
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < n; i++) {
    if (perFrame) await perFrame(page, i);
    await page.clock.runFor(1000 / FPS);
    await page.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  }
}

const SHOTS = {
  // 4. Grow the grove: the whole skill tree, mid-run; the camera pushes in on the Grey Wolf as it is bought and its branch lights.
  async d04_grove(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 8, levels: { ...ranks(BOW, 3), timber: 3, horde: 3, muster: 1, knives: 1, knifespd: 2, fire: 1, glean: 2, drums: 1, runners: 1 }, wall: 1 });
    await page.evaluate(() => { const s = __tide.game.state; s.run.fallen = true; s.run.starlight = 5000; __tide.panel.setMode('camp'); __tide.panel.setTab('grove'); });
    await page.clock.runFor(800);
    await page.evaluate(() => {
      __tide.panel.setTreeFull(true); document.activeElement?.blur();
      const st = document.createElement('style'); st.id = 'tr-grove';
      st.textContent = 'body.tree-full #pane-grove .detail, #tree-full { display: none !important; }'; document.head.append(st);
      dispatchEvent(new Event('resize'));
    });
    await page.clock.runFor(800);
    const n = sec(6), buyAt = sec(2.2);
    const cam = (i) => { const u = smooth(i / (n - 1)); return { cx: mix(760, 700, u), cy: mix(640, 560, u), z: mix(1.05, 1.9, u) }; };
    writeFileSync(`${dir}.json`, JSON.stringify({ buyAt }));
    await shoot(page, dir, n, (p, i) => p.evaluate(([c, buy]) => {
      const t = __tide.tree; t.target = null; t.cam = { x: c.cx - t.vw / c.z / 2, y: c.cy - t.vh / c.z / 2, z: c.z }; t.stale = true;
      if (buy) __tide.game.buy('wolf');
    }, [cam(i), i === buyAt]));
  },
  // 9b. The fallen report rises over the dimmed field.
  async d09_fallen(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 74, levels: { ...ranks(BOW, 5), timber: 6, horde: 5, brutes: 1, bruteswarm: 3 }, ach: DECOR, wall: 0.02 });
    await page.evaluate(() => { const s = __tide.game.state; __tr.warm(3); s.run.kills = 4810; s.run.runTime = 2290; s.run.barHp = 0.5; });
    await shoot(page, dir, sec(6), (p) => p.evaluate(() => __tr.crowdAim()));
  },
  // 10a. Replant: the three path cards.
  async d10a_paths(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 50, levels: { ...ranks(BOW, 5), timber: 6, muster: 1 }, ach: [...DECOR, ...CAMP_ACH], camp: { bowyer: 3, forge: 3, kitchen: 3, training: 3 } });
    await page.evaluate(() => { const s = __tide.game.state; s.meta.heartwood += 300; s.run.fallen = true; __tide.panel.setMode('camp'); __tide.panel.setTab('prestige'); });
    await page.clock.runFor(1500);
    await shoot(page, dir, sec(6));
  },
  // 10b. The camp with its buildings, trophies, banners and campfire.
  async d10b_camp(page, dir) {
    await page.evaluate((spec) => __tr.setup(spec), { wave: 50, levels: {}, ach: [...DECOR, ...CAMP_ACH], camp: { bowyer: 3, forge: 3, kitchen: 3, training: 3 } });
    await page.evaluate(() => { const s = __tide.game.state; s.meta.heartwood += 300; s.run.fallen = true; __tide.panel.setMode('camp'); __tide.panel.setTab('camp'); });
    await page.clock.runFor(1500);
    await shoot(page, dir, sec(7));
  },
};

const { browser, page } = await openGame({ scale: 2, dsf: 2 });
await page.evaluate(() => __tr.clean(true));
for (const [name, fn] of Object.entries(SHOTS)) {
  if (ONLY && !ONLY.includes(name)) continue;
  const t0 = Date.now();
  await page.evaluate(() => { __tr.soften(1); document.getElementById('fallen').hidden = true; __tide.panel.setTreeFull?.(false); document.getElementById('tr-grove')?.remove(); __tide.panel.setMode('run'); __tr.aimP = null; });
  rmSync(`${OUT}/${name}`, { recursive: true, force: true });
  try { await fn(page, `${OUT}/${name}`); } catch (e) { console.log(name, 'FAILED', e.stack); continue; }
  console.log(name, 'done in', Math.round((Date.now() - t0) / 1000), 's');
}
await browser.close();
