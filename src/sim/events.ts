/** Sim → render/audio events. Sim pushes; observers drain once per frame. */
export type SimEvent =
  | { t: 'kill'; x: number; y: number; loot: number; kind: string }
  | { t: 'hit'; x: number; y: number; crit: boolean }
  | { t: 'impact'; x: number; y: number; r: number }
  | { t: 'wave'; wave: number }
  | { t: 'storm'; pts: [number, number][] }
  | { t: 'hawkDive'; x: number; y: number }
  | { t: 'treantStamp'; x: number; y: number }
  | { t: 'bite'; x: number; y: number }
  | { t: 'barricadeHit'; y: number; amount: number; frac: number }
  | { t: 'barricadeRegrow' }
  | { t: 'barricadeFell'; wave: number; kills: number; runTime: number; heartwood: number }
  | { t: 'vanguardRallied'; type: string; x: number; y: number }
  | { t: 'vanguardHit'; x: number; y: number }
  | { t: 'vanguardFell'; type: string; x: number; y: number }
  | { t: 'bought'; id: string; firstRank: boolean }
  | { t: 'replant'; heartwood: number; forced: boolean };

export class EventBus {
  private buf: SimEvent[] = [];
  push(e: SimEvent): void { if (this.buf.length < 2000) this.buf.push(e); }
  drain(): SimEvent[] { const out = this.buf; this.buf = []; return out; }
}
