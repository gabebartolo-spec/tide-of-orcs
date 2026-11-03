# Pack build_sprites.ps1 frames into four sheets + one atlas (ART-STYLE §Asset pipeline, src/render/sprites.ts).
# sheet_orcs (grunt, berserker, drummer, shaman), sheet_orcs2 (runner, brute, wolf rider, hawk), sheet_elf (elf, wolf), sheet_van (vanguard);
# each anim names its image in the atlas. TB-194: attacks keep every clip frame at 30 fps.
# python pack_sprites.py <frames dir> <public/sprites dir>
# Frames are <key>_<N>.png (RES 512, field camera); anchors.json maps key -> [x px, y px, ortho] of the ground under the rig origin.
# Each anim is cropped to the union of its frames' alpha, scaled to PX_PER_M, mirrored for orcs (they march screen-left),
# and sized so the actor's body height (its first anim's frame-0 extent) draws BODY_R x radius units tall, like the vector actor.
import json, os, re, sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
RES, PX_PER_M, SHEET_W, PAD = 512, 110, 2048, 2
# TB-194: four sheets (each <= 2 MB) since attacks are packed at 30 fps (every clip frame); was orcs + elf (TB-129)
SHEETS = {"orcs": "sheet_orcs.webp", "orcs2": "sheet_orcs2.webp", "elf": "sheet_elf.webp", "van": "sheet_van.webp", "camp": "sheet_camp.webp", "archer": "sheet_archer.webp", "boss": "sheet_boss.webp"}
ORCS2 = ("orc.runner", "orc.brute", "orc.wolfrider", "hawk")
def sheet_of(key):
    if key.startswith("orc.boss"): return SHEETS["boss"]  # TB-214 Warboss: its own sheet (walk, punch, death at r 24)
    if key.startswith("camp."): return SHEETS["camp"]
    if key.startswith("archer"): return SHEETS["archer"]  # TB-203 companion archer: its own sheet (206 frames would push sheet_elf past 2 MB)
    if key.startswith(ORCS2): return SHEETS["orcs2"]
    if key.startswith("orc."): return SHEETS["orcs"]
    return SHEETS["van" if key.startswith("van.") else "elf"]
# key: (fps, mirror, body key, body height in actor radii). Vector actors: orc ~2.4 r with feet, elf/vanguard 36 units at radius 12.
ANIMS = {
    "orc.grunt": (30, True, "orc.grunt", 2.4),
    "orc.grunt.attack": (30, True, "orc.grunt", 2.4),
    "van.spear": (30, False, "van.spear", 3.0),
    "van.spear.attack": (30, False, "van.spear", 3.0),
    "van.blade": (30, False, "van.blade", 3.0),
    "van.blade.attack": (30, False, "van.blade", 3.0),
    "orc.berserker": (30, True, "orc.berserker", 2.4),
    "orc.berserker.attack": (30, True, "orc.berserker", 2.4),
    "orc.drummer": (30, True, "orc.drummer", 2.4),  # walk only (drumming dropped by the director)
    "orc.shaman": (30, True, "orc.shaman", 2.4),
    "orc.shaman.attack": (30, True, "orc.shaman", 2.4),
    "orc.runner": (30, True, "orc.runner", 2.4),
    "orc.runner.attack": (30, True, "orc.runner", 2.4),
    "orc.brute": (30, True, "orc.brute", 2.4),  # radius 16 (orcs.ts) already makes it bigger than a grunt
    "orc.brute.attack": (30, True, "orc.brute", 2.4),
    "elf": (30, False, "elf", 3.0),  # idle loop, every clip frame (TB-144)
    "elf.attack": (30, False, "elf", 3.0),  # all 32 frames; field.ts scrubs it with the bow charge
    "archer": (30, False, "archer", 3.0),  # TB-203 companion idle v7, 162 frames (5% slower resample of the elf idle)
    "archer.attack": (30, False, "archer", 3.0),  # TB-203 v7: 44 frames, release at frame 33; field.ts plays it on each volley
    "wolf": (25, False, "wolf", 1.6),  # TB-160 companion run, blam's CC BY Sketchfab wolf retextured; ortho 2.4 is a stand-in (the gltf is 1/100 scale)
    "wolf.attack": (25, False, "wolf", 1.6),  # all 33 bite frames; field.ts scrubs it with the bite cooldown
    "hawk": (30, False, "hawk", 3.0),  # TB-068 companion flight v1 (director 3 Nov): OSU CC BY Sketchfab hawk, its own Wings Flapping clip, frames 0-29 (render_hawk.py VIEW=game YAW=90); anchor = bird centre
    "orc.wolfrider": (25, True, "orc.wolfrider", 2.6),  # run v8 (director 3 Nov): companion wolf run copied onto the rider wolf, orc at rest; frames from wolfrider/render_wr_sheet.py STEP=1
    "orc.wolfrider.attack": (15, True, "orc.wolfrider", 2.6),  # shares the run body key, same ortho 1.4
    # TB-214 Warboss v3: 3DE_Study Sketchfab orc on Mixamo clips (boss3de/render_mixamo.sh, apply_anim.py GAMECAM=20, facing
    # screen-right like the grunt, so mirrored): Orc Walk (36 frames, ORTHO 2.6), Standing Melee Attack Downward (69, ORTHO 4.6 so
    # the swung axe stays inside the cell), Dying (every 2nd of 133 = 67 at 15 fps, ORTHO 3.4). Per-key ortho is fine: the packer scales by it.
    # Body 3.0 radii (orc 2.4): at r 24 the Warboss stands ~1.9x a brute's height so it reads as the boss.
    "orc.boss": (30, True, "orc.boss", 3.0),
    "orc.boss.attack": (30, True, "orc.boss", 3.0),
    "orc.boss.death": (15, True, "orc.boss", 3.0),
}
# TB-188d: Tripo camp buildings, one static frame per building per level (render_camp.py, ORTHO 2.2, anchor = ground centre).
# hPerR is the frame's height in metres, so camp.ts draws it with r = CAMP_UNITS_PER_M (field units per metre).
for _b in ("bowyer", "forge", "kitchen", "training"):
    for _l in (1, 2, 3): ANIMS[f"camp.{_b}.{_l}"] = (1, False, f"camp.{_b}.{_l}", 0)
# ONLY=<prefix>: pack just the keys with that prefix and merge them into the existing atlas.json; refuses unless those keys fill
# their sheets alone, so a partial repack never rewrites another actor's sheet (shared frames dir may hold other sessions' work).
ONLY = os.environ.get("ONLY")
if ONLY:
    ANIMS = {k: v for k, v in ANIMS.items() if k.startswith(ONLY)}
    assert ANIMS, f"no ANIMS key starts with {ONLY}"
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
    # sx: the body's mean opaque x over the loop (0..1 of frame), so the in-engine shadow centres under the body, not the rig origin
    import numpy as _np
    _m = _np.mean([_np.nonzero(_np.array(f.getchannel("A")) > 40)[1].mean() for f in fr]); _sx = (_m - box[0]) / (box[2] - box[0])
    _ext = {}
    if key.endswith(".death"):  # TB-214: per-frame shadow x = mean x of the body's bottom band (the feet while he staggers, the whole body once down), and land = first frame under half frame 0's opaque height (the splat lands then)
        _sxf, _hs = [], []
        for f in fr:
            A_ = _np.array(f.getchannel("A")) > 40; ys = _np.nonzero(A_.any(1))[0]; y0, y1 = int(ys[0]), int(ys[-1])
            xs = _np.nonzero(A_[max(y0, y1 - max(4, (y1 - y0) // 6)):y1 + 1])[1]; v = (xs.mean() - box[0]) / (box[2] - box[0])
            _sxf.append(round(float(1 - v if mirror else v), 4)); _hs.append(y1 - y0)
        _ext = dict(sxf=_sxf, land=next((i for i, hh in enumerate(_hs) if hh < 0.5 * _hs[0]), len(_hs) - 1))
    cuts[key] = dict(sx=round(1 - _sx if mirror else _sx, 4), imgs=out, ext=_ext, fps=fps, ax=round(1 - fx if mirror else fx, 4), ay=round(fy, 4), bk=bk, br=br, touch=box[0] <= 0 or box[2] >= RES or box[1] <= 0)

# shelf-pack every frame, one sheet per group (orcs / elf + vanguard)
anims, sheets = {}, {}
for name in SHEETS.values():
    group = {k: c for k, c in cuts.items() if sheet_of(k) == name}
    if not group: continue
    x = y = rowh = 0; place = {}
    for key, c in group.items():
        for i, im in enumerate(c["imgs"]):
            if x + im.width > SHEET_W: x, y, rowh = 0, y + rowh + 1, 0
            place[(key, i)] = (x, y, im.width, im.height); x += im.width + 1; rowh = max(rowh, im.height)
    sheet = Image.new("RGBA", (SHEET_W, y + rowh), (0, 0, 0, 0))
    for key, c in group.items():
        for i, im in enumerate(c["imgs"]): sheet.paste(im, place[(key, i)][:2])
        fh = c["imgs"][0].height
        anims[key] = dict(image=name, frames=[list(place[(key, i)]) for i in range(len(c["imgs"]))], fps=c["fps"], ax=c["ax"], sx=c["sx"], ay=c["ay"], hPerR=round(fh / PX_PER_M if key.startswith("camp.") else fh / body[c["bk"]] * c["br"], 4), **c.get("ext", {}))
        print("PACK", key, len(c["imgs"]), "frames", f"{c['imgs'][0].width}x{fh}", "ax", c["ax"], "ay", c["ay"], "hPerR", anims[key]["hPerR"], "->", name, "EDGE-CLIPPED" if c["touch"] else "")
    sheets[name] = sheet
os.makedirs(dst, exist_ok=True)
if ONLY:
    prev = json.load(open(os.path.join(dst, "atlas.json"), encoding="utf-8"))
    for k, a in prev["anims"].items():
        assert a["image"] not in sheets or k.startswith(ONLY), f"ONLY={ONLY}: sheet {a['image']} also holds {k}; repack it whole"
    prev["anims"] = {k: a for k, a in prev["anims"].items() if not k.startswith(ONLY)} | anims
    prev["images"] = sorted(set(prev["images"]) | set(sheets)); anims, sheet_names = prev["anims"], prev["images"]
else:
    sheet_names = sorted(sheets)
for name, sheet in sheets.items():
    sheet.save(os.path.join(dst, name), "WEBP", quality=90, method=6, alpha_quality=100)
    print("PACK sheet", name, sheet.size, os.path.getsize(os.path.join(dst, name)) // 1024, "KB")
json.dump(dict(images=sheet_names, anims=anims), open(os.path.join(dst, "atlas.json"), "w"), separators=(",", ":"))
old = os.path.join(dst, "sheet.webp")
if os.path.exists(old): os.remove(old); print("PACK removed", old)
