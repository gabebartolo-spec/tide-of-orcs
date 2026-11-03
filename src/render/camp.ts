import { BUILDINGS, BuildingId } from '../data/camp';
import { CAMP_SPOTS, CAMP_UNITS_PER_M } from '../data/presentation';
import { P } from './palette';
import type { Sprites } from './sprites';

/** Placeholder encampment art (TB-188c, docs/plans/elf-encampment.md §1): palette-token vector drawings of each building
 *  at three looks (0: frame and tent, 1: built, 3: finished with banner and lights; level 2 is the level-1 look plus a
 *  banner). Each look is painted once to an offscreen canvas at the field's pixel scale and blitted every frame, so the
 *  camp costs four drawImage calls (CLAUDE.md rule 7). TB-188d: levels 1-3 draw the Tripo sprite `camp.<id>.<lv>`
 *  (sheet_camp.webp) at CAMP_UNITS_PER_M; the vector look stays for level 0 and whenever that sprite is missing. */

type Ctx = CanvasRenderingContext2D;
/** Atlas key per building and level, built once so drawing builds no strings (TB-183). */
const SPRITE_KEYS: Readonly<Record<string, string>> = Object.fromEntries(BUILDINGS.flatMap((b) => [1, 2, 3].map((l) => [`${b.id}${l}`, `camp.${b.id}.${l}`])));
/** Margin round each footprint in field units, for the banner and glow that reach past it. */
const PAD = 8;

export class CampArt {
  private cache = new Map<string, HTMLCanvasElement>();
  private scale = 0;

  /** Draw every building at its level. `g` is in field units; `px` is device pixels per field unit. */
  draw(g: Ctx, levels: Partial<Record<BuildingId, number>>, px: number, sprites?: Sprites): void {
    if (Math.abs(px - this.scale) > 0.01) { this.cache.clear(); this.scale = px; }
    for (const b of BUILDINGS) {
      const lv = Math.min(3, levels[b.id] ?? 0), p = CAMP_SPOTS[b.id], key = `${b.id}${lv}`;
      if (lv > 0 && sprites?.draw(g, SPRITE_KEYS[key]!, 0, p.x, p.y, CAMP_UNITS_PER_M)) continue;
      let c = this.cache.get(key);
      if (!c) { c = this.paint(b.id, lv, p.w, p.h, px); this.cache.set(key, c); }
      g.drawImage(c, p.x - p.w / 2 - PAD, p.y - p.h - PAD, p.w + PAD * 2, p.h + PAD * 2);
    }
  }

  private paint(id: BuildingId, lv: number, w: number, h: number, px: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil((w + PAD * 2) * px)); c.height = Math.max(1, Math.ceil((h + PAD * 2) * px));
    const g = c.getContext('2d')!;
    // origin at the footprint's base centre, field units, y up is negative
    g.setTransform(px, 0, 0, px, (w / 2 + PAD) * px, (h + PAD) * px);
    g.lineCap = 'round'; g.lineJoin = 'round';
    shadow(g, w);
    if (lv === 0) frame(g, id, w, h);
    else BUILT[id](g, w, h, lv);
    if (lv >= 2) banner(g, w, h, lv);
    if (lv >= 3) lantern(g, -w / 2 + 6, -h * 0.55);
    return c;
  }
}

const rect = (g: Ctx, c: string, x: number, y: number, w: number, h: number): void => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const disc = (g: Ctx, c: string, x: number, y: number, rx: number, ry = rx): void => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
const line = (g: Ctx, c: string, wd: number, pts: number[]): void => {
  g.strokeStyle = c; g.lineWidth = wd; g.beginPath(); g.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
  g.stroke();
};
const poly = (g: Ctx, c: string, pts: number[]): void => {
  g.fillStyle = c; g.beginPath(); g.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
  g.closePath(); g.fill();
};

function shadow(g: Ctx, w: number): void { disc(g, P.shadow, 0, -2, w / 2, 5); }

/** Level 0: a timber frame with a canvas tent over it, and one hint of the trade beside it. */
function frame(g: Ctx, id: BuildingId, w: number, h: number): void {
  const tw = w * 0.62, th = h * 0.62, x0 = -w / 2 + 4;
  poly(g, P.creamDim, [x0, 0, x0 + tw, 0, x0 + tw / 2, -th]);
  poly(g, P.cream, [x0 + tw / 2, -th, x0 + tw, 0, x0 + tw * 0.62, 0]);
  poly(g, P.ink3, [x0 + tw / 2 - 4, 0, x0 + tw / 2 + 4, 0, x0 + tw / 2, -th * 0.4]);
  line(g, P.timberDark, 2, [x0 + tw / 2, -th, x0 + tw / 2, -th - 5]);
  // the frame of the building to come
  const fx = x0 + tw + 3, fw = w / 2 - 2 - fx;
  line(g, P.timber, 2.2, [fx, 0, fx, -h * 0.55, fx + fw, -h * 0.55, fx + fw, 0]);
  line(g, P.timberDark, 1.4, [fx, -h * 0.3, fx + fw, -h * 0.55]);
  const hx = fx + fw / 2;
  if (id === 'bowyer') line(g, P.timberDark, 1.6, [hx - 3, -2, hx + 2, -14]);
  else if (id === 'forge') { disc(g, P.rock, hx - 3, -2, 3, 2); disc(g, P.rockLight, hx + 3, -2, 3, 2); }
  else if (id === 'kitchen') { disc(g, P.rock, hx - 4, -2, 2.4, 1.8); disc(g, P.rock, hx + 4, -2, 2.4, 1.8); line(g, P.timberDark, 1.4, [hx - 4, -3, hx + 4, -3]); }
  else { line(g, P.timber, 2, [hx, 0, hx, -14]); disc(g, P.wallBar, hx, -14, 3.2, 4); }
}

/** A pole and pennant on the building's right side (level 2 and up); level 3 gets the gold edge. */
function banner(g: Ctx, w: number, h: number, lv: number): void {
  const x = w / 2 - 3, top = -h - 4;
  line(g, P.bark, 1.6, [x, -1, x, top]);
  poly(g, P.elfCloak, [x, top + 1, x - 13, top + 4, x - 9, top + 8, x - 13, top + 12, x, top + 13]);
  if (lv >= 3) line(g, P.starGold, 1, [x - 13, top + 4, x - 9, top + 8, x - 13, top + 12]);
  disc(g, P.starGold, x, top, 1.4);
}

/** A lit lantern on a post, with its warm pool (level 3). */
function lantern(g: Ctx, x: number, y: number): void {
  disc(g, P.lamp, x, y, 9);
  line(g, P.bark, 1.4, [x, -1, x, y - 2]);
  rect(g, P.ink3, x - 2.4, y - 2, 4.8, 6);
  rect(g, P.amber, x - 1.6, y - 1, 3.2, 4);
}

/** Built looks (level 1+); level 3 adds a little more of each trade. */
const BUILT: Readonly<Record<BuildingId, (g: Ctx, w: number, h: number, lv: number) => void>> = {
  bowyer(g, w, h, lv) {
    // lean-to roof on two posts over a workbench
    line(g, P.timberDark, 2.4, [-w / 2 + 4, 0, -w / 2 + 4, -h * 0.62]);
    line(g, P.timberDark, 2.4, [w / 2 - 8, 0, w / 2 - 8, -h * 0.5]);
    poly(g, P.bark, [-w / 2, -h * 0.6, w / 2 - 4, -h * 0.46, w / 2 - 4, -h * 0.4, -w / 2, -h * 0.52]);
    rect(g, P.timber, -w / 2 + 6, -h * 0.26, w - 18, 3.5);
    line(g, P.timberDark, 1.6, [-w / 2 + 8, -h * 0.26, -w / 2 + 8, 0]); line(g, P.timberDark, 1.6, [w / 2 - 14, -h * 0.26, w / 2 - 14, 0]);
    // bows on the rack under the roof: stave and string
    const bows = lv >= 3 ? 4 : 3;
    for (let i = 0; i < bows; i++) {
      const bx = -w / 2 + 12 + i * 8, by = -h * 0.36;
      g.strokeStyle = P.timberDark; g.lineWidth = 1.6; g.beginPath(); g.arc(bx, by, 7, -1.2, 1.2); g.stroke();
      line(g, P.cream, 0.6, [bx + 7 * Math.cos(-1.2), by + 7 * Math.sin(-1.2), bx + 7 * Math.cos(1.2), by + 7 * Math.sin(1.2)]);
    }
    // bundled arrows on the bench
    for (let i = 0; i < 4; i++) line(g, P.knife, 0.9, [-4 + i * 1.5, -h * 0.26 - 1, 8 + i * 1.5, -h * 0.26 - 3]);
    if (lv >= 3) { rect(g, P.bark, w / 2 - 12, -10, 5, 10); for (let i = 0; i < 3; i++) line(g, P.cream, 0.8, [w / 2 - 11 + i * 1.5, -10, w / 2 - 11 + i * 1.5, -14]); }
  },
  forge(g, w, h, lv) {
    // stone chimney, a hearth with its ember mouth, an anvil on a stump
    rect(g, P.rock, -w / 2 + 4, -h * 0.92, 10, h * 0.92);
    rect(g, P.rockLight, -w / 2 + 4, -h * 0.92, 10, 3);
    poly(g, P.rock, [-w / 2 + 2, 0, w / 2 - 14, 0, w / 2 - 16, -h * 0.34, -w / 2 + 4, -h * 0.38]);
    disc(g, P.fireGlow, -w / 2 + 16, -h * 0.17, 8, 6);
    disc(g, P.ember, -w / 2 + 16, -h * 0.15, 4.5, 3.5);
    disc(g, P.fireCore, -w / 2 + 16, -h * 0.14, 2, 1.5);
    rect(g, P.timberDark, w / 2 - 15, -7, 6, 7);
    poly(g, P.ink3, [w / 2 - 19, -7, w / 2 - 4, -7, w / 2 - 2, -10, w / 2 - 20, -10]);
    if (lv >= 3) {
      // sparks over the chimney and a quench barrel
      for (const [x, y] of [[-w / 2 + 7, -h - 2], [-w / 2 + 11, -h - 6], [-w / 2 + 9, -h + 1]] as const) disc(g, P.spark, x, y, 0.9);
      rect(g, P.timber, w / 2 - 8, -9, 6, 9); disc(g, P.frost, w / 2 - 5, -9, 3, 1);
    }
  },
  kitchen(g, w, h, lv) {
    // cloth awning on poles over a bread table
    line(g, P.timberDark, 2, [-w / 2 + 4, 0, -w / 2 + 4, -h * 0.6]); line(g, P.timberDark, 2, [w * 0.05, 0, w * 0.05, -h * 0.6]);
    poly(g, P.cream, [-w / 2, -h * 0.6, w * 0.1, -h * 0.6, w * 0.08, -h * 0.5, -w / 2 + 2, -h * 0.5]);
    for (let x = -w / 2 + 3; x < w * 0.08; x += 6) poly(g, P.rose, [x, -h * 0.5, x + 3, -h * 0.5, x + 1.5, -h * 0.45]);
    rect(g, P.timber, -w / 2 + 6, -h * 0.24, w * 0.4, 3);
    line(g, P.timberDark, 1.4, [-w / 2 + 8, -h * 0.24, -w / 2 + 8, 0]); line(g, P.timberDark, 1.4, [-w / 2 + 4 + w * 0.4, -h * 0.24, -w / 2 + 4 + w * 0.4, 0]);
    for (let i = 0; i < (lv >= 3 ? 3 : 2); i++) disc(g, P.sand, -w / 2 + 11 + i * 6, -h * 0.24 - 1.6, 2.6, 1.6);
    // cook fire with a pot on a tripod
    const fx = w / 2 - 12;
    disc(g, P.rock, fx - 5, -1.5, 2.2, 1.6); disc(g, P.rock, fx + 5, -1.5, 2.2, 1.6); disc(g, P.rockLight, fx, -1, 2.2, 1.6);
    poly(g, P.fire, [fx - 3, -2, fx + 3, -2, fx, -9]); poly(g, P.ember, [fx - 1.5, -2, fx + 1.5, -2, fx, -6]);
    line(g, P.bark, 1.2, [fx - 7, 0, fx, -16, fx + 7, 0]);
    disc(g, P.ink3, fx, -11, 4, 3.4);
    if (lv >= 3) for (const [x, y, r] of [[fx + 1, -22, 2.4], [fx - 2, -28, 3], [fx + 2, -35, 3.6]] as const) { g.globalAlpha = 0.55; disc(g, P.creamDim, x, y, r); g.globalAlpha = 1; }
  },
  training(g, w, h, lv) {
    // sparring ring, straw dummies on posts, a spear rack
    g.strokeStyle = P.sand; g.lineWidth = 1.4; g.beginPath(); g.ellipse(-4, -6, w * 0.34, 6, 0, 0, Math.PI * 2); g.stroke();
    const dummy = (x: number): void => {
      line(g, P.timberDark, 1.8, [x, 0, x, -h * 0.5]);
      line(g, P.timberDark, 1.4, [x - 6, -h * 0.4, x + 6, -h * 0.4]);
      disc(g, P.wallBar, x, -h * 0.34, 4, 6);
      disc(g, P.sand, x, -h * 0.52, 3.2);
    };
    dummy(-w / 2 + 10); dummy(-4);
    if (lv >= 3) dummy(-w / 2 + 10 + (w * 0.34 - 6) / 1.4);
    const rx = w / 2 - 9;
    line(g, P.timber, 1.8, [rx - 5, 0, rx - 5, -h * 0.6]); line(g, P.timber, 1.8, [rx + 5, 0, rx + 5, -h * 0.6]);
    line(g, P.timberDark, 1.4, [rx - 6, -h * 0.3, rx + 6, -h * 0.3]);
    for (let i = 0; i < 3; i++) { const x = rx - 3 + i * 3; line(g, P.timberDark, 1, [x, -1, x, -h * 0.7]); poly(g, P.spear, [x - 1.2, -h * 0.7, x + 1.2, -h * 0.7, x, -h * 0.7 - 4]); }
  },
};
