# TB-188k: after render_camp_backdrop.py. Crops each building PNG to its alpha, writes public/decor/camp/<id><lv>.webp and
# public/decor/camp_backdrop.webp, a preview composite (all buildings at one level) and the scene-unit rects for CAMP_ART
# (src/data/presentation.ts): [x, y, w, h] of each image, plus `top` (the highest opaque point, for the forge sparks and the
# bowyer pennant). python post_camp.py <render dir> <public dir> [preview level]
import json, os, sys
from PIL import Image
src, pub = sys.argv[1], sys.argv[2]; prev = int(sys.argv[3]) if len(sys.argv) > 3 else 0
L = json.load(open(os.path.join(src, "layout.json"))); RX, RY = L["res"]; X0, X1, Y0, Y1 = L["plate"]; PX = L["px"]
os.makedirs(os.path.join(pub, "decor", "camp"), exist_ok=True)
plate = Image.open(os.path.join(src, "plate.png")).convert("RGB")
plate.save(os.path.join(pub, "decor", "camp_backdrop.webp"), quality=90, method=6)
art = {}
comp = plate.convert("RGBA") if prev else None
for n, (bx0, bx1, by0, by1) in sorted(L["rects"].items()):
    im = Image.open(os.path.join(src, n + ".png")).convert("RGBA")
    # the shadow catcher leaves a faint veil over the whole border: drop it so no rectangle shows, keep real shadow
    r_, g_, b_, a_ = im.split(); im = Image.merge("RGBA", (r_, g_, b_, a_.point(lambda v: 0 if v < 20 else min(255, round((v - 20) * 255 / 235)))))
    px0, py0 = round(bx0 * RX), round((1 - by1) * RY)            # border origin in plate pixels (top-left)
    if n.endswith("0"):   # level 0: the hedge's shadow falls into the border as loose blobs: keep only the alpha islands that touch the largest one
        import numpy as np
        from scipy import ndimage
        al0 = np.array(im.getchannel("A")); rgb = np.array(im.convert("RGB")).max(axis=2)
        solid = (al0 > 200) & (rgb >= 12); ys_ = np.where(solid.any(axis=1))[0]
        if len(ys_):   # hedge shadow: dark, in the upper 60% of the building's height, away from the building itself
            cut = (ys_[0] + 0.6 * (ys_[-1] - ys_[0])); near_ = ndimage.binary_dilation(solid, iterations=10)
            al0 = np.where((rgb < 12) & ~near_ & (np.arange(al0.shape[0])[:, None] < cut), 0, al0)
        lab, k = ndimage.label(al0 > 6)
        if k > 1:
            big = np.bincount(lab.ravel())[1:].argmax() + 1
            keep = np.isin(lab, np.unique(lab[solid & (lab > 0)]))
            al0 = np.where(keep, al0, 0)
        im.putalpha(Image.fromarray(al0.astype("uint8")))
    a = im.getchannel("A").point(lambda v: 255 if v > 6 else 0); bb = a.getbbox()
    im = im.crop(bb); x, y = px0 + bb[0], py0 + bb[1]
    im.save(os.path.join(pub, "decor", "camp", n + ".webp"), quality=92, method=6)
    # topmost solid pixel (alpha > 200) for emitters
    al = im.getchannel("A"); W, H = im.size; top = None
    for yy in range(H):
        row = [xx for xx in range(W) if al.getpixel((xx, yy)) > 200]
        if row: top = (x + sum(row) / len(row), y + yy); break
    s = lambda v, o: round(o + v / PX, 1)
    art[n] = {"x": s(x, X0), "y": s(y, Y0), "w": round(W / PX, 1), "h": round(H / PX, 1), "top": [s(top[0], X0), s(top[1], Y0)]}
    if prev and n.endswith(str(prev)): comp.alpha_composite(im, (x, y))
print(json.dumps(art))
if prev: comp.convert("RGB").save(os.path.join(src, f"preview_l{prev}.png"))
