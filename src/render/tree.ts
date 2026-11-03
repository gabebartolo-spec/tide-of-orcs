import { BRANCH_COLOR, BRANCH_LABEL, NODE, NODES, NodeId, SkillNode, TREE_VIEW } from '../data/skillTree';
import { Camera, centreOn, clampCamera, easeToward, startCamera, panBy, toWorld, wholeCamera, zoomAt } from './camera';
import { SimState } from '../sim/state';
import { canBuy, pathLocked, rankOf, unlocked } from '../sim/tree';
import { DragGuard } from './dragGuard';
import { BRANCH_LIGHT, P, PATH_TINT } from './palette';
import { TREE_LIGHT as L } from '../data/presentation';

/** The UI scale: root font size over 16 px (style.css, TB-143); 1.25 at 1920×1080 since TB-191, times Settings › Text size. */
export const uiScale = (): number => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;

/** Nodes each link carries (the child and all below it): sets how thick its wood is, so the trunk is thickest (TB-163). */
const carried = new Map<NodeId, number>();
for (const n of NODES) for (let p: SkillNode | undefined = n; p; p = p.parent ? NODE[p.parent] : undefined) carried.set(p.id, (carried.get(p.id) ?? 0) + 1);
const TRUNK = new Set<NodeId>(['root', 'muster', 'wolf']);
/** A link's curve control point: links rising off the trunk run up it before bending out; the rest bow gently. */
const ctrl = (p: SkillNode, n: SkillNode): [number, number] =>
  TRUNK.has(p.id) && n.y < p.y ? [p.x, p.y + (n.y - p.y) * TREE_VIEW.trunkRise]
    : [(p.x + n.x) / 2 - (n.y - p.y) * TREE_VIEW.bow, (p.y + n.y) / 2 + (n.x - p.x) * TREE_VIEW.bow];
const LINKS = NODES.filter((n) => n.parent).map((n, i) => {
  const p = NODE[n.parent!], [cx, cy] = ctrl(p, n);
  return { n, p, cx, cy, w: TREE_VIEW.woodBase + TREE_VIEW.woodPerNode * Math.sqrt(carried.get(n.id)!), seed: (i * 0.618) % 1 };
});
type Link = (typeof LINKS)[number];
/** Links from the root to each node (root first), and each node's depth below the root, for pulses and buy bursts. */
const DEPTH = new Map<NodeId, number>();
for (const n of NODES) { let d = 0; for (let p = n; p.parent; p = NODE[p.parent]) d++; DEPTH.set(n.id, d); }
const MAX_DEPTH = Math.max(...DEPTH.values());
const LINK_OF = new Map(LINKS.map((l) => [l.n.id, l] as const));
interface Mote { x: number; y: number; vx: number; vy: number; life: number; col: string }
/** A node's neon (TB-193c): a path node glows in its path's light, every other node in its branch's. */
const lightOf = (n: SkillNode): string => (n.path ? PATH_TINT[n.path].light : BRANCH_LIGHT[n.branch]);
const ringOf = (n: SkillNode): string => (n.path ? PATH_TINT[n.path].colour : BRANCH_COLOR[n.branch]);
const at = (a: number, c: number, b: number, u: number): number => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;

/** Skill tree canvas with pan (drag) and zoom (wheel / pinch). Camera is view state only. */
export class TreeRenderer {
  private g: CanvasRenderingContext2D;
  selected: NodeId = 'sharp';
  reducedMotion = false;
  private cam: Camera = { x: 0, y: 0, z: 1 };
  private vw = 1; private vh = 1; private dpr = 1;
  private pts = new Map<number, { x: number; y: number }>();
  private drag = new DragGuard();
  /** Where the camera is easing to after a selection; null once there or when the player pans or zooms. */
  private target: Camera | null = null;
  private lastDraw = 0;
  /** Camera moved by pan or zoom since the last draw. */
  private stale = false;
  /** CSS px per layout px: the root font size over its 16 px base (TB-143). */
  private ui = 1;
  /** How far each bought link has grown, 0..1 (view state only); links owned on the first draw start grown. */
  private grown = new Map<NodeId, number>();
  private growing = false;
  private lastT = 0;
  /** Full-screen view (TB-189): the whole tree fits the window and the camera stays fixed. */
  private full = false;
  /** The normal view's camera, restored when full screen closes. */
  private saved: Camera | null = null;
  /** Cached additive glow (bloom + light pools) of owned links (TB-190b); rebuilt only when the camera, size or owned set changes. */
  private glow = document.createElement('canvas');
  private glowKey = '';
  /** Ranks seen on the last draw, to burst light along the path of a node just bought. */
  private ranks = new Map<NodeId, number>();
  private burst: Mote[] = [];

  constructor(readonly canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault(); if (this.full) return; this.target = null; const [sx, sy] = this.local(e);
      this.cam = zoomAt(this.cam, sx, sy, e.deltaY < 0 ? TREE_VIEW.wheelStep : 1 / TREE_VIEW.wheelStep, this.vw, this.vh); this.stale = true;
    }, { passive: false });
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId); this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.target = null;
      if (this.pts.size === 1) this.drag.press();
    });
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    const end = (e: PointerEvent): void => { this.pts.delete(e.pointerId); if (!this.pts.size) { canvas.classList.remove('dragging'); setTimeout(() => { if (!this.pts.size) this.drag.settle(); }, 0); } }; // the release click still sees `dragged`; hover works again after (TB-219)
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    // Keyboard focus shows a ring on the selected node (TB-116), so redraw when it comes or goes.
    canvas.addEventListener('focus', () => { this.stale = true; }); canvas.addEventListener('blur', () => { this.stale = true; });
  }

  private onMove(e: PointerEvent): void {
    const p = this.pts.get(e.pointerId); if (!p) return;
    const dx = (e.clientX - p.x) / this.ui, dy = (e.clientY - p.y) / this.ui;
    if (this.full) { this.drag.travel(dx, dy); p.x = e.clientX; p.y = e.clientY; return; } // fixed camera: no pan or pinch
    if (this.pts.size === 2) {
      const [a, b] = [...this.pts.values()];
      const other = (a === p ? b : a)!;
      const d0 = Math.hypot(p.x - other.x, p.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const [mx, my] = this.local({ clientX: (e.clientX + other.x) / 2, clientY: (e.clientY + other.y) / 2 });
      if (d0 > 0) { this.cam = zoomAt(this.cam, mx, my, d1 / d0, this.vw, this.vh); this.stale = true; }
      this.drag.pinch();
    } else {
      if (this.drag.move(dx, dy, TREE_VIEW.dragPx)) this.canvas.classList.add('dragging');
      if (this.drag.dragged) { this.cam = panBy(this.cam, dx, dy, this.vw, this.vh); this.stale = true; }
    }
    p.x = e.clientX; p.y = e.clientY;
  }

  private local(e: { clientX: number; clientY: number }): [number, number] {
    const r = this.canvas.getBoundingClientRect(); return [(e.clientX - r.left) / this.ui, (e.clientY - r.top) / this.ui];
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    // Work in 1080p layout px (CSS px ÷ the UI scale, TB-143), so legend, labels and camera framing grow with the window
    this.ui = uiScale(); const first = this.vw === 1, k = r.width / this.ui / this.vw;
    this.vw = r.width / this.ui; this.vh = r.height / this.ui; this.dpr = (devicePixelRatio || 1) * this.ui;
    this.canvas.width = Math.round(r.width * (devicePixelRatio || 1)); this.canvas.height = Math.round(r.height * (devicePixelRatio || 1));
    // Keep the same framing when the panel resizes: scale zoom with width.
    if (this.full) { this.cam = wholeCamera(this.vw, this.vh); this.target = null; return; }
    this.cam = first ? startCamera(this.vw, this.vh) : clampCamera({ ...this.cam, z: this.cam.z * k }, this.vw, this.vh);
  }

  /** Enter or leave the full-screen view (TB-189). The caller resizes the canvas box first; this refits the camera. */
  setFull(on: boolean): void {
    if (on === this.full) return;
    if (on) this.saved = this.target ?? this.cam;
    this.full = on; this.target = null; this.vw = 1; // force a fresh fit on the next resize
    const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    this.ui = uiScale(); this.vw = r.width / this.ui; this.vh = r.height / this.ui; this.dpr = (devicePixelRatio || 1) * this.ui;
    this.canvas.width = Math.round(r.width * (devicePixelRatio || 1)); this.canvas.height = Math.round(r.height * (devicePixelRatio || 1));
    this.cam = on ? wholeCamera(this.vw, this.vh) : this.saved ? clampCamera(this.saved, this.vw, this.vh) : startCamera(this.vw, this.vh);
    this.stale = true;
  }

  /** True while the camera is easing or was just panned/zoomed, so the caller should draw this frame. */
  get live(): boolean { return !!this.target || this.stale || this.growing || (!this.reducedMotion && this.canvas.offsetParent !== null); }

  /** Select a node and ease the camera to centre it (snaps under reduced motion). */
  select(id: NodeId): void {
    this.selected = id;
    if (this.full) return; // every node is already on screen
    const n = NODE[id], t = centreOn(this.cam, n.x, n.y, this.vw, this.vh);
    if (this.reducedMotion) { this.cam = t; this.target = null; } else { this.target = t; this.lastDraw = performance.now(); }
  }

  /** Node under the pointer, or null. A press that turned into a drag never selects. */
  hitTest(clientX: number, clientY: number): NodeId | null {
    if (this.drag.dragged) return null; // not cleared here: the hover tooltip also calls this; settle() clears it after the release click (TB-219)
    const [sx, sy] = this.local({ clientX, clientY }); if (sy < TREE_VIEW.legendH) return null; // the legend strip covers what is under it
    const [x, y] = toWorld(this.cam, sx, sy);
    for (const n of NODES) if (Math.hypot(n.x - x, n.y - y) < TREE_VIEW.hitR) return n.id;
    return null;
  }

  /** The arcane tree (TB-163, neon TB-190): a dim neon glow along every locked link, then bark that grows along each bought link with a lit edge,
   *  an arcane vein in its branch colour, and sparkles drifting out along it. */
  private wood(s: SimState, t: number): void {
    const c = this.g, first = this.grown.size === 0, now = performance.now(), dt = Math.min(0.1, (now - this.lastT) / 1000); this.lastT = now;
    this.growing = false; c.lineCap = 'round';
    const grown: { l: Link; g: number }[] = [];
    for (const l of LINKS) {
      const want = rankOf(s, l.n.id) > 0 ? 1 : 0, had = this.grown.get(l.n.id) ?? (first ? want : 0);
      const g = this.reducedMotion ? want : want > had ? Math.min(1, had + dt * TREE_VIEW.growRate) : want;
      this.grown.set(l.n.id, g); if (g !== want) this.growing = true;
      if (g > 0) grown.push({ l, g });
    }
    this.spawnBursts(s, first);
    // de Casteljau split: just the first g of the curve
    const part = (l: Link, g: number): void => {
      c.beginPath(); c.moveTo(l.p.x, l.p.y);
      c.quadraticCurveTo(l.p.x + (l.cx - l.p.x) * g, l.p.y + (l.cy - l.p.y) * g, at(l.p.x, l.cx, l.n.x, g), at(l.p.y, l.cy, l.n.y, g));
    };
    // Unowned links: dim, thin and still, one batched path
    c.globalAlpha = 1; c.beginPath();
    for (const l of LINKS) if ((this.grown.get(l.n.id) ?? 0) < 1) { c.moveTo(l.p.x, l.p.y); c.quadraticCurveTo(l.cx, l.cy, l.n.x, l.n.y); }
    c.strokeStyle = P.linkDim; c.lineWidth = 1.2; c.stroke();
    // Path links not yet grown (TB-193c): the chosen path's still neon in its colour; a locked path's dashed and faint
    for (const l of LINKS) {
      if (!l.n.path || (this.grown.get(l.n.id) ?? 0) >= 1) continue;
      const locked = pathLocked(s, l.n); c.beginPath(); c.moveTo(l.p.x, l.p.y); c.quadraticCurveTo(l.cx, l.cy, l.n.x, l.n.y);
      c.strokeStyle = PATH_TINT[l.n.path].light; c.globalAlpha = locked ? L.pathLockedA : L.pathOpenA; c.lineWidth = locked ? 1.2 : 2;
      if (locked) c.setLineDash(L.pathDash); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    }
    // Bloom and light pools: cached, laid on additively, breathing slowly (steady under reduced motion)
    this.drawGlow(grown);
    // Wood body and its lit edge, then the hot core in the branch light
    c.strokeStyle = P.treeWood;
    for (const { l, g } of grown) { part(l, g); c.lineWidth = l.w; c.stroke(); }
    c.strokeStyle = P.treeWoodLit; c.globalAlpha = 0.6;
    for (const { l, g } of grown) { part(l, g); c.lineWidth = Math.max(1, l.w * 0.45); c.stroke(); }
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = L.coreA;
    for (const { l, g } of grown) { part(l, g); c.strokeStyle = lightOf(l.n); c.lineWidth = Math.max(L.coreMin, l.w * L.coreK); c.stroke(); }
    c.strokeStyle = P.lightHot; c.globalAlpha = 0.55;
    for (const { l, g } of grown) { part(l, g); c.lineWidth = Math.max(0.8, l.w * L.coreK * 0.4); c.stroke(); }
    if (!this.reducedMotion) { this.pulses(grown, t); this.motes(grown, t); this.bursts(dt); }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.lineCap = 'butt';
  }

  /** Bloom strokes and node light pools, rendered once into an offscreen layer per camera/size/owned-set and blitted additively. */
  private drawGlow(grown: { l: Link; g: number }[]): void {
    const c = this.g, W = this.canvas.width, H = this.canvas.height, z = this.cam.z * this.dpr;
    const key = `${W}x${H}|${this.cam.x.toFixed(2)},${this.cam.y.toFixed(2)},${z.toFixed(4)}|` + grown.map(({ l, g }) => l.n.id + (g < 1 ? g.toFixed(2) : '')).join(',');
    if (key !== this.glowKey) {
      this.glowKey = key;
      if (this.glow.width !== W || this.glow.height !== H) { this.glow.width = W; this.glow.height = H; }
      const o = this.glow.getContext('2d')!;
      o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H);
      o.setTransform(z, 0, 0, z, -this.cam.x * z, -this.cam.y * z); o.globalCompositeOperation = 'lighter'; o.lineCap = 'round';
      const owned = new Set<NodeId>(['root']);
      for (const { l, g } of grown) if (g >= 1) owned.add(l.n.id);
      for (const id of owned) {
        const n = NODE[id], r = L.poolR, gr = o.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
        gr.addColorStop(0, lightOf(n)); gr.addColorStop(1, P.glowClear);
        o.globalAlpha = L.poolA; o.fillStyle = gr; o.beginPath(); o.arc(n.x, n.y, r, 0, 6.283); o.fill();
      }
      for (const [extra, a] of L.bloom) {
        o.globalAlpha = a;
        for (const { l, g } of grown) {
          o.beginPath(); o.moveTo(l.p.x, l.p.y);
          o.quadraticCurveTo(l.p.x + (l.cx - l.p.x) * g, l.p.y + (l.cy - l.p.y) * g, at(l.p.x, l.cx, l.n.x, g), at(l.p.y, l.cy, l.n.y, g));
          o.strokeStyle = lightOf(l.n); o.lineWidth = l.w + extra; o.stroke();
        }
      }
    }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter';
    c.globalAlpha = this.reducedMotion ? 1 : 1 - L.breathDepth * (0.5 + 0.5 * Math.sin(performance.now() / 1000 * L.breathRate));
    c.drawImage(this.glow, 0, 0); c.restore();
  }

  /** Light pulses surging from the root outward: each owned link carries the head while it is at that link's depth. */
  private pulses(grown: { l: Link; g: number }[], t: number): void {
    const c = this.g, period = MAX_DEPTH + L.pulseGap, h = (t * L.pulseRate) % period;
    for (const { l, g } of grown) {
      const d = DEPTH.get(l.n.id)!, u = h - (d - 1); if (u < 0 || u >= 1 || u > g) continue;
      const x = at(l.p.x, l.cx, l.n.x, u), y = at(l.p.y, l.cy, l.n.y, u);
      c.fillStyle = lightOf(l.n); c.globalAlpha = 0.35; c.beginPath(); c.arc(x, y, L.pulseR + l.w * 0.5, 0, 6.283); c.fill();
      c.globalAlpha = 0.6; c.beginPath(); c.arc(x, y, L.pulseR * 0.45 + l.w * 0.3, 0, 6.283); c.fill();
      c.fillStyle = P.lightHot; c.globalAlpha = 0.95; c.beginPath(); c.arc(x, y, L.pulseCore + l.w * 0.15, 0, 6.283); c.fill();
    }
  }

  /** Motes drifting outward along owned links, swaying off the line and fading in and out. */
  private motes(grown: { l: Link; g: number }[], t: number): void {
    const c = this.g;
    for (const { l, g } of grown) {
      c.fillStyle = lightOf(l.n);
      for (let k = 0; k < L.motes; k++) {
        const u = ((t * L.moteSpeed + l.seed + k / L.motes) % 1) * g, a = Math.sin(u * Math.PI);
        const dx = l.n.x - l.p.x, dy = l.n.y - l.p.y, len = Math.hypot(dx, dy) || 1, sw = Math.sin(t * L.moteSwayRate + k * 2.1 + l.seed * 9) * L.moteSway;
        const x = at(l.p.x, l.cx, l.n.x, u) - (dy / len) * sw, y = at(l.p.y, l.cy, l.n.y, u) + (dx / len) * sw;
        c.globalAlpha = 0.25 * a; c.beginPath(); c.arc(x, y, L.moteR * 3, 0, 6.283); c.fill();
        c.globalAlpha = 0.9 * a; c.beginPath(); c.arc(x, y, L.moteR, 0, 6.283); c.fill();
      }
    }
  }

  /** On a buy, scatter light along every link from the root to the node bought. */
  private spawnBursts(s: SimState, first: boolean): void {
    for (const n of NODES) {
      const r = rankOf(s, n.id), was = this.ranks.get(n.id) ?? r; this.ranks.set(n.id, r);
      if (first || this.reducedMotion || r <= was) continue;
      for (let id: NodeId | null = n.id; id; id = NODE[id].parent) {
        const l = LINK_OF.get(id); if (!l) break;
        for (let k = 0; k < L.burstPer && this.burst.length < L.burstCap; k++) {
          const u = Math.random(), a = Math.random() * 6.283, v = L.burstSpeed * (0.3 + Math.random() * 0.7);
          this.burst.push({ x: at(l.p.x, l.cx, l.n.x, u), y: at(l.p.y, l.cy, l.n.y, u), vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: L.burstLife * (0.6 + Math.random() * 0.4), col: lightOf(n) });
        }
      }
    }
  }

  private bursts(dt: number): void {
    const c = this.g, drag = Math.exp(-L.burstDrag * dt);
    this.burst = this.burst.filter((m) => (m.life -= dt) > 0);
    for (const m of this.burst) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= drag; m.vy *= drag;
      const a = Math.min(1, m.life / L.burstLife * 1.5);
      c.fillStyle = m.col; c.globalAlpha = 0.3 * a; c.beginPath(); c.arc(m.x, m.y, L.burstR * 2.5, 0, 6.283); c.fill();
      c.fillStyle = P.lightHot; c.globalAlpha = a; c.beginPath(); c.arc(m.x, m.y, L.burstR * 0.6, 0, 6.283); c.fill();
    }
    if (this.burst.length) this.growing = true;
  }

  /** A small padlock on a node whose path is not this run's (TB-193c). */
  private lock(x: number, y: number, col: string): void {
    const c = this.g; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.6;
    c.beginPath(); c.arc(x, y - 2, 3.5, Math.PI, 0); c.stroke(); c.fillRect(x - 5, y - 2, 10, 7);
    c.fillStyle = P.ink; c.fillRect(x - 0.75, y, 1.5, 3);
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
    this.wood(s, t);
    c.globalAlpha = 1;
    const keyFocus = this.canvas.matches(':focus-visible');
    for (const n of NODES) {
      const lvl = rankOf(s, n.id), col = ringOf(n), un = unlocked(s, n), shut = pathLocked(s, n), maxed = lvl >= n.max, r = n.id === 'root' ? 16 : 13;
      c.beginPath(); c.arc(n.x, n.y, r, 0, 6.28);
      c.fillStyle = maxed ? col : lvl > 0 ? P.nodeOwned : P.ink; c.fill();
      c.lineWidth = n.id === this.selected ? 3 : 2; c.strokeStyle = un ? col : shut ? PATH_TINT[n.path!].deep : P.line; c.stroke();
      if (shut) this.lock(n.x, n.y, PATH_TINT[n.path!].colour);
      if (lvl > 0 && !maxed) { c.beginPath(); c.arc(n.x, n.y, r, -1.571, -1.571 + (6.283 * lvl) / n.max); c.strokeStyle = col; c.lineWidth = 4; c.stroke(); }
      if (canBuy(s, n)) { c.beginPath(); c.arc(n.x, n.y, r + 5, 0, 6.28); c.strokeStyle = P.amber; c.lineWidth = 1; c.globalAlpha = this.reducedMotion ? 0.8 : 0.5 + 0.5 * Math.sin(t * 4); c.stroke(); c.globalAlpha = 1; }
      if (keyFocus && n.id === this.selected) { c.beginPath(); c.arc(n.x, n.y, r + 9, 0, 6.28); c.strokeStyle = P.cream; c.lineWidth = 2; c.setLineDash([4, 3]); c.stroke(); c.setLineDash([]); }
      c.fillStyle = un ? P.text : P.nodeLabelLocked; c.font = '14px Heartwood'; c.textAlign = 'center'; c.shadowColor = P.ink; c.shadowBlur = 4; c.fillText(n.name, n.x, n.y + r + 15); c.shadowBlur = 0;
      if (n.max > 1 && !shut) { c.fillStyle = maxed ? P.ink : P.text; c.font = '14px Heartwood'; c.fillText(`${lvl}/${n.max}`, n.x, n.y + 4); }
    }
    c.setTransform(k, 0, 0, k, 0, 0); // legend stays in screen space, on its own strip so nodes pan under it, not through it (TB-117)
    c.fillStyle = P.ink2; c.fillRect(0, 0, this.vw, TREE_VIEW.legendH); c.fillStyle = P.line; c.fillRect(0, TREE_VIEW.legendH - 1, this.vw, 1);
    let lx = 14; c.font = '14px Heartwood'; c.textAlign = 'left';
    for (const k of Object.keys(BRANCH_COLOR) as (keyof typeof BRANCH_COLOR)[]) { c.fillStyle = BRANCH_COLOR[k]; c.fillRect(lx, 14, 8, 8); c.fillStyle = P.textDim; const label = BRANCH_LABEL[k].toUpperCase(); c.fillText(label, lx + 12, 22); lx += c.measureText(label).width + 30; }
  }
}
