/**
 * Headless balance runner. `npm run balance -- --minutes 30 --policy greedy [--loot greedy|hoarder] [--hw hw_find:2,hw_fortune:1] [--bare] [--seed 1] [--quiet]`
 * Loot targets (TB-108, BALANCE.md §Loot): first drop minute, first of each rarity (run, minute, bosses), first 6-piece set, gear and mythic power ratios.
 * --bare never wears gear (the baseline for waves gained); --hw starts with those Heartwood ranks.
 * --tune 'BOSS_WAVE.every=50,RARITY.weights.legendary.1=5' overrides data constants for a sweep (never written back).
 * The loot policy also chases sets: once four or more slots of one set are owned, it wears them.
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
import { STEP, waveHP } from '../src/data/balance';
import { BOSS_WAVE } from '../src/data/bosses';
import { AFFIX, DROP, RARITY } from '../src/data/lootTables';
import { SLOTS } from '../src/data/loot';
import { barFrac } from '../src/sim/barricade';
import { EquipPolicy, equippedItems, itemScore } from '../src/sim/loot';
import { summonBoss } from '../src/sim/boss';
import { setCounts } from '../src/sim/gear';
import { recompute } from '../src/sim/state';
import { HwId } from '../src/data/heartwood';

type Policy = 'greedy' | 'wall' | 'dps' | 'nobuy';
const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] ?? d : d; };
const minutes = Number(arg('minutes', '30')), policy = arg('policy', 'greedy') as Policy, seed = Number(arg('seed', '1')), quiet = args.includes('--quiet');
/** Loot (TB-093/094): the sim rolls drops on its own RNG; the runner picks the equip policy. */
const lootPolicy = arg('loot', 'greedy') as EquipPolicy; let drops = 0;

const s = createState(seed); const ev = new EventBus(); s.lootPolicy = lootPolicy;
const bare = args.includes('--bare');
const TUNE: Record<string, unknown> = { BOSS_WAVE, RARITY, DROP, AFFIX };
for (const kv of arg('tune', '').split(',').filter(Boolean)) {
  const [path, v] = kv.split('='), keys = path!.split('.'), last = keys.pop()!;
  const obj = keys.reduce<Record<string, unknown>>((o, k) => (o === TUNE ? TUNE[k] : o[k]) as Record<string, unknown>, TUNE);
  obj[last] = Number(v);
}
for (const kv of arg('hw', '').split(',').filter(Boolean)) { const [k, v] = kv.split(':'); s.meta.hwLevels[k as HwId] = Number(v); }
recompute(s);
/** Loot milestones: rarity → "run r, min m, boss b"; the first 6-piece set; bosses fought. */
const firsts: Record<string, string> = {}; let bosses = 0, firstDrop = '-', firstSix = '-';
const at = (i: number) => (i * STEP / 60).toFixed(1);
/** Wave the current run falls at with the worn gear changed by `strip`, played on from a copy with no more buys (bosses skipped).
 *  Starlight over a window was useless here: kills are capped by spawns, so gear barely moved it. */
function gearTrial(strip: (l: SimState['meta']['loot']) => void): number {
  const meta = structuredClone(s.meta); strip(meta.loot);
  const t = createState(seed * 7919 + s.tick, structuredClone(s.run), meta), bus = new EventBus();
  const n = Math.round(3600 / STEP);
  for (let i = 0; i < n && !t.run.fallen; i++) { step(t, STEP, { aim: crowdAim(t, t.stats.radius) }, bus); if (i % 25 === 0) rallyIfLow(t, bus, 0.5); bus.drain(); }
  return t.run.wave;
}
/** Sim-only set chase: wear the best owned piece in each slot of the set with the most owned slots, once that is four or more. */
function chaseSet(): void {
  const l = s.meta.loot, by: Record<string, Record<string, string>> = {};
  for (const it of l.items) if (it.set) { const m = (by[it.set] ??= {}), cur = l.items.find((x) => x.uid === m[it.slot]); if (!cur || itemScore(it) > itemScore(cur)) m[it.slot] = it.uid; }
  const best = Object.values(by).sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0];
  if (!best || Object.keys(best).length < 4) return;
  let changed = false;
  for (const slot of SLOTS) if (best[slot] && l.equipped[slot] !== best[slot]) { l.equipped[slot] = best[slot]; changed = true; }
  if (changed) recompute(s);
}
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
  if (bare && Object.keys(s.meta.loot.equipped).length) { s.meta.loot.equipped = {}; recompute(s); }
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
  for (const e of ev.drain()) if (e.t === 'bossReady') summonBoss(s, ev); else if (e.t === 'bossEnd') bosses++; else if (e.t === 'loot') {
    drops++; if (firstDrop === '-') firstDrop = at(i);
    firsts[e.rarity] ??= `run ${falls + 1}, min ${at(i)}, boss ${bosses}`;
  } else if (e.t === 'barricadeFell') { if (fallWave === '-') fallWave = String(e.wave); fallWaves.push(e.wave); fallMins.push(Math.round(e.runTime / 6) / 10); }
  if (i % Math.round(60 / STEP) === 0) {
    if (!bare) chaseSet();
    if (firstSix === '-' && Object.values(setCounts(s.meta.loot)).some((n) => n >= 6)) firstSix = at(i);
    const m = Math.round(i * STEP / 60);
    const owned = Object.values(s.run.levels).reduce((a, b) => a + (b ?? 0), 0) - 1;
    rows.push(`| ${m} | ${s.run.wave} | ${Math.floor(s.run.starlight)} | ${s.run.kills - lastKills} | ${s.run.kills} | ${Math.round(barFrac(s) * 100)}% | ${s.vans.count} | ${owned} | ${s.meta.heartwood} | ${falls} | ${drops} | ${s.meta.loot.items.length} | ${equippedItems(s.meta.loot).reduce((a, x) => a + itemScore(x), 0).toFixed(2)} |`);
    lastKills = s.run.kills;
  }
}

const header = `# Balance run · policy=${policy} loot=${lootPolicy} seed=${seed} minutes=${minutes}\n\n| min | wave | starlight | kills/min | kills | wall | vanguard | nodes | HW | falls | drops | satchel | gear |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
const summary = `
First fall at wave ${fallWave}. Falls (wave@run minutes): ${fallWaves.length ? fallWaves.map((w, i) => `${w}@${fallMins[i]}`).join(', ') : '-'}. Replants: ${falls}. Heartwood: ${s.meta.heartwood}. Best wave: ${s.meta.bestWave}.
`;
const worn = equippedItems(s.meta.loot), withGear = gearTrial(() => {}), noGear = gearTrial((l) => { l.equipped = {}; });
const myth = worn.filter((x) => x.rarity === 'mythic'), noMyth = myth.length ? gearTrial((l) => { for (const x of myth) delete l.equipped[x.slot]; }) : 0;
const ratio = (a: number, b: number) => (b > 0 ? `${Math.round((a / b - 1) * 100)}%` : '-');
const lootSummary = `
Loot (TB-108)${bare ? ' [bare]' : ''}: first drop min ${firstDrop}. ${['rare', 'epic', 'legendary', 'mythic'].map((r) => `First ${r}: ${firsts[r] ?? '-'}`).join('. ')}. First 6-piece set: min ${firstSix}. Bosses: ${bosses}.
Worn at end: ${worn.map((x) => x.rarity[0]).join('') || '-'}. Run played on to its fall: wave ${withGear} worn, ${noGear} bare (+${withGear - noGear} waves; orc HP held ${ratio(waveHP(withGear), waveHP(noGear))})${myth.length ? `, ${noMyth} without the mythic (orc HP ${ratio(waveHP(withGear), waveHP(noMyth))})` : ''}.
`;
const report = header + rows.join('\n') + '\n' + summary + lootSummary;
console.log(report);
if (!quiet) {
  mkdirSync('sim/out', { recursive: true });
  const f = `sim/out/${policy}-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(f, report); console.log(`wrote ${f}`);
}
