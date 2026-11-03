import { BUILDING, BUILDINGS, BuildingId, CAMP_FX, MAT_IDS, MAT_NAMES } from '../data/camp';
import { CAMP_SPOTS } from '../data/presentation';
import { STR } from '../data/strings';
import type { GameController } from '../game';
import { campCost, campLevel, canUpgrade } from '../sim/camp';
import { hwSpendable } from '../sim/heartwood';

type FxKey = keyof typeof CAMP_FX & keyof typeof STR.campFx;
/** Which CAMP_FX rows each building raises, and how each reads: a multiplier (×1.05 → +5 %), a share (0.05 → 5 %) or a flat plus. */
const FX: Readonly<Record<BuildingId, readonly FxKey[]>> = {
  bowyer: ['bowDmg', 'drawCut', 'radius'], forge: ['weaponDmg', 'findPlus', 'rerollCut'],
  kitchen: ['wallHp', 'regenPlus', 'starlight'], training: ['vanHp', 'vanDmg', 'respawnCut'],
};
const MULT = new Set<FxKey>(['bowDmg', 'radius', 'weaponDmg', 'wallHp', 'starlight', 'vanHp', 'vanDmg']);
const FLAT = new Set<FxKey>(['regenPlus']);
const round = (v: number): number => Math.round(v * 100) / 100;

/** A building's effect at `level` as one line ("bow damage +10%, draw time −6%, …"); empty at level 0. */
export function campFxText(id: BuildingId, level: number): string {
  if (level <= 0) return '';
  return FX[id].map((k) => {
    const v = CAMP_FX[k][level]!;
    return STR.campFx[k](FLAT.has(k) ? round(v) : Math.round((MULT.has(k) ? v - 1 : v) * 100));
  }).join(', ');
}

/** The building under a field point (field units), or null. Footprints come from CAMP_SPOTS. */
export function campHit(x: number, y: number): BuildingId | null {
  for (const b of BUILDINGS) {
    const p = CAMP_SPOTS[b.id];
    if (Math.abs(x - p.x) <= p.w / 2 && y <= p.y && y >= p.y - p.h) return b.id;
  }
  return null;
}

const maxLevel = (id: BuildingId): number => BUILDING[id].costs.length;

/** Encampment UI (TB-188b): the building card over the field and the Camp section on the Replant tab. Intents go through
 *  GameController.upgradeBuilding, which refuses unless the run has fallen (sim rule); the buttons mirror canUpgrade. */
export class CampPane {
  /** The building whose card is open on the field, or null. */
  open: BuildingId | null = null;
  private sig = '';

  constructor(private game: GameController, private card: HTMLElement, private list: HTMLElement, private onUpgraded: (msg: string) => void) {
    card.onclick = (e) => {
      const t = (e.target as HTMLElement).closest('button'); if (!t) return;
      if (t.dataset.close !== undefined) this.close(); else if (t.dataset.camp) this.upgrade(t.dataset.camp as BuildingId);
    };
    list.onclick = (e) => { const id = (e.target as HTMLElement).closest('button')?.dataset.camp as BuildingId | undefined; if (id) this.upgrade(id); };
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open) this.close(); });
  }

  private upgrade(id: BuildingId): void {
    if (!this.game.upgradeBuilding(id)) return;
    this.onUpgraded(STR.campUpgraded(BUILDING[id].name, campLevel(this.game.state.meta, id)));
    this.render();
  }

  show(id: BuildingId): void { this.open = id; this.card.hidden = false; this.renderCard(); this.card.querySelector<HTMLButtonElement>('button[data-camp]')?.focus({ preventScroll: true }); }
  close(): void { this.open = null; this.card.hidden = true; }

  /** One building's block: name and level, what it gives now and next, the price with owned counts, the button. */
  private block(id: BuildingId, card: boolean): string {
    const s = this.game.state, b = BUILDING[id], l = campLevel(s.meta, id), c = campCost(s.meta, id), max = maxLevel(id);
    const now = campFxText(id, l), next = c ? campFxText(id, l + 1) : '';
    const cost = c ? STR.campCost(c.hw, c.mat, MAT_NAMES[b.mat]) : STR.fullyGrown;
    const btn = `<button class="buy" data-camp="${id}" ${canUpgrade(s, id) ? '' : 'disabled'}>${c === null ? STR.complete : l ? STR.campUpgrade : STR.campBuild}</button>`;
    const head = `<div class="name">${b.name} <span class="desc">${STR.campLevel(l, max)}</span></div>`;
    const costCls = c && !canUpgrade(s, id) ? 'cost short' : 'cost';
    const nextLine = next ? `<div class="desc"><b>${STR.campNext}:</b> ${next}</div>` : '';
    // the Replant list is compact (name, next, cost and button on one row) so the tab fits without shrinking its text
    if (!card) return `${head}${nextLine}<div class="row"><span class="${costCls}">${cost}</span>${btn}</div>`;
    return `${head}
      <div class="desc">${b.desc}</div>
      ${now ? `<div class="desc"><b>${STR.campNow}:</b> ${now}</div>` : ''}
      ${nextLine}
      <div class="${costCls}">${cost}</div>
      ${btn}`;
  }

  renderCard(): void {
    if (!this.open) return;
    this.card.innerHTML = `<button class="ghost x" data-close aria-label="${STR.cardClose}">✕</button>${this.block(this.open, true)}`;
  }

  /** Rebuilt on upgrade, replant and import; update() refreshes the buttons. */
  render(): void {
    const m = this.game.state.meta;
    // materials only (TB-195n): the buildings are upgraded from their cards on the diorama
    this.list.innerHTML = `<div class="k">${STR.campMats}</div><dl class="mats">${MAT_IDS.map((k) => `<dt>${MAT_NAMES[k]}</dt><dd>${m.camp.mats[k] ?? 0}</dd>`).join('')}</dl>`;
    this.renderCard();
  }

  /** ~6 Hz: keep buttons in step with Heartwood, materials and the fallen state. */
  update(): void {
    const s = this.game.state, c = s.meta.camp;
    // materials drop mid-run and Heartwood frees up on a fall: redraw the counts when anything shown changes
    const sig = `${MAT_IDS.map((k) => c.mats[k] ?? 0)}|${BUILDINGS.map((b) => c.levels[b.id] ?? 0)}|${hwSpendable(s)}|${s.run.fallen}`;
    if (sig !== this.sig) { this.sig = sig; this.render(); return; }
    for (const b of [...this.list.querySelectorAll<HTMLButtonElement>('button[data-camp]'), ...this.card.querySelectorAll<HTMLButtonElement>('button[data-camp]')]) b.disabled = !canUpgrade(s, b.dataset.camp as BuildingId);
  }
}
