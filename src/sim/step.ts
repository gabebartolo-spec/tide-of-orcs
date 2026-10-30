import { BARRICADE, FIELD, PLAYER, SOURCES, WAVE_LEN, waveHP, waveInterval, waveLoot, waveSpeedMult } from '../data/balance';
import { BOSS, ORC_TYPES, OrcKind, bruteShare, runnerShare } from '../data/orcs';
import { EventBus } from './events';
import { Orc, Projectile, SimState } from './state';
import { damage, nearestOrc, shoot, volley } from './combat';
import { barricadeHit, barricadeRegen } from './barricade';
import { engagedVanguard, hurtVanguard, vanguardStep } from './vanguard';

export interface Inputs { taps: { x: number; y: number }[] }
export const noInputs: Inputs = { taps: [] };

const H = FIELD.h, W = FIELD.w, BAR_X = FIELD.barX, BAR_W = FIELD.barW, ELF_X = FIELD.elfX;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

function spawnOrc(s: SimState): void {
  const w = s.run.wave, r = s.rng.next();
  let kind: OrcKind = 'grunt';
  let bossLive = false; s.orcs.forEach((o) => { if (o.kind === 'boss') bossLive = true; });
  if (w % BOSS.everyWaves === 0 && !bossLive && s.rng.next() < BOSS.rollChance) kind = 'boss';
  else if (r < runnerShare(w)) kind = 'runner';
  else if (r > 1 - bruteShare(w)) kind = 'brute';
  const o = s.orcs.alloc(); if (!o) return;
  const T = ORC_TYPES[kind];
  const hp = waveHP(w) * T.hp;
  o.kind = kind; o.x = W + 24; o.y = 50 + s.rng.next() * (H - 100);
  o.hp = hp; o.maxhp = hp; o.spd = T.speed * waveSpeedMult(w); o.r = T.radius; o.atk = hp * BARRICADE.orcAtkFrac;
  o.loot = waveLoot(w) * T.loot * (kind === 'boss' ? s.stats.bounty : 1);
  o.dead = false; o.burn = 0; o.hitT = 0; o.wob = s.rng.next() * 6.28; o.swingT = s.rng.next();
}

/* ---------- one fixed step ---------- */
export function step(s: SimState, dt: number, inputs: Inputs, ev: EventBus): void {
  const st = s.stats, run = s.run;
  if (run.fallen) return;
  s.tick++; s.t += dt; run.runTime += dt;

  run.waveT += dt;
  if (run.waveT >= WAVE_LEN) { run.waveT -= WAVE_LEN; run.wave++; s.meta.bestWave = Math.max(s.meta.bestWave, run.wave); ev.push({ t: 'wave', wave: run.wave }); }

  run.spawnT += dt;
  const iv = waveInterval(run.wave) / st.spawnMult;
  while (run.spawnT >= iv) { run.spawnT -= iv; spawnOrc(s); }

  for (const tp of inputs.taps) { const tg = nearestOrc(s, tp.x, tp.y); volley(s, ELF_X, H / 2, tg ? tg.x : tp.x, tg ? tg.y : tp.y, PLAYER.tapMult, tg); }

  barricadeRegen(s, dt);
  vanguardStep(s, ev, dt);

  // orcs
  s.orcs.forEach((o) => {
    if (o.dead || run.fallen) return;
    o.wob += dt * 8;
    if (o.burn > 0) { o.burn -= dt; o.hp -= st.dmg * SOURCES.burnFrac * dt; if (o.hp <= 0) { damage(s, ev, o, 0); return; } }
    if (o.hitT > 0) o.hitT -= dt;
    const v = engagedVanguard(s, o);
    if (v) {
      o.swingT += dt;
      if (o.swingT >= BARRICADE.orcSwing) { o.swingT = 0; hurtVanguard(s, ev, v, o.atk); }
      return;
    }
    if (o.x <= BAR_X + BAR_W + o.r) {
      o.x = BAR_X + BAR_W + o.r; o.swingT += dt;
      if (o.swingT >= BARRICADE.orcSwing) { o.swingT = 0; barricadeHit(s, ev, o.atk, o.y); }
      if (st.spikes > 0) damage(s, ev, o, st.dmg * st.spikes * dt);
      return;
    }
    o.x -= o.spd * dt;
  });
  if (run.fallen) return;

  // archers
  const shooters: [number, number][] = [[ELF_X, H / 2], [ELF_X - 10, H / 2 - SOURCES.archerOffsetY], [ELF_X - 10, H / 2 + SOURCES.archerOffsetY]];
  for (let i = 0; i <= st.archers && i < 3; i++) {
    run.shotT[i] = (run.shotT[i] ?? 0) + dt;
    if (run.shotT[i]! >= 1 / st.fireRate) {
      const [sx, sy] = shooters[i]!;
      const tg = nearestOrc(s, sx, sy);
      if (tg) { run.shotT[i] = 0; volley(s, sx, sy, tg.x, tg.y, i === 0 ? 1 : SOURCES.archerDmgFrac * st.kin, tg); }
    }
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
        ev.push({ t: 'hit', x: o.x, y: o.y, crit });
        damage(s, ev, o, d);
        if (st.fire && a.kind === 'arrow') o.burn = SOURCES.burnSecs;
        if (a.pierce-- <= 0) spent = true;
      }
    });
    if (spent || a.life <= 0 || a.x > W + 30 || a.y < -30 || a.y > H + 30) s.shots.release(a);
  });

  s.orcs.forEach((o) => { if (o.dead) s.orcs.release(o); });
}
