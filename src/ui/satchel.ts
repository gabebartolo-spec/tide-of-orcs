/** Satchel tab (TB-095): the six worn slots, the satchel grid, and the selected item compared with what is worn. */
import { Item, RARITIES, Rarity, SLOTS, Slot } from '../data/loot';
import { AFFIXES, BASES, MYTHICS, SETS } from '../data/lootTables';
import { STR } from '../data/strings';
import { GameController } from '../game';
import { glyph } from './glyphs';
import { itemScore, rerollCost, salvageGlimmer } from '../sim/loot';
import { setCounts } from '../sim/gear';
import { hwRank } from '../sim/heartwood';

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

/** A set's name, pieces worn, and its three bonus lines; the earned ones are lit (TB-099), Set Resonance counting one more (TB-101). */
const setBlock = (id: string, n: number, boost = 0): string => {
  const name = SETS.find((x) => x.id === id)?.name ?? id, fx = STR.setFx[id] ?? ['', '', ''];
  return `<div class="set"><div class="k">${STR.setProgress(name, n)}</div>${([2, 4, 6] as const).map((t, i) => `<div class="tier${n > 0 && n + boost >= t ? ' on' : ''}">${t} · ${fx[i]}</div>`).join('')}</div>`;
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
      const i = Number((e.target as HTMLElement).closest<HTMLElement>('[data-i]')?.dataset.i);
      let flash: (() => Element | null | undefined) | null = null;
      // TB-105: the worn card flashes its rarity, the counter flashes on salvage, a rerolled line shimmers in
      if (act === 'equip' && this.game.equipItem(uid)) flash = () => $('sat-worn').querySelector(`[data-uid="${uid}"]`);
      else if (act === 'lock') this.game.lockItem(uid);
      else if (act === 'heirloom') this.game.heirloomItem(uid);
      else if (act === 'reroll' && this.game.rerollItem(uid, i)) flash = () => $('sat-detail').querySelectorAll('.affixes li')[i];
      else if (act === 'salvage' && this.game.salvageItem(uid)) { this.selected = null; flash = () => $('sat-count'); }
      this.render();
      const el = flash?.();
      if (el) { el.classList.remove('flash'); void (el as HTMLElement).offsetWidth; el.classList.add('flash'); }
    };
  }

  private get loot() { return this.game.state.meta.loot; }

  /** Cheap: re-renders only when the satchel, worn set or selection changed. Called ~6 Hz. */
  update(): void {
    if (this.signature() !== this.sig) this.render();
  }

  private signature(): string {
    const l = this.loot;
    return `${l.items.length}|${l.nextUid}|${JSON.stringify(l.equipped)}|${l.glimmer}|${l.lootFilter.minRarity}|${l.items.filter((i) => i.locked).length}|${l.heirloom}|${this.game.state.stats.setBoost}|${this.game.state.stats.satchelCap}|${this.selected}`;
  }

  render(): void {
    const l = this.loot, worn = new Set(Object.values(l.equipped));
    this.sig = this.signature(); ($('sat-filter') as HTMLSelectElement).value = l.lootFilter.minRarity;
    const cell = (slot: Slot, it?: Item) => it
      ? `<button class="item r-${it.rarity}${it.uid === this.selected ? ' sel' : ''}" data-uid="${it.uid}" title="${itemName(it)}">${glyph(slot, it)}<span class="txt"><span class="slot">${STR.slotName[slot]}${it.locked ? STR.lockedMark : ''}${it.uid === l.heirloom ? STR.heirloomMark : ''}</span><span class="nm">${itemName(it)}</span></span></button>`
      : `<div class="item empty">${glyph(slot)}<span class="txt"><span class="slot">${STR.slotName[slot]}</span></span></div>`;
    $('sat-worn').innerHTML = SLOTS.map((s) => cell(s, l.items.find((i) => i.uid === l.equipped[s]))).join('');
    const boost = this.game.state.stats.setBoost, sets = Object.entries(setCounts(l));
    $('sat-sets').innerHTML = sets.length ? `<div class="k">${STR.setsWorn}</div>${sets.map(([id, n]) => setBlock(id, n, boost)).join('')}` : '';
    const spare = l.items.filter((i) => !worn.has(i.uid));
    $('sat-count').textContent = STR.satchelCount(spare.length, this.game.state.stats.satchelCap, l.glimmer);
    $('sat-grid').innerHTML = spare.length ? spare.map((i) => cell(i.slot, i)).join('') : `<div class="desc">${STR.satchelEmpty}</div>`;
    this.renderDetail();
  }

  private renderDetail(): void {
    const l = this.loot, it = l.items.find((i) => i.uid === this.selected);
    if (!it) { $('sat-detail').innerHTML = `<div class="desc">${STR.satchelPick}</div>`; return; }
    const cur = l.items.find((i) => i.uid === l.equipped[it.slot]), worn = cur?.uid === it.uid;
    const myth = it.mythic ? MYTHICS.find((m) => m.id === it.mythic) : null;
    // Worn items show a reroll button per affix (TB-102); greyed while Glimmer is short
    const cost = rerollCost(it, this.game.state.stats.rerollMult), poor = l.glimmer < cost;
    const lines = it.affixes.map((a, i) => `<li>${affixText(a)}${worn ? ` <button class="buy" data-act="reroll" data-i="${i}"${poor ? ' disabled' : ''}>${STR.rerollFor(cost)}</button>` : ''}</li>`).join('');
    const cmp = cur && cur.uid !== it.uid ? `<div class="desc">${STR.satchelVs(itemName(cur), Math.round((itemScore(it) - itemScore(cur)) * 100))}</div>` : '';
    $('sat-detail').innerHTML = `<div class="head">${glyph(it.slot, it, true)}<div class="name r-${it.rarity}">${itemName(it)}</div></div>
      <div class="desc">${STR.rarityName[it.rarity]} · ${STR.slotName[it.slot]} · ${STR.itemLevel(it.ilvl)}</div>
      <ul class="affixes">${lines}</ul>${it.set ? setBlock(it.set, setCounts(l)[it.set] ?? 0, this.game.state.stats.setBoost) : ''}${myth ? `<div class="desc">${STR.mythicLine(STR.mythicPower[myth.id] ?? '')}</div>` : ''}${cmp}
      <div class="row">${worn ? `<span class="desc">${STR.satchelWornNow}</span>` : `<button class="buy" data-act="equip">${STR.equip}</button>`}
      <button class="buy" data-act="lock">${it.locked ? STR.unlock : STR.lock}</button>
      ${hwRank(this.game.state.meta, 'hw_heirloom') && (worn || l.heirloom === it.uid) ? `<button class="buy" data-act="heirloom">${l.heirloom === it.uid ? STR.unheirloom : STR.heirloom}</button>` : ''}
      <button class="buy" data-act="salvage"${worn || it.locked ? ' disabled' : ''}>${STR.salvageFor(salvageGlimmer(it, this.game.state.stats))}</button></div>`;
  }
}
