# TB-250 bow woods: director previews. Each frame is the elf's own frame with the bow-only overlay drawn over it, as field.ts does.
# Args: frames_dir out_dir   Writes per wood: bow_<wood>_idle.gif (all 153 idle frames), bow_<wood>_shoot.gif (all 32 draw frames),
# and board.png: idle frame 0 and full draw (frame 31) for the default bow and each wood, plus each wood over the ember cloak.
import os, sys
from PIL import Image
F, O = sys.argv[1], sys.argv[2]; os.makedirs(O, exist_ok=True)
WOODS = ("moonsilver", "thornwood", "heartwood"); BG = (124, 150, 118, 255); BOX = (20, 40, 470, 450)  # crop of the 512 px frame
def comp(base, bow=None):
    im = Image.open(os.path.join(F, base + ".png")).convert("RGBA")
    if bow: im.alpha_composite(Image.open(os.path.join(F, bow + ".png")).convert("RGBA"))
    out = Image.new("RGBA", im.size, BG); out.alpha_composite(im); return out.crop(BOX).convert("RGB")
def gif(path, ims): ims[0].save(path, save_all=True, append_images=ims[1:], duration=33, loop=0)
for w in WOODS:
    gif(os.path.join(O, f"bow_{w}_idle.gif"), [comp(f"elf_{i}", f"elfbow.{w}_{i}").resize((256, 256), Image.LANCZOS) for i in range(153)])
    gif(os.path.join(O, f"bow_{w}_shoot.gif"), [comp(f"elf.attack_{i}", f"elfbow.{w}.attack_{i}").resize((256, 256), Image.LANCZOS) for i in range(32)])
cols = [("default", None, "elf")] + [(w, w, "elf") for w in WOODS] + [(w + "+ember", w, "elf.ember") for w in WOODS]
S = BOX[2] - BOX[0]; board = Image.new("RGB", (S * len(cols), S * 2), BG[:3])
for c, (_, w, body) in enumerate(cols):
    board.paste(comp(f"{body}_0", w and f"elfbow.{w}_0"), (c * S, 0))
    board.paste(comp(f"{body}.attack_31", w and f"elfbow.{w}.attack_31"), (c * S, S))
board.save(os.path.join(O, "board.png")); print("PREVIEW", O, [n for n, _, _ in cols])
