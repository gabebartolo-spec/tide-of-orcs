// TB-225 dagger slot proof. Start `npm run dev -- --port 5246`, then: node tools/satchel-fit-capture.mjs <debug port> <outDir>
// Headless Chrome (swiftshader) at 1920x1080, 1280x720, 390x844: shot of the satchel plus overflow and smallest-font audit.
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
const AUDIT = `(() => { const p = document.getElementById('pane-satchel'), c = p.firstElementChild; const m = /scale\(([\d.]+)\)/.exec(c.style.transform); const k = m ? +m[1] : 1;
  let min = 99, who = ''; const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
  for (let t; (t = w.nextNode());) { if (!t.nodeValue.trim()) continue; const e = t.parentElement; const r = e.getBoundingClientRect(); if (r.width < 1) continue; const fs = parseFloat(getComputedStyle(e).fontSize) * k; if (fs < min) { min = fs; who = e.className || e.tagName; } }
  return { k: +k.toFixed(3), overflow: Math.max(0, Math.round(c.getBoundingClientRect().bottom - p.getBoundingClientRect().bottom)), scrollable: p.scrollHeight > p.clientHeight + 1, minFont: +min.toFixed(1), minFontEl: who }; })()`;
const R = {};
await cdp('Page.enable');
for (const [W, H] of [[1920, 1080], [1280, 720]]) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5246/' }); for (let i = 0; i < 60; i++) { await sleep(1000); if (await ev('!!window.__tide')) break; }
  // wear one item per slot, then a mythic Last Knife in the dagger slot; keep a few spares in the bag
  await ev(`(async () => { const lr = await import('/src/sim/lootRoll.ts'); const { game, panel } = window.__tide; const s = game.state; const l = s.meta.loot; let n = 0;
    for (let i = 0; i < 900 && n < 14; i++) { const it = lr.rollDrop(s.lootRng, l, i % 2 ? 'brute' : 'grunt', 30, 1, s.stats); if (it && it.slot !== 'dagger' && !it.mythic) { l.items.push(it); n++; } }
    for (const sl of ['bow', 'quiver', 'bracer', 'cloak', 'boots', 'charm']) { const it = l.items.find((i) => i.slot === sl); if (it) game.equipItem(it.uid); }
    l.items.push({ uid: 'knife', base: 'bronze-dirk', slot: 'dagger', rarity: 'mythic', ilvl: 31, affixes: [{ id: 'blades', value: 0.12 }, { id: 'find', value: 0.05 }], mythic: 'last-knife' });
    l.items.push({ uid: 'knife2', base: 'flint-dagger', slot: 'dagger', rarity: 'rare', ilvl: 20, affixes: [{ id: 'blades', value: 0.07 }] });
    game.equipItem('knife');
    s.meta.heartwood = 50; panel.setMode('camp'); panel.setTab('satchel'); panel.update(); })()`);
  await sleep(800);
  const k = `${W}x${H}`;
  await ev(`document.querySelector('#sat-worn [data-pocket="dagger"]')?.click()`); await sleep(600);
  R[k] = { worn: await ev(`document.querySelector('#sat-worn [data-pocket="dagger"]')?.dataset.uid ?? null`), detail: await ev(`document.getElementById('sat-detail').innerText.slice(0, 400)`), ...(await ev(AUDIT)) };
  const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${k}-knife-worn.png`, Buffer.from(r.result.data, 'base64'));
  // hover the spare dagger to show "Against worn" compare plates
  await ev(`document.querySelector('#sat-grid [data-uid="knife2"]')?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 700, clientY: 560 }))`); await sleep(500);
  const r2 = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${k}-compare.png`, Buffer.from(r2.result.data, 'base64'));
}
writeFileSync(`${outDir}/audit.json`, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
chrome.kill(); process.exit(0);
