// Trailer capture rig (launch trailer, director-approved storyboard 26 Nov 2026). Drives the dev build in headless Chromium with a
// paused page clock: each output frame advances the game exactly 1/FPS s, so footage never stutters however slow the machine is.
// Needs `npm run dev -- --port 5270` (the dev build exposes window.__tide). Scenes live in scenes.mjs.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
export const FPS = 30;
export const URL = process.env.TIDE_URL ?? 'http://localhost:5270/';

export async function openGame({ width = 1920, height = 1080 } = {}) {
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.clock.install({ time: new Date('2026-11-26T10:00:00Z') });
  await page.goto(URL);
  await page.clock.runFor(2000);
  await page.waitForFunction(() => !!window.__tide?.field);
  await page.clock.pauseAt(new Date('2026-11-26T10:01:00Z'));
  await page.clock.runFor(200);
  await page.evaluate(HELPERS);
  return { browser, page };
}

/** Page-side helpers, installed once as window.__tr. */
const HELPERS = `(() => {
  const T = window.__tide;
  const tr = window.__tr = {
    /** Fresh game, then: meta (achievements earned, worn cosmetics, camp levels, tier, path), wave, node ranks bought through the
     *  real buy intent (so companions and vanguard appear as in play), and the wall's health as a fraction. */
    setup(spec) {
      const g = T.game; g.wipe(); const s = g.state;
      if (spec.ach) for (const a of spec.ach) if (!s.meta.ach.earned.includes(a)) s.meta.ach.earned.push(a);
      if (spec.worn) Object.assign(s.meta.ach.worn, spec.worn);
      if (spec.camp) Object.assign(s.meta.camp.levels, spec.camp);
      if (spec.tier) { s.meta.tier = spec.tier; s.run.tier = spec.tier; }
      if (spec.path !== undefined) s.run.path = spec.path;
      s.run.starlight = 1e300; s.run.fallen = true;
      const want = spec.levels ?? {};
      for (let pass = 0; pass < 60; pass++) { let any = false;
        for (const [id, r] of Object.entries(want)) if ((s.run.levels[id] ?? 0) < r && g.buy(id)) any = true;
        if (!any) break; }
      g.replant(spec.tier, spec.path ?? null);
      const r = g.state; if (spec.wave) r.run.wave = spec.wave;
      r.run.starlight = spec.starlight ?? 0;
      if (spec.wall != null) r.run.barHp = r.stats.barMax * spec.wall;
      g.events.drain();
      document.getElementById('hud-stamp') && (document.getElementById('hud-stamp').hidden = true);
      return { levels: Object.keys(r.run.levels).length, wave: r.run.wave, barMax: r.stats.barMax, tier: r.stats.wallTier, fallen: r.run.fallen };
    },
    /** Run the sim alone (no drawing) for sec seconds, aiming at the crowd, so the field fills before recording. */
    warm(sec, aim = 'crowd') { const g = T.game; for (let i = 0; i < sec * 60; i++) { if (aim === 'crowd') tr.crowdAim(); g.tick(1 / 60); } g.events.drain(); },
    /** Aim at the densest knot of orcs past the wall, eased so the circle glides rather than jumps. */
    crowdAim(ease = 0.18) {
      const s = T.game.state; let best = null, bn = -1;
      const live = s.orcs.items.filter((o) => o.live && !o.dead);
      for (const o of live) { if (o.x < 230) continue; let n = 0; for (const q of live) if ((q.x - o.x) ** 2 + (q.y - o.y) ** 2 < 2500) n++; if (n > bn) { bn = n; best = o; } }
      if (!best) return; const a = tr.aimP ?? { x: best.x, y: best.y };
      tr.aimP = { x: a.x + (best.x - a.x) * ease, y: a.y + (best.y - a.y) * ease }; T.game.setAim(tr.aimP.x, tr.aimP.y);
    },
    /** Orcs hit the wall and vanguard at k x their strength (k = 1 undoes), so a held line never falls during a shot. */
    soften(k) { const g = T.game; g._tick ??= g.tick.bind(g);
      g.tick = k === 1 ? g._tick : (dt) => { for (const o of g.state.orcs.items) if (o.live && o._soft !== k) { o.atk *= k; o._soft = k; } g._tick(dt); }; },
    pinWall(frac) { clearInterval(tr._pin); if (frac == null) return; tr._pin = setInterval(() => { const s = T.game.state; s.run.barHp = Math.max(s.run.barHp, s.stats.barMax * frac); }, 16); },
  };
})()`;

/** Record n frames into dir/NNNN.png. perFrame(page, i) runs in node before each frame (aim paths, button presses). */
export async function record(page, dir, n, { perFrame, start = 0 } = {}) {
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < n; i++) {
    if (perFrame) await perFrame(page, i);
    await page.clock.runFor(1000 / FPS);
    await page.screenshot({ path: `${dir}/${String(start + i).padStart(4, '0')}.png` });
  }
}
