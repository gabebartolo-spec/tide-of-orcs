# Hammer grip in the bind pose: haft through the measured fist hole C/DIR (DIR points to the thumb side = head side),
# grip at GF of the length from the pommel, blade edge toward the knuckles. Args: in.blend out.blend
import bpy, sys, os, numpy as np
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE"); B = arm.data.bones
w = bpy.data.objects["wpn_axe"]; v = np.array([x.co[:] for x in w.data.vertices])
mn, mx = v[:, 2].min(), v[:, 2].max(); L = mx - mn
top = v[v[:, 2] > mx - 0.25 * L]; bot = v[v[:, 2] < mn + 0.25 * L]
sp = lambda p: np.linalg.norm(p[:, :2] - np.median(v[:, :2], 0), axis=1).max()
headZ = 1 if sp(top) > sp(bot) else -1                  # head = the end with the wide blade
hv = top if headZ > 0 else bot; ax0 = np.median(v[:, :2], 0)
bl = (hv[:, :2] - ax0)[np.argmax(np.linalg.norm(hv[:, :2] - ax0, axis=1))]  # blade direction in local XY
GF = float(os.environ.get("GF", "0.15"))
gz = (mn + GF * L) if headZ > 0 else (mx - GF * L)    # grip near the pommel end
C = Vector([float(x) for x in os.environ["C"].split(",")]); D = Vector([float(x) for x in os.environ["DIR"].split(",")]).normalized()
wr = arm.matrix_world @ B["mixamorig:RightHand"].head_local; kn = arm.matrix_world @ B["mixamorig:RightHandMiddle1"].head_local
e = (kn - wr); e = (e - D * e.dot(D)).normalized()       # knuckle direction across the haft
# local frame: lz = head direction, lb = blade direction -> world D, e
lz = Vector((0, 0, headZ)); lb = Vector((bl[0], bl[1], 0)).normalized(); ly = lz.cross(lb)
Ml = Matrix((lb, ly, lz)).transposed(); Mw = Matrix((e, D.cross(e), D)).transposed()
R = Mw @ Ml.inverted(); scl = w.matrix_world.to_scale() * float(os.environ.get("SCL", "1"))
M = R.to_4x4() @ Matrix.Diagonal(scl.to_4d()); M.translation = C - (R @ Matrix.Diagonal(scl)) @ Vector((ax0[0], ax0[1], gz))
w.matrix_world = M; bpy.context.view_layer.update()
print("FIT headZ", headZ, "L", round(L, 3), "grip", round(gz, 3), "blade", bl.round(3))
bpy.ops.wm.save_as_mainfile(filepath=a[1])
