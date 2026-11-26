// Trailer capture rig, take 2 (TB-277 redo). The field canvas is rendered at SCALE x its CSS size, and every output frame is a
// virtual-camera crop of it (world centre x, y and zoom z, where z = 1 shows the whole plain), resampled to 1920 x 1080 in the page.
// So close-ups are drawn at full sprite resolution, never upscaled, and no DOM (HUD, toasts, cursor) is in a field shot.
// DOM shots (the Grove page, path cards, the fallen panel, the camp) use page screenshots at deviceScaleFactor 2 instead.
// The page clock is paused and stepped 1/FPS per frame, so footage never stutters. Per-frame metadata (positions, events) is
// written beside the frames as meta.json, for camera tracking and sound sync in the edit.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
export const FPS = 30;
export const URL = process.env.TIDE_URL ?? 'http://localhost:5270/';
export const OUT_W = 1920, OUT_H = 1080;

export async function openGame({ scale = 3, dsf = 1 } = {}) {
  const browser = await pw.chromium.launch({ args: ['--disable-gpu-vsync', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('page error:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
  await page.clock.install({ time: new Date('2026-11-26T10:00:00Z') });
  await page.goto(URL);
  await page.clock.runFor(2000);
  await page.waitForFunction(() => !!window.__tide?.field);
  await page.clock.pauseAt(new Date('2026-11-26T10:01:00Z'));
  await page.clock.runFor(200);
  await page.addStyleTag({ content: '#toast, #loot-banners { display: none !important; }' });
  await page.evaluate(HELPERS);
  await page.evaluate(async () => { __tr.depthY = (await import('/src/render/depth.ts')).depthY; });
  await page.evaluate((s) => __tr.scale(s), scale);
  // one field draw per output frame (the game would draw every rAF tick, and each draw at SCALE costs)
  await page.evaluate(async () => { const m = await import('/src/render/quality.ts'); m.quality.q.drawGap = 30; });
  return { browser, page };
}

const HELPERS = `(() => {
  const T = window.__tide, f = T.field;
  const tr = window.__tr = {
    /** Field backing store at s x CSS size, held there (the desktop cap of 2 is lifted for capture only). */
    scale(s) {
      tr.S = s;
      f.resize = function () { const r = this.canvas.getBoundingClientRect(); const w = Math.round(r.width * s), h = Math.round(r.height * s);
        if (w === this.canvas.width && h === this.canvas.height) return; this.canvas.width = w; this.canvas.height = h; this.sprites.clearBakes(); };
      f.resize();
    },
    setup(spec) {
      const g = T.game; g.wipe(); const s = g.state;
      if (spec.ach) for (const a of spec.ach) if (!s.meta.ach.earned.includes(a)) s.meta.ach.earned.push(a);
      if (spec.worn) Object.assign(s.meta.ach.worn, spec.worn);
      if (spec.camp) Object.assign(s.meta.camp.levels, spec.camp);
      if (spec.hw) Object.assign(s.meta.hwLevels, spec.hw);
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
      // clear the previous shot's effects (death clouds, loot numbers, scorch patches) so nothing carries across shots
      f.books.shots.length = 0; for (const k of ['storms', 'impacts', 'puffs', 'patches', 'beams']) if (Array.isArray(f[k])) f[k].length = 0;
      f.fx.np = 0; f.fx.ns = 0; f.fx.nt = 0; for (const sp of f.fx.splats) sp.life = 0;
      const fo = document.getElementById('fallen'); if (fo) fo.hidden = true;
      T.panel.setMode && T.panel.setMode('run');
      tr.aimP = null; tr.ev = []; tr.wallFloor = 0;
      return { levels: Object.keys(r.run.levels).length, wave: r.run.wave, barMax: r.stats.barMax, tier: r.stats.wallTier, fallen: r.run.fallen };
    },
    warm(sec, aim = 'crowd') { const g = T.game; for (let i = 0; i < sec * 60; i++) { if (aim === 'crowd') tr.crowdAim(); g.tick(1 / 60); } g.events.drain(); },
    /** Aim at the densest knot of orcs past xMin, eased so the circle glides. */
    crowdAim(ease = 0.18, xMin = 230) {
      const s = T.game.state; let best = null, bn = -1;
      const live = s.orcs.items.filter((o) => o.live && !o.dead);
      for (const o of live) { if (o.x < xMin) continue; let n = 0; for (const q of live) if ((q.x - o.x) ** 2 + (q.y - o.y) ** 2 < 2500) n++; if (n > bn) { bn = n; best = o; } }
      if (!best) return; const a = tr.aimP ?? { x: best.x, y: best.y };
      tr.aimP = { x: a.x + (best.x - a.x) * ease, y: a.y + (best.y - a.y) * ease }; T.game.setAim(tr.aimP.x, tr.aimP.y);
    },
    /** Health bars over hurt orcs and vanguard off (true restores): a 3-unit-high fill in the bar colours is skipped. */
    async bars(on) { const P = (await import('/src/render/palette.ts')).P, g = f.canvas.getContext('2d'); g._fr ??= g.fillRect.bind(g);
      const norm = document.createElement('canvas').getContext('2d'), cols = new Set([P.dim, P.rose, P.spear].map((c) => (norm.fillStyle = c, String(norm.fillStyle).toLowerCase())));
      g.fillRect = on ? g._fr : function (x, y, w, h) { if (h === 3 && cols.has(String(this.fillStyle).toLowerCase())) return; return this._fr(x, y, w, h); }; },
    /** Capture look: no health bars, no wave strip (both return with clean(false)). */
    async clean(on = true) { await tr.bars(!on); f._stripDraw ??= f.strip.draw.bind(f.strip); f.strip.draw = on ? () => {} : f._stripDraw;
      // floating 'crit' words stack into an unreadable column at trailer framings; the bursts and blood still sell the crit
      f._fxText ??= f.fx.text.bind(f.fx);
      // loot numbers too: in a burst of kills they pile into an unreadable stack, so keep one now and then (at most one per 0.35 s, none near the last)
      let lastT = -1, lx = 0, ly = 0;
      f.fx.text = on ? (x, y, s, c) => { if (s === 'crit') return; const t = performance.now() / 1000;
        if (t - lastT < 0.35 || (t - lastT < 1 && Math.hypot(x - lx, y - ly) < 60)) return; lastT = t; lx = x; ly = y; f._fxText(x, y, s, c); } : f._fxText;
      // loot drop pillars: a tall beam out of nowhere in a close-up reads as a glitch without the satchel beside it
      f._lootDrop ??= f.lootDrop.bind(f); f.lootDrop = on ? () => {} : f._lootDrop; },
    /** Time of day: 0 midday, 0.5 golden hour, 1 deepest dusk (the field's own day clock, held there). */
    light(n) { tr.dayN = n; f.clock = Math.acos(1 - 2 * n) / (2 * Math.PI) * 600; },
    /** Place orcs: a knot of n of one kind around (cx, cy), spread in world units, on the real spawn path (so stats match the wave). */
    async knot(kind, n, cx, cy, sx = 30, sy = 25, seed = 1) {
      const { spawnOrc } = await import('/src/sim/step.ts'); const s = T.game.state; let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
      const out = []; for (let i = 0; i < n; i++) { const o = spawnOrc(s, kind); if (!o) break; o.x = cx + (rnd() - 0.5) * 2 * sx; o.y = cy + (rnd() - 0.5) * 2 * sy; out.push(o); }
      tr.group = out; return out.length;
    },
    /** Centroid of the placed knot (live members only). */
    groupC() { const g = (tr.group ?? []).filter((o) => o.live && !o.dead); if (!g.length) return null; let x = 0, y = 0; for (const o of g) { x += o.x; y += o.y; } return { x: x / g.length, y: y / g.length, n: g.length }; },
    clearOrcs() { const P = T.game.state.orcs; for (const o of P.items) if (o.live) P.release(o); },
    elf() { return { x: 64, y: f.postY(240) }; },
    aimAt(x, y) { tr.aimP = { x, y }; T.game.setAim(x, y); },
    soften(k) { const g = T.game; g._tick ??= g.tick.bind(g);
      // tr.wallFloor (0..1) props the wall up before every step, for shots where it must look battered but stand
      g.tick = (dt) => { const s = g.state; if (k !== 1) for (const o of s.orcs.items) if (o.live && o._soft !== k) { o.atk *= k; o._soft = k; }
        if (tr.wallFloor && !s.run.fallen) s.run.barHp = Math.max(s.run.barHp, s.stats.barMax * tr.wallFloor); g._tick(dt); }; },
    /** Collect event types each frame (wraps the controller's own event hook). */
    hookEvents() { const g = T.game; if (g._note) return; g._note = g.noteEvents.bind(g);
      g.noteEvents = (evs) => { for (const e of evs) if (tr.ev.length < 400) { const o = { t: e.t }; if (e.x != null) { o.x = Math.round(e.x); o.y = Math.round(e.y); } for (const k of ['kind', 'frac', 'rarity', 'kept']) if (e[k] != null) o[k] = e[k]; tr.ev.push(o); } return g._note(evs); }; },
    /** Snapshot for camera and sound: positions in world units. */
    meta() {
      const s = T.game.state, live = s.orcs.items.filter((o) => o.live && !o.dead);
      let cx = 0, cy = 0; for (const o of live) { cx += o.x; cy += o.y; }
      const boss = live.find((o) => o.kind === 'boss') ?? live.find((o) => o.bossId) ?? null, front = live.reduce((m, o) => Math.min(m, o.x), 1e9);
      const ev = tr.ev; tr.ev = [];
      return { t: s.t, wave: s.run.wave, n: live.length, cx: live.length ? cx / live.length : null, cy: live.length ? cy / live.length : null, front: live.length ? front : null,
        boss: boss ? { x: boss.x, y: boss.y, hp: boss.hp / boss.maxhp } : null, wolf: { x: s.wolf.x, y: s.wolf.y }, hawk: { x: s.hawk.x, y: s.hawk.y },
        aim: T.game.aim ? { x: T.game.aim.x, y: T.game.aim.y } : null, group: tr.groupC(), wall: s.run.barHp / s.stats.barMax, fallen: s.run.fallen, ev };
    },
    /** Crop the field canvas around world (x, y) at zoom z (1 = the whole visible width) to an OUT_W x OUT_H JPEG. */
    grab(x, y, z, drawn = false, q = 0.93) {
      const c = f.canvas, v = f.view, d = c.width / c.clientWidth;
      const fullW = c.width, w = fullW / z, h = w * ${OUT_H} / ${OUT_W};
      const yd = !drawn && tr.depthY ? tr.depthY(y) : y;  // sim rows are drawn through the fake-depth curve
      let sx = (x * v.k + v.ox) * d - w / 2, sy = (yd * v.k + v.oy) * d - h / 2;
      sx = Math.max(0, Math.min(c.width - w, sx)); sy = Math.max(0, Math.min(c.height - h, sy));
      const o = tr.out ??= Object.assign(document.createElement('canvas'), { width: ${OUT_W}, height: ${OUT_H} });
      const g = o.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(c, sx, sy, w, h, 0, 0, ${OUT_W}, ${OUT_H});
      return o.toDataURL('image/jpeg', q).slice(23);
    },
  };
})()`;

/** Record n field frames. cam(i, meta) returns {x, y, z} in world units for frame i (meta is the previous frame's snapshot).
 *  perFrame(page, i, meta) runs first (aim paths, button presses). Writes dir/NNNN.jpg and dir/meta.json. */
export async function record(page, dir, n, { cam, perFrame, start = 0 } = {}) {
  mkdirSync(dir, { recursive: true });
  const metas = []; let meta = await page.evaluate(() => (__tr.hookEvents(), __tr.meta()));
  for (let i = 0; i < n; i++) {
    if (perFrame) await perFrame(page, i, meta);
    await page.clock.runFor(1000 / FPS);
    const c = cam ? cam(i, meta) : { x: 450, y: 240, z: 1 };
    const [b64, m] = await page.evaluate(([x, y, z, d]) => [__tr.grab(x, y, z, d), __tr.meta()], [c.x, c.y, c.z, !!c.drawn]);
    writeFileSync(`${dir}/${String(start + i).padStart(4, '0')}.jpg`, Buffer.from(b64, 'base64'));
    meta = m; metas.push({ ...m, cam: c });
  }
  writeFileSync(`${dir}/meta.json`, JSON.stringify(metas));
  return metas;
}

/** DOM shot frames (page screenshots, deviceScaleFactor of the context). */
export async function recordPage(page, dir, n, { perFrame, start = 0, clip } = {}) {
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < n; i++) {
    if (perFrame) await perFrame(page, i);
    await page.clock.runFor(1000 / FPS);
    await page.screenshot({ path: `${dir}/${String(start + i).padStart(4, '0')}.jpg`, quality: 93, type: 'jpeg', clip });
  }
}
