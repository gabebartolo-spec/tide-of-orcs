/** Hero elf shot loop (TB-202). The draw clip (`elf.attack`, 32 frames) ends at full draw and plays in step with the bow's
 *  charge, so full draw lands as the lob leaves. No Mixamo clip runs full draw back to the nock on this rig, so after each lob
 *  the full-draw frame crossfades into draw frame 0 over `release` s (director 3 Nov); aim start/stop crossfades idle and draw. */
export interface ElfLayer { state: 'walk' | 'attack'; t: number; alpha: number }

/** Clip time for a charge (0..1): charge 1 is the last (full-draw) frame. */
export const chargeT = (charge: number, dur: number): number => Math.min(Math.max(charge, 0), 0.999) * dur;

/** Move the idle<->draw mix toward 1 while aiming, 0 otherwise, at 1/`fade` per second. */
export function stepAimMix(mix: number, aiming: boolean, dt: number, fade: number): number {
  const d = fade > 0 ? Math.max(0, dt) / fade : 1;
  return aiming ? Math.min(1, mix + d) : Math.max(0, mix - d);
}

/** Layers to draw back to front. `sinceShot` is seconds since the last lob (charge × lobCd). */
export function elfLayers(charge: number, sinceShot: number, aimMix: number, dur: number, release: number): ElfLayer[] {
  const out: ElfLayer[] = [];
  if (aimMix < 1) out.push({ state: 'walk', t: 0, alpha: 1 });
  if (aimMix <= 0) return out;
  const k = release > 0 ? Math.min(1, Math.max(0, sinceShot) / release) : 1;
  if (k < 1) out.push({ state: 'attack', t: chargeT(1, dur), alpha: aimMix });
  out.push({ state: 'attack', t: chargeT(charge, dur), alpha: aimMix * (k < 1 ? k : 1) });
  return out;
}
