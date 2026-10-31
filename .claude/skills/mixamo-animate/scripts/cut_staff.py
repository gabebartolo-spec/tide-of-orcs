# Cut the welded shaman staff off the body by region growing along the mesh from a clean shaft section (z 0.30-0.45):
# slab by slab (0.02) the accepted set extends to edge-neighbours within R of the slab's running centre line, so the
# gnarled shaft is followed without a straight-axis fit. The fist band is skipped (that shaft piece stays in the hand);
# above the fist a second seed grows up into the skull box. Faces are cut only if every vert is staff (face rule).
# Small loose body parts left near the staff are moved too. Separated as wpn_staff, weighted 100% to RightHand.
# Args: in.blend out.blend   Env: AX "x,y,z,dx,dy,dz" seed axis, FIST "z0,z1", RLO, RHI, SKULLZ, SKULLX
import bpy, bmesh, sys, os, numpy as np
from collections import defaultdict
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
E = os.environ; c = np.array([float(x) for x in E["AX"].split(",")]); ax = c[3:] / np.linalg.norm(c[3:]); c = c[:3]
fz0, fz1 = [float(x) for x in E.get("FIST", "0.455,0.565").split(",")]
RLO, RHI = float(E.get("RLO", "0.035")), float(E.get("RHI", "0.055")); SZ, SX = float(E.get("SKULLZ", "0.72")), float(E.get("SKULLX", "-0.1"))
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
body = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
M = body.matrix_world; V = np.array([(M @ v.co)[:] for v in body.data.vertices]); z = V[:, 2]
nb = defaultdict(list)
for e in body.data.edges: i, j = e.vertices; nb[i].append(j); nb[j].append(i)
t = (V - c) @ ax; r = np.linalg.norm((V - c) - np.outer(t, ax), axis=1)
acc = set(np.where((z > 0.30) & (z < 0.45) & (r < 0.03))[0].tolist()); print("SEED", len(acc))
def grow(zstart, zend, step, R, c0, d0):
    cen, d = np.array(c0, float), np.array(d0, float); zs = zstart; n0 = len(acc)
    while (step > 0 and zs < zend) or (step < 0 and zs > zend):
        lo, hi = (zs, zs + step) if step > 0 else (zs + step, zs)
        pred = cen + d * ((zs + step / 2 - cen[2]) / d[2]); slab = set()
        q = [v for v in acc if any(lo <= z[n] < hi for n in nb[v])]
        while q:
            v = q.pop()
            for n in nb[v]:
                if n in acc or n in slab or not (lo <= z[n] < hi): continue
                p = V[n]; tt = (p - pred) @ d; rr = np.linalg.norm((p - pred) - tt * d)
                if rr < R: slab.add(n); q.append(n)
        if slab:
            P = V[list(slab)]; newc = P.mean(0); newc[2] = zs + step / 2; off = newc[:2] - pred[:2]
            if np.linalg.norm(off) > 0.015: newc[:2] = pred[:2] + off / np.linalg.norm(off) * 0.015
            cen = newc; acc.update(slab)
        zs += step
    print("GROW", zstart, "->", zend, "added", len(acc) - n0)
grow(0.30, -0.02, -0.02, RLO, c, ax); grow(0.45, fz0, 0.02, RLO, c, ax)
up = set(np.where((z > fz1) & (z < fz1 + 0.07) & (r < 0.04))[0].tolist()); print("UPSEED", len(up)); acc |= up
grow(fz1 + 0.07, SZ, 0.02, RHI, c, ax)
q = [v for v in acc if z[v] > SZ - 0.03]
while q:
    v = q.pop()
    for n in nb[v]:
        if n not in acc and z[n] > SZ and V[n, 0] < SX: acc.add(n); q.append(n)
if E.get("LO2"):  # extra pass for the bark/root piece between the lower shaft and the leg: z<ZLO2, x<XLO2, within RLO2 of the seed axis
    zl, xl, rl = [float(x) for x in E["LO2"].split(",")]; ex = set(np.where((z < zl) & (V[:, 0] < xl) & (r < rl))[0].tolist()); print("LO2 added", len(ex - acc)); acc |= ex
print("ACC verts", len(acc))
bm = bmesh.new(); bm.from_mesh(body.data); bm.faces.ensure_lookup_table(); bm.verts.ensure_lookup_table()
staff_f = set(f.index for f in bm.faces if all(v.index in acc for v in f.verts))
rest = [f for f in bm.faces if f.index not in staff_f]; seen = set(); parts = []
for f in rest:
    if f.index in seen: continue
    comp = []; st = [f]
    while st:
        x = st.pop()
        if x.index in seen or x.index in staff_f: continue
        seen.add(x.index); comp.append(x)
        for e in x.edges:
            for g in e.link_faces:
                if g.index not in seen and g.index not in staff_f: st.append(g)
    parts.append(comp)
parts.sort(key=len, reverse=True); print("BODY PARTS", [len(p) for p in parts[:10]])
for p in parts[1:]:
    cen = np.mean([V[v.index] for f in p for v in f.verts], 0); tt = (cen - c) @ ax; rr = np.linalg.norm((cen - c) - tt * ax)
    mv = rr < 0.09 and len(p) < 400; print("PART", len(p), cen.round(3), "r", round(float(rr), 3), "-> staff" if mv else "stays")
    if mv: staff_f.update(f.index for f in p)
sel = [bm.faces[i] for i in sorted(staff_f)]; print("CUT faces", len(sel), "of", len(bm.faces))
bmw = bmesh.new(); vm = {}
for f in sel:
    vs = []
    for v in f.verts:
        if v.index not in vm: vm[v.index] = bmw.verts.new(v.co)
        vs.append(vm[v.index])
    nf = bmw.faces.new(vs); nf.material_index = f.material_index
uv_src = bm.loops.layers.uv.active; uv_dst = bmw.loops.layers.uv.new(uv_src.name) if uv_src else None
if uv_src:
    for f, nf in zip(sel, bmw.faces):
        for l, nl in zip(f.loops, nf.loops): nl[uv_dst].uv = l[uv_src].uv
bmesh.ops.delete(bm, geom=sel, context="FACES"); bm.to_mesh(body.data); bm.free()
me = bpy.data.meshes.new("wpn_staff"); bmw.to_mesh(me); bmw.free()
for m in body.data.materials: me.materials.append(m)
w = bpy.data.objects.new("wpn_staff", me); bpy.context.scene.collection.objects.link(w); w.matrix_world = M.copy()
g = w.vertex_groups.new(name="mixamorig:RightHand"); g.add(list(range(len(me.vertices))), 1.0, "REPLACE")
w.parent = arm; w.matrix_parent_inverse = arm.matrix_world.inverted(); am = w.modifiers.new("Armature", "ARMATURE"); am.object = arm
bb = [(M @ v.co) for v in w.data.vertices]; print("STAFF verts", len(bb), "bbox", [round(min(p[i] for p in bb), 3) for i in range(3)], [round(max(p[i] for p in bb), 3) for i in range(3)])
bm = bmesh.new(); bm.from_mesh(body.data); print("BODY boundary edges", sum(1 for e in bm.edges if e.is_boundary)); bm.free()
bpy.ops.wm.save_as_mainfile(filepath=a[1]); print("SAVED", a[1])
