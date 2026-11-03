import { describe, expect, it } from 'vitest';
import { bindSaveTriggers } from './saveTriggers';

type Fn = () => void;
const target = (): { on: Record<string, Fn>; addEventListener: (k: string, f: Fn) => void } => {
  const on: Record<string, Fn> = {};
  return { on, addEventListener: (k, f) => { on[k] = f; } };
};

describe('save triggers (TB-216b)', () => {
  it('saves when the tab is hidden, on pagehide and beforeunload, not when it is shown again', () => {
    const win = target(), doc = { ...target(), hidden: false };
    let n = 0;
    bindSaveTriggers(win as never, doc as never, () => { n++; });
    doc.on.visibilitychange!(); expect(n).toBe(0);
    doc.hidden = true; doc.on.visibilitychange!(); expect(n).toBe(1);
    win.on.pagehide!(); win.on.beforeunload!(); expect(n).toBe(3);
  });
});
