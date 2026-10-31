# Faces deleted to stop cloth tearing (inpaint_cloth CUT, cut_stretch) leave holes you can see into the torso through.
# Fix: a body layer under the clothes. Take the faces the original model (src) had that the cut model (in) lost, plus RING
# rings around them, push them IN cm inward along the normals and give them torso-only weights (right arm and cloak
# shares dropped), so they stay with the torso when the arm lifts and fill every hole with the tunic texture.
# Args: src.blend in.blend out.blend   Env: SIDE (Right), RING (2), IN (1.0 cm)
import bpy, bmesh, sys, os
from mathutils import kdtree
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[1])
isbody = lambda o: o and o.type == "MESH" and not o.name.startswith(("wpn_", "prop_", "body_plug"))
body = max((o for o in bpy.data.objects if isbody(o)), key=lambda o: len(o.data.vertices))
S = os.environ.get("SIDE", "Right"); RING = int(os.environ.get("RING", "2")); IN = float(os.environ.get("IN", "1.0")) / 100
with bpy.data.libraries.load(a[0]) as (s, d): d.objects = list(s.objects)
src = max((o for o in d.objects if isbody(o)), key=lambda o: len(o.data.vertices)); Ms = src.matrix_world.copy()
for o in d.objects:
    if o and o is not src: bpy.data.objects.remove(o)
pl = src; pl.name = "body_plug"; body.users_collection[0].objects.link(pl); pl.parent = body.parent; pl.matrix_world = Ms
pl.data.materials.clear()
for m in body.data.materials: pl.data.materials.append(m)
for m in list(pl.modifiers): pl.modifiers.remove(m)
md = pl.modifiers.new("Armature", "ARMATURE"); md.object = next(m.object for m in body.modifiers if m.type == "ARMATURE")
M = body.matrix_world; kd = kdtree.KDTree(len(body.data.polygons))
for p in body.data.polygons: kd.insert(M @ p.center, p.index)
kd.balance()
me = pl.data; bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
miss = {f for f in bm.faces if kd.find(Ms @ f.calc_center_median())[2] > 0.002}
print("PLUG missing faces", len(miss), "of", len(bm.faces))
sel = set(miss)
for _ in range(RING): sel |= {g for f in sel for v in f.verts for g in v.link_faces}
gi = {g.index: g.name for g in pl.vertex_groups}; dv = bm.verts.layers.deform.active
drop = lambda n: n == "cloak_cs" or (n.startswith(f"mixamorig:{S}") and any(x in n for x in ("Shoulder", "Arm", "Hand")))
# faces mostly skinned to the arm are the arm-to-hip webs cut_stretch removed on purpose; restoring them gives jagged flaps
ARMX = float(os.environ.get("ARMX", "0.5")); arm = lambda v: sum(x for k, x in v[dv].items() if drop(gi.get(k, "")) and gi[k] != "cloak_cs")
web = {f for f in sel if sum(arm(v) for v in f.verts) / len(f.verts) > ARMX}; sel -= web
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in sel], context="FACES")
print("PLUG dropped arm webs", len(web))
bm.normal_update()
for v in bm.verts: v.co = Ms.inverted() @ ((Ms @ v.co) - (Ms.to_3x3() @ v.normal).normalized() * IN)
empty = []
for v in bm.verts:  # torso-only weights
    w = v[dv]
    for k in [k for k in w.keys() if drop(gi.get(k, ""))]: del w[k]
    s_ = sum(w.values())
    if s_ < 0.05: empty.append(v); continue
    for k in list(w.keys()): w[k] /= s_
if empty:  # all-arm verts: copy weights from the nearest torso-weighted plug vert
    full = [v for v in bm.verts if v not in empty]; kv = kdtree.KDTree(len(full))
    for i, v in enumerate(full): kv.insert(v.co, i)
    kv.balance()
    for v in empty:
        w = v[dv]; w.clear(); n = full[kv.find(v.co)[1]]
        for k, x in n[dv].items(): w[k] = x
bm.to_mesh(me); bm.free()
print("PLUG", len(me.vertices), "verts", len(me.polygons), "faces; reweighted from neighbour", len(empty), "; inset", IN)
bpy.ops.wm.save_as_mainfile(filepath=a[2])
