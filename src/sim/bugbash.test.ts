/** Regression tests for the TB-198 sim bug bash. */
import { describe, expect, it } from 'vitest';
import { Item } from '../data/loot';
import { MYTHICS, MYTHIC_FX } from '../data/lootTables';
import { LOB, ORC_CAP } from '../data/balance';
import { EventBus } from './events';
import { kill, lob } from './combat';
import { applyGear } from './gear';
import { pickUp } from './loot';
import { createState, freshMeta, freshRun, recompute } from './state';
import { deriveStats } from './stats';
import { noInputs, spawnOrc, step } from './step';

describe('TB-198 sim bug bash', () => {
  it('a gear change never heals the wall; a purchase still heals the new timber', () => {
    const s = createState(1, { ...freshRun(), levels: { root: 1 } });
    s.run.barHp = 10; const max = s.stats.barMax;
    s.stats.barMax = max / 2; recompute(s); // as if wall gear went back on
    expect(s.run.barHp).toBe(10);
    s.stats.barMax = max / 2; recompute(s, { heal: true });
    expect(s.run.barHp).toBeCloseTo(10 + max / 2);
  });

  it('a gear change still clamps the wall to its new max', () => {
    const s = createState(1, { ...freshRun(), levels: { root: 1 } });
    s.run.barHp = s.stats.barMax * 2; recompute(s);
    expect(s.run.barHp).toBe(s.stats.barMax);
  });

  it('a boss-wave rider whose grunt cannot spawn counts once off the wave', () => {
    const s = createState(1, { ...freshRun(), levels: { root: 1 } }), ev = new EventBus();
    for (let i = 0; i < ORC_CAP; i++) spawnOrc(s, 'grunt', 300);
    let rider = null as ReturnType<typeof s.orcs.alloc>; s.orcs.forEach((o) => { rider ??= o; });
    rider!.kind = 'wolfrider'; rider!.champ = true;
    s.run.boss = { t: 0, next: 0, left: 2 };
    kill(s, ev, rider!);
    expect(s.run.boss.left).toBe(1);
  });

  it('a bolt does not pin an orc that took over its dead target\'s pool slot', () => {
    const s = createState(1, { ...freshRun(), levels: { root: 1 } }), ev = new EventBus();
    const o = spawnOrc(s, 'grunt', 300)!; o.x = 600;
    const a = s.shots.alloc()!;
    a.kind = 'bolt'; a.x = 100; a.y = 100; a.vx = a.vy = 0; a.life = 0; a.pierce = 0; a.back = false; a.hit.clear();
    a.target = o; a.tgen = o.gen;
    o.gen++; // the slot was released and respawned
    s.stats.boltPin = 1;
    step(s, 0, noInputs, ev);
    expect(o.pin).toBe(0);
  });

  it('a lob keeps its first-strike flag even when pierce changes in flight', () => {
    const s = createState(1, { ...freshRun(), levels: { root: 1 } }), ev = new EventBus();
    s.stats.pierce = 0; lob(s, 100, 300, 700, 300);
    let p = null as ReturnType<typeof s.shots.alloc>; s.shots.forEach((q) => { if (q.kind === 'lob') p = q; });
    expect(p!.first).toBe(true);
    s.stats.pierce = 3; p!.pierce = 1;
    step(s, LOB.flight, noInputs, ev);
    expect(p!.first).toBe(false);
  });

  it('Mythic Echo does not make Pale Moon draw faster', () => {
    const meta = freshMeta(), m = MYTHICS.find((x) => x.id === 'pale-moon')!;
    pickUp(meta.loot, { uid: 'm', base: 'x', slot: m.slot, rarity: 'mythic', ilvl: 1, affixes: [], mythic: 'pale-moon' } as Item, 'player');
    const cd = (echo: number) => { const st = deriveStats({ root: 1, moon: 1 }); st.echo = echo; return applyGear(st, meta.loot).lobCd; };
    expect(cd(2)).toBeCloseTo(cd(1));
    expect(cd(1)).toBeCloseTo(deriveStats({ root: 1, moon: 1 }).lobCd * MYTHIC_FX.moonDraw);
  });
});
