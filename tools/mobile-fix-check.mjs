// Pixel 8 flaw check (TB-218 round 2): numeric rects for HUD plates, satchel, Grove, margins, fallen.
//   TIDE_URL=http://127.0.0.1:5271/ node tools/mobile-fix-check.mjs <debug port> [shotDir]
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9351', shotDir] = process.argv;
if (shotDir) mkdirSync(shotDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-fx-${port}-${Date.now()}`,
  '--headless=new', '--window-size=915,412', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval'); return r.result.result.value; };
const shot = async (name) => { if (!shotDir) return; const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${shotDir}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); await cdp('Page.enable');
const R = (s) => `(() => { const e = document.querySelector(${JSON.stringify(s)}); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; })()`;
const out = {};
const EDGES = `(() => { const bad = []; for (const e of document.querySelectorAll('button, select, input, .item, [role=tab]')) { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || e.offsetParent === null) continue; const l = r.left, rr = innerWidth - r.right; if (l < 33.5 || rr < 33.5) bad.push({ n: (e.id || e.className || e.tagName).toString().slice(0, 24), l: Math.round(l), r: Math.round(rr) }); } return bad; })()`;
const GRID = `(() => { const g = document.getElementById('sat-grid'), gr = g.getBoundingClientRect(); const its = [...g.querySelectorAll('.item')]; const full = its.filter((i) => { const r = i.getBoundingClientRect(); return r.top >= gr.top - 0.5 && r.bottom <= gr.bottom + 0.5 && r.left >= gr.left && r.right <= gr.right; }); const f = document.getElementById('sat-filter'); const c = document.createElement('canvas').getContext('2d'); const cs = getComputedStyle(f); c.font = cs.font; const tw = c.measureText(f.selectedOptions[0].text).width; const fw = f.getBoundingClientRect().width; const d = document.getElementById('sat-detail').getBoundingClientRect(); return { gridH: Math.round(gr.height), items: its.length, fullyVisible: full.length, filter: { w: Math.round(fw), textW: Math.round(tw), label: f.selectedOptions[0].text, fits: tw + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 8 <= fw }, detail: { t: Math.round(d.top), b: Math.round(d.bottom), h: Math.round(d.height) } }; })()`;
for (const [W, H] of [[915, 412], [915, 360]]) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2.625, mobile: true, screenWidth: W, screenHeight: H });
  await cdp('Emulation.setSafeAreaInsetsOverride', { insets: { left: 34, bottom: 20 } });
  await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://127.0.0.1:5271/' }); await sleep(3500);
  const k = `${W}x${H}`; const o = (out[k] = {});
  await ev(`(async () => { const lr = await import('/src/sim/lootRoll.ts'); const { game, panel } = window.__tide; const s = game.state; const l = s.meta.loot; let n = 0;
    for (let i = 0; i < 600 && n < 30; i++) { const it = lr.rollDrop(s.lootRng, l, i % 2 ? 'brute' : 'grunt', 30, 1, s.stats); if (it) { l.items.push(it); n++; } }
    s.meta.heartwood = 1234; s.run.wave = 128; panel.update(); })()`);
  await sleep(400);
  o.hud = await ev(`[...document.querySelectorAll('header .stat, .hud-wave')].map((p) => { const pr = p.getBoundingClientRect(); const kids = [...p.children].filter((c) => !c.hidden && getComputedStyle(c).display !== 'none' && !c.classList.contains('stamp')); const l = Math.min(...kids.map((c) => c.getBoundingClientRect().left)), r = Math.max(...kids.map((c) => c.getBoundingClientRect().right)); return { id: p.id || p.className, plate: [Math.round(pr.left), Math.round(pr.right)], text: [Math.round(l), Math.round(r)], ok: l >= pr.left && r <= pr.right }; })`);
  o.header = { hud: await ev(R('#hud')), header: await ev(R('header')), hudRight: await ev(`Math.round(Math.max(...[...document.querySelectorAll('#hud > *, #hud .stats > *')].map((e) => e.getBoundingClientRect().right)))`), settings: await ev(R('#btn-settings')) };
  await shot(`${k}-run`);
  await ev(`window.__tide.panel.setMode('camp')`); await sleep(500);
  for (const tab of ['grove', 'satchel', 'camp', 'prestige', 'settings']) { await ev(`window.__tide.panel.setTab('${tab}')`); await sleep(600); o['edge_' + tab] = await ev(EDGES); }
  await ev(`window.__tide.panel.setTab('satchel')`); await sleep(500);
  o.satNone = await ev(GRID);
  const c = await ev(`(() => { const e = document.querySelector('#sat-grid .item[data-uid]'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y, id: 1 }] }); await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(500);
  o.satPicked = await ev(GRID);
  o.satBtns = await ev(`[...document.querySelectorAll('#sat-detail [data-act]')].map((e) => { const r = e.getBoundingClientRect(); return { a: e.dataset.act, t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height), limit: innerHeight - 20 }; })`);
  await shot(`${k}-satchel`);
  await ev(`window.__tide.panel.setTab('grove')`); await sleep(600);
  o.grove = { btn: await ev(R('#tree-full')), tree: await ev(R('.treewrap')) };
  await shot(`${k}-grove`);
  await ev(`document.getElementById('tree-full').click()`); await sleep(900);
  o.treeFull = { pane: await ev(R('#pane-grove')), btn: await ev(R('#tree-full')), tree: await ev(R('.treewrap')), detail: await ev(R('#detail')), buy: await ev(R('#buy-btn')), z: await ev(`window.__tide.tree.cam.z`), edges: await ev(EDGES) };
  await shot(`${k}-treefull`);
  await ev(`window.__tide.panel.setTreeFull(false)`);
  await ev(`(() => { const { game, panel } = window.__tide; panel.setMode('run'); game.state.run.fallen = true; panel.showFallen(); })()`); await sleep(3500);
  o.fallen = { board: await ev(R('#fallen-board')), hw: await ev(R('#fallen-hw')), btn: await ev(R('#fallen-btn')), hud: await ev(R('#hud')), hdr: await ev(R('header')), seal: await ev(`getComputedStyle(document.getElementById('fallen-seal')).display`), inner: [W, H] };
  await shot(`${k}-fallen`);
}
console.log(JSON.stringify(out)); chrome.kill(); process.exit(0);
