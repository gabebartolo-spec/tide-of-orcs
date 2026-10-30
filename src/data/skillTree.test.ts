import { describe, expect, it } from 'vitest';
import { NODE, NODES, TREE_CANVAS } from './skillTree';

describe('skill tree data', () => {
  it('has unique ids and one root', () => {
    const ids = NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(NODES.filter((n) => n.parent === null)).toHaveLength(1);
  });
  it('every parent exists and is not a descendant (no cycles)', () => {
    for (const n of NODES) {
      if (!n.parent) continue;
      expect(NODE[n.parent]).toBeDefined();
      let p = n.parent, hops = 0;
      while (p && hops < 50) { const pp = NODE[p]; p = pp.parent!; hops++; }
      expect(hops).toBeLessThan(50);
    }
  });
  it('coordinates fit the tree canvas with label room', () => {
    for (const n of NODES) {
      expect(n.x).toBeGreaterThan(20); expect(n.x).toBeLessThan(TREE_CANVAS.w - 20);
      expect(n.y).toBeGreaterThan(20); expect(n.y).toBeLessThan(TREE_CANVAS.h - 14);
    }
  });
  it('no two nodes overlap (≥ 40 px apart)', () => {
    for (const a of NODES) for (const b of NODES) {
      if (a.id >= b.id) continue;
      expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(40);
    }
  });
  it('has six branches with the root in Grove', () => {
    expect(new Set(NODES.map((n) => n.branch)).size).toBe(6);
    expect(NODE.root.branch).toBe('Grove');
  });
});
