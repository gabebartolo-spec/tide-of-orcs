// Phone HUD + controls capture and audit (TB-224). Start the dev server (npx vite --port 5242 --strictPort), then:
//   TIDE_URL=http://localhost:5242/ node tools/mobile-hud-shot.mjs <debug port> <outDir> [label]
// Real Chrome, headless, touch emulation, DPR 2.625. Scenes: l412 (915x412), l360 (915x360), l343 (762x343), notch (915x412 with a
// camera-cutout inset on the left and a gesture-bar inset at the bottom), p915 (412x915 portrait, no touch so the game renders).
// Per scene it writes PNGs and audit.json with: effective font px of every HUD text (font-size times every ancestor's zoom), HUD boxes and
// pairwise overlaps, the 44 px touch-target check, canopy numbers (rail bottom vs the bush line and the skirt base, share of the canopy band
// the HUD covers), the elf-head gap, the lowest and highest orc feet against the top of every bottom control, the finger-to-aim reach test
// (CDP touch at rows up the screen; the world y the bow aims at), the Auto fire proof (no finger: circle shown, arrows loosed; a finger wins),
// big-number overflow, and the Heartwood font audit of every screen.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9351', outDir = '.', label = 'shot'] = process.argv;
mkdirSync(outDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-hud-${port}-${Date.now()}`,
  '--headless=new', '--window-size=915,412', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval'); return r.result.result.value; };
await cdp('Page.enable');
const FONTS = `(async () => {
  await document.fonts.ready;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let n = e; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || n.hidden) return false; } return true; };
  const zoomOf = (e) => { let z = 1; for (let n = e; n && n !== document.documentElement; n = n.parentElement) z *= parseFloat(getComputedStyle(n).zoom || '1') || 1; return z; };
  const bad = [], small = [], missing = new Set(); let n = 0;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t; (t = w.nextNode());) { const s = t.nodeValue.trim(); if (!s) continue; const e = t.parentElement; if (!vis(e)) continue; n++;
    const cs = getComputedStyle(e); if (!/^"?Heartwood"?$/.test(cs.fontFamily.trim())) bad.push({ el: (e.id || e.className || e.tagName).toString().slice(0, 28), fam: cs.fontFamily.slice(0, 40), t: s.slice(0, 14) });
    const px = parseFloat(cs.fontSize) * zoomOf(e); if (px < 14) small.push({ el: (e.id || e.className || e.tagName).toString().slice(0, 28), px: +px.toFixed(1), t: s.slice(0, 14) });
    for (const ch of s) if (!document.fonts.check('16px Heartwood', ch)) missing.add(ch); }
  return { texts: n, nonHeartwood: bad, under14px: small, missingGlyphs: [...missing] };
})()`;
const GEO = `(() => {
  const { game, field } = window.__tide, v = field.view, st = game.state;
  const R = (s) => { const e = typeof s === 'string' ? document.querySelector(s) : s; if (!e || e.hidden) return null; const cs = getComputedStyle(e); if (cs.display === 'none') return null; const b = e.getBoundingClientRect(); if (b.width < 1) return null;
    return { l: +b.left.toFixed(1), t: +b.top.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const zoomOf = (e) => { let z = 1; for (let n = e; n && n !== document.documentElement; n = n.parentElement) z *= parseFloat(getComputedStyle(n).zoom || '1') || 1; return z; };
  const fs = (s) => { const e = document.querySelector(s); return e && !e.hidden ? +(parseFloat(getComputedStyle(e).fontSize) * zoomOf(e)).toFixed(1) : null; };
  const names = { wall: '#hud-wall', wallN: '#hud-wall-n', star: '.hud-star', wave: '#hud-wave', slain: '.hud .stats .stat:first-child', auto: '#btn-auto-hud', settings: '#btn-settings', pullback: '#btn-pullback', mute: '#btn-mute-corner', boss: '#dep-boss' };
  const box = {}; for (const [k, s] of Object.entries(names)) box[k] = R(s);
  // visible footprints: the carved chips are the visible parts; the wall bar, gem and count are bare; the gear disc is 28 px inside its 48 px hit box
  const foot = {}; for (const k of ['wall', 'wallN', 'star', 'wave', 'slain', 'auto', 'pullback', 'boss', 'mute']) if (box[k]) foot[k] = box[k];
  if (box.settings) foot.settings = { l: box.settings.l + (box.settings.w - 28) / 2, t: box.settings.t + 2, r: box.settings.l + (box.settings.w + 28) / 2, b: box.settings.t + 30, w: 28, h: 28 };
  const hit = { ...box }; delete hit.wall; delete hit.wallN; delete hit.star; delete hit.wave; delete hit.slain;
  const pad = { auto: [8, 20] }; const touch = Object.entries(hit).filter(([, b]) => b).map(([k, b]) => { const [px, py] = pad[k] ?? [0, 0]; const w = b.w + px, h = b.h + py; return { k, w, h, ok: w >= 44 && h >= 44 }; });
  const names2 = Object.keys(foot), over = [];
  for (let i = 0; i < names2.length; i++) for (let j = i + 1; j < names2.length; j++) { const a = foot[names2[i]], b = foot[names2[j]]; if (a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5) over.push(names2[i] + '/' + names2[j]); }
  const rail = ['wall', 'wallN', 'star', 'wave', 'slain', 'auto', 'settings', 'pullback'].map((k) => foot[k]).filter(Boolean);
  const railB = Math.max(...rail.map((b) => b.b)), railT = Math.min(...rail.map((b) => b.t));
  const T = ${'{'}first: 38, gap: 26, stop: -6, skirt: { h1: 36, offset: 9, rows: 2, lift: 14 }${'}'};
  const y0 = -v.oy / v.k, n = Math.max(2, Math.floor((T.stop - y0 - T.first) / T.gap) + 1), sbW = y0 + T.first + (n - 1) * T.gap + T.skirt.lift;
  const skirtCss = v.oy + sbW * v.k, bushTopCss = v.oy + (sbW - T.skirt.offset * (T.skirt.rows - 1) - T.skirt.h1) * v.k;
  const cw = document.documentElement.clientWidth, band = cw * skirtCss; let cover = 0; for (const b of rail) cover += Math.max(0, Math.min(b.b, skirtCss) - Math.max(b.t, 0)) * b.w;
  const k = v.k, X = (x) => v.ox + x * k, Y = (y) => v.oy + y * k;
  const elf = { l: X(64) - 14 * k, t: Y(240) - 40 * k, b: Y(240) + 20 * k };   // elf stands at the plain's mid height, ~40 units tall
  const feetLo = st.phoneBand ? Y(480 - 88) : Y(480 - 30), feetHi = st.phoneBand ? Y(105) : Y(30);
  const dockTop = Math.min(...['mute', 'boss', 'pullback'].map((s) => box[s]?.t ?? 1e9));
  return { view: { k: +k.toFixed(3), ox: +v.ox.toFixed(1), oy: +v.oy.toFixed(1) }, box, touch, overlaps: over, railTopBottom: [railT, railB],
    canopy: { skirtBaseCss: +skirtCss.toFixed(1), bushTopCss: +bushTopCss.toFixed(1), railBottomVsBushTop: +(bushTopCss - railB).toFixed(1), railCoverPctOfBand: +(100 * cover / (band || 1)).toFixed(1) },
    elfHeadTopCss: +elf.t.toFixed(1), elfHeadGapToRail: +(elf.t - railB).toFixed(1), orcFeetCss: { top: +feetHi.toFixed(1), bottom: +feetLo.toFixed(1) }, dockTopCss: dockTop === 1e9 ? null : dockTop,
    feetGapToDock: dockTop === 1e9 ? null : +(dockTop - feetLo).toFixed(1), feetGapToRail: +(feetHi - railB).toFixed(1),
    fs: { wallN: fs('#hud-wall-n'), wave: fs('#st-wave'), waveK: fs('#k-wave'), kills: fs('#st-kills'), killsK: fs('#k-kills'), star: fs('#st-star'), auto: fs('#btn-auto-hud'), pullback: fs('#btn-pullback'), boss: fs('#dep-boss .n') },
    wrapped: ['#hud-wave', '.hud .stats .stat:first-child', '#btn-auto-hud'].map((s) => R(s)).filter(Boolean).every((b) => b.h <= 30) };
})()`;
const touch = async (type, x, y) => cdp('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const REACH = async (W, H) => {   // the world y the bow aims at for a finger at each css row, x mid-field; and the lowest orc feet
  const out = []; for (let fy = H - 4; fy >= H - 150; fy -= 12) { await touch('touchStart', Math.round(W * 0.6), fy); await sleep(60); out.push({ fingerY: fy, aimY: await ev(`(() => { const a = window.__tide.game.aim; return a ? +a.y.toFixed(1) : null; })()`) }); await touch('touchEnd'); await sleep(40); }
  const lowest = await ev(`window.__tide.game.state.phoneBand ? 480 - 88 : 480 - 30`);
  const first = out.filter((o) => o.aimY !== null && o.aimY >= lowest - 1).pop();
  return { lowestOrcWorldY: lowest, fingerRows: out, lowestReachedAtFingerY: first?.fingerY ?? null, bottomPxLeftBelowFinger: first ? H - first.fingerY : null };
};
const SCENES = [{ tag: 'l412', W: 915, H: 412, touch: true }, { tag: 'l360', W: 915, H: 360, touch: true }, { tag: 'l343', W: 762, H: 343, touch: true },
  { tag: 'notch', W: 915, H: 412, touch: true, safe: { top: 0, left: 48, right: 0, bottom: 24 } }, { tag: 'p915', W: 412, H: 915, touch: false }];
const out = {};
for (const sc of SCENES) {
  const { W, H, tag } = sc;
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: sc.touch, maxTouchPoints: sc.touch ? 5 : 0 });
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2.625, mobile: sc.touch, screenWidth: W, screenHeight: H });
  try { await cdp('Emulation.setSafeAreaInsetsOverride', { insets: sc.safe ?? { top: 0, left: 0, right: 0, bottom: 0 } }); } catch {}
  await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5242/' }); await sleep(2500); await ev('localStorage.clear()'); await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5242/' }); await sleep(3500);
  await ev(`localStorage.setItem('tide.fullscreen','off')`);
  const SET = `(async () => { const { game, panel } = window.__tide; const { spawnOrc } = await import('/src/sim/step.ts'); panel.setMode('run'); const r = game.state.run; game.state.orcs.forEach((o) => { o.dead = true; });
    r.wave = 3; r.starlight = 42; r.kills = 20; r.barHp = 13; r.fallen = false; game.state.meta.lifetimeKills = 20; r.tier = 1;
    for (const y of [0, 480, 240, 120, 360]) spawnOrc(game.state, 'grunt', y).x = 520 + y * 0.2; })()`;
  await ev(SET); await sleep(1800);
  const shot = async (name) => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${label}-${tag}-${name}.png`, Buffer.from(r.result.data, 'base64')); };
  await shot('run');
  const o = out[tag] = { fonts: {}, geo: await ev(GEO) };
  o.fonts.run = await ev(FONTS);
  if (sc.touch) {
    o.reach = await REACH(W, H);
    // Auto fire proof: no finger -> circle shown and arrows loosed; a finger -> the finger's circle wins
    await ev(`(() => { const g = window.__tide.game; g.state.run.shotT[0] = 99; })()`); await sleep(300);
    o.auto = await ev(`(() => { const g = window.__tide.game; return { autoFire: g.autoFire, noFinger: g.aim === null, shown: g.shownAim(), shotsLive: g.state.shots.count, shotsFired: g.state.run.shotsFired ?? null }; })()`);
    await touch('touchStart', Math.round(W * 0.4), Math.round(H * 0.5)); await sleep(120);
    o.manualWins = await ev(`(() => { const g = window.__tide.game; const a = g.aim, s = g.shownAim(); return { aim: a && { x: +a.x.toFixed(1), y: +a.y.toFixed(1) }, shownIsAim: !!a && s === a }; })()`);
    await touch('touchEnd'); await sleep(100);
    await shot('auto');
    // the director's other states: pull-back and boss controls visible, huge numbers, a tide name
    await ev(`(() => { document.getElementById('btn-pullback').hidden = false; const b = document.getElementById('dep-boss'); b.hidden = false; })()`); await sleep(500);
    o.extraGeo = await ev(GEO); await shot('extra');
    await ev(`(() => { const { game } = window.__tide; const r = game.state.run; r.wave = 1234; r.starlight = 9.87e12; r.kills = 123456789; game.state.meta.lifetimeKills = 123456789012; r.barHp = 1.23e9; game.state.stats.barMax = 9.99e11; r.tier = 3; })()`); await sleep(1500);
    o.bigGeo = await ev(GEO); o.fonts.big = await ev(FONTS); await shot('big');
    await ev(`(() => { document.getElementById('btn-pullback').hidden = true; document.getElementById('dep-boss').hidden = true; })()`);
    await ev(SET); await sleep(800);
  }
  for (const [name, setup] of [['settings', `window.__tide.panel.setMode('settings'); window.__tide.panel.setTab('settings')`], ['grove', `window.__tide.panel.setMode('camp'); window.__tide.panel.setTab('grove')`], ['satchel', `window.__tide.panel.setTab('satchel')`], ['camp', `window.__tide.panel.setTab('camp')`], ['replant', `window.__tide.panel.setTab('prestige')`]]) {
    await ev(setup); await sleep(700); o.fonts[name] = await ev(FONTS);
    const b = await ev(`(() => { const s = document.querySelector('#btn-mute') ?? document.body; const r = (e) => { const x = e?.getBoundingClientRect(); return x && { t: +x.top.toFixed(1), b: +x.bottom.toFixed(1), l: +x.left.toFixed(1), r: +x.right.toFixed(1) }; }; const back = [...document.querySelectorAll('#camp-close, #camp-go, #btn-pullback')].map((e) => ({ id: e.id, ...r(e) })); return { mute: r(document.querySelector('#btn-mute')), back, innerH: innerHeight, innerW: innerWidth }; })()`);
    o[name + 'Box'] = b; if (tag === 'l412' || tag === 'notch') await shot(name);
  }
  await ev(`window.__tide.panel.setMode('run')`); await sleep(500);
  await ev(`(() => { const { game, panel } = window.__tide; game.state.run.fallen = true; panel.showFallen(); })()`); await sleep(2500); o.fonts.fallen = await ev(FONTS); await shot('fallen');
}
writeFileSync(`${outDir}/${label}-audit.json`, JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) {
  console.log(k, 'overlaps', JSON.stringify(v.geo.overlaps), 'touch<44', JSON.stringify(v.geo.touch.filter((t) => !t.ok)), 'canopy', JSON.stringify(v.geo.canopy), 'elfGap', v.geo.elfHeadGapToRail, 'feetGapDock', v.geo.feetGapToDock, 'feetGapRail', v.geo.feetGapToRail, 'fs', JSON.stringify(v.geo.fs));
  if (v.reach) console.log('  reach: lowest orc world y', v.reach.lowestOrcWorldY, 'reached at finger y', v.reach.lowestReachedAtFingerY, 'px left below finger', v.reach.bottomPxLeftBelowFinger, 'auto', JSON.stringify(v.auto), 'manual', JSON.stringify(v.manualWins));
  if (v.bigGeo) console.log('  big: overlaps', JSON.stringify(v.bigGeo.overlaps), 'wrapped-ok', v.bigGeo.wrapped, 'rail r', Math.max(...['wave', 'slain', 'pullback'].map((k2) => v.bigGeo.box[k2]?.r ?? 0)), 'auto l', v.bigGeo.box.auto?.l, '| extra overlaps', JSON.stringify(v.extraGeo.overlaps), 'pullback', JSON.stringify(v.extraGeo.box.pullback));
  for (const [s, f] of Object.entries(v.fonts)) console.log('  fonts', s, 'texts', f.texts, 'nonHW', f.nonHeartwood.length, 'under14', JSON.stringify(f.under14px.slice(0, 4)), 'missing', JSON.stringify(f.missingGlyphs));
}
chrome.kill(); process.exit(0);
