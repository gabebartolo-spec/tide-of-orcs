# Torso/belt cloth skinned to an arm stretches toward it when the arm pulls back (posed Tripo models: the arm hangs against
# the hip). Keep arm-chain weight only on verts within RA of the arm's bone line (shoulder -> elbow -> wrist -> fist tip);
# give the rest to the body bone below (Spine2 / Spine / Hips by height, RightUpLeg below the hips).
# Args: in.blend out.blend   Env: SIDE (Right), RA (0.05 m), DRY=1 = count only
import bpy, sys, os
from mathutils.geometry import intersect_point_line
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE"); body = max((o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith("wpn_")), key=lambda o: len(o.data.vertices))
S = os.environ.get("SIDE", "Right"); RA = float(os.environ.get("RA", "0.05")); W = arm.matrix_world; B = arm.data.bones
P = lambda n: W @ B["mixamorig:" + n].head_local
sh, el, wr = P(f"{S}Arm"), P(f"{S}ForeArm"), P(f"{S}Hand"); tip = wr + (wr - el).normalized() * 0.09
BX = list(map(float, os.environ.get("BOX", "-9,9,-9,9,-9,9").split(",")))  # only touch verts in this bind-pose box (the hip the arm rested on)
NT = float(os.environ["NT"]) if "NT" in os.environ else None  # normal test: keep arm weight only where normal.radial > NT
RT = float(os.environ.get("RT", "0.08"))  # ...and within RT of the bone line
MX = float(os.environ.get("MX", "9"))  # leave verts whose arm weight is at least MX
RB = float(os.environ.get("RB", "0.04"))  # blend width past RA over which arm weight fades out
RM = float(os.environ.get("RM", "9"))  # verts more than RM toward the body midline from the elbow->fist line belong to the hip it rests on
def dseg(p, a_, b_):
    q, t = intersect_point_line(p, a_, b_); t = min(1, max(0, t)); o = p - (a_ + (b_ - a_) * t)
    med = -o.x if sh.x > 0 else o.x
    return 9 if a_ is not sh and med > RM else o.length
G = {g.name: g for g in body.vertex_groups}; gi = {g.index: g.name for g in body.vertex_groups}
chain = [k for k in G if k.startswith(f"mixamorig:{S}") and any(s in k for s in ("Shoulder", "Arm", "Hand"))]
def host(z):
    if z > P("Spine2").z - 0.05: return "mixamorig:Spine2"
    if z > P("Spine").z: return "mixamorig:Spine1"
    if z > P("Hips").z: return "mixamorig:Spine"
    return f"mixamorig:{S}UpLeg"
M = body.matrix_world; n = 0; tot = 0.0; hs = {}
for v in body.data.vertices:
    ws = {gi[g.group]: g.weight for g in v.groups}; m = sum(ws.get(c, 0) for c in chain)
    if m < 0.01 or m >= MX: continue  # true arm skin is ~fully arm-weighted; contact contamination is mixed
    p = M @ v.co
    d = min(dseg(p, sh, el), dseg(p, el, wr), dseg(p, wr, tip))
    if NT is not None:  # arm skin faces away from the bone line; cloth the arm rested on faces back toward it
        segs = ((sh, el), (el, wr), (wr, tip)); a_, b_ = min(segs, key=lambda s: dseg(p, *s))
        q, t = intersect_point_line(p, a_, b_); q = a_ + (b_ - a_) * min(1, max(0, t))
        if a_ is not sh and d < RT and (p - q).normalized().dot((M.to_3x3() @ v.normal).normalized()) < NT: d = 9  # forearm/hand only
    if d < RA or p.z > sh.z or not (BX[0] < p.x < BX[1] and BX[2] < p.y < BX[3] and BX[4] < p.z < BX[5]): continue
    k = min(1, (d - RA) / RB) if RB > 0 else 1; k = k * k * (3 - 2 * k)  # soft edge: hard cuts tear the cloth at the seam
    rest = {g: w_ for g, w_ in ws.items() if g not in chain and w_ > 0}; rs = sum(rest.values())
    tg = {g: w_ / rs for g, w_ in rest.items()} if rs > 0.05 else {host(p.z): 1.0}  # hand it to the vert's own body bones
    n += 1; tot += m * k; h = max(tg, key=tg.get); hs[h] = hs.get(h, 0) + 1
    if not os.environ.get("DRY"):
        for c in chain:
            if c in ws: G[c].add([v.index], ws[c] * (1 - k), "REPLACE")
        for g, s in tg.items(): G[g].add([v.index], ws.get(g, 0) + m * k * s, "REPLACE")
print("MOVED", n, "verts, mean arm weight", round(tot / max(n, 1), 3), hs)
if not os.environ.get("DRY"): bpy.ops.wm.save_as_mainfile(filepath=a[1])
