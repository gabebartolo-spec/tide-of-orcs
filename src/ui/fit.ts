/**
 * One page (TB-153): a camp page whose content is taller than its tab scales down to fit, so the page never scrolls.
 * Transform keeps layout size, so the content is laid out at width ÷ k and then scaled by k. The Grove is not fitted:
 * its tree canvas pans inside its own box at full size.
 * Phones (TB-155): a short touch screen cannot hold Replant or Settings at a readable size, so the scale stops at
 * PHONE_MIN and the rest scrolls inside the tab (the `.fitscroll` class); PC keeps the no-scroll page.
 * A pane marked `data-fit="scroll"` (Replant, TB-193f layout C) is never scaled: its cards stay full size and it scrolls.
 * A pane marked `data-fit="narrow"` (Satchel, TB-206c) is never scaled in a narrow portrait window (NARROW_QUERY), where it scrolls.
 */
const PHONE_MIN = 0.8;
/** Smallest scale the PC page bisects down to, and the bisection steps (0.6 / 2^7 ≈ 0.005 precision). */
const FIT_MIN = 0.4, FIT_STEPS = 7;
/** The narrow portrait window the Satchel scrolls in instead of scaling (matches the style.css narrow block). */
export const NARROW_QUERY = '(max-width: 860px) and (orientation: portrait)';
/** Smallest scale a pane may take: 1 for a scroll pane, PHONE_MIN on phones, else 0 (FIT_MIN then applies). */
export function fitFloor(fitMode: string | undefined, isPhone: boolean, isNarrow = false): number {
  return fitMode === 'scroll' || (fitMode === 'narrow' && isNarrow) ? 1 : isPhone ? PHONE_MIN : 0;
}
export function fitPages(panes: HTMLElement[]): void {
  const phone = matchMedia('(pointer: coarse) and (max-height: 540px)');
  const narrow = matchMedia(NARROW_QUERY);
  const fit = (pane: HTMLElement): void => {
    const c = pane.firstElementChild as HTMLElement | null;
    if (!c || pane.hidden || pane.clientHeight === 0) return;
    const floor = fitFloor(pane.dataset.fit, phone.matches, narrow.matches);
    // offsetHeight is the unscaled layout height at width ÷ k. A smaller k widens the layout, which can reflow (more grid
    // columns) and change the height in jumps, so a fixed-point iteration can swing between two k and end overflowing:
    // bisect for the largest k that fits instead.
    const fits = (k: number): boolean => { c.style.width = k < 1 ? `${100 / k}%` : ''; return c.offsetHeight * k <= pane.clientHeight + 1; };
    let k = 1;
    if (floor < 1 && !fits(1)) {
      let lo = Math.max(floor, FIT_MIN), hi = 1;
      if (fits(lo)) { for (let i = 0; i < FIT_STEPS; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; } }
      k = lo;
    }
    c.style.width = k < 1 ? `${100 / k}%` : ''; c.style.transform = k < 1 ? `scale(${k})` : ''; c.style.transformOrigin = 'top left';
    // a transform keeps the unscaled layout height: pull the bottom in so the scroll ends at the content
    const over = c.offsetHeight * k > pane.clientHeight + 1;
    c.style.marginBottom = over && k < 1 ? `${-(1 - k) * c.offsetHeight}px` : '';
    pane.classList.toggle('fitscroll', over);
  };
  phone.addEventListener('change', () => panes.forEach(fit)); narrow.addEventListener('change', () => panes.forEach(fit));
  const ro = new ResizeObserver(() => panes.forEach(fit));
  for (const p of panes) { ro.observe(p); new MutationObserver(() => fit(p)).observe(p, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }); }
}
