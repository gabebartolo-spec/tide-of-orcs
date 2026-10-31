# Seat a separate Tripo bow in the measured left fist hole (fist_hole_s.py SIDE=Left gives C/DIR), bind pose.
# Upper limb toward DIR (thumb side), bow back toward the knuckles so the string faces the archer, grip at GF of the
# length from the upper tip, length LENR x body height (measured on the welded source render). Parented to LeftHand.
# Args: hero.blend bow.fbx out.blend   Env: C, DIR, GF (0.49), LENR (0.82), DEC (decimate ratio, 0.07)
import bpy, sys, os, numpy as np
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE"); B = arm.data.bones
body = next(o for o in bpy.data.objects if o.type == "MESH")
old = set(bpy.data.objects); bpy.ops.import_scene.fbx(filepath=a[1])
w = next(o for o in bpy.data.objects if o not in old and o.type == "MESH"); w.name = "wpn_bow"
for o in set(bpy.data.objects) - old - {w}: bpy.data.objects.remove(o)
w.parent = None
m = w.modifiers.new("dec", "DECIMATE"); m.ratio = float(os.environ.get("DEC", "0.07"))
bpy.context.view_layer.objects.active = w; bpy.ops.object.modifier_apply(modifier="dec")
w.data.transform(w.matrix_world); w.matrix_world = Matrix.Identity(4)
v = np.array([x.co[:] for x in w.data.vertices]); c = v.mean(0)
U, S_, Vt = np.linalg.svd(v - c, full_matrices=False); ax, wd = Vt[0], Vt[1]
if ax @ np.array((0, 0, 1)) < 0 and abs(ax[2]) > 0.5: ax = -ax          # upper limb = source +Z
t = (v - c) @ ax; L = t.max() - t.min(); s = (v - c) @ wd
tips = s[(t > t.max() - 0.08 * L) | (t < t.min() + 0.08 * L)].mean()  # tips sit on the string line
mid = np.median(s[np.abs(t - (t.max() + t.min()) / 2) < 0.05 * L])     # riser dominates mid-height
if mid < tips: wd = -wd; s = -s; tips = -tips; mid = -mid               # +wd = bow back (away from string)
GF = float(os.environ.get("GF", "0.49")); tg = t.max() - GF * L
sl = np.abs(t - tg) < 0.03 * L; gp = c + ax * tg + wd * float(np.median(s[sl]))   # grip centre on the riser at that height
H = body.dimensions.z; k = float(os.environ.get("LENR", "0.82")) * H / L
C = Vector([float(x) for x in os.environ["C"].split(",")]); D = Vector([float(x) for x in os.environ["DIR"].split(",")]).normalized()
wr = arm.matrix_world @ B["mixamorig:LeftHand"].head_local; kn = arm.matrix_world @ B["mixamorig:LeftHandMiddle1"].head_local
e = kn - wr; e = (e - D * e.dot(D)).normalized()
Ml = Matrix((Vector(wd), Vector(np.cross(ax, wd)), Vector(ax))).transposed()
Mw = Matrix((e, D.cross(e), D)).transposed(); R = Mw @ Ml.inverted()
M = (R @ Matrix.Diagonal((k, k, k))).to_4x4(); M.translation = C - (R @ Matrix.Diagonal((k, k, k))) @ Vector(gp)
w.matrix_world = M; bpy.context.view_layer.update()
w["bow_ax"] = [float(x) for x in ax]; w["bow_back"] = [float(x) for x in wd]   # mesh-space limb axis / back, for apply_anim BOWPROBE
mw = w.matrix_world.copy(); w.parent = arm; w.parent_type = "BONE"; w.parent_bone = "mixamorig:LeftHand"
bpy.context.view_layer.update(); w.matrix_world = mw
print("BOW L", round(L * k, 3), "H", round(H, 3), "faces", len(w.data.polygons), "tips/mid", round(tips, 3), round(mid, 3))
bpy.ops.wm.save_as_mainfile(filepath=a[2])
