// Satchel capture (TB-221). Start the dev server (npm run dev -- --port 5221), then:
//   node tools/satchel-capture.mjs <debug port> <outDir>
// Real Chrome, headless. Seeds a save with the bow, cloak and knife icons the item art covers, opens the Satchel
// tab and writes satchel-1920x1080.png and satchel-1280x720.png.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9351', outDir = '.'] = process.argv;
const url = process.env.TIDE_URL ?? 'http://localhost:5221/';
mkdirSync(outDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-sat-${port}-${Date.now()}`,
  '--headless=new', '--window-size=1920,1080', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval'); return r.result.result.value; };
const shot = async (name) => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
const size = (w, h) => cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
await cdp('Page.enable');
await size(1920, 1080);
await cdp('Page.navigate', { url }); await sleep(2500);
const SEED = `(() => {
  const k = 'tide-of-orcs-v1'; const s = JSON.parse(localStorage.getItem(k));
  const it = (uid, base, slot, rarity, extra = {}) => ({ uid, base, slot, rarity, ilvl: 30, affixes: [], ...extra });
  const items = [
    it('b1', 'ironbark-recurve', 'bow', 'legendary', { set: 'nightknife' }),
    it('b2', 'ashwood-bow', 'bow', 'rare'), it('b3', 'yew-longbow', 'bow', 'epic'), it('b4', 'hornbow', 'bow', 'rare'),
    it('b5', 'hornbow', 'bow', 'epic', { set: 'serpents-coil' }), it('b6', 'hornbow', 'bow', 'epic', { set: 'foxfire-pack' }), it('b7', 'hornbow', 'bow', 'epic', { set: 'magpies-hoard' }),
    it('c1', 'dusk-cloak', 'cloak', 'epic'), it('c2', 'moss-cloak', 'cloak', 'common'),
    it('m1', 'ashwood-bow', 'bow', 'mythic', { mythic: 'last-knife' }),
    it('q1', 'hide-quiver', 'quiver', 'rare'), it('r1', 'leather-bracer', 'bracer', 'common'),
  ];
  const l = s.meta.loot; l.items = items; l.equipped = { bow: 'b1', cloak: 'c1' }; l.nextUid = 100;
  localStorage.setItem(k, JSON.stringify(s)); return items.length;
})()`;
await ev("window.dispatchEvent(new Event('pagehide'))"); await sleep(300);
console.log('seeded', await ev(SEED));
// the game saves on unload; stop it overwriting the seed
await ev("(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k !== 'tide-of-orcs-v1') o.call(this, k, v); }; })()");
await cdp('Page.navigate', { url }); await sleep(2500);
await ev(`document.getElementById('btn-settings').click()`); await sleep(600);
await ev(`document.getElementById('tab-satchel').click()`); await sleep(800);
await ev(`document.querySelector('#sat-grid [data-uid="m1"]')?.click()`); await sleep(400);
await shot('satchel-1920x1080');
await size(1280, 720); await sleep(1200); await shot('satchel-1280x720');
const info = await ev(`[...document.querySelectorAll('#sat-grid .item img, #sat-worn .item img')].map((i) => i.src.split('/').pop() + ' ' + Math.round(i.getBoundingClientRect().width) + 'px loaded=' + i.complete)`);
console.log(info.join('\n'));
ws.close(); chrome.kill();
