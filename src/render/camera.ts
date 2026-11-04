/** 2D pan/zoom camera: screen = (world − origin) · z. Pure; the tree renderer owns one. */
import { TREE_CANVAS, TREE_VIEW } from '../data/skillTree';

export interface Camera { x: number; y: number; z: number }

/** World px the camera may pan past each tree edge so the outermost labels stay whole in the pane. TREE_VIEW.edgePad until the renderer
 *  measures the real labels (setLabelPads), so the pure camera and its tests need no canvas. */
export interface LabelPads { l: number; r: number; b: number }
let pads: LabelPads = { l: TREE_VIEW.edgePad, r: TREE_VIEW.edgePad, b: TREE_VIEW.edgePad };
export const setLabelPads = (p: LabelPads): void => { pads = p; };
export const labelPads = (): LabelPads => pads;

export const toWorld = (c: Camera, sx: number, sy: number): [number, number] => [c.x + sx / c.z, c.y + sy / c.z];

/** Opening view: at least TREE_VIEW.startZoom world px per screen px, centred on the root, so labels stay readable in a narrow panel. */
export function startCamera(vw: number, vh: number): Camera {
  const z = Math.max(vw / TREE_CANVAS.w, TREE_VIEW.startZoom);
  return clampCamera({ x: TREE_VIEW.focusX - vw / z / 2, y: TREE_VIEW.focusY - vh / z / 2, z }, vw, vh);
}

/** A node's drawn footprint in world px: half-width (the wider of disc and label), extent above the centre (disc) and below it (disc + label). */
export interface Foot { x: number; y: number; hw: number; up: number; down: number }

/** Opening view for a touch screen: the start framing nudged (within `reach` world px) so no node disc or label straddles the pane edge or the legend strip,
 *  which would leave a half label or a node sliced by the strip; fewest straddlers wins, then the least move from the plain start, root always whole (TB-218 r10). */
export function startCameraFit(vw: number, vh: number, feet: Foot[], margin: number, reach = 240, step = 8): Camera {
  const base = startCamera(vw, vh), z = base.z, rootFoot = feet.find((f) => f.x === TREE_VIEW.focusX && f.y === TREE_VIEW.focusY);
  const lx = margin, rx = vw - margin, ty = TREE_VIEW.legendH + 4, by = vh - margin;
  let best = base, bestScore = Infinity;
  for (let dy = -reach; dy <= reach; dy += step) for (let dx = -reach; dx <= reach; dx += step) {
    const c = clampCamera({ x: base.x + dx, y: base.y + dy, z }, vw, vh);
    let bad = 0;
    for (const f of feet) {
      const x0 = (f.x - f.hw - c.x) * z, x1 = (f.x + f.hw - c.x) * z, y0 = (f.y - f.up - c.y) * z, y1 = (f.y + f.down - c.y) * z;
      if (x1 <= 0 || x0 >= vw || y1 <= 0 || y0 >= vh) continue;                 // wholly off the pane: nothing to cut
      const w = f === rootFoot ? 50 : 1;   // a node under the legend strip is lost entirely, a node on a side edge is only trimmed: the strip weighs 3
      if (y0 < ty && y1 > 0) bad += 3 * w; else if (x0 < lx || x1 > rx || y0 < ty || y1 > by) bad += w;
    }
    const score = bad * 1e6 + Math.hypot(c.x - base.x, c.y - base.y) * z;
    if (score < bestScore) { bestScore = score; best = c; }
  }
  return best;
}

/** Fit the tree's width to the viewport; a tree shorter than the view is centred. */
export function fitCamera(vw: number, vh: number): Camera {
  return clampCamera({ x: 0, y: 0, z: vw / TREE_CANVAS.w }, vw, vh);
}

/** Zoom that shows the whole tree, width and height, below the legend strip (full-screen view, TB-189). */
export const wholeZoom = (vw: number, vh: number): number =>
  Math.min(vw / TREE_CANVAS.w, (vh - TREE_VIEW.legendH) / TREE_CANVAS.h) * TREE_VIEW.wholeMargin;

/** Every node at once: the whole tree centred in the view below the legend (TB-189). Fixed for a mouse; a touch screen may pinch in and pan (floor = this zoom). */
export function wholeCamera(vw: number, vh: number): Camera {
  const z = wholeZoom(vw, vh), top = TREE_VIEW.legendH / z;
  return { x: -(vw / z - TREE_CANVAS.w) / 2, y: -top - (vh / z - top - TREE_CANVAS.h) / 2, z };
}

/** Keep zoom in range relative to fit, and keep the tree from leaving the viewport or rising under the legend strip. */
export function clampCamera(c: Camera, vw: number, vh: number, floor?: number): Camera {
  const fit = vw / TREE_CANVAS.w;
  const z = Math.min(fit * TREE_VIEW.maxZoom, Math.max(floor ?? fit * TREE_VIEW.minZoom, c.z));
  const top = TREE_VIEW.legendH / z, ax = (vw / z - TREE_CANVAS.w), ay = (vh / z - top - TREE_CANVAS.h);
  // When the tree is smaller than the view on an axis, centre it (vertically, in the space below the legend); otherwise allow panning to each edge plus the label pad.
  // pan a little past the tree so the labels on the outermost nodes are not cut by the pane edge (TB-218)
  const x = ax >= 0 ? -ax / 2 : Math.min(-ax + pads.r, Math.max(-pads.l, c.x));
  const y = ay >= 0 ? -top - ay / 2 : Math.min(TREE_CANVAS.h - vh / z + pads.b, Math.max(-top, c.y));
  return { x, y, z };
}

/** Zoom by factor k keeping the world point under (sx, sy) fixed. */
export function zoomAt(c: Camera, sx: number, sy: number, k: number, vw: number, vh: number, floor?: number): Camera {
  const [wx, wy] = toWorld(c, sx, sy);
  const z = c.z * k;
  return clampCamera({ x: wx - sx / z, y: wy - sy / z, z }, vw, vh, floor);
}

/** Camera at the same zoom with world point (wx, wy) in the centre of the view (clamped). */
export function centreOn(c: Camera, wx: number, wy: number, vw: number, vh: number, floor?: number): Camera {
  return clampCamera({ x: wx - vw / c.z / 2, y: wy - vh / c.z / 2, z: c.z }, vw, vh, floor);
}

/** Move fraction k of the way from c to target. */
export function easeToward(c: Camera, target: Camera, k: number): Camera {
  return { x: c.x + (target.x - c.x) * k, y: c.y + (target.y - c.y) * k, z: c.z + (target.z - c.z) * k };
}

export function panBy(c: Camera, dx: number, dy: number, vw: number, vh: number, floor?: number): Camera {
  return clampCamera({ x: c.x - dx / c.z, y: c.y - dy / c.z, z: c.z }, vw, vh, floor);
}
