/** Touch taps that lose their click (TB-218). Chrome can swallow the click of a quick tap that follows a drag or another tap (tap
 *  suppression), which would drop a Settings or boss-summon press right after the player's aim drag. When a touch press and release
 *  land on the same button and no click arrives within `waitMs`, this clicks it. A click that does arrive cancels the fallback. */
export function installTapFallback(sel = 'button', waitMs = 90): void {
  if (!matchMedia('(pointer: coarse)').matches) return;
  let down: { id: number; el: Element; x: number; y: number } | null = null;
  addEventListener('pointerdown', (e) => {
    const el = e.pointerType === 'mouse' ? null : (e.target as Element).closest?.(sel);
    down = el ? { id: e.pointerId, el, x: e.clientX, y: e.clientY } : null;
  }, true);
  addEventListener('pointerup', (e) => {
    const d = down; down = null;
    if (!d || d.id !== e.pointerId || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
    const el = d.el as HTMLButtonElement; if (el.disabled) return;
    let clicked = false; const seen = (): void => { clicked = true; };
    el.addEventListener('click', seen, { once: true });
    setTimeout(() => { el.removeEventListener('click', seen); if (!clicked && el.isConnected) el.click(); }, waitMs);
  }, true);
}
