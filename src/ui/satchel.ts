/** Satchel tab (TB-095): the six worn slots, the satchel grid, and the selected item compared with what is worn. */
import { Item, RARITIES, Rarity, SLOTS } from '../data/loot';
import { AFFIXES, BASES, MYTHICS, SATCHEL, SETS } from '../data/lootTables';
import { STR } from '../data/strings';
import { GameController } from '../game';
import { itemScore, salvageGlimmer } from '../sim/loot';

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
    // RARITIES minus mythic: mythics are never filtered out
    const f = $('sat-filter') as HTMLSelectElement; $('sat-filter-k').textContent = STR.satchelFilter;
    f.innerHTML = RARITIES.filter((r) => r !== 'mythic').map((r) => `<option value="${r}">${STR.filterAtLeast(STR.rarityName[r] ?? r)}</option>`).join('');
    f.onchange = () => { this.game.setLootFilter(f.value as Rarity); this.render(); };
    $('sat-detail').onclick = (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act, uid = this.selected;
      if (!act || !uid) return;
      if (act === 'equip') this.game.equipItem(uid);
      else if (act === 'lock') this.game.lockItem(uid);
      else if (act === 'salvage' && this.game.salvageItem(uid)) this.selected = null;
      this.render();
    };
  }

  private get loot() { return this.game.state.meta.loot; }

  /** Cheap: re-renders only when the satchel, worn set or selection changed. Called ~6 Hz. */
  update(): void {
    if (this.signature() !== this.sig) this.render();
  }

  private signature(): string {
    const l = this.loot;
    return `${l.items.length}|${l.nextUid}|${JSON.stringify(l.equipped)}|${l.glimmer}|${l.lootFilter.minRarity}|${l.items.filter((i) => i.locked).length}|${this.selected}`;
  }

  render(): void {
    const l = this.loot, worn = new Set(Object.values(l.equipped));
    this.sig = this.signature(); ($('sat-filter') as HTMLSelectElement).value = l.lootFilter.minRarity;
    const cell = (it: Item | undefined, label = '') => it
      ? `<button class="item r-${it.rarity}${it.uid === this.selected ? ' sel' : ''}" data-uid="${it.uid}" title="${itemName(it)}"><span class="slot">${label}${it.locked ? STR.lockedMark : ''}</span><span class="nm">${itemName(it)}</span></button>`
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
    const cur = l.items.find((i) => i.uid === l.equipped[it.slot]), worn = cur?.uid === it.uid;
    const myth = it.mythic ? MYTHICS.find((m) => m.id === it.mythic) : null;
    const lines = it.affixes.map((a) => `<li>${affixText(a)}</li>`).join('');
    const cmp = cur && cur.uid !== it.uid ? `<div class="desc">${STR.satchelVs(itemName(cur), Math.round((itemScore(it) - itemScore(cur)) * 100))}</div>` : '';
    $('sat-detail').innerHTML = `<div class="name r-${it.rarity}">${itemName(it)}</div>
      <div class="desc">${STR.rarityName[it.rarity]} · ${STR.slotName[it.slot]} · ${STR.itemLevel(it.ilvl)}</div>
      <ul class="affixes">${lines}</ul>${myth ? `<div class="desc">${STR.mythicLine(myth.power, myth.cost)}</div>` : ''}${cmp}
      <div class="row">${worn ? `<span class="desc">${STR.satchelWornNow}</span>` : `<button class="buy" data-act="equip">${STR.equip}</button>`}
      <button class="buy" data-act="lock">${it.locked ? STR.unlock : STR.lock}</button>
      <button class="buy" data-act="salvage"${worn || it.locked ? ' disabled' : ''}>${STR.salvageFor(salvageGlimmer(it))}</button></div>`;
  }
}
