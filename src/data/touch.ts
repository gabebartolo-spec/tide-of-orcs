/** Touch aiming (TB-155, TB-218). CSS px unless a name ends in Rem. Render/UI only; the sim never reads these. */
export const TOUCH = {
  /** The circle sits this far above a fingertip (above a pen tip: penLiftRem) so the hand never hides it. */
  liftRem: 3.5, penLiftRem: 1.5,
  /** The lift fades to nothing over this distance from the bottom of the field, so the bottom of the plain stays reachable. */
  liftFadeRem: 5.25,
  /** A press that starts this close to a side edge (or inside the bottom safe-area inset) is a system gesture, not an aim. */
  edgePx: 24,
  /** Dead margin around the Settings button, so a thumb on the plain cannot open it by accident. */
  settingsDeadRem: 3.5,
} as const;
