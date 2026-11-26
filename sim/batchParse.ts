/** Batch columns pulled from one balance report (TB-276); see sim/batch.ts. */
export interface Row { label: string; seed: number; best: number; mean20: number; w30: number; w50: number; w70: number; boss: number; hw: number }

/** Pulls the batch columns out of one balance report. -1 where the run never got there. */
export function parseReport(label: string, seed: number, rep: string): Row {
  const num = (re: RegExp) => { const m = rep.match(re); return m ? Number(m[1]) : -1; };
  const falls = (rep.match(/Falls \(wave@run minutes\): (.*?)\. Replants:/)?.[1] ?? '').split(', ').map((x) => Number(x.split('@')[0])).filter((x) => x > 0);
  const last = falls.slice(-20), mean20 = last.length ? Math.round((10 * last.reduce((a, b) => a + b, 0)) / last.length) / 10 : -1;
  const waves = [...rep.matchAll(/^\| (\d+) \| (\d+) \|/gm)].map((m) => [Number(m[1]), Number(m[2])] as const);
  const reach = (w: number) => waves.find(([, x]) => x >= w)?.[0] ?? -1;
  const boss = num(/First boss cleared: run \d+, run min [\d.]+, play min (\d+(?:\.\d+)?)/);
  return { label, seed, best: num(/Best wave: (\d+)/), mean20, w30: reach(30), w50: reach(50), w70: reach(70), boss, hw: num(/Heartwood nodes bought: (\d+)/) };
}
