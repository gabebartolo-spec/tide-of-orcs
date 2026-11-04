// TB-226 Heartwood-only proof. Start `npx vite --port 5261` IN THIS WORKTREE, then:
//   TIDE_URL=http://localhost:5261/ node tools/font-audit.mjs [debug port] [outDir]
// First it checks the server really serves THIS worktree (the woff2 bytes and the --body token must match the local files), so a stale
// server from another worktree can never give a verdict.
// Headless Chrome (swiftshader) at 1920x1080, 1280x720, phone 915x412 landscape and 412x915 portrait. On every screen it walks the whole DOM
// (every element's computed font-family must start with Heartwood and document.fonts.check must pass), checks every visible character
// against Heartwood's cmap, flags clipped or off-screen text, and hooks CanvasRenderingContext2D so every ctx.font assignment and every
// fillText is logged (a canvas draw before the face is loaded counts as a failure; canvas text cut by the canvas edge fails too). Screens include the boss button
// ready and mid boss fight, the tree tooltip plate, the Camp building card, Export filled, sci number format. Also fails on text that spills out of its
// own box or past an overflow:hidden ancestor. Native <select> popups cannot be screenshot headless: every <option>'s computed face is checked instead. Writes audit.json and one screenshot per screen.
// ONLY=915 limits to one viewport. Exit code 1 if anything fails. Repeatable: rerun after any UI change.
import { tmpdir } from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [,, port = '9361', outDir = 'previews/tb-226'] = process.argv;
mkdirSync(outDir, { recursive: true });
const URL_ = process.env.TIDE_URL ?? 'http://localhost:5261/';
const covered = new Set(JSON.parse(execFileSync('python', ['-c',
  "import json;from fontTools.ttLib import TTFont;print(json.dumps(sorted(TTFont('src/ui/fonts/heartwood-400.woff2').getBestCmap().keys())))"], { encoding: 'utf8' })));

// The server must be this worktree's: same Heartwood bytes, same --body token (a stale server on another port once gave a false verdict).
{ const sha = (b) => createHash('sha1').update(b).digest('hex');
  const font = Buffer.from(await (await fetch(new URL('src/ui/fonts/heartwood-400.woff2', URL_))).arrayBuffer());
  const css = await (await fetch(new URL('src/ui/style.css', URL_))).text();
  const local = readFileSync('src/ui/style.css', 'utf8');
  const tail = JSON.stringify(local.trim().slice(-200)).slice(1, -1);
  const why = [];
  if (sha(font) !== sha(readFileSync('src/ui/fonts/heartwood-400.woff2'))) why.push('woff2 differs from this worktree');
  if (!/--body:\s*[\\]?"Heartwood[\\]?"/.test(css)) why.push('served --body is not Heartwood');
  if (!css.includes(tail)) why.push('served style.css does not end like this worktree\'s style.css');
  if (why.length) { console.error('font-audit: ' + URL_ + ' is not this worktree: ' + why.join('; ')); process.exit(3); } }
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-font-${port}-${Date.now()}`,
  '--headless=new', '--disable-gpu', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const guard = setTimeout(() => { console.error('font-audit: timed out'); chrome.kill(); process.exit(2); }, 420000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const shot = async (name) => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.data ?? r.result.data, 'base64')); };

// Installed before any page script: logs every canvas font assignment and text draw, and flags canvas text that runs past its canvas edge.
const HOOK = `(() => {
  const L = window.__fontLog = { fonts: {}, draws: 0, unloadedDraws: 0, chars: {}, clip: [] };
  const P = CanvasRenderingContext2D.prototype, d = Object.getOwnPropertyDescriptor(P, 'font'), mt = P.measureText;
  Object.defineProperty(P, 'font', { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); L.fonts[this.font] = (L.fonts[this.font] || 0) + 1; } });
  for (const fn of ['fillText', 'strokeText', 'measureText']) { const o = P[fn];
    P[fn] = function (t, x, ...a) { L.draws++; if (!document.fonts.check(this.font)) L.unloadedDraws++; for (const ch of String(t)) L.chars[ch] = 1;
      if (fn !== 'measureText' && L.clip.length < 30 && this.canvas.isConnected && this.canvas.offsetParent !== null && this.canvas.getBoundingClientRect().width > 50 && !(this.canvas.width === 300 && this.canvas.height === 150) && !(window.__tide && this.canvas === window.__tide.tree.canvas && !(window.__tide.tree.full && !matchMedia('(pointer: coarse)').matches))) { const w = mt.call(this, String(t)).width, al = this.textAlign, x0 = al === 'center' ? x - w / 2 : al === 'right' || al === 'end' ? x - w : x, tr = this.getTransform();
        const X0 = tr.a * x0 + tr.e, X1 = tr.a * (x0 + w) + tr.e; if (X0 < -1 || X1 > this.canvas.width + 1) L.clip.push({ t: String(t).slice(0, 24), x0: Math.round(X0), x1: Math.round(X1), cw: this.canvas.width }); }
      return o.call(this, t, x, ...a); }; }
})()`;
await cdp('Page.enable');
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });

const AUDIT = `(() => {
  const out = { wrongFamily: [], chars: {}, clipped: [], offscreen: [], pseudo: [], spill: [] };
  const first = (f) => f.split(',')[0].trim().replace(/^["']|["']$/g, '');
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let n = e; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || n.hidden || +cs.opacity === 0) return false; } return true; };
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).join('.') : '')).slice(0, 60);
  const addChars = (s, e) => { for (const ch of s) if (!/\\s/.test(ch)) { const a = (out.chars[ch] ||= []); if (a.length < 3) a.push(name(e)); } };
  let n = 0;
  for (const e of document.querySelectorAll('body, body *')) {
    if (['SCRIPT', 'STYLE'].includes(e.tagName)) continue;
    n++; const cs = getComputedStyle(e);
    if (first(cs.fontFamily) !== 'Heartwood') out.wrongFamily.push({ el: name(e), family: cs.fontFamily });
    for (const ps of ['::before', '::after']) { const pc = getComputedStyle(e, ps), c = pc.content;
      if (c && c !== 'none' && c !== 'normal' && c !== '""') { out.pseudo.push({ el: name(e) + ps, content: c, family: pc.fontFamily }); if (first(pc.fontFamily) !== 'Heartwood') out.wrongFamily.push({ el: name(e) + ps, family: pc.fontFamily }); if (vis(e)) addChars(c.replace(/^"|"$/g, ''), e); } }
    if (!vis(e)) continue;
    let text = [...e.childNodes].filter((c) => c.nodeType === 3 && c.nodeValue.trim()).map((c) => c.nodeValue).join('');
    if (e.tagName === 'INPUT' && e.type !== 'range') text += e.value + (e.placeholder || '');
    if (e.tagName === 'TEXTAREA') text += e.value;
    if (e.tagName === 'SELECT') { text += e.selectedOptions[0]?.textContent ?? ''; for (const o of e.options) { addChars(o.textContent, o); const of = getComputedStyle(o).fontFamily; if (first(of) !== 'Heartwood') out.wrongFamily.push({ el: name(o), family: of }); } }
    if (!text.trim()) continue;
    addChars(text, e); const r = e.getBoundingClientRect();
    if (cs.overflowX === 'hidden' && e.scrollWidth > e.clientWidth + 1 && !['HTML', 'BODY'].includes(e.tagName)) out.clipped.push({ el: name(e), sw: e.scrollWidth, cw: e.clientWidth, t: text.trim().slice(0, 24) });
    // text that runs out of its own box (nowrap label over its neighbour) or past an overflow:hidden ancestor
    for (const c of e.childNodes) { if (c.nodeType !== 3 || !c.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(c); const tr = rg.getBoundingClientRect(); if (tr.width < 1) continue;
      if (tr.left >= innerWidth - 1 || tr.right <= 1) continue; const pr = parseFloat(cs.paddingRight) || 0, bw = parseFloat(cs.borderRightWidth) || 0;
      if (cs.display !== 'inline' && tr.right > r.right - bw + 1.5 && cs.overflowX === 'visible') out.spill.push({ el: name(e), over: Math.round(tr.right - (r.right - bw)), t: text.trim().slice(0, 24) });
      for (let a = e; a && a !== document.body; a = a.parentElement) { const ac = getComputedStyle(a); if (ac.overflowX === 'hidden' || ac.overflowX === 'clip') { const ar = a.getBoundingClientRect(); if (tr.right > ar.right + 1.5 || tr.left < ar.left - 1.5) { out.clipped.push({ el: name(e) + ' in ' + name(a), sw: Math.round(tr.right), cw: Math.round(ar.right), t: text.trim().slice(0, 24) }); break; } } } }
    if (r.right > innerWidth + 1 || r.left < -1) { let sc = false; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(a).overflowX)) { sc = true; break; } } if (!sc) out.offscreen.push({ el: name(e), l: Math.round(r.left), r: Math.round(r.right), t: text.trim().slice(0, 24) }); }
  }
  for (const b of document.querySelectorAll('button, .ghost, .stat, .hud-wave, .hud-wall, header')) { const r = b.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || b.offsetParent === null) continue; const cs = getComputedStyle(b); if (cs.visibility === 'hidden') continue; if (r.right > innerWidth + 1 || r.left < -1) { let sc = false; for (let a = b.parentElement; a && a !== document.body; a = a.parentElement) if (/(auto|scroll)/.test(getComputedStyle(a).overflowX)) { sc = true; break; } if (!sc) out.offscreen.push({ el: 'box ' + name(b), l: Math.round(r.left), r: Math.round(r.right), t: '' }); } }
  out.elements = n; out.fontsCheck = document.fonts.check('16px Heartwood') && document.fonts.check('1rem Heartwood');
  return out;
})()`;

const R = {}; const fails = [];
const H = (code) => `(() => { const { game, panel, tree, field } = window.__tide; ${code} })()`;
async function screen(key, name, setup, wait = 700, boot = false) {
  await ev('window.__fontLog.clip.length = 0; 1');
  if (setup) await ev(setup);
  await sleep(wait);
  const a = await ev(AUDIT); const cv = await ev('JSON.parse(JSON.stringify(window.__fontLog))');
  const missing = Object.entries(a.chars).filter(([ch]) => !covered.has(ch.codePointAt(0))).map(([ch, els]) => ({ ch, cp: 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'), in: els }));
  const canvasMissing = Object.keys(cv.chars).filter((ch) => !/\s/.test(ch) && !covered.has(ch.codePointAt(0)));
  const badCanvasFonts = Object.keys(cv.fonts).filter((f) => !/\bHeartwood$/.test(f));
  const r = { charsSeen: Object.keys(a.chars).sort().join(''), elements: a.elements, wrongFamily: a.wrongFamily, fontsCheck: a.fontsCheck, missingGlyphs: missing, canvasMissingGlyphs: canvasMissing, clipped: a.clipped, spill: a.spill, canvasClipped: cv.clip, offscreen: a.offscreen, pseudo: a.pseudo,
    canvas: { fonts: cv.fonts, draws: cv.draws, unloadedDraws: cv.unloadedDraws, badFonts: badCanvasFonts } };
  (R[key] ||= {})[name] = r; await shot(`${key}-${name}`);
  const bad = [];
  if (a.wrongFamily.length) bad.push(`${a.wrongFamily.length} non-Heartwood elements (${a.wrongFamily.slice(0, 3).map((w) => w.el + ' ' + w.family).join('; ')})`);
  if (!a.fontsCheck && !boot) bad.push('document.fonts.check false');
  if (missing.length) bad.push('missing glyphs ' + missing.map((m) => m.ch + m.cp).join(' ') + ' in ' + missing.map((m) => m.in[0]).join(','));
  if (canvasMissing.length) bad.push('canvas missing glyphs ' + canvasMissing.join(''));
  if (badCanvasFonts.length) bad.push('canvas fonts ' + badCanvasFonts.join('|'));
  if (cv.unloadedDraws) bad.push(cv.unloadedDraws + ' canvas draws before Heartwood loaded');
  if (a.clipped.length) bad.push(`${a.clipped.length} clipped (${a.clipped.slice(0, 3).map((c) => c.el + ' ' + c.sw + '>' + c.cw).join('; ')})`);
  if (a.spill.length) bad.push(`${a.spill.length} text spills out of its box (${a.spill.slice(0, 3).map((c) => c.el + ' +' + c.over + 'px ' + c.t).join('; ')})`);
  if (cv.clip.length) bad.push(`${cv.clip.length} canvas texts cut by the canvas edge (${cv.clip.slice(0, 3).map((c) => c.t + ' ' + c.x0 + '..' + c.x1 + '/' + c.cw).join('; ')})`);
  if (a.offscreen.length) bad.push(`${a.offscreen.length} off-screen (${a.offscreen.slice(0, 3).map((c) => c.el + ' ' + c.l + '..' + c.r).join('; ')})`);
  r.ok = !bad.length; if (bad.length) fails.push(`${key} ${name}: ${bad.join(' | ')}`);
}

const LOOT = `(async () => { const lr = await import('/src/sim/lootRoll.ts'); const { game, panel } = window.__tide; const s = game.state; let it = null;
  for (let i = 0; i < 800 && !it; i++) it = lr.rollDrop(s.lootRng, s.meta.loot, 'brute', 40, 1, s.stats); if (it) panel.lootBanner(it); return !!it; })()`;
const PLATE = `(async () => { const { NODES } = await import('/src/data/skillTree.ts'); const { tree } = window.__tide; const r = tree.canvas.getBoundingClientRect(), u = tree.ui; let best = null, bd = 1e9;
  for (const n of NODES) { const sx = (n.x - tree.cam.x) * tree.cam.z, sy = (n.y - tree.cam.y) * tree.cam.z; if (sx < 40 || sy < 60 || sx > r.width / u - 40 || sy > r.height / u - 40) continue; const d = Math.hypot(sx - r.width / u / 2, sy - r.height / u / 2); if (d < bd) { bd = d; best = [r.left + sx * u, r.top + sy * u]; } }
  if (!best) return 'no node'; for (const t of ['mousemove', 'click']) tree.canvas.dispatchEvent(new MouseEvent(t, { clientX: best[0], clientY: best[1], bubbles: true })); return !!document.querySelector('.plate:not([hidden])'); })()`;
const BAG = `(async () => { const lr = await import('/src/sim/lootRoll.ts'); const { game, panel } = window.__tide; const s = game.state; const l = s.meta.loot; let n = 0;
  for (let i = 0; i < 800 && n < 24; i++) { const it = lr.rollDrop(s.lootRng, l, i % 2 ? 'brute' : 'grunt', 40, 1, s.stats); if (it) { l.items.push(it); n++; } } s.meta.heartwood = 80; panel.update(); return n; })()`;

const VIEWS = [['1920x1080', 1920, 1080, false, 1], ['1280x720', 1280, 720, false, 1], ['915x412', 915, 412, true, 2.625], ['412x915-portrait', 412, 915, true, 2.625]];
for (const [key, W, Hh, mobile, dpr] of VIEWS) {
  if (process.env.ONLY && !key.startsWith(process.env.ONLY)) continue;
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: Hh, deviceScaleFactor: dpr, mobile, screenWidth: W, screenHeight: Hh });
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 0 });
  await cdp('Page.navigate', { url: 'about:blank' }); await sleep(200);
  await cdp('Page.navigate', { url: URL_ }); await sleep(250);
  // loading screen: the very first frames, before the face may have arrived. The canvas must not draw text in a fallback.
  for (let i = 0; i < 40 && (await ev('document.readyState')) !== 'complete'; i++) await sleep(50);   // page and stylesheet are in; the face may still be loading
  await screen(key, '00-boot', null, 30, true);
  await sleep(3500);
  await ev(`localStorage.setItem('tide.fullscreen','off'); 1`);
  if (key.endsWith('portrait')) { await screen(key, '01-rotate-prompt', null, 300); continue; }
  await ev(H(`game.state.run.starlight = 5000; game.setAim(560, 300); panel.setMode('run'); panel.update(); return 1;`)); await sleep(4500);
  await screen(key, '01-run-hud', null, 300);
  await ev(H(`game.state.stats.barMax = 1e6; game.state.run.barHp = 1e6; game.state.run.fallen = false; document.getElementById('fallen').hidden = true; return 1;`));   // hold the wall so the capture is the fight, not the fallen board
  await screen(key, '01b-boss-ready', H(`game.state.run.wave = 100; panel.update(); return 1;`), 500);
  await screen(key, '01c-boss-fight', `document.getElementById('dep-boss').click(); 1`, 2500);
  await ev(H(`panel.toast('The wall holds. Hold the line.'); return 1;`)); await ev(LOOT);
  await screen(key, '02-toast-loot', null, 900);
  await screen(key, '03-fallen', H(`game.state.run.fallen = true; panel.showFallen(); return 1;`), 3000);
  await ev(H(`game.state.run.fallen = false; document.getElementById('fallen').hidden = true; return 1;`));
  await ev(BAG); await sleep(300);
  await screen(key, '04-tree', H(`panel.setMode('camp'); panel.setTab('grove'); return 1;`), 1000);
  await screen(key, '04b-tree-plate', PLATE, 700);
  // the pannable tree cuts labels at its edge by design (edgePad lets the pan clear them); the whole-tree view (PC; the phone full view is a clamped zoom that pans) must show every label whole
  await screen(key, '04c-tree-whole', H(`tree.setFull(true); return 1;`), 900);
  await ev(H(`tree.setFull(false); return 1;`));
  await screen(key, '05-satchel', H(`panel.setTab('satchel'); return 1;`), 800);
  await screen(key, '06-satchel-picked', `document.querySelector('#sat-grid .item')?.click(); 1`, 700);
  await screen(key, '07-camp', H(`panel.setTab('camp'); return 1;`), 900);
  await screen(key, '07b-camp-card', H(`const id = document.querySelector('#camp-list button[data-camp]')?.dataset.camp; if (id) panel.camp.show(id); return id || 'none';`), 700);
  await ev(H(`panel.camp.close(); return 1;`));
  await screen(key, '08-prestige', H(`panel.setTab('prestige'); return 1;`), 800);
  await screen(key, '09-settings-tab', H(`panel.setTab('settings'); document.getElementById('btn-export').click(); return 1;`), 600);
  await screen(key, '09b-settings-sci', H(`const s = document.getElementById('set-num'); s.value = 'sci'; s.dispatchEvent(new Event('change')); return 1;`), 500);
  await screen(key, '10-settings-overlay', H(`panel.setMode('run'); panel.setMode('settings'); panel.setTab('settings'); return 1;`), 600);
  await screen(key, '11-run-sci', H(`panel.setMode('run'); game.state.run.starlight = 4.2e12; panel.update(); return 1;`), 900);
  await ev(H(`const s = document.getElementById('set-num'); s.value = 'short'; s.dispatchEvent(new Event('change')); return 1;`));
  // the cut-off check needs the damage numbers: they must have drawn at least once at this viewport
  const f = await ev(`Object.keys(window.__fontLog.fonts).join('|')`);
  if (!/(^|\|)(1[5-9]|[2-9]\d)(\.\d+)?px Heartwood/.test(f)) fails.push(`${key}: no 15px+ Heartwood canvas text drawn (damage numbers never appeared) fonts=${f}`);
}
clearTimeout(guard);
writeFileSync(`${outDir}/audit.json`, JSON.stringify({ when: new Date().toISOString(), fails, screens: R }, null, 1));
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'OK: Heartwood-only on ' + Object.values(R).reduce((n, v) => n + Object.keys(v).length, 0) + ' screens');
chrome.kill(); process.exit(fails.length ? 1 : 0);
