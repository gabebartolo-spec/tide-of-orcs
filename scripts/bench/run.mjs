// Field benchmark runner (TB-217). No dependencies: starts its own Vite dev server and a headless Chrome (software raster unless --gpu),
// loads scripts/bench/bench.html, prints sim / draw / frame ms (mean, p50, p95) over the measured frames as one JSON line.
//   node scripts/bench/run.mjs [--port 5622] [--out dir] [--ref frozen.png] [--profile] [--trace] [--frames 600] [--warm 120]
//     [--repeat n] [--skip a,b.c]
// --gpu rasterises on the GPU instead of in software (not in parallel sessions).
// --trace records a Chrome trace of the first run and prints each thread's busy ms per measured frame (top-level tasks
// between the bench:start and bench:end marks) with its top task names: it shows which thread bounds the frame gap.
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
// Calls `on` with every object one level inside the trace's event array, from bytes fed in any chunking.
function eventScanner(on) {
  let depth = 0, arr = -1, str = false, esc = false, held = [], start = -1;
  return (buf) => {
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      if (str) { if (esc) esc = false; else if (b === 92) esc = true; else if (b === 34) str = false; continue; }
      if (b === 34) str = true;
      else if (b === 123 || b === 91) { if (b === 91 && arr < 0) arr = depth + 1; if (b === 123 && depth === arr) start = i; depth++; }
      else if (b === 125 || b === 93) {
        depth--;
        if (b === 125 && depth === arr && start >= 0) { held.push(buf.subarray(start, i + 1)); on(JSON.parse(Buffer.concat(held).toString())); held = []; start = -1; }
      }
    }
    if (start >= 0) { held.push(buf.subarray(start)); start = 0; }
  };
}
const kill = [], stop = () => { for (const p of kill) { try { if (process.platform === 'win32') spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); else p.kill(); } catch { /* gone */ } } };
const deadline = setTimeout(() => { console.error('bench: timeout'); stop(); setTimeout(() => process.exit(2), 500); }, 120_000 * (Number(arg('repeat', 1)) + (flag('trace') ? 2 : 0)));  // 120 s per run, two more to collect and parse a trace
try {
  const vite = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' }); kill.push(vite);
  const url = `http://localhost:${port}/scripts/bench/bench.html?${qs}`;
  for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).ok) break; } catch { /* not up yet */ } await sleep(250); }
  const prof = join(tmpdir(), `tide-bench-${port}`); try { rmSync(prof, { recursive: true, force: true }); } catch { /* a stale profile is harmless */ }
  const chrome = spawn(CHROME, [`--remote-debugging-port=${dbg}`, `--user-data-dir=${prof}`, '--headless=new', '--window-size=1600,900',
    '--force-device-scale-factor=1', '--disable-frame-rate-limit', '--no-first-run',
    // software raster by default: headless Chrome otherwise takes the machine's GPU (ANGLE D3D11 here), which every
    // parallel session shares. --gpu keeps the GPU path, for a solo rule 7 check only (the result's `gpu` names the rasteriser)
    ...(flag('gpu') ? [] : ['--disable-gpu']), 'about:blank'], { stdio: 'ignore' }); kill.push(chrome);
  let list; for (let i = 0; i < 80 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${dbg}/json/list`)).json(); } catch { /* not up yet */ } }
  if (!list) throw new Error(`bench: Chrome did not open its debug port ${dbg} (another run still holding it?)`);
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); let trace = [], traced = null;
  ws.onmessage = (m) => { const d = JSON.parse(m.data);
    if (d.method === 'Tracing.tracingComplete') traced?.(d.params.stream); else pend.get(d.id)?.(d); };
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  if (flag('profile')) { await cdp('Profiler.enable'); await cdp('Profiler.setSamplingInterval', { interval: 200 }); }
  // --repeat n: n page loads in the same browser. Each reported sim/draw/frame stat is the median of that stat over the
  // runs, taken stat by stat (other sessions share the CPU, so one run alone is noisy); `runs` lists every run's
  // frame mean / p95 and draw mean so the spread is visible
  const runs = [];
  for (let n = Number(arg('repeat', 1)); runs.length < n;) {
    await cdp('Page.navigate', { url: 'about:blank' }); await sleep(300); await cdp('Page.navigate', { url }); await sleep(1000);
    for (let i = 0; i < 80; i++) { const e = await cdp('Runtime.evaluate', { expression: '!!window.bench' }); if (e.result?.result?.value) break; await sleep(250); }
    if (flag('profile') && !runs.length) await cdp('Profiler.start');
    if (flag('trace') && !runs.length) await cdp('Tracing.start', { transferMode: 'ReturnAsStream', traceConfig: { recordMode: 'recordUntilFull', traceBufferSizeInKb: 1_500_000,
      includedCategories: ['toplevel', 'devtools.timeline', '__metadata'] } });
    await cdp('Runtime.evaluate', { expression: 'window.benchGo()' });
    const e = await cdp('Runtime.evaluate', { expression: 'window.bench.then((x) => JSON.stringify(x))', awaitPromise: true, returnByValue: true });
    if (!e.result) { console.error(`bench: run lost (${e.error?.message ?? 'no result'}), retrying`); continue; }  // e.g. Vite reloaded the page
    if (e.result.exceptionDetails) throw new Error(e.result.exceptionDetails.exception?.description ?? 'bench failed');
    runs.push(e);
    if (flag('trace') && runs.length === 1) { const done = new Promise((r) => (traced = r)); console.error(`bench: run done ${Math.round(performance.now() / 1000)} s, collecting trace`); await cdp('Tracing.end');
      const stream = await done; console.error(`bench: trace complete ${Math.round(performance.now() / 1000)} s`);
      // the trace is far over V8's 512 MB string limit, so scan it as bytes and parse one event object at a time
      const scan = eventScanner((ev) => { if (ev.ph === 'X' || ev.ph === 'M' || ev.name === 'TimeStamp') trace.push({ ph: ev.ph, name: ev.name, pid: ev.pid, tid: ev.tid, ts: ev.ts, dur: ev.dur, args: ev.ph === 'X' ? undefined : ev.args }); });
      for (;;) { const c = (await cdp('IO.read', { handle: stream, size: 1 << 22 })).result; scan(c.base64Encoded ? Buffer.from(c.data, 'base64') : Buffer.from(c.data)); if (c.eof) break; }
      await cdp('IO.close', { handle: stream }); console.error(`bench: ${trace.length} trace events`); }
  }
  const parsed = runs.map((e) => JSON.parse(e.result.result.value));
  const med = (xs) => { const b = [...xs].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : +((b[m - 1] + b[m]) / 2).toFixed(3); };
  const res = { ...parsed[0] }, png = res.frozen; delete res.frozen;
  for (const k of ['simMs', 'drawMs', 'frameMs']) res[k] = Object.fromEntries(Object.keys(parsed[0][k]).map((s2) => [s2, med(parsed.map((x) => x[k][s2]))]));
  res.fps = med(parsed.map((x) => x.fps)); res.bakes = med(parsed.map((x) => x.bakes));
  res.runs = parsed.map((x) => `frame ${x.frameMs.mean}/${x.frameMs.p95} draw ${x.drawMs.mean}`);
  if (flag('trace')) {
    // the last start before the first end: a run lost to a reload leaves a start of its own
    const marks = (n) => trace.filter((e) => e.name === 'TimeStamp' && e.args?.data?.message === n).map((e) => e.ts);
    const t1 = marks('bench:end')[0], t0 = marks('bench:start').filter((t) => t < t1).at(-1);
    if (t0 === undefined || t1 === undefined) throw new Error('bench: trace lost its window marks (buffer full?)');
    const names = new Map(), procs = new Map();
    for (const e of trace) if (e.ph === 'M') { if (e.name === 'thread_name') names.set(`${e.pid}:${e.tid}`, e.args.name); if (e.name === 'process_name') procs.set(e.pid, e.args.name); }
    // busy = union of complete events per thread inside the window (nested events add only what sticks out of their parent)
    const per = new Map();
    for (const e of trace.filter((x) => x.ph === 'X' && x.dur && x.ts >= t0 && x.ts <= t1).sort((a, b) => a.ts - b.ts || b.dur - a.dur)) {  // a parent sorts before a child that starts with it
      const key = `${e.pid}:${e.tid}`, t = per.get(key) ?? { busy: 0, end: 0, top: new Map(), inner: new Map() }; per.set(key, t);
      // clipped to the window: the toDataURL task after bench:end must not count
      const end = Math.min(t1, e.ts + e.dur), d = end - e.ts; if (d <= 0) continue;
      if (e.ts >= t.end) { t.busy += d; t.end = end; t.top.set(e.name, (t.top.get(e.name) ?? 0) + d); }
      else { t.inner.set(e.name, (t.inner.get(e.name) ?? 0) + d); if (end > t.end) { t.busy += end - t.end; t.end = end; } }
    }
    const fr = parsed[0].frames, win = (t1 - t0) / 1000;
    res.trace = { windowMs: +win.toFixed(1), msPerFrame: +(win / fr).toFixed(2), threads: [...per].sort((a, b) => b[1].busy - a[1].busy).slice(0, 8).map(([k, t]) => ({
      thread: `${procs.get(Number(k.split(':')[0])) ?? '?'}/${names.get(k) ?? k}`, busyPerFrame: +(t.busy / 1000 / fr).toFixed(2), busyPct: +(100 * t.busy / 1000 / win).toFixed(1),
      // inner: inclusive ms per frame of the events nested in those tasks (they overlap each other, so they do not add up)
      top: [...t.top].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, d]) => `${n} ${(d / 1000 / fr).toFixed(2)}`),
      inner: [...t.inner].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, d]) => `${n} ${(d / 1000 / fr).toFixed(2)}`) })) };
  }
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
