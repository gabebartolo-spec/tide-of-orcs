/**
 * Orc arena: drop chosen orcs on a fresh field at any wave and see what they do, without playing up to that wave.
 * `npm run arena -- --wave 40 --orcs drummer:2,grunt:20 [--budget 2e6] [--vans spear,blade] [--secs 120] [--seeds 3] [--tide] [--tune ...]`
 * --orcs kind:n[@secs]: n of that kind march in at the start, or one every `secs` when @secs is given.
 * --load file.json: play as the player `npm run balance -- --save file.json` saved at its best wave (default wave: that wave).
 * --levels id:rank,...: run-tree ranks owned before the budget is spent.
 * --budget: starlight the player spends on the run tree first (cheapest node, then the next, like the balance runner); 0 = bare.
 * --vans: vanguards placed before the first orc. --tide keeps the wave's ordinary marching on; without it only --orcs march.
 * The wave never advances. Reports per seed and the average: seconds the wall stood (cap --secs), wall health left, kills and
 * landed swings per kind, fireballs, rider leaps, vanguards fallen, and the share of live orcs inside a drum's reach.
 * --vs grunt: also runs the same counts as that kind, so the difference is the new kind's own effect.
 */
import { readFileSync } from 'node:fs';
import { MetaState, RunState, createState, freshRun, recompute, SimState } from '../src/sim/state';
import { EventBus } from '../src/sim/events';
import { spawnOrc, step } from '../src/sim/step';
import { crowdAim } from '../src/sim/combat';
import { placeVanguard } from '../src/sim/vanguard';
import { buy, canBuy, costOf } from '../src/sim/tree';
import { barFrac } from '../src/sim/barricade';
import { NODES, NodeId } from '../src/data/skillTree';
import { ARROWS, BARRICADE, LOB, NODE_FX, PLAYER, SHOT_FX, SOURCES, STEP, UNIT_FX, VANGUARD, VanType } from '../src/data/balance';
import { AFFIX } from '../src/data/lootTables';
import { FIREBALL, ORC_FX, ORC_KINDS, ORC_TYPES, OrcKind } from '../src/data/orcs';
import { BOSS_WAVE } from '../src/data/bosses';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] ?? d : d; };
/** --load file.json: start as the player the balance runner saved with --save (its tree, tier, Heartwood and gear). */
const loaded = arg('load', '') ? JSON.parse(readFileSync(arg('load', ''), 'utf-8')) as { wave: number; tier: number; levels: RunState['levels']; meta: MetaState } : null;
const wave = Number(arg('wave', String(loaded?.wave ?? 40))), secs = Number(arg('secs', '120')), seeds = Number(arg('seeds', '3')), budget = Number(arg('budget', '0'));
const tide = args.includes('--tide'), vs = arg('vs', '') as OrcKind | '';
const vans = arg('vans', '').split(',').filter(Boolean) as VanType[];
const TUNE: Record<string, unknown> = { ORC_TYPES, ORC_FX, FIREBALL, BOSS_WAVE, NODE_FX, UNIT_FX, SHOT_FX, SOURCES, ARROWS, PLAYER, LOB, BARRICADE, VANGUARD, AFFIX };
for (const kv of arg('tune', '').split(',').filter(Boolean)) {
  const [path, v] = kv.split('='), keys = path!.split('.'), last = keys.pop()!;
  const obj = keys.reduce<Record<string, unknown>>((o, k) => (o === TUNE ? TUNE[k] : o[k]) as Record<string, unknown>, TUNE);
  obj[last] = Number(v);
}
interface Order { kind: OrcKind; n: number; every: number }
const orders: Order[] = arg('orcs', 'grunt:20').split(',').map((x) => {
  const [k, rest] = x.split(':'), [n, every] = (rest ?? '1').split('@');
  if (!ORC_KINDS.includes(k as OrcKind)) throw new Error(`unknown orc kind ${k}; one of ${ORC_KINDS.join(', ')}`);
  return { kind: k as OrcKind, n: Number(n), every: Number(every ?? 0) };
});
// Without --tide only the ordered orcs march: no kind joins on its own and no boss wave unlocks.
if (!tide) { for (const k of ORC_KINDS) (ORC_TYPES[k] as { from: number }).from = 0; (BOSS_WAVE as { every: number }).every = 1e9; }

interface Tally { stood: number; wall: number; kills: Record<string, number>; swings: Record<string, number>; fireballs: number; fireHits: number; leaps: number; vanFell: number; drummed: number }

/** Spend the budget as the balance runner does; nodes are bought only between runs, so the wall is down while shopping. */
function shop(s: SimState, ev: EventBus): void {
  for (const kv of arg('levels', '').split(',').filter(Boolean)) { const [k, v] = kv.split(':'); s.run.levels[k as NodeId] = Number(v); }
  s.run.fallen = true;
  for (;;) {
    const opts = NODES.filter((n) => canBuy(s, n)).sort((a, b) => costOf(s, a) - costOf(s, b));
    if (!opts[0] || !buy(s, ev, opts[0].id)) break;
  }
  s.run.fallen = false; recompute(s); s.run.barHp = s.stats.barMax;
}

function arenaState(seed: number): SimState {
  const run = freshRun(); run.wave = wave; run.starlight = budget;
  if (loaded) { run.levels = structuredClone(loaded.levels); run.tier = loaded.tier; }
  const s = createState(seed, run, loaded ? structuredClone(loaded.meta) : undefined); s.meta.checkpoint = wave; recompute(s);
  return s;
}

function fight(seed: number, swap: OrcKind | null): Tally {
  const s = arenaState(seed), ev = new EventBus();
  shop(s, ev); ev.drain();
  for (const v of vans) placeVanguard(s, v);
  const plan = orders.map((o) => ({ ...o, kind: swap ?? o.kind, left: o.n, t: 0 }));
  const T: Tally = { stood: secs, wall: 0, kills: {}, swings: {}, fireballs: 0, fireHits: 0, leaps: 0, vanFell: 0, drummed: 0 };
  let live = 0, drummed = 0;
  for (let t = 0; t < secs; t += STEP) {
    for (const p of plan) {
      if (p.every) { p.t += STEP; while (p.t >= p.every && p.left > 0) { p.t -= p.every; p.left--; spawnOrc(s, p.kind); } }
      else for (; p.left > 0; p.left--) spawnOrc(s, p.kind);
    }
    s.run.waveT = 0; // hold the wave
    step(s, STEP, { aim: crowdAim(s, s.stats.radius) }, ev);
    for (const e of ev.drain()) {
      if (e.t === 'kill') T.kills[e.kind] = (T.kills[e.kind] ?? 0) + 1;
      else if (e.t === 'orcSwing') T.swings[e.kind] = (T.swings[e.kind] ?? 0) + 1;
      else if (e.t === 'fireballCast') T.fireballs++; else if (e.t === 'fireballStrike') T.fireHits++;
      else if (e.t === 'riderLeap') T.leaps++; else if (e.t === 'vanguardFell') T.vanFell++;
    }
    s.orcs.forEach((o) => { live++; if (o.drum) drummed++; });
    if (s.run.fallen) { T.stood = Math.round(t); break; }
  }
  T.wall = s.run.fallen ? 0 : Math.round(barFrac(s) * 100); T.drummed = live ? Math.round((1000 * drummed) / live) / 10 : 0;
  return T;
}

const fmt = (r: Record<string, number>) => Object.entries(r).map(([k, n]) => `${k} ${n}`).join(', ') || '-';
function report(label: string, swap: OrcKind | null): void {
  const all: Tally[] = [];
  console.log(`\n## ${label}`);
  console.log('| seed | wall stood (s) | wall left | kills | swings landed | fireballs cast/struck | leaps | vanguards fallen | drummed |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (let seed = 1; seed <= seeds; seed++) {
    const T = fight(seed, swap); all.push(T);
    console.log(`| ${seed} | ${T.stood} | ${T.wall}% | ${fmt(T.kills)} | ${fmt(T.swings)} | ${T.fireballs}/${T.fireHits} | ${T.leaps} | ${T.vanFell} | ${T.drummed}% |`);
  }
  const avg = (f: (t: Tally) => number) => Math.round((all.reduce((a, t) => a + f(t), 0) / all.length) * 10) / 10;
  console.log(`| avg | ${avg((t) => t.stood)} | ${avg((t) => t.wall)}% | | | ${avg((t) => t.fireballs)}/${avg((t) => t.fireHits)} | ${avg((t) => t.leaps)} | ${avg((t) => t.vanFell)} | ${avg((t) => t.drummed)}% |`);
}

const probe = arenaState(1); shop(probe, new EventBus());
console.log(`Arena: wave ${wave}, ${secs} s, orcs ${arg('orcs', 'grunt:20')}${tide ? ' + the wave\'s tide' : ''}, vanguards ${vans.join(',') || 'none'}, ${loaded ? `player loaded from ${arg('load', '')}, ` : ''}budget ${budget} (${Object.keys(probe.run.levels).length} nodes, ${Object.values(probe.run.levels).reduce((a, n) => a + (n ?? 0), 0)} ranks owned).`);
report(arg('orcs', 'grunt:20'), null);
if (vs) report(`same counts as ${vs}`, vs);
