import { migrate } from './migrate';
import { Save } from './schema';

export const SAVE_KEY = 'tide-of-orcs-v1';

export function readSave(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch { return null; }
}
export function writeSave(s: Save): boolean {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch { return false; }
}
export function clearSave(): void { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }

export const exportSave = (s: Save): string => btoa(unescape(encodeURIComponent(JSON.stringify(s))));
export function importSave(str: string): Save { return migrate(JSON.parse(decodeURIComponent(escape(atob(str.trim()))))); }
