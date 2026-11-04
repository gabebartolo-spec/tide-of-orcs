// Pixel 8 full capture + measurement (TB-218 r9). One script, every view at 412, 360 and 320 css px high, plus the portrait states.
//   node tools/mobile-r9.mjs <debug port> <out dir>      (dev server on TIDE_URL, default http://127.0.0.1:5481/)
// Writes <out>/<W>x<H>-<view>.png and <out>/measure.json. Safe-area insets are emulated (left 34, bottom 20) for every size and again after a rotate.
// Measures: small touch targets, DOM text under 14 css px (zoom included: the rendered glyph box, not the computed size), canvas text under 14 css px
// (fillText hook), clipped content, element overlap with the viewport edge, canvas aspect and backing store.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9371', outDir = 'previews/tb-218-mobile/r9'] = process.argv;
mkdirSync(outDir, { recursive: true });
const URL_ = process.env.TIDE_URL ?? 'http://127.0.0.1:5481/';
const INSET = { left: 34, bottom: 20 };
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-r9-${port}-${Date.now()}`,
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
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const P = CanvasRenderingContext2D.prototype, f = P.fillText; window.__ct = {};
  P.fillText = function (t, x, y, m) { try { const c = this.canvas, tr = this.getTransform(), s = Math.sqrt(Math.abs(tr.a * tr.d - tr.b * tr.c)) * (c.clientWidth / c.width || 1), px = parseFloat(this.font) * s, k = c.id || 'anon';
    const o = (window.__ct[k] ||= { min: 1e9, text: '', n: 0 }); o.n++; if (px < o.min) { o.min = px; o.text = String(t).slice(0, 18); } } catch {} return f.call(this, t, x, y, m); }; })()` });

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
      if (dy > 1.5 || dx > 1.5) anc.push({ n: name(e), by: name(n), scroll: /auto|scroll/.test(cs.overflowY + ' ' + cs.overflowX), dy: Math.round(dy), dx: Math.round(dx) });
    }
  }
  const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;visibility:hidden;padding-left:env(safe-area-inset-left);padding-bottom:env(safe-area-inset-bottom)'; document.body.appendChild(probe); const safeL = parseFloat(getComputedStyle(probe).paddingLeft) + 'px/' + parseFloat(getComputedStyle(probe).paddingBottom) + 'px'; probe.remove();
  const canv = [...document.querySelectorAll('canvas')].filter(vis).map((c) => { const r = c.getBoundingClientRect(); return { id: c.id, l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), ar: +(r.width / r.height).toFixed(3), bw: c.width, bh: c.height, bar: +(c.width / c.height).toFixed(3) }; });
  return { inner: [innerWidth, innerHeight], clipReal: anc.filter((a) => !a.scroll).slice(0, 30), clipScroll: anc.filter((a) => a.scroll).length, small, smallT, off, text, clip, canv, canvText: window.__ct, plate: (() => { const p = document.querySelector('.plate'); return p && !p.hidden ? 'OPEN' : null; })() };
})()`;

const SEED = `(async () => { const lr = await import('/src/sim/lootRoll.ts'); const { game, panel } = window.__tide; const s = game.state, l = s.meta.loot; let n = 0;
  for (let i = 0; i < 800 && n < 30; i++) { const it = lr.rollDrop(s.lootRng, l, i % 2 ? 'brute' : 'grunt', 30, 1, s.stats); if (it) { l.items.push(it); n++; } }
  s.meta.heartwood = 50; s.meta.camp.levels = { bowyer: 2, forge: 1, kitchen: 3, training: 0 }; s.meta.camp.mats = { sinew: 14, iron: 6, meat: 9, hide: 22 }; panel.camp.render(); panel.update(); })()`;
const fresh = async () => { await cdp('Page.navigate', { url: 'about:blank' }); await sleep(400); await cdp('Storage.clearDataForOrigin', { origin: new URL(URL_).origin, storageTypes: 'all' }); };
const ready = async () => { for (let i = 0; i < 80; i++) { if (await ev('!!window.__tide')) return; await sleep(250); } throw new Error('no __tide: ' + await ev('location.href + " " + document.readyState + " " + document.title')); };
const NOSAVE = `(() => { try { localStorage.setItem('tide.fullscreen', 'off'); } catch {} })()`;

const M = {};
for (const H of [412, 360, 320]) {
  const W = 915, k = `${W}x${H}`; const o = (M[k] = {});
  await dev(W, H); for (let t = 0; t < 4; t++) { await fresh(); await sleep(600); await cdp('Storage.clearDataForOrigin', { origin: new URL(URL_).origin, storageTypes: 'all' }); await cdp('Page.navigate', { url: URL_ }); await ready(); await sleep(2500); const st = await ev('(() => { const r = window.__tide.game.state.run; return r.fallen || r.wave > 1; })()'); if (!st) break; }
  await ev(NOSAVE);
  o.fresh = await ev(`(() => { const r = window.__tide.game.state.run; return { fallen: r.fallen, wave: r.wave, barHp: r.barHp, saved: localStorage.length }; })()`); if (o.fresh.fallen || o.fresh.wave > 1) throw new Error('contaminated save at ' + k + ' ' + JSON.stringify(o.fresh));
  // run: first frame after load must already show the field (no blank pre-render): sample the canvas right after the page reports ready
  o.runFirst = await ev(`(() => { const c = document.getElementById('game'), g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; const seen = new Set(); for (let i = 0; i < d.length; i += 4 * 997) seen.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4)); return { distinctColours: seen.size }; })()`);
  await shot(`${k}-run`); o.run = await ev(MEASURE);
  await sleep(5000); o.runSettled = await ev(`(() => { const s = window.__tide.game.state; return { wave: s.run.wave, orcs: s.orcs?.length ?? null, fallen: s.run.fallen, hudH: document.querySelector('header').getBoundingClientRect().height, hudBottom: Math.round(document.querySelector('#hud').getBoundingClientRect().bottom), wallX: s.wall?.x ?? null, hud: [...document.querySelectorAll('header .stat, .hud-wave, #btn-settings, #hud-wall')].map((e) => { const r = e.getBoundingClientRect(); return { n: e.id || e.className.split(' ')[0], l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; }), mute: (() => { const r = document.getElementById('btn-mute-corner').getBoundingClientRect(); return { l: Math.round(r.left), b: Math.round(r.bottom) }; })() }; })()`);
  await shot(`${k}-run-settled`);
  await ev(SEED); await sleep(300);
  await ev(`window.__tide.panel.setMode('camp')`);
  const view = async (name, setup, extra) => { await ev(setup); await sleep(900); const m = await ev(MEASURE); if (extra) Object.assign(m, await extra()); o[name] = m; await shot(`${k}-${name}`); };
  await view('camp', `window.__tide.panel.setTab('camp')`, async () => ({ tags: await ev(`[...document.querySelectorAll('.camptag')].map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim(), l: Math.round(r.left), tp: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })`), mats: await ev(R('.camplist')), campwrap: await ev(R('.campwrap')) }));
  await view('grove', `window.__tide.panel.setTab('grove')`, async () => ({ tree: await ev(R('.treewrap')), detail: await ev(R('#detail')), tabs: await ev(R('.tabs')) }));
  // tree-zoomed: tap a node on the left edge of the tree and one near the bottom, like a player would; the tooltip must not open on touch
  await ev(`window.__tide.panel.setTreeFull(true)`); await sleep(900);
  const tc = await ev(`(() => { const r = document.getElementById('tree').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await touch('touchStart', [tc]); await touch('touchEnd', []); await sleep(500);
  o['tree-zoomed'] = await ev(MEASURE); await shot(`${k}-tree-zoomed`);
  await ev(`window.__tide.panel.setTreeFull(false)`); await sleep(500);
  // every node's label inside the pane at the four camera extremes
  o.treeEdges = await ev(`(async () => { const { tree } = window.__tide; const { NODES, TREE_CANVAS } = await import('/src/data/skillTree.ts'); const out = []; out.pads = null; const r = tree.canvas.getBoundingClientRect();
    for (const [nx, ny] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const z = tree.cam.z; tree.target = null; tree.cam = { x: nx ? 1e5 : -1e5, y: ny ? 1e5 : -1e5, z }; const { clampCamera, labelPads } = await import(performance.getEntriesByType('resource').map((e) => e.name).filter((n) => n.includes('render/camera.ts')).sort((x, y) => (y.includes('?t=') ? 1 : 0) - (x.includes('?t=') ? 1 : 0))[0]); if (!out.pads) out.pads = labelPads(); tree.cam = clampCamera(tree.cam, tree.vw, tree.vh); tree.stale = true; await new Promise((q) => setTimeout(q, 80));
      const ctx = tree.canvas.getContext('2d'); ctx.font = '14px Heartwood'; let worst = 1e9;
      for (const n of NODES) { const sx = (n.x - tree.cam.x) * tree.cam.z * tree.ui, sy = (n.y - tree.cam.y) * tree.cam.z * tree.ui; if (sy < 0 || sy > r.height || sx < -200 || sx > r.width + 200) continue; const hw = ctx.measureText(n.name).width / 2 * tree.cam.z * tree.ui; if (sx > -50 && sx < r.width + 50) worst = Math.min(worst, nx ? r.width - (sx + hw) : sx - hw); /* only the side the camera is pinned to: the far side is just the pane crossing the tree */ }
      out.push({ corner: [nx, ny], z: +tree.cam.z.toFixed(2), worstLabelMargin: Math.round(worst), labelsBelow: NODES.filter((n) => (n.y - tree.cam.y) * tree.cam.z * tree.ui + 14 + 6 > r.height && (n.y - tree.cam.y) * tree.cam.z * tree.ui < r.height + 2).length }); }
    return { pads: out.pads, edges: out }; })()`);
  await ev(`window.__tide.panel.setTreeFull(false)`);
  // satchel: bag first (nothing picked), then a picked item
  await view('satchel', `window.__tide.panel.setTab('satchel'); window.__tide.panel.update()`, async () => ({ pane: await ev(R('#pane-satchel')), grid: await ev(R('#sat-grid')), detail: await ev(R('#sat-detail')), worn: await ev(R('#sat-worn')), cells: await ev(`document.querySelectorAll('#sat-grid .item').length`), wornKids: await ev(`(()=>{const w=document.querySelector('#sat-worn');const wb=w.getBoundingClientRect().bottom;const deep=[...w.querySelectorAll('*')].map(e=>[e.tagName+'.'+e.className,Math.round(e.getBoundingClientRect().bottom-wb)]).sort((a,b)=>b[1]-a[1]).slice(0,3);const cs=getComputedStyle(w);const last=w.children[5];const gl=last.querySelector('.glyph');const sv=last.querySelector('svg');const R_=e=>{const r=e.getBoundingClientRect();return [Math.round(r.top),Math.round(r.height)]};return {lastItem:R_(last),glyph:R_(gl),svg:R_(sv),itemCS:[getComputedStyle(last).padding,getComputedStyle(last).display],glCS:[getComputedStyle(gl).margin,getComputedStyle(gl).transform],deep,wb:Math.round(wb),sh:w.scrollHeight,ch:w.clientHeight,pad:cs.padding,gap:cs.gap,rows:cs.gridTemplateRows,rem:getComputedStyle(document.documentElement).fontSize,kids:[...w.children].map(k=>{const r=k.getBoundingClientRect();return [k.className,Math.round(r.top),Math.round(r.height)]})}})()`) }));
  const c = await ev(`(() => { const e = document.querySelector('#sat-grid .item[data-uid]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (c) { await touch('touchStart', [c]); await touch('touchEnd', []); await sleep(600); }
  const sp = await ev(MEASURE); sp.acts = await ev(`[...document.querySelectorAll('#sat-detail [data-act]')].map((e) => { const r = e.getBoundingClientRect(); return { a: e.dataset.act, l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; })`); sp.detail = await ev(R('#sat-detail')); sp.pane = await ev(R('#pane-satchel')); o['satchel-picked'] = sp; await shot(`${k}-satchel-picked`);
  await view('replant', `window.__tide.panel.setTab('prestige')`, async () => ({ pane: await ev(R('#pane-prestige')) }));
  await view('settings', `window.__tide.panel.setTab('settings')`, async () => ({ pane: await ev(R('#pane-settings')), thumb: await ev(R('#set-vol')) }));
  // settings overlay (opened from the run view)
  await view('settingsOverlay', `window.__tide.panel.setMode('run'); window.__tide.panel.setMode('settings'); window.__tide.panel.setTab('settings')`, async () => ({ panel: await ev(R('.panel')), pane: await ev(R('#pane-settings')), back: await ev(R('#camp-close')), blob: await ev(`getComputedStyle(document.getElementById('set-blob')).resize`) }));
  // fallen
  await ev(`(() => { const { game, panel } = window.__tide; panel.setMode('run'); game.state.run.fallen = true; panel.showFallen(); })()`); await sleep(3500);
  const fm = await ev(MEASURE); fm.board = await ev(R('#fallen-board')); fm.h2 = await ev(R('#fallen h2')); fm.btn = await ev(R('#fallen-btn')); fm.hud = await ev(R('header')); fm.rows = await ev(`[...document.querySelectorAll('#fallen-rows > div, #fallen-loot, #fallen .hwline')].map((e) => { const r = e.getBoundingClientRect(); return { fs: parseFloat(getComputedStyle(e.querySelector('dt,dd,.k,.big') ?? e).fontSize), h: Math.round(r.height) }; })`); o.fallen = fm; await shot(`${k}-fallen`);
  await ev(`(() => { const { game, panel } = window.__tide; game.state.run.fallen = false; document.getElementById('fallen').hidden = true; })()`);
}
// portrait states + rotate: one page, one load, real rotations, on a LIVE run (fresh save, never fallen)
{
  const o = (M['412x915'] = {});
  await dev(412, 915); await fresh(); await cdp('Page.navigate', { url: URL_ }); await ready(); await sleep(3500);
  const st = `(() => { const t = document.getElementById('turn'), m = document.getElementById('turn-msg'); const r = t.getBoundingClientRect(), p = m.getBoundingClientRect(), cs = getComputedStyle(t);
    const lh = parseFloat(getComputedStyle(m).lineHeight); const g = window.__tide.game.state; const hud = (s) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { l: +q.left.toFixed(1), r: +q.right.toFixed(1), shown: q.width > 0 }; };
    return { rotateOverlay: { shown: cs.display !== 'none' && r.width > 0, w: Math.round(r.width), h: Math.round(r.height) }, msgW: Math.round(p.width), msgH: Math.round(p.height), msgLines: Math.round(p.height / lh), msgInView: p.top >= 0 && p.bottom <= innerHeight,
      runTime: +g.run.runTime.toFixed(2), wave: g.run.wave, fallen: g.run.fallen, barHp: g.run.barHp, kills: g.run.kills, orcs: g.orcs?.length ?? null, wall: hud('#hud-wall'), mute: hud('#btn-mute-corner'), settings: hud('#btn-settings'), muteAria: document.getElementById('btn-mute-corner')?.getAttribute('aria-pressed') ?? null }; })()`;
  o.prompt0 = await ev(st); await shot('412x915-portrait-prompt'); await sleep(2000); o.prompt1 = await ev(st);   // runTime must not move while the prompt shows
  await dev(915, 412); await sleep(300); o.rotate300ms = await ev(st); await sleep(2200); o.landscape1 = await ev(st); await shot('915x412-after-rotate');
  await sleep(3000); o.landscape2 = await ev(st); await shot('915x412-run-settled-after-rotate');
  await dev(412, 915); await sleep(1500); o.backPortrait0 = await ev(st); await sleep(2000); o.backPortrait1 = await ev(st); await shot('412x915-back-to-portrait');
  await dev(915, 412); await sleep(2500); o.resumed = await ev(st); await sleep(2500); o.resumed2 = await ev(st); await shot('915x412-resumed-live');
  o.verdict = { frozenInPortrait: o.prompt0.runTime === o.prompt1.runTime && o.backPortrait0.runTime === o.backPortrait1.runTime, advancedInLandscape: o.landscape2.runTime > o.landscape1.runTime + 1 && o.resumed2.runTime > o.resumed.runTime + 1, notFallen: !o.resumed2.fallen, wavesNotLost: o.resumed2.wave >= o.prompt0.wave };
}
writeFileSync(`${outDir}/measure.json`, JSON.stringify(M, null, 1));
const sum = {}; for (const [k, v] of Object.entries(M)) for (const [n, s] of Object.entries(v)) if (s && s.small) sum[`${k} ${n}`] = `small=${s.small.length} text=${s.text.length} clip=${s.clip.length} off=${s.off.length}${s.plate ? ' PLATE' : ''}`;
console.log(JSON.stringify(sum, null, 1));
chrome.kill(); process.exit(0);
