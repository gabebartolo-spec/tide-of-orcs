/** When the page may be about to go away, save (TB-216b). A hidden tab stops the frame loop, so its 20 s autosave never fires,
 *  and a discarded or killed background tab may never see pagehide or beforeunload: hiding the page saves too. */
export function bindSaveTriggers(win: Pick<Window, 'addEventListener'>, doc: Pick<Document, 'addEventListener' | 'hidden'>, save: () => void): void {
  win.addEventListener('pagehide', () => save());
  win.addEventListener('beforeunload', () => save());
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) save(); });
}
