/** Item icons (TB-104): one 128 px transparent picture per item id, rendered from the approved Meshy model
 * (meshy_output/APPROVED.md, render_icons.py). A mythic uses its own icon; a path set piece (TB-193d) its set's
 * icon for that slot (`<set>-<slot>`); any other set piece its base's. */
import { SET_SLOTS, type Item } from './loot';

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
  // Path sets and mythics (TB-193d)
  ...['serpents-coil', 'foxfire-pack', 'magpies-hoard'].flatMap((s) => SET_SLOTS.map((slot) => `${s}-${slot}`)),
  'serpent-fang', 'foxfire-tail', 'magpies-talon',
]);

/** The icon id for an item: its mythic id, else its set's slot icon, else its base id; null when no icon exists. */
export const itemIconId = (it: Pick<Item, 'base' | 'mythic'> & Partial<Pick<Item, 'set' | 'slot'>>): string | null => {
  const setId = it.set && it.slot ? `${it.set}-${it.slot}` : null;
  const id = it.mythic ?? (setId && ITEM_ICON_IDS.has(setId) ? setId : it.base);
  return ITEM_ICON_IDS.has(id) ? id : null;
};
