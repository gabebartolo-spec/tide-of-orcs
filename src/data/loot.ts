/** Loot item shapes (TB-090). Pools, sets and mythics land in TB-091; rolls in TB-092. */
export type Slot = 'bow' | 'quiver' | 'bracer' | 'cloak' | 'boots' | 'charm' | 'dagger';
/** Worn order: the six original pockets, then the dagger (TB-225, a knife is not a bow). Sets stay six pieces: they never roll on the dagger. */
export const SLOTS: readonly Slot[] = ['bow', 'quiver', 'bracer', 'cloak', 'boots', 'charm', 'dagger'];
/** The six slots a set piece can fill (TB-225: never the dagger). */
export const SET_SLOTS: readonly Slot[] = SLOTS.filter((s) => s !== 'dagger');
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
  /** Affix rerolls bought on this item (TB-102); absent = 0, so older saves need no migration. */
  rerolls?: number;
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
  /** The Heirloom item's uid (TB-101): it gains item levels each Replant. */
  heirloom: string | null;
}
export const freshLoot = (): LootMeta => ({ items: [], equipped: {}, glimmer: 0, lootFilter: { minRarity: 'common' }, pity: { legendary: 0, mythic: 0 }, nextUid: 1, heirloom: null });
