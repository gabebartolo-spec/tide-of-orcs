# TB-250 bow woods: the approved elf hero with only its bow's wood re-coloured. Every orange wood texel (r > b + 0.25, luma > 0.2)
# keeps its brightness and takes the target colour (scaled so the wood's median brightness lands on RGB); the dark grip and tip wraps,
# the pale nocks and the string are untouched. The string shares the bow's texture, so its faces (the straight run between the tips,
# local x > STRX, z inside the tips) keep the original material and the rest of the bow gets a copy with the re-coloured image.
# Args: in.blend out.blend   Env: RGB=r,g,b (0..1)   STRX (default 0.07), STRZ=lo,hi (default 0.12,0.87)
import bpy, sys, os, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
tgt = np.array([float(v) for v in os.environ["RGB"].split(",")], dtype=np.float32)
SX = float(os.environ.get("STRX", "0.07")); zlo, zhi = (float(v) for v in os.environ.get("STRZ", "0.12,0.87").split(","))
o = bpy.data.objects["wpn_bow"]; me = o.data; m0 = me.materials[0]
co = np.empty(len(me.vertices) * 3, dtype=np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
sv = (co[:, 0] > SX) & (co[:, 2] > zlo) & (co[:, 2] < zhi)
m1 = m0.copy(); m1.name = "bow_wood"; me.materials.append(m1)
nstr = 0
for p in me.polygons:
    s = all(sv[v] for v in p.vertices); p.material_index = 0 if s else 1; nstr += s
src = next(n.image for n in m1.node_tree.nodes if n.type == "TEX_IMAGE" and n.image and "basecolor" in n.image.name)
img = src.copy(); img.name = "bow_wood_basecolor"
for n in m1.node_tree.nodes:
    if n.type == "TEX_IMAGE" and n.image == src: n.image = img
W, H = img.size; px = np.empty(W * H * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(H, W, 4)
c = px[..., :3]; lum = c @ np.array([0.299, 0.587, 0.114], dtype=np.float32); wood = (c[..., 0] > c[..., 2] + 0.25) & (lum > 0.2)
med = float(np.median(lum[wood]))
c[wood] = np.clip(tgt[None, :] * (lum[wood] / med)[:, None], 0, 1); px[..., :3] = c
out = os.path.join(os.path.dirname(os.path.abspath(a[1])), "bow_wood_basecolor.png"); os.makedirs(os.path.dirname(out), exist_ok=True)
img.pixels.foreach_set(px.ravel()); img.filepath_raw = out; img.file_format = "PNG"; img.save(); img.pack()
print("RECOLOR bow", W, H, "wood texels", int(wood.sum()), "median lum", round(med, 3), "string faces", nstr, "of", len(me.polygons), "->", out)
bpy.ops.wm.save_as_mainfile(filepath=a[1])
