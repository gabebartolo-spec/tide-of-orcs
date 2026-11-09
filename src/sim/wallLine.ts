import { WALL_LINE } from '../data/balance';

/** The barricade's orc-side face at depth y (TB-238): the wall runs diagonally, further right toward the forest. */
export const wallX = (y: number): number => WALL_LINE.baseX + WALL_LINE.slope * (WALL_LINE.baseY - y) + WALL_LINE.front;
