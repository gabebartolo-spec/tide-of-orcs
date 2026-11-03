/**
 * Battle report (TB-195f): the fallen overlay is a carved board whose tallies roll up one after another, then the wax seal
 * stamps on. `reportRows` picks the tallies from the run; `reportTimes` schedules them (numbers in `REPORT`).
 */
import { REPORT } from '../data/presentation';
import { STR } from '../data/strings';

export interface ReportRun { wave: number; kills: number; runTime: number; earned: number }
export interface ReportRow { label: string; value: number }

/** The tallies, top to bottom: wave, orcs slain, minutes held, starlight per minute, best wave. */
export function reportRows(r: ReportRun, best: number): ReportRow[] {
  const mins = r.runTime / 60;
  return [
    { label: STR.repWave, value: r.wave },
    { label: STR.repSlain, value: r.kills },
    { label: STR.repMins, value: Math.floor(mins) },
    { label: STR.repRate, value: r.earned / Math.max(1, mins) },
    { label: STR.repBest, value: best },
  ];
}

/** Start time (ms after the board opens) of each of `n` rows, the Heartwood tally after them, and the seal. Calm: all at 0. */
export function reportTimes(n: number, calm: boolean): { rows: number[]; hw: number; stamp: number } {
  if (calm) return { rows: Array.from({ length: n }, () => 0), hw: 0, stamp: 0 };
  const rows = Array.from({ length: n }, (_, i) => REPORT.lead + i * REPORT.gap);
  const hw = REPORT.lead + n * REPORT.gap;
  return { rows, hw, stamp: hw + REPORT.roll + REPORT.stampAfter };
}
