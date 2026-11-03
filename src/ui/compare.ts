/** Satchel compare plates (TB-195e, docs/plans/game-ui.md §2): hovering a satchel item shows two carved plates side by side,
 *  the hovered item and what is worn in its slot, with the power difference. Pure helpers plus one floating pair; reads only. */
import { Item, Slot } from '../data/loot';
import { SATCHEL_UI } from '../data/presentation';
import { STR } from '../data/strings';
import { itemScore } from '../sim/loot';
import { calm, pop } from './juice';
import { placePlate } from './plate';

export interface CmpSide { name: string; rarity: string; sub: string; lines: string[]; more: number }

/** Power difference shown on the plates, the same rounding as the detail card's "Against worn" line. */
export const powerDelta = (it: Item, worn?: Item): number => (worn ? Math.round((itemScore(it) - itemScore(worn)) * 100) : Math.round(itemScore(it) * 100));

/** One plate's content: name, rarity · slot, the first SATCHEL_UI.lines affix lines and how many more are hidden. */
export function cmpSide(it: Item, name: string, line: (a: Item['affixes'][number]) => string): CmpSide {
  const all = it.affixes.map(line);
  return { name, rarity: it.rarity, sub: `${STR.rarityName[it.rarity] ?? it.rarity} · ${STR.slotName[it.slot] ?? it.slot}`, lines: all.slice(0, SATCHEL_UI.lines), more: Math.max(0, all.length - SATCHEL_UI.lines) };
}

/** A dragged item may drop on a worn pocket only when the slots match. */
export const dropOk = (itemSlot: Slot | undefined, pocket: Slot | undefined): boolean => !!itemSlot && itemSlot === pocket;

const side = (k: string, s: CmpSide | null, delta?: number): string => s
  ? `<div class="plate cmp r-${s.rarity}"><div class="pk">${k}</div><div class="nm">${s.name}</div><div class="rk">${s.sub}</div>
     <ul>${s.lines.map((l) => `<li>${l}</li>`).join('')}${s.more ? `<li class="rk">+${s.more}</li>` : ''}</ul>${delta === undefined ? '' : `<div class="dv ${delta >= 0 ? 'up' : 'down'}">${STR.cmpPower(delta)}</div>`}</div>`
  : `<div class="plate cmp"><div class="pk">${k}</div><div class="rk">${STR.cmpNone}</div></div>`;

/** The floating pair, appended to body (a pane's spring-in transform must not re-anchor it). */
export class ComparePlates {
  readonly el: HTMLElement;
  private key = '';
  constructor() { this.el = document.createElement('div'); this.el.className = 'plate-pair'; this.el.hidden = true; this.el.setAttribute('role', 'tooltip'); document.body.appendChild(this.el); }
  show(key: string, hover: CmpSide, worn: CmpSide | null, delta: number, cx: number, cy: number): void {
    if (key !== this.key) { this.el.innerHTML = side(STR.cmpHover, hover, delta) + side(STR.cmpWorn, worn); this.key = key; this.el.hidden = false; if (!calm()) pop(this.el); }
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, r = this.el.getBoundingClientRect();
    const p = placePlate(cx, cy, r.width, r.height, innerWidth, innerHeight, SATCHEL_UI.gap * rem);
    this.el.style.left = `${p.x}px`; this.el.style.top = `${p.y}px`;
  }
  hide(): void { this.el.hidden = true; this.key = ''; }
}
