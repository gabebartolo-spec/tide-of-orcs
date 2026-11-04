// Phone HUD capture + font audit (TB-224). Start the dev server (npx vite --port 5242), then:
//   TIDE_URL=http://localhost:5242/ node tools/mobile-hud-shot.mjs <debug port> <outDir> [label]
// Real Chrome, headless, Pixel 8: 915x412 and 915x360 DPR 2.625 (touch, landscape), 412x915 (portrait, no touch so the game renders).
// Sets the director's screenshot state (wave 3, wall 13/150, starlight 42, 20 slain, 0 Heartwood), saves PNGs, prints a font and footprint audit.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port = '9351', outDir = '.', label = 'shot'] = process.argv;
mkdirSync(outDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-hud-${port}-${Date.now()}`,
  '--headless=new', '--window-size=915,412', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval'); return r.result.result.value; };
await cdp('Page.enable');
const FONTS = `(async () => {
  await document.fonts.ready;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let n = e; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || n.hidden) return false; } return true; };
  const bad = [], seen = new Set(); let n = 0; const missing = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t; (t = w.nextNode());) { const s = t.nodeValue.trim(); if (!s) continue; const e = t.parentElement; if (!vis(e)) continue; n++;
    const cs = getComputedStyle(e), fam = cs.fontFamily; if (!/^"?Heartwood"?$/.test(fam.trim())) { const k = (e.id || e.className || e.tagName) + '|' + fam; if (!seen.has(k)) { seen.add(k); bad.push({ el: (e.id || e.className || e.tagName).toString().slice(0, 28), fam: fam.slice(0, 40), t: s.slice(0, 14) }); } }
    for (const ch of s) if (!document.fonts.check('16px Heartwood', ch)) missing.add(ch); }
  return { texts: n, nonHeartwood: bad, missingGlyphs: [...missing], heartwoodLoaded: [...document.fonts].filter((f) => f.family.replace(/"/g, '') === 'Heartwood' && f.status === 'loaded').length };
})()`;
const BOX = `(() => { const r = (s) => { const e = document.querySelector(s); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
  const px = (s) => { const e = document.querySelector(s); return e ? +parseFloat(getComputedStyle(e).fontSize).toFixed(1) : null; };
  return { hud: r('#hud'), wall: r('#hud-wall'), wave: r('#hud-wave'), settings: r('#btn-settings'), mute: r('#btn-mute-corner'), canvas: r('#game'), fs: { wall: px('#hud-wall-t'), wave: px('#st-wave'), kills: px('#st-kills'), kk: px('#k-kills'), star: px('#st-star'), set: px('#btn-settings') } }; })()`;
const out = {};
const TAGS = (process.env.TAGS ?? 'l412,l360,p915').split(',');
for (const [W, H, touch, tag] of [[915, 412, true, 'l412'], [915, 360, true, 'l360'], [412, 915, false, 'p915']].filter((x) => TAGS.includes(x[3]))) {
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: touch ? 5 : 0 });
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: touch ? 'coarse' : 'fine' }, { name: 'any-pointer', value: touch ? 'coarse' : 'fine' }, { name: 'hover', value: touch ? 'none' : 'hover' }] });
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2.625, mobile: touch, screenWidth: W, screenHeight: H });
  await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5242/' }); await sleep(3500);
  await ev(`localStorage.setItem('tide.fullscreen','off')`);
  if (process.env.DEBUG_MQ) console.log(tag, await ev(`[matchMedia('(pointer: coarse)').matches, matchMedia('(orientation: portrait)').matches, innerWidth, innerHeight].join()`));
  await ev(`(() => { const { game, panel } = window.__tide; panel.setMode('run'); const r = game.state.run; r.wave = 3; r.starlight = 42; r.kills = 20; r.barHp = 13; })()`);
  await sleep(1500);
  const shot = async (name) => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${label}-${tag}-${name}.png`, Buffer.from(r.result.data, 'base64')); };
  await shot('run');
  if (process.env.EXTRA) { await ev(process.env.EXTRA); await sleep(900); await shot('extra'); await ev(`window.__tide.panel.setMode('run')`); }
  out[tag] = { fonts: await ev(FONTS), box: await ev(BOX) };
  for (const [name, setup] of [['settings', `window.__tide.panel.setMode('settings'); window.__tide.panel.setTab('settings')`], ['grove', `window.__tide.panel.setMode('camp'); window.__tide.panel.setTab('grove')`], ['satchel', `window.__tide.panel.setTab('satchel')`], ['camp', `window.__tide.panel.setTab('camp')`], ['replant', `window.__tide.panel.setTab('prestige')`]]) {
    await ev(setup); await sleep(700); out[tag][name] = (await ev(FONTS)); if (tag === 'l412') await shot(name);
  }
  await ev(`window.__tide.panel.setMode('run')`); await sleep(500);
  await ev(`(() => { const { game, panel } = window.__tide; game.state.run.fallen = true; panel.showFallen(); })()`); await sleep(2500); out[tag].fallen = await ev(FONTS); await shot('fallen');
}
writeFileSync(`${outDir}/${label}-audit.json`, JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) { console.log(k, JSON.stringify(v.box)); for (const [s, f] of Object.entries(v)) if (f.nonHeartwood) console.log('  ', s, 'texts', f.texts, 'nonHW', JSON.stringify(f.nonHeartwood), 'missing', JSON.stringify(f.missingGlyphs)); }
chrome.kill(); process.exit(0);
