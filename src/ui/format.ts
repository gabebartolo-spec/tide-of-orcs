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
  // round first, then step up a unit if rounding reached 1000 (999999 is 1.00M, not 1000K; TB-216c)
  if (Number(n.toFixed(0)) >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  const d = n < 10 ? 2 : n < 100 ? 1 : 0, s = n.toFixed(d);
  // 9.999 rounds to 10.00: show it at the next band's precision (10.0)
  const r = Number(s);
  return (r >= 10 && d === 2 ? n.toFixed(1) : r >= 100 && d === 1 ? n.toFixed(0) : s) + UNITS[i];
}
