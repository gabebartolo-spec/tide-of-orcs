"""Make held blades rigid: vertices whose base colour is unsaturated grey-white (steel) and that lie
beyond XMIN (m, from the centre line) get 100% weight on the nearer hand bone. Use when a weapon is
fused into the mesh and Mixamo's weights bend it across the forearm.
Args: <in.blend> <out.blend>   Env: XMIN (default 0.2), SAT (max saturation, 0.18), VAL (min value, 0.45)"""
import bpy, sys, os, bmesh, colorsys
import numpy as np
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
E = os.environ
XMIN, SAT, VAL = float(E.get("XMIN", "0.2")), float(E.get("SAT", "0.18")), float(E.get("VAL", "0.45"))
ob = [o for o in bpy.data.objects if o.type == "MESH"][0]
me = ob.data
nt = ob.data.materials[0].node_tree
img = [n for n in nt.nodes if n.type == "TEX_IMAGE" and "basecolor" in n.image.name][0].image
W, H = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)
uv = me.uv_layers[0].data
steel = set()
for lp in me.loops:
    v = me.vertices[lp.vertex_index]
    if abs(v.co.x) < XMIN: continue
    u, w = uv[lp.index].uv
    r, g, b, _ = px[min(int(w * H), H - 1), min(int(u * W), W - 1)]
    h, s, val = colorsys.rgb_to_hsv(r, g, b)
    if s < SAT and val > VAL: steel.add(lp.vertex_index)
# grow one ring so the blade edge never keeps a forearm weight
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
grown = set(steel)
for i in steel:
    for e in bm.verts[i].link_edges: grown.add(e.other_vert(bm.verts[i]).index)
grp = {g.name: g for g in ob.vertex_groups}
L = [n for n in grp if n.endswith("LeftHand")][0]; R = [n for n in grp if n.endswith("RightHand")][0]
for i in grown:
    for g in ob.vertex_groups: g.remove([i])
    # Mixamo: character's right hand is on -X in the front view
    (grp[R] if me.vertices[i].co.x < 0 else grp[L]).add([i], 1.0, "REPLACE")
print("STEEL", len(steel), "GROWN", len(grown))
bpy.ops.wm.save_as_mainfile(filepath=a[1])
