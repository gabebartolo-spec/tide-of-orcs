import { describe, expect, it } from 'vitest';
import { createState, recompute } from './state';
import { EventBus } from './events';
import { noInputs, step } from './step';
import { FX, impact, lob, unitHit } from './combat';
import { ARROWS, PLAYER, SHOT_FX, SOURCES, STEP, UNIT_FX, VANGUARD } from '../data/balance';
import { placeVanguard } from './vanguard';

type S = ReturnType<typeof createState>;
const withNodes = (lv: Record<string, number>): S => { const s = createState(7); Object.assign(s.run.levels, lv); recompute(s); return s; };
const orcAt = (s: S, x: number, y: number, hp = 1e6) => {
  const o = s.orcs.alloc()!;
  Object.assign(o, { kind: 'grunt', x, y, hp, maxhp: hp, spd: 0, r: 10, loot: 0, atk: 0, dead: false, burn: 0, chill: 0, stun: 0, root: 0, pin: 0, slow: 0, bleed: 0, hitT: 0, wob: 0, swingT: 0, champ: false });
  return o;
};

describe('per-type shot nodes (TB-103)', () => {
  it('each enchantment is a chance per shot: 0 unowned, 25% on unlock, +15% per Quiver rank', () => {
    expect(withNodes({}).stats.fireP).toBe(0);
    expect(withNodes({ fire: 1 }).stats.fireP).toBeCloseTo(SHOT_FX.chance0);
    expect(withNodes({ shock: 1, shockchance: 2 }).stats.shockP).toBeCloseTo(0.55);
    expect(withNodes({ moon: 1, moonchance: 5 }).stats.moonP).toBe(1);
    expect(withNodes({ starfall: 1, starchance: 5 }).stats.starP).toBeCloseTo(0.35);
  });

  it('about one lob in four ignites at Fire Arrows rank 1', () => {
    const s = withNodes({ fire: 1 }), ev = new EventBus(); let lit = 0;
    for (let i = 0; i < 800; i++) { s.run.shotT[0] = s.stats.lobCd; step(s, STEP, { ...noInputs, aim: { x: 500, y: 100 } }, ev); if (ev.drain().some((e) => e.t === 'ignite')) lit++; }
    expect(lit / 800).toBeGreaterThan(0.19); expect(lit / 800).toBeLessThan(0.31);
  });

  it('a strike applies only what it rolled; Wildfire lengthens the burn', () => {
    const s = withNodes({ fire: 1, frost: 1, wildfire: 2 }), ev = new EventBus(), o = orcAt(s, 500, 300);
    impact(s, ev, { tx: 500, ty: 300, r: 30, dmg: 1, fx: 0 }, true);
    expect(o.burn).toBe(0); expect(o.chill).toBe(0);
    impact(s, ev, { tx: 500, ty: 300, r: 30, dmg: 1, fx: FX.FIRE }, true);
    expect(o.burn).toBeCloseTo(SOURCES.burnSecs + 2); expect(o.chill).toBe(0);
  });

  it('damage and effect nodes set their stats', () => {
    const st = withNodes({ kindle: 2, static: 1, rebdmg: 3, moon: 1, moondmg: 2, moonreach: 2, stardmg: 1, starcount: 2, deadly: 2, stun: 3, knifedmg: 1, knifefan: 2, boltpin: 1, windlass: 1 }).stats;
    expect(st.burn).toBeCloseTo(SHOT_FX.dmg ** 2);
    expect(st.shockMult).toBeCloseTo(ARROWS.shock.mult * SHOT_FX.dmg);
    expect(st.rebMult).toBeCloseTo(SHOT_FX.dmg ** 3);
    expect(st.moonMult).toBeCloseTo(1.6 * SHOT_FX.moonDmg ** 2);
    expect(st.homeR).toBeCloseTo(PLAYER.aimHomingRadius * 1.5);
    expect(st.starArrows).toBe(ARROWS.starfall.arrows + 4);
    expect(st.critMult).toBeCloseTo(PLAYER.critMult + 1);
    expect(st.stunSecs).toBeCloseTo(ARROWS.stun.secs + 0.5);
    expect(st.knifeExtra).toBe(2); expect(st.boltRoot).toBeCloseTo(SHOT_FX.boltRootSecs);
    expect(st.ballCd).toBeCloseTo(SOURCES.ballista.cd * SHOT_FX.windlass);
  });

  it('a lob deals moonMult only when it rolls moon', () => {
    const s = withNodes({ moon: 1, moondmg: 1 }), dmgs: number[] = [];
    for (const fx of [0, FX.MOON]) { lob(s, 0, 0, 500, 300, fx); }
    s.shots.forEach((p) => { if (p.kind === 'lob') dmgs.push(p.dmg); });
    expect(dmgs[1]! / dmgs[0]!).toBeCloseTo(s.stats.moonMult);
  });

  it('Knife Fan throws extra knives; Pinning Bolts root what a bolt passes', () => {
    const s = withNodes({ knives: 1, knifefan: 2 }), ev = new EventBus(); orcAt(s, 700, 300);
    s.run.knifeT = 99; step(s, STEP, noInputs, ev);
    let n = 0; s.shots.forEach((p) => { if (p.kind === 'knife') n++; }); expect(n).toBe(3);
    const b = withNodes({ ballista: 1, boltpin: 2 }), o = orcAt(b, 300, 300);
    b.run.ballT = 99; for (let i = 0; i < 30 && o.root <= 0; i++) step(b, STEP, noInputs, ev);
    expect(o.root).toBeGreaterThan(0);
  });
});

describe('per-unit nodes (TB-103)', () => {
  it('rate, crit, crit damage and speed per rank', () => {
    const u = withNodes({ ranger: 1, rangerrate: 2, rangercrit: 3, rangercritx: 2, wolf: 1, wolfspd: 1 }).stats.units;
    expect(u.ranger.rate).toBeCloseTo(UNIT_FX.rate ** 2);
    expect(u.ranger.crit).toBeCloseTo(0.15);
    expect(u.ranger.critMult).toBeCloseTo(3);
    expect(u.wolf.spd).toBeCloseTo(UNIT_FX.spd);
    expect(u.hawk).toEqual({ dmg: 1, rate: 1, crit: 0, critMult: UNIT_FX.critMult0, spd: 1 });
  });

  it('Spear Drill moves to the spearman unit; kinship stays on vanDmg', () => {
    const st = withNodes({ muster: 1, drill: 2 }).stats;
    expect(st.units.spear.dmg).toBeCloseTo(VANGUARD.dmgPerDrill ** 2);
    expect(st.vanDmg).toBeCloseTo(1);
  });

  it('a unit crit multiplies the strike', () => {
    const s = withNodes({});
    expect(unitHit(s, { dmg: 1, rate: 1, crit: 1, critMult: 2.5, spd: 1 }, 10)).toBeCloseTo(25);
    expect(unitHit(s, { dmg: 1, rate: 1, crit: 0, critMult: 2.5, spd: 1 }, 10)).toBe(10);
  });

  it('Spear Rhythm swings sooner and Quick March walks faster', () => {
    const at = (lv: Record<string, number>): [number, number] => {
      const s = withNodes({ muster: 1, ...lv }), ev = new EventBus(), v = placeVanguard(s, 'spear')!;
      step(s, 0.5, noInputs, ev); return [v.swingT, v.x];
    };
    const [t0, x0] = at({}), [t1, x1] = at({ spearrate: 2, spearspd: 1 });
    expect(t1 / t0).toBeCloseTo(UNIT_FX.rate ** 2);
    expect(x1).toBeGreaterThan(x0);
  });
});
