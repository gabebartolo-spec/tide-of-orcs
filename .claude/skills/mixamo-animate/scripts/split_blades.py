"""Split fused blades into their own meshes (wpn_L / wpn_R), skinned 100% to the nearer hand, so CLIP can test them.
Run on the output of rigid_blades.py: vertices with weight 1.0 on a hand and |x| > XMIN are the blades.
Args: <in.blend> <out.blend>   Env: XMIN (default 0.2)"""
import bpy, sys, os, bmesh
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
XMIN = float(os.environ.get("XMIN", "0.2"))
body = [o for o in bpy.data.objects if o.type == "MESH"][0]


def blade(side, me):
    g = [g for g in body.vertex_groups if g.name.endswith(("Left" if side == "L" else "Right") + "Hand")][0]
    sgn = 1 if side == "L" else -1
    dl = me.verts.layers.deform.active
    return lambda v: v[dl].get(g.index, 0) > 0.999 and v.co.x * sgn > XMIN


def keep(ob, test):  # delete every vertex the test rejects
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not test(v, bm)], context="VERTS")
    n = len(bm.verts); bm.to_mesh(ob.data); bm.free(); return n


for side in ("L", "R"):
    w = body.copy(); w.data = body.data.copy(); w.name = "wpn_" + side
    body.users_collection[0].objects.link(w)
    print("SPLIT", w.name, keep(w, lambda v, bm, s=side: blade(s, bm)(v)))
print("BODY", keep(body, lambda v, bm: not (blade("L", bm)(v) or blade("R", bm)(v))))
bpy.ops.wm.save_as_mainfile(filepath=a[1])
