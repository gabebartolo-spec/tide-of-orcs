// TB-250 fox tabards proof. Start `npm run dev -- --port 5199`, then: node tools/tabard-capture.mjs <debug port> <outDir>
// One headless Chrome at SIZE (WxHxDPR, default 1920x1080x1). One spearman on the field, every other orc cleared each frame:
// idle (home, nothing near), walking (put back behind his post whenever he reaches it), attacking (a dummy grunt held in his reach).
// Each phase: a shot with the fox tabards not earned and one a frame later with them earned (<phase>_off / <phase>_on, css box
// around him), then gif_<n>.png every 100 ms with them earned, for the in-play GIF.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9372', outDir = 'previews/tb-250-fox-tabards/raw'] = process.argv;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [W, H, DPR] = (process.env.SIZE ?? '1920x1080x1').split('x').map(Number);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-tabard-${Date.now()}`,
  '--headless=new', '--disable-gpu', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
try {
  let list; for (let i = 0; i < 60 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
  const shot = async (name, clip) => { const r = await cdp('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
  await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5199/' });
  for (let i = 0; i < 80 && !(await ev('!!(window.__tide && window.__tide.game)').catch(() => false)); i++) await sleep(500);
  await sleep(9000);   // every eager sheet in (sheet_van loads after the first ones)
  // the scene: one spearman, a per-frame hook that holds the phase, and the fox sheet loaded before the first shot
  await ev(`(async () => {
    const vg = await import('/src/sim/vanguard.ts'), step = await import('/src/sim/step.ts'), dp = await import('/src/render/depth.ts');
    const { game, field } = window.__tide, s = game.state; s.meta.ach.earned.length = 0;
    s.vans.clear(); const v = vg.placeVanguard(s, 'spear', false); const home = v.tx; v.x = home;
    const T = window.__tab = { phase: 'idle', v, home, dummy: null };
    const loop = () => {
      s.run.fallen = false; s.run.barHp = s.stats.barMax; v.hp = v.maxhp;
      s.orcs.forEach((o) => { if (o !== T.dummy) s.orcs.release(o); });
      if (T.phase === 'walk' && v.x >= home - 2) { v.x = home - 70; }
      if (T.phase === 'attack') {
        if (!T.dummy || !T.dummy.live) { T.dummy = step.spawnOrc(s, 'grunt', v.y); }
        const o = T.dummy; o.hp = o.maxhp = 1e9; o.x = v.x + 30; o.y = v.y; o.spd = 0;
      } else if (T.dummy) { if (T.dummy.live) s.orcs.release(T.dummy); T.dummy = null; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    T.box = () => { const b = field.base, d = field.canvas.width / field.canvas.clientWidth, r = field.canvas.getBoundingClientRect();
      const fx = r.left + (b.ex + v.x * b.sx) / d, fy = r.top + (b.ey + dp.depthY(v.y) * b.sy) / d, sc = b.sx / d;
      return { x: fx - 70 * sc, y: fy - 55 * sc, width: 140 * sc, height: 80 * sc }; };
    s.meta.ach.earned.push('branch_vanguard'); await new Promise((r) => setTimeout(r, 3000)); s.meta.ach.earned.length = 0;
  })()`);
  const box = async () => ev('window.__tab.box()');
  const pair = async (phase) => {
    await ev(`window.__tab.phase = '${phase}'`); await sleep(phase === 'walk' ? 600 : 1500);
    const b = await box();
    await ev('window.__tide.game.state.meta.ach.earned.length = 0'); await sleep(50); await shot(`${phase}_off`, b);
    await ev(`window.__tide.game.state.meta.ach.earned.push('branch_vanguard')`); await sleep(50); await shot(`${phase}_on`, b);
  };
  for (const p of ['idle', 'walk', 'attack']) await pair(p);
  // in-play GIF frames, earned: idle, walk, attack, 100 ms apart, one fixed box (the walk's start) so he moves through it
  let n = 0; const b = await box(); b.x -= b.width * 0.25; b.width *= 1.5;
  for (const [p, k] of [['idle', 8], ['walk', 14], ['attack', 18]]) { await ev(`window.__tab.phase = '${p}'`); for (let i = 0; i < k; i++) { await shot(`gif_${String(n++).padStart(3, '0')}`, b); await sleep(100); } }
  writeFileSync(`${outDir}/meta.json`, JSON.stringify({ size: [W, H], dpr: DPR, frames: n }, null, 1));
} finally { chrome.kill(); }
