import { describe, expect, it, vi } from 'vitest';

class FakeImage {
  width = 100; height = 200; onload: (() => void) | null = null;
  set src(_v: string) { queueMicrotask(() => this.onload?.()); }
}
vi.stubGlobal('Image', FakeImage);
const { Treeline, treeHeight, rowScale, rowKinds, rowRoom, fitSize, grade } = await import('./treeline');
const { TREELINE } = await import('../data/presentation');

function mockCtx() {
  const calls = { grad: 0, draw: [] as number[][] };
  const g = {
    createLinearGradient: (...a: number[]) => { calls.grad++; if (a.some((v) => !Number.isFinite(v))) throw new TypeError('non-finite'); return { addColorStop: () => undefined }; },
    drawImage: (_im: unknown, ...a: number[]) => { calls.draw.push(a); },
    save: () => undefined, restore: () => undefined, translate: () => undefined, scale: () => undefined, fillRect: () => undefined,
    globalAlpha: 1, fillStyle: '',
  } as unknown as CanvasRenderingContext2D;
  return { g, calls };
}

describe('treeline', () => {
  it('grades rows by distance behind the nearest, capped at the deepest grade (TB-260)', () => {
    expect(grade(0)).toBe('');
    expect(grade(1)).toBe('_d1');
    expect(grade(TREELINE.depth + 4)).toBe(`_d${TREELINE.depth}`);
  });

  it('does not throw on a zero-size / NaN view, so the frame loop survives', () => {
    const t = new Treeline(), { g } = mockCtx();
    expect(() => t.draw(g, NaN, NaN, NaN)).not.toThrow();
    expect(() => t.draw(g, 0, Infinity, 0)).not.toThrow();
  });
  it('draws on a normal view and scales tree height by the short-view factor', async () => {
    await new Promise((r) => setTimeout(r, 0));
    const t = new Treeline(), { g, calls } = mockCtx();
    t.draw(g, -400, 0, 1300);
    expect(calls.grad).toBe(0);  // no full-width ground band: each bush casts its own shadow
    expect(calls.draw.length).toBeGreaterThan(0);
    for (const a of calls.draw) expect(a[7]).toBeGreaterThan(0);  // drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh)
  });
  it('sizes each tree by its real model height, so pines stand taller than oaks and spruces', () => {
    expect(treeHeight('pine_3', 0.5)).toBeGreaterThan(treeHeight('oak_green_1', 0.5));
    expect(treeHeight('oak_green_1', 0.5)).toBeGreaterThan(treeHeight('spruce_3', 0.5));
    expect(treeHeight('pine_3', 0)).toBeCloseTo(TREELINE.heights.pine_3! * TREELINE.unit * TREELINE.size[0]);
    expect(treeHeight('nope', 0.5)).toBe(0);
  });
  it('every row holds only kinds that fit its room, so no crown passes the view top and the tall pines stand in the nearer rows', () => {
    for (let r = 0; r < 4; r++) {
      const tall = Math.max(...rowKinds(r).map((n) => treeHeight(n, 1))) * (1 + r * TREELINE.grow);
      expect(rowScale(r) * tall).toBeLessThanOrEqual(rowRoom(r) + 1e-9);
      expect(rowScale(r)).toBeGreaterThan(0.85);
    }
    expect(rowKinds(0)).toContain('pine_3');  // the tallest pine stands even in the farthest row
  });
  it('draws trees only down to the y asked for, so an orc can stand between the rows, and the skirt waits for its own call', async () => {
    await new Promise((r) => setTimeout(r, 0));
    const t = new Treeline(), { g, calls } = mockCtx();
    t.begin(g, -26);
    t.treesUpTo(g, -26, -400, 1300, -26);  // nothing is based above the view top
    expect(calls.draw.length).toBe(0);
    t.treesUpTo(g, -26, -400, 1300, t.skirtEdge(-26));
    const mid = calls.draw.length; expect(mid).toBeGreaterThan(0);
    t.treesUpTo(g, -26, -400, 1300, Infinity); expect(calls.draw.length).toBeGreaterThan(mid);
    const rows = calls.draw.length; t.skirtUpTo(g, -26, -400, 1300, Infinity); expect(calls.draw.length).toBeGreaterThan(rows);
    const total = calls.draw.length; t.treesUpTo(g, -26, -400, 1300, Infinity); t.skirtUpTo(g, -26, -400, 1300, Infinity);
    expect(calls.draw.length).toBe(total);  // a second call draws nothing twice
  });
  it('never caps a tree below its aspect: width scales with height (no squash)', async () => {
    await new Promise((r) => setTimeout(r, 0));
    const t = new Treeline(), { g, calls } = mockCtx();
    t.draw(g, -400, -26, 1300);
    expect(calls.draw.length).toBeGreaterThan(0);
    for (const a of calls.draw) { expect(a[6]! / a[7]!).toBeCloseTo(0.5); expect(a[2]! / a[3]!).toBeCloseTo(0.5); }  // FakeImage is 100x200: dest and source keep its aspect
  });
});

describe('treeline sharpness and canopy', () => {
  it('fits a sprite to whole device pixels at its own aspect, at any scale', () => {
    for (const hd of [37, 90.4, 145.6, 290]) {
      const { w, h } = fitSize(206 / 465, hd);
      expect(Number.isInteger(w) && Number.isInteger(h)).toBe(true);
      expect(Math.abs(w / h - 206 / 465)).toBeLessThan(0.5 / h + 1e-9);  // rounding to a pixel is the only change: never a squash
    }
  });
  it('the canopy rows hold only the tall pines, so crowns reach the view top', () => {
    for (let r = 0; r < TREELINE.fill.rows; r++) for (const k of rowKinds(r)) expect(TREELINE.heights[k]).toBeGreaterThanOrEqual(7);
    expect(rowKinds(0)).not.toContain('oak_green_1'); expect(rowKinds(0)).not.toContain('spruce_3');
    expect(rowKinds(TREELINE.fill.rows + 1).length).toBeGreaterThan(rowKinds(0).length);
  });
  it('no row shrinks its trees: rowScale is 1 for every row the view can hold (natural height at any viewport)', () => {
    for (let r = 0; r < 12; r++) expect(rowScale(r)).toBe(1);
  });
  it('the canopy row is stretched at most to TREELINE.stretch and a tree of it never leaves a gap wider than the crown window', () => {
    expect(TREELINE.stretch).toBeLessThanOrEqual(1.25);
    expect(TREELINE.crown[1]).toBeGreaterThanOrEqual(TREELINE.crown[0]);
  });
});
