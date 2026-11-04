// Fullscreen on phones (TB-218). The first touch in the run view enters fullscreen and locks landscape, which hides the URL bar
// and returns the viewport to 915x412 on a Pixel 8. Failure is silent: the game stays playable in a normal tab.
const KEY = 'tide.fullscreen';  // 'off' once the player leaves fullscreen by the Settings button: stop auto-entering
const read = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v: string): void => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked: preference lasts this page only */ } };

export const isFullscreen = (): boolean => !!document.fullscreenElement;

export function enterFullscreen(): void {
  const el = document.documentElement;
  if (!el.requestFullscreen || document.fullscreenElement) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => { /* refused or unsupported */ });
}

export function exitFullscreen(): void {
  try { screen.orientation?.unlock?.(); } catch { /* not locked */ }
  document.exitFullscreen?.().catch(() => {});
}

/** On a touch release in the run view of a coarse-pointer device, go fullscreen (needs a user gesture). Re-armed whenever fullscreen
 *  ends without the Settings button (Android back or swipe gesture), so the next run-view touch brings it back unless the player chose 'off'. */
export function armFullscreen(): void {
  if (!matchMedia('(pointer: coarse)').matches) return;
  const once = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' || document.body.dataset.mode !== 'run') return;
    if (read() === 'off') { removeEventListener('pointerup', once, true); return; }
    removeEventListener('pointerup', once, true);
    enterFullscreen();
  };
  const arm = (): void => { if (read() !== 'off') addEventListener('pointerup', once, true); };   // same function twice is one listener
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) arm(); });
  arm();
}

/** Settings button: toggles fullscreen and remembers the choice. Hidden where the browser has no fullscreen API. */
export function initFullscreenButton(btn: HTMLElement, enterLabel: string, exitLabel: string): void {
  const row = btn.parentElement;
  if (!document.documentElement.requestFullscreen) { if (row) row.hidden = true; return; }
  const sync = (): void => { btn.textContent = isFullscreen() ? exitLabel : enterLabel; };
  sync();
  document.addEventListener('fullscreenchange', sync);
  btn.onclick = () => { if (isFullscreen()) { write('off'); exitFullscreen(); } else { write('on'); enterFullscreen(); } };
}
