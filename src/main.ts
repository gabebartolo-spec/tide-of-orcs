import { FIELD, STEP } from './data/balance';
import { GameController } from './game';
import { FieldRenderer } from './render/field';
import { TreeRenderer } from './render/tree';
import { Panel } from './ui/panel';
import { AudioEngine } from './audio/engine';

const game = new GameController();
const fieldCanvas = document.getElementById('game') as HTMLCanvasElement;
const field = new FieldRenderer(fieldCanvas);
const tree = new TreeRenderer(document.getElementById('tree') as HTMLCanvasElement);
const panel = new Panel(game, tree);
const audio = new AudioEngine();
audio.setVolume(game.settings.volume);
// Browsers block audio until the first gesture.
addEventListener('pointerdown', () => audio.unlock(), { capture: true });
addEventListener('keydown', () => audio.unlock(), { capture: true });

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const applyMotion = () => { field.reducedMotion = game.settings.reducedMotion ?? reduced.matches; tree.reducedMotion = field.reducedMotion; };
applyMotion(); reduced.addEventListener('change', applyMotion);
panel.onSettings = () => { audio.setVolume(game.settings.volume); applyMotion(); };


// Aiming: the bow follows the pointer while it is over the field. No clicking; the bow looses on its own.
const setAim = (e: PointerEvent): void => {
  const r = fieldCanvas.getBoundingClientRect();
  game.setAim(((e.clientX - r.left) / r.width) * FIELD.w, ((e.clientY - r.top) / r.height) * FIELD.h);
};
fieldCanvas.addEventListener('pointermove', setAim);
fieldCanvas.addEventListener('pointerdown', setAim);
fieldCanvas.addEventListener('pointerleave', () => game.clearAim());
fieldCanvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') game.clearAim(); });
window.addEventListener('resize', () => field.resize());
// any press or key skips the replant ceremony
const treeWrap = document.querySelector('.treewrap') as HTMLElement;
const skipCeremony = (): void => { if (field.ceremony.active) field.ceremony.skip(); };
fieldCanvas.addEventListener('pointerdown', skipCeremony); addEventListener('keydown', skipCeremony);
void field.sprites.load();
// dev-only handle for checking render work in the browser
if (import.meta.env.DEV) Object.assign(window, { __tide: { game, field } });

// build stamp (written by the itch workflow)
fetch('./build.json').then((r) => (r.ok ? r.json() : null)).then((b) => { if (b) document.getElementById('build')!.textContent = `${b.tag} · ${b.sha}`; }).catch(() => {});

let last = performance.now(), acc = 0, hudT = 0, saveT = 0;
function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  acc += dt;
  // the field holds still while the replant ceremony plays
  if (field.ceremony.active) acc = 0;
  while (acc >= STEP) { game.tick(STEP); acc -= STEP; }
  const events = game.events.drain();
  field.consume(events, game.state); panel.handleEvents(events); audio.consume(events);
  if (!document.hidden) field.draw(game.state, dt, game.aim);
  treeWrap.classList.toggle('burning', field.ceremony.burning);
  hudT += dt; if (hudT > 0.15) { hudT = 0; panel.update(); tree.draw(game.state, game.state.t); } else if (tree.live) tree.draw(game.state, game.state.t);
  saveT += dt; if (saveT > 20) { saveT = 0; game.save(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener('pagehide', () => game.save());
addEventListener('beforeunload', () => game.save());
