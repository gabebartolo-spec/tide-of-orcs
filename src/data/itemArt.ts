/** Item icons (TB-104): one 128 px transparent picture per item id, rendered from the approved Meshy model
 * (meshy_output/APPROVED.md, render_icons.py). Set pieces use their base's icon; a mythic uses its own. */
import type { Item } from './loot';

/** Folder under public/ that holds `<id>.webp`. */
export const ITEM_ICON_DIR = 'items';

/** Every id that has an icon file. An item without one keeps its TB-097 slot glyph. */
export const ITEM_ICON_IDS: ReadonlySet<string> = new Set([
  'ashwood-bow', 'yew-longbow', 'hornbow', 'ironbark-recurve',
  'hide-quiver', 'birch-quiver', 'woven-quiver', 'gilded-quiver',
  'leather-bracer', 'bark-bracer', 'scaled-bracer', 'silver-bracer',
  'moss-cloak', 'wool-cloak', 'feather-cloak', 'dusk-cloak',
  'soft-boots', 'root-boots', 'ranger-boots', 'windstep-boots',
  'acorn-charm', 'bone-charm', 'amber-charm', 'star-charm',
  'last-knife', 'heart-of-kiln', 'thunders-memory', 'oakspine',
  'pale-moon', 'first-wolf', 'heartwood-splinter', 'starfall-cloak',
]);

/** The icon id for an item: its mythic id, else its base id; null when no icon exists. */
export const itemIconId = (it: Pick<Item, 'base' | 'mythic'>): string | null => {
  const id = it.mythic ?? it.base;
  return ITEM_ICON_IDS.has(id) ? id : null;
};
