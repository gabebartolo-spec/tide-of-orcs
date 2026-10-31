/** Satchel tab (TB-095): the six worn slots, the satchel grid, and the selected item compared with what is worn. */
import { Item, SLOTS } from '../data/loot';
import { AFFIXES, BASES, MYTHICS, SATCHEL, SETS } from '../data/lootTables';
import { STR } from '../data/strings';
import { GameController } from '../game';
import { itemScore } from '../sim/loot';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

export const itemName = (it: Item): string => {
  if (it.mythic) return MYTHICS.find((m) => m.id === it.mythic)?.name ?? it.mythic;
  const base = BASES.find((b) => b.id === it.base)?.name ?? it.base;
  const set = it.set ? SETS.find((s) => s.id === it.set)?.name : null;
  return set ? `${set} ${base}` : base;
};

export const affixText = (a: Item['affixes'][number]): string => {
  const d = AFFIXES.find((x) => x.id === a.id);
  if (!d) return a.id;
  const v = d.op === 'mul' || d.stat === 'crit' || d.stat === 'itemFind' || d.stat === 'luck' ? `+${(a.value * 100).toFixed(1)}%` : `+${a.value.toFixed(2)}`;
  return `${v} ${STR.statName[d.stat] ?? d.stat}`;
};

export class SatchelPane {
  selected: string | null = null;
  private sig = '';

  constructor(private game: GameController) {
    $('sat-title').textContent = STR.satchelTitle; $('sat-worn-k').textContent = STR.satchelWorn;
    const pick = (e: Event) => { const uid = (e.target as HTMLElement).closest<HTMLElement>('[data-uid]')?.dataset.uid; if (uid) { this.selected = uid; this.render(); } };
    $('sat-worn').onclick = pick; $('sat-grid').onclick = pick;
  }

  private get loot() { return this.game.state.meta.loot; }

  /** Cheap: re-renders only when the satchel, worn set or selection changed. Called ~6 Hz. */
  update(): void {
    const l = this.loot, sig = `${l.items.length}|${l.nextUid}|${JSON.stringify(l.equipped)}|${l.glimmer}|${this.selected}`;
    if (sig !== this.sig) this.render();
  }

  render(): void {
    const l = this.loot, worn = new Set(Object.values(l.equipped));
    this.sig = `${l.items.length}|${l.nextUid}|${JSON.stringify(l.equipped)}|${l.glimmer}|${this.selected}`;
    const cell = (it: Item | undefined, label = '') => it
      ? `<button class="item r-${it.rarity}${it.uid === this.selected ? ' sel' : ''}" data-uid="${it.uid}" title="${itemName(it)}"><span class="slot">${label}</span><span class="nm">${itemName(it)}</span></button>`
      : `<div class="item empty"><span class="slot">${label}</span></div>`;
    $('sat-worn').innerHTML = SLOTS.map((s) => cell(l.items.find((i) => i.uid === l.equipped[s]), STR.slotName[s])).join('');
    const spare = l.items.filter((i) => !worn.has(i.uid));
    $('sat-count').textContent = STR.satchelCount(spare.length, SATCHEL.base, l.glimmer);
    $('sat-grid').innerHTML = spare.length ? spare.map((i) => cell(i, STR.slotName[i.slot])).join('') : `<div class="desc">${STR.satchelEmpty}</div>`;
    this.renderDetail();
  }

  private renderDetail(): void {
    const l = this.loot, it = l.items.find((i) => i.uid === this.selected);
    if (!it) { $('sat-detail').innerHTML = `<div class="desc">${STR.satchelPick}</div>`; return; }
    const cur = l.items.find((i) => i.uid === l.equipped[it.slot]);
    const myth = it.mythic ? MYTHICS.find((m) => m.id === it.mythic) : null;
    const lines = it.affixes.map((a) => `<li>${affixText(a)}</li>`).join('');
    const cmp = cur && cur.uid !== it.uid ? `<div class="desc">${STR.satchelVs(itemName(cur), Math.round((itemScore(it) - itemScore(cur)) * 100))}</div>` : '';
    $('sat-detail').innerHTML = `<div class="name r-${it.rarity}">${itemName(it)}</div>
      <div class="desc">${STR.rarityName[it.rarity]} · ${STR.slotName[it.slot]} · ${STR.itemLevel(it.ilvl)}</div>
      <ul class="affixes">${lines}</ul>${myth ? `<div class="desc">${STR.mythicLine(myth.power, myth.cost)}</div>` : ''}${cmp}`;
  }
}
