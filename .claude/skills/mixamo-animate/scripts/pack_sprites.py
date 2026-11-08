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
SHEETS = {"orcs": "sheet_orcs.webp", "orcs2": "sheet_orcs2.webp", "elf": "sheet_elf.webp", "van": "sheet_van.webp", "camp": "sheet_camp.webp", "boss": "sheet_boss.webp", "packed": "sheet_packed.webp", "orcBoss": "sheet_orcboss.webp", "archer": "sheet_archer.webp"}
ORCS2 = ("orc.runner", "orc.brute", "orc.wolfrider", "hawk")
def sheet_of(key):
    if key.startswith("camp."): return SHEETS["camp"]
    if key.startswith("archer"): return SHEETS["archer"]  # TB-203 companion archer: its own sheet (206 frames would push sheet_elf past 2 MB)
    if key.startswith("orc.packed"): return SHEETS["packed"]  # TB-214 warlord boss (3DE_Study orc): its own sheet
    if key.startswith("orc.orcBoss"): return SHEETS["orcBoss"]  # TB-213 dartuchiwa orc boss: its own sheet
    if key.startswith("orc.boss"): return SHEETS["boss"]  # TB-229 fantasy orc boss: its own sheet (105 big frames)
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
    "orc.drummer": (30, True, "orc.drummer", 2.4),  # walk v2
    "orc.drummer.attack": (30, True, "orc.drummer", 2.4),  # TB-186 halted drumming v7: drum_simple.py two-stick loop, 24 frames, looped by field.ts
    "orc.shaman": (30, True, "orc.shaman", 2.4),
    "orc.shaman.attack": (30, True, "orc.shaman", 2.4),
    "orc.runner": (30, True, "orc.runner", 2.4),
    "orc.runner.attack": (30, True, "orc.runner", 2.4),
    "orc.brute": (30, True, "orc.brute", 2.4),  # radius 16 (orcs.ts) already makes it bigger than a grunt
    "orc.brute.attack": (30, True, "orc.brute", 2.4),
    "orc.boss": (30, True, "orc.boss", 2.4),  # TB-229 fantasy orc walk v3, radius 24
    "orc.boss.attack": (30, True, "orc.boss", 2.4),  # TB-229 Standing Melee Attack Downward, all 69 frames
    "orc.packed": (30, True, "orc.packed", 2.4),  # TB-214 warlord v1 (director 5 Nov): the model's own "walking" clip, frames 1-35 (render_own.py)
    "orc.packed.attack": (30, True, "orc.packed", 2.4),  # TB-214 warlord v1: the model's own "punch" clip, frames 1-30
    "orc.orcBoss": (30, True, "orc.orcBoss", 2.4),  # TB-213 v1 (director 9 Nov): the model's own Walk clip, frames 1-29 (render_own.py ORTHO 2.4 CZ 0.6)
    "orc.orcBoss.attack": (30, True, "orc.orcBoss", 2.4),  # TB-213 v1: the model's own Punch clip, frames 1-33
    "elf": (30, False, "elf", 3.0),  # idle loop, every clip frame (TB-144)
    "elf.attack": (30, False, "elf", 3.0),  # all 32 frames; field.ts scrubs it with the bow charge
    "archer": (30, False, "archer", 3.0),  # TB-203 companion idle v7, 162 frames (5% slower resample of the elf idle)
    "archer.attack": (30, False, "archer", 3.0),  # TB-203 v7: 44 frames, release at frame 33; field.ts plays it on each volley
    "wolf": (25, False, "wolf", 1.6),  # TB-160 companion run, blam's CC BY Sketchfab wolf retextured; ortho 2.4 is a stand-in (the gltf is 1/100 scale)
    "wolf.attack": (25, False, "wolf", 1.6),  # all 33 bite frames; field.ts scrubs it with the bite cooldown
    "hawk": (30, False, "hawk", 3.0),  # TB-068 companion flight v1 (director 3 Nov): OSU CC BY Sketchfab hawk, its own Wings Flapping clip, frames 0-29 (render_hawk.py VIEW=game YAW=90); anchor = bird centre
    "orc.wolfrider": (25, True, "orc.wolfrider", 2.6),  # run v8 (director 3 Nov): companion wolf run copied onto the rider wolf, orc at rest; frames from wolfrider/render_wr_sheet.py STEP=1
    "orc.wolfrider.attack": (15, True, "orc.wolfrider", 2.6),  # shares the run body key, same ortho 1.4
}
# TB-188d: Tripo camp buildings, one static frame per building per level (render_camp.py, ORTHO 2.2, anchor = ground centre).
# hPerR is the frame's height in metres, so camp.ts draws it with r = CAMP_UNITS_PER_M (field units per metre).
for _b in ("bowyer", "forge", "kitchen", "training"):
    for _l in (1, 2, 3): ANIMS[f"camp.{_b}.{_l}"] = (1, False, f"camp.{_b}.{_l}", 0)
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
        anims[key] = dict(image=name, frames=[list(place[(key, i)]) for i in range(len(c["imgs"]))], fps=c["fps"], ax=c["ax"], ay=c["ay"], hPerR=round(fh / PX_PER_M if key.startswith("camp.") else fh / body[c["bk"]] * c["br"], 4))
        print("PACK", key, len(c["imgs"]), "frames", f"{c['imgs'][0].width}x{fh}", "ax", c["ax"], "ay", c["ay"], "hPerR", anims[key]["hPerR"], "->", name, "EDGE-CLIPPED" if c["touch"] else "")
    sheets[name] = sheet
os.makedirs(dst, exist_ok=True)
for name, sheet in sheets.items():
    sheet.save(os.path.join(dst, name), "WEBP", quality=90, method=6, alpha_quality=100)
    print("PACK sheet", name, sheet.size, os.path.getsize(os.path.join(dst, name)) // 1024, "KB")
json.dump(dict(images=sorted(sheets), anims=anims), open(os.path.join(dst, "atlas.json"), "w"), separators=(",", ":"))
old = os.path.join(dst, "sheet.webp")
if os.path.exists(old): os.remove(old); print("PACK removed", old)
