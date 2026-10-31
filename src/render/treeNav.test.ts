import { describe, expect, it } from 'vitest';
import { BRANCH_COLOR, Branch, NODE, NODES } from '../data/skillTree';
import { stepNode, tabOrder } from './treeNav';

describe('tree tab order (TB-116)', () => {
  const order = tabOrder();
  it('visits every node exactly once, Waking first', () => {
    expect(order[0]).toBe('root'); expect(order.length).toBe(NODES.length); expect(new Set(order).size).toBe(NODES.length);
  });
  it('keeps each branch together, in legend order', () => {
    const seen = order.slice(1).map((id) => NODE[id].branch).filter((b, i, a) => b !== a[i - 1]);
    expect(seen).toEqual((Object.keys(BRANCH_COLOR) as Branch[]).filter((b) => NODES.some((n) => n.branch === b && n.parent)));
  });
  it('puts every parent before its children', () => {
    for (const n of NODES) if (n.parent) expect(order.indexOf(n.parent)).toBeLessThan(order.indexOf(n.id));
  });
  it('steps forward and back, and returns null at the ends', () => {
    expect(stepNode(order, 'root', 1)).toBe(order[1]); expect(stepNode(order, order[1]!, -1)).toBe('root');
    expect(stepNode(order, 'root', -1)).toBeNull(); expect(stepNode(order, order[order.length - 1]!, 1)).toBeNull();
  });
});
