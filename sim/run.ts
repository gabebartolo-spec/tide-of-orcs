/**
 * Headless balance runner. `npm run balance -- --minutes 30 --policy greedy [--seed 1] [--quiet]`
 * Plays the pure sim with a scripted buy/rally policy and prints a per-minute markdown table.
 * Writes sim/out/<policy>-<date>.md unless --quiet.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createState } from '../src/sim/state';
import { EventBus } from '../src/sim/events';
import { noInputs, step } from '../src/sim/step';
import { buy, canBuy, costOf } from '../src/sim/tree';
import { canRally, rally } from '../src/sim/vanguard';
import { canReplant, replant } from '../src/sim/prestige';
import { NODES } from '../src/data/skillTree';
import { STEP } from '../src/data/balance';
import { barFrac } from '../src/sim/barricade';

type Policy = 'greedy' | 'wall' | 'river' | 'nobuy';
const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] ?? d : d; };
const minutes = Number(arg('minutes', '30')), policy = arg('policy', 'greedy') as Policy, seed = Number(arg('seed', '1')), quiet = args.includes('--quiet');

const s = createState(seed); const ev = new EventBus();
const rows: string[] = []; let falls = 0, fallWave = '-', lastKills = 0;

function decide(): void {
  if (s.run.fallen) { if (canReplant(s)) { replant(s, ev); falls++; } return; }
  if (policy === 'nobuy') return;
  // keep the wall: rally when it's under half and we can afford it
  if (barFrac(s) < 0.5 && canRally(s, 'blade')) rally(s, ev, 'blade');
  else if (barFrac(s) < (policy === 'wall' ? 0.9 : 0.5) && canRally(s, 'spear')) rally(s, ev, 'spear');
  // cheapest affordable node, with branch weighting
  const weight = (b: string) => (policy === 'wall' && (b === 'Barricade' || b === 'Vanguard') ? 0.5 : 1);
  const opts = NODES.filter((n) => canBuy(s, n)).sort((a, b) => costOf(s, a) * weight(a.branch) - costOf(s, b) * weight(b.branch));
  if (opts[0]) buy(s, ev, opts[0].id);
}

const total = Math.round((minutes * 60) / STEP);
for (let i = 0; i < total; i++) {
  step(s, STEP, noInputs, ev);
  if (i % 25 === 0) decide();
  for (const e of ev.drain()) if (e.t === 'barricadeFell') fallWave = String(e.wave);
  if (i % Math.round(60 / STEP) === 0) {
    const m = Math.round(i * STEP / 60);
    const owned = Object.values(s.run.levels).reduce((a, b) => a + (b ?? 0), 0) - 1;
    rows.push(`| ${m} | ${s.run.wave} | ${Math.floor(s.run.starlight)} | ${s.run.kills - lastKills} | ${s.run.kills} | ${Math.round(barFrac(s) * 100)}% | ${s.vans.count} | ${owned} | ${s.meta.heartwood} | ${falls} |`);
    lastKills = s.run.kills;
  }
}

const header = `# Balance run · policy=${policy} seed=${seed} minutes=${minutes}\n\n| min | wave | starlight | kills/min | kills | wall | vanguard | nodes | HW | falls |\n|---|---|---|---|---|---|---|---|---|---|\n`;
const summary = `\nFirst fall at wave ${fallWave}. Replants: ${falls}. Heartwood: ${s.meta.heartwood}. Best wave: ${s.meta.bestWave}.\n`;
const report = header + rows.join('\n') + '\n' + summary;
console.log(report);
if (!quiet) {
  mkdirSync('sim/out', { recursive: true });
  const f = `sim/out/${policy}-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(f, report); console.log(`wrote ${f}`);
}
