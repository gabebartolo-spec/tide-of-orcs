import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { P } from '../render/palette';

const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');

describe('HUD colour tokens', () => {
  it('every --hud-/wall/grove CSS token mirrors its palette.ts colour', () => {
    const pairs: [string, string][] = [['--hud-gold', P.hudGold], ['--hud-ink', P.hudInk], ['--grove-deep', P.groveDeep], ['--wall-ember', P.wallEmber], ['--wall-blood', P.wallBlood], ['--hud-lip', P.hudLip], ['--star-gold', P.starGold]];
    for (const [name, hex] of pairs) expect(css.toLowerCase()).toContain(`${name}: ${hex.toLowerCase()}`);
  });
  it('the HUD rules added in TB-195c use no raw hex outside the token definitions', () => {
    const hud = css.slice(css.indexOf('TB-195c b-bolder'));
    const hexes = hud.split('\n').filter((l) => !/^\s*--|:root \{ --/.test(l)).filter((l) => /#[0-9a-f]{3,8}\b/i.test(l));
    expect(hexes).toEqual([]);
  });
});
