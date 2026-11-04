import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';

/** TB-226: Heartwood is the only face. The rule is positive: every font declaration in src/, index.html and the desktop shell must name
 *  Heartwood (or inherit it), never "anything not on a denylist". Tests are skipped: they may name a face in a string.
 *  tools/ is not scanned: the dev-only specimen page shows Heartwood alone too, but it never ships. */
const ROOT = join(__dirname, '..', '..');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? (n === 'fonts' ? [] : walk(p)) : [p];
});
const files = [...walk(join(ROOT, 'src')), join(ROOT, 'index.html'), ...walk(join(ROOT, 'desktop'))]
  .filter((p) => /\.(ts|css|html|cjs|js|mjs)$/.test(p) && !/\.test\.ts$/.test(p));
const rel = (p: string): string => p.slice(ROOT.length + 1);
const strip = (line: string): string => line.replace(/\/\*.*?\*\//g, '').replace(/(^|\s)\/\/.*$/, '');
/** Block comments blanked, line numbers kept. */
const noBlock = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const BAD = /\b(sans-serif|serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-monospace|-apple-system|BlinkMacSystemFont|Segoe UI|Helvetica|Arial|Inter|Roboto|Georgia|Trebuchet|Verdana|Tahoma|Courier|Times|Spectral|Atkinson|Calibri|Consolas|Menlo|Monaco)\b/;
const OK_FAMILY = /^\s*(var\(--(body|display)\)|"?Heartwood"?|inherit)\s*$/i;
const OK_SHORTHAND = /^\s*(inherit|[^;]*\bHeartwood\b[^;]*|[^;]*var\(--(body|display)\)[^;]*)\s*$/i;

describe('font guard (TB-226)', () => {
  it('scans the source tree', () => { expect(files.length).toBeGreaterThan(20); });

  it('declares no face other than Heartwood', () => {
    const bad: string[] = [];
    files.forEach((p) => noBlock(readFileSync(p, 'utf8')).split(/\r?\n/).forEach((raw, i) => {
      const line = strip(raw); if (!/font/i.test(line)) return;
      const at = `${rel(p)}:${i + 1}`;
      if (BAD.test(line)) bad.push(`${at}: ${line.trim().slice(0, 120)}`);
      // CSS and inline style: font-family must be a token or Heartwood; the font shorthand must name Heartwood, a token, or inherit
      for (const m of line.matchAll(/font-family\s*:\s*([^;}`]+)/gi)) if (!OK_FAMILY.test(m[1]!)) bad.push(`${at}: font-family ${m[1]}`);
      for (const m of line.matchAll(/(?:^|[;{\s"'`])font\s*:\s*([^;}]+)/gi)) if (!OK_SHORTHAND.test(m[1]!)) bad.push(`${at}: font shorthand ${m[1]}`);
      // script: any assignment to a font property, on any receiver (ctx, c, g, this, style), must end in the Heartwood face
      for (const m of line.matchAll(/\b(?:font|fontFamily)\s*=(?!=)\s*([^;]*)/g)) {
        const v = m[1]!.trim();
        if (!/Heartwood[`'"]\s*$/.test(v) && !/^(""|'')$/.test(v)) bad.push(`${at}: font assignment ${v.slice(0, 80)}`);
      }
      if (/\.setProperty\(\s*['"]font(-family)?['"]/.test(line)) bad.push(`${at}: setProperty font`);
      if (/\bnew FontFace\(/.test(line) && !/Heartwood/.test(line)) bad.push(`${at}: FontFace`);
    }));
    expect(bad).toEqual([]);
  });

  it('has no native title tooltip (it renders in the OS system font)', () => {
    const bad: string[] = [];
    files.forEach((p) => noBlock(readFileSync(p, 'utf8')).split(/\r?\n/).forEach((raw, i) => {
      const line = strip(raw).replace(/<title>.*?<\/title>/g, '');
      if (/\stitle\s*=\s*["'`$]/.test(line) || /\.title\s*=(?!=)/.test(line) || /setAttribute\(\s*['"]title['"]/.test(line) || /\[title\]/.test(line)) bad.push(`${rel(p)}:${i + 1}: ${line.trim().slice(0, 100)}`);
    }));
    expect(bad).toEqual([]);
  });

  it('CSS tokens --body and --display are Heartwood', () => {
    const css = readFileSync(join(ROOT, 'src/ui/style.css'), 'utf8');
    expect(css).toMatch(/--display:\s*"Heartwood"/); expect(css).toMatch(/--body:\s*"Heartwood"/);
    expect(css.match(/--body\s*:/g)?.length).toBe(1);
    expect(css).not.toMatch(/text-transform\s*:\s*uppercase/);   // small caps read E as C in Heartwood; sentence case only
  });
});

// ---- glyph coverage: every character the game can show must exist in the shipped font ----
const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB'];
/** Code points in the font's cmap, read straight from the woff2 (cmap is never transformed in WOFF2). */
function woff2Cmap(buf: Buffer): Set<number> {
  const n = buf.readUInt16BE(12); let o = 48;
  const b128 = (): number => { let v = 0; for (let i = 0; i < 5; i++) { const b = buf[o++]!; v = v * 128 + (b & 0x7f); if (!(b & 0x80)) break; } return v; };
  const tables: { tag: string; len: number }[] = [];
  for (let i = 0; i < n; i++) {
    const f = buf[o++]!; const ti = f & 0x3f; let tag: string;
    if (ti === 63) { tag = buf.toString('latin1', o, o + 4); o += 4; } else tag = KNOWN[ti]!;
    const orig = b128(); const ver = f >> 6;
    const transformed = tag === 'glyf' || tag === 'loca' ? ver === 0 : ver !== 0;
    tables.push({ tag, len: transformed ? b128() : orig });
  }
  const compLen = buf.readUInt32BE(20), data = brotliDecompressSync(buf.subarray(o, o + compLen));
  let at = 0, cm: Buffer | null = null;
  for (const t of tables) { if (t.tag === 'cmap') cm = data.subarray(at, at + t.len); at += t.len; }
  if (!cm) throw new Error('no cmap');
  const out = new Set<number>(); const subs = cm.readUInt16BE(2);
  for (let i = 0; i < subs; i++) {
    const so = cm.readUInt32BE(4 + i * 8 + 4), fmt = cm.readUInt16BE(so);
    if (fmt === 4) {
      const sc = cm.readUInt16BE(so + 6) / 2, endO = so + 14, startO = endO + sc * 2 + 2;
      for (let s = 0; s < sc; s++) { const e = cm.readUInt16BE(endO + s * 2), st = cm.readUInt16BE(startO + s * 2); for (let c = st; c <= e && c < 0xffff; c++) out.add(c); }
    } else if (fmt === 12) {
      const ng = cm.readUInt32BE(so + 12); for (let g = 0; g < ng; g++) { const b = so + 16 + g * 12; for (let c = cm.readUInt32BE(b); c <= cm.readUInt32BE(b + 4); c++) out.add(c); }
    }
  }
  return out;
}
/** Text of every string literal in a source file, comments and ${...} interpolations removed. */
function literals(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1');
  return [...code.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2]!.replace(/\$\{[^}]*\}/g, ''));
}

describe('Heartwood glyph coverage (TB-226)', () => {
  const cmap = woff2Cmap(readFileSync(join(ROOT, 'src/ui/fonts/heartwood-400.woff2')));
  it('reads a sane cmap', () => { expect(cmap.has(65)).toBe(true); expect(cmap.has(0xb7)).toBe(true); expect(cmap.size).toBeGreaterThan(90); });
  it('covers all printable ASCII (a pasted save or typed text never falls back)', () => {
    const miss: string[] = []; for (let c = 32; c <= 126; c++) if (!cmap.has(c)) miss.push(String.fromCharCode(c));
    expect(miss).toEqual([]);
  });
  it('covers every non-ASCII character in any source string', () => {
    const miss: string[] = [];
    files.filter((p) => /\.(ts|html)$/.test(p)).forEach((p) => {
      const lits = p.endsWith('.html') ? [readFileSync(p, 'utf8').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, '')] : literals(readFileSync(p, 'utf8'));
      for (const l of lits) for (const ch of l) if (ch.codePointAt(0)! > 126 && !cmap.has(ch.codePointAt(0)!)) miss.push(`${rel(p)}: U+${ch.codePointAt(0)!.toString(16).toUpperCase()} ${ch}`);
    });
    expect([...new Set(miss)]).toEqual([]);
  });
  it('covers every character the data modules can show (strings, node text, item text), by value, not by regex', async () => {
    const miss = new Set<string>(); const seen = new Set<unknown>();
    const take = (v: string, where: string): void => { for (const ch of v.replace(/<[^>]*>/g, '')) if (ch >= ' ' && !cmap.has(ch.codePointAt(0)!)) miss.add(`${where}: ${JSON.stringify(ch)} in ${JSON.stringify(v.slice(0, 50))}`); };
    const visit = (v: unknown, where: string, depth: number): void => {
      if (depth > 6 || v === null || seen.has(v)) return;
      if (typeof v === 'string') { if (/ /.test(v)) take(v, where); return; }
      if (typeof v === 'function') { for (const args of [[12, 3, 'Ab'], [1.5, 2, 'Cd'], ['Ab', 'Cd', 7]]) { try { const r = (v as (...a: unknown[]) => unknown)(...args); if (typeof r === 'string') take(r, where + '()'); else visit(r, where + '()', depth + 1); } catch { /* needs real state */ } } return; }
      if (typeof v === 'object') { seen.add(v); for (const [k, x] of Object.entries(v as object)) visit(x, `${where}.${k}`, depth + 1); }
    };
    const mods = import.meta.glob('../data/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;
    for (const [path, m] of Object.entries(mods)) if (!/\.test\.ts$/.test(path)) for (const [k, v] of Object.entries(m)) visit(v, `${path}:${k}`, 0);
    expect(Object.keys(mods).length).toBeGreaterThan(5);
    expect([...miss].slice(0, 20)).toEqual([]);
  });
});
