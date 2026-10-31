import { BRANCH_COLOR, BRANCH_LABEL, NODE, NODES, NodeId, TREE_VIEW } from '../data/skillTree';
import { Camera, centreOn, clampCamera, easeToward, startCamera, panBy, toWorld, zoomAt } from './camera';
import { SimState } from '../sim/state';
import { canBuy, rankOf, unlocked } from '../sim/tree';
import { P } from './palette';

/** Skill tree canvas with pan (drag) and zoom (wheel / pinch). Camera is view state only. */
export class TreeRenderer {
  private g: CanvasRenderingContext2D;
  selected: NodeId = 'sharp';
  reducedMotion = false;
  private cam: Camera = { x: 0, y: 0, z: 1 };
  private vw = 1; private vh = 1; private dpr = 1;
  private pts = new Map<number, { x: number; y: number }>();
  private moved = 0;
  private dragged = false;
  /** Where the camera is easing to after a selection; null once there or when the player pans or zooms. */
  private target: Camera | null = null;
  private lastDraw = 0;
  /** Camera moved by pan or zoom since the last draw. */
  private stale = false;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault(); this.target = null; const [sx, sy] = this.local(e);
      this.cam = zoomAt(this.cam, sx, sy, e.deltaY < 0 ? TREE_VIEW.wheelStep : 1 / TREE_VIEW.wheelStep, this.vw, this.vh); this.stale = true;
    }, { passive: false });
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId); this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.target = null;
      if (this.pts.size === 1) { this.moved = 0; this.dragged = false; }
    });
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    const end = (e: PointerEvent): void => { this.pts.delete(e.pointerId); if (!this.pts.size) canvas.classList.remove('dragging'); };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    // Keyboard focus shows a ring on the selected node (TB-116), so redraw when it comes or goes.
    canvas.addEventListener('focus', () => { this.stale = true; }); canvas.addEventListener('blur', () => { this.stale = true; });
  }

  private onMove(e: PointerEvent): void {
    const p = this.pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (this.pts.size === 2) {
      const [a, b] = [...this.pts.values()];
      const other = (a === p ? b : a)!;
      const d0 = Math.hypot(p.x - other.x, p.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const [mx, my] = this.local({ clientX: (e.clientX + other.x) / 2, clientY: (e.clientY + other.y) / 2 });
      if (d0 > 0) { this.cam = zoomAt(this.cam, mx, my, d1 / d0, this.vw, this.vh); this.stale = true; }
      this.dragged = true;
    } else {
      this.moved += Math.hypot(dx, dy);
      if (this.moved > TREE_VIEW.dragPx) { this.dragged = true; this.canvas.classList.add('dragging'); }
      if (this.dragged) { this.cam = panBy(this.cam, dx, dy, this.vw, this.vh); this.stale = true; }
    }
    p.x = e.clientX; p.y = e.clientY;
  }

  private local(e: { clientX: number; clientY: number }): [number, number] {
    const r = this.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top];
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    const first = this.vw === 1, k = r.width / this.vw;
    this.vw = r.width; this.vh = r.height; this.dpr = devicePixelRatio || 1;
    this.canvas.width = Math.round(r.width * this.dpr); this.canvas.height = Math.round(r.height * this.dpr);
    // Keep the same framing when the panel resizes: scale zoom with width.
    this.cam = first ? startCamera(this.vw, this.vh) : clampCamera({ ...this.cam, z: this.cam.z * k }, this.vw, this.vh);
  }

  /** True while the camera is easing or was just panned/zoomed, so the caller should draw this frame. */
  get live(): boolean { return !!this.target || this.stale; }

  /** Select a node and ease the camera to centre it (snaps under reduced motion). */
  select(id: NodeId): void {
    this.selected = id;
    const n = NODE[id], t = centreOn(this.cam, n.x, n.y, this.vw, this.vh);
    if (this.reducedMotion) { this.cam = t; this.target = null; } else { this.target = t; this.lastDraw = performance.now(); }
  }

  /** Node under the pointer, or null. A press that turned into a drag never selects. */
  hitTest(clientX: number, clientY: number): NodeId | null {
    if (this.dragged) { this.dragged = false; return null; }
    const [sx, sy] = this.local({ clientX, clientY }); if (sy < TREE_VIEW.legendH) return null; // the legend strip covers what is under it
    const [x, y] = toWorld(this.cam, sx, sy);
    for (const n of NODES) if (Math.hypot(n.x - x, n.y - y) < TREE_VIEW.hitR) return n.id;
    return null;
  }

  draw(s: SimState, t: number): void {
    this.stale = false;
    if (this.target) {
      const now = performance.now(), dt = Math.min(0.1, (now - this.lastDraw) / 1000); this.lastDraw = now;
      this.cam = easeToward(this.cam, this.target, 1 - Math.exp(-dt * TREE_VIEW.easeRate));
      if (Math.abs(this.cam.x - this.target.x) + Math.abs(this.cam.y - this.target.y) < 0.5) { this.cam = this.target; this.target = null; }
    }
    const c = this.g, k = this.dpr, z = this.cam.z * k;
    c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, this.vw, this.vh);
    c.setTransform(z, 0, 0, z, -this.cam.x * z, -this.cam.y * z);
    c.lineWidth = 2;
    for (const n of NODES) if (n.parent) { const p = NODE[n.parent]; const un = unlocked(s, n); c.strokeStyle = un ? BRANCH_COLOR[n.branch] : P.line; c.globalAlpha = un ? 0.6 : 0.5; c.beginPath(); c.moveTo(p.x, p.y); c.quadraticCurveTo((p.x + n.x) / 2 - (n.y - p.y) * TREE_VIEW.bow, (p.y + n.y) / 2 + (n.x - p.x) * TREE_VIEW.bow, n.x, n.y); c.stroke(); }
    c.globalAlpha = 1;
    const keyFocus = this.canvas.matches(':focus-visible');
    for (const n of NODES) {
      const lvl = rankOf(s, n.id), col = BRANCH_COLOR[n.branch], un = unlocked(s, n), maxed = lvl >= n.max, r = n.id === 'root' ? 16 : 13;
      c.beginPath(); c.arc(n.x, n.y, r, 0, 6.28);
      c.fillStyle = maxed ? col : lvl > 0 ? P.nodeOwned : P.ink; c.fill();
      c.lineWidth = n.id === this.selected ? 3 : 2; c.strokeStyle = un ? col : P.line; c.stroke();
      if (lvl > 0 && !maxed) { c.beginPath(); c.arc(n.x, n.y, r, -1.571, -1.571 + (6.283 * lvl) / n.max); c.strokeStyle = col; c.lineWidth = 4; c.stroke(); }
      if (canBuy(s, n)) { c.beginPath(); c.arc(n.x, n.y, r + 5, 0, 6.28); c.strokeStyle = P.amber; c.lineWidth = 1; c.globalAlpha = this.reducedMotion ? 0.8 : 0.5 + 0.5 * Math.sin(t * 4); c.stroke(); c.globalAlpha = 1; }
      if (keyFocus && n.id === this.selected) { c.beginPath(); c.arc(n.x, n.y, r + 9, 0, 6.28); c.strokeStyle = P.cream; c.lineWidth = 2; c.setLineDash([4, 3]); c.stroke(); c.setLineDash([]); }
      c.fillStyle = un ? P.cream : P.nodeLabelLocked; c.font = '11px "Atkinson Hyperlegible", sans-serif'; c.textAlign = 'center'; c.fillText(n.name, n.x, n.y + r + 13);
      if (n.max > 1) { c.fillStyle = maxed ? P.ink : P.cream; c.font = '700 10px "Atkinson Hyperlegible", sans-serif'; c.fillText(`${lvl}/${n.max}`, n.x, n.y + 4); }
    }
    c.setTransform(k, 0, 0, k, 0, 0); // legend stays in screen space, on its own strip so nodes pan under it, not through it (TB-117)
    c.fillStyle = P.ink2; c.fillRect(0, 0, this.vw, TREE_VIEW.legendH); c.fillStyle = P.line; c.fillRect(0, TREE_VIEW.legendH - 1, this.vw, 1);
    let lx = 14; c.font = '10px "Atkinson Hyperlegible", sans-serif'; c.textAlign = 'left';
    for (const k of Object.keys(BRANCH_COLOR) as (keyof typeof BRANCH_COLOR)[]) { c.fillStyle = BRANCH_COLOR[k]; c.fillRect(lx, 14, 8, 8); c.fillStyle = P.creamDim; const label = BRANCH_LABEL[k].toUpperCase(); c.fillText(label, lx + 12, 22); lx += c.measureText(label).width + 30; }
  }
}
