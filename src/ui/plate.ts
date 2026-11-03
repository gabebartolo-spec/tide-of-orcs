/** Tooltip plates (TB-195c, docs/plans/game-ui.md §2): a carved plate follows the cursor over a tree node and shows what the
 *  next rank changes as big *now → next* numbers, the cost as a gem chip and one line of flavour. Reads state; never mutates it. */
import { PLATE } from '../data/presentation';
import { STR } from '../data/strings';
import { fmt } from './format';
import { calm, pop } from './juice';

export type StatKind = 'pct' | 'x' | 'flag' | 'num' | 'secs';
export interface PlateRow { label: string; now: string; next: string; up: boolean }

/** Flatten a Stats-like object to dotted numeric leaves (booleans become 0/1, null 0, strings are skipped). */
export function flatten(o: unknown, pre = '', out: Record<string, number> = {}): Record<string, number> {
  if (o === null || o === undefined) { if (pre) out[pre] = 0; return out; }
  if (typeof o === 'number') out[pre] = o;
  else if (typeof o === 'boolean') out[pre] = o ? 1 : 0;
  else if (typeof o === 'object') for (const [k, v] of Object.entries(o)) flatten(v, pre ? `${pre}.${k}` : k, out);
  return out;
}

/** A stat value as the plate shows it. */
export function showStat(v: number, kind: StatKind): string {
  if (kind === 'flag') return v ? STR.plateOn : STR.plateOff;
  if (kind === 'pct') return `${Math.round(v * 100)}%`;
  if (kind === 'x') return `×${trim(v)}`;
  if (kind === 'secs') return `${trim(v)}s`;
  return v >= 1000 ? fmt(v) : trim(v);
}
const trim = (v: number): string => (v >= 100 ? Math.round(v).toString() : v >= 10 ? (+v.toFixed(1)).toString() : (+v.toFixed(2)).toString());

/** The labelled stats that differ between now and next, in STR.plateStats order, at most PLATE.rows. `up` is the good direction. */
export function plateRows(now: unknown, next: unknown): PlateRow[] {
  const a = flatten(now), b = flatten(next), rows: PlateRow[] = [];
  for (const [key, label, kind, lower] of STR.plateStats) {
    const x = a[key], y = b[key];
    if (x === undefined || y === undefined || Math.abs(x - y) < 1e-9) continue;
    rows.push({ label, now: showStat(x, kind), next: showStat(y, kind), up: lower ? y < x : y > x });
    if (rows.length >= PLATE.rows) break;
  }
  return rows;
}

/** The first sentence of a node's description: the plate's one line of flavour. */
export const oneLine = (desc: string): string => desc.split(/(?<=\.)\s/)[0] ?? desc;

/** Where the plate goes: PLATE.gap to the right of and below the cursor, flipped left or up to stay inside the view. */
export function placePlate(cx: number, cy: number, w: number, h: number, vw: number, vh: number, gap: number): { x: number; y: number } {
  let x = cx + gap, y = cy + gap;
  if (x + w > vw - gap) x = cx - gap - w;
  if (y + h > vh - gap) y = cy - gap - h;
  return { x: Math.max(gap, x), y: Math.max(gap, y) };
}

/** The one floating plate. show() fills and places it next to the cursor (a new subject springs in); hide() drops it. */
export class Plate {
  readonly el: HTMLElement;
  private key = '';
  constructor() { this.el = document.createElement('div'); this.el.className = 'plate'; this.el.hidden = true; this.el.setAttribute('role', 'tooltip'); document.body.appendChild(this.el); }
  show(key: string, html: string, cx: number, cy: number): void {
    if (key !== this.key) { this.el.innerHTML = html; this.key = key; this.el.hidden = false; if (!calm()) pop(this.el); }
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, r = this.el.getBoundingClientRect();
    const p = placePlate(cx, cy, r.width, r.height, innerWidth, innerHeight, PLATE.gap * rem);
    this.el.style.left = `${p.x}px`; this.el.style.top = `${p.y}px`;
  }
  hide(): void { this.el.hidden = true; this.key = ''; }
}