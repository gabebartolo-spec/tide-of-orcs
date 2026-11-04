// Pixel 8 touch-input acceptance (TB-218 slice I). Start the dev server (npm run dev -- --port 5231), then run:
//   TIDE_URL=http://localhost:5231/ node tools/mobile-input.mjs <debug port> <out.json> [shot.png]
// Real Chrome, headless, emulated Pixel 8 landscape (915x412, DPR 2.625, touch). Prints one JSON object of measured numbers.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [,, port = '9331', out, shot] = process.argv;
const W = 915, H = 412;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-mi-${port}-${Date.now()}`,
  '--headless=new', `--window-size=${W},${H}`, '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval'); return r.result.result.value; };
await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2.625, mobile: true });
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await cdp('Page.enable');
await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5231/' }); await sleep(3500);
await ev(`localStorage.setItem('tide.fullscreen','off')`);   // keep the tap tests out of fullscreen

// touch helpers: `pts` is the full list of active fingers [{id,x,y}]
const touch = (type, pts) => cdp('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id })) });
const aim = () => ev(`(() => { const a = __tide.game.aim; return a ? { x: a.x, y: a.y } : null; })()`);
const R = {};
const f1 = { id: 1, x: 500, y: 250 }, f2 = { id: 2, x: 600, y: 250 };
// 1. two fingers, lift the first: the second takes the aim over and clears it on lift
await touch('touchStart', [f1]); await touch('touchStart', [f1, f2]); await touch('touchEnd', [f1]);
await touch('touchMove', [{ ...f2, x: 620 }]); await sleep(40); R.promotedAimAfterMove = !!(await aim());
await touch('touchEnd', [{ ...f2, x: 620 }]); await sleep(60); R.aimAfterDownDownUpMoveUp = await aim();
// 2. reverse order lift
await touch('touchStart', [f1]); await touch('touchStart', [f1, f2]); await touch('touchEnd', [f2]); await touch('touchEnd', [f1]); await sleep(60);
R.aimAfterReverseLift = await aim();
// 3. pen hover with no contact
await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 500, y: 200, pointerType: 'pen', button: 'none', buttons: 0 }); await sleep(60);
R.penHoverAim = await aim();
await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 500, y: 200, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1 }); await sleep(60);
R.penContactAim = await aim();
await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 500, y: 200, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 }); await sleep(60);
R.penAfterUpAim = await aim();
// 4. rule 2: no finger down, shots in 5 s
await ev(`(() => { const g = __tide.game; window.__loose = 0; const n = g.noteEvents.bind(g); g.noteEvents = (e) => { for (const x of e) if (x.t === 'loose') window.__loose++; return n(e); }; })()`);
await sleep(5000); R.shotsIdle5s = await ev('window.__loose');
// 5. HUD does not eat touches
R.elementAtHud = await ev(`(() => { const e = document.elementFromPoint(100, 40); return e ? (e.id || e.tagName) : null; })()`);
await touch('touchStart', [{ id: 1, x: 100, y: 40 }]); await sleep(60); R.aimFromHudStart = await aim(); await touch('touchEnd', []); await sleep(60);
// 6. aim never under the HUD: sweep the finger over the whole height
R.view = await ev('JSON.stringify(__tide.field.view)');
let minY = 1e9, maxY = -1e9;
for (let y = 2; y <= H - 1; y += 14) { await touch('touchStart', [{ id: 1, x: 460, y }]); await sleep(30); const a = await aim(); await touch('touchEnd', []); await sleep(20);
  if (a) { const v = JSON.parse(R.view), sy = v.oy + a.y * v.k; minY = Math.min(minY, sy); maxY = Math.max(maxY, sy); } }
R.aimScreenYMin = +minY.toFixed(1); R.aimScreenYMax = +maxY.toFixed(1);
// 7. bottom edge reach and mid-screen lift (world y; H=480)
await touch('touchStart', [{ id: 1, x: 460, y: 410 }]); await sleep(40); R.bottomReachWorldY = (await aim())?.y ?? null; await touch('touchEnd', []); await sleep(40);
await touch('touchStart', [{ id: 1, x: 460, y: 300 }]); await sleep(40); { const a = await aim(), v = JSON.parse(R.view); R.midLiftPx = a ? +(300 - (v.oy + a.y * v.k)).toFixed(1) : null; } await touch('touchEnd', []); await sleep(40);
// 8. edge swipe starts in the outer 24px / bottom inset
await touch('touchStart', [{ id: 1, x: 8, y: 250 }]); await sleep(40); R.aimEdgeLeft = await aim(); await touch('touchMove', [{ id: 1, x: 300, y: 250 }]); await sleep(40); R.aimEdgeLeftAfterSlide = await aim(); await touch('touchEnd', []); await sleep(40);
await touch('touchStart', [{ id: 1, x: W - 6, y: 250 }]); await sleep(40); R.aimEdgeRight = await aim(); await touch('touchEnd', []); await sleep(40);
// 9. Settings: tap opens; down on it and up elsewhere does not
const mode = () => ev('document.body.dataset.mode');
const sb = JSON.parse(await ev(`(() => { const r = document.getElementById('btn-settings').getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }); })()`));
R.settingsBtn = sb;
await touch('touchStart', [{ id: 1, x: sb.x, y: sb.y }]); await touch('touchMove', [{ id: 1, x: 500, y: 300 }]); await touch('touchEnd', []); await sleep(200); R.modeAfterDragOff = await mode();
await touch('touchStart', [{ id: 1, x: sb.x, y: sb.y }]); await touch('touchEnd', []); await sleep(300); R.modeAfterTap = await mode();
R.muteSettingsBtn = await ev(`(() => { const b = document.getElementById('btn-mute'); if (!b) return null; const r = b.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })()`);
if (shot) { const s0 = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(shot.replace('.png', '-settings.png'), Buffer.from(s0.result.data, 'base64')); }
// 10. 10 ms touch overlapping a tick: count trials that fire the bow (settings is open: go back to the run view first)
await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5231/' }); await sleep(3000);
await ev(`(() => { const g = __tide.game; window.__loose = 0; const n = g.noteEvents.bind(g); g.noteEvents = (e) => { for (const x of e) if (x.t === 'loose') window.__loose++; return n(e); }; })()`);
let hits = 0;
for (let i = 0; i < 10; i++) {
  await ev('window.__loose = 0; __tide.game.state.run.shotT[0] = 99; __tide.game.state.run.fallen = false; 0'); await sleep(40 + i * 7);  // vary the phase against the 16.7 ms frame
  await Promise.all([touch('touchStart', [{ id: 1, x: 500, y: 250 }]), touch('touchEnd', [{ id: 1, x: 500, y: 250 }])]); await sleep(150);
  if ((await ev('window.__loose')) > 0) hits++;
}
R.quickTapShots = `${hits}/10`;
// 11. context menu: nothing is left default-allowed (synthetic long-press menu on the field, HUD, tree and satchel)
R.contextmenuAllowed = await ev(`(() => { let n = 0; for (const e of [document.getElementById('game'), document.getElementById('tree'), document.querySelector('header'), document.getElementById('hud'), document.getElementById('sat-grid'), document.getElementById('sat-detail'), document.querySelector('img')]) { if (!e) continue; const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); e.dispatchEvent(ev); if (!ev.defaultPrevented) n++; } return n; })()`);
// 12. audio unlock on one tap, mute sync, lifecycle
await touch('touchStart', [{ id: 1, x: 500, y: 250 }]); await touch('touchEnd', []); await sleep(400);
R.audioState = await ev(`(() => { const a = __tide.audio; return a ? (a.ctx ? a.ctx.state : 'no-ctx') : 'no-handle'; })()`);
R.muteButtons = await ev(`JSON.stringify(['btn-mute','btn-mute-corner'].map((i) => { const b = document.getElementById(i); if (!b) return null; const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), shown: r.width > 0 }; }))`);
R.lifecycle = await ev(`(async () => {
  const g = __tide.game, s = g.state; window.__dts = []; const d0 = __tide.field.draw.bind(__tide.field); __tide.field.draw = (a, dt, b) => { window.__dts.push(+dt.toFixed(3)); return d0(a, dt, b); }; let saves = 0; const sv = g.save.bind(g); g.save = () => { saves++; return sv(); };
  let hidden = false; Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  let n = 0; const tk = g.tick.bind(g); g.tick = (dt) => { n++; return tk(dt); };
  let burst = []; let mark = n; const rec = () => { burst.push(n - mark); mark = n; requestAnimationFrame(rec); }; requestAnimationFrame(rec);
  await new Promise((r) => setTimeout(r, 300)); burst = [];
  const t0 = s.t;
  // a hidden tab: animation frames stop (held here), come back after 3 s with the visibility event first, as Chrome does
  const raf0 = window.requestAnimationFrame.bind(window); const held = []; let hold = true;
  window.requestAnimationFrame = (cb) => (hold ? (held.push(cb), 0) : raf0(cb));
  await new Promise((r) => setTimeout(r, 120));
  hidden = true; document.dispatchEvent(new Event('visibilitychange')); const savesOnHidden = saves;
  await new Promise((r) => setTimeout(r, 3000));
  hidden = false; document.dispatchEvent(new Event('visibilitychange')); window.__dts = []; hold = false; window.requestAnimationFrame = window.requestAnimationFrame; for (const cb of held.splice(0)) raf0(cb);
  await new Promise((r) => setTimeout(r, 400));
  const a = __tide.audio?.ctx;
  return JSON.stringify({ savesOnHidden, simSecondsAdvancedAcrossHide: +(s.t - t0).toFixed(3), maxTicksInOneFrameAfterShow: Math.max(...burst), firstDtAfterShow: window.__dts[0] ?? null, audioAfterShow: a ? a.state : 'n/a' }); })()`);
R.mutedSync = await ev(`(() => { const b = document.getElementById('btn-mute'), c = document.getElementById('btn-mute-corner'); if (!b || !c) return 'missing'; b.click(); const a = [b.getAttribute('aria-pressed'), c.getAttribute('aria-pressed')]; dispatchEvent(new KeyboardEvent('keydown', { key: 'm' })); const m = [b.getAttribute('aria-pressed'), c.getAttribute('aria-pressed')]; return JSON.stringify({ afterButton: a, afterKeyM: m }); })()`);
if (shot) { const s = await cdp('Page.captureScreenshot', { format: 'png' }); (await import('node:fs')).writeFileSync(shot, Buffer.from(s.result.data, 'base64')); }
const text = JSON.stringify(R, null, 1); console.log(text); if (out) writeFileSync(out, text);
ws.close(); chrome.kill();
