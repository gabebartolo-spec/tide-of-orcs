// Pixel 8 UI acceptance (TB-218 slice U). Start the dev server (npm run dev -- --port 5232), then:
//   TIDE_URL=http://localhost:5232/ node tools/mobile-ui.mjs <debug port> <out.json> [shotDir]
// Real Chrome, headless, emulated Pixel 8 landscape at 915x412 and 915x360. Audits touch targets, text size, panes, fallen overlay.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9341', out, shotDir] = process.argv;
if (shotDir) mkdirSync(shotDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-ui-${port}-${Date.now()}`,
  '--headless=new', '--window-size=915,412', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval'); return r.result.result.value; };
const shot = async (name) => { if (!shotDir) return; const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${shotDir}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
const touch = (type, pts) => cdp('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id ?? 1 })) });
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await cdp('Page.enable');

const AUDIT = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || n.hidden || +cs.opacity === 0) return false; } return true; };
  const sel = 'button, select, input:not([type=hidden]), textarea, [role=tab], .item, #tree, [role=button]';
  const small = [], text = [];
  for (const e of document.querySelectorAll(sel)) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect(); const n = (e.id || e.className || e.tagName).toString().slice(0, 30);
    const off = r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth;
    if (r.height < 47.5 || r.width < 47.5) small.push({ n, w: Math.round(r.width), h: Math.round(r.height), off });
  }
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t; (t = walker.nextNode());) { if (!t.nodeValue.trim()) continue; const e = t.parentElement; if (seen.has(e) || !vis(e)) continue; seen.add(e); const fs = parseFloat(getComputedStyle(e).fontSize); const r = e.getBoundingClientRect(); if (fs < 13.99 && r.bottom > 0 && r.top < innerHeight) text.push({ n: (e.id || e.className || e.tagName).toString().slice(0, 30), fs: +fs.toFixed(1), t: e.textContent.trim().slice(0, 16) }); }
  return { small, text };
})()`;
const rect = (s) => `(() => { const e = document.querySelector(${JSON.stringify(s)}); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), sh: e.scrollHeight, ch: e.clientHeight }; })()`;

const R = {};
for (const [W, H] of [[915, 412], [915, 360]]) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2.625, mobile: true, screenWidth: W, screenHeight: H });
  await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5232/' }); await sleep(3500);
  await ev(`localStorage.setItem('tide.fullscreen','off')`);
  const k = `${W}x${H}`; const o = (R[k] = {});
  // give the satchel items and starlight so every pane has content
  await ev(`(async () => { const lr = await import('/src/sim/lootRoll.ts'); const { game, panel } = window.__tide; const s = game.state;
    const l = s.meta.loot; let n = 0; for (let i = 0; i < 400 && n < 14; i++) { const it = lr.rollDrop(s.lootRng, l, i % 2 ? 'brute' : 'grunt', 30, 1, s.stats); if (it) { l.items.push(it); n++; } }
    s.meta.heartwood = 50; panel.update(); })()`);
  await sleep(300);
  const scenario = async (name, setup, extra, tapSel) => { await ev(setup); await sleep(700); if (tapSel) { const c = await ev('(() => { const e = document.querySelector(' + JSON.stringify(tapSel) + '); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()'); if (c) { await touch('touchStart', [c]); await touch('touchEnd', []); await sleep(500); } } const a = await ev(AUDIT); o[name] = { smallCount: a.small.length, small: a.small, textCount: a.text.length, text: a.text.slice(0, 8), ...(extra ? await extra() : {}) }; await shot(`${k}-${name}`); };
  await scenario('run', `window.__tide.panel.setMode('run')`);
  await scenario('settingsOverlay', `window.__tide.panel.setMode('settings'); window.__tide.panel.setTab('settings')`, async () => ({ panel: await ev(rect('.panel')), pane: await ev(rect('#pane-settings')) }));
  await ev(`window.__tide.panel.setMode('camp')`);
  await scenario('grove', `window.__tide.panel.setTab('grove')`, async () => ({ pane: await ev(rect('#pane-grove')), tree: await ev(rect('.treewrap')), detail: await ev(rect('#detail')), buy: await ev(rect('#buy-btn')), tabs: await ev(rect('.tabs')), bar: await ev(rect('.campbar')) }));
  await scenario('satchel', `window.__tide.panel.setTab('satchel')`, async () => ({ pane: await ev(rect('#pane-satchel')), detail: await ev(rect('#sat-detail')), grid: await ev(rect('#sat-grid')), acts: await ev(`[...document.querySelectorAll('#sat-detail [data-act]')].map((e) => { const r = e.getBoundingClientRect(); return { a: e.dataset.act, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; })`) }), "#sat-grid .item[data-uid]");
  await scenario('camp', `window.__tide.panel.setTab('camp')`, async () => ({ pane: await ev(rect('#pane-camp')) }));
  await scenario('replant', `window.__tide.panel.setTab('prestige')`, async () => ({ pane: await ev(rect('#pane-prestige')), choose: await ev(`[...document.querySelectorAll('#paths button')].map((e) => Math.round(e.getBoundingClientRect().height))`) }));
  await scenario('settings', `window.__tide.panel.setTab('settings')`, async () => ({ pane: await ev(rect('#pane-settings')), vol: await ev(rect('#set-vol')) }));
  // U5: 20 wobbly taps (3-10 px) on a node at zoom 1 and zoom 3 must select it; the hit radius on screen is at least 24 CSS px
  await ev(`(() => { window.__tide.panel.setMode('camp'); window.__tide.panel.setTab('grove'); })()`); await sleep(600);
  o.treeTaps = {};
  for (const zoom of [1, 3]) {
    let ok = 0; const fails = [];
    for (let i = 0; i < 20; i++) {
      const c = await ev(`(async () => { const { tree } = window.__tide; const { NODES } = await import('/src/data/skillTree.ts'); const n = NODES[(${i} * 7 + 3) % NODES.length];
        tree.target = null; tree.selected = 'none'; const r = tree.canvas.getBoundingClientRect(); const z = ${zoom};
        tree.cam = { x: n.x - tree.vw / z / 2, y: n.y - tree.vh / z / 2 + 0, z }; tree.stale = true; await new Promise((r) => setTimeout(r, 60));
        return { id: n.id, x: r.left + r.width / 2, y: r.top + r.height / 2, ui: tree.ui }; })()`);
      const m = 3 + (i * 7) % 8, ang = i * 2.399; const dx = Math.cos(ang) * m, dy = Math.sin(ang) * m;
      await touch('touchStart', [{ x: c.x, y: c.y }]); await touch('touchMove', [{ x: c.x + dx / 2, y: c.y + dy / 2 }]); await touch('touchMove', [{ x: c.x + dx, y: c.y + dy }]); await touch('touchEnd', []); await sleep(80);
      const sel = await ev(`window.__tide.tree.selected`); if (sel === c.id) ok++; else fails.push({ i, want: c.id, got: sel, wob: +m.toFixed(1) });
    }
    o.treeTaps[`zoom${zoom}`] = { ok, of: 20, fails: fails.slice(0, 4) };
  }
  await shot(`${k}-tree-zoomed`);
  // fallen overlay
  await ev(`(() => { const { game, panel } = window.__tide; panel.setMode('run'); game.state.run.fallen = true; panel.showFallen(); })()`); await sleep(2500);
  const a = await ev(AUDIT); o.fallen = { smallCount: a.small.length, small: a.small, board: await ev(rect('#fallen-board')), btn: await ev(rect('#fallen-btn')), overlay: await ev(rect('#fallen')), hud: await ev(rect('#hud')), h2: await ev(rect('#fallen h2')), hdr: await ev(rect('header')) }; await shot(`${k}-fallen`);
  // scrolling: swipe the Replant pane and read scrollTop
  await ev(`(() => { const { game, panel } = window.__tide; game.state.run.fallen = false; document.getElementById('fallen').hidden = true; panel.setMode('camp'); panel.setTab('prestige'); })()`); await sleep(500);
  const pr = await ev(rect('#pane-prestige')); const x = 450, y0 = Math.min(380, H - 20);
  await touch('touchStart', [{ x, y: y0 }]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x, y: y0 - i * 30 }]); await sleep(16); } await touch('touchEnd', []); await sleep(400);
  o.replantSwipe = { scrollTop: await ev(`document.getElementById('pane-prestige').scrollTop`), scrollable: pr && pr.sh > pr.ch, pane: pr };
  // text scale 1.6: can the Settings pane scroll to the bottom controls?
  await ev(`(() => { const { game, panel } = window.__tide; game.settings.textScale = 1.6; panel.setTab('settings'); window.dispatchEvent(new Event('resize')); })()`); await sleep(400);
  o.settings16 = await ev(`(() => { const e = document.getElementById('pane-settings'); const cs = getComputedStyle(e); const last = document.getElementById('btn-reset').getBoundingClientRect(); const p = document.querySelector('.panel'); return { overflowY: cs.overflowY, sh: e.scrollHeight, ch: e.clientHeight, panelOv: getComputedStyle(p).overflowY, resetBottom: Math.round(last.bottom), vh: innerHeight }; })()`);
  await ev(`window.__tide.game.settings.textScale = 1`);
}
if (out) writeFileSync(out, JSON.stringify(R, null, 1));
const sum = {}; for (const [k, v] of Object.entries(R)) for (const [n, s] of Object.entries(v)) sum[`${k} ${n}`] = s.smallCount !== undefined ? `small=${s.smallCount} ${s.small.map((x) => x.n + ":" + x.w + "x" + x.h + (x.off ? "(off)" : "")).join(",")} text=${s.textCount ?? "-"}` : JSON.stringify(s);
console.log(JSON.stringify(sum, null, 1));
chrome.kill(); process.exit(0);
