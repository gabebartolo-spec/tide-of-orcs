import { describe, expect, it } from 'vitest';
import { parseReport } from './batchParse';

const rep = `| min | wave |
|---|---|
| 1 | 3 |
| 2 | 31 |
| 3 | 52 |

First fall at wave 3. Falls (wave@run minutes): 3@1.1, 5@2, 35@3.9/t2, 45@5.7. Replants: 4. Heartwood: 9. Best wave: 52.
Milestones (TB-146): first Heartwood purchase affordable: run 14, run min 5.6, play min 28.8. Heartwood nodes bought: 3. First boss reached: run 14, run min 3.6, play min 26.8. First boss cleared: run 14, run min 4.3, play min 27.5.
`;

describe('parseReport', () => {
  it('reads best wave, fall mean, wave minutes, boss minute and nodes bought', () => {
    expect(parseReport('x', 2, rep)).toEqual({ label: 'x', seed: 2, best: 52, mean20: 22, w30: 2, w50: 3, w70: -1, boss: 27.5, hw: 3 });
  });
  it('gives -1 for a boss never cleared', () => {
    expect(parseReport('x', 1, rep.replace(/First boss cleared: .*$/m, 'First boss cleared: -.')).boss).toBe(-1);
  });
});
