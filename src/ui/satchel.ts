/** Satchel tab (TB-095): the six worn slots, the satchel grid, and the selected item compared with what is worn. */
import { Item, RARITIES, Rarity, SLOTS, Slot } from '../data/loot';
import { AFFIXES, BASES, MYTHICS, SETS } from '../data/lootTables';
import { STR } from '../data/strings';
import { GameController } from '../game';
import { glyph } from './glyphs';
import { ITEM_ICON_DIR, ITEM_ICON_IDS } from '../data/itemArt';
import { itemScore, rerollCost, salvageGlimmer } from '../sim/loot';
import { setCounts, setTiers } from '../sim/gear';
import type { Cue } from '../data/audio';
import { hwRank } from '../sim/heartwood';
import { pathTag } from './paths';
import { ComparePlates, cmpSide, dropOk, powerDelta } from './compare';
import { SATCHEL_UI } from '../data/presentation';
import { calm } from './juice';

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
  private cmp = new ComparePlates();
  private drag: Item | null = null;

  constructor(private game: GameController, private onCue: (c: Cue) => void = () => {}) {
    // warm the icon cache so a run's first drop banner shows its picture at once (TB-192; 32 small WebPs)
    for (const id of ITEM_ICON_IDS) new Image().src = `${import.meta.env.BASE_URL}${ITEM_ICON_DIR}/${id}.webp`;
    $('sat-title').textContent = STR.satchelTitle; $('sat-worn-k').textContent = STR.satchelWorn;
    const pick = (e: Event) => { const uid = (e.target as HTMLElement).closest<HTMLElement>('[data-uid]')?.dataset.uid; if (uid) { this.selected = uid; this.render(); } };
    $('sat-worn').onclick = pick; $('sat-grid').onclick = pick;
    this.wireObject();
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
      const tiers = setTiers(this.loot, this.game.state.stats.setBoost);
      if (act === 'equip' && this.game.equipItem(uid)) { flash = () => $('sat-worn').querySelector(`[data-uid="${uid}"]`); this.onCue(setTiers(this.loot, this.game.state.stats.setBoost) > tiers ? 'setRise' : 'equip'); }
      else if (act === 'lock') this.game.lockItem(uid);
      else if (act === 'heirloom') this.game.heirloomItem(uid);
      else if (act === 'reroll' && this.game.rerollItem(uid, i)) { flash = () => $('sat-detail').querySelectorAll('.affixes li')[i]; this.onCue('reroll'); }
      else if (act === 'salvage' && this.game.salvageItem(uid)) { this.selected = null; flash = () => $('sat-count'); this.onCue('salvage'); }
      this.render();
      const el = flash?.();
      if (el) { el.classList.remove('flash'); void (el as HTMLElement).offsetWidth; el.classList.add('flash'); }
    };
  }

  /** TB-195e: hover a satchel item for the compare plates; drag it onto its sewn pocket to wear it (snap, flash, equip cue). */
  private wireObject(): void {
    const grid = $('sat-grid'), worn = $('sat-worn'), find = (uid?: string) => this.loot.items.find((i) => i.uid === uid);
    const pocket = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('[data-pocket]');
    grid.onpointermove = (e) => {
      const it = this.drag ? null : find((e.target as HTMLElement).closest<HTMLElement>('[data-uid]')?.dataset.uid);
      if (!it) { this.cmp.hide(); return; }
      const cur = find(this.loot.equipped[it.slot]);
      this.cmp.show(it.uid + (cur?.uid ?? ''), cmpSide(it, itemName(it), affixText), cur ? cmpSide(cur, itemName(cur), affixText) : null, powerDelta(it, cur), e.clientX, e.clientY);
    };
    grid.onpointerleave = () => this.cmp.hide();
    grid.ondragstart = (e) => {
      const it = find((e.target as HTMLElement).closest<HTMLElement>('[data-uid]')?.dataset.uid);
      if (!it || !e.dataTransfer) return;
      this.drag = it; this.cmp.hide(); e.dataTransfer.setData('text/plain', it.uid); e.dataTransfer.effectAllowed = 'move';
      worn.querySelector(`[data-pocket="${it.slot}"]`)?.classList.add('want');
    };
    grid.ondragend = () => { this.drag = null; worn.querySelectorAll('.want, .over').forEach((el) => el.classList.remove('want', 'over')); };
    worn.ondragover = (e) => { const p = pocket(e); if (p && dropOk(this.drag?.slot, p.dataset.pocket as Slot)) { e.preventDefault(); p.classList.add('over'); } };
    worn.ondragleave = (e) => pocket(e)?.classList.remove('over');
    worn.ondrop = (e) => {
      e.preventDefault();
      const it = this.drag, p = pocket(e);
      if (it && p && dropOk(it.slot, p.dataset.pocket as Slot)) this.dropOn(it);
    };
  }

  /** Wear `it` as if dropped on its pocket: equip, cue, then the pocket snaps and flashes. Also the capture hook. */
  dropOn(it: Item): void {
    const tiers = setTiers(this.loot, this.game.state.stats.setBoost);
    if (!this.game.equipItem(it.uid)) return;
    this.onCue(setTiers(this.loot, this.game.state.stats.setBoost) > tiers ? 'setRise' : 'equip');
    this.selected = it.uid; this.drag = null; this.render();
    const el = $('sat-worn').querySelector<HTMLElement>(`[data-pocket="${it.slot}"]`);
    if (el && !calm()) el.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(0.94)' }, { transform: 'none' }], { duration: SATCHEL_UI.snap, easing: 'ease-out' });
    if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
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
    const cell = (slot: Slot, it?: Item, w = false) => it
      ? `<button class="item r-${it.rarity}${it.uid === this.selected ? ' sel' : ''}" data-uid="${it.uid}"${w ? ` data-pocket="${slot}"` : ' draggable="true"'}>${glyph(slot, it)}<span class="txt"><span class="slot">${STR.slotName[slot]}${it.locked ? STR.lockedMark : ''}${it.uid === l.heirloom ? STR.heirloomMark : ''}</span><span class="nm">${itemName(it)}</span>${pathTag(it)}</span></button>`
      : `<div class="item empty"${w ? ` data-pocket="${slot}"` : ''}>${glyph(slot)}<span class="txt"><span class="slot">${STR.slotName[slot]}</span></span></div>`;
    $('sat-worn').innerHTML = SLOTS.map((s) => cell(s, l.items.find((i) => i.uid === l.equipped[s]), true)).join('');
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
    $('sat-detail').innerHTML = `<div class="head">${glyph(it.slot, it, true)}<div class="name r-${it.rarity}">${itemName(it)}</div>${pathTag(it)}</div>
      <div class="desc">${STR.rarityName[it.rarity]} · ${STR.slotName[it.slot]} · ${STR.itemLevel(it.ilvl)}</div>
      <ul class="affixes">${lines}</ul>${it.set ? setBlock(it.set, setCounts(l)[it.set] ?? 0, this.game.state.stats.setBoost) : ''}${myth ? `<div class="desc">${STR.mythicLine(STR.mythicPower[myth.id] ?? '')}</div>` : ''}${cmp}
      <div class="row">${worn ? `<span class="desc">${STR.satchelWornNow}</span>` : `<button class="buy" data-act="equip">${STR.equip}</button>`}
      <button class="buy" data-act="lock">${it.locked ? STR.unlock : STR.lock}</button>
      ${hwRank(this.game.state.meta, 'hw_heirloom') && (worn || l.heirloom === it.uid) ? `<button class="buy" data-act="heirloom">${l.heirloom === it.uid ? STR.unheirloom : STR.heirloom}</button>` : ''}
      <button class="buy" data-act="salvage"${worn || it.locked ? ' disabled' : ''}>${STR.salvageFor(salvageGlimmer(it, this.game.state.stats))}</button></div>`;
  }
}
