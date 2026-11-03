import { describe, expect, it } from 'vitest';
import { STR } from '../data/strings';
import { tabTitle } from './tabTitle';

describe('tabTitle (TB-195l)', () => {
  it('names the open tab, not the way the panel was opened', () => {
    expect(tabTitle('prestige')).toBe(STR.tabReplant);
    expect(tabTitle('settings')).toBe(STR.tabSettings);
    expect(tabTitle('grove')).toBe(STR.tabGrove);
    expect(tabTitle('satchel')).toBe(STR.tabSatchel);
    expect(tabTitle('camp')).toBe(STR.tabCamp);
  });
});
