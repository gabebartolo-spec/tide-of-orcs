# Two-hand staff thrust setup (shaman, 2026-11-01): spear_setup.py for a weapon that already lives in the cut file as wpn_<name>
# (Armature modifier + RightHand weights). Drops the modifier/parent, seats the haft point GF from the butt in the right fist (grip_r on
# RightHand, COPY_LOCATION) and aims it at the left fist hole (grip_l on LeftHand at env CL, DAMPED_TRACK). +axis = wider end (skull).
# Args: cut.blend out.blend   Env: WPN (wpn_staff), GF (grip fraction from butt, -1 = keep the sculpt point), CL=x,y,z (left fist hole)
import bpy, sys, os, numpy as np
from mathutils import Vector, Matrix
cut, out = sys.argv[-2:]; E = os.environ
bpy.ops.wm.open_mainfile(filepath=cut); sp = bpy.data.objects[E.get("WPN", "wpn_staff")]
mw = sp.matrix_world.copy(); sp.parent = None; sp.matrix_world = mw
for m in list(sp.modifiers): sp.modifiers.remove(m)
sp.vertex_groups.clear(); bpy.context.view_layer.update()
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE"); B = arm.data.bones; W = arm.matrix_world
V = np.array([(sp.matrix_world @ v.co)[:] for v in sp.data.vertices]); c = V.mean(0)
ax = np.linalg.svd(V - c)[2][0]; t = (V - c) @ ax
rad = lambda m: np.linalg.norm((V[m] - c) - np.outer(t[m], ax), axis=1).max()
L = t.max() - t.min()
if rad(t < t.min() + 0.15 * L) > rad(t > t.max() - 0.15 * L): ax = -ax; t = -t      # +ax toward the skull (wider end)
G = (W @ B["mixamorig:RightHand"].head_local + W @ B["mixamorig:RightHandMiddle1"].head_local) / 2
CR = E.get("CR")   # measured right fist hole centre (fist_hole_s SIDE=Right); default = bone points
if CR: G = Vector([float(v) for v in CR.split(",")])
P0 = Vector(c) + Vector(ax) * float(np.dot(np.array(G[:]) - c, ax))
print("LEN", round(L, 3), "AXIS", np.round(ax, 3).tolist(), "GRIP_FRAC_FROM_BUTT", round((np.dot(np.array(G[:]) - c, ax) - t.min()) / L, 3), "FIST_TO_AXIS", round((G - P0).length, 4))
y = Vector(ax); x = y.orthogonal().normalized(); z = x.cross(y)
GF = float(E.get("GF", "-1"))
Pm = P0 if GF < 0 else Vector(c) + Vector(ax) * float(t.min() + GF * L)   # haft point that sits in the right fist
R = Matrix((x, y, z)).transposed().to_4x4(); R.translation = Pm
sp.data.transform(R.inverted() @ sp.matrix_world); sp.matrix_world = Matrix.Identity(4)
e = bpy.data.objects.new("grip_r", None); bpy.context.scene.collection.objects.link(e)
e.parent = arm; e.parent_type = "BONE"; e.parent_bone = "mixamorig:RightHand"; bpy.context.view_layer.update()
e.matrix_world = Matrix.Translation(P0)
cl = sp.constraints.new("COPY_LOCATION"); cl.target = e
gl = bpy.data.objects.new("grip_l", None); bpy.context.scene.collection.objects.link(gl)
gl.parent = arm; gl.parent_type = "BONE"; gl.parent_bone = "mixamorig:LeftHand"; bpy.context.view_layer.update()
CL = E.get("CL")
gl.matrix_world = Matrix.Translation(Vector([float(v) for v in CL.split(",")]) if CL else (W @ B["mixamorig:LeftHand"].head_local + W @ B["mixamorig:LeftHandMiddle1"].head_local) / 2)
dt = sp.constraints.new("DAMPED_TRACK"); dt.target = gl; dt.track_axis = "TRACK_Y"
bpy.ops.wm.save_as_mainfile(filepath=out); print("SAVED", out)
