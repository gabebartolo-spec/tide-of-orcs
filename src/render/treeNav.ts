/** Keyboard order through the skill tree (GDD §13, TB-116). Pure; the panel steps through it with Tab. */
import { BRANCH_COLOR, Branch, NODES, NodeId, SkillNode } from '../data/skillTree';

/** The root first, then each branch in legend order, walked depth-first so a parent comes just before its children. */
export function tabOrder(nodes: readonly SkillNode[] = NODES): NodeId[] {
  const kids = new Map<NodeId | null, SkillNode[]>();
  for (const n of nodes) { const k = kids.get(n.parent); if (k) k.push(n); else kids.set(n.parent, [n]); }
  const out: NodeId[] = [], branch = new Map(nodes.map((n) => [n.id, n.branch]));
  const roots = kids.get(null) ?? [], rootIds = new Set(roots.map((r) => r.id));
  const walk = (n: SkillNode, b: Branch): void => { out.push(n.id); for (const c of kids.get(n.id) ?? []) if (c.branch === b) walk(c, b); };
  for (const r of roots) out.push(r.id);
  for (const b of Object.keys(BRANCH_COLOR) as Branch[]) {
    // A branch starts at each of its nodes hanging off the root or off another branch.
    for (const n of nodes) if (n.branch === b && n.parent && (rootIds.has(n.parent) || branch.get(n.parent) !== b)) walk(n, b);
  }
  return out;
}

/** The node after (dir 1) or before (dir -1) `id`, or null at either end so focus can leave the tree. */
export function stepNode(order: readonly NodeId[], id: NodeId, dir: 1 | -1): NodeId | null {
  const i = order.indexOf(id);
  return order[i + dir] ?? null;
}
