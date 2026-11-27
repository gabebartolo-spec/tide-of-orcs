// Caption and title-card overlays for the trailer, rendered in the game's Heartwood face as transparent 1920x1080 PNGs.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const OUT = process.argv[2] ?? 'out/captions';
const FONT = 'data:font/woff2;base64,' + (await import('node:fs')).readFileSync(new URL('../../src/ui/fonts/heartwood-400.woff2', import.meta.url)).toString('base64');
export const CAPTIONS = {
  c01: 'The tide comes from the east.',
  c02: 'Aim. The bow does the rest.',
  c03: 'Grow the grove.',
  c06: 'Hold the line.',
  c08: 'Every 25 waves, a champion.',
  c09: 'One day the wall will fall.',
  c10: "That day isn't a loss.",
};
const css = `@font-face { font-family: H; src: url(${FONT}) format('woff2'); } html, body { margin: 0; width: 1920px; height: 1080px; background: transparent; }
  .cap { position: absolute; left: 0; right: 0; bottom: 170px; text-align: center; font: 76px H; color: #f3ead2; letter-spacing: 0.01em;
    text-shadow: 0 2px 4px rgba(10,14,9,.9), 0 0 28px rgba(10,14,9,.85), 0 0 60px rgba(10,14,9,.6); }
  .title { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f3ead2; font-family: H;
    text-shadow: 0 3px 6px rgba(10,14,9,.9), 0 0 40px rgba(10,14,9,.8); }
  .title h1 { font-size: 168px; font-weight: 400; margin: 0; } .title p { font-size: 58px; margin: 28px 0 0; color: #e9c77b; }`;
const b = await pw.chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const render = async (name, html) => {
  await p.setContent(`<style>${css}</style>${html}`); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${OUT}/${name}.png`, omitBackground: true });
};
(await import('node:fs')).mkdirSync(OUT, { recursive: true });
for (const [k, t] of Object.entries(CAPTIONS)) await render(k, `<div class="cap">${t}</div>`);
await render('title', `<div class="title"><h1>Let's Hunt Some Orc!</h1><p>Play in your browser on itch.io</p></div>`);
await b.close();
