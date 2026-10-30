/** 2D pan/zoom camera: screen = (world − origin) · z. Pure; the tree renderer owns one. */
import { TREE_CANVAS, TREE_VIEW } from '../data/skillTree';

export interface Camera { x: number; y: number; z: number }

export const toWorld = (c: Camera, sx: number, sy: number): [number, number] => [c.x + sx / c.z, c.y + sy / c.z];

/** Fit the tree's width to the viewport; a tree shorter than the view is centred. */
export function fitCamera(vw: number, vh: number): Camera {
  return clampCamera({ x: 0, y: 0, z: vw / TREE_CANVAS.w }, vw, vh);
}

/** Keep zoom in range relative to fit, and keep the tree from leaving the viewport. */
export function clampCamera(c: Camera, vw: number, vh: number): Camera {
  const fit = vw / TREE_CANVAS.w;
  const z = Math.min(fit * TREE_VIEW.maxZoom, Math.max(fit * TREE_VIEW.minZoom, c.z));
  const ax = (vw / z - TREE_CANVAS.w), ay = (vh / z - TREE_CANVAS.h);
  // When the tree is smaller than the view on an axis, centre it; otherwise allow panning to each edge.
  const x = ax >= 0 ? -ax / 2 : Math.min(-ax, Math.max(0, c.x));
  const y = ay >= 0 ? -ay / 2 : Math.min(-ay, Math.max(0, c.y));
  return { x, y, z };
}

/** Zoom by factor k keeping the world point under (sx, sy) fixed. */
export function zoomAt(c: Camera, sx: number, sy: number, k: number, vw: number, vh: number): Camera {
  const [wx, wy] = toWorld(c, sx, sy);
  const z = c.z * k;
  return clampCamera({ x: wx - sx / z, y: wy - sy / z, z }, vw, vh);
}

export function panBy(c: Camera, dx: number, dy: number, vw: number, vh: number): Camera {
  return clampCamera({ x: c.x - dx / c.z, y: c.y - dy / c.z, z: c.z }, vw, vh);
}
