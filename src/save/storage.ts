import { migrate } from './migrate';
import { Save } from './schema';

export const SAVE_KEY = 'tide-of-orcs-v1';
/** A save that failed to load is copied here before anything can overwrite it (TB-199). */
export const SAVE_BACKUP_KEY = `${SAVE_KEY}-backup`;

/** True while the stored save failed to load: writes are blocked until the player wipes or imports (TB-199). */
let loadFailed = false;
export const saveLoadFailed = (): boolean => loadFailed;
/** Wipe or import: the player chose to replace the unreadable save, so writes resume. */
export function clearLoadFailed(): void { loadFailed = false; }

export function readSave(): Save | null {
  let raw: string | null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { return null; }
  if (!raw) return null;
  try { return migrate(JSON.parse(raw)); } catch {
    loadFailed = true;
    try { localStorage.setItem(SAVE_BACKUP_KEY, raw); } catch { /* the original stays under SAVE_KEY; writes are blocked */ }
    return null;
  }
}
/** The stored save parsed and migrated but could not be loaded (TB-216b): same as a failed read, back it up and block writes. */
export function markLoadFailed(): void {
  loadFailed = true;
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) localStorage.setItem(SAVE_BACKUP_KEY, raw); } catch { /* writes are blocked */ }
}
export function writeSave(s: Save): boolean {
  if (loadFailed) return false;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch { return false; }
}
export function clearSave(): void { loadFailed = false; try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }

export const exportSave = (s: Save): string => btoa(unescape(encodeURIComponent(JSON.stringify(s))));
export function importSave(str: string): Save { return migrate(JSON.parse(decodeURIComponent(escape(atob(str.trim()))))); }
