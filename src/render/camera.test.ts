import { describe, expect, it } from 'vitest';
import { TREE_CANVAS, TREE_VIEW } from '../data/skillTree';
import { centreOn, easeToward, fitCamera, panBy, startCamera, toWorld, zoomAt } from './camera';

const VW = 380, VH = 460, FIT = VW / TREE_CANVAS.w;

describe('tree camera', () => {
  it('fits width and centres a short tree vertically', () => {
    const c = fitCamera(VW, VH);
    expect(c.z).toBeCloseTo(FIT); expect(c.x).toBeCloseTo(0); expect(c.y).toBeCloseTo(-(VH / FIT - TREE_CANVAS.h) / 2);
  });
  it('opens at 1:1 on the root when the panel is narrower than the tree', () => {
    const c = startCamera(VW, VH);
    expect(c.z).toBe(TREE_VIEW.startZoom); expect(toWorld(c, VW / 2, VH / 2)).toEqual([TREE_VIEW.focusX, TREE_VIEW.focusY]);
  });
  it('zoom keeps the point under the cursor fixed', () => {
    const c = zoomAt(fitCamera(VW, VH), 190, 230, 2, VW, VH), before = toWorld(c, 200, 150);
    // both axes overflow at 2x, so clamping does not move the anchor
    const after = toWorld(zoomAt(c, 200, 150, 1.1, VW, VH), 200, 150);
    expect(after[0]).toBeCloseTo(before[0]); expect(after[1]).toBeCloseTo(before[1]);
  });
  it('clamps zoom to the configured range', () => {
    const c = fitCamera(VW, VH);
    expect(zoomAt(c, 0, 0, 100, VW, VH).z).toBeCloseTo(FIT * TREE_VIEW.maxZoom);
    expect(zoomAt(c, 0, 0, 0.01, VW, VH).z).toBeCloseTo(FIT * TREE_VIEW.minZoom);
  });
  it('cannot pan past the tree edges', () => {
    const c = zoomAt(fitCamera(VW, VH), 0, 0, 2, VW, VH);
    const far = panBy(c, -1e6, -1e6, VW, VH);
    expect(far.x).toBeCloseTo(TREE_CANVAS.w - VW / far.z); expect(far.y).toBeCloseTo(TREE_CANVAS.h - VH / far.z);
    const near = panBy(c, 1e6, 1e6, VW, VH); expect(near.x).toBeCloseTo(0); expect(near.y).toBeCloseTo(0);
  });
  it('centres a node and eases toward it', () => {
    const c = startCamera(VW, VH), t = centreOn(c, 380, 600, VW, VH);
    const [wx, wy] = toWorld(t, VW / 2, VH / 2);
    expect(wx).toBeCloseTo(380); expect(wy).toBeCloseTo(600);
    const half = easeToward({ x: 0, y: 0, z: 1 }, { x: 10, y: 20, z: 1 }, 0.5);
    expect(half).toEqual({ x: 5, y: 10, z: 1 });
  });
});
