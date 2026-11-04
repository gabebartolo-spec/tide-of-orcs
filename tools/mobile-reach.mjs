// Reach, Auto fire and phone HUD capture (TB-223). Dev server up, then:
//   TIDE_URL=http://localhost:5231/ node tools/mobile-reach.mjs <port> <label> <outdir> [W H] [mode]
//   mode = finger   Auto turned OFF by a real tap on the HUD Auto plank, finger on the bottom pack
//          auto     Auto left at its stored default (ON for touch), no finger; bottom pack
//          top      Auto on, no finger; pack on the TOP spawn row (clear of the HUD hit boxes)
//          topfinger Auto off by tap, finger aims the top pack
//          manual   Auto ON, finger on a lone orc that is NOT auto's pick (auto prefers the 3-orc pack elsewhere); the lone orc must take the hit
//          autotap  tap Auto OFF then ON through the UI; reports aria-pressed, game.autoFire, localStorage after each tap
//          settings tap the Settings plank, scroll the pane to the Auto fire toggle, capture, report fonts of the whole pane
//          overflow wave 148 / 1.23B kills / Heartwood 123456 / starlight 987654321: the HUD must not overlap
//   INSETS=top,right,bottom,left (CSS px) emulates a notch / gesture-bar safe area.
// Headless Chrome (--disable-gpu --use-angle=swiftshader), emulated Pixel 8 (DPR 2.625, touch). Every tap is a real touch event (Input.dispatchTouchEvent);
// no game state is written to fake a result. Prints HUD font, rect, canopy-occlusion and tap-target measurements.
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
const rect = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; })()`);
const tap = async (sel) => { const b = await rect(sel); const p = [{ x: b.x + b.w / 2, y: b.y + b.h / 2, id: 1 }]; await touch('touchStart', p); await sleep(60); await touch('touchEnd', []); await sleep(300); };
const autoState = () => ev(`JSON.stringify({ ariaPressed: document.getElementById('btn-auto-hud').getAttribute('aria-pressed'), settingsBtn: document.getElementById('btn-auto').getAttribute('aria-pressed'), gameAutoFire: __tide.game.autoFire, stored: localStorage.getItem('tide.autofire'), hudText: document.getElementById('btn-auto-hud').textContent })`);
const orc = (x, y) => `(() => { const o = s.orcs.alloc(); Object.assign(o, { kind: 'grunt', x: ${x}, y: ${y}, hp: 1e6, maxhp: 1e6, spd: 0, r: 10, loot: 0, atk: 0, dead: false, burn: 0, chill: 0, stun: 0, hitT: 0, wob: 0, swingT: 0, champ: false }); return o; })()`;
// Sim layout (no state faked beyond placing still, tanky orcs). bottom pack: 3 orcs on the lowest row the spawner now uses (y 400 = H-80);
// top pack: 3 orcs on the top row (y 80). manual: a 3-orc pack at (520,400) that auto prefers, plus a LONE orc at (330, 240) that the finger takes.
const setup = `(() => { const g = __tide.game, s = g.state; s.orcs.clear(); window.__pack = []; window.__lone = null;
  const m = ${JSON.stringify(mode)};
  const pack = m === 'top' || m === 'topfinger' ? [[520, 80], [545, 81], [498, 80]] : [[520, 400], [545, 401], [498, 400]];
  for (const [x, y] of pack) window.__pack.push(${orc('x', 'y')});
  if (m === 'manual') window.__lone = ${orc(330, 240)}
  s.run.spawnT = 1e9; s.run.shotT[0] = 99; s.shots.clear(); return JSON.stringify({ view: __tide.field.view, cb: document.querySelector('canvas').getBoundingClientRect().bottom, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) }); })()`;
const info = JSON.parse(await ev(setup)); await sleep(2500);   // any impact ring from before the setup fades out first
const stateBefore = JSON.parse(await autoState());
let afterTaps = null;
if (mode === 'finger' || mode === 'topfinger') { await tap('#btn-auto-hud'); afterTaps = JSON.parse(await autoState()); }   // Auto OFF through the UI
if (mode === 'autotap') { await tap('#btn-auto-hud'); const off = JSON.parse(await autoState()); await shot('1-off'); await tap('#btn-auto-hud'); const on = JSON.parse(await autoState()); await shot('2-on'); afterTaps = { off, on }; }
const pk = () => ev(`window.__pack.reduce((a, o) => a + (1e6 - o.hp), 0)`), lone = () => ev(`window.__lone ? 1e6 - window.__lone.hp : 0`);
const k = info.view.k, ox = info.view.ox;
const fingerWorld = mode === 'manual' ? [330, 240] : mode === 'topfinger' ? [520, 80] : [520, 400];
// finger height: solve where a real thumb must sit so the circle lands on the target row (the lift fades to 0 within 3 rem of the bottom: data/touch.ts, touchAim.ts)
const liftAt = (y) => 3.5 * info.rem * Math.min(1, Math.max(0, (info.cb - 3 * info.rem - y) / (5.25 * info.rem)));
const want = fingerWorld[1] * k; let FY = want; for (let i = 0; i < 60; i++) FY = want + liftAt(FY);
const FX = ox + fingerWorld[0] * k; FY = Math.min(FY, info.cb - 2);
const base = { pack: await pk(), lone: await lone() };   // damage already dealt while the scene settled (auto fires then); only damage AFTER the finger lands counts
if (['finger', 'topfinger', 'manual'].includes(mode)) await touch('touchStart', [{ x: FX, y: FY, id: 1 }]);
await sleep(500); if (mode !== 'autotap') await shot('1-aim');
if (mode !== 'autotap' && mode !== 'settings' && mode !== 'overflow') for (let i = 0; i < 60 && !(mode === 'manual' ? (await lone()) > base.lone : (await pk()) > base.pack); i++) await sleep(100);
if (mode !== 'autotap') await shot('2-hit'); await sleep(1500);
let packWindow = null; if (mode === 'manual') { const p0 = await pk(); await sleep(3000); packWindow = Math.round((await pk()) - p0); }   // pack damage over 3 s of finger-held play after the lone orc is hit: must be 0 (arrows in flight at finger-down land earlier)
const dmgPack = (await pk()) - base.pack, dmgLone = (await lone()) - base.lone, t1 = await ev('__tide.game.state.t'); const aim = await ev(`JSON.stringify(__tide.game.shownAim ? __tide.game.shownAim() : __tide.game.aim)`);
if (['finger', 'topfinger', 'manual'].includes(mode)) await touch('touchEnd', []);
console.log(JSON.stringify({ label, viewport: `${vw}x${vh}`, mode, autoBefore: stateBefore, autoAfterUiTaps: afterTaps, view: info.view, finger: ['finger', 'topfinger', 'manual'].includes(mode) ? { x: Math.round(FX), y: Math.round(FY) } : null, shownAim: JSON.parse(aim), circleRadius: await ev('__tide.game.state.stats.radius'), packDamageIn3sWindow: packWindow, damagePackAfterFinger: Math.round(dmgPack), damageLoneAfterFinger: Math.round(dmgLone), simT: +t1.toFixed(1), hit: dmgPack + dmgLone > 0 }));
if (mode === 'overflow') {
  await ev(`(() => { const s = __tide.game.state; s.run.wave = 148; s.meta.lifetimeKills = 1.23e9; s.meta.heartwood = 123456; s.run.starlight = 987654321; return 0; })()`); await sleep(2500); await shot('3-overflow');
}
const m = await ev(`(() => { const q = (s) => document.querySelector(s), r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
  const ids = ['#btn-auto-hud', '#btn-settings', '#hud-wall', '#hud-wave', '.hud .stats .stat:nth-child(2)', '.hud-star'], rects = {}; for (const i of ids) rects[i] = r(q(i));
  const fonts = [...document.querySelectorAll('header *')].filter((e) => e.children.length === 0 && e.textContent.trim() && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).map((e) => ({ t: e.textContent.trim().slice(0, 18), f: getComputedStyle(e).fontFamily, px: getComputedStyle(e).fontSize, z: e.closest('.hud-wallbox') ? 'zoom .5' : '' }));
  const wl = q('#hud-wall-t'); const after = getComputedStyle(wl, '::after'); const wallLabel = { short: wl.dataset.short, afterPx: after.fontSize, zoomedPx: +(parseFloat(after.fontSize) * 0.5).toFixed(1) };
  const hb = Math.max(...[...document.querySelectorAll('header .hud > *, header > button')].map((e) => e.getBoundingClientRect().bottom));
  const overlap = []; const L = Object.entries(rects).filter(([k, v]) => v && v.w > 0); for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i][1], b = L[j][1]; if (a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b) overlap.push(L[i][0] + ' x ' + L[j][0]); }
  // canopy occlusion: the treeline strip is y 0..CAN css px (the lowest row of tree crowns in the field art); HUD hit/ink rects that reach into it count; columns covered / width, and the widest clear gap
  const CAN = 52, spans = L.filter(([k, v]) => v.y < CAN).map(([k, v]) => [v.x, v.r]).sort((a, b) => a[0] - b[0]); const merged = []; for (const s of spans) { const t = merged[merged.length - 1]; if (t && s[0] <= t[1]) t[1] = Math.max(t[1], s[1]); else merged.push([s[0], s[1]]); }
  const cov = merged.reduce((a, s) => a + s[1] - s[0], 0); let gap = 0, prev = 0; for (const s of merged) { gap = Math.max(gap, s[0] - prev); prev = s[1]; } gap = Math.max(gap, innerWidth - prev);
  const mute = r(q('#btn-mute-corner'));
  return JSON.stringify({ rects, fonts, wallLabel, hudBottom: Math.round(hb), hudPctOfHeight: +(hb / innerHeight * 100).toFixed(1), canopy: { stripCssPx: CAN, coveredPct: +(cov / innerWidth * 100).toFixed(1), widestClearGapPx: Math.round(gap), widestClearGapPct: +(gap / innerWidth * 100).toFixed(1) }, mute, overlap, scrollW: document.documentElement.scrollWidth, innerW: innerWidth }); })()`);
console.log('MEASURE ' + m);
if (mode === 'settings') {   // tap the Settings plank with a real touch, scroll the pane to the Auto fire toggle, capture, report the whole pane's fonts and the toggle's tap target
  await tap('#btn-settings'); await sleep(900);
  await ev(`document.getElementById('btn-auto').scrollIntoView({ block: 'center' }); 0`); await sleep(600); await shot('3-settings-auto');
  console.log('SETTINGS ' + await ev(`(() => { const e = document.getElementById('btn-auto'), b = e.getBoundingClientRect(), vis = b.top >= 0 && b.bottom <= innerHeight;
    const fonts = [...document.querySelectorAll('#pane-settings *')].filter((x) => x.children.length === 0 && x.textContent.trim() && getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().width > 0).map((x) => ({ t: x.textContent.trim().slice(0, 14), f: getComputedStyle(x).fontFamily, px: getComputedStyle(x).fontSize }));
    const bad = fonts.filter((x) => x.f !== 'Heartwood' || parseFloat(x.px) < 14);
    return JSON.stringify({ mode: document.body.dataset.mode, autoBtn: { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), text: e.textContent, fullyInView: vis }, paneLeafCount: fonts.length, notHeartwoodOrUnder14px: bad, minPx: Math.min(...fonts.map((x) => parseFloat(x.px))) }); })()`));
}
chrome.kill();
