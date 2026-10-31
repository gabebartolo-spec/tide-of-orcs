/** Sim → render/audio events. Sim pushes; observers drain once per frame. */
export type SimEvent =
  | { t: 'kill'; x: number; y: number; loot: number; kind: string }
  /** An item dropped (TB-094); `kept` is false when the loot filter salvaged it on the spot. */
  | { t: 'loot'; x: number; y: number; uid: string; rarity: string; kept: boolean }
  /** `src` says what struck (lob, arrow, knife, bolt) so render can pick the impact. */
  | { t: 'hit'; x: number; y: number; crit: boolean; src: string }
  /** An orc's swing lands on the wall or a vanguard; (tx, ty) is where. Render-only (TB-088). */
  | { t: 'orcSwing'; kind: string; x: number; y: number; tx: number; ty: number; r: number }
  /** A vanguard's swing connects; (tx, ty) is the first orc struck. Render-only (TB-088). */
  | { t: 'vanStrike'; type: string; x: number; y: number; tx: number; ty: number }
  /** An orc struck by a melee source with no projectile (vanguard, wolf, hawk, treant, storm). Render-only (TB-088). */
  | { t: 'bleed'; x: number; y: number; r: number }
  | { t: 'impact'; x: number; y: number; r: number }
  /** Set bonuses (TB-099): burn passed from a dying orc to (tx, ty); a bolt pinned an orc; Rootwarden's free rally opened. */
  | { t: 'burnSpread'; x: number; y: number; tx: number; ty: number }
  | { t: 'pinned'; x: number; y: number }
  | { t: 'freeRally'; secs: number }
  /** Mythics (TB-100): Thunder's Memory's stored bolt hit the whole wave; a Starfall struck; a stake was driven; the wall stood again. */
  | { t: 'thunder' }
  | { t: 'starCloak'; x: number; y: number }
  | { t: 'stake'; x: number; y: number }
  | { t: 'splinter' }
  /** The elf looses a lob, or a throwing knife leaves the hand (audio only). */
  | { t: 'loose' }
  | { t: 'knife' }
  | { t: 'wave'; wave: number }
  | { t: 'bossReady' }
  | { t: 'bossStart' }
  | { t: 'bossEnd'; cleared: boolean; loot: number }
  | { t: 'storm'; pts: [number, number][] }
  /** Arrow enchantments (TB-089). `fireStrike`: a lob landed with Fire Arrows. `bounceHit`: a Rebound bolt struck. `shock`: lightning from (x, y) to each of pts. `stun`, `chill`: a strike stunned or chilled orcs. `shatter`: a chilled orc died and burst. `starfall`: the rain began. */
  | { t: 'fireStrike'; x: number; y: number; r: number }
  | { t: 'bounceHit'; x: number; y: number }
  | { t: 'shock'; x: number; y: number; pts: [number, number][] }
  | { t: 'stun'; x: number; y: number; r: number }
  | { t: 'chill'; x: number; y: number; r: number }
  | { t: 'shatter'; x: number; y: number; r: number }
  | { t: 'starfall' }
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
  | { t: 'hwBought'; id: string }
  | { t: 'replant'; heartwood: number; forced: boolean };

export class EventBus {
  private buf: SimEvent[] = [];
  push(e: SimEvent): void { if (this.buf.length < 2000) this.buf.push(e); }
  drain(): SimEvent[] { const out = this.buf; this.buf = []; return out; }
}
