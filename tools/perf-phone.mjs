// Pixel 8 perf harness (TB-218 P1-P7). Start `npm run dev -- --port 5230`, then:
//   TIDE_URL=http://localhost:5230/ node tools/perf-phone.mjs <scenario> <throttle> <debug port> [vw vh]
// scenario: plain | burn | chill | flash | hitburn. Emulates a Pixel 8 (915x412 @ 2.625, touch, mobile) in real Chrome; prints one JSON line.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
const [,, scenario = 'plain', throttle = '4', port = '9333', VW = '915', VH = '412'] = process.argv;
const args = [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-pp-${port}`, '--headless=new', '--window-size=1000,600',
  '--use-angle=d3d11', ...(process.env.TIDE_120 ? ['--disable-frame-rate-limit', '--disable-gpu-vsync'] : []), '--ignore-gpu-blocklist', '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'];
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', args, { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await cdp('Emulation.setDeviceMetricsOverride', { width: +VW, height: +VH, deviceScaleFactor: 2.625, mobile: true, screenWidth: +VW, screenHeight: +VH });
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5230/' }); await sleep(4000);
if (Number(throttle) > 1) await cdp('Emulation.setCPUThrottlingRate', { rate: Number(throttle) });
const expr = `(async () => {
  const sc = ${JSON.stringify(scenario)};
  const step = await import('/src/sim/step.ts'), data = await import('/src/data/balance.ts');
  const { game, field } = window.__tide, s = game.state; s.run.fallen = false; 
  const kinds = ['grunt','grunt','grunt','runner','runner','brute','elite','berserker','wolfrider','shaman','drummer']; let k = 0;
  const fill = () => { s.run.fallen = false; s.run.barHp = s.stats.barMax; while (s.orcs.count < data.ORC_CAP) { if (!step.spawnOrc(s, kinds[k++ % kinds.length])) break; }
    for (const o of s.orcs.items) if (o.live) { if (o.hp < 1e8) { o.hp = o.maxhp = 1e9; o.x = 170 + 720 * ((k++ * 0.618) % 1); }
      if (sc === 'burn' || sc === 'hitburn') o.burn = 99; if (sc === 'chill') o.chill = 99; if (sc === 'flash' || sc === 'hitburn') o.hitT = 0.1; } };
  const draws = []; const d0 = field.draw.bind(field); field.draw = (...a) => { const t = performance.now(); d0(...a); draws.push(performance.now() - t); };
  let ticks = 0; const t0 = game.tick.bind(game); game.tick = (...a) => { ticks++; return t0(...a); };
  const ts = []; let on = true; const loop = (t) => { fill(); ts.push(t); if (on) requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  await new Promise(r => setTimeout(r, 3000)); ts.length = 0; draws.length = 0; ticks = 0;
  await new Promise(r => setTimeout(r, 6000)); on = false;
  const dt = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b), q = (a, p) => +a[Math.floor(a.length * p)].toFixed(2); draws.sort((a, b) => a - b);
  const mem = field.sprites.bakeBytes;
  return JSON.stringify({ canvas: [field.canvas.width, field.canvas.height], mp: +(field.canvas.width * field.canvas.height / 1e6).toFixed(2), live: s.orcs.count, tier: field.tier ?? null,
    fps: +(1000 * (ts.length - 1) / (ts.at(-1) - ts[0])).toFixed(1), frameMs: { med: q(dt, .5), p95: q(dt, .95) }, drawMs: { med: q(draws, .5), p95: q(draws, .95) }, bakeBytes: mem, bakeCount: field.sprites.bakeCount, drawsPerSec: +(draws.length / 6).toFixed(1), rafPerSec: +(ts.length / 6).toFixed(1), ticksPer10s: +(ticks / 6 * 10).toFixed(0), scale: +(field.canvas.width / field.canvas.clientWidth).toFixed(2) });
})()`;
if (process.env.PROFILE) await cdp('Profiler.enable'), await cdp('Profiler.start');
const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
if (process.env.PROFILE) {
  const prof = (await cdp('Profiler.stop')).result.profile, self = new Map(), dts = prof.timeDeltas; const byId = new Map(prof.nodes.map((n) => [n.id, n]));
  prof.samples.forEach((sid, i) => { const n = byId.get(sid), k = n.callFrame.functionName + ' ' + n.callFrame.url.split('/').pop() + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) ?? 0) + dts[i]); });
  const tot = [...self.values()].reduce((a, b) => a + b, 0);
  console.error([...self].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => (100 * v / tot).toFixed(1) + '% ' + k).join(String.fromCharCode(10)));
}
console.log(JSON.stringify({ scenario, throttle, vw: VW, vh: VH, ...JSON.parse(r.result.result.value ?? '{}'), err: r.result.exceptionDetails?.exception?.description?.slice(0, 300) }));
ws.close(); chrome.kill();
