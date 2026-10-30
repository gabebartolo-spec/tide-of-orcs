const UNITS = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp'];

export type NumberFormat = 'short' | 'sci';
let current: NumberFormat = 'short';
/** The player's number format (Settings); fmt uses it unless a mode is passed. */
export const setNumberFormat = (m: NumberFormat): void => { current = m; };

export function fmt(n: number, mode: NumberFormat = current): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 1000) return Math.floor(n).toString();
  if (mode === 'sci') return n.toExponential(2).replace('+', '');
  let i = -1;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + UNITS[i];
}
