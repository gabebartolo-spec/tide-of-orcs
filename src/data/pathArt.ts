/** Path sigils (TB-193d): one 128 px transparent picture per path, rendered from a Meshy medallion like the item icons
 *  (meshy_output/APPROVED.md, render_icons.py, centre_icons.py). UI shows `<img src={pathSigilSrc(id)}>` and keeps
 *  its vector sigil as the fallback when the image fails to load. */
import type { PathId } from './paths';

/** Folder under public/ that holds `<path>.webp`. */
export const PATH_SIGIL_DIR = 'sigils';

/** Public URL of a path's sigil, relative to the site base (prefix with `import.meta.env.BASE_URL`). */
export const pathSigilFile = (id: PathId): string => `${PATH_SIGIL_DIR}/${id}.webp`;
