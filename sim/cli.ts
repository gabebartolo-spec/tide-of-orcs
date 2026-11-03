/** Balance runner argument checks (TB-216e): a typo'd flag fails loudly instead of running untuned under a tuned label. */

/** Returns `v` if it is one of `allowed`; otherwise throws naming the flag and the allowed values. */
export function pickChoice<T extends string>(flag: string, v: string, allowed: readonly T[]): T {
  if (!(allowed as readonly string[]).includes(v)) throw new Error(`unknown --${flag} '${v}' (expected ${allowed.join(', ')})`);
  return v as T;
}

/** Applies `--tune A.b.c=n,...` to the tables in `tune`. Every key on the path must already exist. */
export function applyTune(tune: Record<string, unknown>, spec: string): void {
  for (const kv of spec.split(',').filter(Boolean)) {
    const [path = '', v = ''] = kv.split('='), keys = path.split('.'), last = keys.pop()!;
    let obj = tune;
    for (const k of keys) {
      const next = obj[k];
      if (next === null || typeof next !== 'object' || !(k in obj)) throw new Error(`unknown tune key ${path}`);
      obj = next as Record<string, unknown>;
    }
    if (!keys.length || !(last in obj)) throw new Error(`unknown tune key ${path}`);
    const n = Number(v);
    if (v === '' || Number.isNaN(n)) throw new Error(`tune value for ${path} is not a number: '${v}'`);
    obj[last] = n;
  }
}
