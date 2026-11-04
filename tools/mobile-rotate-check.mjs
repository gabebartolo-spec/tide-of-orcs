// Rotation resume + draw-rate check (TB-218 round 2).  TIDE_URL=http://127.0.0.1:5271/ node tools/mobile-rotate-check.mjs <debug port>
// Rotates 915x412 -> 412x915 -> 915x412 three times, with a 70 ms busy layout stall injected on every resize, and reports the largest sim step
// (in ticks) of any frame after the rotation. Also counts Grove tree draws per second while the Grove is shown and hidden.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
const [,, port = '9361'] = process.argv;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-rot-${port}-${Date.now()}`,
  '--headless=new', '--window-size=915,412', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval'); return r.result.result.value; };
const dev = (W, H) => cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2.625, mobile: true, screenWidth: W, screenHeight: H });
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await dev(915, 412); await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://127.0.0.1:5271/' }); await sleep(3500);
await ev(`(() => { const { game } = window.__tide; window.__steps = []; let prev = game.state.t, armed = 0;
  addEventListener('resize', () => { armed = 12; const t = performance.now(); while (performance.now() - t < 70); });
  const f = () => { const t = game.state.t; if (armed > 0) { window.__steps.push(Math.round((t - prev) / (1 / 60) * 10) / 10); armed--; } prev = t; requestAnimationFrame(f); }; requestAnimationFrame(f); })()`);
// the rotation to portrait pauses the sim behind the overlay; the check is the frames after coming back to landscape
const worst = [];
for (let i = 0; i < 3; i++) {
  await dev(412, 915); await sleep(1200);
  await ev(`window.__steps.length = 0`);
  await dev(915, 412); await sleep(1500);
  worst.push(await ev(`window.__steps.slice()`));
}
console.log(JSON.stringify({ rotations: worst, maxTicks: Math.max(...worst.flat()) }));
// tree draw rate: wrap tree.draw and count over 5 s, Grove shown then hidden
await ev(`(() => { const { tree, panel } = window.__tide; window.__td = 0; const d = tree.draw.bind(tree); tree.draw = (...a) => { window.__td++; return d(...a); }; panel.setMode('camp'); panel.setTab('grove'); })()`);
await sleep(500); await ev(`window.__td = 0`); await sleep(5000);
const shown = (await ev(`window.__td`)) / 5;
await ev(`window.__tide.panel.setTab('satchel'); window.__td = 0`); await sleep(5000);
const hidden = (await ev(`window.__td`)) / 5;
await ev(`window.__tide.panel.setMode('run'); window.__td = 0`); await sleep(5000);
const run = (await ev(`window.__td`)) / 5;
console.log(JSON.stringify({ treeDrawsPerSec: { groveShown: shown, groveHidden: hidden, runMode: run } }));
chrome.kill(); process.exit(0);
