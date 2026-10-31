# List the connected components of one mesh object: faces, centroid, bbox, mean texture colour (from the UV of the base-colour image).
# Args: in.blend objname
import bpy, bmesh, sys, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0]); o = bpy.data.objects[a[1]]
me = o.data; M = o.matrix_world; V = np.array([(M @ v.co)[:] for v in me.vertices])
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table(); uv = bm.loops.layers.uv.active
img = None
for m in me.materials:
    for n in (m.node_tree.nodes if m and m.node_tree else []):
        if n.type == "TEX_IMAGE" and n.image and "basecolor" in n.image.name.lower(): img = n.image
px = None
if img:
    w, h = img.size; px = np.array(img.pixels[:]).reshape(h, w, 4)
seen = set(); parts = []
for f in bm.faces:
    if f.index in seen: continue
    comp = []; st = [f]
    while st:
        x = st.pop()
        if x.index in seen: continue
        seen.add(x.index); comp.append(x)
        for e in x.edges:
            for g in e.link_faces:
                if g.index not in seen: st.append(g)
    parts.append(comp)
parts.sort(key=len, reverse=True); print("PARTS", len(parts))
for i, p in enumerate(parts):
    P = np.array([V[v.index] for f in p for v in f.verts]); col = ""
    if px is not None and uv:
        us = np.array([[l[uv].uv.x, l[uv].uv.y] for f in p for l in f.loops]); xs = (us[:, 0] % 1 * (w - 1)).astype(int); ys = (us[:, 1] % 1 * (h - 1)).astype(int)
        col = "rgb " + str((px[ys, xs, :3].mean(0) * 255).round().astype(int).tolist())
    print("PART", i, "faces", len(p), "cen", P.mean(0).round(3).tolist(), "min", P.min(0).round(3).tolist(), "max", P.max(0).round(3).tolist(), col)
