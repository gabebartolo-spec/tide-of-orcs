// TB-225 dagger slot proof. Start `npm run dev -- --port 5246` (or set TIDE_URL), then: node tools/satchel-dagger-capture.mjs <debug port> <outDir>
// Headless Chrome (swiftshader) at 1920x1080, 1280x720, 1024x600, 390x844 (a narrow portrait window: the scrolling one-column layout) and 844x390 (a touch phone held sideways). Per size: the EMPTY dagger pocket,
// the Last Knife worn with its card, the hover compare plates on a real bag item, and the doll drawn at its pre-TB-225 grid span
// ("before") next to the current one, with the doll's drawn size measured. Writes PNGs and audit.json (overflow in px, 2 decimals).
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9351', outDir = 'previews/tb-225-dagger-slot'] = process.argv;
mkdirSync(outDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-sat-${port}-${Date.now()}`,
  '--headless=new', '--disable-gpu', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const AUDIT = `(() => { const p = document.getElementById('pane-satchel'), c = p.firstElementChild; const m = /scale\\(([\\d.]+)\\)/.exec(c.style.transform); const k = m ? +m[1] : 1;
  let min = 99, who = ''; const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
  for (let t; (t = w.nextNode());) { if (!t.nodeValue.trim()) continue; const e = t.parentElement; const r = e.getBoundingClientRect(); if (r.width < 1) continue; const fs = parseFloat(getComputedStyle(e).fontSize) * k; if (fs < min) { min = fs; who = e.className || e.tagName; } }
  return { k: +k.toFixed(3), overflowPx: +Math.max(0, c.getBoundingClientRect().bottom - p.getBoundingClientRect().bottom).toFixed(2), scrollable: p.scrollHeight > p.clientHeight + 1, hScroll: document.documentElement.scrollWidth > innerWidth, minFont: +min.toFixed(1), minFontEl: who }; })()`;
const DOLL = 516 / 440; // doll@2x.webp aspect; the mask is drawn `contain`, so its size is min(box width, box height * aspect)
const BOX = `(() => { const w = document.getElementById('sat-worn'), cs = getComputedStyle(w); const cols = cs.gridTemplateColumns.split(' ').map(parseFloat), rows = cs.gridTemplateRows.split(' ').map(parseFloat), gap = parseFloat(cs.rowGap);
  const span = (n) => rows.slice(0, n).reduce((a, b) => a + b, 0) + gap * (n - 1); const dg = w.querySelector('[data-pocket="dagger"]').getBoundingClientRect();
  return { boxW: cols[1], span2H: span(2), span3H: span(3), dagger: [Math.round(dg.width), Math.round(dg.height)] }; })()`;
const SETUP = `(async () => { const lr = await import('/src/sim/lootRoll.ts'); const { createRng } = await import('/src/sim/rng.ts'); const { game, panel } = window.__tide; const s = game.state; const l = s.meta.loot; let n = 0; const rng = createRng(225); l.items = []; l.equipped = {}; l.heirloom = null; // a reload keeps the last size's save: start every size from an empty bag
  for (let i = 0; i < 900 && n < 14; i++) { const it = lr.rollDrop(rng, l, i % 2 ? 'brute' : 'grunt', 30, 1, s.stats); if (it && it.slot !== 'dagger' && !it.mythic) { l.items.push(it); n++; } }
  for (const sl of ['bow', 'quiver', 'bracer', 'cloak', 'boots', 'charm']) { const it = l.items.find((i) => i.slot === sl); if (it) game.equipItem(it.uid); }
  l.items.push({ uid: 'knife', base: 'bronze-dirk', slot: 'dagger', rarity: 'mythic', ilvl: 31, affixes: [{ id: 'blades', value: 0.12 }, { id: 'find', value: 0.05 }], mythic: 'last-knife' });
  l.items.push({ uid: 'knife2', base: 'flint-dagger', slot: 'dagger', rarity: 'rare', ilvl: 20, affixes: [{ id: 'blades', value: 0.07 }] });
  s.meta.heartwood = 50; panel.setMode('camp'); panel.setTab('satchel'); panel.update(); })()`;
const R = {};
const SIZES = [[1920, 1080, false], [1280, 720, false], [1024, 600, false], [390, 844, false], [844, 390, true]];
await cdp('Page.enable');
const shot = async (name) => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
for (const [W, H, mobile] of SIZES) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile });
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  const url = process.env.TIDE_URL ?? 'http://localhost:5246/'; await cdp('Page.navigate', { url: 'about:blank' }); await cdp('Storage.clearDataForOrigin', { origin: new URL(url).origin, storageTypes: 'all' }); // every size starts from a fresh save
  await cdp('Page.navigate', { url }); for (let i = 0; i < 60; i++) { await sleep(1000); if (await ev('!!window.__tide')) break; }
  // six slots worn, spares in the bag incl. two daggers; the dagger pocket stays EMPTY for the first shot
  await ev(SETUP); await sleep(800);
  const k = `${W}x${H}`;
  R[k] = { emptyDagger: await ev(`(() => { const e = document.querySelector('#sat-worn [data-pocket="dagger"]'); return e ? { empty: e.classList.contains('empty'), uid: e.dataset.uid ?? null, placeholderGlyph: !!e.querySelector('svg'), opacity: getComputedStyle(e).opacity } : null; })()`), emptyAudit: await ev(AUDIT) };
  await shot(`${k}-dagger-empty`);
  // wear the Last Knife and open its card
  await ev(`window.__tide.game.equipItem('knife'); window.__tide.panel.update()`); await sleep(500);
  await ev(`document.querySelector('#sat-worn [data-pocket="dagger"]')?.click()`); await sleep(600);
  Object.assign(R[k], { worn: await ev(`document.querySelector('#sat-worn [data-pocket="dagger"]')?.dataset.uid ?? null`), detail: await ev(`document.getElementById('sat-detail').innerText.slice(0, 300)`), wornAudit: await ev(AUDIT) });
  await shot(`${k}-knife-worn`);
  // hover the spare dagger where it really sits in the bag: the "Against worn" compare plates
  await ev(`document.querySelector('#sat-detail [data-act="close"]')?.click()`); await sleep(400); // phone: the card replaces the bag until Back to bag
  const at = await ev(`(() => { const e = document.querySelector('#sat-grid [data-uid="knife2"]'); e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y }); await sleep(600);
  R[k].compareHoverAt = at; await shot(`${k}-compare`);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 }); await sleep(300);
  // the doll: its box now (rows 1-2) against the old 3-row span; drawn size = min(box width, box height * aspect)
  await ev(`window.scrollTo(0, 0); document.getElementById('sat-worn').scrollIntoView({ block: 'center' })`); await sleep(200);
  const b = await ev(BOX); const drawn = (h) => { const w = Math.min(b.boxW, h * DOLL); return [Math.round(w), Math.round(w / DOLL)]; };
  R[k].doll = { boxW: b.boxW, afterBoxH: Math.round(b.span2H), beforeBoxH: Math.round(b.span3H), afterDrawn: drawn(b.span2H), beforeDrawn: drawn(b.span3H), dagger: b.dagger };
  await shot(`${k}-doll-after`);
  await ev(`(() => { const s = document.createElement('style'); s.id = 'before'; s.textContent = '#sat-worn::before { grid-row: 1 / span 3 !important; }'; document.head.append(s); })()`); await sleep(400);
  await shot(`${k}-doll-before`);
  await ev(`document.getElementById('before').remove()`);
}
writeFileSync(`${outDir}/audit.json`, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
chrome.kill(); process.exit(0);
