import { tabTitle, type Tab } from './tabTitle';
import { PRESTIGE, VanType } from '../data/balance';
import { CONFIRM_ARM_MS } from '../data/settings';
import { BRANCH_COLOR, BRANCH_LABEL, NODE } from '../data/skillTree';
import { STR } from '../data/strings';
import type { Cue } from '../data/audio';
import { GameController } from '../game';
import { TreeRenderer } from '../render/tree';
import { stepNode, tabOrder } from '../render/treeNav';
import { canBuy, costOf, rankOf, unlocked } from '../sim/tree';
import { bossesReady, canSummonBoss } from '../sim/boss';
import { BOSS_WAVE, TIERS } from '../data/bosses';
import { fitPages } from './fit';
import { NumberFormat, fmt, setNumberFormat } from './format';
import { HW_NODE, HW_NODES, HwId } from '../data/heartwood';
import { canBuyHw, hwCost, hwRank, hwSpendable, hwUnlocked } from '../sim/heartwood';
import { SatchelPane, itemName } from './satchel';
import { glyph } from './glyphs';
import { LOOT_BANNER, REPORT } from '../data/presentation';
import { LOOT_TOAST } from '../data/lootTables';
import { RARITIES } from '../data/loot';
import { applyTextScale } from '../render/textScale';
import { CampPane } from './camp';
import { armHover, burst, calm, countValue, pop, press, tween } from './juice';
import { reportRows, reportTimes } from './report';
import { uiSound } from '../data/audio';
import { Hud } from './hud';
import { Plate, oneLine, plateRows } from './plate';
import { PathPicker, pathHint } from './paths';
import { PATHS } from '../data/paths';
import { drawSigil } from '../render/sigil';
import { TimerBag } from './timerBag';
import { P } from '../render/palette';

/** Buy sparks (TB-195b): starlight gold, frost blue, grove green and lilac, so they read against the gold button. */
const BUY_SPARKS = [P.starGold, P.frost, P.grove, P.lilac] as const;

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const VAN_NAME: Record<VanType, string> = { spear: 'Spearman', blade: 'Bladedancer' };

export class Panel {
  private toastTimer = 0;
  private wipeArmed = false;
  private satchel: SatchelPane;
  /** Encampment card and Replant-tab list (TB-188b). */
  readonly camp: CampPane;
  /** Path cards on the Replant tab (TB-193c). */
  private paths: PathPicker;
  /** Boss tier picked for the next March (TB-148); 0 means the highest unlocked. */
  private pickTier = 0;
  /** Field HUD: starlight gem, wave banner, wall bar (TB-195b). */
  private hud = new Hud(fmt);

  constructor(private game: GameController, private tree: TreeRenderer) {
    // static copy
    $('tab-grove').textContent = STR.tabGrove; $('tab-camp').textContent = STR.tabCamp; $('tab-prestige').textContent = STR.tabReplant;
    $('paths-title').textContent = STR.pathsTitle;
    $('k-wave').textContent = STR.wave; $('k-kills').textContent = STR.slain; $('k-heart').textContent = STR.heartwood;
    $('btn-reset').textContent = STR.wipe;
    $('fallen-title').textContent = STR.fallenTitle; $('fallen-hw-k').textContent = STR.fallenHW; $('fallen-btn').textContent = STR.fallenToCamp;
    $('camp-title').textContent = STR.campTitle; $('camp-go').textContent = STR.campGo; $('camp-close').textContent = STR.campClose; $('btn-settings').textContent = STR.tabSettings;
    $('dep-boss').querySelector('.n')!.textContent = STR.summonBoss;

    $('tab-settings').textContent = STR.tabSettings; $('tab-satchel').innerHTML = `${STR.tabSatchel}<span class="badge" id="sat-new" hidden></span>`;
    armHover(document.body); // TB-195k
    // TB-195k: an equip lands with the stamp under its chime
    this.satchel = new SatchelPane(game, (c) => { this.onCue(c); if (c === 'equip' || c === 'setRise') this.onCue('uiStamp'); }); $('tab-satchel').onclick = () => { this.onCue('uiPop'); this.setTab('satchel'); this.satchel.render(); this.markNew(0); };
    fitPages([$('pane-satchel'), $('pane-prestige'), $('pane-settings')]);
    $('tab-grove').onclick = () => { this.onCue('uiPop'); this.setTab('grove'); }; $('tab-camp').onclick = () => { this.onCue('uiPop'); this.setTab('camp'); }; $('tab-prestige').onclick = () => { this.onCue('uiPop'); this.setTab('prestige'); }; $('tab-settings').onclick = () => { this.onCue('uiPop'); this.setTab('settings'); };
    this.initSettings();
    $('dep-boss').onclick = () => { game.summonBoss(); };
    // After a fall the field gives way to the Grove page (TB-136): the tree and satchel are spent between runs
    $('fallen-btn').onclick = () => { this.onCue('click'); this.setMode('camp'); this.setTab('grove'); };
    $('camp-go').onclick = () => { if (game.state.run.fallen) this.doReplant(); };
    $('tier-down').textContent = '‹'; $('tier-up').textContent = '›'; $('tier-down').setAttribute('aria-label', STR.tierDown); $('tier-up').setAttribute('aria-label', STR.tierUp);
    $('tier-down').onclick = () => this.stepTier(-1); $('tier-up').onclick = () => this.stepTier(1);
    $('btn-pullback').textContent = STR.pullBack;
    $('btn-pullback').onclick = () => { this.onCue('click'); this.game.pullBack(); };
    $('btn-settings').onclick = () => { this.onCue('click'); this.setMode('settings'); this.setTab('settings'); };
    $('camp-close').onclick = () => { this.onCue('click'); this.setMode('run'); };
    $('btn-reset').onclick = () => this.wipe();
    tree.canvas.addEventListener('click', (e) => {
      const id = tree.hitTest(e.clientX, e.clientY); if (!id) return;
      // A second click on the selected node buys it (the buy plays `bought`), or is denied.
      if (tree.selected === id) { if (canBuy(game.state, NODE[id])) this.buy(id); else this.onCue('denied'); } else this.onCue('click');
      tree.select(id); this.renderDetail();
    });
    // Tooltip plate (TB-195c): hovering a node shows what its next rank changes, beside the cursor
    const plate = new Plate();
    tree.canvas.addEventListener('mousemove', (e) => { const id = tree.hitTest(e.clientX, e.clientY); if (id) plate.show(id + ':' + rankOf(game.state, id), this.plateHtml(id), e.clientX, e.clientY); else plate.hide(); });
    tree.canvas.addEventListener('mouseleave', () => plate.hide());
    tree.canvas.addEventListener('click', () => plate.hide());
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
    this.camp = new CampPane(game, $('bcard'), $('camp-list'), (msg) => { this.onCue('bought'); this.toast(msg); });
    this.paths = new PathPicker($('paths'), () => game.state, (p) => game.choosePath(p),
      (p) => { this.onCue(p ? 'uiPath' : 'click'); this.toast(p ? STR.pathChosen(PATHS[p].name) : STR.pathCleared); this.renderDetail(); }, drawSigil);
    this.renderDetail(); this.renderHw(); this.camp.render(); this.paths.render(); this.setMode('run');
    if (game.state.run.fallen) this.showFallen();
  }

  /** Heartwood tree list on the Replant tab. Rebuilt on purchase and replant; update() refreshes the buttons. */
  renderHw(): void {
    const s = this.game.state, m = s.meta;
    $('hw-tree').innerHTML = HW_NODES.map((n) => { const r = hwRank(m, n.id), c = hwCost(m, n.id); return `
      <div class="hwnode"><div><div class="name" title="${n.desc}">${n.name} <span class="rk">${STR.hwRank(r, n.costs.length)}</span></div><div class="desc" title="${n.stat}">${hwUnlocked(m, n.id) ? n.stat : STR.hwNeeds((n.req ?? []).map(([r, k]) => `${HW_NODE[r].name} ${k}`).join(', '))}</div></div>
      <button class="buy" data-hw="${n.id}" ${canBuyHw(s, n.id) ? '' : 'disabled'}>${c === null ? STR.complete : STR.hwCost(c)}</button></div>`; }).join('');
  }

  /** Called ~6 Hz. */
  update(): void {
    const s = this.game.state;
    this.hud.starlight(s.run.starlight); this.hud.wall(s.run.barHp, s.stats.barMax, STR.barricadeHud(fmt(Math.max(0, s.run.barHp)), fmt(s.stats.barMax))); $('hud-van').hidden = !s.stats.muster; if (s.stats.muster) $('hud-van').textContent = STR.vanguardHud(s.vans.count, s.stats.vanCap); $('st-wave').textContent = s.run.tier > 1 ? STR.waveTide(s.run.wave, STR.tideName(s.run.tier)) : String(s.run.wave); $('st-kills').textContent = fmt(s.meta.lifetimeKills); $('st-heart').textContent = STR.heartAvail(hwSpendable(s));
    if (!$('pane-satchel').hidden) this.satchel.update();
    for (const b of $('hw-tree').querySelectorAll<HTMLButtonElement>('button[data-hw]')) b.disabled = !canBuyHw(s, b.dataset.hw as HwId);
    this.camp.update(); this.paths.update();
    const ok = s.run.wave >= PRESTIGE.voluntaryWave && !s.run.fallen;
    $('btn-pullback').hidden = !ok;

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
      if (e.t === 'wave') this.hud.waveCleared();
      else if (e.t === 'kill' && e.kind === 'boss') this.toast(STR.bossFalls);
      else if (e.t === 'bossReady') this.toast(STR.bossReady);
      else if (e.t === 'bossStart') this.toast(STR.bossStart);
      // a tier unlocks on the same step a boss is cleared: one toast says both
      else if (e.t === 'bossEnd') { const up = events.find((x) => x.t === 'tierUnlocked'); this.toast(e.cleared ? STR.bossCleared(fmt(e.loot), e.hw) + (up && up.t === 'tierUnlocked' ? ' ' + STR.tierUnlocked(STR.tideName(up.tier)) : '') : STR.bossFailed); }
      else if (e.t === 'bought' && e.firstRank && e.id !== 'sharp') this.toast(STR.joins(NODE[e.id as keyof typeof NODE].name));
      else if (e.t === 'vanguardFell') this.toast(STR.vanFalls(VAN_NAME[e.type as VanType]));
      else if (e.t === 'barricadeRegrow') this.toast(STR.regrow);
      else if (e.t === 'loot' && e.kept && LOOT_TOAST.includes(e.rarity)) { const it = this.game.state.meta.loot.items.find((i) => i.uid === e.uid); if (it) { this.lootBanner(it); if ($('pane-satchel').hidden) this.markNew(this.newItems + 1); } }
      else if (e.t === 'barricadeFell') this.showFallen(e.chosen);
    }
  }

  /** Items kept since the Satchel was last opened (TB-192); a session count, not saved, so no schema change. */
  private newItems = 0;
  private markNew(n: number): void { this.newItems = n; const b = $('sat-new'); b.hidden = n === 0; b.textContent = STR.newItems(n); }

  /** A kept drop's card (TB-192): icon, name and rarity under the toast, for LOOT_BANNER.life seconds by rarity. */
  private lootBanner(it: Parameters<typeof itemName>[0]): void {
    const box = $('loot-banners'), el = document.createElement('div');
    el.className = `lootbanner r-${it.rarity}`;
    el.innerHTML = `${glyph(it.slot, it, true)}<span class="txt"><span class="rar">${STR.rarityName[it.rarity] ?? it.rarity}</span><span class="nm">${STR.lootFound(itemName(it))}</span></span>`;
    box.prepend(el);
    if (LOOT_BANNER.reveal.includes(it.rarity)) this.onCue('uiRarity'); // TB-195k: the reveal shimmer, rare and up
    while (box.children.length > LOOT_BANNER.max) box.lastElementChild!.remove();
    setTimeout(() => el.remove(), (LOOT_BANNER.life[it.rarity] ?? LOOT_BANNER.life.common!) * 1000);
  }

  private buy(id: keyof typeof NODE): void {
    const btn = document.getElementById('buy-btn');
    if (!this.game.buy(id)) return;
    this.onCue('uiStamp'); // TB-195k: a buy stamps
    if (btn) { press(btn); const b = btn.getBoundingClientRect(); burst(b.left - b.width * 1.35, b.top + b.height * 0.05, BUY_SPARKS, 0.7); } // TB-195a: press plus a burst on every buy (TB-195b: multi-hue, left of the label)
    this.renderDetail();
  }

  /** A node's tooltip plate: name and rank, now → next rows, the cost as a gem chip, one line of flavour. */
  private plateHtml(id: keyof typeof NODE): string {
    const s = this.game.state, n = NODE[id], lvl = rankOf(s, id), maxed = lvl >= n.max, un = unlocked(s, n);
    const rows = maxed ? [] : plateRows(...((p) => [p.now, p.next] as const)(this.game.previewNode(id)));
    return `<div class="ph"><span class="nm">${n.name}</span>${n.max > 1 ? `<span class="rk">${STR.rank(lvl, n.max)}</span>` : ''}</div>`
      + (rows.length ? `<div class="pk">${STR.plateNext}</div>` + rows.map((r) => `<div class="pr"><span class="pl">${r.label}</span><span class="pn">${r.now}</span><span class="pa">→</span><span class="px ${r.up ? 'up' : 'down'}">${r.next}</span></div>`).join('') : '')
      + `<div class="pf">${oneLine(n.desc)}</div>`
      + `<div class="pc">${maxed ? `<span class="done">${STR.plateMax}</span>` : !un && n.parent ? `<span class="lock">${STR.plateLocked(NODE[n.parent].name)}</span>` : n.base === 0 ? '' : `<span class="chip">${fmt(costOf(s, n))}</span>`}</div>`;
  }

  renderDetail(): void {
    const s = this.game.state, n = NODE[this.tree.selected], lvl = rankOf(s, n.id), cost = costOf(s, n), maxed = lvl >= n.max, un = unlocked(s, n), hint = pathHint(s, n);
    $('detail').innerHTML = `
      <div class="branch"${n.path ? ` data-path="${n.path}"` : ` style="color:${BRANCH_COLOR[n.branch]}"`}>${n.path ? PATHS[n.path].name : BRANCH_LABEL[n.branch]}${hint ? ' · ' + hint : n.parent && !un ? ' · ' + STR.needs(NODE[n.parent].name) : ''}</div>
      <div class="name"><span>${n.name}</span><span style="font-size:0.875rem;color:var(--cream-dim)">${n.max > 1 ? STR.rank(lvl, n.max) : lvl ? STR.learned : ''}</span></div>
      <div class="desc" title="${n.desc}">${oneLine(n.desc)}</div>
      <div class="row"><span style="font-variant-numeric:tabular-nums;color:var(--amber)">${maxed ? STR.fullyGrown : n.base === 0 ? '' : STR.starlightCost(fmt(cost))}</span>
      <button class="buy" id="buy-btn" ${canBuy(s, n) ? '' : 'disabled'}>${maxed ? STR.complete : !un ? STR.locked : lvl ? STR.improve : STR.learn}</button></div>`;
    $('buy-btn').onclick = () => this.buy(n.id);
    this.tree.canvas.setAttribute('aria-label', STR.treeLabel(n.name));
  }

  /** run: the field fills the screen; camp: the Grove, Satchel and Replant pages after a fall; settings: an overlay mid-run. */
  setMode(m: 'run' | 'camp' | 'settings'): void {
    if (m !== 'camp') this.setTreeFull(false);
    if (document.body.dataset.mode !== m) this.onCue('uiPanel'); // TB-195g: the panel whoosh
    document.body.dataset.mode = m;
    $('camp-go').hidden = m !== 'camp'; $('camp-close').hidden = m !== 'settings';
    $('camp-title').textContent = tabTitle(this.tab);
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

  private tab: Tab = 'grove';
  setTab(k: Tab): void {
    this.tab = k; $('camp-title').textContent = tabTitle(k); $('camp-go').textContent = k === 'prestige' ? STR.replantBtn : STR.campGo; document.body.dataset.tab = k;
    if (k !== 'camp') this.camp.close();
    if (k !== 'grove') this.setTreeFull(false);
    for (const t of ['grove', 'satchel', 'camp', 'prestige', 'settings'] as const) { $('pane-' + t).hidden = k !== t; $('tab-' + t).setAttribute('aria-selected', String(k === t)); }
  }

  /** Called after any settings change so main.ts can apply volume and motion. */
  onSettings: () => void = () => {};
  /** UI sounds with no sim event behind them (tab and node clicks, a refused buy). */
  onCue: (c: Cue) => void = () => {};

  private initSettings(): void {
    $('set-vol-k').textContent = STR.setVolume; $('set-motion-k').textContent = STR.setMotion; $('set-num-k').textContent = STR.setNumbers; $('set-text-k').textContent = STR.setText;
    const mo = $<HTMLSelectElement>('set-motion').options; mo[0]!.text = STR.motionSystem; mo[1]!.text = STR.motionFull; mo[2]!.text = STR.motionReduced;
    const no = $<HTMLSelectElement>('set-num').options; no[0]!.text = STR.numShort; no[1]!.text = STR.numSci;
    $('set-save-k').textContent = STR.setSave;
    $('btn-export').textContent = STR.exportBtn; $('btn-import').textContent = STR.importBtn;
    this.syncSettings();
    // Sliders apply on every input but save once on release (TB-199).
    $<HTMLInputElement>('set-vol').oninput = (e) => { this.game.settings.volume = Number((e.target as HTMLInputElement).value); $('set-vol-v').textContent = `${Math.round(this.game.settings.volume * 100)}%`; this.settingsApplied(); };
    $<HTMLInputElement>('set-vol').onchange = () => this.game.save();
    $<HTMLSelectElement>('set-motion').onchange = (e) => { const v = (e.target as HTMLSelectElement).value; this.game.settings.reducedMotion = v === 'sys' ? null : v === 'reduced'; this.settingsChanged(); };
    $<HTMLInputElement>('set-text').oninput = (e) => { this.game.settings.textScale = Number((e.target as HTMLInputElement).value); this.settingsApplied(); };
    $<HTMLInputElement>('set-text').onchange = () => this.game.save();
    $<HTMLSelectElement>('set-num').onchange = (e) => { this.game.settings.numberFormat = (e.target as HTMLSelectElement).value as NumberFormat; this.settingsChanged(); };
    $('btn-export').onclick = () => {
      const blob = this.game.exportSave(), box = $<HTMLTextAreaElement>('set-blob'); box.value = blob; box.select();
      navigator.clipboard?.writeText(blob).then(() => this.toast(STR.exported), () => {});
    };
    $('btn-import').onclick = () => this.importSave();
    $('set-tel-k').textContent = STR.setTel; $('btn-telemetry').textContent = STR.telBtn;
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
    $<HTMLInputElement>('set-vol').value = String(set.volume); $('set-vol-v').textContent = `${Math.round(set.volume * 100)}%`;
    $<HTMLSelectElement>('set-motion').value = set.reducedMotion === null ? 'sys' : set.reducedMotion ? 'reduced' : 'full';
    $<HTMLSelectElement>('set-num').value = set.numberFormat;
    $<HTMLInputElement>('set-text').value = String(set.textScale); $('set-text-v').textContent = `${Math.round(set.textScale * 100)}%`;
    applyTextScale(set.textScale);
    setNumberFormat(set.numberFormat);
  }

  private settingsApplied(): void { this.syncSettings(); this.onSettings(); this.renderDetail(); }
  private settingsChanged(): void { this.settingsApplied(); this.game.save(); }

  private importArmed = false;
  private importTimer = 0;
  private wipeTimer = 0;
  private reportTimers = new TimerBag();
  /** After an import or wipe the old satchel pick, new-loot badge (TB-199) and tide pick (TB-216b) belong to the old game. */
  private resetSatchelView(): void { this.satchel.selected = null; this.markNew(0); this.pickTier = 0; }
  private importSave(): void {
    const btn = $('btn-import'), str = $<HTMLTextAreaElement>('set-blob').value;
    if (!str.trim()) return;
    if (!this.importArmed) { this.importArmed = true; btn.textContent = STR.importConfirm; clearTimeout(this.importTimer); this.importTimer = window.setTimeout(() => { this.importArmed = false; btn.textContent = STR.importBtn; }, CONFIRM_ARM_MS); return; }
    clearTimeout(this.importTimer); this.importArmed = false; btn.textContent = STR.importBtn;
    try { this.game.importSave(str); } catch { this.toast(STR.importBad); return; }
    this.reportTimers.clear(); $('fallen').hidden = true; this.tree.selected = 'sharp'; this.resetSatchelView(); this.renderHw(); this.syncSettings(); this.onSettings(); this.renderDetail();
    // a fallen import stays in camp (the run is frozen); a standing one returns to the field so the ticking run is seen
    this.setMode(this.game.state.run.fallen ? 'camp' : 'run');
    if (this.game.state.run.fallen) this.showFallen();
    this.toast(STR.imported);
  }

  private showFallen(chosen = false): void {
    $('fallen-title').textContent = chosen ? STR.pulledTitle : STR.fallenTitle;
    const r = this.game.state.run;
    // Items by rarity, rarest first, then the best drop in its rarity colour (TB-103)
    const counts = RARITIES.filter((k) => r.found?.[k]).reverse().map((k) => `${r.found![k]} ${STR.rarityName[k] ?? k}`).join(', ');
    $('fallen-loot').innerHTML = r.best ? STR.fallenLoot(counts, `<span class="best r-${r.best.rarity}">${itemName(r.best)}</span>`) : STR.fallenNoLoot;
    // battle report (TB-195f): tallies roll up one by one, then Heartwood, then the wax seal stamps on
    const rows = reportRows(r, this.game.state.meta.bestWave), when = reportTimes(rows.length, calm());
    const list = $('fallen-rows'); list.textContent = '';
    const cells = rows.map((row) => { const d = document.createElement('div'), k = document.createElement('dt'), v = document.createElement('dd');
      k.textContent = row.label; v.textContent = calm() ? fmt(row.value) : '0'; d.append(k, v); list.appendChild(d); return v; });
    const hw = $('fallen-hw'), seal = $('fallen-seal'), board = $('fallen-board');
    hw.textContent = '+' + (calm() ? fmt(r.hwEarned) : '0'); seal.classList.toggle('on', calm());
    this.reportTimers.clear();
    if (!calm()) {
      const roll = (el: HTMLElement, to: number, pre: string): void => { uiSound('uiCount'); tween(el, REPORT.roll, (t) => { el.textContent = pre + fmt(Math.round(countValue(0, to, t))); }, () => { el.textContent = pre + fmt(to); pop(el); }); };
      rows.forEach((row, i) => this.reportTimers.add(() => roll(cells[i]!, row.value, ''), when.rows[i]!));
      this.reportTimers.add(() => roll(hw, r.hwEarned, '+'), when.hw);
      this.reportTimers.add(() => {
        seal.classList.add('on'); uiSound('uiStamp');
        tween(seal, REPORT.stampIn, (t) => { const k = 1 - t * t; seal.style.transform = t >= 1 ? '' : `scale(${1 + (REPORT.stampFrom - 1) * k}) rotate(${REPORT.stampTurn * k}deg)`; seal.style.opacity = String(Math.min(1, t * 3)); },
          () => tween(board, REPORT.joltMs, (t) => { board.style.transform = t >= 1 ? '' : `translateY(${Math.sin(t * Math.PI * 3) * (1 - t) * REPORT.jolt}rem)`; }));
      }, when.stamp);
    }
    $('fallen').hidden = false;
  }
  private doReplant(): void {
    this.reportTimers.clear(); const hw = this.game.replant(this.tier()); $('fallen').hidden = true; this.tree.selected = 'sharp'; this.renderDetail(); this.renderHw(); this.setMode('run');
    this.toast(STR.replanted(hw));
  }
  private wipe(): void {
    const btn = $('btn-reset');
    if (!this.wipeArmed) { this.wipeArmed = true; btn.textContent = STR.wipeConfirm; clearTimeout(this.wipeTimer); this.wipeTimer = window.setTimeout(() => { this.wipeArmed = false; btn.textContent = STR.wipe; }, CONFIRM_ARM_MS); return; }
    clearTimeout(this.wipeTimer); this.reportTimers.clear(); this.game.wipe(); this.resetSatchelView(); this.wipeArmed = false; btn.textContent = STR.wipe; $('fallen').hidden = true; this.setMode('run'); this.tree.selected = 'sharp'; this.renderDetail(); this.renderHw(); this.toast(STR.freshDawn);
  }

  toast(msg: string): void {
    const el = $('toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => el.classList.remove('on'), 2600);
  }
}
