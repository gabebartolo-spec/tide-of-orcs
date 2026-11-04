import { describe, expect, it } from 'vitest';
import { DragGuard } from './dragGuard';

describe('tree drag guard (TB-219)', () => {
  it('stays a drag across repeated reads, so the mousemove tooltip cannot reset it before the release click', () => {
    const g = new DragGuard(); g.press();
    expect(g.move(10, 0, 6)).toBe(true);
    expect(g.dragged).toBe(true); expect(g.dragged).toBe(true); // a hit test reads it on every mousemove
    expect(g.dragged).toBe(true); // ...and the release click still sees it
  });
  it('a small wobble is still a tap', () => { const g = new DragGuard(); g.press(); expect(g.move(2, 2, 6)).toBe(false); expect(g.dragged).toBe(false); });
  it('travel adds up across moves', () => { const g = new DragGuard(); g.press(); g.move(4, 0, 6); expect(g.move(4, 0, 6)).toBe(true); });
  it('a new press or settle() clears it; a pinch counts as a drag; fixed-camera travel never flags', () => {
    const g = new DragGuard(); g.pinch(); expect(g.dragged).toBe(true); g.settle(); expect(g.dragged).toBe(false);
    g.press(); g.move(50, 0, 6); g.press(); expect(g.dragged).toBe(false);
    g.travel(500, 0); expect(g.dragged).toBe(false);
  });
});
