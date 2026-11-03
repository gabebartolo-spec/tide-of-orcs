# TB-203 QA probe, exec'd by apply_anim.py (TBPY=this file) after the string/arrow setup, before ARROWONLY exits.
# Per frame, from the render camera (GAMECAM/CAMROT): string verts that overlap arm/hand/head in the image (ray through each
# string vert along the view axis hits that body part, in front or behind), head verts the bow hides (front check), and the
# bow's 3D clearance from the legs (shin clip). TBFR=a,b limits the frames. Prints TBS (per frame) and TBSUM.
from mathutils.bvhtree import BVHTree
from mathutils import Euler
_t = math.radians(float(os.environ.get("GAMECAM", "20"))); _r = math.radians(float(os.environ.get("CAMROT", "0")))
VD = (Euler((math.pi / 2 - _t, 0, -math.pi / 2 + _r)).to_matrix() @ Vector((0, 0, -1))).normalized()
wb = bpy.data.objects["wpn_bow"]; bo = max((o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith(("wpn_", "prop_"))), key=lambda o: len(o.data.vertices))
own = []
for p_ in bo.data.polygons:
    ws = {}
    for vi in p_.vertices:
        for g in bo.data.vertices[vi].groups: n_ = bo.vertex_groups[g.group].name; ws[n_] = ws.get(n_, 0) + g.weight
    own.append(max(ws, key=ws.get).replace("mixamorig:", "") if ws else "-")
FING = ("Thumb", "Index", "Middle", "Ring", "Pinky")
def grp(o_):
    if o_.startswith("RightHand") and any(k in o_ for k in FING): return None  # the hook fingers may touch the string
    if o_.startswith("LeftHand") and any(k in o_ for k in FING): return "Lfing"
    for k, g in (("RightForeArm", "Rfore"), ("RightHand", "Rhand"), ("RightArm", "Rarm"), ("LeftForeArm", "Lfore"), ("LeftHand", "Lhand"), ("LeftArm", "Larm"), ("Head", "head"), ("Neck", "head")):
        if o_.startswith(k): return g
    return None
G = [grp(o_) for o_ in own]; sk = [i for i, g in enumerate(G) if g]
hd_f = [i for i, g in enumerate(G) if g == "head"]; leg_f = [i for i, o_ in enumerate(own) if ("Leg" in o_ or "Foot" in o_)]
fa, fb = map(int, os.environ.get("TBFR", f"0,{f1 - f0}").split(","))
tot = {}; worst = []
for f in range(f0 + fa, f0 + fb + 1):
    sc.frame_set(f); bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    m_ = bo.evaluated_get(dg).to_mesh(); P_ = [bo.matrix_world @ v.co for v in m_.vertices]; PL = [m_.polygons[i].vertices[:] for i in range(len(m_.polygons))]
    bo.evaluated_get(dg).to_mesh_clear()
    bvS = BVHTree.FromPolygons(P_, [PL[i] for i in sk]); bvL = BVHTree.FromPolygons(P_, [PL[i] for i in leg_f])
    wm_ = wb.evaluated_get(dg).to_mesh(); WV = [wb.matrix_world @ v.co for v in wm_.vertices]; WP = [p.vertices[:] for p in wm_.polygons]; wb.evaluated_get(dg).to_mesh_clear()
    svs = set(sv); bowf = [p for p in WP if not all(i in svs for i in p)]
    bvB = BVHTree.FromPolygons(WV, bowf)
    cnt = {}
    for i in sv[::2]:
        p = WV[i]; hit = bvS.ray_cast(p - VD * 3, VD, 6)
        if hit[0] is not None: g = G[sk[hit[2]]]; cnt[g] = cnt.get(g, 0) + 1
    # head verts hidden by the bow (from the camera), fraction of the head's camera-facing verts
    hv = set(i for fi in hd_f for i in PL[fi]); hf = [P_[i] for i in hv]; cov = 0; n_ = 0
    for p in hf[::3]:
        n_ += 1; hb = bvB.ray_cast(p - VD * 0.004, -VD, 3)
        if hb[0] is not None: cov += 1
    sh = min((bvL.find_nearest(WV[i])[3] for i in range(0, len(WV), 7)), default=9)
    for g, c in cnt.items(): tot[g] = tot.get(g, 0) + c
    s_ = sum(c for g, c in cnt.items() if g != "Lfing")
    worst.append((s_, f - f0))
    print("TBS", f - f0, "str-over", s_, dict(sorted(cnt.items())), "bow-hides-head%", round(100 * cov / max(n_, 1), 1), "bow-leg cm", round(sh * 100, 1), modes[f - f0] if f - f0 < len(modes) else "")
print("TBSUM str-over by part", tot, "worst frames", sorted(worst, reverse=True)[:6])
