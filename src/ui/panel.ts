import { PRESTIGE, VanType, vanCost } from '../data/balance';
import { BRANCH_COLOR, NODE } from '../data/skillTree';
import { STR } from '../data/strings';
import { GameController } from '../game';
import { TreeRenderer } from '../render/tree';
import { canBuy, costOf, rankOf, unlocked } from '../sim/tree';
import { canRally } from '../sim/vanguard';
import { gain } from '../sim/prestige';
import { fmt } from './format';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const VAN_NAME: Record<VanType, string> = { spear: 'Spearman', blade: 'Bladedancer' };

export class Panel {
  private toastTimer = 0;
  private wipeArmed = false;

  constructor(private game: GameController, private tree: TreeRenderer) {
    // static copy
    $('hint').textContent = STR.hint; $('tab-grove').textContent = STR.tabGrove; $('tab-prestige').textContent = STR.tabReplant;
    $('pr-title').textContent = STR.replantTitle; $('pr-body').textContent = STR.replantBody;
    $('btn-save').textContent = 'Save now'; $('btn-reset').textContent = STR.wipe; $('autosave').textContent = STR.autosave;
    $('fallen-title').textContent = STR.fallenTitle; $('fallen-hw-k').textContent = STR.fallenHW; $('fallen-btn').textContent = STR.fallenBtn;
    $('dep-spear').querySelector('.n')!.textContent = STR.rallySpear; $('dep-blade').querySelector('.n')!.textContent = STR.rallyBlade;

    $('tab-grove').onclick = () => this.setTab('grove'); $('tab-prestige').onclick = () => this.setTab('prestige');
    $('dep-spear').onclick = () => this.rally('spear'); $('dep-blade').onclick = () => this.rally('blade');
    $('pr-btn').onclick = () => { if (game.canReplant() && !game.state.run.fallen) this.doReplant(); };
    $('fallen-btn').onclick = () => this.doReplant();
    $('btn-save').onclick = () => { game.save(); this.toast(STR.saved); };
    $('btn-reset').onclick = () => this.wipe();
    tree.canvas.addEventListener('click', (e) => {
      const id = tree.hitTest(e.clientX, e.clientY); if (!id) return;
      if (tree.selected === id && canBuy(game.state, NODE[id])) this.buy(id);
      tree.selected = id; this.renderDetail();
    });
    this.renderDetail();
    if (game.state.run.fallen) this.showFallen();
  }

  /** Called ~6 Hz. */
  update(): void {
    const s = this.game.state;
    $('st-star').textContent = fmt(s.run.starlight); $('st-wave').textContent = String(s.run.wave); $('st-kills').textContent = fmt(s.meta.lifetimeKills); $('st-heart').textContent = String(s.meta.heartwood);
    const g = gain(s), ok = s.run.wave >= PRESTIGE.voluntaryWave && g > 0 && !s.run.fallen;
    $('pr-gain').textContent = '+' + g; ($('pr-btn') as HTMLButtonElement).disabled = !ok;
    $('pr-req').textContent = ok ? STR.replantReady(s.meta.bestWave) : STR.replantFrom(PRESTIGE.voluntaryWave);
    const b = document.getElementById('buy-btn') as HTMLButtonElement | null; if (b) b.disabled = !canBuy(s, NODE[this.tree.selected]);
    this.rallyButton('spear', $('dep-spear')); const bl = $('dep-blade'); bl.hidden = !s.stats.champion; if (s.stats.champion) this.rallyButton('blade', bl);
  }

  private rallyButton(type: VanType, el: HTMLElement): void {
    const s = this.game.state, c = el.querySelector('.c')!, btn = el as HTMLButtonElement;
    if (!s.stats.muster) { btn.disabled = true; c.textContent = STR.learnMuster; c.className = 'c dim'; return; }
    const full = s.vans.count >= s.stats.vanCap, cost = vanCost(type, s.run.wave);
    btn.disabled = !canRally(s, type);
    c.textContent = full ? STR.lineFull : fmt(cost) + ' starlight'; c.className = 'c' + (btn.disabled ? ' dim' : '');
  }

  handleEvents(events: ReturnType<GameController['events']['drain']>): void {
    for (const e of events) {
      if (e.t === 'wave') this.toast(STR.waveN(e.wave));
      else if (e.t === 'kill' && e.kind === 'boss') this.toast(STR.bossFalls);
      else if (e.t === 'bought' && e.firstRank && e.id !== 'sharp') this.toast(STR.joins(NODE[e.id as keyof typeof NODE].name));
      else if (e.t === 'vanguardRallied') this.toast(STR.takesField(VAN_NAME[e.type as VanType]));
      else if (e.t === 'vanguardFell') this.toast(STR.vanFalls(VAN_NAME[e.type as VanType]));
      else if (e.t === 'barricadeRegrow') this.toast(STR.regrow);
      else if (e.t === 'barricadeFell') this.showFallen();
    }
  }

  private buy(id: keyof typeof NODE): void { if (this.game.buy(id)) this.renderDetail(); }
  private rally(type: VanType): void { if (!this.game.rally(type) && this.game.state.vans.count >= this.game.state.stats.vanCap) this.toast(STR.lineFullToast); }

  renderDetail(): void {
    const s = this.game.state, n = NODE[this.tree.selected], lvl = rankOf(s, n.id), cost = costOf(s, n), maxed = lvl >= n.max, un = unlocked(s, n);
    $('detail').innerHTML = `
      <div class="branch" style="color:${BRANCH_COLOR[n.branch]}">${n.branch}${n.parent ? ' · ' + STR.needs(NODE[n.parent].name) : ''}</div>
      <div class="name"><span>${n.name}</span><span style="font-size:13px;color:var(--cream-dim)">${n.max > 1 ? STR.rank(lvl, n.max) : lvl ? STR.learned : ''}</span></div>
      <div class="desc">${n.desc}</div>
      <div class="row"><span style="font-variant-numeric:tabular-nums;color:var(--amber)">${maxed ? STR.fullyGrown : n.base === 0 ? '' : fmt(cost) + ' starlight'}</span>
      <button class="buy" id="buy-btn" ${canBuy(s, n) ? '' : 'disabled'}>${maxed ? STR.complete : !un ? STR.locked : lvl ? STR.improve : STR.learn}</button></div>`;
    $('buy-btn').onclick = () => this.buy(n.id);
  }

  setTab(k: 'grove' | 'prestige'): void {
    $('pane-grove').hidden = k !== 'grove'; $('pane-prestige').hidden = k !== 'prestige';
    $('tab-grove').setAttribute('aria-selected', String(k === 'grove')); $('tab-prestige').setAttribute('aria-selected', String(k === 'prestige'));
  }

  private showFallen(): void {
    const r = this.game.state.run;
    $('fallen-sum').textContent = STR.fallenSummary(r.wave, fmt(r.kills), Math.floor(r.runTime / 60));
    $('fallen-hw').textContent = '+' + gain(this.game.state); $('fallen').hidden = false;
  }
  private doReplant(): void {
    const hw = this.game.replant(); $('fallen').hidden = true; this.tree.selected = 'sharp'; this.renderDetail(); this.setTab('grove');
    this.toast(STR.replanted(hw));
  }
  private wipe(): void {
    const btn = $('btn-reset');
    if (!this.wipeArmed) { this.wipeArmed = true; btn.textContent = STR.wipeConfirm; setTimeout(() => { this.wipeArmed = false; btn.textContent = STR.wipe; }, 4000); return; }
    this.game.wipe(); this.wipeArmed = false; btn.textContent = STR.wipe; $('fallen').hidden = true; this.tree.selected = 'sharp'; this.renderDetail(); this.toast(STR.freshDawn);
  }

  toast(msg: string): void {
    const el = $('toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => el.classList.remove('on'), 2600);
  }
}
