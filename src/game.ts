/**
 * GameController: the only thing allowed to call into sim/ from the UI.
 * Owns the SimState, the event bus, and save/load.
 */
import { NodeId } from './data/skillTree';
import { EventBus } from './sim/events';
import { canPullBack, canReplant, choosePath, pullBack, replant } from './sim/prestige';
import { PathId } from './data/paths';
import { SimState, createState, freshMeta, freshRun, recompute } from './sim/state';
import { Inputs, step } from './sim/step';
import { buy } from './sim/tree';
import { restartBoss, summonBoss } from './sim/boss';
import { castFireball } from './sim/combat';
import { buyHw, placeStandingOrders, repairHeartwood } from './sim/heartwood';
import { upgradeBuilding } from './sim/camp';
import { BuildingId } from './data/camp';
import { HwId } from './data/heartwood';
import { equip, reroll, salvage, setFilter, toggleHeirloom, toggleLock } from './sim/loot';
import { ownedAffixes } from './sim/lootRoll';
import { Rarity } from './data/loot';
import { Save, CURRENT_VERSION, sanitizeSettings } from './save/schema';
import { clearLoadFailed, clearSave, markLoadFailed, exportSave, importSave, readSave, writeSave } from './save/storage';
import { LootKind, LootRecord, appendLoot, appendTelemetry, lootRecord, lootStart, readLoot, readTelemetry, runRecord, telemetryJson } from './save/telemetry';
import { applyGear, setTiers } from './sim/gear';
import { Stats, deriveStats } from './sim/stats';
import { SimEvent } from './sim/events';
import { gain } from './sim/prestige';
import type { CosmeticId, CosmeticSlot } from './data/achievements';
import { setTitle, sweepAchievements, trackAchievements, wearCosmetic } from './sim/achievements';

/** A fresh RNG seed from the clock: boot, import and wipe all use it, so no two games share a roll sequence (TB-216b). */
export const clockSeed = (): number => (Date.now() % 2147483647) | 0;

/** Build the sim from a migrated save the way every load does; a boss wave in progress starts over (TB-216b). */
function loadState(seed: number, save: Save): SimState {
  const s = createState(seed, { ...freshRun(), ...save.run }, { ...freshMeta(), ...save.meta });
  repairHeartwood(s.meta); restartBoss(s); placeStandingOrders(s);
  return s;
}

export class GameController {
  state: SimState;
  readonly events = new EventBus();
  settings = sanitizeSettings(null);
  /** Current pointer aim on the field in logical coordinates, or null. Set by the UI every frame it changes. */
  aim: { x: number; y: number } | null = null;
  /** A press-and-release that fits between two frames still counts as aiming for one sim tick (TB-218 I3); no hold-fire timer. */
  private latch: { x: number; y: number } | null = null;
  /** Loot telemetry (TB-107) waits here and is written with each save, not per drop. */
  private lootLog: LootRecord[] = [];

  constructor(seed = clockSeed()) {
    const save = readSave();
    let state: SimState | null = null;
    // a save that migrates but has the wrong shape fails like an unreadable one: backed up, writes blocked (TB-199, TB-216b)
    if (save) try { state = loadState(seed, save); this.settings = sanitizeSettings(save.settings); } catch { markLoadFailed(); }
    this.state = state ?? createState(seed);
    this.announce(sweepAchievements(this.state));
  }

  tick(dt: number): void {
    const inputs: Inputs = { aim: this.state.run.fallen ? null : this.aim ?? this.latch };
    this.latch = null;
    step(this.state, dt, inputs, this.events);
  }

  setAim(x: number, y: number): void { this.aim = this.latch = { x, y }; }
  /** The finger lifted: aim ends, but a press no tick has seen yet is still honoured once. */
  clearAim(): void { this.aim = null; }
  /** Aim ends at once, with no latch: a cancelled touch, a blurred window, a hidden page. */
  dropAim(): void { this.aim = this.latch = null; }
  buy(id: NodeId): boolean { return buy(this.state, this.events, id); }
  /** Tooltip plate preview (TB-195c): the stats now and with one more rank of id. Read-only. */
  previewNode(id: NodeId): { now: Stats; next: Stats } {
    const s = this.state, lv = { ...s.run.levels, [id]: (s.run.levels[id] ?? 0) + 1 };
    return { now: s.stats, next: applyGear(deriveStats(lv, s.meta.hwLevels, s.meta.camp.levels, s.run.path ?? null), s.meta.loot) };
  }
  buyHw(id: HwId): boolean { const ok = buyHw(this.state, this.events, id); if (ok) this.save(); return ok; }
  /** Encampment intent (TB-188a): raise a building one level; saves on success. */
  upgradeBuilding(id: BuildingId): boolean { const ok = upgradeBuilding(this.state, this.events, id); if (ok) this.save(); return ok; }
  /** Satchel intents (TB-096): equipping recomputes Stats; every change saves. */
  equipItem(uid: string): boolean {
    const s = this.state, tiers = setTiers(s.meta.loot, s.stats.setBoost), ok = equip(s.meta.loot, uid);
    if (!ok) return ok;
    recompute(s); this.logItem('equip', uid); this.events.push({ t: 'equip' });
    const now = setTiers(s.meta.loot, s.stats.setBoost), set = s.meta.loot.items.find((i) => i.uid === uid)?.set;
    if (now > tiers) this.logLoot('set', { tiers: now, ...(set ? { set } : {}) });
    this.save(); return ok;
  }
  salvageItem(uid: string): boolean { this.logItem('salvage', uid); const ok = salvage(this.state.meta.loot, uid, this.state.stats); if (ok) { this.events.push({ t: 'salvage' }); this.save(); } else this.lootLog.pop(); return ok; }
  heirloomItem(uid: string): boolean { const ok = toggleHeirloom(this.state.meta.loot, uid); if (ok) this.save(); return ok; }
  rerollItem(uid: string, i: number): boolean { const s = this.state, ok = reroll(s.meta.loot, uid, i, s.lootRng, s.stats.rerollMult, ownedAffixes(s.stats)); if (ok) { recompute(s); this.logItem('reroll', uid, { affix: i }); this.events.push({ t: 'reroll' }); this.save(); } return ok; }

  /** Feed each frame's drained sim events (main loop): drops become loot telemetry; achievement checks run (TB-249). */
  noteEvents(events: readonly SimEvent[]): void {
    for (const e of events) if (e.t === 'loot') this.logLoot('drop', { rarity: e.rarity, kept: e.kept });
    this.announce(trackAchievements(this.state, events, this.state.achPend));
  }
  /** Newly earned achievements reach field, panel and audio as events next frame, and are saved at once. */
  private announce(ids: readonly string[]): void {
    if (!ids.length) return;
    for (const id of ids) this.events.push({ t: 'achievement', id });
    this.save();
  }
  /** Wear an earned title on the HUD tag, or none (TB-249). */
  setTitle(id: string | null): boolean { const ok = setTitle(this.state, id); if (ok) this.save(); return ok; }
  /** Wear an earned cosmetic in its slot, or clear the slot (TB-250). */
  wearCosmetic(slot: CosmeticSlot, id: CosmeticId | null): boolean { const ok = wearCosmetic(this.state, slot, id); if (ok) this.save(); return ok; }
  private logLoot(kind: LootKind, extra: Partial<LootRecord>): void { const now = Date.now(); this.lootLog.push(lootRecord(this.state, kind, extra, now, lootStart(now))); }
  private logItem(kind: LootKind, uid: string, extra: Partial<LootRecord> = {}): void {
    const it = this.state.meta.loot.items.find((i) => i.uid === uid);
    this.logLoot(kind, { ...(it ? { rarity: it.rarity, slot: it.slot, base: it.base, ...(it.set ? { set: it.set } : {}) } : {}), ...extra });
  }
  lockItem(uid: string): boolean { const ok = toggleLock(this.state.meta.loot, uid); if (ok) this.save(); return ok; }
  setLootFilter(r: Rarity): boolean { const ok = setFilter(this.state.meta.loot, r); if (ok) this.save(); return ok; }
  summonBoss(): boolean { return summonBoss(this.state, this.events); }
  /** Preview intent (TB-127): loose a shaman's fireball from (sx, sy) onto (tx, ty). In play the shaman casts it itself (`sim/shaman.ts`, TB-087). */
  castFireball(sx: number, sy: number, tx: number, ty: number): void { castFireball(this.state, this.events, sx, sy, tx, ty); }
  canPullBack(): boolean { return canPullBack(this.state); }
  pullBack(): boolean { return pullBack(this.state, this.events); }
  canReplant(): boolean { return canReplant(this.state); }
  /** Specialisation path (TB-193a): picked on the Replant screen, carried into the next run. */
  choosePath(path: PathId | null): boolean { const ok = choosePath(this.state, path); if (ok) { this.events.push({ t: 'pathChosen', path }); this.save(); } return ok; }
  replant(tier?: number, path?: PathId | null): number { if (!canReplant(this.state)) return 0; const rec = runRecord(this.state, gain()); const hw = replant(this.state, this.events, tier, path === undefined ? this.state.run.path ?? null : path); appendTelemetry({ ...rec, heartwoodGained: hw, heartwoodTotal: this.state.meta.heartwood }); this.save(); return hw; }
  /** Finished-run records as an export file (TB-070). */
  telemetry(): { json: string; runs: number; loot: number } { this.save(); const runs = readTelemetry(), loot = readLoot(); return { json: telemetryJson(runs, undefined, loot), runs: runs.length, loot: loot.length }; }

  toSave(): Save { return { version: CURRENT_VERSION, savedAt: Date.now(), run: this.state.run, meta: this.state.meta, settings: this.settings }; }
  save(): boolean { appendLoot(this.lootLog); this.lootLog = []; return writeSave(this.toSave()); }
  exportSave(): string { return exportSave(this.toSave()); }
  importSave(str: string): void {
    const s = importSave(str);
    this.state = loadState(clockSeed(), s); this.reset();
    this.settings = sanitizeSettings(s.settings); this.lootLog = []; clearLoadFailed(); this.save();
    this.announce(sweepAchievements(this.state));
  }
  /** Wipe drops the buffered loot telemetry too, so a fresh game never logs the old one's drops (TB-199). */
  wipe(): void { clearSave(); this.lootLog = []; this.state = createState(clockSeed()); this.reset(); }
  /** The old game's queued events and aim go with it; field and audio hear gameReset (TB-216b). */
  private reset(): void { this.events.drain(); this.aim = this.latch = null; this.events.push({ t: 'gameReset' }); }
}
