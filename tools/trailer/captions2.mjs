// Trailer take 2 captions and end card as transparent 1920x1080 PNGs, in the game's own Heartwood face and palette
// (cream #efe6d2 text, amber #e2a85b accent; see src/render/palette.ts). One short line each, lower third, centred,
// on a soft dark glow so it reads over bright grass and dark camp alike. edit2.py fades and drifts them.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const OUT = process.argv[2] ?? 'out2/captions';
const FONT = 'data:font/woff2;base64,' + readFileSync(new URL('../../src/ui/fonts/heartwood-400.woff2', import.meta.url)).toString('base64');
const CAPTIONS = JSON.parse(process.argv[3] ?? '{}');
const css = `@font-face { font-family: H; src: url(${FONT}) format('woff2'); }
  html, body { margin: 0; width: 1920px; height: 1080px; background: transparent; overflow: hidden; }
  .cap { position: absolute; left: 0; right: 0; bottom: 120px; text-align: center; font: 72px/1 H; color: #efe6d2; letter-spacing: 0.015em;
    text-shadow: 0 2px 3px rgba(14,18,12,.85), 0 0 18px rgba(14,18,12,.75), 0 0 46px rgba(14,18,12,.55), 0 0 90px rgba(14,18,12,.35); }
  .end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: H; }
  .end h1 { font-size: 150px; line-height: 1; font-weight: 400; margin: 0; color: #efe6d2; letter-spacing: 0.01em;
    text-shadow: 0 4px 6px rgba(14,18,12,.85), 0 0 40px rgba(14,18,12,.7), 0 0 110px rgba(14,18,12,.5); }
  .end .rule { width: 420px; height: 2px; margin: 34px 0 30px; background: linear-gradient(90deg, rgba(226,168,91,0), #e2a85b, rgba(226,168,91,0)); }
  .end p { font-size: 54px; margin: 0; color: #e2a85b; letter-spacing: 0.02em; text-shadow: 0 2px 4px rgba(14,18,12,.85), 0 0 30px rgba(14,18,12,.7); }`;
const b = await pw.chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const render = async (name, html) => {
  await p.setContent(`<style>${css}</style>${html}`); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${OUT}/${name}.png`, omitBackground: true });
};
mkdirSync(OUT, { recursive: true });
for (const [k, t] of Object.entries(CAPTIONS)) await render(k, `<div class="cap">${t.replace(/'/g, '&rsquo;')}</div>`);
await render('end', `<div class="end"><h1>Let&rsquo;s Hunt Some Orc!</h1><div class="rule"></div><p>Play in your browser on itch.io</p></div>`);
await b.close();
