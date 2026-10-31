/** Item glyphs (TB-097): one vector icon per slot, framed by rarity. The fallback until TB-103 renders models. */
import { Item, Slot } from '../data/loot';

/** 24×24 inner markup per slot; strokes and fills use currentColor so the frame's rarity colour carries through. */
const GLYPH: Record<Slot, string> = {
  bow: '<path d="M8 3c7 3 7 15 0 18" fill="none" stroke-width="2.2"/><path d="M8 3v18" stroke-width="1" opacity=".7"/><path d="M5 12h12m-2.5-2.5L17 12l-2.5 2.5" fill="none" stroke-width="1.6"/>',
  quiver: '<path d="M7 9l3-1 5 12-3 1z" fill="currentColor" opacity=".35"/><path d="M7 9l3-1 5 12-3 1z" fill="none" stroke-width="1.6"/><path d="M8 8l-3-5m5 4l-1-5m3 5l2-4" fill="none" stroke-width="1.6"/>',
  bracer: '<path d="M6 7h12l1 2v6l-1 2H6l-1-2V9z" fill="currentColor" opacity=".35"/><path d="M6 7h12l1 2v6l-1 2H6l-1-2V9z" fill="none" stroke-width="1.6"/><path d="M9 7v10m6-10v10" stroke-width="1.2"/>',
  cloak: '<circle cx="12" cy="6" r="3" fill="none" stroke-width="1.6"/><path d="M9 8L5 20h14L15 8" fill="currentColor" opacity=".35"/><path d="M9 8L5 20h14L15 8" fill="none" stroke-width="1.6"/>',
  boots: '<path d="M8 4h5v9l5 2v4H7z" fill="currentColor" opacity=".35"/><path d="M8 4h5v9l5 2v4H7z" fill="none" stroke-width="1.6"/><path d="M7 17h11" stroke-width="1.2"/>',
  charm: '<path d="M6 3l6 7 6-7" fill="none" stroke-width="1.2"/><path d="M12 10l5 5-5 6-5-6z" fill="currentColor" opacity=".35"/><path d="M12 10l5 5-5 6-5-6z" fill="none" stroke-width="1.6"/>',
};

/** Framed icon; the frame shape also differs per rarity (style.css .glyph.r-*) so rarity never rests on colour alone. */
export const glyph = (slot: Slot, it?: Item, big = false): string =>
  `<span class="glyph${it ? ` r-${it.rarity}` : ' none'}${big ? ' big' : ''}" aria-hidden="true"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${GLYPH[slot]}</svg></span>`;
