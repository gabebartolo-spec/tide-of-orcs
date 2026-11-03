import { describe, expect, it, vi } from 'vitest';

class FakeImage {
  width = 100; height = 200; onload: (() => void) | null = null;
  set src(_v: string) { queueMicrotask(() => this.onload?.()); }
}
vi.stubGlobal('Image', FakeImage);
const { Treeline } = await import('./treeline');

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
});
