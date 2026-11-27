/**
 * Balance batch runner (TB-276). `npm run batch -- jobs.txt [--seeds 1-5] [--jobs 4] [--out sim/out/batch-b]`
 * --only a,b runs just those labels. --list prints the labels as JSON and exits (for the CI matrix).
 * jobs.txt: one job per line, `label | balance runner flags` (blank lines and # comments skipped), e.g.
 *   fox | --minutes 90 --hwbuy --path fox
 * Each job runs once per seed through sim/run.ts (--quiet). Every report is kept as <out>/<label>-s<seed>.md and one CSV
 * row per run goes to <out>/runs.csv: best wave, mean of the last 20 fall waves (smoother than best wave, which steps at
 * boss walls), play minute the run first stood on wave 30/50/70, first boss cleared (play minute), Heartwood nodes bought.
 * The table it prints groups by label: mean and spread over seeds.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseReport, Row } from './batchParse';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] ?? d : d; };
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!file) throw new Error('usage: npm run batch -- jobs.txt [--seeds 1-5] [--jobs 4] [--out dir]');
const [s0, s1] = arg('seeds', '1-5').split('-').map(Number), seeds: number[] = [];
for (let x = s0!; x <= (s1 ?? s0!); x++) seeds.push(x);
const par = Number(arg('jobs', '4')), out = arg('out', `sim/out/batch-${Date.now()}`);

const jobs = readFileSync(file, 'utf-8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
  const [label = '', flags = ''] = l.split('|').map((x) => x.trim());
  return { label, flags: flags.split(/\s+/).filter(Boolean) };
});
/** --only fox,base: just those labels (the CI matrix runs one label per job). */
const only = arg('only', '').split(',').filter(Boolean);
if (only.some((l) => !jobs.some((j) => j.label === l))) throw new Error(`--only names a label not in ${file}`);
if (only.length) jobs.splice(0, jobs.length, ...jobs.filter((j) => only.includes(j.label)));
const runs = jobs.flatMap((j) => seeds.map((seed) => ({ ...j, seed })));

function runOne(r: (typeof runs)[number]): Promise<Row> {
  return new Promise((res, rej) => {
    const p = spawn('npx', ['tsx', 'sim/run.ts', ...r.flags, '--seed', String(r.seed), '--quiet'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let o = '', e = '';
    p.stdout.on('data', (d) => (o += d)); p.stderr.on('data', (d) => (e += d));
    p.on('close', (code) => {
      if (code !== 0) return rej(new Error(`${r.label} seed ${r.seed}: ${e.slice(0, 400)}`));
      writeFileSync(`${out}/${r.label}-s${r.seed}.md`, `flags: ${r.flags.join(' ')}\n\n${o}`);
      res(parseReport(r.label, r.seed, o));
    });
  });
}

if (args.includes('--list')) { console.log(JSON.stringify(jobs.map((j) => j.label))); process.exit(0); }
mkdirSync(out, { recursive: true });
const rows: Row[] = []; let next = 0;
const cols: (keyof Row)[] = ['label', 'seed', 'best', 'mean20', 'w30', 'w50', 'w70', 'boss', 'hw', 'hwLeft', 'tiers'];
async function worker(): Promise<void> {
  while (next < runs.length) {
    const r = runs[next++]!, row = await runOne(r); rows.push(row);
    writeFileSync(`${out}/runs.csv`, [cols.join(','), ...rows.map((x) => cols.map((c) => x[c]).join(','))].join('\n') + '\n');
    console.log(`${rows.length}/${runs.length} ${r.label} s${r.seed}: best ${row.best}, mean20 ${row.mean20}, w50 ${row.w50}`);
  }
}
{
  await Promise.all(Array.from({ length: par }, worker));
  const avg = (xs: number[]) => { const v = xs.filter((x) => x >= 0); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) + (v.length < xs.length ? `(${v.length})` : '') : '-'; };
  const lines = ['| label | best | mean20 | min to w30 | w50 | w70 | boss min | hw | hw left | tiers | best min–max |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const j of jobs) {
    const g = rows.filter((x) => x.label === j.label), b = g.map((x) => x.best);
    lines.push(`| ${j.label} | ${avg(b)} | ${avg(g.map((x) => x.mean20))} | ${avg(g.map((x) => x.w30))} | ${avg(g.map((x) => x.w50))} | ${avg(g.map((x) => x.w70))} | ${avg(g.map((x) => x.boss))} | ${avg(g.map((x) => x.hw))} | ${avg(g.map((x) => x.hwLeft))} | ${avg(g.map((x) => x.tiers))} | ${Math.min(...b)}–${Math.max(...b)} |`);
  }
  writeFileSync(`${out}/summary.md`, lines.join('\n') + '\n'); console.log(lines.join('\n'));
}
