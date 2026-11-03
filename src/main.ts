import { FIELD, STEP } from './data/balance';
import { GameController } from './game';
import { FieldRenderer } from './render/field';
import { TreeRenderer } from './render/tree';
import { Panel } from './ui/panel';
import { AudioEngine } from './audio/engine';
import { STR } from './data/strings';

const game = new GameController();
const fieldCanvas = document.getElementById('game') as HTMLCanvasElement;
const field = new FieldRenderer(fieldCanvas);
const tree = new TreeRenderer(document.getElementById('tree') as HTMLCanvasElement);
const panel = new Panel(game, tree);
const audio = new AudioEngine();
// Mute (TB-196): M toggles sound; automated browsers (agents' screenshots) start muted.
let muted = navigator.webdriver;
const applyVolume = (): void => audio.setVolume(muted ? 0 : game.settings.volume);
applyVolume();
addEventListener('keydown', (e) => { if ((e.key === 'm' || e.key === 'M') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) { muted = !muted; applyVolume(); } });
// Browsers block audio until the first gesture.
addEventListener('pointerdown', () => audio.unlock(), { capture: true });
addEventListener('keydown', () => audio.unlock(), { capture: true });

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const applyMotion = () => { field.reducedMotion = game.settings.reducedMotion ?? reduced.matches; tree.reducedMotion = field.reducedMotion; document.documentElement.toggleAttribute('data-calm', field.reducedMotion); };
applyMotion(); reduced.addEventListener('change', applyMotion);
panel.onSettings = () => { applyVolume(); applyMotion(); };
panel.onCue = (c) => audio.play(c);


// Aiming: the bow follows the pointer while it is over the field. No clicking; the bow looses on its own.
// Touch (TB-155): the elf aims while a finger is held on the plain, and the circle sits TOUCH_LIFT above the fingertip so
// the finger never hides it. Only the first finger aims; a second one (on a rally button) leaves the aim alone.
const TOUCH_LIFT = 3.5; // rem
let aimFinger: number | null = null;
const setAim = (e: PointerEvent): void => {
  if (e.pointerType !== 'mouse' && aimFinger !== null && e.pointerId !== aimFinger) return;
  const r = fieldCanvas.getBoundingClientRect();
  const lift = e.pointerType === 'mouse' ? 0 : TOUCH_LIFT * parseFloat(getComputedStyle(document.documentElement).fontSize);
  // a captured finger can slide off the canvas: keep the circle on the plain
  const x = Math.min(r.right, Math.max(r.left, e.clientX)), y = Math.min(r.bottom, Math.max(r.top, e.clientY - lift));
  game.setAim(((x - r.left) / r.width) * FIELD.w, ((y - r.top) / r.height) * FIELD.h);
};
const endAim = (e: PointerEvent): void => {
  if (e.pointerType === 'mouse') { if (e.type === 'pointerleave') game.clearAim(); return; }
  if (e.pointerId === aimFinger) { aimFinger = null; game.clearAim(); }
};
fieldCanvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' && aimFinger === null) {
    aimFinger = e.pointerId;
    try { fieldCanvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone: aim without capture */ }
  }
  setAim(e);
});
fieldCanvas.addEventListener('pointermove', setAim);
for (const t of ['pointerup', 'pointercancel', 'pointerleave'] as const) fieldCanvas.addEventListener(t, endAim);
// no long-press menu or callout on the field
fieldCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
(document.getElementById('turn-msg') as HTMLElement).textContent = STR.turnSideways;
window.addEventListener('resize', () => field.resize());
// any press or key skips the replant ceremony
const treeWrap = document.querySelector('.treewrap') as HTMLElement;
const skipCeremony = (): void => { if (field.ceremony.active) field.ceremony.skip(); };
fieldCanvas.addEventListener('pointerdown', skipCeremony); addEventListener('keydown', skipCeremony);
void field.sprites.load();
// dev-only handle for checking render work in the browser
if (import.meta.env.DEV) Object.assign(window, { __tide: { game, field, tree } });

// build stamp (written by the itch workflow)
fetch('./build.json').then((r) => (r.ok ? r.json() : null)).then((b) => { if (b) document.getElementById('build')!.textContent = `${b.tag} · ${b.sha}`; }).catch(() => {});

let last = performance.now(), acc = 0, hudT = 0, saveT = 0;
function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  // a mythic drop briefly holds, then slows the field (TB-105)
  acc += dt * field.timeScale;
  // the field holds still while the replant ceremony plays
  if (field.ceremony.active) acc = 0;
  // TB-194: snapshot movers before the last step, then draw them `acc / STEP` of the way from there to now (render/interp.ts)
  while (acc >= STEP) { if (acc < 2 * STEP) field.interp.snap(game.state); game.tick(STEP); acc -= STEP; }
  field.interp.alpha = acc / STEP;
  const events = game.events.drain();
  game.noteEvents(events); field.consume(events, game.state); panel.handleEvents(events); audio.consume(events);
  // the field is hidden (zero-size) on the camp pages, so skip its draw there (TB-136)
  if (!document.hidden && document.body.dataset.mode !== 'camp') field.draw(game.state, dt, game.aim);
  treeWrap.classList.toggle('burning', field.ceremony.burning);
  hudT += dt; if (hudT > 0.15) { hudT = 0; panel.update(); tree.draw(game.state, game.state.t); } else if (tree.live) tree.draw(game.state, game.state.t);
  saveT += dt; if (saveT > 20) { saveT = 0; game.save(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener('pagehide', () => game.save());
addEventListener('beforeunload', () => game.save());
