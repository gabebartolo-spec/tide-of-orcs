// TB-267: one failing step of a frame (an event handler, a draw) must never stop the game loop. Each step runs guarded; an error is
// logged once per distinct message and the last few are kept in storage, so a freeze on a player's machine can be read back later.
export const ERROR_KEY = 'tide-of-orcs-errors';
/** Distinct errors kept in storage (newest last). */
export const ERROR_KEEP = 5;

type Store = Pick<Storage, 'getItem' | 'setItem'>;
const seen = new Set<string>();

function safeStorage(): Store | null { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } }

/** Report a thrown step (first time per tag and message): the console, and the newest `ERROR_KEEP` in storage. */
export function report(tag: string, e: unknown, store: Store | null = safeStorage()): void {
  const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e), id = `${tag}|${msg}`;
  if (seen.has(id)) return;
  seen.add(id);
  console.error(`[frame:${tag}]`, e);
  if (!store) return;
  try {
    const raw = store.getItem(ERROR_KEY), list: { tag: string; msg: string; stack: string; at: string }[] = raw ? JSON.parse(raw) : [];
    const stack = e instanceof Error && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : '';
    list.push({ tag, msg, stack, at: new Date().toISOString() });
    store.setItem(ERROR_KEY, JSON.stringify(list.slice(-ERROR_KEEP)));
  } catch { /* storage blocked or full: the console line stands */ }
}

/** Run `fn`; on a throw, report it and return false. */
export function guard(tag: string, fn: () => void, store: Store | null = safeStorage()): boolean {
  try { fn(); return true; } catch (e) { report(tag, e, store); return false; }
}

/** Test hook: forget which errors were already reported. */
export function resetReported(): void { seen.clear(); }
