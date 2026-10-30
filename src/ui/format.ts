const UNITS = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp'];

export function fmt(n: number, mode: 'short' | 'sci' = 'short'): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 1000) return Math.floor(n).toString();
  if (mode === 'sci') return n.toExponential(2).replace('+', '');
  let i = -1;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + UNITS[i];
}
