import { bindSaveTriggers } from './saveTriggers';
import { STEP } from './data/balance';
import { GameController } from './game';
import { FieldRenderer } from './render/field';
import { TreeRenderer } from './render/tree';
import { Panel } from './ui/panel';
import { AudioEngine } from './audio/engine';
import { STR } from './data/strings';
import { campHit } from './ui/camp';
import { CampScene } from './render/campScene';
import { AimTracker } from './ui/aimTracker';
import { aimPoint, startsAim, type Insets } from './ui/touchAim';
import { PHONE_QUERY } from './data/presentation';
import { setUiSound } from './data/audio';
import { wantsCalm } from './ui/juice';
import { armFullscreen } from './ui/fullscreen';

const game = new GameController();
const fieldCanvas = document.getElementById('game') as HTMLCanvasElement;
const field = new FieldRenderer(fieldCanvas);
const tree = new TreeRenderer(document.getElementById('tree') as HTMLCanvasElement);
// reduced motion is applied before the Panel exists: a save that loads already fallen builds its report board at once (TB-219)
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const applyMotion = () => { field.reducedMotion = wantsCalm(game.settings.reducedMotion, reduced.matches); tree.reducedMotion = field.reducedMotion; document.documentElement.toggleAttribute('data-calm', field.reducedMotion); };
applyMotion(); reduced.addEventListener('change', applyMotion);
const panel = new Panel(game, tree);
const audio = new AudioEngine();
// Mute (TB-196): M, the Settings button and the corner button share one state, kept in localStorage (TB-218); automated browsers (agents' screenshots) start muted.
const MUTE_KEY = 'tide.muted';
const storedMute = (): boolean => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } };
let muted = navigator.webdriver || storedMute();
const applyVolume = (): void => audio.setVolume(muted ? 0 : game.settings.volume);
const muteSettings = document.getElementById('btn-mute') as HTMLElement, muteCorner = document.getElementById('btn-mute-corner') as HTMLElement;
const syncMute = (): void => {
  for (const b of [muteSettings, muteCorner]) b.setAttribute('aria-pressed', String(muted));
  muteSettings.textContent = muted ? STR.soundOff : STR.soundOn; muteCorner.setAttribute('aria-label', muted ? STR.soundOff : STR.soundOn);
};
const setMuted = (m: boolean): void => { muted = m; try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* storage blocked: lasts this page only */ } applyVolume(); syncMute(); };
applyVolume(); syncMute();
for (const b of [muteSettings, muteCorner]) b.addEventListener('click', () => setMuted(!muted));
addEventListener('keydown', (e) => { if ((e.key === 'm' || e.key === 'M') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) setMuted(!muted); });
// Browsers block audio until the first gesture; a touch counts on release (pointerup, touchend) as well as on press.
for (const t of ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const) addEventListener(t, () => audio.unlock(), { capture: true });

panel.onSettings = () => { applyVolume(); applyMotion(); };
panel.onCue = (c) => audio.play(c);
setUiSound((c) => audio.play(c));


// Aiming: the bow follows the pointer while it is over the field. No clicking; the bow looses on its own.
// Touch (TB-155, TB-218): the elf aims while a finger is held on the plain; the circle sits above the fingertip (lift fades at the
// bottom) and below the HUD. One pointer owns the aim (AimTracker): when it lifts another held finger takes over, else the aim clears.
// A pen aims only in contact; a mouse follows the cursor and clears on leave.
const tracker = new AimTracker();
const phoneMq = matchMedia(PHONE_QUERY);
const remPx = (): number => parseFloat(getComputedStyle(document.documentElement).fontSize);
const insetProbe = document.createElement('div');
insetProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
document.body.appendChild(insetProbe);
const insets = (): Insets => { const c = getComputedStyle(insetProbe); return { left: parseFloat(c.paddingLeft) || 0, right: parseFloat(c.paddingRight) || 0, bottom: parseFloat(c.paddingBottom) || 0 }; };
const aimAt = (type: 'touch' | 'pen', cx: number, cy: number): void => {
  const p = aimPoint(type, cx, cy, fieldCanvas.getBoundingClientRect(), remPx(), phoneMq.matches);
  const w = field.toWorld(p.x, p.y, true);   // a captured finger can slide off the canvas: keep the circle on the plain
  if (w) game.setAim(w.x, w.y); else game.dropAim();
};
const mouseAim = (e: PointerEvent): void => {
  // the plain sits inside a full-window view (TB-207); the mouse over the extra meadow holds fire (TB-216c)
  const p = field.toWorld(e.clientX, e.clientY, false);
  if (p) game.setAim(p.x, p.y); else game.clearAim();
};
const contactType = (e: PointerEvent): 'touch' | 'pen' => (e.pointerType === 'pen' ? 'pen' : 'touch');
const releaseContact = (e: PointerEvent): void => {
  const r = tracker.release(e.pointerId);
  if (!r.wasOwner) return;
  if (e.type === 'pointercancel') game.dropAim(); else game.clearAim();
  if (r.promoted) aimAt(r.promoted.type, r.promoted.x, r.promoted.y);
};
const dropAllAim = (): void => { tracker.reset(); game.dropAim(); };
fieldCanvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') { mouseAim(e); return; }
  if (e.pointerType === 'pen' && !(e.buttons & 1)) return;   // a pen aims only in contact
  if (!startsAim(e.clientX, e.clientY, fieldCanvas.getBoundingClientRect(), insets())) return;   // a system edge swipe is not an aim
  try { fieldCanvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone: aim without capture */ }
  if (tracker.down({ id: e.pointerId, type: contactType(e), x: e.clientX, y: e.clientY })) aimAt(contactType(e), e.clientX, e.clientY);
});
fieldCanvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') { mouseAim(e); return; }
  if (tracker.move(e.pointerId, e.clientX, e.clientY)) aimAt(contactType(e), e.clientX, e.clientY);
});
for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) fieldCanvas.addEventListener(t, (e) => { if (e.pointerType !== 'mouse') releaseContact(e); });
fieldCanvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') game.clearAim(); else if (e.pointerType === 'pen') releaseContact(e); });
addEventListener('blur', dropAllAim);
// Encampment (TB-188e): the Camp tab's scene; a click on a building opens its card, a click anywhere else closes it.
const campView = document.getElementById('campview') as HTMLCanvasElement, campScene = new CampScene(campView);
campView.addEventListener('click', (e) => { const id = campHit(...campScene.toScene(e.clientX, e.clientY)); if (id) { panel.onCue('click'); panel.camp.show(id); } else panel.camp.close(); });
campView.addEventListener('pointermove', (e) => { campView.style.cursor = e.pointerType === 'mouse' && campHit(...campScene.toScene(e.clientX, e.clientY)) ? 'pointer' : ''; });
// no long-press menu or callout anywhere on a touch screen, except to paste into a text box (TB-218)
fieldCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('contextmenu', (e) => { if (matchMedia('(pointer: coarse)').matches && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) e.preventDefault(); }, { capture: true });
(document.getElementById('turn-msg') as HTMLElement).textContent = STR.turnSideways;
// any press or key skips the replant ceremony
const treeWrap = document.querySelector('.treewrap') as HTMLElement;
const skipCeremony = (): void => { if (field.ceremony.active) field.ceremony.skip(); };
fieldCanvas.addEventListener('pointerdown', skipCeremony); addEventListener('keydown', skipCeremony);
void field.sprites.load();
armFullscreen();
// dev-only handle for checking render work in the browser
if (import.meta.env.DEV) Object.assign(window, { __tide: { game, field, tree, campScene, audio } });

// build stamp (written by the itch workflow)
fetch('./build.json').then((r) => (r.ok ? r.json() : null)).then((b) => { if (b) document.getElementById('build')!.textContent = `${b.tag} · ${b.sha}`; }).catch(() => {});

let last = performance.now(), acc = 0, hudT = 0, saveT = 0;
// A hidden page saves (saveTriggers), suspends audio and holds the sim; coming back resets the clock, so there is no catch-up burst (TB-218)
let away = false;
const goAway = (): void => { away = true; audio.suspend(); dropAllAim(); };
let resync = false;   // the next frame restarts the clock from its own timestamp (an event time can be later than a frame's)
const comeBack = (): void => { away = false; resync = true; audio.resume(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) goAway(); else comeBack(); });
addEventListener('pageshow', comeBack);
// A coarse portrait phone shows the rotate prompt (style.css .turn): the sim holds still behind it (TB-218)
const portraitMq = matchMedia('(orientation: portrait) and (pointer: coarse)');
function frame(now: number): void {
  if (away || portraitMq.matches) { last = now; requestAnimationFrame(frame); return; }
  if (resync) { resync = false; last = now; acc = 0; }
  const dt = Math.min(0.25, Math.max(0, (now - last) / 1000)); last = now;
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
  if (!document.hidden && campView.offsetParent) campScene.draw(game.state.meta.camp.levels, now / 1000);
  treeWrap.classList.toggle('burning', field.ceremony.burning);
  hudT += dt; if (hudT > 0.15) { hudT = 0; panel.update(); tree.draw(game.state, game.state.t); } else if (tree.live) tree.draw(game.state, game.state.t);
  saveT += dt; if (saveT > 20) { saveT = 0; game.save(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
bindSaveTriggers(window, document, () => game.save());
