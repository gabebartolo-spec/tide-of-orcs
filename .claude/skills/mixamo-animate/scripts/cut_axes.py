"""Cut a weapon that Tripo welded into a raised fist off the body, per side, into wpn_L / wpn_R skinned 100% to that
hand. Axe = vertices in the hand region (|x| > XMIN) that lie above the fist (z > ZTOP) or form the pommel below it
(z < ZBOT, reached by flood fill along mesh edges from the haft neck just under the fist: verts within R of the haft
line fitted through two pure-haft slices HZ1..HZ2 above the fist). Faces touching
any axe vertex go to the weapon copy and the axe vertices are deleted from the body, so the seam leaves no hole.
Args: <in.blend> <out.blend>   Env: SIDES (LR), XMIN 0.3, ZTOP 0.712, ZBOT 0.572, R 0.015, HZ1 0.74, HZ2 0.78"""
import bpy, sys, os, bmesh
import numpy as np
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
E = os.environ; F = lambda k, d: float(E.get(k, d))
XMIN, ZTOP, ZBOT, R, HZ1, HZ2 = F("XMIN", .3), F("ZTOP", .712), F("ZBOT", .572), F("R", .015), F("HZ1", .74), F("HZ2", .78)
body = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
co = np.array([body.matrix_world @ v.co for v in body.data.vertices])
for side in E.get("SIDES", "LR"):
    s, sgn = ("Left", 1) if side == "L" else ("Right", -1)
    reg = co[:, 0] * sgn > XMIN
    hm = (HZ1 + HZ2) / 2
    p1 = co[reg & (co[:, 2] > HZ1) & (co[:, 2] < hm)].mean(0); p2 = co[reg & (co[:, 2] >= hm) & (co[:, 2] < HZ2)].mean(0)
    ax = p2 - p1; ax /= np.linalg.norm(ax)
    d = np.linalg.norm(np.cross(co - p1, ax), axis=1)
    low = reg & (co[:, 2] < ZBOT)
    seed = set(np.nonzero(low & (co[:, 2] > ZBOT - 0.03) & (d < R))[0].tolist())
    nb = {}
    for e in body.data.edges:
        i, j = e.vertices
        if low[i] and low[j]: nb.setdefault(i, []).append(j); nb.setdefault(j, []).append(i)
    pom, st = set(seed), list(seed)
    while st:
        i = st.pop()
        for j in nb.get(i, []):
            if j not in pom: pom.add(j); st.append(j)
    idx = set(np.nonzero(reg & (co[:, 2] > ZTOP))[0].tolist()) | pom
    print("POMMEL", side, "seed", len(seed), "flood", len(pom))
    w = body.copy(); w.data = body.data.copy(); w.name = "wpn_" + side
    body.users_collection[0].objects.link(w)
    bm = bmesh.new(); bm.from_mesh(w.data); bm.verts.ensure_lookup_table()
    keepf = [f for f in bm.faces if any(v.index in idx for v in f.verts)]
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in set(keepf)], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(w.data); bm.free()
    for g in list(w.vertex_groups): w.vertex_groups.remove(g)
    w.vertex_groups.new(name="mixamorig:" + s + "Hand").add(list(range(len(w.data.vertices))), 1.0, "REPLACE")
    bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in idx], context="VERTS")
    bm.to_mesh(body.data); bm.free()
    co = np.array([body.matrix_world @ v.co for v in body.data.vertices])  # indices shift after the delete
    print("CUT", w.name, "verts", len(w.data.vertices), "faces", len(w.data.polygons), "axis", ax.round(3), "body left", len(body.data.vertices))
bpy.ops.wm.save_as_mainfile(filepath=a[1])
