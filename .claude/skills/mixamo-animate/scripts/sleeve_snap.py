# Sleeve verts near the upper arm that still carry torso weight tear into white spikes at full draw. Give each the weights
# of its nearest arm-owned vert (RightArm chain >= AMIN). Args: in.blend out.blend  Env: SIDE (Right), RA (0.09 m), AMIN (0.8)
import bpy, sys, os
from mathutils.geometry import intersect_point_line
from mathutils.kdtree import KDTree
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
body = max((o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith("wpn_")), key=lambda o: len(o.data.vertices))
S = os.environ.get("SIDE", "Right"); RA = float(os.environ.get("RA", "0.09")); AMIN = float(os.environ.get("AMIN", "0.8"))
arm_o = next(o for o in bpy.data.objects if o.type == "ARMATURE"); W_ = arm_o.matrix_world; bn = lambda n: arm_o.data.bones[f"mixamorig:{S}{n}"]
h, t = W_ @ bn("Arm").head_local, W_ @ bn("Arm").tail_local; t2 = W_ @ bn("ForeArm").tail_local  # shoulder, elbow, wrist
M =body.matrix_world; G = body.vertex_groups
gi = {g.index: g.name for g in G}; chain = {n for n in gi.values() if n.startswith(f"mixamorig:{S}") and ("Arm" in n or "Hand" in n)}
def armw(v): return sum(g.weight for g in v.groups if gi[g.group] in chain)
def dseg1(p, a_, b_):
    q, k = intersect_point_line(p, a_, b_); k = min(1, max(0, k)); return (p - (a_ + (b_ - a_) * k)).length
dseg = lambda p: min(dseg1(p, h, t), dseg1(p, t, t2))
cloak = {v.index for v in body.data.vertices for g in v.groups if gi[g.group] == "cloak_cs"}  # cloak stays off the arm
vs = body.data.vertices; P = [M @ v.co for v in vs]
src = [v.index for v in vs if armw(v) >= AMIN and dseg(P[v.index]) < RA]
kd = KDTree(len(src))
for i, j in enumerate(src): kd.insert(P[j], i)
kd.balance(); n = 0
for v in vs:
    if armw(v) >= 0.5 or dseg(P[v.index]) >= RA or v.index in cloak: continue
    s = vs[src[kd.find(P[v.index])[1]]]; keep = [g.group for g in v.groups if gi[g.group] == "cloak_cs"]
    for g in list(v.groups):
        if g.group not in keep: G[g.group].remove([v.index])
    for g in s.groups:
        if gi[g.group] != "cloak_cs": G[g.group].add([v.index], g.weight, "REPLACE")
    n += 1
print("SLEEVE", n, "verts snapped to the arm from", len(src), "arm verts")
bpy.ops.wm.save_as_mainfile(filepath=a[1])

