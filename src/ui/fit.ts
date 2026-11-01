/**
 * One page (TB-153): a camp page whose content is taller than its tab scales down to fit, so the page never scrolls.
 * Transform keeps layout size, so the content is laid out at width ÷ k and then scaled by k. The Grove is not fitted:
 * its tree canvas pans inside its own box at full size.
 * Phones (TB-155): a short touch screen cannot hold Replant or Settings at a readable size, so the scale stops at
 * PHONE_MIN and the rest scrolls inside the tab (the `.fitscroll` class); PC keeps the no-scroll page.
 */
const PHONE_MIN = 0.8;
const phone = matchMedia('(pointer: coarse) and (max-height: 540px)');
export function fitPages(panes: HTMLElement[]): void {
  const fit = (pane: HTMLElement): void => {
    const c = pane.firstElementChild as HTMLElement | null;
    if (!c || pane.hidden || pane.clientHeight === 0) return;
    const floor = phone.matches ? PHONE_MIN : 0;
    let k = 1;
    for (let i = 0; i < 4; i++) {
      c.style.width = k < 1 ? `${100 / k}%` : '';
      const next = Math.max(floor, Math.min(1, pane.clientHeight / c.offsetHeight)); // offsetHeight is the unscaled layout height at width ÷ k
      if (Math.abs(next - k) < 0.005) break;
      k = next;
    }
    c.style.width = k < 1 ? `${100 / k}%` : ''; c.style.transform = k < 1 ? `scale(${k})` : ''; c.style.transformOrigin = 'top left';
    // a transform keeps the unscaled layout height: pull the bottom in so the scroll ends at the content
    const over = c.offsetHeight * k > pane.clientHeight + 1;
    c.style.marginBottom = over && k < 1 ? `${-(1 - k) * c.offsetHeight}px` : '';
    pane.classList.toggle('fitscroll', over);
  };
  phone.addEventListener('change', () => panes.forEach(fit));
  const ro = new ResizeObserver(() => panes.forEach(fit));
  for (const p of panes) { ro.observe(p); new MutationObserver(() => fit(p)).observe(p, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }); }
}
