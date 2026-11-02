/**
 * Settings › Text size (TB-191). One multiplier on the root font size (style.css `--text-scale`), so every rem in the
 * DOM panel, the tree canvas (through uiScale) and the field canvas text (through textScale) grows together.
 */
export const TEXT_SCALE_MIN = 0.8, TEXT_SCALE_MAX = 1.6;
let current = 1;
export const textScale = (): number => current;
export function applyTextScale(k: number): void {
  current = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Number.isFinite(k) ? k : 1));
  document.documentElement.style.setProperty('--text-scale', String(current));
}
