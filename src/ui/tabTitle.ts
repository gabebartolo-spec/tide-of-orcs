import { STR } from '../data/strings';

export type Tab = 'grove' | 'satchel' | 'camp' | 'prestige' | 'deeds' | 'settings';

/** The panel header names the open tab (TB-195l), whichever way the panel was opened. */
export function tabTitle(k: Tab): string {
  return { grove: STR.tabGrove, satchel: STR.tabSatchel, camp: STR.tabCamp, prestige: STR.tabReplant, deeds: STR.tabDeeds, settings: STR.tabSettings }[k];
}
