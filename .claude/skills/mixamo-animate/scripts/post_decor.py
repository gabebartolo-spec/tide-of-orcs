# TB-250: after render_camp_backdrop.py's trophy_* / banner_* passes. Crops each PNG to its alpha (the shadow kept, the shadow
# catcher's faint veil dropped as post_camp.py does), writes public/decor/camp/<id>.webp and prints the CAMP_DECOR_ART rects
# for src/data/presentation.ts in scene units: {x, y, w, h}. With a preview path it also writes the plate with every piece on it.
# python post_decor.py <render dir> <public dir> [preview.png]
import json, os, sys
from PIL import Image
src, pub = sys.argv[1], sys.argv[2]; prev = sys.argv[3] if len(sys.argv) > 3 else None
L = json.load(open(os.path.join(src, "layout.json"))); RX, RY = L["res"]; X0, X1, Y0, Y1 = L["plate"]; PX = L["px"]
os.makedirs(os.path.join(pub, "decor", "camp"), exist_ok=True)
comp = Image.open(os.path.join(src, "plate.png")).convert("RGBA") if prev else None
art = {}
for n, (bx0, bx1, by0, by1) in sorted(L["rects"].items()):
    if not n.startswith(("trophy_", "banner_", "camp_")): continue
    im = Image.open(os.path.join(src, n + ".png")).convert("RGBA")
    r_, g_, b_, a_ = im.split(); im = Image.merge("RGBA", (r_, g_, b_, a_.point(lambda v: 0 if v < 20 else min(255, round((v - 20) * 255 / 235)))))
    px0, py0 = round(bx0 * RX), round((1 - by1) * RY)
    bb = im.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
    im = im.crop(bb); x, y = px0 + bb[0], py0 + bb[1]
    im.save(os.path.join(pub, "decor", "camp", n + ".webp"), quality=92, method=6)
    s = lambda v, o: round(o + v / PX, 1)
    art[n] = {"x": s(x, X0), "y": s(y, Y0), "w": round(im.width / PX, 1), "h": round(im.height / PX, 1)}
    if comp: comp.alpha_composite(im, (x, y))
print(json.dumps(art))
if comp: comp.convert("RGB").save(prev)
