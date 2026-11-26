// TB-250 wall banners proof. Start `npm run dev -- --port 5260`, then: node tools/wallbanner-capture.mjs <debug port> <outDir> [on|off] [sizes] [tiers] [stages]
// One fresh headless Chrome per size. Per tier (wall0-3) and damage stage (0-3) it pins the wall tier, the wall's health inside that stage,
// wave 12, and (with `on`) the two banner achievements earned (wave_10 -> grove, boss_50 -> tide), then saves a screenshot and writes
// audit.json: per shot the stage shown, the HUD bottom (css px), the view, the placed wall and each standard's drawn box (css px).
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port0 = '9371', outDir = 'previews/tb-250-wall-banners/cap', on = 'on', sizesArg = '1920x1080,1280x720,1280x800', tiersArg = '0,1,2,3', stagesArg = '0,1,2,3'] = process.argv;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SIZES = sizesArg.split(',').map((s) => s.split('x').map(Number)), TIERS = tiersArg.split(',').map(Number), STAGES = stagesArg.split(',').map(Number);
const HP = [1, 0.62, 0.38, 0.2];   // a health fraction inside each WALL_DAMAGE stage (0.75 / 0.5 / 0.25 bounds)
const AUDIT = `(() => { const q = (s) => document.querySelector(s), t = window.__tide, f = t.field, v = f.view, vis = f.vis;
  let bottom = 0; for (const e of q('#hud').querySelectorAll('.hud-wallbox, .hud-wall, .hud-wave, .hud-star, button, .stats')) { const r = e.getBoundingClientRect(); if (r.width > 1) bottom = Math.max(bottom, r.bottom); }
  const css = (x, y) => [Math.round((x - vis.x0) * v.k), Math.round((y - vis.y0) * v.k)];
  const std = (f.wallStandards ?? []).map((b) => ({ id: b.id, tl: css(b.x, b.y), br: css(b.x + b.w, b.y + b.h) }));
  return { fallen: t.game.state.run.fallen || !q('#fallen').hidden, tier: t.game.state.stats.wallTier, stage: f.wallDamage.stage, hudBottom: Math.round(bottom), k: v.k, vis: { ...vis }, wall: { ...f.wall }, standards: std, inner: [innerWidth, innerHeight] }; })()`;

async function session(port, W, H, out) {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-wb-${port}-${Date.now()}`,
    '--headless=new', '--disable-gpu', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
  try {
    let list; for (let i = 0; i < 60 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
    const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
    let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
    const cdp = (method, params = {}) => new Promise((r, j) => { const i = ++id, t = setTimeout(() => j(new Error(`cdp ${method} timed out`)), 90000); pend.set(i, (d) => { clearTimeout(t); r(d); }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
    await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.enable'); await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5260/' });
    for (let i = 0; i < 80 && !(await ev('!!(window.__tide && window.__tide.field)').catch(() => false)); i++) await sleep(500);
    await sleep(3000);
    for (const tier of TIERS) for (const st of STAGES) {
      await ev(`(() => { clearInterval(window.__pin); const t = window.__tide, s = t.game.state, e = s.meta.ach.earned;
        for (const a of ['wave_10', 'boss_50']) { const i = e.indexOf(a); if (${on === 'on'} && i < 0) e.push(a); if (${on !== 'on'} && i >= 0) e.splice(i, 1); }
        const pin = () => { s.stats.wallTier = ${tier}; s.run.wave = 12; s.run.barHp = s.stats.barMax * ${HP[st]}; s.run.fallen = false; document.getElementById('fallen').hidden = true; document.getElementById('hud-stamp').hidden = true; };
        pin(); window.__pin = setInterval(pin, 16); })()`);
      await sleep(2500);
      for (let r = 0; r < 6 && (await ev(AUDIT)).stage !== st; r++) await sleep(1000);   // the pinned health can land in the stage before barMax settles
      const a = await ev(AUDIT), shot = await cdp('Page.captureScreenshot', { format: 'png' });
      const k = `${W}x${H}_wall${tier}_s${st}_${on}`;
      out[k] = a; writeFileSync(`${outDir}/${k}.png`, Buffer.from(shot.result.data, 'base64'));
      console.log(k, JSON.stringify({ tier: a.tier, stage: a.stage, hud: a.hudBottom, std: a.standards }));
    }
  } finally { chrome.kill(); }
}
const R = {}; let p = Number(port0);
for (const [W, H] of SIZES) await session(p++, W, H, R);
writeFileSync(`${outDir}/audit_${on}.json`, JSON.stringify(R, null, 1));
