import { describe, expect, it, vi } from 'vitest';

class FakeImage {
  width = 100; height = 200; onload: (() => void) | null = null;
  set src(_v: string) { queueMicrotask(() => this.onload?.()); }
}
vi.stubGlobal('Image', FakeImage);
const { Treeline, treeHeight, rowScale } = await import('./treeline');
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
  it('does not throw on a zero-size / NaN view, so the frame loop survives', () => {
    const t = new Treeline(), { g } = mockCtx();
    expect(() => t.draw(g, NaN, NaN, NaN)).not.toThrow();
    expect(() => t.draw(g, 0, Infinity, 0)).not.toThrow();
  });
  it('draws on a normal view and scales tree height by the short-view factor', async () => {
    await new Promise((r) => setTimeout(r, 0));
    const t = new Treeline(), { g, calls } = mockCtx();
    t.draw(g, -400, 0, 1300);
    expect(calls.grad).toBe(1);
    expect(calls.draw.length).toBeGreaterThan(0);
    for (const a of calls.draw) expect(a[3]).toBeGreaterThan(0);
  });
  it('sizes each tree by its real model height, so pines stand taller than oaks and spruces', () => {
    expect(treeHeight('pine_3', 0.5)).toBeGreaterThan(treeHeight('oak_green_1', 0.5));
    expect(treeHeight('oak_green_1', 0.5)).toBeGreaterThan(treeHeight('spruce_3', 0.5));
    expect(treeHeight('pine_3', 0)).toBeCloseTo(TREELINE.heights.pine_3! * TREELINE.unit * TREELINE.size[0]);
    expect(treeHeight('nope', 0.5)).toBe(0);
  });
  it('row scale is 1 on a tall view and shrinks only on a short one', () => {
    expect(rowScale(200, -300, 0)).toBe(1);
    expect(rowScale(10, -26, 0)).toBeLessThan(1);
    expect(rowScale(10, -26, 0)).toBeGreaterThan(0);
  });
  it('never caps a tree below its aspect: width scales with height (no squash)', async () => {
    await new Promise((r) => setTimeout(r, 0));
    const t = new Treeline(), { g, calls } = mockCtx();
    t.draw(g, -400, -26, 1300);
    for (const a of calls.draw) expect(a[2]! / a[3]!).toBeCloseTo(0.5);  // FakeImage is 100x200
  });
});
