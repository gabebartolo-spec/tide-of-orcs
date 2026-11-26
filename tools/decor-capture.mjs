// TB-250 batch 2 camp decor proof. Start `npm run dev -- --port 5199`, then: node tools/decor-capture.mjs <debug port> <outDir>
// One headless Chrome at SIZE (WxHxDPR, default 1920x1080x2). Camp at level 3 everywhere. Shots: none earned, then each trophy and banner earned one by one
// (step_<n>.png, the GIF frames), then all earned (camp_all.png), and zoomed crops of the trophy row and the banners (device pixels).
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9371', outDir = 'previews/tb-250-batch2'] = process.argv;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [W, H, DPR] = (process.env.SIZE ?? '1920x1080x2').split('x').map(Number);
const ORDER = process.env.ORDER?.split(',') ?? ['first_boss', 'boss_streak', 'boss_swift', 'boss_tier6', 'boss_roster', 'path_serpent', 'path_fox', 'path_magpie'];
// ZOOMS='name:x0,y0,x1,y1;...' (scene units) replaces the trophy/banner zoom crops
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-decor-${Date.now()}`,
  '--headless=new', '--disable-gpu', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
try {
  let list; for (let i = 0; i < 60 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
  const shot = async (name, clip) => { const r = await cdp('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
  await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5199/' });
  for (let i = 0; i < 80 && !(await ev('!!(window.__tide && window.__tide.game)').catch(() => false)); i++) await sleep(500);
  await sleep(2000);
  await ev(`(async () => { const m = window.__tide.game.state.meta; m.ach.earned.length = 0; m.camp.levels = { bowyer: 3, forge: 3, kitchen: 3, training: 3 };
    const b = (t) => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t);
    b('To the grove')?.click(); await new Promise((r) => setTimeout(r, 500)); b('Camp').click(); })()`);
  // every decor image loaded before the first shot (the camp loads them lazily on first draw)
  await ev(`window.__tide.game.state.meta.ach.earned.push(...${JSON.stringify(ORDER)})`); await sleep(3000);
  await ev('window.__tide.game.state.meta.ach.earned.length = 0'); await sleep(800);
  await shot('step_0');
  for (let n = 0; n < ORDER.length; n++) { await ev(`window.__tide.game.state.meta.ach.earned.push('${ORDER[n]}')`); await sleep(700); await shot(`step_${n + 1}`); }
  await shot('camp_all');
  // scene rect -> css rect: the camp canvas maps scene (x, y) to css (x * k + ox, y * k + oy)
  const css = (x0, y0, x1, y1) => ev(`(() => { const s = window.__tide.campScene, r = s.canvas.getBoundingClientRect();
    const a = [${x0}, ${y0}, ${x1}, ${y1}]; return { x: r.left + s.ox + a[0] * s.k, y: r.top + s.oy + a[1] * s.k, width: (a[2] - a[0]) * s.k, height: (a[3] - a[1]) * s.k }; })()`);
  const zooms = process.env.ZOOMS ? process.env.ZOOMS.split(';').map((z) => { const [n, r] = z.split(':'); return [n, r.split(',').map(Number)]; })
    : [['zoom_trophies', [810, -125, 1090, -25]], ['zoom_banners', [590, 110, 790, 220]]];
  for (const [n, r] of zooms) await shot(n, await css(...r));
  writeFileSync(`${outDir}/meta.json`, JSON.stringify({ size: [W, H], dpr: DPR, order: ORDER, k: await ev('window.__tide.campScene.k') }, null, 1));
} finally { chrome.kill(); }
