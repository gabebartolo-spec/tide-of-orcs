// Pixel 8 full capture + measurement (TB-218 r10; r9 plus: canvas text hook fixed, tree opening camera, tap-target hit tests, live horde, real fall, scroll reachability, portrait 412/360/320, both rotations). One script, every view at 412, 360 and 320 css px high, plus the portrait states.
//   node tools/mobile-r9.mjs <debug port> <out dir>      (dev server on TIDE_URL, default http://127.0.0.1:5481/)
// Writes <out>/<W>x<H>-<view>.png and <out>/measure.json. Safe-area insets are emulated (left 34, bottom 20) for every size and again after a rotate.
// Measures: small touch targets, DOM text under 14 css px (zoom included: the rendered glyph box, not the computed size), canvas text under 14 css px
// (fillText hook), clipped content, element overlap with the viewport edge, canvas aspect and backing store.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9371', outDir = 'previews/tb-218-mobile/r10'] = process.argv;
mkdirSync(outDir, { recursive: true });
const URL_ = process.env.TIDE_URL ?? 'http://127.0.0.1:5481/';
let INSET = { left: 34, bottom: 20, right: 0, top: 0 };
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-r10-${port}-${Date.now()}`,
  '--headless=new', '--window-size=915,412', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval'); return r.result.result.value; };
const shot = async (name) => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
const touch = (type, pts) => cdp('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id ?? 1 })) });
const dev = async (W, H) => { await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2.625, mobile: true, screenWidth: W, screenHeight: H }); await cdp('Emulation.setSafeAreaInsetsOverride', { insets: INSET }); };
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); await cdp('Page.enable');
// canvas text hook: smallest css-px size drawn per canvas
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const P = CanvasRenderingContext2D.prototype, f = P.fillText; window.__ct = {}; window.__tl = [];
  window.__ctReset = () => { window.__ct = {}; window.__tl = []; };
  P.fillText = function (t, x, y, m) { try { const c = this.canvas; if (c.clientWidth > 4 && c.width > 4) { const tr = this.getTransform(), css = c.clientWidth / c.width, s = Math.sqrt(Math.abs(tr.a * tr.d - tr.b * tr.c)) * css, px = parseFloat(this.font) * s, k = c.id || 'anon';
    const o = (window.__ct[k] ||= { min: 1e9, text: '', n: 0 }); o.n++; if (px < o.min) { o.min = px; o.text = String(t).slice(0, 18); }
    if (k === 'tree' && window.__tl.length < 600) { const w = this.measureText(String(t)).width * s, al = this.textAlign, X = (tr.a * x + tr.c * y + tr.e) * css, Y = (tr.b * x + tr.d * y + tr.f) * css; const x0 = al === 'center' ? X - w / 2 : al === 'right' || al === 'end' ? X - w : X; window.__tl.push({ t: String(t).slice(0, 14), x0: +x0.toFixed(1), x1: +(x0 + w).toFixed(1), y0: +(Y - px * 0.8).toFixed(1), y1: +(Y + px * 0.25).toFixed(1), px: +px.toFixed(1) }); } } } catch {} return f.call(this, t, x, y, m); }; })()` });

const R = (s) => `(() => { const e = document.querySelector(${JSON.stringify(s)}); if (!e) return null; const r = e.getBoundingClientRect(); return { l: +r.left.toFixed(1), t: +r.top.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), sh: e.scrollHeight, ch: e.clientHeight }; })()`;
const MEASURE = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let n = e; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || n.hidden || +cs.opacity === 0) return false; } return true; };
  const name = (e) => (e.id ? '#' + e.id : (e.className && e.className.toString ? '.' + e.className.toString().split(' ')[0] : e.tagName)).slice(0, 32);
  const small = [], smallT = [], text = [], clip = [], off = [];
  for (const e of document.querySelectorAll('button, select, input:not([type=hidden]), textarea, [role=tab], .item, [role=button], canvas#tree')) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue;
    if (e.id === 'tree' || e.id === 'game') continue;
    if (r.height < 47.5 || r.width < 47.5) small.push({ n: name(e), w: Math.round(r.width), h: Math.round(r.height) });
    if (r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5 || r.left < -0.5) off.push({ n: name(e), r: Math.round(r.right), b: Math.round(r.bottom) });
  }
  // text: the rendered glyph size. A Range over the text node gives the line box; zoom is the ratio of that box to the computed line height.
  const seen = new Set(), walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t; (t = walker.nextNode());) {
    if (!t.nodeValue.trim()) continue; const e = t.parentElement; if (seen.has(e) || !vis(e)) continue; seen.add(e);
    const r = e.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= innerHeight) continue;
    let z = 1; for (let n = e; n; n = n.parentElement) { const zz = parseFloat(getComputedStyle(n).zoom || 1); if (zz && zz !== 1) z *= zz; }
    const fs = parseFloat(getComputedStyle(e).fontSize) * z; if (fs < 13.99) text.push({ n: name(e), fs: +fs.toFixed(1), t: e.textContent.trim().slice(0, 18) });
  }
  // clipped content: a scroll container's own overflow is fine (flag it separately); an overflow:hidden/visible box whose content is taller than it is a clip
  for (const e of document.querySelectorAll('.panel, .tab, #fallen, #fallen-board, #fallen h2, .report, #sat-detail, #sat-grid, #detail, .treewrap, .campwrap, .prestige, .col, header, .hud')) {
    if (!vis(e)) continue; const cs = getComputedStyle(e);
    if (e.scrollHeight > e.clientHeight + 1) clip.push({ n: name(e), sh: e.scrollHeight, ch: e.clientHeight, oy: cs.overflowY });
  }
  // clipped by an ancestor: an element whose box leaves a non-scrolling overflow box (scroll:false is a real clip; scroll:true is reachable by panning)
  const anc = [];
  for (const e of document.querySelectorAll('button, .item, .camptag, .stat, .buy, input, select, label, dt, dd, h2, h3, .name, .desc, li, p, .hud-gem')) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect();
    for (let n = e.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n); if (cs.overflowY === 'visible' && cs.overflowX === 'visible') continue; const q = n.getBoundingClientRect();
      const dy = Math.max(r.bottom - q.bottom, q.top - r.top), dx = Math.max(r.right - q.right, q.left - r.left);
      if (dy > 1.5 || dx > 1.5) anc.push({ n: name(e), by: name(n), scroll: /auto|scroll/.test(cs.overflowY + ' ' + cs.overflowX), dy: Math.round(dy), dx: Math.round(dx), el: e });
    }
  }
  // reachable by scrolling: scroll only the nearest real scroller (never an overflow:hidden box) so the element is centred, then ask again; restore after
  const inside = (e) => { const r = e.getBoundingClientRect(); for (let n = e.parentElement; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.overflowY === 'visible' && cs.overflowX === 'visible') continue; const q = n.getBoundingClientRect(); if (Math.max(r.bottom - q.bottom, q.top - r.top) > 1.5 || Math.max(r.right - q.right, q.left - r.left) > 1.5) return false; } return true; };
  const reach = new Map();
  for (const a of anc) { if (reach.has(a.el)) { a.reach = reach.get(a.el); continue; } let sc = a.el.parentElement; while (sc && !(/auto|scroll/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight + 1)) sc = sc.parentElement;
    let ok = false; if (sc) { const keep = sc.scrollTop, r = a.el.getBoundingClientRect(), q = sc.getBoundingClientRect(); sc.scrollTop += (r.top + r.height / 2) - (q.top + q.height / 2); ok = inside(a.el); sc.scrollTop = keep; }
    reach.set(a.el, ok); a.reach = ok; }
  const clipReal = anc.filter((a) => !a.reach).map(({ el, ...o }) => o);
  const tapEls = [...document.querySelectorAll('button, select, input:not([type=hidden]), [role=tab], #sat-grid .item, #sat-worn .item')].filter((e) => vis(e) && !(e.closest('[hidden]'))).map((e) => ({ e, r: e.getBoundingClientRect() })).filter((o) => o.r.bottom > 0 && o.r.top < innerHeight && o.r.right > 0 && o.r.left < innerWidth);
  const gaps = [];
  for (let i = 0; i < tapEls.length; i++) for (let j = i + 1; j < tapEls.length; j++) { const A = tapEls[i], B = tapEls[j]; if (A.e.contains(B.e) || B.e.contains(A.e)) continue;
    const gx = Math.max(B.r.left - A.r.right, A.r.left - B.r.right), gy = Math.max(B.r.top - A.r.bottom, A.r.top - B.r.bottom), gap = Math.max(gx, gy);
    if ((gx < 0 && gy < 0) || gap < 7.5) gaps.push({ a: name(A.e), b: name(B.e), gap: Math.round(Math.max(gx, gy) * 10) / 10, ov: gx < 0 && gy < 0 }); }
  const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;visibility:hidden;padding-left:env(safe-area-inset-left);padding-bottom:env(safe-area-inset-bottom)'; document.body.appendChild(probe); const safeL = parseFloat(getComputedStyle(probe).paddingLeft) + 'px/' + parseFloat(getComputedStyle(probe).paddingBottom) + 'px'; probe.remove();
  const canv = [...document.querySelectorAll('canvas')].filter(vis).map((c) => { const r = c.getBoundingClientRect(); return { id: c.id, l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), ar: +(r.width / r.height).toFixed(3), bw: c.width, bh: c.height, bar: +(c.width / c.height).toFixed(3) }; });
  return { inner: [innerWidth, innerHeight], clipReal: clipReal.slice(0, 30), clipRealN: clipReal.length, clipReachable: anc.length - clipReal.length, tapGaps: gaps.length, tapGapSample: gaps.slice(0, 8), tapOverlap: gaps.filter((g) => g.ov).length, dpr: devicePixelRatio, small, smallT, off, text, clip, canv, canvText: window.__ct, treeLabels: (() => { const t = document.getElementById('tree'); if (!t || !t.clientWidth) return null; const W = t.clientWidth, H = t.clientHeight, L = window.__tl || []; const bad = L.filter((o) => o.x0 < 5.5 || o.x1 > W - 5.5 || o.y1 > H - 5.5); return { n: L.length, minPx: L.length ? Math.min(...L.map((o) => o.px)) : null, outside: bad.length, worstMargin: L.length ? Math.round(Math.min(...L.map((o) => Math.min(o.x0, W - o.x1, H - o.y1))) * 10) / 10 : null, bad: bad.slice(0, 5) }; })(), plate: (() => { const p = document.querySelector('.plate'); return p && !p.hidden ? 'OPEN' : null; })() };
})()`;

const SEED = `(async () => { const lr = await import('/src/sim/lootRoll.ts'); const { game, panel } = window.__tide; const s = game.state, l = s.meta.loot; let n = l.items.length;
  for (let i = 0; i < 2000 && n < 24; i++) { const it = lr.rollDrop(s.lootRng, l, i % 2 ? 'brute' : 'grunt', 30, 1, s.stats); if (it) { l.items.push(it); n++; } }
  s.meta.heartwood = 50; s.meta.camp.levels = { bowyer: 2, forge: 1, kitchen: 3, training: 0 }; s.meta.camp.mats = { sinew: 14, iron: 6, meat: 9, hide: 22 }; panel.camp.render(); panel.update(); })()`;
const fresh = async () => { await cdp('Page.navigate', { url: 'about:blank' }); await sleep(400); await cdp('Storage.clearDataForOrigin', { origin: new URL(URL_).origin, storageTypes: 'all' }); };
const ready = async () => { for (let i = 0; i < 80; i++) { if (await ev('!!window.__tide')) return; await sleep(250); } throw new Error('no __tide: ' + await ev('location.href + " " + document.readyState')); };
const NOSAVE = `(() => { try { localStorage.setItem('tide.fullscreen', 'off'); } catch {} })()`;
const measure = async () => { await ev('window.__ctReset()'); await sleep(450); return ev(MEASURE); };
const load = async () => { for (let t = 0; t < 4; t++) { await fresh(); await sleep(600); await cdp('Page.navigate', { url: URL_ }); await ready(); await sleep(2500); const st = await ev('(() => { const r = window.__tide.game.state.run; return r.fallen || r.wave > 1; })()'); if (!st) break; } await ev(NOSAVE); };
const SCENE = `(async () => { const { game, panel } = window.__tide; const s = game.state; const st = await import('/src/sim/step.ts'), vg = await import('/src/sim/vanguard.ts');
  s.run.wave = 25; s.run.starlight = 5000; for (let i = 0; i < 16; i++) st.spawnOrc(s, i % 4 === 0 ? 'brute' : 'grunt'); vg.placeVanguard(s, 'spear', true); vg.placeVanguard(s, 'blade', true); vg.placeVanguard(s, 'spear', true); s.run.barHp = s.stats.barMax * 0.3; panel.update(); })()`;
const BOX = (s) => `(() => { const e = document.querySelector(${JSON.stringify(s)}); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }; })()`;

const M = {};
for (const H of [412, 360, 320]) {
  const W = 915, k = `${W}x${H}`; const o = (M[k] = {});
  INSET = { left: 34, bottom: 20, right: 0, top: 0 }; await dev(W, H); await load();
  o.fresh = await ev(`(() => { const r = window.__tide.game.state.run; return { fallen: r.fallen, wave: r.wave, barHp: r.barHp }; })()`);
  if (o.fresh.fallen || o.fresh.wave > 1) throw new Error('contaminated save at ' + k);
  await shot(`${k}-run`); o.run = await measure();
  await sleep(4000); await shot(`${k}-run-settled`);
  // live scene: horde, vanguard, boss button, strike circle under a finger, low wall
  await ev(SCENE); await sleep(1800);
  const fc = await ev(`(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left + r.width * 0.62, y: r.top + r.height * 0.5 }; })()`);
  await touch('touchStart', [fc]); await sleep(700); await touch('touchMove', [{ x: fc.x + 12, y: fc.y + 6 }]); await sleep(500);
  await shot(`${k}-run-live`); o.runLive = await measure();
  o.runLive.scene = await ev(`(() => { const s = window.__tide.game.state; const b = document.getElementById('dep-boss'); const w = document.getElementById('hud-wall'); const h = document.querySelector('header').getBoundingClientRect(); return { orcs: s.orcs.count, vans: s.vans?.count ?? null, wave: s.run.wave, bossShown: !b.hidden, boss: ${BOX('#dep-boss')}, hudBottom: Math.round(h.bottom), tone: w.dataset.tone, crack: w.dataset.crack, innerH: innerHeight }; })()`);
  await touch('touchEnd', []);
  await ev(`(() => { const s = window.__tide.game.state; s.run.barHp = s.stats.barMax * 0.12; window.__tide.panel.update(); })()`); await sleep(700); await shot(`${k}-run-lowwall`);
  o.lowWall = await ev(`(() => ({ tone: document.getElementById('hud-wall').dataset.tone, crack: document.getElementById('hud-wall').dataset.crack, text: document.getElementById('hud-wall-t').textContent, wall: ${BOX('#hud-wall')}, wave: ${BOX('#hud-wave')} }))()`);
  await ev(SEED); await sleep(300);
  await ev(`window.__tide.panel.setMode('camp')`);
  const view = async (name, setup, extra) => { await ev(setup); await sleep(900); const m = await measure(); if (extra) Object.assign(m, await extra()); o[name] = m; await shot(`${k}-${name}`); return m; };
  await view('camp', `window.__tide.panel.setTab('camp')`, async () => ({ tags: await ev(`(() => { const tags = [...document.querySelectorAll('.camptag')].map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim(), l: Math.round(r.left), tp: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }; });
      const gaps = []; for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) { const A = tags[i], B = tags[j]; gaps.push({ a: A.t, b: B.t, gap: Math.max(B.l - A.r, A.l - B.r, B.tp - A.b, A.tp - B.b) }); }
      return { tags, minTagGap: gaps.length ? Math.min(...gaps.map((g) => g.gap)) : null }; })()`), campwrap: await ev(R('.campwrap')) }));
  await view('grove', `window.__tide.panel.setTab('grove')`, async () => ({ tree: await ev(R('.treewrap')), detail: await ev(R('#detail')), tabs: await ev(R('.tabs')),
    nodes: await ev(`(async () => { const { tree } = window.__tide; const { NODES, TREE_VIEW } = await import('/src/data/skillTree.ts'); const cam = tree.cam, ui = tree.ui, r = tree.canvas.getBoundingClientRect(); const rad = TREE_VIEW.nodeRTouch;
      const disc = 2 * rad * cam.z * ui, legendCss = TREE_VIEW.legendH * ui; let under = 0, cut = 0, vis = 0;
      for (const n of NODES) { const sx = (n.x - cam.x) * cam.z * ui, sy = (n.y - cam.y) * cam.z * ui, e = rad * cam.z * ui; if (sx + e < 0 || sx - e > r.width || sy + e < 0 || sy - e > r.height) continue; vis++; if (sy - e < legendCss && sy + e > 0) under++; if (sx - e < 0 || sx + e > r.width || sy + e > r.height) cut++; }
      let probe = null, best = null, bd = 1e9; const mid = { x: r.width / 2, y: (r.height + legendCss) / 2 };
      for (const n of NODES) { const sx = (n.x - cam.x) * cam.z * ui, sy = (n.y - cam.y) * cam.z * ui; if (sx < 30 || sx > r.width - 30 || sy < legendCss + 30 || sy > r.height - 30) continue; const d = Math.hypot(sx - mid.x, sy - mid.y); if (d < bd && n.id !== 'root') { bd = d; best = { n, sx, sy }; } }
      if (best) probe = { id: best.n.id, hit: [[22, 0], [-22, 0], [0, 22], [0, -22]].map(([dx, dy]) => tree.hitTest(r.left + best.sx + dx, r.top + best.sy + dy) === best.n.id) };
      return { z: +cam.z.toFixed(3), ui, discCssDiameter: +disc.toFixed(1), visible: vis, nodesUnderLegend: under, nodesCutByEdge: cut, probe }; })()`) }));
  await ev(`window.__tide.panel.setTreeFull(true)`); await sleep(900);
  const tc = await ev(`(() => { const r = document.getElementById('tree').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await touch('touchStart', [tc]); await touch('touchEnd', []); await sleep(500);
  o['tree-zoomed'] = await measure(); await shot(`${k}-tree-zoomed`);
  await ev(`window.__tide.panel.setTreeFull(false)`); await sleep(500);
  const wornY0 = (await view('satchel', `window.__tide.panel.setTab('satchel'); window.__tide.panel.update()`, async () => ({ pane: await ev(R('#pane-satchel')), grid: await ev(R('#sat-grid')), detail: await ev(R('#sat-detail')), worn: await ev(R('#sat-worn')),
    cells: await ev(`document.querySelectorAll('#sat-grid .item').length`), cols: await ev(`getComputedStyle(document.getElementById('sat-grid')).gridTemplateColumns.split(' ').length`), gap: await ev(`getComputedStyle(document.getElementById('sat-grid')).gap`),
    wornPad: await ev(`(() => { const w = document.querySelector('#sat-worn'), wr = w.getBoundingClientRect(); const kids = [...w.querySelectorAll('.item')].map((i) => i.getBoundingClientRect()); return { top: +(Math.min(...kids.map((r) => r.top)) - wr.top).toFixed(1), bottom: +(wr.bottom - Math.max(...kids.map((r) => r.bottom))).toFixed(1), left: +(Math.min(...kids.map((r) => r.left)) - wr.left).toFixed(1), right: +(wr.right - Math.max(...kids.map((r) => r.right))).toFixed(1) }; })()`),
    gridScroll: await ev(`(() => { const g = document.getElementById('sat-grid'); return { sh: g.scrollHeight, ch: g.clientHeight }; })()`) }))).worn?.t;
  const c = await ev(`(() => { const e = document.querySelector('#sat-grid .item[data-uid]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (c) { await touch('touchStart', [c]); await touch('touchEnd', []); await sleep(600); }
  const sp = await measure(); sp.acts = await ev(`[...document.querySelectorAll('#sat-detail [data-act]')].map((e) => { const r = e.getBoundingClientRect(); return { a: e.dataset.act, l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; })`);
  sp.detail = await ev(R('#sat-detail')); sp.pane = await ev(R('#pane-satchel')); sp.worn = await ev(R('#sat-worn')); sp.wornShift = wornY0 != null && sp.worn ? +(sp.worn.t - wornY0).toFixed(1) : null; o['satchel-picked'] = sp; await shot(`${k}-satchel-picked`);
  const scrolled = async (name, tab, sel, extra) => {
    await view(name, `window.__tide.panel.setTab('${tab}')`, extra);
    o[name].scroll = await ev(`(() => { const e = document.querySelector('${sel}'); return { sh: e.scrollHeight, ch: e.clientHeight, oy: getComputedStyle(e).overflowY }; })()`);
    await ev(`(() => { const e = document.querySelector('${sel}'); e.scrollTop = e.scrollHeight; })()`); await sleep(400);
    const m = await measure(); m.atEnd = await ev(`(() => { const e = document.querySelector('${sel}'); const last = [...e.querySelectorAll('button, select, input, textarea')].filter((x) => x.getBoundingClientRect().height > 0).pop(); const r = last?.getBoundingClientRect(), q = e.getBoundingClientRect(); return { lastBottom: r ? Math.round(r.bottom) : null, paneBottom: Math.round(q.bottom), inner: innerHeight, top: e.scrollTop }; })()`);
    o[name + '-end'] = m; await shot(`${k}-${name}-end`); await ev(`(() => { document.querySelector('${sel}').scrollTop = 0; })()`); };
  await scrolled('replant', 'prestige', '#pane-prestige', async () => ({ pane: await ev(R('#pane-prestige')) }));
  await scrolled('settings', 'settings', '#pane-settings', async () => ({ pane: await ev(R('#pane-settings')), thumb: await ev(R('#set-vol')) }));
  await view('settingsOverlay', `window.__tide.panel.setMode('run'); window.__tide.panel.setMode('settings'); window.__tide.panel.setTab('settings')`, async () => ({ panel: await ev(R('.panel')), pane: await ev(R('#pane-settings')), back: await ev(R('#camp-close')) }));
  // fallen: a real fall (the sim itself flips run.fallen)
  await ev(`window.__tide.panel.setMode('run')`); await sleep(300);
  await ev(`(async () => { const { game } = window.__tide; const b = await import('/src/sim/barricade.ts'); const s = game.state; for (let i = 0; i < 80 && !s.run.fallen; i++) b.barricadeHit(s, game.events, 1e12, 300); })()`); await sleep(3500);
  const fm = await measure();
  fm.real = await ev(`(() => { const r = window.__tide.game.state.run; return { fallen: r.fallen, barHp: r.barHp, wallTxt: document.getElementById('hud-wall-t').textContent, tone: document.getElementById('hud-wall').dataset.tone, boardShown: !document.getElementById('fallen').hidden }; })()`);
  fm.board = await ev(R('#fallen-board')); fm.btn = await ev(R('#fallen-btn')); fm.hud = await ev(R('header'));
  fm.btnText = await ev(`(() => { const b = document.getElementById('fallen-btn'), r = b.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(b); const q = rg.getBoundingClientRect(); return { leftSpace: Math.round(q.left - r.left), rightSpace: Math.round(r.right - q.right), bottom: Math.round(r.bottom), inner: innerHeight }; })()`);
  o.fallen = fm; await shot(`${k}-fallen`);
  if (H !== 412) {
    INSET = { left: 0, bottom: 20, right: 34, top: 8 }; await dev(W, H); await load(); o.opp = {};
    await shot(`${k}-opp-run`); o.opp.run = await measure();
    await ev(SEED); await ev(`window.__tide.panel.setMode('camp')`); await sleep(300);
    for (const t of ['grove', 'satchel', 'camp']) { await ev(`window.__tide.panel.setTab('${t}')`); await sleep(900); o.opp[t] = await measure(); await shot(`${k}-opp-${t}`); }
    INSET = { left: 34, bottom: 20, right: 0, top: 0 };
  }
}
for (const [pw, ph, ins] of [[412, 915, { top: 0, left: 0, right: 0, bottom: 0 }], [360, 800, { top: 28, left: 0, right: 0, bottom: 16 }], [320, 700, { top: 24, left: 0, right: 0, bottom: 0 }]]) {
  const o = (M[`${pw}x${ph}`] = {}); INSET = ins;
  await dev(pw, ph); await fresh(); await cdp('Page.navigate', { url: URL_ }); await ready(); await sleep(3500);
  const st = `(() => { const t = document.getElementById('turn'), m = document.getElementById('turn-msg'); const r = t.getBoundingClientRect(), p = m.getBoundingClientRect(), cs = getComputedStyle(t);
    const rg = document.createRange(); rg.selectNodeContents(m); const tops = new Set([...rg.getClientRects()].map((q) => Math.round(q.top))); const g = window.__tide.game.state;
    return { shown: cs.display !== 'none' && r.width > 0, box: [Math.round(r.width), Math.round(r.height)], msg: { l: Math.round(p.left), r: Math.round(p.right), t: Math.round(p.top), b: Math.round(p.bottom) }, msgLines: tops.size, msgPx: parseFloat(getComputedStyle(m).fontSize), inView: p.top >= 0 && p.bottom <= innerHeight && p.left >= 0 && p.right <= innerWidth, padL: cs.paddingLeft, padT: cs.paddingTop, inner: [innerWidth, innerHeight], runTime: +g.run.runTime.toFixed(2), wave: g.run.wave, fallen: g.run.fallen, barHp: g.run.barHp, orcs: g.orcs.count }; })()`;
  o.prompt0 = await ev(st); await shot(`${pw}x${ph}-portrait-prompt`); await sleep(2000); o.prompt1 = await ev(st);
  if (pw === 412) {
    INSET = { left: 34, bottom: 20, right: 0, top: 0 };
    await dev(915, 412); await sleep(2500); o.landscape1 = await ev(st); await shot('915x412-after-rotate');
    await sleep(3000); o.landscape2 = await ev(st); await shot('915x412-run-settled-after-rotate');
    INSET = { left: 0, bottom: 0, right: 0, top: 0 }; await dev(412, 915); await sleep(1500); o.backPortrait0 = await ev(st); await sleep(2000); o.backPortrait1 = await ev(st);
    INSET = { left: 0, bottom: 20, right: 34, top: 8 }; await dev(915, 412); await sleep(2500); o.resumed = await ev(st); await sleep(2500); o.resumed2 = await ev(st); await shot('915x412-resumed-live-opposite');
    o.verdict = { frozenInPortrait: o.prompt0.runTime === o.prompt1.runTime && o.backPortrait0.runTime === o.backPortrait1.runTime, advancedInLandscape: o.landscape2.runTime > o.landscape1.runTime + 1 && o.resumed2.runTime > o.resumed.runTime + 1, notFallen: !o.resumed2.fallen, wavesNotLost: o.resumed2.wave >= o.prompt0.wave };
  }
}
writeFileSync(`${outDir}/measure.json`, JSON.stringify(M, null, 1));
const sum = {}; for (const [k, v] of Object.entries(M)) for (const [n, s] of Object.entries(v)) if (s && s.small) sum[`${k} ${n}`] = `small=${s.small.length} text=${s.text.length} clip=${s.clip.length} clipReal=${s.clipRealN} off=${s.off.length} tapGaps=${s.tapGaps} tapOverlap=${s.tapOverlap}`;
console.log(JSON.stringify(sum, null, 1));
chrome.kill(); process.exit(0);
