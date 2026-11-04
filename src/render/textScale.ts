/**
 * Settings › Text size (TB-191). One multiplier on the root font size (style.css `--text-scale`), so every rem in the
 * DOM panel, the tree canvas (through uiScale) and the field canvas text (through textScale) grows together.
 */
export const TEXT_SCALE_MIN = 0.8, TEXT_SCALE_MAX = 1.6;
/** A phone held sideways has no room for the largest sizes (style.css caps --text-scale at the same number there), so the slider stops
 *  at what it really does: the label, the slider and the rendered size always agree (TB-218). */
export const TEXT_SCALE_MAX_PHONE = 1.2;
export const textScaleMax = (): number => (typeof matchMedia === 'function' && matchMedia('(pointer: coarse) and (max-height: 540px)').matches ? TEXT_SCALE_MAX_PHONE : TEXT_SCALE_MAX);
let current = 1;
export const textScale = (): number => current;
export function applyTextScale(k: number): void {
  current = Math.min(textScaleMax(), Math.max(TEXT_SCALE_MIN, Number.isFinite(k) ? k : 1));
  document.documentElement.style.setProperty('--text-scale', String(current));
}
