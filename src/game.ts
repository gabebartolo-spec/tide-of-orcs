/**
 * GameController: the only thing allowed to call into sim/ from the UI.
 * Owns the SimState, the event bus, and save/load.
 */
import { VanType } from './data/balance';
import { NodeId } from './data/skillTree';
import { EventBus } from './sim/events';
import { canReplant, replant } from './sim/prestige';
import { SimState, createState, freshMeta, freshRun } from './sim/state';
import { Inputs, step } from './sim/step';
import { buy } from './sim/tree';
import { summonBoss } from './sim/boss';
import { rally } from './sim/vanguard';
import { Save, defaultSettings, CURRENT_VERSION } from './save/schema';
import { clearSave, exportSave, importSave, readSave, writeSave } from './save/storage';

export class GameController {
  state: SimState;
  readonly events = new EventBus();
  settings = defaultSettings();
  /** Current pointer aim on the field in logical coordinates, or null. Set by the UI every frame it changes. */
  aim: { x: number; y: number } | null = null;

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
  summonBoss(): boolean { return summonBoss(this.state, this.events); }
  canReplant(): boolean { return canReplant(this.state); }
  replant(): number { const hw = replant(this.state, this.events); this.save(); return hw; }

  toSave(): Save { return { version: CURRENT_VERSION, savedAt: Date.now(), run: this.state.run, meta: this.state.meta, settings: this.settings }; }
  save(): boolean { return writeSave(this.toSave()); }
  exportSave(): string { return exportSave(this.toSave()); }
  importSave(str: string): void {
    const s = importSave(str);
    this.state = createState(1, { ...freshRun(), ...s.run }, { ...freshMeta(), ...s.meta });
    this.settings = { ...defaultSettings(), ...s.settings }; this.save();
  }
  wipe(): void { clearSave(); this.state = createState(1); }
}
