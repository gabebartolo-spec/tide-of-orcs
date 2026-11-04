// TB-220 treeline proof. Start `npm run dev -- --port 5260`, then: node tools/treeline-capture.mjs <debug port> <outDir> <tag>
// One fresh headless Chrome per size (a shared session tiles DPR 3 shots). Waves 1/10/25/50 are pinned and a shot is only kept when:
//  the HUD wave text is exactly the target wave, the CLEARED stamp is hidden, the fallen overlay is hidden, the wall is at full HP, and
//  the window and device scale are the requested ones. A failed check retries (4 tries, reloading the page on the last two), then the run exits non-zero.
// audit.json records per shot: HUD bottom, highest crown top (css px) and its gap under the HUD, orcs standing in the forest, and the viewport.
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [,, port0 = '9361', outDir = 'previews/tb-220-canopy-trees/r9', tag = 'r9'] = process.argv;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SIZES = [[1920, 1080, 1], [1920, 1080, 2], [1920, 1080, 3], [1280, 720, 1], [1280, 720, 2]], WAVES = [1, 10, 25, 50];
const AUDIT = (w) => `(() => { const q = (s) => document.querySelector(s); const st = q('#hud-stamp'), fb = q('#fallen'), t = window.__tide, f = t.field;
  let bottom = 0; for (const e of q('#hud').querySelectorAll('.hud-wall, .hud-wave, .hud-star, button, .stats')) { const r = e.getBoundingClientRect(); if (r.width > 1) bottom = Math.max(bottom, r.bottom); }
  const s = t.game.state, v = f.view, vis = f.vis, tl = f.treeline, css = (wy) => (wy - vis.y0) * v.k;
  const top = css(tl.crownTop(vis.y0)); let inForest = 0;
  for (const o of s.orcs.items) { if (o.live && !o.dead && o.y < tl.skirtEdge(vis.y0)) inForest++; }
  return { waveText: q('#st-wave').textContent.trim(), want: ${w}, stampHidden: st.hidden, fallenHidden: fb.hidden, barHp: Math.round(s.run.barHp), barMax: Math.round(s.stats.barMax), hudBottom: Math.round(bottom),
    crownTop: Math.round(top * 10) / 10, gapUnderHud: Math.round((top - bottom) * 10) / 10, orcsInForest: inForest, dpr: devicePixelRatio, inner: [innerWidth, innerHeight] }; })()`;
const good = (a, W, H, dpr) => a.waveText === String(a.want) && a.stampHidden && a.fallenHidden && a.barHp === a.barMax && a.dpr === dpr && a.inner[0] === W && a.inner[1] === H;

async function session(port, W, H, dpr, out) {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/tide-tl-${port}-${Date.now()}`,
    '--headless=new', '--disable-gpu', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
  try {
    let list; for (let i = 0; i < 60 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
    const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
    let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
    const cdp = (method, params = {}) => new Promise((r, j) => { const i = ++id, t = setTimeout(() => j(new Error(`cdp ${method} timed out`)), 90000); pend.set(i, (d) => { clearTimeout(t); r(d); }); ws.onclose = () => j(new Error('chrome closed')); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
    const load = async () => {
      await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: false });
      await cdp('Page.navigate', { url: process.env.TIDE_URL ?? 'http://localhost:5260/' });
      for (let i = 0; i < 80 && !(await ev('!!(window.__tide && window.__tide.field)').catch(() => false)); i++) await sleep(500);
      await sleep(3000);
    };
    await cdp('Page.enable'); await load();
    for (const w of WAVES) {
      let a, ok = false;
      for (let tryN = 0; tryN < 4 && !ok; tryN++) {
        if (tryN >= 2) await load();
        // pin the wave, full wall HP, not fallen; keep the fallen overlay and any CLEARED stamp closed
        await ev(`(() => { clearInterval(window.__pin); const s = window.__tide.game.state; const pin = () => { s.run.wave = ${w}; s.run.barHp = s.stats.barMax; s.run.fallen = false; document.getElementById('fallen').hidden = true;
          const st = document.getElementById('hud-stamp'); st.hidden = true; document.getElementById('hud-wave').classList.remove('stamp-ending'); }; pin(); window.__pin = setInterval(pin, 16); })()`);
        for (let i = 0; i < 30; i++) { await sleep(400); a = await ev(AUDIT(w)); if (good(a, W, H, dpr)) break; }
        await sleep(2500); a = await ev(AUDIT(w)); ok = good(a, W, H, dpr);
        if (!ok) console.log('retry', `${W}x${H}d${dpr}_w${w}`, JSON.stringify(a));
      }
      const k = `${W}x${H}d${dpr}_w${w}`;
      if (!ok) { console.error('FAILED', k, JSON.stringify(a)); throw new Error(`capture ${k} failed its checks`); }
      out[k] = a;
      const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${tag}_${W}d${dpr}_w${w}.png`, Buffer.from(r.result.data, 'base64'));
      console.log(k, JSON.stringify(a));
    }
  } finally { chrome.kill(); }
}
const R = {}; let p = Number(port0);
// a Chrome that dies or hangs is replaced: each size gets up to 3 fresh Chromes before the run fails
async function sized(W, H, dpr) { for (let a = 1; ; a++) { try { return await session(p++, W, H, dpr, R); } catch (e) { console.error(`size ${W}x${H}d${dpr} attempt ${a}:`, e.message); if (a >= 3) throw e; } } }
try { for (const [W, H, dpr] of SIZES) await sized(W, H, dpr); } catch (e) { console.error(e.message); writeFileSync(`${outDir}/audit.json`, JSON.stringify(R, null, 1)); process.exit(1); }
writeFileSync(`${outDir}/audit.json`, JSON.stringify(R, null, 1)); process.exit(0);
