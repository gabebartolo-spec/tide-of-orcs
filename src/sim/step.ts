import { ARROWS, BARRICADE, FIELD, LOB, PLAYER, SOURCES, WAVE_LEN, waveHP, waveInterval, waveLoot, waveSpeedMult } from '../data/balance';
import { ORC_KINDS, ORC_TYPES, OrcKind } from '../data/orcs';
import { EventBus } from './events';
import { Orc, Projectile, SimState } from './state';
import { bounce, damage, impact, lob, nearestOrc, shoot, starfall, volley } from './combat';
import { barricadeHit, barricadeRegen } from './barricade';
import { bossStep } from './boss';
import { BOSS_WAVE } from '../data/bosses';
import { engagedVanguard, hurtVanguard, vanguardStep } from './vanguard';

/** Player aim: the pointer's position on the field, or null when the player is not aiming. The elf only shoots while aimed. */
export interface Inputs { aim: { x: number; y: number } | null }
export const noInputs: Inputs = { aim: null };

const H = FIELD.h, W = FIELD.w, BAR_X = FIELD.barX, BAR_W = FIELD.barW, ELF_X = FIELD.elfX;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

/** March one orc in from the right edge, at height y (random if omitted). Returns false when the field is full. */
export function spawnOrc(s: SimState, kind: OrcKind, y?: number, champ = false): boolean {
  const w = s.run.wave, F = s.stats.foes[kind];
  const o = s.orcs.alloc(); if (!o) { if (champ && s.run.boss) s.run.boss.left--; return false; }
  const T = ORC_TYPES[kind];
  const hp = waveHP(w) * T.hp * F.hp;
  o.kind = kind; o.x = W + 24; o.y = y ?? 50 + s.rng.next() * (H - 100);
  o.hp = hp; o.maxhp = hp; o.spd = T.speed * waveSpeedMult(w); o.r = T.radius; o.atk = hp * BARRICADE.orcAtkFrac;
  o.loot = waveLoot(w) * T.loot * F.loot;
  o.dead = false; o.burn = 0; o.chill = 0; o.stun = 0; o.hitT = 0; o.wob = s.rng.next() * 6.28; o.swingT = s.rng.next(); o.champ = champ;
  return true;
}

/* ---------- one fixed step ---------- */
export function step(s: SimState, dt: number, inputs: Inputs, ev: EventBus): void {
  const st = s.stats, run = s.run;
  if (run.fallen) return;
  s.tick++; s.t += dt; run.runTime += dt;

  run.waveT += dt;
  if (run.waveT >= WAVE_LEN) { run.waveT -= WAVE_LEN; run.wave++; s.meta.bestWave = Math.max(s.meta.bestWave, run.wave); ev.push({ t: 'wave', wave: run.wave }); if (run.wave % BOSS_WAVE.every === 0) ev.push({ t: 'bossReady' }); }

  // each summoned kind marches on its own clock; a boss wave pauses them all and plays its script instead
  bossStep(s, ev, dt);
  for (const k of ORC_KINDS) {
    const F = st.foes[k]; if (!F.on || run.boss) continue;
    const iv = waveInterval(run.wave) * ORC_TYPES[k].every / F.spawn;
    run.foeT[k] = (run.foeT[k] ?? 0) + dt;
    while ((run.foeT[k] ?? 0) >= iv) { run.foeT[k]! -= iv; spawnOrc(s, k); }
  }

  barricadeRegen(s, dt);
  vanguardStep(s, ev, dt);

  // orcs
  s.orcs.forEach((o) => {
    if (o.dead || run.fallen) return;
    o.wob += dt * 8;
    if (o.burn > 0) { o.burn -= dt; o.hp -= st.dmg * SOURCES.burnFrac * dt; if (o.hp <= 0) { damage(s, ev, o, 0); return; } }
    if (o.hitT > 0) o.hitT -= dt;
    // Thunderclap holds an orc still; Frost Arrows slow its march and its swing.
    if (o.stun > 0) { o.stun -= dt; return; }
    const pace = o.chill > 0 ? 1 - st.slow : 1;
    if (o.chill > 0) o.chill -= dt;
    const v = engagedVanguard(s, o);
    if (v) {
      o.swingT += dt * pace;
      if (o.swingT >= BARRICADE.orcSwing) { o.swingT = 0; ev.push({ t: 'orcSwing', kind: o.kind, x: o.x, y: o.y, tx: v.x, ty: v.y, r: o.r }); hurtVanguard(s, ev, v, o.atk); }
      return;
    }
    if (o.x <= BAR_X + BAR_W + o.r) {
      o.x = BAR_X + BAR_W + o.r; o.swingT += dt * pace;
      if (o.swingT >= BARRICADE.orcSwing) { o.swingT = 0; ev.push({ t: 'orcSwing', kind: o.kind, x: o.x, y: o.y, tx: BAR_X + BAR_W, ty: o.y, r: o.r }); barricadeHit(s, ev, o.atk * BARRICADE.wallMult, o.y); }
      if (st.spikes > 0) damage(s, ev, o, st.dmg * st.spikes * dt);
      return;
    }
    o.x -= o.spd * pace * dt;
  });
  if (run.fallen) return;

  // archers
  const shooters: [number, number][] = [[ELF_X, H / 2], [ELF_X - 10, H / 2 - SOURCES.archerOffsetY], [ELF_X - 10, H / 2 + SOURCES.archerOffsetY]];
  // The elf: an arcing shot onto the aim circle, only while the player aims. The draw holds when ready; it never banks.
  run.shotT[0] = Math.min(st.lobCd, (run.shotT[0] ?? 0) + dt);
  if (run.shotT[0] >= st.lobCd && inputs.aim && inputs.aim.x > BAR_X + BAR_W) {
    let { x, y } = inputs.aim;
    // Moonbow: the circle settles onto the nearest orc near the aim point.
    const home = st.homing ? nearestOrc(s, x, y, (o) => dist(o.x, o.y, x, y) < PLAYER.aimHomingRadius) : null;
    if (home) { x = home.x; y = home.y; }
    run.shotT[0] = 0; lob(s, ELF_X, H / 2, x, y);
    run.lobN = (run.lobN ?? 0) + 1;
    if (st.starfall && run.lobN % ARROWS.starfall.every === 0) starfall(s, ev);
    // Split Shot: extra arrows land at random inside the circle.
    for (let k = 1; k < st.arrows; k++) {
      const a = s.rng.next() * 6.28, d = s.rng.next() * st.radius * LOB.splitSpread;
      lob(s, ELF_X, H / 2, x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
  }
  // Rangers and wardens keep straight volleys at the nearest orc.
  for (let i = 1; i <= st.archers && i < 3; i++) {
    run.shotT[i] = (run.shotT[i] ?? 0) + dt;
    if (run.shotT[i]! < 1 / st.fireRate) continue;
    const [sx, sy] = shooters[i]!;
    const tg = nearestOrc(s, sx, sy);
    if (tg) { run.shotT[i] = 0; volley(s, sx, sy, tg.x, tg.y, SOURCES.archerDmgFrac * st.kin, tg); }
  }
  if (st.knives) { run.knifeT += dt; if (run.knifeT >= 1 / st.knives.rate) { const tg = nearestOrc(s, ELF_X, H / 2); if (tg) { run.knifeT = 0; shoot(s, 'knife', ELF_X, H / 2, Math.atan2(tg.y - H / 2, tg.x - ELF_X), SOURCES.knives.speed, st.knives.dmg, 0, tg); } } }
  if (st.ballista) { run.ballT += dt; if (run.ballT >= SOURCES.ballista.cd) { const tg = nearestOrc(s, ELF_X, H / 2); if (tg) { run.ballT = 0; shoot(s, 'bolt', ELF_X + 6, H / 2 - 40, Math.atan2(tg.y - H / 2 + 40, tg.x - ELF_X), SOURCES.ballista.speed, st.ballista, 99, null); } } }

  if (st.storm) {
    run.stormT += dt;
    if (run.stormT >= SOURCES.storm.cd) {
      run.stormT = 0;
      const seen = new Set<Orc>(); const pts: [number, number][] = [];
      let cur = nearestOrc(s, BAR_X + SOURCES.storm.seekX, H / 2);
      while (cur && pts.length < SOURCES.storm.targets) {
        const c = cur; seen.add(c); pts.push([c.x, c.y]); damage(s, ev, c, st.dmg * SOURCES.storm.mult * st.kin);
        cur = nearestOrc(s, c.x, c.y, (o) => !seen.has(o) && dist(o.x, o.y, c.x, c.y) < SOURCES.storm.jump);
      }
      if (pts.length) ev.push({ t: 'storm', pts });
    }
  }

  if (st.wolf) {
    const wf = s.wolf; const tg = nearestOrc(s, wf.x, wf.y, (o) => o.x < W - 40);
    if (tg) { wf.tx = tg.x; wf.ty = tg.y; }
    const dx = wf.tx - wf.x, dy = wf.ty - wf.y, d = Math.hypot(dx, dy);
    if (d > 2) { const m = Math.min(d, SOURCES.wolf.speed * dt); wf.x += dx / d * m; wf.y += dy / d * m; }
    wf.biteT += dt;
    if (tg && d < SOURCES.wolf.reach && wf.biteT > SOURCES.wolf.biteCd) { wf.biteT = 0; damage(s, ev, tg, st.wolf); ev.push({ t: 'bite', x: tg.x, y: tg.y }); }
  }

  if (st.hawk) {
    const hk = s.hawk; hk.a += dt * 1.6; run.hawkT += dt;
    const cx = 330, cy = H / 2; hk.x = cx + Math.cos(hk.a) * 120; hk.y = cy + Math.sin(hk.a * 1.3) * 100;
    if (run.hawkT >= SOURCES.hawk.cd) {
      run.hawkT = 0; let best: Orc | null = null, bn = -1;
      s.orcs.forEach((o) => { if (o.dead) return; let n = 0; s.orcs.forEach((p) => { if (!p.dead && dist(p.x, p.y, o.x, o.y) < SOURCES.hawk.radius) n++; }); if (n > bn) { bn = n; best = o; } });
      if (best) { const b = best as Orc; s.orcs.forEach((p) => { if (!p.dead && dist(p.x, p.y, b.x, b.y) < SOURCES.hawk.radius) damage(s, ev, p, st.dmg * SOURCES.hawk.mult * st.kin); }); ev.push({ t: 'hawkDive', x: b.x, y: b.y }); hk.x = b.x; hk.y = b.y - 30; }
    }
  }

  if (st.treant) {
    run.treantT += dt;
    if (run.treantT >= SOURCES.treant.cd) {
      run.treantT = 0; let any = false;
      s.orcs.forEach((o) => { if (!o.dead && o.x < BAR_X + SOURCES.treant.range) { damage(s, ev, o, st.dmg * SOURCES.treant.mult * st.kin); any = true; } });
      if (any) ev.push({ t: 'treantStamp', x: BAR_X + 50, y: H / 2 + 30 });
    }
  }

  // projectiles
  s.shots.forEach((a: Projectile) => {
    if (a.kind === 'lob') {
      // Flies a parabola to its landing point, strikes, then strikes again pulseGap later per Longshaft rank.
      a.t += dt; const u = Math.min(1, a.t / LOB.flight);
      a.x = a.sx + (a.tx - a.sx) * u; a.y = a.sy + (a.ty - a.sy) * u; a.h = LOB.arc * 4 * u * (1 - u);
      if (a.t >= LOB.flight) { impact(s, ev, a, a.pierce === st.pierce); if (a.pierce-- > 0) a.t -= LOB.pulseGap; else s.shots.release(a); }
      return;
    }
    if (a.kind === 'star') {
      a.t += dt; a.h = ARROWS.starfall.height * (1 - Math.max(0, Math.min(1, a.t / ARROWS.starfall.flight)));
      if (a.t >= ARROWS.starfall.flight) { impact(s, ev, a); s.shots.release(a); }
      return;
    }
    if (a.kind === 'bounce') {
      // Rebound: fly at the target; on reaching it strike, then leap on from there, softer each hop.
      const tg = a.target; a.life -= dt;
      if (!tg || !tg.live || tg.dead || a.life <= 0) { s.shots.release(a); return; }
      const dx = tg.x - a.x, dy = tg.y - a.y, d = Math.hypot(dx, dy), m = ARROWS.bounce.speed * dt;
      a.vx = dx / (d || 1) * ARROWS.bounce.speed; a.vy = dy / (d || 1) * ARROWS.bounce.speed;
      if (d > tg.r + 4 + m) { a.x += dx / d * m; a.y += dy / d * m; return; }
      a.hit.add(tg); ev.push({ t: 'hit', x: tg.x, y: tg.y, crit: false, src: 'bounce' }); ev.push({ t: 'bounceHit', x: tg.x, y: tg.y });
      damage(s, ev, tg, a.dmg);
      if (a.pierce > 0) bounce(s, tg.x, tg.y, a.dmg * ARROWS.bounce.falloff, a.pierce - 1, a.hit);
      s.shots.release(a);
      return;
    }
    a.life -= dt;
    if (st.homing && a.kind === 'arrow' && a.target && a.target.live && !a.target.dead) {
      const ang = Math.atan2(a.target.y - a.y, a.target.x - a.x), cur = Math.atan2(a.vy, a.vx);
      let d = ang - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
      const na = cur + d * Math.min(1, 6 * dt); a.vx = Math.cos(na) * PLAYER.arrowSpeed; a.vy = Math.sin(na) * PLAYER.arrowSpeed;
    }
    a.x += a.vx * dt; a.y += a.vy * dt;
    let spent = false;
    s.orcs.forEach((o) => {
      if (spent || o.dead || a.hit.has(o)) return;
      if (dist(o.x, o.y, a.x, a.y) < o.r + 4) {
        a.hit.add(o);
        let d = a.dmg; const crit = a.kind === 'arrow' && s.rng.next() < st.crit; if (crit) d *= PLAYER.critMult;
        ev.push({ t: 'hit', x: o.x, y: o.y, crit, src: a.kind });
        damage(s, ev, o, d);
        if (st.fire && a.kind === 'arrow') o.burn = SOURCES.burnSecs;
        if (a.pierce-- <= 0) spent = true;
      }
    });
    if (spent || a.life <= 0 || a.x > W + 30 || a.y < -30 || a.y > H + 30) s.shots.release(a);
  });

  s.orcs.forEach((o) => { if (o.dead) s.orcs.release(o); });
}
