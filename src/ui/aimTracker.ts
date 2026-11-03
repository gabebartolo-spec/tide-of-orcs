/** Who owns the aim (TB-218 I1): one pointer at a time may set or clear it. Pure; main.ts feeds it pointer events.
 *  A finger or pen is tracked from contact to release. When the owner lifts the aim clears, even if another
 *  contact is still down (it does not take over; a fresh press can own the aim). */
export type ContactType = 'touch' | 'pen';
export interface Contact { id: number; type: ContactType; x: number; y: number }
export interface Release { wasOwner: boolean; promoted: Contact | null }

export class AimTracker {
  private contacts = new Map<number, Contact>();
  private ownerId: number | null = null;
  get owner(): number | null { return this.ownerId; }
  get count(): number { return this.contacts.size; }

  /** A pointer touched down. Returns true when it now owns the aim. */
  down(c: Contact): boolean {
    this.contacts.set(c.id, { ...c });
    if (this.ownerId === null) this.ownerId = c.id;
    return this.ownerId === c.id;
  }
  /** A pointer moved. Returns true when it is the owner (so it may set the aim); other contacts only update their position. */
  move(id: number, x: number, y: number): boolean {
    const c = this.contacts.get(id); if (!c) return false;
    c.x = x; c.y = y;
    return this.ownerId === id;
  }
  /** Up, cancel, lost capture, or leave. Harmless for a pointer that is not tracked (lostpointercapture follows pointerup). */
  release(id: number): Release {
    if (!this.contacts.delete(id)) return { wasOwner: false, promoted: null };
    if (this.ownerId !== id) return { wasOwner: false, promoted: null };
    this.ownerId = null;   // single owner: a still-held finger never inherits the aim; the next press does
    return { wasOwner: true, promoted: null };
  }
  /** Window blur / page hidden: forget everything. */
  reset(): void { this.contacts.clear(); this.ownerId = null; }
}
