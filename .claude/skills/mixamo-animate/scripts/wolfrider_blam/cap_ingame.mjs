// in-game capture: wolf riders on the real field, 1920x1080, software GL. node cap.mjs <outdir> <port> <shots> <gapms>
import { spawn } from 'node:child_process'; import { writeFileSync } from 'node:fs'; import { tmpdir } from 'node:os';
const [,, OUT, PORT, N = '6', GAP = '120'] = process.argv; const dbg = 9642;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${dbg}`, `--user-data-dir=${tmpdir()}/tide-cap-${dbg}`, '--headless=new',
  '--window-size=1920,1080', '--force-device-scale-factor=1', '--disable-gpu', '--use-angle=swiftshader', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 60 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${dbg}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); let vt = null; ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.method === 'Emulation.virtualTimeBudgetExpired' && vt) { const f = vt; vt = null; f(); } pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await cdp('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: `http://localhost:${PORT}/` });
for (let i = 0; i < 80; i++) { await sleep(500); const t = await cdp('Runtime.evaluate', { returnByValue: true, expression: '!!(window.__tide && window.__tide.game)' }); if (t.result.result.value) break; }
await sleep(3000);
const r = await cdp('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
  const step = await import('/src/sim/step.ts'); const { game } = window.__tide, s = game.state; s.run.fallen = false;
  for (const o of s.orcs.items) if (o.live) o.hp = 0;
  const ys = [140, 250, 360], xs = [420, 600, 780]; const out = [];
  for (let i = 0; i < 3; i++) { const o = step.spawnOrc(s, 'wolfrider', ys[i]); o.hp = o.maxhp = 1e9; o.x = xs[i]; out.push([o.x, o.y]); }
  const g = step.spawnOrc(s, 'grunt', 420); g.hp = g.maxhp = 1e9; g.x = 700;
  let fake = performance.now(); window.requestAnimationFrame = (cb) => { window.__pend = cb; return 1; };
  window.__adv = (n) => { for (let k = 0; k < n; k++) { const cb = window.__pend; window.__pend = null; if (cb) cb(fake += 1000 / 30); } };
  window.__keep = () => { s.run.fallen = false; s.run.barHp = s.stats.barMax; };
  setInterval(window.__keep, 50);
  return JSON.stringify({ out, atlas: !!document.querySelector('canvas') });
})()` });
console.log(JSON.stringify(r.result).slice(0, 600));
const VT = Number(process.env.VT || 0); if (VT) { await cdp('Emulation.setVirtualTimePolicy', { policy: 'pause' }); }
const T0 = Date.now(); for (let i = 0; i < Number(N); i++) {
  await cdp('Runtime.evaluate', { expression: `window.__adv(${i === 0 ? Number(process.env.PRE || 1) : 1})` });
  if (VT) { const w = new Promise((r) => (vt = r)); await cdp('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: VT }); await Promise.race([w, sleep(8000)]); }
  const sh = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/ingame_${i}.png`, Buffer.from(sh.result.data, 'base64')); await sleep(Number(GAP));
}
const p = await cdp('Runtime.evaluate', { returnByValue: true, expression: `JSON.stringify(window.__tide.game.state.orcs.items.filter(o=>o.live).map(o=>[o.kind,Math.round(o.x),Math.round(o.y)]))` });
console.log("ELAPSED", Date.now() - T0); console.log(p.result.result.value); ws.close(); chrome.kill(); process.exit(0);
