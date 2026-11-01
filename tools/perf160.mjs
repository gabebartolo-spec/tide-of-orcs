// 160-orc frame check (TB-150). With the dev server on :5199 (npm run dev -- --port 5199), run:
//   node tools/perf160.mjs <width> <height> <uncapped 0|1> <cpu throttle> <debug port>
// Real Chrome, headless, one window size, CSS scale 1; prints fps, frame and draw times as one JSON line.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
const [,, W, H, uncapped, throttle, port] = process.argv;
const args = [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-perf-${port}`, '--headless=new', `--window-size=${W},${H}`,
  '--force-device-scale-factor=1', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-first-run', 'about:blank'];
if (uncapped === '1') args.push('--disable-frame-rate-limit', '--disable-gpu-vsync');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', args, { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await cdp('Page.navigate', { url: 'http://localhost:5199/' }); await sleep(3000);
if (Number(throttle) > 1) await cdp('Emulation.setCPUThrottlingRate', { rate: Number(throttle) });
const expr = `(async () => {
  const step = await import('/src/sim/step.ts'), data = await import('/src/data/balance.ts');
  const { game, field } = window.__tide, s = game.state; s.run.fallen = false;
  const kinds = ['grunt','grunt','grunt','runner','runner','brute','elite']; let k = 0;
  const fill = () => { while (s.orcs.count < data.ORC_CAP) { if (!step.spawnOrc(s, kinds[k % 7])) break; } for (const o of s.orcs.items) if (o.live && o.hp < 1e8) { o.hp = o.maxhp = 1e9; o.x = 170 + 720 * ((k++ * 0.618) % 1); } };
  const gl = document.createElement('canvas').getContext('webgl'), ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  const draws = []; const d0 = field.draw.bind(field); field.draw = (...a) => { const t = performance.now(); d0(...a); draws.push(performance.now() - t); };
  const ts = []; let on = true; const loop = (t) => { fill(); ts.push(t); if (on) requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  await new Promise(r => setTimeout(r, 2000)); ts.length = 0; draws.length = 0;
  await new Promise(r => setTimeout(r, 6000)); on = false;
  const dt = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b), q = (a, p) => +a[Math.floor(a.length * p)].toFixed(2); draws.sort((a, b) => a - b);
  return JSON.stringify({ canvas: [field.canvas.width, field.canvas.height], live: s.orcs.count, mode: document.body.dataset.mode ?? null,
    fps: +(1000 * (ts.length - 1) / (ts.at(-1) - ts[0])).toFixed(1), frameMs: { med: q(dt, .5), p95: q(dt, .95), p99: q(dt, .99) },
    drawMs: { med: q(draws, .5), p95: q(draws, .95) }, gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'none' });
})()`;
const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
console.log(JSON.stringify({ W, H, uncapped, throttle, ...JSON.parse(r.result.result.value ?? '{}'), err: r.result.exceptionDetails?.exception?.description?.slice(0, 200) }));
ws.close(); chrome.kill();
