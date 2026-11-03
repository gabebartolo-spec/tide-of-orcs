/** Path sigils (TB-193c, TB-193e): the Meshy sigil pictures (public/sigils/) on the Replant cards, with the vector
 *  marks below as the fallback until a picture loads. Palette tokens only. Drawn in a 100×100 box scaled to the canvas. */
import type { PathId } from '../data/paths';
import { P, PATH_TINT } from './palette';
import { pathSigilFile } from '../data/pathArt';

/** Meshy sigil pictures (TB-193e), loaded once; a path missing here (not loaded yet, or failed) draws its vector mark. */
const pics = new Map<PathId, HTMLImageElement>();
const loading = new Set<PathId>();
const waiting = new Map<PathId, Set<[HTMLCanvasElement, boolean]>>();
const want = (path: PathId, cv: HTMLCanvasElement, lit: boolean): void => {
  if (pics.has(path) || typeof Image === 'undefined') return;
  let w = waiting.get(path); if (!w) waiting.set(path, (w = new Set())); w.add([cv, lit]);
  if (loading.has(path)) return; loading.add(path);
  const im = new Image();
  im.onload = (): void => { pics.set(path, im); for (const [c, l] of waiting.get(path) ?? []) if (c.isConnected) drawSigil(c, path, l); waiting.delete(path); };
  im.onerror = (): void => { waiting.delete(path); };
  im.src = `${pathSigilFile(path)}`;
};

type G = CanvasRenderingContext2D;
/** Backing pixels of a sigil canvas: crisp at the card's 4.25rem up to 4K. */
const SIGIL_PX = 192;

const serpent = (c: G, t: (typeof PATH_TINT)['serpent']): void => {
  // an S-coil, thick body in shade with a lit spine, the head at the top with a forked tongue
  const body = (): void => { c.beginPath(); c.moveTo(34, 80); c.bezierCurveTo(10, 70, 22, 46, 50, 50); c.bezierCurveTo(78, 54, 90, 30, 62, 22); };
  c.lineCap = 'round'; body(); c.strokeStyle = t.deep; c.lineWidth = 14; c.stroke();
  body(); c.strokeStyle = t.colour; c.lineWidth = 7; c.stroke();
  body(); c.strokeStyle = t.pale; c.lineWidth = 1.6; c.setLineDash([3, 5]); c.stroke(); c.setLineDash([]);
  c.beginPath(); c.ellipse(57, 23, 11, 8, -0.35, 0, 6.283); c.fillStyle = t.colour; c.fill(); c.strokeStyle = t.deep; c.lineWidth = 2; c.stroke();
  c.beginPath(); c.arc(54, 20, 2, 0, 6.283); c.fillStyle = P.ink; c.fill();
  c.beginPath(); c.moveTo(47, 27); c.lineTo(38, 31); c.moveTo(42, 29); c.lineTo(37, 26); c.strokeStyle = t.light; c.lineWidth = 1.8; c.stroke();
  c.beginPath(); c.arc(34, 80, 4, 0, 6.283); c.fillStyle = t.deep; c.fill();
};

const fox = (c: G, t: (typeof PATH_TINT)['fox']): void => {
  // a fox mask: two tall ears, broad cheeks narrowing to the snout, pale cheek ruffs
  c.lineJoin = 'round';
  c.beginPath(); c.moveTo(22, 20); c.lineTo(40, 38); c.lineTo(60, 38); c.lineTo(78, 20); c.lineTo(82, 50); c.lineTo(50, 84); c.lineTo(18, 50); c.closePath();
  c.fillStyle = t.colour; c.fill(); c.strokeStyle = t.deep; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.moveTo(27, 28); c.lineTo(37, 40); c.lineTo(28, 44); c.closePath(); c.moveTo(73, 28); c.lineTo(63, 40); c.lineTo(72, 44); c.closePath(); c.fillStyle = t.deep; c.fill();
  c.beginPath(); c.moveTo(18, 50); c.lineTo(36, 58); c.lineTo(50, 84); c.closePath(); c.moveTo(82, 50); c.lineTo(64, 58); c.lineTo(50, 84); c.closePath(); c.fillStyle = t.pale; c.fill();
  c.beginPath(); c.ellipse(39, 52, 4, 2.4, 0.4, 0, 6.283); c.ellipse(61, 52, 4, 2.4, -0.4, 0, 6.283); c.fillStyle = P.ink; c.fill();
  c.beginPath(); c.arc(50, 80, 3.5, 0, 6.283); c.fillStyle = P.ink; c.fill();
  c.beginPath(); c.moveTo(40, 38); c.lineTo(50, 46); c.lineTo(60, 38); c.strokeStyle = t.light; c.lineWidth = 1.6; c.stroke();
};

const magpie = (c: G, t: (typeof PATH_TINT)['magpie']): void => {
  // a perched magpie in profile: long wedge tail, white belly, an iridescent wing edge, a gleam it has stolen
  c.lineJoin = 'round';
  c.beginPath(); c.moveTo(44, 58); c.lineTo(14, 86); c.lineTo(22, 88); c.lineTo(54, 66); c.closePath(); c.fillStyle = t.deep; c.fill(); c.strokeStyle = t.light; c.lineWidth = 1.4; c.stroke();
  c.beginPath(); c.ellipse(54, 52, 20, 14, -0.5, 0, 6.283); c.fillStyle = t.deep; c.fill();
  c.beginPath(); c.ellipse(60, 58, 11, 8, -0.5, 0, 6.283); c.fillStyle = t.pale; c.fill();
  c.beginPath(); c.moveTo(38, 56); c.quadraticCurveTo(50, 40, 64, 46); c.strokeStyle = t.light; c.lineWidth = 3; c.lineCap = 'round'; c.stroke();
  c.beginPath(); c.arc(70, 34, 10, 0, 6.283); c.fillStyle = t.deep; c.fill();
  c.beginPath(); c.moveTo(79, 32); c.lineTo(90, 35); c.lineTo(79, 38); c.closePath(); c.fillStyle = t.colour; c.fill();
  c.beginPath(); c.arc(72, 32, 2, 0, 6.283); c.fillStyle = t.pale; c.fill();
  c.beginPath(); c.moveTo(60, 66); c.lineTo(58, 76); c.moveTo(66, 64); c.lineTo(66, 76); c.strokeStyle = t.colour; c.lineWidth = 2; c.stroke();
  const gx = 84, gy = 16, r = 7; c.beginPath(); c.moveTo(gx, gy - r); c.lineTo(gx + 2, gy - 2); c.lineTo(gx + r, gy); c.lineTo(gx + 2, gy + 2); c.lineTo(gx, gy + r); c.lineTo(gx - 2, gy + 2); c.lineTo(gx - r, gy); c.lineTo(gx - 2, gy - 2); c.closePath();
  c.fillStyle = P.starGold; c.fill();
};

/** Draw a path's sigil filling the canvas: a carved ring, the mark, and a glow when lit (the chosen path). */
export function drawSigil(cv: HTMLCanvasElement, path: PathId, lit: boolean): void {
  // a fixed backing size, so a card drawn while its tab is hidden (no layout yet) is still sharp when shown
  const w = SIGIL_PX, h = SIGIL_PX;
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext('2d'); if (!c) return;
  const k = Math.min(w, h) / 100, t = PATH_TINT[path];
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
  c.setTransform(k, 0, 0, k, (w - 100 * k) / 2, (h - 100 * k) / 2);
  c.beginPath(); c.arc(50, 50, 46, 0, 6.283); c.fillStyle = P.ink; c.fill();
  c.lineWidth = 3; c.strokeStyle = lit ? t.light : t.deep; c.shadowColor = lit ? t.light : P.noShadow; c.shadowBlur = lit ? 10 * k : 0; c.stroke();
  c.shadowColor = P.noShadow; c.shadowBlur = 0;
  c.beginPath(); c.arc(50, 50, 41, 0, 6.283); c.lineWidth = 1; c.strokeStyle = P.timberDark; c.stroke();
  c.save(); c.beginPath(); c.arc(50, 50, 44, 0, 6.283); c.clip();
  if (lit) { c.shadowColor = t.light; c.shadowBlur = 6 * k; }
  const pic = pics.get(path);
  if (pic) c.drawImage(pic, 8, 8, 84, 84);
  else { want(path, cv, lit); if (path === 'serpent') serpent(c, PATH_TINT.serpent); else if (path === 'fox') fox(c, PATH_TINT.fox); else magpie(c, PATH_TINT.magpie); }
  c.restore();
}
