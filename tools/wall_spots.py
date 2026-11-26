# TB-250 wall cosmetics: the post caps of the visible wall0 carried to every tier and damage stage, printed as WALL_SPOTS rows for
# src/data/presentation.ts.  python tools/wall_spots.py [marked.png]
# The posts are picked by hand on wall0's own render (public/decor/wall0_0.webp): COLS are the image columns of each cap's top-left
# corner (the peaks of the wall's detrended top edge), nearest first. A cap's centre sits CX, CY cap widths right of and below that
# corner; a cap is W px wide, shrinking with depth (measured: 65 px at image row 1018, 40 px at row 165).
# Another tier's spot is the same offset from the wall's far end (every tier's far end is placed at the same field point, wallArt.ts
# placeWall); its top is that tier's own top edge there in that damage stage, and its foot the lowest wall pixel there (the near face).
# Output per spot and stage, field units from the wall art's x, y: [centre x, top y, foot y], plus each spot's cap width.
import sys, re
import numpy as np
from PIL import Image, ImageDraw

SRC = open('src/data/presentation.ts', encoding='utf-8').read()
ART = [dict(zip(('key', 'x', 'y', 'w'), (m[0], *map(float, m[1:])))) for m in
       re.findall(r"key: '(wall\d)', x: ([-\d.]+), y: ([-\d.]+), w: ([-\d.]+)", SRC)][:4]
OPAQUE = 220                                       # wall pixels; the baked ground shadow is softer
COLS = {
    'tall': [1420, 1497, 1868, 1910, 2168, 2203, 2389, 2451],
    'plain': [1584, 1616, 1643, 1669, 1695, 1725, 1757, 1781, 1805, 1830, 2025, 2040, 2054, 2074, 2112, 2126, 2144,
              2272, 2284, 2298, 2311, 2328, 2353, 2367],
}
CX, CY = 0.5, 0.1
# wall1-3 have no caps at wall0's spots: the top edge found there is the wall top's far rim, so the spot moves IN[tier] cap widths
# (right, down) onto the middle of the top (read off the proof sheet)
IN = [(0, 0), (0, 0), (0.55, 0.35), (0.55, 0.35)]
# wall1's posts are spaced unlike wall0's: its spot snaps to the highest cap corner within half a cap width, then takes that cap's centre
SNAP = [False, True, False, False]
def cap_w(row): return 40 + (row - 165) * 25 / 853

def load(key, st):
    im = np.array(Image.open(f'public/decor/{key}_{st}.webp')); a = im[:, :, 3] > OPAQUE
    top = np.array([np.argmax(a[:, x]) if a[:, x].any() else -1 for x in range(a.shape[1])])
    bot = np.array([a.shape[0] - 1 - np.argmax(a[::-1, x]) if a[:, x].any() else -1 for x in range(a.shape[1])])
    return im, a, top, bot

im0, a0, top0, _ = load('wall0', 0)
e0 = int(np.where(a0.any(0))[0].max())                 # wall0's far end column
s = ART[0]['w'] / a0.shape[1]                          # field units per image px (the same for every tier)
base = {}                                              # per spot: centre column offset from the far end, cap width (px)
for kind, cols in COLS.items():
    base[kind] = []
    for c in cols:
        t = top0[c]; w = cap_w(t); base[kind].append((c + CX * w - e0, w))

out = {k: [[None] * 4 for _ in range(4)] for k in COLS}
for ti, art in enumerate(ART):
    for st in range(4):
        im, a, top, bot = load(art['key'], st); e = int(np.where(a.any(0))[0].max())
        for kind, sp in base.items():
            row = []
            for dx, w in sp:
                cx = int(round(e + dx)); lo, hi = max(0, cx - int(w * 0.3)), cx + int(w * 0.3) + 1
                tt = top[lo:hi]; tt = tt[tt >= 0]; bb = bot[lo:hi]
                if ti == 0:                                    # wall0's own caps: the picked corner column itself (a window would catch a taller neighbour)
                    c0 = int(round(e + dx - CX * w)); tt = top[c0:c0 + 1]
                if SNAP[ti]:
                    lo2 = max(0, cx - int(w * 0.5)); win = top[lo2:cx + int(w * 0.5) + 1]; win = np.where(win >= 0, win, 10 ** 6)
                    c0 = lo2 + int(np.argmin(win)); cx = int(round(c0 + CX * w)); tt = top[c0:c0 + 1]
                ty = (int(tt.min()) + (CY + IN[ti][1]) * w) if len(tt) else None
                row.append([round((cx + IN[ti][0] * w) * s, 1), round(ty * s, 1) if ty is not None else None, round(int(bb.max()) * s, 1)])
            out[kind][ti][st] = row

print('  capW: {' + ', '.join(f"{k}: [{', '.join(str(round(w * s, 2)) for _, w in sp)}]" for k, sp in base.items()) + '},')
for kind in COLS:
    print(f'  {kind}: [')
    for ti in range(4):
        print('    [' + ', '.join('[' + ', '.join(f'[{x}, {y}, {f}]' for x, y, f in out[kind][ti][st]) + ']' for st in range(4)) + '],')
    print('  ],')
if len(sys.argv) > 1:                                  # proof: wall0 and wall3 stage 0 with every spot's centre marked
    tiles = []
    for ti in (0, 1, 2, 3):
        im, *_ = load(ART[ti]['key'], 0); img = Image.fromarray(im); d = ImageDraw.Draw(img)
        for kind, colr in (('tall', (255, 40, 40, 255)), ('plain', (40, 160, 255, 255))):
            for i, (x, y, f) in enumerate(out[kind][ti][0]):
                X, Y = x / s, y / s; d.ellipse((X - 9, Y - 9, X + 9, Y + 9), outline=colr, width=4); d.text((X + 12, Y - 22), str(i + 1), fill=(255, 255, 0, 255))
        e = int(np.where(np.array(img)[:, :, 3].any(0))[0].max())
        tiles.append(img.crop((e - 1300, 0, e + 30, 1450)))
    sheet = Image.new('RGBA', (1330 * 4, 1450), (24, 32, 24, 255))
    for i, t in enumerate(tiles): sheet.paste(t, (1330 * i, 0), t)
    sheet.save(sys.argv[1])
