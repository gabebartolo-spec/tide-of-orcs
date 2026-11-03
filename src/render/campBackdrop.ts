import { CAMP_BACKDROP, CAMP_SCENE, CAMP_SPOTS } from '../data/presentation';
import { createRng, Rng } from '../sim/rng';
import { P } from './palette';

/** The Camp scene's backdrop (TB-188i, docs/plans/elf-encampment.md §1): sky gradient, a far forest silhouette over a low hill band,
 *  a meadow in the field's colours (patches and tufts), a worn path along the row and a contact shadow under each building. It is
 *  static, so it is painted once per canvas size to an offscreen canvas and blitted each frame. */

type Range = readonly [number, number];
const B = CAMP_BACKDROP;
const span = (r: Rng, v: Range): number => v[0] + r.next() * (v[1] - v[0]);

export class CampBackdrop {
  private cv: HTMLCanvasElement | null = null;
  private key = '';

  /** Blit the backdrop; repaint first if the canvas size or fit changed. k: scene-to-CSS scale, (ox, oy): box offset in CSS px. */
  draw(g: CanvasRenderingContext2D, k: number, ox: number, oy: number, dpr: number): void {
    const cw = g.canvas.width, ch = g.canvas.height, key = `${cw}x${ch}`;
    if (key !== this.key || !this.cv) { this.cv = this.paint(cw, ch, k, ox, oy, dpr); this.key = key; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(this.cv, 0, 0);
  }

  private paint(cw: number, ch: number, k: number, ox: number, oy: number, dpr: number): HTMLCanvasElement {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d')!, px = k * dpr, rng = createRng(B.seed);
    // scene x range covering the whole canvas, past the fitted box
    const x0 = -ox / k - 20, x1 = (cw / dpr - ox) / k + 20;
    const horizon = CAMP_SCENE.h * CAMP_SCENE.sky, bottom = (ch / dpr - oy) / k + 2, top = -oy / k - 2;
    g.setTransform(px, 0, 0, px, ox * dpr, oy * dpr);

    // sky: pale at the top, settling into the far-hill green at the horizon
    const sky = g.createLinearGradient(0, top, 0, horizon + 6);
    sky.addColorStop(0, P.frost); sky.addColorStop(0.55, P.sage); sky.addColorStop(1, P.hillFar);
    g.fillStyle = sky; g.fillRect(x0, top, x1 - x0, horizon + 6 - top);

    // far forest: two rows of round crowns, the far row in the far-hill tone, the near row darker
    B.trees.forEach((row, i) => {
      g.fillStyle = i ? P.hillNear : P.hillFar; g.beginPath(); g.moveTo(x0, row.y + 8);
      for (let x = x0; x <= x1; x += row.step) {
        const r = span(rng, row.r), y = row.y - span(rng, row.lift);
        g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2);
      }
      g.rect(x0, row.y - 1, x1 - x0, horizon + 4 - row.y); g.fill();
    });
    // low hill band in front of the trees, as on the field's far edge
    const h = B.hill; g.fillStyle = P.treantTrunk; g.beginPath(); g.moveTo(x0, horizon + 2);
    for (let i = 0, x = x0; x <= x1 + h.w; i++, x += h.w / 2) g.quadraticCurveTo(x + h.w / 4, h.y - (i % 2 ? h.h * 0.6 : h.h), x + h.w / 2, h.y);
    g.lineTo(x1 + h.w, horizon + 2); g.closePath(); g.fill();

    // meadow: the field's grass, patched lush and sunlit, with tufts
    g.fillStyle = P.plain; g.fillRect(x0, horizon, x1 - x0, bottom - horizon);
    const gr = B.ground;
    for (let i = 0; i < gr.patches; i++) {
      g.fillStyle = [P.plainLush, P.plainSun, P.plainPatch][i % 3]!;
      const x = x0 + rng.next() * (x1 - x0), y = horizon + 4 + rng.next() * (bottom - horizon), r = span(rng, gr.r);
      g.beginPath(); g.ellipse(x, y, r, r * gr.squash, 0, 0, Math.PI * 2); g.fill();
    }
    // a soft fade where the meadow meets the hills
    const haze = g.createLinearGradient(0, horizon, 0, horizon + 8);
    haze.addColorStop(0, P.wallShade); haze.addColorStop(1, P.glowClear);
    g.fillStyle = haze; g.fillRect(x0, horizon, x1 - x0, 8);

    // worn path along the row, in front of the buildings
    const p = B.path, wave = (x: number): number => p.y + p.amp * Math.sin((x / p.wave) * Math.PI * 2);
    const track = (half: number): void => {
      g.beginPath(); g.moveTo(x0, wave(x0) - half);
      for (let x = x0; x <= x1; x += 4) g.lineTo(x, wave(x) - half);
      for (let x = x1; x >= x0; x -= 4) g.lineTo(x, wave(x) + half);
      g.closePath(); g.fill();
    };
    g.fillStyle = P.plainWorn; track(p.half + p.edge); g.fillStyle = P.plainBare; track(p.half);
    g.fillStyle = P.rockLight;
    for (let i = 0; i < p.pebbles; i++) { const x = x0 + rng.next() * (x1 - x0); g.beginPath(); g.ellipse(x, wave(x) + (rng.next() - 0.5) * p.half * 1.6, 0.9, 0.5, 0, 0, Math.PI * 2); g.fill(); }

    for (let i = 0; i < gr.tufts; i++) {
      const x = x0 + rng.next() * (x1 - x0), y = horizon + 8 + rng.next() * (bottom - horizon - 8);
      if (Math.abs(y - wave(x)) < p.half + 2) continue;
      g.strokeStyle = i % 2 ? P.tuft : P.tuftLight; g.lineWidth = 0.7; g.beginPath();
      for (let b = -1; b <= 1; b++) { g.moveTo(x + b, y); g.lineTo(x + b * 2, y - span(rng, gr.blade)); }
      g.stroke();
    }

    // contact shadows under each building
    const s = B.shadow; g.fillStyle = P.shadow;
    for (const spot of Object.values(CAMP_SPOTS)) { g.beginPath(); g.ellipse(spot.x, spot.y + s.dy, spot.w * s.rx, s.ry, 0, 0, Math.PI * 2); g.fill(); }
    return cv;
  }
}
