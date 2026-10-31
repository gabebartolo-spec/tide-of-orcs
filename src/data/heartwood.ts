/** Heartwood tree: spent in Heartwood, never reset. Mirrors docs/BALANCE.md §Heartwood tree. Ids are stable API. */

export type HwId = 'hw_dawn' | 'hw_wolf' | 'hw_timber' | 'hw_orders' | 'hw_boss'
  | 'hw_find' | 'hw_fortune' | 'hw_satchel' | 'hw_tithe' | 'hw_heirloom' | 'hw_glimmer';
export type HwLevels = Partial<Record<HwId, number>>;

/** req: other lines that must reach a rank first (TB-101). */
export interface HwNode { id: HwId; name: string; costs: readonly number[]; desc: string; req?: readonly [HwId, number][] }

/** Rank n costs costs[n] Heartwood; max rank is costs.length. */
export const HW_NODES: readonly HwNode[] = [
  { id: 'hw_dawn', name: 'Early Dawn', costs: [2, 4, 8, 14, 22], desc: 'Each run starts 2 waves further on per rank.' },
  { id: 'hw_wolf', name: 'Old Friend', costs: [3], desc: 'Each run starts with the Grey Wolf.' },
  { id: 'hw_timber', name: 'Stout Timber', costs: [4, 8, 16], desc: 'Barricade base health +25% per rank.' },
  { id: 'hw_orders', name: 'Standing Orders', costs: [5, 12], desc: 'Each run starts with one Spearman on the field per rank.' },
  { id: 'hw_boss', name: 'Warlords', costs: [6, 12, 24], desc: 'Boss wave clear bonus +50% per rank.' },
  // loot lines (TB-101), BALANCE P-101
  { id: 'hw_find', name: 'Far Sight', costs: [2, 5, 12], desc: 'Item Find +15% / +35% / +60% in total.' },
  { id: 'hw_fortune', name: "Fortune's Favour", costs: [3, 8, 20], desc: 'Luck +10% / +25% / +45% in total.' },
  { id: 'hw_satchel', name: 'Deep Satchel', costs: [4], desc: 'The satchel holds 80 items, not 40.', req: [['hw_find', 1]] },
  { id: 'hw_tithe', name: 'Warboss Tithe', costs: [10], desc: 'Bosses always drop 2 items.', req: [['hw_find', 2], ['hw_fortune', 1]] },
  { id: 'hw_heirloom', name: 'Heirloom', costs: [15], desc: 'Name one worn item your heirloom: it gains 5 item levels each Replant, past the cap.', req: [['hw_fortune', 2]] },
  { id: 'hw_glimmer', name: 'Glimmerwork', costs: [6], desc: 'Rerolls cost 40% less; salvage gives +1 Glimmer.', req: [['hw_satchel', 1]] },
];

export const HW_NODE: Readonly<Record<HwId, HwNode>> = Object.fromEntries(HW_NODES.map((n) => [n.id, n])) as Record<HwId, HwNode>;

export const HW_FX = { dawnWaves: 2, timberPerRank: 0.25, bossPerRank: 0.5,
  /** Loot lines (TB-101): totals by rank (index 0 = unbought). */
  find: [0, 0.15, 0.35, 0.6], fortune: [0, 0.1, 0.25, 0.45], titheDrops: 2, heirloomIlvl: 5, rerollCut: 0.4, salvagePlus: 1 } as const;
