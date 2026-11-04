// Bottom-row reach and Auto fire capture (TB-223). Dev server up, then:
//   TIDE_URL=http://localhost:5231/ node tools/mobile-reach.mjs <port> <label> <outdir> [W H] [mode]   mode = finger | auto | manual (finger while Auto fire is on) | settings
//   INSETS=top,right,bottom,left (CSS px) emulates a notch / gesture-bar safe area. Prints HUD font, rect and tap-target measurements.
// Headless Chrome (--disable-gpu --use-angle=swiftshader), emulated Pixel 8 (DPR 2.625, touch). Puts a 3-orc pack on the lowest row, aims a
// thumb 40 CSS px above the screen bottom (clear of the gesture band) or leaves Auto fire on, and reports whether the pack was hit.
import { tmpdir } from 'node:os'; import { spawn } from 'node:child_process'; import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9351', label = 'shot', outdir = '.', W = '915', H = '412', mode = 'finger'] = process.argv; const vw = +W, vh = +H;
mkdirSync(outdir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-r-${port}-${Date.now()}`, '--headless=new', `--window-size=${vw},${vh}`, '--no-first-run', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = (await cdp("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true })).result; if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval"); return r.result.value; };
await cdp('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 2.625, mobile: true });
if (process.env.INSETS) { const [top, right, bottom, left] = process.env.INSETS.split(',').map(Number); await cdp('Emulation.setSafeAreaInsetsOverride', { insets: { top, right, bottom, left } }); }
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5231/' }); await sleep(7000);
await ev(`localStorage.setItem('tide.fullscreen','off'); 0`);
const touch = (type, pts) => cdp('Input.dispatchTouchEvent', { type, touchPoints: pts });
const shot = async (n) => { const s = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outdir}/${label}-${n}.png`, Buffer.from(s.result.data, 'base64')); };
// a 3-orc pack on the lowest spawn row (world y 430), standing still, plenty of hp; the bow is ready; no other orc on the plain
const setup = `(() => { const g = __tide.game, s = g.state; s.orcs.clear(); window.__pack = [];
  for (const [x, y] of [[520, 430], [545, 431], [498, 430]]) { const o = s.orcs.alloc(); Object.assign(o, { kind: 'grunt', x, y, hp: 1e6, maxhp: 1e6, spd: 0, r: 10, loot: 0, atk: 0, dead: false, burn: 0, chill: 0, stun: 0, hitT: 0, wob: 0, swingT: 0, champ: false }); window.__pack.push(o); }
  s.run.spawnT = 1e9; s.run.shotT[0] = 99; s.shots.clear(); g.autoFire = false; return JSON.stringify({ auto: g.autoFire, view: __tide.field.view }); })()`;
const info = JSON.parse(await ev(setup)); await sleep(2500);   // any impact ring from before the setup fades out first
if (mode === 'auto' || mode === 'manual') await ev('__tide.game.autoFire = true; 0');
const hp = () => ev(`window.__pack.reduce((a, o) => a + (1e6 - o.hp), 0)`);
const FY = vh - 40;   // thumb 40 CSS px above the bottom edge
if (mode === 'finger' || mode === 'manual') { await touch('touchStart', [{ x: info.view.ox + 520 * info.view.k, y: FY, id: 1 }]); }
await sleep(500); await shot('1-aim');
for (let i = 0; i < 40 && !(await hp()); i++) await sleep(100);   // wait for the first arrow to land
await shot('2-hit'); await sleep(1500);
const dmg = await hp(), t1 = await ev('__tide.game.state.t'); const aim = await ev(`JSON.stringify(__tide.game.shownAim ? __tide.game.shownAim() : __tide.game.aim)`);
if (mode === 'finger' || mode === 'manual') await touch('touchEnd', []);
console.log(JSON.stringify({ label, viewport: `${vw}x${vh}`, mode, autoFire: info.auto, view: info.view, fingerY: mode === 'finger' || mode === 'manual' ? FY : null, shownAim: JSON.parse(aim), circleRadius: await ev('__tide.game.state.stats.radius'), damageToBottomPack: Math.round(dmg), simT: +t1.toFixed(1), hit: dmg > 0 }));
const m = await ev(`(() => { const q = (s) => document.querySelector(s), r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
  const ids = ['#btn-auto-hud', '#btn-settings', '#hud-wall', '#hud-wave', '.hud .stats .stat:nth-child(1)', '.hud .stats .stat:nth-child(2)', '.hud-star'], rects = {}; for (const i of ids) rects[i] = r(q(i));
  const fonts = [...document.querySelectorAll('header *')].filter((e) => e.children.length === 0 && e.textContent.trim() && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).map((e) => ({ t: e.textContent.trim().slice(0, 18), f: getComputedStyle(e).fontFamily, px: getComputedStyle(e).fontSize }));
  const hb = Math.max(...[...document.querySelectorAll('header .hud > *, header > button')].map((e) => e.getBoundingClientRect().bottom));
  const overlap = []; const L = Object.entries(rects).filter(([k, v]) => v && v.w > 0); for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i][1], b = L[j][1]; if (a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b) overlap.push(L[i][0] + ' x ' + L[j][0]); }
  return JSON.stringify({ rects, fonts, hudBottom: Math.round(hb), hudPctOfHeight: +(hb / innerHeight * 100).toFixed(1), overlap, scrollW: document.documentElement.scrollWidth, innerW: innerWidth }); })()`);
console.log('MEASURE ' + m);
if (mode === 'settings') {   // tap the Settings plank with a real touch and capture the pane (Auto fire toggle and its tap target)
  const b = JSON.parse(m).rects['#btn-settings']; const pt = [{ x: b.x + b.w / 2, y: b.y + b.h / 2, id: 1 }];
  await touch('touchStart', pt); await touch('touchEnd', []); await sleep(1200); await shot('3-settings');
  console.log('SETTINGS ' + await ev(`(() => { const e = document.getElementById('btn-auto'), b = e.getBoundingClientRect(); return JSON.stringify({ mode: document.body.dataset.mode, autoBtn: { w: Math.round(b.width), h: Math.round(b.height), text: e.textContent, font: getComputedStyle(e).fontFamily } }); })()`));
}
chrome.kill();
