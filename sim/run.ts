/**
 * Headless balance runner. `npm run balance -- --minutes 30 --policy greedy [--seed 1] [--quiet]`
 * Plays the pure sim with a scripted buy/rally policy and prints a per-minute markdown table.
 * Writes sim/out/<policy>-<date>.md unless --quiet.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { SimState, createState } from '../src/sim/state';
import { EventBus } from '../src/sim/events';
import { step } from '../src/sim/step';
import { crowdAim } from '../src/sim/combat';
import { buy, canBuy, costOf } from '../src/sim/tree';
import { canRally, rally } from '../src/sim/vanguard';
import { canReplant, replant } from '../src/sim/prestige';
import { NODES, NodeId } from '../src/data/skillTree';
import { STEP } from '../src/data/balance';
import { barFrac } from '../src/sim/barricade';

type Policy = 'greedy' | 'wall' | 'dps' | 'nobuy';
const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] ?? d : d; };
const minutes = Number(arg('minutes', '30')), policy = arg('policy', 'greedy') as Policy, seed = Number(arg('seed', '1')), quiet = args.includes('--quiet');

const s = createState(seed); const ev = new EventBus();
const rows: string[] = []; let falls = 0, fallWave = '-', lastKills = 0;
const fallWaves: number[] = [], fallMins: number[] = [];

/** Keep the wall: rally when it's under the threshold and we can afford it. */
function rallyIfLow(st: SimState, bus: EventBus, at: number): void {
  if (barFrac(st) < 0.5 && canRally(st, 'blade')) rally(st, bus, 'blade');
  else if (barFrac(st) < at && canRally(st, 'spear')) rally(st, bus, 'spear');
}

/**
 * dps policy (TB-040): starlight earned over a lookahead with this node bought, minus without, per starlight spent.
 * Each trial restarts from the run and meta on an empty field (the same as loading a save), with greedy rallying and no other buys.
 */
const DPS = { lookahead: 120, every: 15, candidates: 6 } as const;
function trial(buyId: NodeId | null): number {
  const t = createState(seed * 7919 + s.tick, structuredClone(s.run), structuredClone(s.meta)), bus = new EventBus();
  if (buyId) buy(t, bus, buyId);
  const e0 = t.run.earned, n = Math.round(DPS.lookahead / STEP);
  for (let i = 0; i < n && !t.run.fallen; i++) { step(t, STEP, { aim: crowdAim(t, t.stats.radius) }, bus); if (i % 25 === 0) rallyIfLow(t, bus, 0.5); bus.drain(); }
  return t.run.earned - e0;
}
let dpsPick: NodeId | null = null, dpsAt = -Infinity;
function dpsChoose(): NodeId | null {
  const opts = NODES.filter((n) => canBuy(s, n)).sort((a, b) => costOf(s, a) - costOf(s, b)).slice(0, DPS.candidates);
  if (!opts.length) return null;
  const base = trial(null);
  let best: NodeId | null = null, bestV = 0;
  for (const n of opts) { const v = (trial(n.id) - base) / Math.max(1, costOf(s, n)); if (v > bestV) { bestV = v; best = n.id; } }
  // nothing pays back in starlight within the lookahead (wall and vanguard nodes): fall back to the cheapest
  return best ?? opts[0]!.id;
}

function decide(): void {
  if (s.run.fallen) { if (canReplant(s)) { replant(s, ev); falls++; dpsAt = -Infinity; lastKills = 0; } return; }
  if (policy === 'nobuy') return;
  rallyIfLow(s, ev, policy === 'wall' ? 0.9 : 0.5);
  if (policy === 'dps') {
    // re-plan every DPS.every seconds of run time, and at once after a purchase or replant
    if (s.run.runTime - dpsAt >= DPS.every) { dpsPick = dpsChoose(); dpsAt = s.run.runTime; }
    if (dpsPick && buy(s, ev, dpsPick)) dpsAt = -Infinity;
    return;
  }
  // cheapest affordable node, with branch weighting
  const weight = (b: string) => (policy === 'wall' && (b === 'Barricade' || b === 'Vanguard') ? 0.5 : 1);
  const opts = NODES.filter((n) => canBuy(s, n)).sort((a, b) => costOf(s, a) * weight(a.branch) - costOf(s, b) * weight(b.branch));
  if (opts[0]) buy(s, ev, opts[0].id);
}

const total = Math.round((minutes * 60) / STEP);
for (let i = 0; i < total; i++) {
  step(s, STEP, { aim: crowdAim(s, s.stats.radius) }, ev); // player model: aims at the thickest crowd
  if (i % 25 === 0) decide();
  for (const e of ev.drain()) if (e.t === 'barricadeFell') { if (fallWave === '-') fallWave = String(e.wave); fallWaves.push(e.wave); fallMins.push(Math.round(e.runTime / 6) / 10); }
  if (i % Math.round(60 / STEP) === 0) {
    const m = Math.round(i * STEP / 60);
    const owned = Object.values(s.run.levels).reduce((a, b) => a + (b ?? 0), 0) - 1;
    rows.push(`| ${m} | ${s.run.wave} | ${Math.floor(s.run.starlight)} | ${s.run.kills - lastKills} | ${s.run.kills} | ${Math.round(barFrac(s) * 100)}% | ${s.vans.count} | ${owned} | ${s.meta.heartwood} | ${falls} |`);
    lastKills = s.run.kills;
  }
}

const header = `# Balance run · policy=${policy} seed=${seed} minutes=${minutes}\n\n| min | wave | starlight | kills/min | kills | wall | vanguard | nodes | HW | falls |\n|---|---|---|---|---|---|---|---|---|---|\n`;
const summary = `
First fall at wave ${fallWave}. Falls (wave@run minutes): ${fallWaves.length ? fallWaves.map((w, i) => `${w}@${fallMins[i]}`).join(', ') : '-'}. Replants: ${falls}. Heartwood: ${s.meta.heartwood}. Best wave: ${s.meta.bestWave}.
`;
const report = header + rows.join('\n') + '\n' + summary;
console.log(report);
if (!quiet) {
  mkdirSync('sim/out', { recursive: true });
  const f = `sim/out/${policy}-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(f, report); console.log(`wrote ${f}`);
}
