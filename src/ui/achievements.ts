import { ACH, ACHIEVEMENTS, ACH_GROUPS, COSMETICS, COSMETIC_SLOT, CosmeticId, CosmeticSlot } from '../data/achievements';
import { STR } from '../data/strings';
import type { GameController } from '../game';

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The worn title's words, or null (TB-249). */
export const wornTitle = (id: string | null): string | null => (id ? ACH[id]?.title ?? null : null);

/** One row's markup (TB-249). A secret stays a sealed plate, name and rule hidden, until it is earned. `worn`: this row's
 *  title or cosmetic is the one worn. A wearable cosmetic (a cloak dye, TB-250) gets Wear / take off; one with no art yet says so. */
export function deedRow(id: string, earned: boolean, worn: boolean): string {
  const a = ACH[id]!, sealed = a.group === 'secret' && !earned, slot = a.cosmetic && COSMETIC_SLOT[a.cosmetic];
  const name = sealed ? STR.deedSealed : a.name, rule = sealed ? STR.deedSealedRule : a.rule;
  const reward = sealed ? '' : a.title ? STR.deedTitle(a.title) : STR.deedCosmetic(slot ? COSMETICS[a.cosmetic!] : `${COSMETICS[a.cosmetic!]} (${STR.deedSoon})`);
  const act = !earned ? '' : a.title
    ? (worn ? `<span class="worn">${STR.deedWorn}</span>` : `<button class="ghost" data-wear="${a.id}" type="button">${STR.deedWear}</button>`)
    : slot ? (worn ? `<button class="ghost" data-undress="${slot}" type="button">${STR.deedUndress}</button>` : `<button class="ghost" data-dress="${a.cosmetic}" type="button">${STR.deedDress}</button>`) : '';
  return `<li class="deed${earned ? ' on' : ''}${sealed ? ' sealed' : ''}"><span class="nm">${esc(name)}</span><span class="rule">${esc(rule)}</span><span class="rw">${esc(reward)}</span>${act}</li>`;
}

/** The Achievements tab (TB-249): five groups, earned rows lit, secrets sealed, the title picker and the cloak picker (TB-250). */
export class AchievementsPane {
  private sig = '';
  constructor(private game: GameController, private onWear: (title: string | null) => void, private onDress: (cosmetic: string | null) => void) {
    $('deeds-title').textContent = STR.tabDeeds; $('deeds-notitle').textContent = STR.deedNoTitle;
    $('deeds-notitle').onclick = () => { if (this.game.setTitle(null)) { this.onWear(null); this.render(); } };
    $('deeds-list').onclick = (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-wear],[data-dress],[data-undress]'), d = el?.dataset;
      if (!d) return;
      if (d.wear && this.game.setTitle(d.wear)) { this.onWear(wornTitle(d.wear)); this.render(); }
      const dress = d.dress as CosmeticId | undefined, undress = d.undress as CosmeticSlot | undefined;
      if (dress && COSMETIC_SLOT[dress] && this.game.wearCosmetic(COSMETIC_SLOT[dress]!, dress)) { this.onDress(COSMETICS[dress]); this.render(); }
      if (undress && this.game.wearCosmetic(undress, null)) { this.onDress(null); this.render(); }
    };
  }
  render(): void {
    const m = this.game.state.meta.ach, got = new Set(m.earned), sig = `${m.earned.length}|${m.title}|${m.worn.cloak ?? ''}`;
    if (sig === this.sig) return; this.sig = sig;
    $('deeds-count').textContent = STR.deedsCount(got.size, ACHIEVEMENTS.length);
    ($('deeds-notitle') as HTMLButtonElement).disabled = !m.title;
    $('deeds-list').innerHTML = ACH_GROUPS.map((g) => {
      const rows = ACHIEVEMENTS.filter((a) => a.group === g), n = rows.filter((a) => got.has(a.id)).length;
      return `<h3>${STR.deedGroup[g]} <span class="k">${n} / ${rows.length}</span></h3><ul class="deeds">${rows.map((a) => deedRow(a.id, got.has(a.id), a.title ? m.title === a.id : !!a.cosmetic && Object.values(m.worn).includes(a.cosmetic))).join('')}</ul>`;
    }).join('');
  }
}
