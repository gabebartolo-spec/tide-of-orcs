# Pack build_sprites.ps1 frames into one sheet + atlas (ART-STYLE §Asset pipeline, src/render/sprites.ts).
# python pack_sprites.py <frames dir> <public/sprites dir>
# Frames are <key>_<N>.png (RES 512, field camera); anchors.json maps key -> [x px, y px, ortho] of the ground under the rig origin.
# Each anim is cropped to the union of its frames' alpha, scaled to PX_PER_M, mirrored for orcs (they march screen-left),
# and sized so the actor's body height (its first anim's frame-0 extent) draws BODY_R x radius units tall, like the vector actor.
import json, os, re, sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
RES, PX_PER_M, SHEET_W, PAD = 512, 110, 2048, 2
# key: (fps, mirror, body key, body height in actor radii). Vector actors: orc ~2.4 r with feet, elf/vanguard 36 units at radius 12.
ANIMS = {
    "orc.grunt": (30, True, "orc.grunt", 2.4),
    "orc.grunt.attack": (15, True, "orc.grunt", 2.4),
    "van.spear": (30, False, "van.spear", 3.0),
    "van.spear.attack": (15, False, "van.spear", 3.0),
    "van.blade.attack": (15, False, "van.blade.attack", 3.0),
    "orc.berserker": (30, True, "orc.berserker", 2.4),
    "orc.berserker.attack": (15, True, "orc.berserker", 2.4),
}
anchors = json.load(open(os.path.join(src, "anchors.json"), encoding="utf-8-sig"))

def frames(key):
    fs = [(int(m.group(1)), f) for f in os.listdir(src) if (m := re.fullmatch(re.escape(key) + r"_(\d+)\.png", f))]
    return [Image.open(os.path.join(src, f)).convert("RGBA") for _, f in sorted(fs)]

cuts, body = {}, {}
for key, (fps, mirror, bk, br) in ANIMS.items():
    fr = frames(key)
    if not fr: print("PACK missing", key); continue
    ax, ay, ortho = anchors[key]
    s = PX_PER_M / (RES / ortho)
    box = [min(b[i] for b in (f.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox() for f in fr)) if i < 2 else
           max(b[i] for b in (f.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox() for f in fr)) for i in range(4)]
    box = [max(0, box[0] - PAD), max(0, box[1] - PAD), min(RES, box[2] + PAD), min(RES, box[3] + PAD)]
    w, h = round((box[2] - box[0]) * s), round((box[3] - box[1]) * s)
    out = []
    for f in fr:
        c = f.crop(box).resize((w, h), Image.LANCZOS)
        out.append(c.transpose(Image.FLIP_LEFT_RIGHT) if mirror else c)
    fx, fy = (ax - box[0]) / (box[2] - box[0]), (ay - box[1]) / (box[3] - box[1])
    if key == bk:  # body height: the opaque vertical extent of frame 0, in sheet px
        b0 = fr[0].getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox(); body[key] = (b0[3] - b0[1]) * s
    cuts[key] = dict(imgs=out, fps=fps, ax=round(1 - fx if mirror else fx, 4), ay=round(fy, 4), bk=bk, br=br, touch=box[0] <= 0 or box[2] >= RES or box[1] <= 0)

# shelf-pack every frame into one sheet
x = y = rowh = 0; place = {}
for key, c in cuts.items():
    for i, im in enumerate(c["imgs"]):
        if x + im.width > SHEET_W: x, y, rowh = 0, y + rowh + 1, 0
        place[(key, i)] = (x, y, im.width, im.height); x += im.width + 1; rowh = max(rowh, im.height)
sheet = Image.new("RGBA", (SHEET_W, y + rowh), (0, 0, 0, 0))
anims = {}
for key, c in cuts.items():
    for i, im in enumerate(c["imgs"]): sheet.paste(im, place[(key, i)][:2])
    fh = c["imgs"][0].height
    anims[key] = dict(frames=[list(place[(key, i)]) for i in range(len(c["imgs"]))], fps=c["fps"], ax=c["ax"], ay=c["ay"], hPerR=round(fh / body[c["bk"]] * c["br"], 4))
    print("PACK", key, len(c["imgs"]), "frames", f"{c['imgs'][0].width}x{fh}", "ax", c["ax"], "ay", c["ay"], "hPerR", anims[key]["hPerR"], "EDGE-CLIPPED" if c["touch"] else "")
os.makedirs(dst, exist_ok=True)
sheet.save(os.path.join(dst, "sheet.webp"), "WEBP", quality=90, method=6, alpha_quality=100)
json.dump(dict(image="sheet.webp", anims=anims), open(os.path.join(dst, "atlas.json"), "w"), separators=(",", ":"))
print("PACK sheet", sheet.size, os.path.getsize(os.path.join(dst, "sheet.webp")) // 1024, "KB")
