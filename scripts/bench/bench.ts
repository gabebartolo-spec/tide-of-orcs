// Field benchmark page (TB-217). Served by the Vite dev server at /scripts/bench/bench.html and driven by scripts/bench/run.mjs.
// A seeded late-wave state (every node at max rank, wave 60, 8 vanguard, the plain kept at ORC_CAP with mixed kinds) runs
// warm + frames render frames at 60 Hz; each frame times the sim steps, the field draw's JS and the rAF frame gap. Math.random is seeded too, so the last frame (frozen.png) is pixel-repeatable for the same warm + frames.
import { createState, recompute } from '../../src/sim/state';
import { step, spawnOrc } from '../../src/sim/step';
import { placeVanguard } from '../../src/sim/vanguard';
import { EventBus } from '../../src/sim/events';
import { NODES } from '../../src/data/skillTree';
import { ORC_CAP, STEP } from '../../src/data/balance';
import { OrcKind } from '../../src/data/orcs';
import { FieldRenderer } from '../../src/render/field';

const q = new URLSearchParams(location.search);
const WARM = Number(q.get('warm') ?? 120), FRAMES = Number(q.get('frames') ?? 600);
let seed = 0x2545f491;
Math.random = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const KINDS: OrcKind[] = ['grunt', 'grunt', 'grunt', 'runner', 'runner', 'brute', 'elite', 'berserker', 'wolfrider', 'shaman', 'drummer'];
const stats = (a: number[]): { mean: number; p50: number; p95: number; max: number } => {
  const b = [...a].sort((x, y) => x - y), at = (p: number): number => +b[Math.min(b.length - 1, Math.floor(b.length * p))]!.toFixed(3);
  return { mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3), p50: at(0.5), p95: at(0.95), max: at(1) };
};

async function run(): Promise<unknown> {
  const canvas = document.getElementById('c') as HTMLCanvasElement, field = new FieldRenderer(canvas);
  await field.sprites.load('/');
  // ?split=1: time each draw helper with a GPU flush on both sides, so raster cost lands on the helper that queued it
  const split: Record<string, number> = {}, g0 = canvas.getContext('2d')!; let depth = 0;
  const wrap = (o: Record<string, unknown>, name: string, label: string): void => {
    const fn = o[name] as (...a: unknown[]) => unknown;
    o[name] = function (this: unknown, ...a: unknown[]) {
      if (depth++) { try { return fn.apply(this, a); } finally { depth--; } }
      g0.getImageData(0, 0, 1, 1); const t = performance.now();
      try { return fn.apply(this, a); } finally { g0.getImageData(0, 0, 1, 1); split[label] = (split[label] ?? 0) + performance.now() - t; depth--; }
    };
  };
  // ?skip=orc,ground.draw: ablation, those helpers draw nothing (their cost is the drop in drawMs)
  // ?skip=tint: measurement only, actors draw untinted and unrimmed (the cost of the burning/chilled bakes)
  if ((q.get('skip') ?? '').split(',').includes('tint')) {
    const sp = field.sprites as unknown as { draw: (...a: unknown[]) => boolean }, d0 = sp.draw.bind(sp);
    sp.draw = (...a: unknown[]): boolean => d0(...a.slice(0, 7));
  }
  for (const name of (q.get('skip') ?? '').split(',').filter((x) => x && x !== 'tint')) {
    const [a, b] = name.split('.'), o = (b ? (field as unknown as Record<string, Record<string, unknown>>)[a!] : field) as Record<string, unknown>;
    o[b ?? a!] = (): boolean => true;
  }
  if (q.get('split')) {
    const F = field as unknown as Record<string, Record<string, unknown>>, proto = Object.getPrototypeOf(field) as Record<string, unknown>;
    for (const m of Object.getOwnPropertyNames(proto)) if (!['constructor', 'draw', 'consume', 'resize', 'toWorld', 'timeScale'].includes(m) && typeof Object.getOwnPropertyDescriptor(proto, m)!.value === 'function') wrap(field as unknown as Record<string, unknown>, m, m);
    for (const [obj, m] of [['ground', 'draw'], ['fx', 'draw'], ['fx', 'drawGround'], ['ambience', 'motesDraw'], ['ceremony', 'draw']] as const) wrap(F[obj]!, m, `${obj}.${m}`);
  }
  const s = createState(1234), ev = new EventBus();
  for (const n of NODES) s.run.levels[n.id] = n.max;
  s.run.wave = 60; s.meta.bestWave = 60; recompute(s, { heal: true });
  for (let i = 0; i < 8; i++) placeVanguard(s, i % 2 ? 'blade' : 'spear', true);
  let k = 0;
  const fill = (): void => { s.run.barHp = s.stats.barMax; s.run.fallen = false; while (s.orcs.count < ORC_CAP && spawnOrc(s, KINDS[k++ % KINDS.length]!)) { /* fill */ } };
  // spread the first tide over the plain so frame 1 is already crowded
  fill(); let j = 0; s.orcs.forEach((o) => { o.x = 170 + 720 * ((j++ * 0.618) % 1); });
  const sim: number[] = [], draw: number[] = [], gap: number[] = [], g = canvas.getContext('2d')!, flush = !!q.get('flush');
  let acc = 0, frozen = '', f = 0, last = 0;
  // rAF-paced (Chrome runs uncapped with --disable-frame-rate-limit), so `gap` is the real frame time including raster;
  // the sim still steps a fixed 1/60 s per frame, so every run sees the same states. ?flush=1 adds a 1 px readback after
  // each draw instead (raster then counts in drawMs, but a read-back canvas drops to software and skews canvas blits).
  await new Promise<void>((done) => {
    const frame = (now: number): void => {
      if (f > WARM) gap.push(now - last); last = now;
      const dt = 1 / 60, ang = f * 0.02, aim = { x: 520 + Math.cos(ang) * 220, y: 240 + Math.sin(ang * 1.3) * 150 };
      const t0 = performance.now();
      acc += dt; fill();
      while (acc >= STEP) { if (acc < 2 * STEP) field.interp.snap(s); step(s, STEP, { aim }, ev); acc -= STEP; }
      field.interp.alpha = acc / STEP;
      const t1 = performance.now();
      field.consume(ev.drain(), s); field.draw(s, dt, aim); if (flush) g.getImageData(0, 0, 1, 1);
      const t2 = performance.now();
      if (f === WARM - 1) for (const key in split) split[key] = 0;
      if (f >= WARM) { sim.push(t1 - t0); draw.push(t2 - t1); }
      if (++f < WARM + FRAMES) { requestAnimationFrame(frame); return; }
      frozen = canvas.toDataURL('image/png'); done();
    };
    requestAnimationFrame(frame);
  });
  let burn = 0, chill = 0; s.orcs.forEach((o) => { if (o.burn > 0) burn++; else if (o.chill > 0) chill++; });
  return { canvas: [canvas.width, canvas.height], live: s.orcs.count, burn, chill, bakes: field.sprites.bakeCount, bakeSize: field.sprites.bakeSize, vans: s.vans.count, frames: FRAMES, simMs: stats(sim), drawMs: stats(draw), frameMs: stats(gap), fps: +(1000 / (gap.reduce((x, y) => x + y, 0) / gap.length)).toFixed(1),
    split: Object.fromEntries(Object.entries(split).sort((x, y) => y[1] - x[1]).map(([k2, v]) => [k2, +(v / FRAMES).toFixed(3)])), frozen };
}
(window as unknown as { bench: Promise<unknown> }).bench = run();
