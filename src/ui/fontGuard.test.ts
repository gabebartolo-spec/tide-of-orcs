import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** TB-226: Heartwood is the only face. No other family name, generic stack or system-UI keyword may appear in a font declaration
 *  in src/, index.html or the desktop shell. (Tests are skipped: they may name a face in a string.) */
const ROOT = join(__dirname, '..', '..');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? (n === 'fonts' ? [] : walk(p)) : [p];
});
const files = [...walk(join(ROOT, 'src')), join(ROOT, 'index.html'), ...walk(join(ROOT, 'desktop'))]
  .filter((p) => /\.(ts|css|html|cjs|js|mjs)$/.test(p) && !/\.test\.ts$/.test(p));
const BAD = /\b(sans-serif|serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-monospace|-apple-system|BlinkMacSystemFont|Segoe UI|Helvetica|Arial|Inter|Roboto|Georgia|Trebuchet|Verdana|Tahoma|Courier|Times|Spectral|Atkinson|Calibri|Consolas|Menlo|Monaco)\b/;

describe('font guard (TB-226)', () => {
  it('scans the source tree', () => { expect(files.length).toBeGreaterThan(20); });
  it('declares no face other than Heartwood', () => {
    const bad: string[] = [];
    files.forEach((p) => readFileSync(p, 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (!/font/i.test(line)) return;
      if (BAD.test(line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, ''))) bad.push(`${p.slice(ROOT.length + 1)}:${i + 1}: ${line.trim().slice(0, 120)}`);
      const fam = /font-family\s*:\s*([^;}]+)/gi; for (let m = fam.exec(line); m; m = fam.exec(line)) {
        if (!/^\s*(var\(--(body|display)\)|"?Heartwood"?|inherit)\s*$/i.test(m[1]!)) bad.push(`${p.slice(ROOT.length + 1)}:${i + 1}: font-family ${m[1]}`);
      }
      const shorthand = /(?:ctx\.|\bc\.|\bg\.)font\s*=\s*([`'"])(.*?)\1/g; for (let m = shorthand.exec(line); m; m = shorthand.exec(line)) {
        if (!/Heartwood$/.test(m[2]!)) bad.push(`${p.slice(ROOT.length + 1)}:${i + 1}: canvas font ${m[2]}`);
      }
    }));
    expect(bad).toEqual([]);
  });
  it('CSS tokens --body and --display are Heartwood', () => {
    const css = readFileSync(join(ROOT, 'src/ui/style.css'), 'utf8');
    expect(css).toMatch(/--display:\s*"Heartwood"/); expect(css).toMatch(/--body:\s*"Heartwood"/);
    expect(css.match(/--body\s*:/g)?.length).toBe(1);
  });
});
