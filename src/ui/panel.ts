import { PRESTIGE, VanType } from '../data/balance';
import { BRANCH_COLOR, BRANCH_LABEL, NODE } from '../data/skillTree';
import { STR } from '../data/strings';
import type { Cue } from '../data/audio';
import { GameController } from '../game';
import { TreeRenderer } from '../render/tree';
import { stepNode, tabOrder } from '../render/treeNav';
import { canBuy, costOf, rankOf, unlocked } from '../sim/tree';
import { gain } from '../sim/prestige';
import { bossesReady, canSummonBoss } from '../sim/boss';
import { BOSS_WAVE, TIERS } from '../data/bosses';
import { fitPages } from './fit';
import { NumberFormat, fmt, setNumberFormat } from './format';
import { HW_NODE, HW_NODES, HwId } from '../data/heartwood';
import { canBuyHw, hwCost, hwPending, hwRank, hwSpendable, hwUnlocked } from '../sim/heartwood';
import { SatchelPane, itemName } from './satchel';
import { LOOT_TOAST } from '../data/lootTables';
import { RARITIES } from '../data/loot';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const VAN_NAME: Record<VanType, string> = { spear: 'Spearman', blade: 'Bladedancer' };

export class Panel {
  private toastTimer = 0;
  private wipeArmed = false;
  private satchel: SatchelPane;
  /** Boss tier picked for the next March (TB-148); 0 means the highest unlocked. */
  private pickTier = 0;

  constructor(private game: GameController, private tree: TreeRenderer) {
    // static copy
    $('tab-grove').textContent = STR.tabGrove; $('tab-prestige').textContent = STR.tabReplant;
    $('pr-title').textContent = STR.replantTitle; $('pr-body').textContent = STR.replantBody;
    $('btn-save').textContent = STR.saveNow;
    $('k-star').textContent = STR.starlight; $('k-wave').textContent = STR.wave; $('k-kills').textContent = STR.slain; $('k-heart').textContent = STR.heartwood;
    $('pr-gain-k').textContent = STR.replantGainK; $('pr-btn').textContent = STR.replantBtn;
    $('pr-each').innerHTML = STR.replantEach(PRESTIGE.fallGain); $('pr-reset').textContent = STR.replantReset; $('pr-kept').textContent = STR.replantKept; $('btn-reset').textContent = STR.wipe; $('autosave').textContent = STR.autosave;
    $('fallen-title').textContent = STR.fallenTitle; $('fallen-hw-k').textContent = STR.fallenHW; $('fallen-btn').textContent = STR.fallenToCamp;
    $('camp-title').textContent = STR.campTitle; $('camp-go').textContent = STR.campGo; $('camp-close').textContent = STR.campClose; $('btn-settings').textContent = STR.tabSettings;
    $('dep-boss').querySelector('.n')!.textContent = STR.summonBoss;

    $('tab-settings').textContent = STR.tabSettings; $('tab-satchel').textContent = STR.tabSatchel;
    this.satchel = new SatchelPane(game, (c) => this.onCue(c)); $('tab-satchel').onclick = () => { this.onCue('click'); this.setTab('satchel'); this.satchel.render(); };
    fitPages([$('pane-satchel'), $('pane-prestige'), $('pane-settings')]);
    $('tab-grove').onclick = () => { this.onCue('click'); this.setTab('grove'); }; $('tab-prestige').onclick = () => { this.onCue('click'); this.setTab('prestige'); }; $('tab-settings').onclick = () => { this.onCue('click'); this.setTab('settings'); };
    this.initSettings();
    $('dep-boss').onclick = () => { game.summonBoss(); };
    $('pr-btn').onclick = () => { if (game.canReplant() && !game.state.run.fallen) this.doReplant(); };
    // After a fall the field gives way to the Grove page (TB-136): the tree and satchel are spent between runs
    $('fallen-btn').onclick = () => { this.onCue('click'); this.setMode('camp'); this.setTab('grove'); };
    $('camp-go').onclick = () => this.doReplant();
    $('tier-down').textContent = '‹'; $('tier-up').textContent = '›'; $('tier-down').setAttribute('aria-label', STR.tierDown); $('tier-up').setAttribute('aria-label', STR.tierUp);
    $('tier-down').onclick = () => this.stepTier(-1); $('tier-up').onclick = () => this.stepTier(1);
    $('btn-pullback').textContent = STR.pullBack;
    $('btn-pullback').onclick = () => { this.onCue('click'); this.game.pullBack(); };
    $('btn-settings').onclick = () => { this.onCue('click'); this.setMode('settings'); this.setTab('settings'); };
    $('camp-close').onclick = () => { this.onCue('click'); this.setMode('run'); };
    $('btn-save').onclick = () => { game.save(); this.toast(STR.saved); };
    $('btn-reset').onclick = () => this.wipe();
    tree.canvas.addEventListener('click', (e) => {
      const id = tree.hitTest(e.clientX, e.clientY); if (!id) return;
      // A second click on the selected node buys it (the buy plays `bought`), or is denied.
      if (tree.selected === id) { if (canBuy(game.state, NODE[id])) this.buy(id); else this.onCue('denied'); } else this.onCue('click');
      tree.select(id); this.renderDetail();
    });
    // Keyboard (GDD §13, TB-116): Tab walks the nodes branch by branch and leaves the tree at either end; Enter or Space buys.
    const order = tabOrder();
    tree.canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { const id = stepNode(order, tree.selected, e.shiftKey ? -1 : 1); if (!id) return; e.preventDefault(); this.onCue('click'); tree.select(id); this.renderDetail(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const id = tree.selected; if (canBuy(game.state, NODE[id])) this.buy(id); else this.onCue('denied'); }
    });
    // Full-screen tree (TB-189): the button toggles it, Esc closes it; buying and the detail card work the same inside it
    $('tree-full').onclick = () => { this.onCue('click'); this.setTreeFull(!document.body.classList.contains('tree-full')); };
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('tree-full')) { e.preventDefault(); this.setTreeFull(false); } });
    this.setTreeFull(false);
    $('hw-title').textContent = STR.hwTitle;
    $('hw-tree').onclick = (e) => { const id = (e.target as HTMLElement).closest('button')?.dataset.hw as HwId | undefined; if (id && game.buyHw(id)) { this.toast(STR.hwBought(HW_NODE[id].name)); this.renderHw(); } };
    this.renderDetail(); this.renderHw(); this.setMode('run');
    if (game.state.run.fallen) this.showFallen();
  }

  /** Heartwood tree list on the Replant tab. Rebuilt on purchase and replant; update() refreshes the buttons. */
  renderHw(): void {
    const s = this.game.state, m = s.meta;
    $('hw-tree').innerHTML = HW_NODES.map((n) => { const r = hwRank(m, n.id), c = hwCost(m, n.id); return `
      <div class="hwnode"><div><div class="name">${n.name} <span class="desc">${STR.hwRank(r, n.costs.length)}</span></div><div class="desc">${n.desc}</div>${hwUnlocked(m, n.id) ? '' : `<div class="desc">${STR.hwNeeds((n.req ?? []).map(([r, k]) => `${HW_NODE[r].name} ${k}`).join(', '))}</div>`}</div>
      <button class="buy" data-hw="${n.id}" ${canBuyHw(s, n.id) ? '' : 'disabled'}>${c === null ? STR.complete : STR.hwCost(c)}</button></div>`; }).join('');
  }

  /** Called ~6 Hz. */
  update(): void {
    const s = this.game.state;
    $('st-star').textContent = fmt(s.run.starlight); $('st-wave').textContent = s.run.tier > 1 ? STR.waveTide(s.run.wave, STR.tideName(s.run.tier)) : String(s.run.wave); $('st-kills').textContent = fmt(s.meta.lifetimeKills); $('st-heart').textContent = STR.heartAvail(hwSpendable(s), s.meta.heartwood + hwPending(s));
    $('hw-body').textContent = s.run.fallen ? STR.hwBody(hwSpendable(s)) : STR.hwClosed(hwSpendable(s));
    if (!$('pane-satchel').hidden) this.satchel.update();
    for (const b of $('hw-tree').querySelectorAll<HTMLButtonElement>('button[data-hw]')) b.disabled = !canBuyHw(s, b.dataset.hw as HwId);
    const g = gain(), ok = s.run.wave >= PRESTIGE.voluntaryWave && !s.run.fallen;
    $('btn-pullback').hidden = !ok;
    $('pr-gain').textContent = '+' + g; ($('pr-btn') as HTMLButtonElement).disabled = !ok;
    $('pr-req').textContent = ok ? STR.replantReady(s.meta.bestWave) : STR.replantFrom(PRESTIGE.voluntaryWave);
    const b = document.getElementById('buy-btn') as HTMLButtonElement | null; if (b) b.disabled = !canBuy(s, NODE[this.tree.selected]);
    this.bossButton(); this.tierPicker();
  }

  private tier(): number { const top = this.game.state.meta.tier; return this.pickTier > 0 ? Math.min(this.pickTier, top) : top; }
  private stepTier(d: number): void { this.onCue('click'); this.pickTier = Math.max(1, Math.min(this.game.state.meta.tier, this.tier() + d)); this.tierPicker(); }
  private tierPicker(): void {
    const top = this.game.state.meta.tier, t = this.tier();
    $('camp-tier').hidden = top <= 1 || TIERS.max <= 1 || document.body.dataset.mode !== 'camp';
    $('tier-name').textContent = STR.tideName(t);
    ($('tier-down') as HTMLButtonElement).disabled = t <= 1; ($('tier-up') as HTMLButtonElement).disabled = t >= top;
  }

  private bossButton(): void {
    const s = this.game.state, el = $('dep-boss') as HTMLButtonElement, b = s.run.boss, n = bossesReady(s);
    el.hidden = !b && n <= 0; el.disabled = !canSummonBoss(s);
    el.querySelector('.n')!.textContent = b ? STR.bossRunning : STR.summonBoss;
    el.querySelector('.c')!.textContent = b ? STR.bossLeft(Math.ceil(BOSS_WAVE.secs - b.t), b.left) : STR.bossReadyN(n);
  }

  handleEvents(events: ReturnType<GameController['events']['drain']>): void {
    for (const e of events) {
      if (e.t === 'wave') this.toast(STR.waveN(e.wave));
      else if (e.t === 'kill' && e.kind === 'boss') this.toast(STR.bossFalls);
      else if (e.t === 'bossReady') this.toast(STR.bossReady);
      else if (e.t === 'bossStart') this.toast(STR.bossStart);
      // a tier unlocks on the same step a boss is cleared: one toast says both
      else if (e.t === 'bossEnd') { const up = events.find((x) => x.t === 'tierUnlocked'); this.toast(e.cleared ? STR.bossCleared(fmt(e.loot), e.hw) + (up && up.t === 'tierUnlocked' ? ' ' + STR.tierUnlocked(STR.tideName(up.tier)) : '') : STR.bossFailed); }
      else if (e.t === 'bought' && e.firstRank && e.id !== 'sharp') this.toast(STR.joins(NODE[e.id as keyof typeof NODE].name));
      else if (e.t === 'vanguardFell') this.toast(STR.vanFalls(VAN_NAME[e.type as VanType]));
      else if (e.t === 'barricadeRegrow') this.toast(STR.regrow);
      else if (e.t === 'loot' && e.kept && LOOT_TOAST.includes(e.rarity)) { const it = this.game.state.meta.loot.items.find((i) => i.uid === e.uid); if (it) this.toast(STR.lootFound(itemName(it))); }
      else if (e.t === 'barricadeFell') this.showFallen(e.chosen);
    }
  }

  private buy(id: keyof typeof NODE): void { if (this.game.buy(id)) this.renderDetail(); }

  renderDetail(): void {
    const s = this.game.state, n = NODE[this.tree.selected], lvl = rankOf(s, n.id), cost = costOf(s, n), maxed = lvl >= n.max, un = unlocked(s, n);
    $('detail').innerHTML = `
      <div class="branch" style="color:${BRANCH_COLOR[n.branch]}">${BRANCH_LABEL[n.branch]}${n.parent && !un ? ' · ' + STR.needs(NODE[n.parent].name) : ''}</div>
      <div class="name"><span>${n.name}</span><span style="font-size:0.8125rem;color:var(--cream-dim)">${n.max > 1 ? STR.rank(lvl, n.max) : lvl ? STR.learned : ''}</span></div>
      <div class="desc">${n.desc}</div>
      <div class="row"><span style="font-variant-numeric:tabular-nums;color:var(--amber)">${maxed ? STR.fullyGrown : n.base === 0 ? '' : STR.starlightCost(fmt(cost))}</span>
      <button class="buy" id="buy-btn" ${canBuy(s, n) ? '' : 'disabled'}>${maxed ? STR.complete : !un ? STR.locked : lvl ? STR.improve : STR.learn}</button></div>`;
    $('buy-btn').onclick = () => this.buy(n.id);
    this.tree.canvas.setAttribute('aria-label', STR.treeLabel(n.name));
  }

  /** run: the field fills the screen; camp: the Grove, Satchel and Replant pages after a fall; settings: an overlay mid-run. */
  setMode(m: 'run' | 'camp' | 'settings'): void {
    if (m !== 'camp') this.setTreeFull(false);
    document.body.dataset.mode = m;
    $('camp-go').hidden = m !== 'camp'; $('camp-close').hidden = m !== 'settings';
    $('camp-title').textContent = m === 'settings' ? STR.tabSettings : STR.campTitle;
    dispatchEvent(new Event('resize'));
    // The tree canvas has no size while hidden, so draw it once the camp page has laid out
    requestAnimationFrame(() => { this.tree.resize(); this.tree.draw(this.game.state, this.game.state.t); });
  }

  /** Show the whole skill tree over the window, or return to the normal Grove view (TB-189). */
  setTreeFull(on: boolean): void {
    document.body.classList.toggle('tree-full', on);
    const b = $('tree-full'); b.textContent = on ? STR.treeClose : STR.treeFull; b.setAttribute('aria-label', on ? STR.treeCloseLabel : STR.treeFullLabel);
    this.tree.setFull(on); this.tree.draw(this.game.state, this.game.state.t);
    if (on) this.tree.canvas.focus();
  }

  setTab(k: 'grove' | 'satchel' | 'prestige' | 'settings'): void {
    if (k !== 'grove') this.setTreeFull(false);
    for (const t of ['grove', 'satchel', 'prestige', 'settings'] as const) { $('pane-' + t).hidden = k !== t; $('tab-' + t).setAttribute('aria-selected', String(k === t)); }
  }

  /** Called after any settings change so main.ts can apply volume and motion. */
  onSettings: () => void = () => {};
  /** UI sounds with no sim event behind them (tab and node clicks, a refused buy). */
  onCue: (c: Cue) => void = () => {};

  private initSettings(): void {
    $('set-vol-k').textContent = STR.setVolume; $('set-motion-k').textContent = STR.setMotion; $('set-num-k').textContent = STR.setNumbers;
    const mo = $<HTMLSelectElement>('set-motion').options; mo[0]!.text = STR.motionSystem; mo[1]!.text = STR.motionFull; mo[2]!.text = STR.motionReduced;
    const no = $<HTMLSelectElement>('set-num').options; no[0]!.text = STR.numShort; no[1]!.text = STR.numSci;
    $('set-save-k').textContent = STR.setSave; $('set-save-hint').textContent = STR.exportHint;
    $('btn-export').textContent = STR.exportBtn; $('btn-import').textContent = STR.importBtn;
    this.syncSettings();
    $<HTMLInputElement>('set-vol').oninput = (e) => { this.game.settings.volume = Number((e.target as HTMLInputElement).value); this.settingsChanged(); };
    $<HTMLSelectElement>('set-motion').onchange = (e) => { const v = (e.target as HTMLSelectElement).value; this.game.settings.reducedMotion = v === 'sys' ? null : v === 'reduced'; this.settingsChanged(); };
    $<HTMLSelectElement>('set-num').onchange = (e) => { this.game.settings.numberFormat = (e.target as HTMLSelectElement).value as NumberFormat; this.settingsChanged(); };
    $('btn-export').onclick = () => {
      const blob = this.game.exportSave(), box = $<HTMLTextAreaElement>('set-blob'); box.value = blob; box.select();
      navigator.clipboard?.writeText(blob).then(() => this.toast(STR.exported), () => {});
    };
    $('btn-import').onclick = () => this.importSave();
    $('set-tel-k').textContent = STR.setTel; $('set-tel-hint').textContent = STR.telHint; $('btn-telemetry').textContent = STR.telBtn;
    $('btn-telemetry').onclick = () => {
      const { json, runs, loot } = this.game.telemetry(); if (!runs && !loot) { this.toast(STR.telNone); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = `tide-of-orcs-runs-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
      this.toast(STR.telSaved(runs));
    };
  }

  /** Reflect game.settings in the controls and the number formatter. */
  private syncSettings(): void {
    const set = this.game.settings;
    $<HTMLInputElement>('set-vol').value = String(set.volume);
    $<HTMLSelectElement>('set-motion').value = set.reducedMotion === null ? 'sys' : set.reducedMotion ? 'reduced' : 'full';
    $<HTMLSelectElement>('set-num').value = set.numberFormat;
    setNumberFormat(set.numberFormat);
  }

  private settingsChanged(): void { this.syncSettings(); this.onSettings(); this.game.save(); this.renderDetail(); }

  private importArmed = false;
  private importSave(): void {
    const btn = $('btn-import'), str = $<HTMLTextAreaElement>('set-blob').value;
    if (!str.trim()) return;
    if (!this.importArmed) { this.importArmed = true; btn.textContent = STR.importConfirm; setTimeout(() => { this.importArmed = false; btn.textContent = STR.importBtn; }, 4000); return; }
    this.importArmed = false; btn.textContent = STR.importBtn;
    try { this.game.importSave(str); } catch { this.toast(STR.importBad); return; }
    $('fallen').hidden = true; this.tree.selected = 'sharp'; this.renderHw(); this.syncSettings(); this.onSettings(); this.renderDetail();
    if (this.game.state.run.fallen) this.showFallen();
    this.toast(STR.imported);
  }

  private showFallen(chosen = false): void {
    $('fallen-title').textContent = chosen ? STR.pulledTitle : STR.fallenTitle;
    const r = this.game.state.run;
    $('fallen-sum').textContent = STR.fallenSummary(r.wave, fmt(r.kills), Math.floor(r.runTime / 60));
    $('fallen-rate').textContent = STR.fallenRate(fmt(r.earned / Math.max(1, r.runTime / 60)), this.game.state.meta.bestWave);
    // Items by rarity, rarest first, then the best drop in its rarity colour (TB-103)
    const counts = RARITIES.filter((k) => r.found?.[k]).reverse().map((k) => `${r.found![k]} ${STR.rarityName[k] ?? k}`).join(', ');
    $('fallen-loot').innerHTML = r.best ? STR.fallenLoot(counts, `<span class="best r-${r.best.rarity}">${itemName(r.best)}</span>`) : STR.fallenNoLoot;
    $('fallen-hw').textContent = '+' + gain(); $('fallen').hidden = false;
  }
  private doReplant(): void {
    const hw = this.game.replant(this.tier()); $('fallen').hidden = true; this.tree.selected = 'sharp'; this.renderDetail(); this.renderHw(); this.setMode('run');
    this.toast(STR.replanted(hw));
  }
  private wipe(): void {
    const btn = $('btn-reset');
    if (!this.wipeArmed) { this.wipeArmed = true; btn.textContent = STR.wipeConfirm; setTimeout(() => { this.wipeArmed = false; btn.textContent = STR.wipe; }, 4000); return; }
    this.game.wipe(); this.wipeArmed = false; btn.textContent = STR.wipe; $('fallen').hidden = true; this.setMode('run'); this.tree.selected = 'sharp'; this.renderDetail(); this.renderHw(); this.toast(STR.freshDawn);
  }

  toast(msg: string): void {
    const el = $('toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => el.classList.remove('on'), 2600);
  }
}
