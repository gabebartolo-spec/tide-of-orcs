"""Turn double-ended blades (wpn_L / wpn_R from split_blades.py) into single daggers: delete the steel on the
little-finger side of the fist. Axis = the blade's longest principal axis; the grip sits between the thumb and
index bones (bind pose; the auto-rig has no pinky). Vertices beyond KEEP of the way from the grip toward the pinky end are removed.
Args: <in.blend> <out.blend> [measure]   Env: KEEP (m past the grip centre on the pinky side to keep, default 0.03)"""
import bpy, sys, os, bmesh
import numpy as np
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
KEEP = float(os.environ.get("KEEP", "0.03"))
arm = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]


def head(name):
    b = [b for b in arm.data.bones if b.name.endswith(name)][0]
    return arm.matrix_world @ b.head_local


for side, s in (("L", "Left"), ("R", "Right")):
    ob = bpy.data.objects["wpn_" + side]
    bm = bmesh.new(); bm.from_mesh(ob.data)
    P = np.array([ob.matrix_world @ v.co for v in bm.verts])
    c = P.mean(0); ax = np.linalg.svd(P - c)[2][0]
    th, pk = np.array(head(s + "HandThumb1")), np.array(head(s + "HandIndex1"))
    if (pk - th) @ ax < 0: ax = -ax  # +axis points toward the pinky end
    grip = ((th + pk) / 2 - c) @ ax
    t = (P - c) @ ax - grip
    print("BLADE", side, "thumb-end %.3f pinky-end %.3f n %d" % (t.min(), t.max(), len(t)))
    if len(a) > 2: continue
    dead = [v for v, ti in zip(bm.verts, t) if ti > KEEP]
    bmesh.ops.delete(bm, geom=dead, context="VERTS")
    print("CUT", side, len(dead), "left", len(bm.verts)); bm.to_mesh(ob.data); bm.free()
if len(a) <= 2: bpy.ops.wm.save_as_mainfile(filepath=a[1])
