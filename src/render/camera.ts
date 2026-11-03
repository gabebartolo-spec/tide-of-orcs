/** 2D pan/zoom camera: screen = (world − origin) · z. Pure; the tree renderer owns one. */
import { TREE_CANVAS, TREE_VIEW } from '../data/skillTree';

export interface Camera { x: number; y: number; z: number }

export const toWorld = (c: Camera, sx: number, sy: number): [number, number] => [c.x + sx / c.z, c.y + sy / c.z];

/** Opening view: at least TREE_VIEW.startZoom world px per screen px, centred on the root, so labels stay readable in a narrow panel. */
export function startCamera(vw: number, vh: number): Camera {
  const z = Math.max(vw / TREE_CANVAS.w, TREE_VIEW.startZoom);
  return clampCamera({ x: TREE_VIEW.focusX - vw / z / 2, y: TREE_VIEW.focusY - vh / z / 2, z }, vw, vh);
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
  // When the tree is smaller than the view on an axis, centre it (vertically, in the space below the legend); otherwise allow panning to each edge.
  const x = ax >= 0 ? -ax / 2 : Math.min(-ax, Math.max(0, c.x));
  const y = ay >= 0 ? -top - ay / 2 : Math.min(TREE_CANVAS.h - vh / z, Math.max(-top, c.y));
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
