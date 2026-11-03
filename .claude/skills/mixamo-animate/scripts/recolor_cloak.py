# Companion archer (TB-203): the approved elf hero model with the teal cloak recoloured, so a companion reads apart from the player.
# Every teal texel (b > r + 0.05, the same test tunic_paint.py uses) keeps its brightness and takes the target hue (palette
# archerCloak #8b9a7d by default); everything else is untouched. Writes the new texture next to out.blend and packs it.
# Args: in.blend out.blend   Env: RGB=r,g,b (0..1 target colour at the teal median brightness)
import bpy, sys, os, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
tgt = np.array([float(v) for v in os.environ.get("RGB", "0.545,0.604,0.490").split(",")], dtype=np.float32)
imgs = {n.image for m in bpy.data.materials if m and m.node_tree for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image
        and "character" in n.image.name and "basecolor" in n.image.name}  # body colour map only: never normal/rough maps or the bow
for i, img in enumerate(imgs):
    W, H = img.size; px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)
    c = px[..., :3]; teal = c[..., 2] > c[..., 0] + 0.05
    lum = c @ np.array([0.299, 0.587, 0.114], dtype=np.float32); med = float(np.median(lum[teal])) if teal.any() else 1
    c[teal] = np.clip(tgt[None, :] * (lum[teal] / med)[:, None], 0, 1); px[..., :3] = c
    out = os.path.join(os.path.dirname(a[1]), f"archer_tex{i}.png")
    img.pixels[:] = px.ravel(); img.filepath_raw = out; img.file_format = "PNG"; img.save(); img.pack()
    print("RECOLOR", img.name, W, H, "teal texels", int(teal.sum()), "median lum", round(med, 3), "->", out)
bpy.ops.wm.save_as_mainfile(filepath=a[1])
