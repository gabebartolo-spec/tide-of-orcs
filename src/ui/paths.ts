/** Specialisation path UI (TB-193c): the three path cards on the Replant tab, and the helpers the tree and satchel share. */
import { PATHS, PATH_FX, PATH_IDS, PathId } from '../data/paths';
import { STR } from '../data/strings';
import { MYTHICS, SETS } from '../data/lootTables';
import type { Item } from '../data/loot';
import type { SkillNode } from '../data/skillTree';
import type { SimState } from '../sim/state';
import { pathLocked } from '../sim/tree';
import { burstAt, pop } from './juice';
import { P, PATH_TINT } from '../render/palette';


/** The detail-card hint for a locked path node, or null. */
export const pathHint = (s: SimState, n: SkillNode): string | null => (pathLocked(s, n) ? STR.pathHint(PATHS[n.path!].name) : null);

/** The starting bonus line on a path card, from PATH_FX (no numbers in the UI). */
export const startBonus = (id: PathId): string => {
  const v = id === 'serpent' ? PATH_FX.startCrit : id === 'fox' ? PATH_FX.startFox : PATH_FX.startStar;
  return STR.pathStart(STR.pathBonus[id](Math.round(v * 100)));
};

/** The path an item belongs to (a path set piece or a path mythic), or null. */
export const itemPath = (it: Item): PathId | null =>
  (it.mythic ? MYTHICS.find((m) => m.id === it.mythic)?.path : it.set ? SETS.find((x) => x.id === it.set)?.path : undefined) ?? null;

/** The small path tag shown on a satchel item. */
export const pathTag = (it: Item): string => { const p = itemPath(it); return p ? `<span class="ptag" data-path="${p}">${STR.pathShort[p]}</span>` : ''; };

/** Clicking a card picks that path, clicking the chosen card again (or No path) clears it. */
export const nextPath = (cur: PathId | null, clicked: PathId | null): PathId | null => (clicked === cur ? null : clicked);

/** The three path cards. Choosing dispatches through GameController.choosePath, which only takes while the run has fallen. */
export class PathPicker {
  private sig = '';
  constructor(private root: HTMLElement, private state: () => SimState, private choose: (p: PathId | null) => boolean,
    private onPick: (p: PathId | null) => void, private draw: (cv: HTMLCanvasElement, p: PathId, lit: boolean) => void) {
    root.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-path]'); if (!b || b.disabled) return;
      const s = this.state(), want = nextPath(s.run.path ?? null, (b.dataset.path || null) as PathId | null);
      if (this.choose(want)) { this.render(); this.onPick(want); const card = want && this.root.querySelector<HTMLElement>(`.pathcard[data-path="${want}"]`); if (want && card) { pop(card); burstAt(card, [PATH_TINT[want].light, PATH_TINT[want].pale, P.starGold]); } }
    };
  }

  /** Re-renders when the chosen path or the fallen state changed. Called ~6 Hz. */
  update(): void { const s = this.state(); if (`${s.run.path}|${s.run.fallen}` !== this.sig) this.render(); }

  render(): void {
    const s = this.state(), cur = s.run.path ?? null, open = s.run.fallen; this.sig = `${cur}|${open}`;
    this.root.innerHTML = `<div class="pathhead"><h2>${STR.pathsTitle}</h2><p>${open ? STR.pathsBody : STR.pathsClosed}</p></div>
      <div class="pathcards">${PATH_IDS.map((id) => `<button class="pathcard${cur === id ? ' on' : ''}" data-path="${id}" aria-pressed="${cur === id}" ${open ? '' : 'disabled'}>
        <canvas class="sigil" aria-hidden="true"></canvas><span class="name">${PATHS[id].name}</span><span class="desc">${PATHS[id].focus}</span><span class="bonus">${startBonus(id)}</span></button>`).join('')}</div>
      <button class="ghost pathnone" data-path="" aria-pressed="${cur === null}" ${open && cur !== null ? '' : 'disabled'}>${STR.pathNone}</button>`;
    for (const cv of this.root.querySelectorAll<HTMLCanvasElement>('canvas.sigil')) {
      const id = (cv.closest<HTMLElement>('[data-path]')!.dataset.path) as PathId;
      requestAnimationFrame(() => this.draw(cv, id, cur === id));
    }
  }
}
