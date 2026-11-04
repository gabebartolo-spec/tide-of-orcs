"""TB-221: finish a satchel icon so it reads at pocket size on a dark tile.
Usage: python -P icon_rim.py <render.png> <out.webp> <id> [lift] [rim_px]
Crops the render to its pixels, optionally lifts dark colours (lift > 0 = gamma toward light), then adds a thin
ink line and a cream rim (palette ink #161d15 and cream #efe6d2) round the silhouette, at 4x supersample, and
writes a 128 px WebP. The rim is what lets a thin bow or a dark cloak stand off the pocket."""
import sys
from PIL import Image, ImageFilter, ImageChops
INK, CREAM = (22, 29, 21), (239, 230, 210)
src, out = sys.argv[1], sys.argv[2]
lift = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
rim = int(sys.argv[5]) if len(sys.argv) > 5 else 5          # cream rim width at 128 px scale x4
PX, SS, MG = 128, 4, 6
im = Image.open(src).convert('RGBA')
box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
im = im.crop(box)
if lift:
    r, g, b, a = im.split()
    f = lambda v: round(255 * (v / 255) ** (1 / (1 + lift)))
    im = Image.merge('RGBA', (r.point(f), g.point(f), b.point(f), a))
inner = (PX - 2 * MG) * SS - 2 * (rim + 3) * SS // 2
k = inner / max(im.size)
im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
W = PX * SS
c = Image.new('RGBA', (W, W), (0, 0, 0, 0))
c.paste(im, ((W - im.width) // 2, (W - im.height) // 2))
a = c.getchannel('A').point(lambda v: 255 if v > 24 else 0)
def grow(mask, px):
    return mask.filter(ImageFilter.MaxFilter(2 * px + 1)) if px > 0 else mask
ink_m = grow(a, SS)
cream_m = grow(a, SS + rim * SS // 2)
cream_m = cream_m.filter(ImageFilter.GaussianBlur(SS * 0.6)).point(lambda v: 255 if v > 110 else 0)
res = Image.new('RGBA', (W, W), (0, 0, 0, 0))
res.paste(Image.new('RGBA', (W, W), CREAM + (255,)), mask=cream_m)
res.paste(Image.new('RGBA', (W, W), INK + (255,)), mask=ink_m)
res.alpha_composite(c)
res = res.resize((PX, PX), Image.LANCZOS)
res.save(out, quality=92, method=6)
