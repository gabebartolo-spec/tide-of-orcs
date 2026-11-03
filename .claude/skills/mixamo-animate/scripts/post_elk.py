# TB-208: after render_camp_backdrop.py's "elk" pass. Drops the shadow catcher's faint veil (as post_camp.py does), crops every
# frame to the union of their alpha so all frames share one rect, packs them into a grid sheet public/decor/camp/elk.webp
# (COLS per row) and prints the CAMP_ELK_ART rect (scene units) for src/data/presentation.ts. Optional: a contact sheet PNG.
# python post_elk.py <render dir> <public dir> [contact sheet png]
import json, os, sys
from PIL import Image
src, pub = sys.argv[1], sys.argv[2]; sheet = sys.argv[3] if len(sys.argv) > 3 else None
E = json.load(open(os.path.join(src, "elk", "elk.json"))); RX, RY = E["res"]; X0, X1, Y0, Y1 = E["plate"]; PX = E["px"]; n = E["n"]
bx0, bx1, by0, by1 = E["rect"]; px0, py0 = round(bx0 * RX), round((1 - by1) * RY)
fr = []
for i in range(n):
    im = Image.open(os.path.join(src, "elk", "%03d.png" % i)).convert("RGBA")
    r_, g_, b_, a_ = im.split(); fr.append(Image.merge("RGBA", (r_, g_, b_, a_.point(lambda v: 0 if v < 20 else min(255, round((v - 20) * 255 / 235))))))
bb = None
for im in fr:
    b = im.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
    bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
fr = [im.crop(bb) for im in fr]; W, H = fr[0].size; COLS = 8; rows = (n + COLS - 1) // COLS
g = Image.new("RGBA", (W * COLS, H * rows), (0, 0, 0, 0))
for i, im in enumerate(fr): g.paste(im, ((i % COLS) * W, (i // COLS) * H))
os.makedirs(os.path.join(pub, "decor", "camp"), exist_ok=True)
g.save(os.path.join(pub, "decor", "camp", "elk.webp"), quality=90, method=6)
x, y = px0 + bb[0], py0 + bb[1]; s = lambda v, o: round(o + v / PX, 1)
print(json.dumps({"x": s(x, X0), "y": s(y, Y0), "w": round(W / PX, 1), "h": round(H / PX, 1), "n": n, "cols": COLS, "fps": E["fps"]}))
if sheet:
    k = 0.5; tw, th = int(W * k), int(H * k); cs = Image.new("RGB", (tw * COLS, (th + 14) * rows), (54, 62, 48))
    from PIL import ImageDraw
    d = ImageDraw.Draw(cs)
    for i, im in enumerate(fr):
        cx, cy = (i % COLS) * tw, (i // COLS) * (th + 14); cs.paste(im.resize((tw, th)), (cx, cy + 14), im.resize((tw, th))); d.text((cx + 3, cy + 1), str(i), fill=(230, 230, 210))
    cs.save(sheet)
