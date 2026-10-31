# Move faces from the cut weapon back to the body (a loose body part the cut swept onto the weapon), restoring their
# skin weights from the uncut rig by nearest vertex. Args: cut.blend rig.blend out.blend
# Env: WPN (default wpn_staff), ZMAX: faces whose every vertex has world z < ZMAX go back (default 0.045)
import bpy, bmesh, sys, os, numpy as np
from mathutils.kdtree import KDTree
a = sys.argv[sys.argv.index("--") + 1:]; E = os.environ; zmax = float(E.get("ZMAX", "0.045"))
bpy.ops.wm.open_mainfile(filepath=a[1]); rig = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
RM = rig.matrix_world; kd = KDTree(len(rig.data.vertices))
for v in rig.data.vertices: kd.insert(RM @ v.co, v.index)
kd.balance(); rw = [[(rig.vertex_groups[g.group].name, g.weight) for g in v.groups] for v in rig.data.vertices]
bpy.ops.wm.open_mainfile(filepath=a[0]); w = bpy.data.objects[E.get("WPN", "wpn_staff")]
body = max((o for o in bpy.data.objects if o.type == "MESH" and o is not w), key=lambda o: len(o.data.vertices))
M = w.matrix_world; bm = bmesh.new(); bm.from_mesh(w.data); uv = bm.loops.layers.uv.active
sel = [f for f in bm.faces if all((M @ v.co).z < zmax for v in f.verts)]; print("RETURN faces", len(sel))
bb = bmesh.new(); bb.from_mesh(body.data); buv = bb.loops.layers.uv.active; bb.verts.ensure_lookup_table(); n0 = len(bb.verts); vm = {}
for f in sel:
    vs = []
    for v in f.verts:
        if v.index not in vm: vm[v.index] = bb.verts.new(body.matrix_world.inverted() @ (M @ v.co))
        vs.append(vm[v.index])
    nf = bb.faces.new(vs); nf.material_index = f.material_index
    if uv and buv:
        for l, nl in zip(f.loops, nf.loops): nl[buv].uv = l[uv].uv
bb.verts.index_update(); bb.to_mesh(body.data); bb.free()
BM = body.matrix_world; miss = 0
for i in range(n0, len(body.data.vertices)):
    co, idx, d = kd.find(BM @ body.data.vertices[i].co); miss += d > 1e-4
    for name, wt in rw[idx]:
        g = body.vertex_groups.get(name) or body.vertex_groups.new(name=name); g.add([i], wt, "REPLACE")
print("WEIGHTED", len(body.data.vertices) - n0, "verts, far matches", miss)
bmesh.ops.delete(bm, geom=sel, context="FACES"); bm.to_mesh(w.data); bm.free()
bpy.ops.wm.save_as_mainfile(filepath=a[2]); print("SAVED", a[2], "staff faces", len(w.data.polygons), "body faces", len(body.data.polygons))
