/** Loot item shapes (TB-090). Pools, sets and mythics land in TB-091; rolls in TB-092. */
export type Slot = 'bow' | 'quiver' | 'bracer' | 'cloak' | 'boots' | 'charm';
export const SLOTS: readonly Slot[] = ['bow', 'quiver', 'bracer', 'cloak', 'boots', 'charm'];
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export interface Affix { id: string; value: number }
export interface Item {
  /** Unique within the save. */
  uid: string;
  base: string; slot: Slot; rarity: Rarity; ilvl: number;
  affixes: Affix[];
  /** Set id for set pieces, mythic id for mythics. */
  set?: string; mythic?: string;
  locked?: boolean;
}
/** Auto-salvage on pickup: rarities below `minRarity` go straight to starlight and Glimmer. Set pieces and mythics never do. */
export interface LootFilter { minRarity: Rarity }
export interface LootMeta {
  items: Item[];
  equipped: Partial<Record<Slot, string>>;
  glimmer: number;
  lootFilter: LootFilter;
  /** Bosses since the last legendary / mythic (pity counters). */
  pity: { legendary: number; mythic: number };
  /** Next item uid. */
  nextUid: number;
}
export const freshLoot = (): LootMeta => ({ items: [], equipped: {}, glimmer: 0, lootFilter: { minRarity: 'common' }, pity: { legendary: 0, mythic: 0 }, nextUid: 1 });
