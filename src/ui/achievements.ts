import { ACH, ACHIEVEMENTS, ACH_GROUPS, COSMETICS } from '../data/achievements';
import { STR } from '../data/strings';
import type { GameController } from '../game';

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The worn title's words, or null (TB-249). */
export const wornTitle = (id: string | null): string | null => (id ? ACH[id]?.title ?? null : null);

/** One row's markup (TB-249). A secret stays a sealed plate, name and rule hidden, until it is earned. */
export function deedRow(id: string, earned: boolean, worn: boolean): string {
  const a = ACH[id]!, sealed = a.group === 'secret' && !earned;
  const name = sealed ? STR.deedSealed : a.name, rule = sealed ? STR.deedSealedRule : a.rule;
  const reward = sealed ? '' : a.title ? STR.deedTitle(a.title) : STR.deedCosmetic(`${COSMETICS[a.cosmetic!]} (${STR.deedSoon})`);
  const act = earned && a.title ? (worn ? `<span class="worn">${STR.deedWorn}</span>` : `<button class="ghost" data-wear="${a.id}" type="button">${STR.deedWear}</button>`) : '';
  return `<li class="deed${earned ? ' on' : ''}${sealed ? ' sealed' : ''}"><span class="nm">${esc(name)}</span><span class="rule">${esc(rule)}</span><span class="rw">${esc(reward)}</span>${act}</li>`;
}

/** The Achievements tab (TB-249): five groups, earned rows lit, secrets sealed, and the title picker. */
export class AchievementsPane {
  private sig = '';
  constructor(private game: GameController, private onWear: (title: string | null) => void) {
    $('deeds-title').textContent = STR.tabDeeds; $('deeds-notitle').textContent = STR.deedNoTitle;
    $('deeds-notitle').onclick = () => { if (this.game.setTitle(null)) { this.onWear(null); this.render(); } };
    $('deeds-list').onclick = (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-wear]')?.dataset.wear;
      if (id && this.game.setTitle(id)) { this.onWear(wornTitle(id)); this.render(); }
    };
  }
  render(): void {
    const m = this.game.state.meta.ach, got = new Set(m.earned), sig = `${m.earned.length}|${m.title}`;
    if (sig === this.sig) return; this.sig = sig;
    $('deeds-count').textContent = STR.deedsCount(got.size, ACHIEVEMENTS.length);
    ($('deeds-notitle') as HTMLButtonElement).disabled = !m.title;
    $('deeds-list').innerHTML = ACH_GROUPS.map((g) => {
      const rows = ACHIEVEMENTS.filter((a) => a.group === g), n = rows.filter((a) => got.has(a.id)).length;
      return `<h3>${STR.deedGroup[g]} <span class="k">${n} / ${rows.length}</span></h3><ul class="deeds">${rows.map((a) => deedRow(a.id, got.has(a.id), m.title === a.id)).join('')}</ul>`;
    }).join('');
  }
}
