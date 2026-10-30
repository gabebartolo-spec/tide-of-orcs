/** Presentation timings (TB-061, ART-STYLE §M4 presentation). Render-only; the sim never reads these. */
export const SKY = {
  /** Seconds for one full day-dusk-day cycle. */
  dayCycle: 600,
  /** Peak dusk tint over the plain (keeps the patches readable). */
  duskAlpha: 0.85,
  /** Hill bands, far to near: scroll speed (units/s), crest height, bump width, top of band. */
  hills: [{ speed: 2, h: 26, w: 140, y: 0 }, { speed: 5, h: 18, w: 90, y: 14 }],
  /** Lamplight radius on the grove bank at full night. */
  lampR: 150,
} as const;

/** 0 at midday, 1 at deepest dusk. */
export const dusk = (t: number): number => (1 - Math.cos((2 * Math.PI * t) / SKY.dayCycle)) / 2;
