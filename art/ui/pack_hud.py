# Pack the carve_hud.py renders (TB-195h) into public/ui/*.webp at 2x (4K) and 1x, plus QA previews.
# Run: python art/ui/pack_hud.py <raw dir> <public/ui dir> [<preview dir>]
# Glowing pieces get a soft starlight halo baked in. Downscaling is premultiplied, so edges keep no dark fringe.
import os, sys
from PIL import Image, ImageFilter

raw, dst = sys.argv[1], sys.argv[2]
prev = sys.argv[3] if len(sys.argv) > 3 else None
os.makedirs(dst, exist_ok=True)

# name: (glow radius at 2x, glow strength). Insets for the manifest live in docs/plans/game-ui.md Â§TB-195h.
PIECES = {
    'gem': (14, 0.55), 'banner': (0, 0), 'wallbar': (0, 0), 'wallbar-crack1': (0, 0), 'wallbar-crack2': (0, 0),
    'wallbar-crack3': (0, 0), 'wallbar-fill': (0, 0), 'token-bow': (0, 0), 'token-satchel': (0, 0), 'token-seed': (0, 0),
    'token-cog': (0, 0), 'plate': (0, 0), 'satchel': (0, 0), 'pocket': (0, 0), 'report': (0, 0), 'stamp': (0, 0),
    'march': (12, 0.75), 'tag': (0, 0), 'wavebar': (0, 0),
}
GLOW = (255, 196, 110)  # amber-hot starlight, between amber #e2a85b and fireCore #fff1c8


def glow(im, r, k):
    """Pad by 2r (even) so the halo fades out inside the canvas, then lay a blurred amber copy of the alpha under it."""
    p = 2 * r; big = Image.new('RGBA', (im.width + 2 * p, im.height + 2 * p), (0, 0, 0, 0)); big.paste(im, (p, p)); im = big
    a = im.getchannel('A')
    halo = a.filter(ImageFilter.GaussianBlur(r)).point(lambda v: int(min(255, v * k)))
    g = Image.new('RGBA', im.size, GLOW + (0,)); g.putalpha(halo)
    return Image.alpha_composite(g, im)


def half(im):
    return im.convert('RGBa').resize((im.width // 2, im.height // 2), Image.LANCZOS).convert('RGBA')


def save(im, path):
    im.save(path, 'WEBP', quality=88, alpha_quality=92, method=6)
    return os.path.getsize(path)


total = 0
for name, (r, k) in PIECES.items():
    if not os.path.exists(os.path.join(raw, name + '.png')): continue  # TB-263: pack only what was re-rendered
    im = Image.open(os.path.join(raw, name + '.png')).convert('RGBA')
    if r: im = glow(im, r, k)
    # clear near-zero alpha dust so the edge is clean
    a = im.getchannel('A').point(lambda v: 0 if v < 3 else v); im.putalpha(a)
    s2 = save(im, os.path.join(dst, name + '@2x.webp')); one = half(im); s1 = save(one, os.path.join(dst, name + '.webp'))
    total += s1 + s2
    print('%-16s 1x %4dx%-4d %6d B   2x %4dx%-4d %6d B' % (name, one.width, one.height, s1, im.width, im.height, s2))
print('total %d KB' % (total // 1024))

if prev:
    # in-game previews: 1x pieces on the game's ink ground and on the light plain, and 9-slices stretched to real sizes
    os.makedirs(prev, exist_ok=True)
    INK, PLAIN = (22, 29, 21, 255), (124, 150, 118, 255)

    def load(n, scale=1):
        return Image.open(os.path.join(dst, n + ('@2x' if scale == 2 else '') + '.webp')).convert('RGBA')

    def nine(im, l, t, r, b, w, h):
        """Draw im 9-sliced to w x h (stretch), insets in im pixels."""
        out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); W, H = im.size
        xs = [(0, l, 0, l), (l, W - r, l, w - r), (W - r, W, w - r, w)]
        ys = [(0, t, 0, t), (t, H - b, t, h - b), (H - b, H, h - b, h)]
        for sx0, sx1, dx0, dx1 in xs:
            for sy0, sy1, dy0, dy1 in ys:
                if sx1 <= sx0 or sy1 <= sy0 or dx1 <= dx0 or dy1 <= dy0: continue
                out.alpha_composite(im.crop((sx0, sy0, sx1, sy1)).resize((dx1 - dx0, dy1 - dy0), Image.LANCZOS), (dx0, dy0))
        return out

    def board(items, w, h, bg, name):
        c = Image.new('RGBA', (w, h), bg)
        for im, x, y in items: c.alpha_composite(im, (x, y))
        c.convert('RGB').save(os.path.join(prev, name)); print('preview', name)

    for bg, tag in ((INK, 'ink'), (PLAIN, 'plain')):
        hud = [(load('gem'), 2, 2), (nine(load('banner'), 48, 0, 48, 0, 360, 72), 120, 16),
               (load('wallbar'), 520, 32), (load('wallbar-crack1'), 520, 80), (load('wallbar-crack2'), 520, 128), (load('wallbar-crack3'), 520, 176)]
        fill = load('wallbar-fill'); hud.append((fill.crop((0, 0, int(264 * 0.6), 16)), 548, 44))
        for i, t in enumerate(('bow', 'satchel', 'seed', 'cog')): hud.append((load('token-' + t), 16 + 84 * i, 120))
        hud += [(nine(load('plate'), 40, 40, 40, 40, 300, 190), 16, 220), (nine(load('march'), 56, 12, 56, 12, 240, 72), 340, 240),
                (nine(load('march'), 56, 12, 56, 12, 400, 72), 340, 330), (load('stamp'), 620, 230)]
        board(hud, 860, 430, bg, 'hud_%s.png' % tag)
    sat = nine(load('satchel'), 32, 32, 32, 32, 420, 300)
    pk = load('pocket')
    items = [(sat, 16, 16)] + [(pk, 56 + 88 * i, 60 + 92 * j) for i in range(4) for j in range(2)]
    items += [(nine(load('report'), 68, 68, 68, 68, 620, 440), 460, 16), (load('stamp'), 940, 330)]
    board(items, 1100, 480, INK, 'panels_ink.png')
    # 2x stretch check: the plate and report at big 4K sizes
    board([(nine(load('plate', 2), 80, 80, 80, 80, 760, 300), 10, 10), (nine(load('report', 2), 136, 136, 136, 136, 760, 980), 790, 10)],
          1560, 1000, INK, 'stretch_2x.png')
