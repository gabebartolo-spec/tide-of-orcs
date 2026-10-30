import { FIELD, STEP } from './data/balance';
import { STR } from './data/strings';
import { GameController } from './game';
import { FieldRenderer } from './render/field';
import { TreeRenderer } from './render/tree';
import { Panel } from './ui/panel';
import { fmt } from './ui/format';

const game = new GameController();
const fieldCanvas = document.getElementById('game') as HTMLCanvasElement;
const field = new FieldRenderer(fieldCanvas);
const tree = new TreeRenderer(document.getElementById('tree') as HTMLCanvasElement);
const panel = new Panel(game, tree);

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const applyMotion = () => { field.reducedMotion = game.settings.reducedMotion ?? reduced.matches; tree.reducedMotion = field.reducedMotion; };
applyMotion(); reduced.addEventListener('change', applyMotion);

if (game.offlineGain > 0) panel.toast(STR.away(fmt(game.offlineGain)));

fieldCanvas.addEventListener('pointerdown', (e) => {
  const r = fieldCanvas.getBoundingClientRect();
  game.tap(((e.clientX - r.left) / r.width) * FIELD.w, ((e.clientY - r.top) / r.height) * FIELD.h);
});
window.addEventListener('resize', () => field.resize());

// build stamp (written by the itch workflow)
fetch('./build.json').then((r) => (r.ok ? r.json() : null)).then((b) => { if (b) document.getElementById('build')!.textContent = `${b.tag} · ${b.sha}`; }).catch(() => {});

let last = performance.now(), acc = 0, hudT = 0, saveT = 0;
function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  acc += dt;
  while (acc >= STEP) { game.tick(STEP); acc -= STEP; }
  const events = game.events.drain();
  field.consume(events, game.state); panel.handleEvents(events);
  if (!document.hidden) field.draw(game.state, dt);
  hudT += dt; if (hudT > 0.15) { hudT = 0; panel.update(); tree.draw(game.state, game.state.t); }
  saveT += dt; if (saveT > 20) { saveT = 0; game.save(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener('pagehide', () => game.save());
addEventListener('beforeunload', () => game.save());
