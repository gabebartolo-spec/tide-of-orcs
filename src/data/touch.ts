/** Touch aiming (TB-155, TB-218, TB-223). CSS px unless a name ends in Rem. Render/UI only; the sim never reads these. */
export const TOUCH = {
  /** The circle sits this far above a fingertip (above a pen tip: penLiftRem) so the hand never hides it. */
  liftRem: 3.5, penLiftRem: 1.5,
  /** The lift fades to nothing over this distance, ending `reachRem` above the bottom of the field, so the bottom of the plain is reached by a thumb
   *  held clear of the gesture-nav band; a finger lower than that still aims at the plain's lowest row (TB-223). */
  liftFadeRem: 5.25, reachRem: 3,
  /** A press that starts this close to a side edge (or inside the bottom safe-area inset) is a system gesture, not an aim. */
  edgePx: 24,
  /** Dead margin around the Settings button, so a thumb on the plain cannot open it by accident. */
  settingsDeadRem: 3.5,
} as const;

/** Auto fire's stored choice (TB-223): a localStorage flag like the mute one, so no save schema change. Absent = on for a touch screen, off for a mouse. */
export const AUTO_FIRE_KEY = 'tide.autofire';
