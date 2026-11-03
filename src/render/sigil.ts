/** Path sigils (TB-193c, TB-193h): flat emblems seen straight on, drawn as vector marks on the Replant cards. Even fill,
 *  no perspective, no side light, the symbol centred in its disc (director, 3 Nov: the Meshy medallions read as tilted
 *  coins, so they are no longer drawn). Palette tokens only. Drawn in a 100×100 box scaled to the canvas. */
import type { PathId } from '../data/paths';
import { P, PATH_TINT } from './palette';

type G = CanvasRenderingContext2D;
type Tint = (typeof PATH_TINT)['serpent'];
/** Backing pixels of a sigil canvas: crisp at the card's 4.5rem up to 4K. */
const SIGIL_PX = 192;

const serpent = (c: G, t: Tint): void => {
  // an S-coil in one flat colour, the head at the top right, centred on the disc
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(32, 76); c.bezierCurveTo(10, 66, 24, 46, 50, 50); c.bezierCurveTo(76, 54, 90, 34, 64, 26);
  c.strokeStyle = t.colour; c.lineWidth = 11; c.stroke();
  c.beginPath(); c.ellipse(60, 26, 11, 8, -0.3, 0, 6.283); c.fillStyle = t.colour; c.fill();
  c.beginPath(); c.arc(58, 23, 2.2, 0, 6.283); c.fillStyle = P.ink; c.fill();
  c.beginPath(); c.moveTo(49, 29); c.lineTo(41, 33); c.moveTo(45, 31); c.lineTo(41, 27); c.strokeStyle = t.colour; c.lineWidth = 2; c.stroke();
};

const fox = (c: G, t: Tint): void => {
  // a fox mask face-on: two tall ears, broad cheeks narrowing to the snout, pale cheek ruffs
  c.lineJoin = 'round';
  c.beginPath(); c.moveTo(22, 18); c.lineTo(40, 36); c.lineTo(60, 36); c.lineTo(78, 18); c.lineTo(82, 48); c.lineTo(50, 82); c.lineTo(18, 48); c.closePath();
  c.fillStyle = t.colour; c.fill();
  c.beginPath(); c.moveTo(27, 26); c.lineTo(37, 38); c.lineTo(28, 42); c.closePath(); c.moveTo(73, 26); c.lineTo(63, 38); c.lineTo(72, 42); c.closePath(); c.fillStyle = t.deep; c.fill();
  c.beginPath(); c.moveTo(18, 48); c.lineTo(36, 56); c.lineTo(50, 82); c.closePath(); c.moveTo(82, 48); c.lineTo(64, 56); c.lineTo(50, 82); c.closePath(); c.fillStyle = t.pale; c.fill();
  c.beginPath(); c.ellipse(39, 50, 4, 2.4, 0.4, 0, 6.283); c.ellipse(61, 50, 4, 2.4, -0.4, 0, 6.283); c.fillStyle = P.ink; c.fill();
  c.beginPath(); c.arc(50, 78, 3.5, 0, 6.283); c.fillStyle = P.ink; c.fill();
};

const magpie = (c: G, t: Tint): void => {
  // a perched magpie silhouette: wedge tail, white belly patch, the gleam it has stolen; centred on the disc
  c.lineJoin = 'round';
  c.beginPath(); c.moveTo(42, 58); c.lineTo(16, 84); c.lineTo(24, 86); c.lineTo(52, 66); c.closePath(); c.fillStyle = t.colour; c.fill();
  c.beginPath(); c.ellipse(52, 52, 20, 14, -0.5, 0, 6.283); c.fillStyle = t.colour; c.fill();
  c.beginPath(); c.ellipse(58, 58, 10, 7, -0.5, 0, 6.283); c.fillStyle = t.pale; c.fill();
  c.beginPath(); c.arc(67, 34, 10, 0, 6.283); c.fillStyle = t.colour; c.fill();
  c.beginPath(); c.moveTo(76, 32); c.lineTo(87, 35); c.lineTo(76, 38); c.closePath(); c.fill();
  c.beginPath(); c.arc(69, 32, 2, 0, 6.283); c.fillStyle = P.ink; c.fill();
  c.beginPath(); c.moveTo(58, 66); c.lineTo(56, 76); c.moveTo(64, 64); c.lineTo(64, 76); c.strokeStyle = t.colour; c.lineWidth = 2.4; c.stroke();
  const gx = 82, gy = 16, r = 7; c.beginPath(); c.moveTo(gx, gy - r); c.lineTo(gx + 2, gy - 2); c.lineTo(gx + r, gy); c.lineTo(gx + 2, gy + 2); c.lineTo(gx, gy + r); c.lineTo(gx - 2, gy + 2); c.lineTo(gx - r, gy); c.lineTo(gx - 2, gy - 2); c.closePath();
  c.fillStyle = P.starGold; c.fill();
};

/** Draw a path's sigil filling the canvas: a flat ink disc, one even ring in the path colour, the flat mark centred;
 *  the chosen path's ring is lit and glows. */
export function drawSigil(cv: HTMLCanvasElement, path: PathId, lit: boolean): void {
  // a fixed backing size, so a card drawn while its tab is hidden (no layout yet) is still sharp when shown
  const w = SIGIL_PX, h = SIGIL_PX;
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext('2d'); if (!c) return;
  const k = Math.min(w, h) / 100, t = PATH_TINT[path];
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
  c.setTransform(k, 0, 0, k, (w - 100 * k) / 2, (h - 100 * k) / 2);
  c.beginPath(); c.arc(50, 50, 45, 0, 6.283); c.fillStyle = P.ink; c.fill();
  c.lineWidth = 3; c.strokeStyle = lit ? t.light : t.deep;
  if (lit) { c.shadowColor = t.light; c.shadowBlur = 10 * k; }
  c.stroke(); c.shadowColor = P.noShadow; c.shadowBlur = 0;
  c.save(); c.beginPath(); c.arc(50, 50, 43, 0, 6.283); c.clip();
  if (path === 'serpent') serpent(c, PATH_TINT.serpent); else if (path === 'fox') fox(c, PATH_TINT.fox); else magpie(c, PATH_TINT.magpie);
  c.restore();
}
