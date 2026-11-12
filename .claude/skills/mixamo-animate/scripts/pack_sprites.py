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
SHEETS = {"orcs": "sheet_orcs.webp", "orcs2": "sheet_orcs2.webp", "elf": "sheet_elf.webp", "van": "sheet_van.webp", "camp": "sheet_camp.webp", "boss": "sheet_boss.webp", "ogre": "sheet_ogre.webp", "packed": "sheet_packed.webp", "orcBoss": "sheet_orcboss.webp", "ogreCreature": "sheet_ogrecreature.webp", "archer": "sheet_archer.webp"}
ORCS2 = ("orc.runner", "orc.brute", "orc.wolfrider", "hawk")
def sheet_of(key):
    if key.startswith("camp."): return SHEETS["camp"]
    if key.startswith("archer"): return SHEETS["archer"]  # TB-203 companion archer: its own sheet (206 frames would push sheet_elf past 2 MB)
    if key.startswith("orc.packed"): return SHEETS["packed"]  # TB-214 warlord boss (3DE_Study orc): its own sheet
    if key.startswith("orc.orcBoss"): return SHEETS["orcBoss"]  # TB-213 dartuchiwa orc boss: its own sheet
    if key.startswith("orc.ogre") and not key.startswith("orc.ogreCreature"): return SHEETS["ogre"]  # TB-211 Reizake Troll_Orc
    if key.startswith("orc.ogreCreature"): return SHEETS["ogreCreature"]  # TB-228 Sazerac ogre: its own sheet
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
    "orc.ogre": (30, False, "orc.ogre", 3.4),  # TB-211 (director 9 Nov, side-on): its own take 61-110, right arm 70% to take idle 1; ogre/render_ogre.py VIEW=game YAW=270 ORTHO=4.2 INPLACE=1 SPLICE="61-110~1@0.7"; faces left, no mirror
    "orc.ogre.attack": (30, False, "orc.ogre", 3.4),  # TB-211: 29 frames, splice idle 171, blend to 180, take chop 180-190, blend back; strike frame 12
    "orc.ogreCreature": (30, True, "orc.ogreCreature", 2.4),  # TB-228 v1 (director 9 Nov): Orc Walk, frames 0-35 (apply_anim.py ORTHO 3.6)
    "orc.ogreCreature.attack": (30, True, "orc.ogreCreature", 2.4),  # TB-228 v1: Standing Melee Attack Downward AS100, frames 0-67
    "elf": (30, False, "elf", 3.0),  # idle loop, every clip frame (TB-144)
    "elf.attack": (30, False, "elf", 3.0),  # all 32 frames; field.ts scrubs it with the bow charge
    "archer": (30, False, "archer", 3.0),  # TB-203 companion idle v7, 162 frames (5% slower resample of the elf idle)
    "archer.attack": (30, False, "archer", 3.0),  # TB-203 v7: 44 frames, release at frame 33; field.ts plays it on each volley
    "wolf": (25, False, "wolf", 1.6),  # TB-160 companion run, blam's CC BY Sketchfab wolf retextured; ortho 2.4 is a stand-in (the gltf is 1/100 scale)
    "wolf.attack": (25, False, "wolf", 1.6),  # all 33 bite frames; field.ts scrubs it with the bite cooldown
    "hawk": (30, False, "hawk", 3.0),  # TB-068 companion flight v1 (director 3 Nov): OSU CC BY Sketchfab hawk, its own Wings Flapping clip, frames 0-29 (render_hawk.py VIEW=game YAW=90); anchor = bird centre
    "orc.wolfrider": (30, True, "orc.wolfrider", 2.6),  # TB-210: blam CC BY Orc_LightCavalry; Quaternius CC0 Gallop copied on (wolfrider_blam/build_gallop.py RARM=3), then smooth_run.py (34 frames); render_blam.py ORTHO 1.8
    "orc.wolfrider.attack": (30, True, "orc.wolfrider", 2.6),  # TB-210: its own 07_attack_A clip (axe), all 41 frames, same ortho 1.8
}
# TB-188d: Tripo camp buildings, one static frame per building per level (render_camp.py, ORTHO 2.2, anchor = ground centre).
# hPerR is the frame's height in metres, so camp.ts draws it with r = CAMP_UNITS_PER_M (field units per metre).
for _b in ("bowyer", "forge", "kitchen", "training"):
    for _l in (1, 2, 3): ANIMS[f"camp.{_b}.{_l}"] = (1, False, f"camp.{_b}.{_l}", 0)
anchors = json.load(open(os.path.join(src, "anchors.json"), encoding="utf-8-sig"))

# TB-210: the rider frames live in tide-assets/wolfrider_blam/frames; anchored at the wolf's chest so the muzzle stops at the barricade (ORC_SHADOW moves the shadow back).
WRDIR = os.environ.get("WRFRAMES", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(src))), "wolfrider_blam", "frames"))
KEYDIR = {"orc.wolfrider": WRDIR, "orc.wolfrider.attack": WRDIR}
anchors.update(json.load(open(os.path.join(WRDIR, "anchors_wolfrider.json"), encoding="utf-8-sig")))
for _k in KEYDIR: anchors[_k] = [430.0] + list(anchors[_k][1:])

def frames(key):
    src_ = KEYDIR.get(key, src)
    fs = [(int(m.group(1)), f) for f in os.listdir(src_) if (m := re.fullmatch(re.escape(key) + r"_(\d+)\.png", f))]
    return [Image.open(os.path.join(src_, f)).convert("RGBA") for _, f in sorted(fs)]

cuts, body = {}, {}
for key, (fps, mirror, bk, br) in ANIMS.items():
    fr = frames(key)
    if not fr: print("PACK missing", key); continue
    ax, ay, ortho = anchors[key][:3]; lit = len(anchors[key]) > 3  # TB-253: a 4th anchor value marks frames re-lit with their own cast shadow
    bt = 160 if lit else 8  # body height ignores the soft shadow (alpha <= ~140)
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
        b0 = fr[0].getchannel("A").point(lambda a: 255 if a > bt else 0).getbbox(); body[key] = (b0[3] - b0[1]) * s
    cuts[key] = dict(imgs=out, fps=fps, ax=round(1 - fx if mirror else fx, 4), ay=round(fy, 4), bk=bk, br=br, lit=lit, touch=box[0] <= 0 or box[2] >= RES or box[1] <= 0)

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
        anims[key] = dict(**({"lit": 1} if c.get("lit") else {}), image=name, frames=[list(place[(key, i)]) for i in range(len(c["imgs"]))], fps=c["fps"], ax=c["ax"], ay=c["ay"], hPerR=round(fh / PX_PER_M if key.startswith("camp.") else fh / body[c["bk"]] * c["br"], 4))
        print("PACK", key, len(c["imgs"]), "frames", f"{c['imgs'][0].width}x{fh}", "ax", c["ax"], "ay", c["ay"], "hPerR", anims[key]["hPerR"], "->", name, "EDGE-CLIPPED" if c["touch"] else "")
    sheets[name] = sheet
os.makedirs(dst, exist_ok=True)
for name, sheet in sheets.items():
    q = 90  # TB-253: lit frames carry soft shadow alpha, so a full sheet can pass 2 MB; step quality down until it fits
    while True:
        sheet.save(os.path.join(dst, name), "WEBP", quality=q, method=6, alpha_quality=100)
        if os.path.getsize(os.path.join(dst, name)) <= 2 * 1024 * 1024 or q <= 70: break
        q -= 4
    print("PACK sheet", name, sheet.size, os.path.getsize(os.path.join(dst, name)) // 1024, "KB")
json.dump(dict(images=sorted(sheets), anims=anims), open(os.path.join(dst, "atlas.json"), "w"), separators=(",", ":"))
old = os.path.join(dst, "sheet.webp")
if os.path.exists(old): os.remove(old); print("PACK removed", old)
