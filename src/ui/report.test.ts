import { describe, expect, it } from 'vitest';
import { REPORT } from '../data/presentation';
import { reportRows, reportTimes } from './report';

describe('battle report (TB-195f)', () => {
  it('reads the tallies from the run', () => {
    const rows = reportRows({ wave: 12, kills: 340, runTime: 150, earned: 500 }, 20);
    expect(rows.map((r) => r.value)).toEqual([12, 340, 2, 200, 20]);
  });
  it('a run under a minute counts its rate per one minute', () => {
    expect(reportRows({ wave: 1, kills: 3, runTime: 20, earned: 90 }, 1)[3]?.value).toBe(90);
  });
  it('rows roll one after another, then Heartwood, then the seal', () => {
    const t = reportTimes(3, false);
    expect(t.rows).toEqual([REPORT.lead, REPORT.lead + REPORT.gap, REPORT.lead + 2 * REPORT.gap]);
    expect(t.hw).toBe(REPORT.lead + 3 * REPORT.gap);
    expect(t.stamp).toBe(t.hw + REPORT.roll + REPORT.stampAfter);
  });
  it('reduced motion shows everything at once', () => {
    expect(reportTimes(4, true)).toEqual({ rows: [0, 0, 0, 0], hw: 0, stamp: 0 });
  });
});
