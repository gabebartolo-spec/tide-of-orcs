// TB-220 treeline proof. Start `npm run dev -- --port 5260`, then: node tools/treeline-capture.mjs <debug port> <outDir> <tag>
// Headless Chrome (swiftshader): 1920x1080 at DPR 1/2/3 and 1280x720 at DPR 1/2, waves 1/10/25/50. Each shot waits out the wave-clear stamp,
// checks the three top plaques have text, and records the HUD band bottom and the highest crown (device-exact, from the canvas pixels).
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9361', outDir = 'previews/tb-220-canopy-trees/r8', tag = 'r8'] = process.argv;
mkdirSync(outDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-tl-${port}-${Date.now()}`,
  '--headless=new', '--disable-gpu', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const AUDIT = `(() => { const q = (s) => document.querySelector(s); const rb = (e) => { const r = e.getBoundingClientRect(); return { y0: Math.round(r.top), y1: Math.round(r.bottom), x0: Math.round(r.left), x1: Math.round(r.right) }; };
  const hud = q('#hud'); let bottom = 0; for (const e of hud.querySelectorAll('.hud-wall, .hud-wave, .hud-star, button, .stats, [id^=btn]')) { const r = e.getBoundingClientRect(); if (r.width > 1) bottom = Math.max(bottom, r.bottom); }
  const wave = q('#hud-wave'), st = q('#hud-stamp');
  return { hudBottom: Math.round(bottom), waveText: q('#k-wave').textContent + ' ' + q('#st-wave').textContent, stampHidden: st.hidden, wave: rb(wave), bar: q('#hud-wall-t').textContent }; })()`;
const R = {};
await cdp('Page.enable');
for (const [W, H, dpr] of [[1920, 1080, 1], [1920, 1080, 2], [1920, 1080, 3], [1280, 720, 1], [1280, 720, 2]]) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: false });
  await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5260/' }); for (let i = 0; i < 60 && !(await ev('!!window.__tide')); i++) await sleep(500); await sleep(3000);
  for (const w of [1, 10, 25, 50]) {
    await ev(`(() => { clearInterval(window.__pin); const s = window.__tide.game.state; window.__pin = setInterval(() => { s.run.wave = ${w}; s.run.barHp = s.stats.barMax; s.run.fallen = false; }, 50); })()`);
    let a; for (let i = 0; i < 40; i++) { await sleep(500); a = await ev(AUDIT); if (a.stampHidden && /\d/.test(a.waveText)) break; }
    await sleep(2500);
    await sleep(700);
    a = await ev(AUDIT); const k = `${W}x${H}d${dpr}_w${w}`; R[k] = a;
    const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${tag}_${W}d${dpr}_w${w}.png`, Buffer.from(r.result.data, 'base64'));
    console.log(k, JSON.stringify(a));
  }
}
writeFileSync(`${outDir}/audit.json`, JSON.stringify(R, null, 1));
chrome.kill(); process.exit(0);
