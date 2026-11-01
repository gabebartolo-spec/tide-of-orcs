"""Cut weapons that Tripo welded into the fists off the body by a flood fill from seed points on the weapon (blade tip,
axe head, pommel) along mesh edges, never entering the fist sphere (radius RF around the fist centre), so the flood
stops where the weapon enters the hand. Faces touching any flooded vertex go to wpn_<S> (100% to that hand) and the
flooded verts leave the body, as in cut_axes.py. The grip inside the fist stays on the body, hidden by the fingers.
Args: <in.blend> <out.blend>
Env: SEED_L / SEED_R = "x,y,z;x,y,z" approximate world points on the weapon (nearest vertex is used), side skipped if unset;
       a seed may carry its own limit box: "x,y,z|xmin,xmax,ymin,ymax,zmin,zmax", or a capsule "x,y,z|C:ax,ay,az,bx,by,bz,r"
       (flood stays within r of segment a-b: a haft that runs diagonally against the belt or hip)
     BOX_L / BOX_R = "xmin,xmax,ymin,ymax,zmin,zmax" optional world box the flood may not leave
     CEN_L / CEN_R = fist centre "x,y,z" (default: the hand bone head), RF fist radius (default 0.06), DRY=1 report only"""
import bpy, sys, os, bmesh
import numpy as np
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
E = os.environ; RF = float(E.get("RF", .06))
body = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
P = lambda s: np.array([float(x) for x in s.split(",")])
for side in "LR":
    if not E.get("SEED_" + side): continue
    s = "Left" if side == "L" else "Right"
    co = np.array([body.matrix_world @ v.co for v in body.data.vertices])
    cen = P(E["CEN_" + side]) if E.get("CEN_" + side) else np.array(arm.matrix_world @ arm.data.bones["mixamorig:" + s + "Hand"].head_local)
    near = np.linalg.norm(co - cen, axis=1) > RF
    idx = set(); seeds = []
    for spec in E["SEED_" + side].split(";"):  # "x,y,z" or "x,y,z|xmin,xmax,ymin,ymax,zmin,zmax" (box for this seed only)
        pt, _, bx = spec.partition("|"); ok = near.copy()
        for b in filter(None, (bx, E.get("BOX_" + side))):  # optional limit box for a weapon that touches the body
            if b.startswith("C:"):
                c = P(b[2:]); A, D = c[:3], c[3:6] - c[:3]; t = np.clip((co - A) @ D / (D @ D), 0, 1)
                ok &= np.linalg.norm(co - (A + t[:, None] * D), axis=1) <= c[6]; continue
            b = P(b); ok &= np.all((co >= b[0::2]) & (co <= b[1::2]), axis=1)
        nb = {}
        for e in body.data.edges:
            i, j = e.vertices
            if ok[i] and ok[j]: nb.setdefault(i, []).append(j); nb.setdefault(j, []).append(i)
        sd = int(np.argmin(np.linalg.norm(co - P(pt), axis=1))); seeds.append(sd)
        got, st = {sd}, [sd]
        while st:
            i = st.pop()
            for j in nb.get(i, []):
                if j not in got: got.add(j); st.append(j)
        print("SEED", side, co[sd].round(3).tolist(), "verts", len(got)); idx |= got
    q = co[sorted(idx)]
    print("FLOOD", side, "seeds", [co[i].round(3).tolist() for i in seeds], "verts", len(idx), "bbox", q.min(0).round(3).tolist(), q.max(0).round(3).tolist())
    if E.get("DRY"): continue
    w = body.copy(); w.data = body.data.copy(); w.name = "wpn_" + side
    body.users_collection[0].objects.link(w)
    bm = bmesh.new(); bm.from_mesh(w.data); bm.verts.ensure_lookup_table()
    keep = set(f for f in bm.faces if any(v.index in idx for v in f.verts))
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in keep], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(w.data); bm.free()
    for g in list(w.vertex_groups): w.vertex_groups.remove(g)
    w.vertex_groups.new(name="mixamorig:" + s + "Hand").add(list(range(len(w.data.vertices))), 1.0, "REPLACE")
    bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in idx], context="VERTS")
    bm.to_mesh(body.data); bm.free()
    print("CUT", w.name, "verts", len(w.data.vertices), "faces", len(w.data.polygons), "body left", len(body.data.vertices))
if not E.get("DRY"): bpy.ops.wm.save_as_mainfile(filepath=a[1])
