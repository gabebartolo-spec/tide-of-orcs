import { PRESTIGE, VanType } from '../data/balance';
import { BRANCH_COLOR, NODE } from '../data/skillTree';
import { STR } from '../data/strings';
import type { Cue } from '../data/audio';
import { GameController } from '../game';
import { TreeRenderer } from '../render/tree';
import { canBuy, costOf, rankOf, unlocked } from '../sim/tree';
import { canRally, rallyCost } from '../sim/vanguard';
import { gain } from '../sim/prestige';
import { bossesReady, canSummonBoss } from '../sim/boss';
import { BOSS_WAVE } from '../data/bosses';
import { NumberFormat, fmt, setNumberFormat } from './format';
import { HW_NODE, HW_NODES, HwId } from '../data/heartwood';
import { canBuyHw, hwAvailable, hwCost, hwRank, hwUnlocked } from '../sim/heartwood';
import { SatchelPane, itemName } from './satchel';
import { LOOT_TOAST } from '../data/lootTables';
import { RARITIES } from '../data/loot';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const VAN_NAME: Record<VanType, string> = { spear: 'Spearman', blade: 'Bladedancer' };

export class Panel {
  private toastTimer = 0;
  private wipeArmed = false;
  private satchel: SatchelPane;

  constructor(private game: GameController, private tree: TreeRenderer) {
    // static copy
    $('hint').textContent = matchMedia('(pointer: coarse)').matches ? STR.hintTouch : STR.hint; $('tab-grove').textContent = STR.tabGrove; $('tab-prestige').textContent = STR.tabReplant;
    $('pr-title').textContent = STR.replantTitle; $('pr-body').textContent = STR.replantBody;
    $('btn-save').textContent = STR.saveNow;
    $('k-star').textContent = STR.starlight; $('k-wave').textContent = STR.wave; $('k-kills').textContent = STR.slain; $('k-heart').textContent = STR.heartwood;
    $('pr-gain-k').textContent = STR.replantGainK; $('pr-btn').textContent = STR.replantBtn;
    $('pr-each').innerHTML = STR.replantEach(Math.round(PRESTIGE.heartPerHW * 100)); $('pr-reset').textContent = STR.replantReset; $('pr-kept').textContent = STR.replantKept; $('btn-reset').textContent = STR.wipe; $('autosave').textContent = STR.autosave;
    $('fallen-title').textContent = STR.fallenTitle; $('fallen-hw-k').textContent = STR.fallenHW; $('fallen-btn').textContent = STR.fallenBtn;
    $('dep-spear').querySelector('.n')!.textContent = STR.rallySpear; $('dep-blade').querySelector('.n')!.textContent = STR.rallyBlade;
    $('dep-boss').querySelector('.n')!.textContent = STR.summonBoss;

    $('tab-settings').textContent = STR.tabSettings; $('tab-satchel').textContent = STR.tabSatchel;
    this.satchel = new SatchelPane(game); $('tab-satchel').onclick = () => { this.onCue('click'); this.setTab('satchel'); this.satchel.render(); };
    $('tab-grove').onclick = () => { this.onCue('click'); this.setTab('grove'); }; $('tab-prestige').onclick = () => { this.onCue('click'); this.setTab('prestige'); }; $('tab-settings').onclick = () => { this.onCue('click'); this.setTab('settings'); };
    this.initSettings();
    $('dep-spear').onclick = () => this.rally('spear'); $('dep-blade').onclick = () => this.rally('blade');
    $('dep-boss').onclick = () => { game.summonBoss(); };
    $('pr-btn').onclick = () => { if (game.canReplant() && !game.state.run.fallen) this.doReplant(); };
    $('fallen-btn').onclick = () => this.doReplant();
    $('btn-save').onclick = () => { game.save(); this.toast(STR.saved); };
    $('btn-reset').onclick = () => this.wipe();
    tree.canvas.addEventListener('click', (e) => {
      const id = tree.hitTest(e.clientX, e.clientY); if (!id) return;
      // A second click on the selected node buys it (the buy plays `bought`), or is denied.
      if (tree.selected === id) { if (canBuy(game.state, NODE[id])) this.buy(id); else this.onCue('denied'); } else this.onCue('click');
      tree.select(id); this.renderDetail();
    });
    $('hw-title').textContent = STR.hwTitle;
    $('hw-tree').onclick = (e) => { const id = (e.target as HTMLElement).closest('button')?.dataset.hw as HwId | undefined; if (id && game.buyHw(id)) { this.toast(STR.hwBought(HW_NODE[id].name)); this.renderHw(); } };
    this.renderDetail(); this.renderHw();
    if (game.state.run.fallen) this.showFallen();
  }

  /** Heartwood tree list on the Replant tab. Rebuilt on purchase and replant; update() refreshes the buttons. */
  renderHw(): void {
    const m = this.game.state.meta;
    $('hw-tree').innerHTML = HW_NODES.map((n) => { const r = hwRank(m, n.id), c = hwCost(m, n.id); return `
      <div class="hwnode"><div><div class="name">${n.name} <span class="desc">${STR.hwRank(r, n.costs.length)}</span></div><div class="desc">${n.desc}</div>${hwUnlocked(m, n.id) ? '' : `<div class="desc">${STR.hwNeeds((n.req ?? []).map(([r, k]) => `${HW_NODE[r].name} ${k}`).join(', '))}</div>`}</div>
      <button class="buy" data-hw="${n.id}" ${canBuyHw(m, n.id) ? '' : 'disabled'}>${c === null ? STR.complete : STR.hwCost(c)}</button></div>`; }).join('');
  }

  /** Called ~6 Hz. */
  update(): void {
    const s = this.game.state;
    $('st-star').textContent = fmt(s.run.starlight); $('st-wave').textContent = String(s.run.wave); $('st-kills').textContent = fmt(s.meta.lifetimeKills); $('st-heart').textContent = STR.heartAvail(hwAvailable(s.meta), s.meta.heartwood);
    $('hw-body').textContent = STR.hwBody(hwAvailable(s.meta));
    if (!$('pane-satchel').hidden) this.satchel.update();
    for (const b of $('hw-tree').querySelectorAll<HTMLButtonElement>('button[data-hw]')) b.disabled = !canBuyHw(s.meta, b.dataset.hw as HwId);
    const g = gain(s), ok = s.run.wave >= PRESTIGE.voluntaryWave && g > 0 && !s.run.fallen;
    $('pr-gain').textContent = '+' + g; ($('pr-btn') as HTMLButtonElement).disabled = !ok;
    $('pr-req').textContent = ok ? STR.replantReady(s.meta.bestWave) : STR.replantFrom(PRESTIGE.voluntaryWave);
    const b = document.getElementById('buy-btn') as HTMLButtonElement | null; if (b) b.disabled = !canBuy(s, NODE[this.tree.selected]);
    this.rallyButton('spear', $('dep-spear')); const bl = $('dep-blade'); bl.hidden = !s.stats.champion; if (s.stats.champion) this.rallyButton('blade', bl);
    this.bossButton();
  }

  private bossButton(): void {
    const s = this.game.state, el = $('dep-boss') as HTMLButtonElement, b = s.run.boss, n = bossesReady(s);
    el.hidden = !b && n <= 0; el.disabled = !canSummonBoss(s);
    el.querySelector('.n')!.textContent = b ? STR.bossRunning : STR.summonBoss;
    el.querySelector('.c')!.textContent = b ? STR.bossLeft(Math.ceil(BOSS_WAVE.secs - b.t), b.left) : STR.bossReadyN(n);
  }

  private rallyButton(type: VanType, el: HTMLElement): void {
    const s = this.game.state, c = el.querySelector('.c')!, btn = el as HTMLButtonElement;
    if (!s.stats.muster) { btn.disabled = true; c.textContent = STR.learnMuster; c.className = 'c dim'; return; }
    const full = s.vans.count >= s.stats.vanCap, cost = rallyCost(s, type);
    btn.disabled = !canRally(s, type);
    c.textContent = full ? STR.lineFull : STR.starlightCost(fmt(cost)); c.className = 'c' + (btn.disabled ? ' dim' : '');
  }

  handleEvents(events: ReturnType<GameController['events']['drain']>): void {
    for (const e of events) {
      if (e.t === 'wave') this.toast(STR.waveN(e.wave));
      else if (e.t === 'kill' && e.kind === 'boss') this.toast(STR.bossFalls);
      else if (e.t === 'bossReady') this.toast(STR.bossReady);
      else if (e.t === 'bossStart') this.toast(STR.bossStart);
      else if (e.t === 'bossEnd') this.toast(e.cleared ? STR.bossCleared(fmt(e.loot)) : STR.bossFailed);
      else if (e.t === 'bought' && e.firstRank && e.id !== 'sharp') this.toast(STR.joins(NODE[e.id as keyof typeof NODE].name));
      else if (e.t === 'vanguardRallied') this.toast(STR.takesField(VAN_NAME[e.type as VanType]));
      else if (e.t === 'vanguardFell') this.toast(STR.vanFalls(VAN_NAME[e.type as VanType]));
      else if (e.t === 'barricadeRegrow') this.toast(STR.regrow);
      else if (e.t === 'loot' && e.kept && LOOT_TOAST.includes(e.rarity)) { const it = this.game.state.meta.loot.items.find((i) => i.uid === e.uid); if (it) this.toast(STR.lootFound(itemName(it))); }
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
      <div class="row"><span style="font-variant-numeric:tabular-nums;color:var(--amber)">${maxed ? STR.fullyGrown : n.base === 0 ? '' : STR.starlightCost(fmt(cost))}</span>
      <button class="buy" id="buy-btn" ${canBuy(s, n) ? '' : 'disabled'}>${maxed ? STR.complete : !un ? STR.locked : lvl ? STR.improve : STR.learn}</button></div>`;
    $('buy-btn').onclick = () => this.buy(n.id);
  }

  setTab(k: 'grove' | 'satchel' | 'prestige' | 'settings'): void {
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

  private showFallen(): void {
    const r = this.game.state.run;
    $('fallen-sum').textContent = STR.fallenSummary(r.wave, fmt(r.kills), Math.floor(r.runTime / 60));
    $('fallen-rate').textContent = STR.fallenRate(fmt(r.earned / Math.max(1, r.runTime / 60)), this.game.state.meta.bestWave);
    // Items by rarity, rarest first, then the best drop in its rarity colour (TB-103)
    const counts = RARITIES.filter((k) => r.found?.[k]).reverse().map((k) => `${r.found![k]} ${STR.rarityName[k] ?? k}`).join(', ');
    $('fallen-loot').innerHTML = r.best ? STR.fallenLoot(counts, `<span class="best r-${r.best.rarity}">${itemName(r.best)}</span>`) : STR.fallenNoLoot;
    $('fallen-hw').textContent = '+' + gain(this.game.state); $('fallen').hidden = false;
  }
  private doReplant(): void {
    const hw = this.game.replant(); $('fallen').hidden = true; this.tree.selected = 'sharp'; this.renderDetail(); this.renderHw(); this.setTab('grove');
    this.toast(STR.replanted(hw));
  }
  private wipe(): void {
    const btn = $('btn-reset');
    if (!this.wipeArmed) { this.wipeArmed = true; btn.textContent = STR.wipeConfirm; setTimeout(() => { this.wipeArmed = false; btn.textContent = STR.wipe; }, 4000); return; }
    this.game.wipe(); this.wipeArmed = false; btn.textContent = STR.wipe; $('fallen').hidden = true; this.tree.selected = 'sharp'; this.renderDetail(); this.renderHw(); this.toast(STR.freshDawn);
  }

  toast(msg: string): void {
    const el = $('toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => el.classList.remove('on'), 2600);
  }
}
