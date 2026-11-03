// Field benchmark runner (TB-217). No dependencies: starts its own Vite dev server and a software-rendered headless Chrome,
// loads scripts/bench/bench.html, prints sim / draw / frame ms (mean, p50, p95) over the measured frames as one JSON line.
//   node scripts/bench/run.mjs [--port 5622] [--out dir] [--ref frozen.png] [--profile] [--frames 600] [--warm 120]
// --out writes frozen.png (the last frame) and, with --profile, bench.cpuprofile (open in DevTools > Performance).
// --ref pixel-compares the frozen frame against a PNG from an earlier run and reports the differing pixel count.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : (process.argv[i + 1] ?? true); };
const flag = (k) => process.argv.includes(`--${k}`);
const port = Number(arg('port', 5622)), dbg = port + 1000, out = arg('out', null), ref = arg('ref', null);
const qs = `warm=${arg('warm', 120)}&frames=${arg('frames', 600)}${flag('flush') ? '&flush=1' : ''}${flag('split') ? '&split=1' : ''}${arg('skip', '') ? `&skip=${arg('skip')}` : ''}`;
const root = resolve(import.meta.dirname, '../..'), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const kill = [], stop = () => { for (const p of kill) { try { if (process.platform === 'win32') spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); else p.kill(); } catch { /* gone */ } } };
const deadline = setTimeout(() => { console.error('bench: timeout'); stop(); setTimeout(() => process.exit(2), 500); }, 120_000 * Number(arg('repeat', 1)));
try {
  const vite = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' }); kill.push(vite);
  const url = `http://localhost:${port}/scripts/bench/bench.html?${qs}`;
  for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).ok) break; } catch { /* not up yet */ } await sleep(250); }
  const prof = join(tmpdir(), `tide-bench-${port}`); try { rmSync(prof, { recursive: true, force: true }); } catch { /* a stale profile is harmless */ }
  const chrome = spawn(CHROME, [`--remote-debugging-port=${dbg}`, `--user-data-dir=${prof}`, '--headless=new', '--window-size=1600,900',
    '--force-device-scale-factor=1', '--disable-frame-rate-limit', '--no-first-run', 'about:blank'], { stdio: 'ignore' }); kill.push(chrome);
  let list; for (let i = 0; i < 80 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${dbg}/json/list`)).json(); } catch { /* not up yet */ } }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  if (flag('profile')) { await cdp('Profiler.enable'); await cdp('Profiler.setSamplingInterval', { interval: 200 }); }
  // --repeat n: n page loads in the same browser; the frame and draw stats reported are the run with the median frame p50
  // (other sessions share the CPU, so one run alone is noisy); `runs` lists each run's frame p50 / mean
  const runs = [];
  for (let n = Number(arg('repeat', 1)); runs.length < n;) {
    await cdp('Page.navigate', { url: 'about:blank' }); await sleep(300); await cdp('Page.navigate', { url }); await sleep(1000);
    for (let i = 0; i < 80; i++) { const e = await cdp('Runtime.evaluate', { expression: '!!window.bench' }); if (e.result?.result?.value) break; await sleep(250); }
    if (flag('profile') && !runs.length) await cdp('Profiler.start');
    const e = await cdp('Runtime.evaluate', { expression: 'window.bench.then((x) => JSON.stringify(x))', awaitPromise: true, returnByValue: true });
    if (e.result.exceptionDetails) throw new Error(e.result.exceptionDetails.exception?.description ?? 'bench failed');
    runs.push(e);
  }
  const parsed = runs.map((e) => JSON.parse(e.result.result.value)), order = parsed.map((_, i) => i).sort((x, y) => parsed[x].frameMs.p50 - parsed[y].frameMs.p50);
  const r = runs[order[Math.floor(order.length / 2)]];
  const res = JSON.parse(r.result.result.value), png = res.frozen; delete res.frozen;
  res.runs = parsed.map((x) => `${x.frameMs.p50}/${x.frameMs.mean}`);
  if (flag('profile')) {
    const p = (await cdp('Profiler.stop')).result.profile;
    if (out) { mkdirSync(out, { recursive: true }); writeFileSync(join(out, 'bench.cpuprofile'), JSON.stringify(p)); }
    // self time per function, top 25
    const self = new Map(), byId = new Map(p.nodes.map((n) => [n.id, n])), dts = p.timeDeltas; let tot = 0;
    p.samples.forEach((sid, i) => { const n = byId.get(sid), f = n.callFrame, key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`; self.set(key, (self.get(key) ?? 0) + dts[i]); tot += dts[i]; });
    res.topSelf = [...self].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(100 * v / tot).toFixed(1)}% ${k}`);
  }
  if (out) { mkdirSync(out, { recursive: true }); writeFileSync(join(out, 'frozen.png'), Buffer.from(png.split(',')[1], 'base64')); }
  if (ref) {
    const refUrl = `data:image/png;base64,${readFileSync(ref).toString('base64')}`;
    const d = await cdp('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
      const load = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u; });
      const [a, b] = await Promise.all([load(${JSON.stringify(png)}), load(${JSON.stringify(refUrl)})]);
      const px = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
      const A = px(a), B = px(b); let n = 0, m = 0; for (let i = 0; i < A.length; i += 4) { const e = Math.max(Math.abs(A[i]-B[i]), Math.abs(A[i+1]-B[i+1]), Math.abs(A[i+2]-B[i+2]), Math.abs(A[i+3]-B[i+3])); if (e) n++; if (e > m) m = e; }
      return JSON.stringify({ size: [a.width, a.height, b.width, b.height], diffPx: n, maxDelta: m });
    })()` });
    res.diff = JSON.parse(d.result.result.value);
  }
  console.log(JSON.stringify(res));
  ws.close();
} finally { clearTimeout(deadline); stop(); }
