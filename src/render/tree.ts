import { BRANCH_COLOR, NODE, NODES, NodeId, TREE_CANVAS } from '../data/skillTree';
import { SimState } from '../sim/state';
import { canBuy, rankOf, unlocked } from '../sim/tree';
import { P } from './palette';

/** Skill tree canvas. Pan/zoom is TB-021; for now the canvas scales to its container. */
export class TreeRenderer {
  private g: CanvasRenderingContext2D;
  selected: NodeId = 'sharp';
  reducedMotion = false;

  constructor(readonly canvas: HTMLCanvasElement) {
    canvas.width = TREE_CANVAS.w; canvas.height = TREE_CANVAS.h;
    this.g = canvas.getContext('2d')!;
  }

  hitTest(clientX: number, clientY: number): NodeId | null {
    const r = this.canvas.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * TREE_CANVAS.w, y = ((clientY - r.top) / r.height) * TREE_CANVAS.h;
    for (const n of NODES) if (Math.hypot(n.x - x, n.y - y) < 20) return n.id;
    return null;
  }

  draw(s: SimState, t: number): void {
    const c = this.g; c.clearRect(0, 0, TREE_CANVAS.w, TREE_CANVAS.h);
    c.lineWidth = 2;
    for (const n of NODES) if (n.parent) { const p = NODE[n.parent]; const un = unlocked(s, n); c.strokeStyle = un ? BRANCH_COLOR[n.branch] : P.line; c.globalAlpha = un ? 0.6 : 0.5; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(n.x, n.y); c.stroke(); }
    c.globalAlpha = 1;
    for (const n of NODES) {
      const lvl = rankOf(s, n.id), col = BRANCH_COLOR[n.branch], un = unlocked(s, n), maxed = lvl >= n.max, r = n.id === 'root' ? 16 : 13;
      c.beginPath(); c.arc(n.x, n.y, r, 0, 6.28);
      c.fillStyle = maxed ? col : lvl > 0 ? '#2b3448' : P.ink; c.fill();
      c.lineWidth = n.id === this.selected ? 3 : 2; c.strokeStyle = un ? col : P.line; c.stroke();
      if (lvl > 0 && !maxed) { c.beginPath(); c.arc(n.x, n.y, r, -1.571, -1.571 + (6.283 * lvl) / n.max); c.strokeStyle = col; c.lineWidth = 4; c.stroke(); }
      if (canBuy(s, n)) { c.beginPath(); c.arc(n.x, n.y, r + 5, 0, 6.28); c.strokeStyle = P.amber; c.lineWidth = 1; c.globalAlpha = this.reducedMotion ? 0.8 : 0.5 + 0.5 * Math.sin(t * 4); c.stroke(); c.globalAlpha = 1; }
      c.fillStyle = un ? P.cream : '#6b7383'; c.font = '11px "Atkinson Hyperlegible", sans-serif'; c.textAlign = 'center'; c.fillText(n.name, n.x, n.y + r + 13);
      if (n.max > 1) { c.fillStyle = maxed ? P.ink : P.cream; c.font = '700 10px "Atkinson Hyperlegible", sans-serif'; c.fillText(`${lvl}/${n.max}`, n.x, n.y + 4); }
    }
    let lx = 14; c.font = '10px "Atkinson Hyperlegible", sans-serif'; c.textAlign = 'left';
    for (const k of Object.keys(BRANCH_COLOR) as (keyof typeof BRANCH_COLOR)[]) { c.fillStyle = BRANCH_COLOR[k]; c.fillRect(lx, 14, 8, 8); c.fillStyle = P.creamDim; const label = k.toUpperCase(); c.fillText(label, lx + 12, 22); lx += c.measureText(label).width + 30; }
  }
}
