# TB-208: after render_camp_backdrop.py's "elk" pass. Drops the shadow catcher's faint veil (as post_camp.py does), crops every
# frame to the union of their alpha so all frames share one rect, packs them into a grid sheet public/decor/camp/elk.webp
# (COLS per row) and prints the CAMP_ELK_ART rect (scene units) for src/data/presentation.ts. Optional: a contact sheet PNG.
# python post_elk.py <render dir> <public dir> [contact sheet png]   env NAME (elk): the sheet name, elk_r for the right-facing pass
import json, os, sys
from PIL import Image
src, pub = sys.argv[1], sys.argv[2]; sheet = sys.argv[3] if len(sys.argv) > 3 else None
E = json.load(open(os.path.join(src, "elk", "elk.json"))); RX, RY = E["res"]; X0, X1, Y0, Y1 = E["plate"]; PX = E["px"]; n = E["n"]
bx0, bx1, by0, by1 = E["rect"]; px0, py0 = round(bx0 * RX), round((1 - by1) * RY)
# The shadow catcher leaves a faint, uneven veil over the whole frame; bg.png is the same plate with the elk hidden, so each
# frame's alpha is un-composited against it: a' = (a - bg) / (1 - bg), leaving only the elk and its own shadow; the faint
# sky-occlusion halo (under 10/255) ramps to zero so it never reaches the frame edge.
from PIL import ImageChops
BG = Image.open(os.path.join(src, "elk", "bg.png")).getchannel("A")
inv = BG.point(lambda v: 255 - v)
fr = []
for i in range(n):
    im = Image.open(os.path.join(src, "elk", "%03d.png" % i)).convert("RGBA")
    r_, g_, b_, a_ = im.split(); d = ImageChops.subtract(a_, BG)
    a2 = Image.frombytes("L", d.size, bytes(0 if v < 10 or w == 0 else min(255, (v - 10) * 255 // max(1, w - 10)) for v, w in zip(d.tobytes(), inv.tobytes())))
    fr.append(Image.merge("RGBA", (r_, g_, b_, a2)))
# One contact shadow (TB-208 critic): the low camp sun throws the antlers' and head's shadows far across the grass as thin
# streaks, and on the right-facing pass a second smear behind the hind legs; both read as stray marks at game scale. The elk
# grazes on one spot, so frame 0's hooves (lowest non-shadow pixels) fix one ground ellipse for every frame; shadow pixels
# (near-black: the catcher writes no colour) keep their alpha inside it and fade to none by SH_FADE times its radius.
import math
def _dark(p): return max(p[0], p[1], p[2]) < 24
a0 = fr[0].load(); W0_, H0_ = fr[0].size
body = [(x, y) for y in range(H0_) for x in range(W0_) if a0[x, y][3] > 128 and not _dark(a0[x, y])]
hy = max(y for x, y in body); feet = [x for x, y in body if y >= hy - 10]
SH_PAD, SH_RY, SH_FADE = float(os.environ.get("SH_PAD", "10")), float(os.environ.get("SH_RY", "9")), 1.35
cx, rx, cy = (min(feet) + max(feet)) / 2, (max(feet) - min(feet)) / 2 + SH_PAD, hy - 2
for im in fr:
    px_ = im.load()
    for y in range(max(0, int(cy - 12)), H0_):   # above the ground band the only near-black pixels are the elk's own
        for x in range(W0_):
            p = px_[x, y]
            if p[3] == 0 or not _dark(p): continue
            e = math.hypot((x - cx) / rx, (y - cy) / SH_RY) if y > cy else abs(x - cx) / rx   # above the hoof line: a column
            if e > 1: px_[x, y] = (p[0], p[1], p[2], int(p[3] * max(0.0, (SH_FADE - e) / (SH_FADE - 1))))
bb = None
for im in fr:
    b = im.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
    bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
W0, H0 = fr[0].size; pad = 4   # the render border must sit clear of everything kept, or the shadow is cut by the frame edge
assert bb[0] >= pad and bb[1] >= pad and bb[2] <= W0 - pad and bb[3] <= H0 - pad, ("elk or its shadow touches the render border", bb, (W0, H0))
bb = (bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad)
fr = [im.crop(bb) for im in fr]; W, H = fr[0].size; COLS = 8; rows = (n + COLS - 1) // COLS
g = Image.new("RGBA", (W * COLS, H * rows), (0, 0, 0, 0))
for i, im in enumerate(fr): g.paste(im, ((i % COLS) * W, (i // COLS) * H))
os.makedirs(os.path.join(pub, "decor", "camp"), exist_ok=True)
g.save(os.path.join(pub, "decor", "camp", os.environ.get("NAME", "elk") + ".webp"), quality=90, method=6)
x, y = px0 + bb[0], py0 + bb[1]; s = lambda v, o: round(o + v / PX, 1)
print(json.dumps({"x": s(x, X0), "y": s(y, Y0), "w": round(W / PX, 1), "h": round(H / PX, 1), "n": n, "cols": COLS, "fps": E["fps"]}))
if sheet:
    k = 0.5; tw, th = int(W * k), int(H * k); cs = Image.new("RGB", (tw * COLS, (th + 14) * rows), (54, 62, 48))
    from PIL import ImageDraw
    d = ImageDraw.Draw(cs)
    for i, im in enumerate(fr):
        cx, cy = (i % COLS) * tw, (i // COLS) * (th + 14); cs.paste(im.resize((tw, th)), (cx, cy + 14), im.resize((tw, th))); d.text((cx + 3, cy + 1), str(i), fill=(230, 230, 210))
    cs.save(sheet)
