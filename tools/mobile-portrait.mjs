// Pixel 8 portrait + rotate captures (TB-218 r6). TIDE_URL=http://localhost:5235/ node tools/mobile-portrait.mjs <debug port> <shotDir>
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9351', shotDir = 'previews/tb-218-mobile/r6'] = process.argv; mkdirSync(shotDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-pt-${port}-${Date.now()}`,
  '--headless=new', '--window-size=412,915', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const shot = async (n) => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${shotDir}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true });
await cdp('Page.navigate', { url: process.env.TIDE_URL }); await sleep(4000);
await shot('412x915-portrait-prompt');
await cdp('Emulation.setDeviceMetricsOverride', { width: 915, height: 412, deviceScaleFactor: 2.625, mobile: true }); await sleep(1500);
await shot('915x412-after-rotate');
await cdp('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true }); await sleep(1000);
await shot('412x915-back-to-portrait');
chrome.kill(); process.exit(0);
