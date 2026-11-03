# Companion archer v2 (TB-203): the approved elf hero recoloured into a different elf, colour only (same mesh, rig, bow).
# Texels are classed by colour (teal cloak, cream cloth, brown leather) and by the body part that owns them in UV space
# (dominant bone of each face rasterised into a label map), then take a palette colour at their own relative brightness:
#   cloak + hood (all teal) -> CLOAK; cream cloth off the forearms -> TUNIC; brown on the legs -> TROUSER;
#   brown or cream on the forearms -> BRACER; bow wood (orange) -> BOW. Skin, boots, belt and buckles are untouched.
# Args: in.blend out.blend   Env: CLOAK, TUNIC, TROUSER, BRACER, BOW = hex colours (palette.ts tokens)
import bpy, sys, os, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0]); od = os.path.dirname(a[1])
hs = lambda h: np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], dtype=np.float32)
E = os.environ
COL = {k: hs(E.get(k, d)) for k, d in (("CLOAK", "#6e3a44"), ("TUNIC", "#c9b78a"), ("TROUSER", "#5f6f8a"), ("BRACER", "#2a3527"), ("BOW", "#7a5c3c"))}
lumw = np.array([0.299, 0.587, 0.114], dtype=np.float32)
def paint(c, m, tgt, name):
    if not m.any(): print("RECOLOR", name, 0); return
    l = c @ lumw; med = float(np.median(l[m]))
    c[m] = np.clip(tgt[None, :] * (l[m] / med)[:, None], 0, 1)
    print("RECOLOR", name, int(m.sum()), "median lum", round(med, 3), "-> target lum", round(float(tgt @ lumw), 3))
body = bpy.data.objects["tripo_node_c50d1a34"]; me = body.data; uv = me.uv_layers.active.data
img = next(n.image for n in body.data.materials[0].node_tree.nodes if n.type == "TEX_IMAGE" and "basecolor" in n.image.name)
W, H = img.size; px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4); c = px[..., :3]
# label map from the dominant bone per face: 1 forearm/hand (bracer), 2 thigh/shin (trouser), 3 foot (boot), 0 rest
cls = lambda n: 1 if ("ForeArm" in n or "Hand" in n) else 2 if ("UpLeg" in n or n.endswith("Leg")) else 3 if ("Foot" in n or "Toe" in n) else 0
vg = {g.index: g.name.replace("mixamorig:", "") for g in body.vertex_groups}
vb = np.zeros(len(me.vertices), dtype=np.int8)
for v in me.vertices:
    if v.groups: vb[v.index] = cls(vg[max(v.groups, key=lambda g: g.weight).group])
R = 2048; lab = np.zeros((R, R), dtype=np.int8)
for p in me.polygons:
    k = np.bincount(vb[list(p.vertices)], minlength=4).argmax()
    if k == 0: continue
    q = np.array([uv[li].uv[:] for li in p.loop_indices]) * R
    for t in range(1, len(q) - 1):
        T = q[[0, t, t + 1]]; x0, y0 = np.floor(T.min(0)).astype(int); x1, y1 = np.ceil(T.max(0)).astype(int)
        x0, y0 = max(x0 - 2, 0), max(y0 - 2, 0); x1, y1 = min(x1 + 2, R - 1), min(y1 + 2, R - 1)
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = T; d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-12: continue
        l1 = ((by - cy) * (X - cx) + (cx - bx) * (Y - cy)) / d; l2 = ((cy - ay) * (X - cx) + (ax - cx) * (Y - cy)) / d; l3 = 1 - l1 - l2
        e = 1.5 / max(1.0, abs(d) ** 0.5)  # ~a texel of bleed around each triangle
        ins = (l1 > -e) & (l2 > -e) & (l3 > -e); lab[y0:y1 + 1, x0:x1 + 1][ins] = k
f_ = W // R; labF = lab.repeat(f_, 0).repeat(f_, 1) if f_ >= 1 else lab  # pixel rows run bottom-up like UV v
mx, mn = c.max(-1), c.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-4); l = c @ lumw
teal = c[..., 2] > c[..., 0] + 0.05
cream = ~teal & (sat < 0.28) & (l > 0.45)
brown = ~teal & (c[..., 0] > c[..., 2] + 0.05) & (l < 0.42) & (sat > 0.35)
for k, n in ((1, "forearm"), (2, "leg"), (3, "foot")): print("LABEL", n, int((labF == k).sum()))
paint(c, teal, COL["CLOAK"], "cloak+hood")
paint(c, cream & (labF != 1), COL["TUNIC"], "tunic")
paint(c, brown & (labF == 2), COL["TROUSER"], "trousers")
paint(c, (brown | cream) & (labF == 1), COL["BRACER"], "bracers")
px[..., :3] = c
ni = bpy.data.images.new("companion_basecolor", W, H); ni.pixels[:] = px.ravel()
ni.filepath_raw = os.path.join(od, "companion_tex.png"); ni.file_format = "PNG"; ni.save(); ni.pack()
for o in bpy.data.objects:
    if o.type == "MESH" and not o.name.startswith("wpn_"):
        for m in o.data.materials:
            for n in m.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image == img: n.image = ni
# bow: orange wood -> BOW (dark wraps and pale inlays untouched), on a copied material
bw = bpy.data.objects["wpn_bow"]; bm = bw.data.materials[0].copy(); bw.data.materials[0] = bm
bi = next(n for n in bm.node_tree.nodes if n.type == "TEX_IMAGE" and "basecolor" in n.image.name); BW, BH = bi.image.size
bp = np.array(bi.image.pixels[:], dtype=np.float32).reshape(BH, BW, 4); bc = bp[..., :3]
bs = (bc.max(-1) - bc.min(-1)) / np.maximum(bc.max(-1), 1e-4)
wood = (bc[..., 0] > bc[..., 2] + 0.15) & (bs > 0.5) & ((bc @ lumw) > 0.3)
paint(bc, wood, COL["BOW"], "bow wood"); bp[..., :3] = bc
nb = bpy.data.images.new("companion_bow", BW, BH); nb.pixels[:] = bp.ravel()
nb.filepath_raw = os.path.join(od, "companion_bow.png"); nb.file_format = "PNG"; nb.save(); nb.pack(); bi.image = nb
bpy.ops.wm.save_as_mainfile(filepath=a[1]); print("SAVED", a[1])
