/**
 * Spearman vs Seasoned Timber (BALANCE.md §Pacing targets): extra seconds the wall stands from a fresh field
 * at wave W, per starlight spent, for one spearman vs one Timber rank. `npx tsx sim/spearman.ts`
 */
import { createState, freshRun, recompute } from '../src/sim/state';
import { EventBus } from '../src/sim/events';
import { step } from '../src/sim/step';
import { crowdAim } from '../src/sim/combat';
import { placeVanguard } from '../src/sim/vanguard';
import { costOf } from '../src/sim/tree';
import { NODES } from '../src/data/skillTree';
import { STEP, vanCost } from '../src/data/balance';

const LIMIT = 600;
function stand(seed: number, wave: number, mod: 'none' | 'spear' | 'timber'): number {
  const run = freshRun(); run.wave = wave; run.levels = { root: 1, muster: 1 };
  if (mod === 'timber') run.levels.timber = 1;
  const s = createState(seed, run); recompute(s); const ev = new EventBus();
  if (mod === 'spear') placeVanguard(s, 'spear');
  let t = 0;
  while (!s.run.fallen && t < LIMIT) { step(s, STEP, { aim: crowdAim(s, s.stats.radius) }, ev); ev.drain(); t += STEP; }
  return t;
}
const timberCost = costOf(createState(1), NODES.find((n) => n.id === 'timber')!);
const ratios: number[] = [];
for (const w of [3, 6, 10, 14]) {
  const row: string[] = [];
  for (const seed of [1, 2, 3]) {
    const base = stand(seed, w, 'none');
    const sp = (stand(seed, w, 'spear') - base) / vanCost('spear', w), tb = (stand(seed, w, 'timber') - base) / timberCost;
    const r = tb > 0 ? sp / tb : Infinity; ratios.push(r); row.push(r.toFixed(2));
  }
  console.log(`w${w} ratios ${row.join(' ')}`);
}
ratios.sort((a, b) => a - b);
console.log(`median ${((ratios[5]! + ratios[6]!) / 2).toFixed(2)}, ≥1 in ${ratios.filter((r) => r >= 1).length} of 12`);
