# Preview the look.json grade on the shipped sprite sheets, without Blender (TB-278). The grade runs on lit render pixels here,
# not on the textures, so this is an approximation used to tune look.json before the GPU re-render.
#   python look_test.py <repo> <out.png> key[,key...]
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import look
repo, out, keys = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
cfg = look._cfg(); g = cfg["global"]
PROF = {"orc.grunt": "grunt", "orc.runner": "runner", "orc.brute": "brute", "orc.berserker": "berserker", "orc.wolfrider": "wolfrider", "orc.shaman": "shaman",
        "orc.drummer": "drummer", "orc.boss": "warboss", "orc.ogre": "ogre", "orc.orcBoss": "orcBoss", "orc.packed": "packed", "orc.ogreCreature": "ogreCreature", "wolf": "wolf", "hawk": "hawk"}
a = json.load(open(f"{repo}/public/sprites/atlas.json")); H = 300; rows = []
for before in (True, False):
    cells = []
    for k in keys:
        v = a["anims"][k]; im = Image.open(f"{repo}/public/sprites/{v['image']}").convert("RGBA")
        x, y, w, h = v["frames"][len(v["frames"]) // 3]; c = np.asarray(im.crop((x, y, x + w, y + h))).astype(np.float32) / 255
        if not before:
            body = c[..., 3] > 0.9; prof = cfg["profiles"].get(PROF.get(k, "default"), {})
            c[..., :3][body] = look.grade(c[..., :3][body], g, prof)
        ci = Image.fromarray((c * 255).astype(np.uint8)); s = H / ci.height; cells.append(ci.resize((int(ci.width * s), H), Image.LANCZOS))
    rows.append(cells)
W = max(sum(c.width + 16 for c in r) for r in rows); outim = Image.new("RGBA", (W, (H + 20) * 2), (124, 150, 118, 255))
for i, r in enumerate(rows):
    x = 8
    for c in r: outim.alpha_composite(c, (x, i * (H + 20) + 10)); x += c.width + 16
outim.save(out)
