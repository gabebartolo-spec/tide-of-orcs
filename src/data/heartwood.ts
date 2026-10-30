/** Heartwood tree: spent in Heartwood, never reset. Mirrors docs/BALANCE.md §Heartwood tree. Ids are stable API. */

export type HwId = 'hw_dawn' | 'hw_wolf' | 'hw_timber' | 'hw_orders';
export type HwLevels = Partial<Record<HwId, number>>;

export interface HwNode { id: HwId; name: string; costs: readonly number[]; desc: string }

/** Rank n costs costs[n] Heartwood; max rank is costs.length. */
export const HW_NODES: readonly HwNode[] = [
  { id: 'hw_dawn', name: 'Early Dawn', costs: [2, 4, 8, 14, 22], desc: 'Each run starts 2 waves further on per rank.' },
  { id: 'hw_wolf', name: 'Old Friend', costs: [3], desc: 'Each run starts with the Grey Wolf.' },
  { id: 'hw_timber', name: 'Stout Timber', costs: [4, 8, 16], desc: 'Barricade base health +25% per rank.' },
  { id: 'hw_orders', name: 'Standing Orders', costs: [5, 12], desc: 'Each run starts with one Spearman on the field per rank.' },
];

export const HW_NODE: Readonly<Record<HwId, HwNode>> = Object.fromEntries(HW_NODES.map((n) => [n.id, n])) as Record<HwId, HwNode>;

export const HW_FX = { dawnWaves: 2, timberPerRank: 0.25 } as const;
