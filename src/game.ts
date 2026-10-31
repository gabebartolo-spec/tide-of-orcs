/**
 * GameController: the only thing allowed to call into sim/ from the UI.
 * Owns the SimState, the event bus, and save/load.
 */
import { VanType } from './data/balance';
import { NodeId } from './data/skillTree';
import { EventBus } from './sim/events';
import { canReplant, replant } from './sim/prestige';
import { SimState, createState, freshMeta, freshRun, recompute } from './sim/state';
import { Inputs, step } from './sim/step';
import { buy } from './sim/tree';
import { summonBoss } from './sim/boss';
import { buyHw } from './sim/heartwood';
import { HwId } from './data/heartwood';
import { rally } from './sim/vanguard';
import { equip, reroll, salvage, setFilter, toggleHeirloom, toggleLock } from './sim/loot';
import { Rarity } from './data/loot';
import { Save, defaultSettings, CURRENT_VERSION } from './save/schema';
import { clearSave, exportSave, importSave, readSave, writeSave } from './save/storage';
import { LootKind, LootRecord, appendLoot, appendTelemetry, lootRecord, lootStart, readLoot, readTelemetry, runRecord, telemetryJson } from './save/telemetry';
import { setTiers } from './sim/gear';
import { SimEvent } from './sim/events';
import { gain } from './sim/prestige';

export class GameController {
  state: SimState;
  readonly events = new EventBus();
  settings = defaultSettings();
  /** Current pointer aim on the field in logical coordinates, or null. Set by the UI every frame it changes. */
  aim: { x: number; y: number } | null = null;
  /** Loot telemetry (TB-107) waits here and is written with each save, not per drop. */
  private lootLog: LootRecord[] = [];

  constructor(seed = (Date.now() % 2147483647) | 0) {
    const save = readSave();
    if (save) {
      this.settings = { ...defaultSettings(), ...save.settings };
      this.state = createState(seed, { ...freshRun(), ...save.run }, { ...freshMeta(), ...save.meta });
    } else {
      this.state = createState(seed);
    }
  }

  tick(dt: number): void {
    const inputs: Inputs = { aim: this.state.run.fallen ? null : this.aim };
    step(this.state, dt, inputs, this.events);
  }

  setAim(x: number, y: number): void { this.aim = { x, y }; }
  clearAim(): void { this.aim = null; }
  buy(id: NodeId): boolean { return buy(this.state, this.events, id); }
  rally(type: VanType): boolean { return rally(this.state, this.events, type); }
  buyHw(id: HwId): boolean { const ok = buyHw(this.state, this.events, id); if (ok) this.save(); return ok; }
  /** Satchel intents (TB-096): equipping recomputes Stats; every change saves. */
  equipItem(uid: string): boolean {
    const s = this.state, tiers = setTiers(s.meta.loot, s.stats.setBoost), ok = equip(s.meta.loot, uid);
    if (!ok) return ok;
    recompute(s); this.logItem('equip', uid);
    const now = setTiers(s.meta.loot, s.stats.setBoost), set = s.meta.loot.items.find((i) => i.uid === uid)?.set;
    if (now > tiers) this.logLoot('set', { tiers: now, ...(set ? { set } : {}) });
    this.save(); return ok;
  }
  salvageItem(uid: string): boolean { this.logItem('salvage', uid); const ok = salvage(this.state.meta.loot, uid, this.state.stats); if (ok) this.save(); else this.lootLog.pop(); return ok; }
  heirloomItem(uid: string): boolean { const ok = toggleHeirloom(this.state.meta.loot, uid); if (ok) this.save(); return ok; }
  rerollItem(uid: string, i: number): boolean { const s = this.state, ok = reroll(s.meta.loot, uid, i, s.lootRng, s.stats.rerollMult); if (ok) { recompute(s); this.logItem('reroll', uid, { affix: i }); this.save(); } return ok; }

  /** Feed each frame's drained sim events (main loop): drops become loot telemetry. */
  noteEvents(events: readonly SimEvent[]): void {
    for (const e of events) if (e.t === 'loot') this.logLoot('drop', { rarity: e.rarity, kept: e.kept });
  }
  private logLoot(kind: LootKind, extra: Partial<LootRecord>): void { const now = Date.now(); this.lootLog.push(lootRecord(this.state, kind, extra, now, lootStart(now))); }
  private logItem(kind: LootKind, uid: string, extra: Partial<LootRecord> = {}): void {
    const it = this.state.meta.loot.items.find((i) => i.uid === uid);
    this.logLoot(kind, { ...(it ? { rarity: it.rarity, slot: it.slot, base: it.base, ...(it.set ? { set: it.set } : {}) } : {}), ...extra });
  }
  lockItem(uid: string): boolean { const ok = toggleLock(this.state.meta.loot, uid); if (ok) this.save(); return ok; }
  setLootFilter(r: Rarity): boolean { const ok = setFilter(this.state.meta.loot, r); if (ok) this.save(); return ok; }
  summonBoss(): boolean { return summonBoss(this.state, this.events); }
  canReplant(): boolean { return canReplant(this.state); }
  replant(): number { const rec = runRecord(this.state, gain(this.state)); const hw = replant(this.state, this.events); appendTelemetry({ ...rec, heartwoodGained: hw, heartwoodTotal: this.state.meta.heartwood }); this.save(); return hw; }
  /** Finished-run records as an export file (TB-070). */
  telemetry(): { json: string; runs: number; loot: number } { this.save(); const runs = readTelemetry(), loot = readLoot(); return { json: telemetryJson(runs, undefined, loot), runs: runs.length, loot: loot.length }; }

  toSave(): Save { return { version: CURRENT_VERSION, savedAt: Date.now(), run: this.state.run, meta: this.state.meta, settings: this.settings }; }
  save(): boolean { appendLoot(this.lootLog); this.lootLog = []; return writeSave(this.toSave()); }
  exportSave(): string { return exportSave(this.toSave()); }
  importSave(str: string): void {
    const s = importSave(str);
    this.state = createState(1, { ...freshRun(), ...s.run }, { ...freshMeta(), ...s.meta });
    this.settings = { ...defaultSettings(), ...s.settings }; this.save();
  }
  wipe(): void { clearSave(); this.state = createState(1); }
}
