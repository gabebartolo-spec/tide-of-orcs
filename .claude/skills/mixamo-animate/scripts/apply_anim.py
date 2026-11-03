import bpy, sys, math
from mathutils import Euler
a = sys.argv[sys.argv.index("--") + 1:]
model, anim, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.open_mainfile(filepath=model) if model.endswith(".blend") else bpy.ops.import_scene.fbx(filepath=model, use_image_search=False)
tgt = next(o for o in bpy.data.objects if o.type == "ARMATURE")
for o in bpy.data.objects: o.select_set(True)
bpy.context.view_layer.objects.active = tgt
if not model.endswith(".blend"): bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
print("TGT", tgt.scale[:], tgt.rotation_euler[:], [(o.name, o.scale[:]) for o in bpy.data.objects if o.type=="MESH"])
before = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=anim, use_image_search=False)
src = next(o for o in bpy.data.objects if o not in before and o.type == "ARMATURE")
# rest-offset retarget: tgt_world_rot(f) = src_world_rot(f) @ src_rest_world_rot^-1 @ tgt_rest_world_rot
from mathutils import Matrix
def wrot(arm, pb): return (arm.matrix_world @ pb.matrix).to_3x3().normalized().to_quaternion()
sc = bpy.context.scene
act = src.animation_data.action
f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
sc.frame_start, sc.frame_end = f0, f1
names = [b.name for b in tgt.pose.bones if b.name in src.pose.bones]
order = [b for b in tgt.pose.bones if b.name in names]  # pose.bones is parent-first
if tgt.animation_data: tgt.animation_data.action = None
for pb in tgt.pose.bones: pb.matrix_basis = Matrix()
sc.frame_set(f0); bpy.context.view_layer.update()
trest = {n: wrot(tgt, tgt.pose.bones[n]) for n in names}  # Tripo bind pose comes from its imported action
if tgt.animation_data: tgt.animation_data.action = None
for pb in order: pb.rotation_mode = "QUATERNION"
src.animation_data.action = None; sc.frame_set(f0); bpy.context.view_layer.update()
for pb in src.pose.bones: pb.matrix_basis = Matrix()
bpy.context.view_layer.update()
srest = {n: wrot(src, src.pose.bones[n]) for n in names}
import os
from mathutils import Vector
for n in filter(None, os.environ.get("RMATCH", "").split(",")):  # rest-pose match: turn the target rest bone onto the source rest direction first
    for m in (names if n == "*" else [m for m in names if n in m]):
        Y = Vector((0, 1, 0)); trest[m] = (trest[m] @ Y).rotation_difference(srest[m] @ Y) @ trest[m]
def _hframe(arm, rq, side):  # hand frame: y = bone direction, x = thumb->index base line (sets the grip axis twist; clips may lack pinky bones)
    P = lambda k: arm.matrix_world @ arm.pose.bones[f"mixamorig:{side}Hand{k}1"].head
    y = (rq @ Vector((0, 1, 0))).normalized(); x = P("Index") - P("Thumb"); x = (x - y * x.dot(y)).normalized()
    return Matrix((x, y, x.cross(y))).transposed().to_quaternion()
for side in filter(None, os.environ.get("FMATCH", "").split(",")):  # full hand-frame match (Left/Right): twist too, from the clip's knuckles
    m = f"mixamorig:{side}Hand"
    from mathutils import Quaternion
    corr = _hframe(src, srest[m], side) @ _hframe(tgt, trest[m], side).inverted()
    trest[m] = corr @ trest[m]
    fa = f"mixamorig:{side}ForeArm"; ax = (trest[fa] @ Vector((0, 1, 0))).normalized()  # share the twist with the forearm (no candy-wrapper wrist)
    tw = Quaternion((corr.w, *(ax * Vector((corr.x, corr.y, corr.z)).dot(ax)))).normalized()
    trest[fa] = Quaternion().slerp(tw, float(os.environ.get("FTWIST", "0.5"))) @ trest[fa]
hips = "mixamorig:Hips"
sh0 = (src.matrix_world @ src.pose.bones[hips].matrix).translation.copy()
th0 = (tgt.matrix_world @ tgt.pose.bones[hips].matrix).translation.copy()
scale = th0.z / sh0.z if sh0.z else 1.0
src.animation_data.action = act
if hasattr(src.animation_data, "action_suggested_slot") or hasattr(act, "slots"):
    try: src.animation_data.action_slot = act.slots[0]
    except Exception as e: print("SLOT", e)
for f in (f0, (f0 + f1) // 2):
    sc.frame_set(f); bpy.context.view_layer.update(); print("SRC", f, wrot(src, src.pose.bones[hips]))
for f in range(f0, f1 + 1):
    sc.frame_set(f); bpy.context.view_layer.update()
    for pb in order:
        if os.environ.get("DIRECT"):  # clip exported on this same Mixamo skeleton: copy local rotations as-is
            pb.rotation_quaternion = src.pose.bones[pb.name].matrix_basis.to_quaternion()
            pb.keyframe_insert("rotation_quaternion", frame=f)
            if pb.name == hips:
                t = src.pose.bones[hips].matrix_basis.translation.copy()
                if os.environ.get("INPLACE"):  # hips bone points up: local Y is height, X/Z are ground drift
                    t0 = globals().setdefault("_t0", t.copy()); t.x, t.z = t0.x, t0.z
                pb.location = t; pb.keyframe_insert("location", frame=f)
            continue
        q = wrot(src, src.pose.bones[pb.name]) @ srest[pb.name].inverted() @ trest[pb.name]
        cur = tgt.matrix_world @ pb.matrix
        loc = cur.translation
        if pb.name == hips:
            sp = (src.matrix_world @ src.pose.bones[hips].matrix).translation
            loc = th0 + (sp - sh0) * scale
            if os.environ.get("INPLACE"):  # remove the clip's steady ground travel (linear from first to last frame), keep the bob and sway
                if "_drift" not in globals():  # from the clip's own first frame, not sh0 (rest): else the last frame lands at rest and the loop snaps by the clip's frame-0 sway
                    sc.frame_set(f0); bpy.context.view_layer.update(); _p0 = (src.matrix_world @ src.pose.bones[hips].matrix).translation.copy()
                    sc.frame_set(f1); bpy.context.view_layer.update(); _d = (src.matrix_world @ src.pose.bones[hips].matrix).translation - _p0; _d.z = 0; globals()["_drift"] = _d
                    sc.frame_set(f); bpy.context.view_layer.update()
                loc = loc - _drift * scale * ((f - f0) / max(1, f1 - f0))
        wm = Matrix.Translation(loc) @ q.to_matrix().to_4x4() @ Matrix.Diagonal(cur.to_scale().to_4d())
        pb.matrix = tgt.matrix_world.inverted() @ wm
        bpy.context.view_layer.update()
        pb.keyframe_insert("rotation_quaternion", frame=f)
        if pb.name == hips: pb.keyframe_insert("location", frame=f)
def _elbow(arm, s):  # elbow bend in degrees (0 = straight): angle between upper arm and forearm
    B = arm.pose.bones; W = arm.matrix_world; a, e, h = (W @ B[f"mixamorig:{s}{k}"].head for k in ("Arm", "ForeArm", "Hand"))
    return math.degrees((e - a).angle(h - e))
def _armdir(arm, s, k="Arm", n="ForeArm"):  # bone direction from straight down, degrees: (out to the side = +x, forward = -y); the body faces -Y
    B = arm.pose.bones; W = arm.matrix_world; d = (W @ B[f"mixamorig:{s}{n}"].head) - (W @ B[f"mixamorig:{s}{k}"].head)
    return math.degrees(math.atan2(d.x, -d.z)), math.degrees(math.atan2(-d.y, -d.z))
def _armprint(arm, tag):
    for s in ("Left", "Right"):
        v, u, w = [], [], []
        for f in range(f0, f1 + 1): sc.frame_set(f); bpy.context.view_layer.update(); v.append(_elbow(arm, s)); u.append(_armdir(arm, s)); w.append(_armdir(arm, s, "ForeArm", "Hand"))
        mm = lambda L: f"{round(min(L), 1)}/{round(sum(L) / len(L), 1)}/{round(max(L), 1)}"
        print("ELBOW", tag, s, mm(v), "| upper side", mm([x[0] for x in u]), "fwd", mm([x[1] for x in u]), "| fore side", mm([x[0] for x in w]), "fwd", mm([x[1] for x in w]))
if os.environ.get("ELBOW"): _armprint(src, "src")  # the clip's elbow bend and arm directions per side (min/mean/max): the reference for a free arm
bpy.data.objects.remove(src)
import os
from mathutils import Quaternion
_rest = os.environ.get("REST", "")
for bn in ([p.name for p in tgt.pose.bones] if _rest == "*" else filter(None, _rest.split(","))):  # hold the modelled (bind) pose; * = all
    pb = tgt.pose.bones[bn]
    for f in range(f0, f1 + 1): pb.rotation_quaternion = Quaternion(); pb.keyframe_insert("rotation_quaternion", frame=f)
for spec in filter(None, os.environ.get("FINGSRC", "").split(";")):  # clip.fbx|frame|bone,bone: hold these bones at another clip's local pose (an approved attack's closed fists on a walk whose hands hang open); that clip must be exported on this same skeleton
    _p, _fr, _bl = spec.split("|"); _b4 = set(bpy.data.objects); _fs = (sc.frame_start, sc.frame_end, sc.frame_current)
    bpy.ops.import_scene.fbx(filepath=_p, use_image_search=False); _s2 = next(o for o in bpy.data.objects if o not in _b4 and o.type == "ARMATURE")
    sc.frame_set(int(_fr)); bpy.context.view_layer.update(); _qs = {bn: _s2.pose.bones[bn].matrix_basis.to_quaternion() for bn in _bl.split(",")}
    for o in [o for o in bpy.data.objects if o not in _b4]: bpy.data.objects.remove(o)
    sc.frame_start, sc.frame_end = _fs[0], _fs[1]; sc.frame_set(_fs[2])
    for bn, q in _qs.items():
        pb = tgt.pose.bones[bn]
        for f in range(f0, f1 + 1): pb.rotation_quaternion = q; pb.keyframe_insert("rotation_quaternion", frame=f)
for spec in filter(None, os.environ.get("FINGCOPY", "").split(";")):  # Side:Index>Middle,Ring,Pinky (TB-203): the Mixamo clips carry only thumb and
    # index; the other fingers copy the index's local curl joint for joint, so the draw hand hooks the string with three fingers
    sd_, rest_ = spec.split(":"); srcf, dsts = rest_.split(">")
    for k in (1, 2, 3):
        ps_ = tgt.pose.bones.get(f"mixamorig:{sd_}Hand{srcf}{k}")
        for dn in dsts.split(","):
            pd_ = tgt.pose.bones.get(f"mixamorig:{sd_}Hand{dn}{k}")
            if not ps_ or not pd_: continue
            pd_.rotation_mode = "QUATERNION"
            for f in range(f0, f1 + 1):
                sc.frame_set(f); pd_.rotation_quaternion = ps_.rotation_quaternion.copy(); pd_.keyframe_insert("rotation_quaternion", frame=f)
for bn in filter(None, os.environ.get("FREEZE", "").split(",")):  # hold the clip's mean pose (no twist/wobble)
    pb = tgt.pose.bones[bn]; qs = []
    for f in range(f0, f1 + 1): sc.frame_set(f); q = pb.rotation_quaternion.copy(); qs.append(q if not qs or q.dot(qs[0]) >= 0 else -q)
    qm = Quaternion((sum(q.w for q in qs), sum(q.x for q in qs), sum(q.y for q in qs), sum(q.z for q in qs))).normalized()
    for f in range(f0, f1 + 1): pb.rotation_quaternion = qm; pb.keyframe_insert("rotation_quaternion", frame=f)
for spec in filter(None, os.environ.get("MIRR", "").split(";")):  # src>dst:gain = dst keeps its mean + src's swing mirrored (x) and half a cycle later
    sd, k = spec.rsplit(":", 1); sn, dn = sd.split(">"); ps, pd = tgt.pose.bones[sn], tgt.pose.bones[dn]; qs, qd = [], []
    for f in range(f0, f1 + 1):
        sc.frame_set(f); q = ps.rotation_quaternion.copy(); qs.append(q if not qs or q.dot(qs[0]) >= 0 else -q)
        q = pd.rotation_quaternion.copy(); qd.append(q if not qd or q.dot(qd[0]) >= 0 else -q)
    avg = lambda L: Quaternion((sum(q.w for q in L), sum(q.x for q in L), sum(q.y for q in L), sum(q.z for q in L))).normalized()
    ms, md = avg(qs), avg(qd); n = len(qs) - 1  # last frame duplicates the first
    if os.environ.get("MIRRMEAN"): md = Quaternion((ms.w, ms.x, -ms.y, -ms.z))  # MIRRMEAN=1: dst also takes src's mean pose mirrored (a full arm copy, not just the swing)
    rv = []
    for i in range(n + 1):
        d = ms.inverted() @ qs[(i + int(os.environ.get("MPH", n // 2))) % n]; d = Quaternion((d.w, d.x, -d.y, -d.z)); ax, an = d.to_axis_angle(); rv.append(Vector(ax) * an)
    if os.environ.get("H1"):  # keep only the once-per-cycle component (one even swing per stride)
        c = [sum((rv[j] * math.cos(2 * math.pi * j / n) for j in range(n)), Vector()) * (2 / n), sum((rv[j] * math.sin(2 * math.pi * j / n) for j in range(n)), Vector()) * (2 / n)]
        rv = [c[0] * math.cos(2 * math.pi * i / n) + c[1] * math.sin(2 * math.pi * i / n) for i in range(n + 1)]
    if os.environ.get("HINGE") == "world":  # pitch only: rotate about the body's left-right axis (world X), sign from the swing
        sc.frame_set(f0); pd.rotation_quaternion = md; bpy.context.view_layer.update()
        u = ((tgt.matrix_world @ pd.matrix).to_3x3().normalized().inverted() @ Vector((1, 0, 0))).normalized()
        a = [v.dot(u) for v in rv]; g = max(v.length for v in rv) / max(max(map(abs, a)), 1e-9)
        rv = [u * (x * g) for x in a]  # keep the original swing size
    elif os.environ.get("HINGE"):  # one fixed axis: the swing's largest direction, so it goes back and forth instead of circling
        u = max(rv, key=lambda v: v.length).normalized(); rv = [u * v.dot(u) for v in rv]
    for i, f in enumerate(range(f0, f1 + 1)):
        v = rv[i] * float(k); pd.rotation_quaternion = md @ (Quaternion(v.normalized(), v.length) if v.length > 1e-9 else Quaternion()); pd.keyframe_insert("rotation_quaternion", frame=f)
if os.environ.get("MIRRW"):  # MIRRW="src>dst,src>dst,..." (parent first): dst's world rotation = src's mirrored across the body plane (x->-x), MPH frames later. Roll-proof: works in armature space, not bone-local quaternions
    S = Matrix.Diagonal((-1, 1, 1)); pairs = [tuple(tgt.pose.bones[b] for b in sp.split(">")) for sp in os.environ["MIRRW"].split(",")]
    n = f1 - f0; ph = int(os.environ.get("MPH", n // 2)); src = {}
    for f in range(f0, f1 + 1): sc.frame_set(f); src[f] = [ps.matrix.to_3x3() for ps, _ in pairs]
    for f in range(f0, f1 + 1):
        sc.frame_set(f); g = f0 + ((f - f0 + ph) % n)
        for i, (ps, pd) in enumerate(pairs):
            R = S @ src[g][i] @ S; M = R.to_4x4(); M.translation = pd.matrix.translation; pd.matrix = M; bpy.context.view_layer.update()
            pd.keyframe_insert("rotation_quaternion", frame=f)
for spec in filter(None, os.environ.get("SWING", "").split(";")):  # bone:gain = bind pose + the clip's swing about its own mean
    bn, k = spec.rsplit(":", 1); pb = tgt.pose.bones[bn]; qs = []
    for f in range(f0, f1 + 1): sc.frame_set(f); q = pb.rotation_quaternion.copy(); qs.append(q if not qs or q.dot(qs[0]) >= 0 else -q)
    qm = Quaternion((sum(q.w for q in qs), sum(q.x for q in qs), sum(q.y for q in qs), sum(q.z for q in qs))).normalized()
    for i, f in enumerate(range(f0, f1 + 1)):
        ax, an = (qm.inverted() @ qs[i]).to_axis_angle(); pb.rotation_quaternion = Quaternion(ax, an * float(k)); pb.keyframe_insert("rotation_quaternion", frame=f)  # axis-angle: gain may exceed 1
for spec in filter(None, os.environ.get("AMP", "").split(";")):  # bone:gain = the clip's mean pose + its swing scaled by gain
    bn, k = spec.rsplit(":", 1); pb = tgt.pose.bones[bn]; qs = []
    for f in range(f0, f1 + 1): sc.frame_set(f); q = pb.rotation_quaternion.copy(); qs.append(q if not qs or q.dot(qs[0]) >= 0 else -q)
    qm = Quaternion((sum(q.w for q in qs), sum(q.x for q in qs), sum(q.y for q in qs), sum(q.z for q in qs))).normalized()
    for i, f in enumerate(range(f0, f1 + 1)):
        d = qm.inverted() @ qs[i]; ax, an = d.to_axis_angle(); pb.rotation_quaternion = qm @ Quaternion(ax, an * float(k)); pb.keyframe_insert("rotation_quaternion", frame=f)
for spec in filter(None, os.environ.get("DAMP", "").split(";")):  # bone:k keeps k of the Mixamo rotation (slerp toward bind)
    bn, k = spec.rsplit(":", 1); pb = tgt.pose.bones[bn]
    for f in range(f0, f1 + 1):
        sc.frame_set(f); pb.rotation_quaternion = Quaternion().slerp(pb.rotation_quaternion, float(k)); pb.keyframe_insert("rotation_quaternion", frame=f)
for spec in filter(None, os.environ.get("OFFS", "").split(";")):
    bn, e = spec.rsplit(":", 1); e = [math.radians(float(v)) for v in e.split(",")]
    qo = Euler(e).to_quaternion(); pb = tgt.pose.bones[bn]
    for f in range(f0, f1 + 1):
        sc.frame_set(f); pb.rotation_quaternion = pb.rotation_quaternion @ qo; pb.keyframe_insert("rotation_quaternion", frame=f)
def _unscale(pb):  # pb.matrix = ... also writes location/scale; those channels are not keyed, so the residue would leak into later ops and compound (arms exploded)
    pb.scale = (1, 1, 1)
    if pb.name != "mixamorig:Hips": pb.location = (0, 0, 0)
def _woffs(var):  # bone:ax,ay,az,deg;... = world-axis rotation about the bone head, every frame
    for spec in filter(None, os.environ.get(var, "").split(";")):
        bn, e = spec.rsplit(":", 1); ax, ay, az, deg = [float(v) for v in e.split(",")]; pb = tgt.pose.bones[bn]
        R = Matrix.Rotation(math.radians(deg), 4, (ax, ay, az))
        for f in range(f0, f1 + 1):
            sc.frame_set(f); bpy.context.view_layer.update()
            wm = tgt.matrix_world @ pb.matrix; t = wm.translation.copy()
            nm = Matrix.Translation(t) @ R @ Matrix.Translation(-t) @ wm
            pb.matrix = tgt.matrix_world.inverted() @ nm; _unscale(pb); bpy.context.view_layer.update()
            pb.keyframe_insert("rotation_quaternion", frame=f)
_woffs("WOFFS")
for spec in filter(None, os.environ.get("WYAW", "").split(";")):  # b1,b2>ref = bones held upright at their modelled orientation, turned only by ref's heading (world Z yaw); b1,b2 share it, so the head stays rigid on the neck
    bns, rn = spec.split(">"); rb = tgt.pose.bones[rn]; W3 = tgt.matrix_world.to_3x3().normalized(); yaws = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        d = (W3 @ rb.matrix.to_3x3().normalized() @ rb.bone.matrix_local.to_3x3().inverted() @ W3.inverted()) @ Vector((1, 0, 0)); yaw = math.atan2(d.y, d.x) if d.xy.length > 1e-6 else 0.0; yaws.append(math.degrees(yaw))  # heading from the shoulder line (stays level when the chest hunches)
        Y = W3.inverted() @ Matrix.Rotation(yaw, 3, "Z") @ W3
        for bn in bns.split(","):
            pb = tgt.pose.bones[bn]; bpy.context.view_layer.update()
            pb.matrix = Matrix.Translation(pb.matrix.translation) @ (Y @ pb.bone.matrix_local.to_3x3()).to_4x4(); _unscale(pb); bpy.context.view_layer.update()
            pb.keyframe_insert("rotation_quaternion", frame=f)
    print("WYAW", rn, "yaw deg min/max", round(min(yaws), 1), round(max(yaws), 1), [round(y) for y in yaws[::3]])
for bn in filter(None, os.environ.get("WLEVEL", "").split(",")):  # hold the bone at its modelled orientation in world space (head stays level whatever the spine does)
    pb = tgt.pose.bones[bn]
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        pb.matrix = Matrix.Translation(pb.matrix.translation) @ pb.bone.matrix_local.to_3x3().to_4x4(); _unscale(pb); bpy.context.view_layer.update()
        pb.keyframe_insert("rotation_quaternion", frame=f)
for spec in filter(None, os.environ.get("ARMSET", "").split(";")):  # Side:side,fwd = turn the upper arm so its MEAN direction matches a reference clip's (ELBOW probe angles), keeping the swing about it
    s, e = spec.split(":"); sd, fw = (math.radians(float(v)) for v in e.split(",")); B = tgt.pose.bones; W = tgt.matrix_world; pb = B[f"mixamorig:{s}Arm"]
    m = Vector()
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); m += ((W @ B[f"mixamorig:{s}ForeArm"].head) - (W @ pb.head)).normalized()
    R = m.normalized().rotation_difference(Vector((math.tan(sd), -math.tan(fw), -1)).normalized()).to_matrix().to_4x4()
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        wm = W @ pb.matrix; t = wm.translation.copy(); pb.matrix = W.inverted() @ (Matrix.Translation(t) @ R @ Matrix.Translation(-t) @ wm); _unscale(pb); bpy.context.view_layer.update()
        pb.keyframe_insert("rotation_quaternion", frame=f)
for spec in filter(None, os.environ.get("ELBOWSET", "").split(";")):  # Side:deg = set the elbow bend to deg on every frame, about its own hinge axis (copy a reference clip's bend)
    s, deg = spec.split(":"); B = tgt.pose.bones; W = tgt.matrix_world; pb = B[f"mixamorig:{s}ForeArm"]
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        a, e, h = (W @ B[f"mixamorig:{s}{k}"].head for k in ("Arm", "ForeArm", "Hand"))
        ax = (e - a).cross(h - e).normalized(); R = Matrix.Rotation(math.radians(float(deg)) - (e - a).angle(h - e), 4, ax)
        wm = W @ pb.matrix; pb.matrix = W.inverted() @ (Matrix.Translation(e) @ R @ Matrix.Translation(-e) @ wm); _unscale(pb); bpy.context.view_layer.update()
        pb.keyframe_insert("rotation_quaternion", frame=f)
for spec in filter(None, os.environ.get("ELBOWSHIFT", "").split(";")):  # Side:deg = add deg to the clip's elbow bend on every frame (negative = straighter), keeping its swing
    s, deg = spec.split(":"); B = tgt.pose.bones; W = tgt.matrix_world; pb = B[f"mixamorig:{s}ForeArm"]
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        a, e, h = (W @ B[f"mixamorig:{s}{k}"].head for k in ("Arm", "ForeArm", "Hand"))
        ax = (e - a).cross(h - e).normalized(); R = Matrix.Rotation(math.radians(float(deg)), 4, ax)
        wm = W @ pb.matrix; pb.matrix = W.inverted() @ (Matrix.Translation(e) @ R @ Matrix.Translation(-e) @ wm); _unscale(pb); bpy.context.view_layer.update()
        pb.keyframe_insert("rotation_quaternion", frame=f)
for spec in filter(None, os.environ.get("ARMTWIST", "").split(";")):  # Side:side,fwd = twist the upper arm about its own axis so the MEAN forearm direction faces the reference's (the elbow hinges in the right plane)
    s, e = spec.split(":"); _v = [float(v) for v in e.split(",")]; sd, fw = math.radians(_v[0]), math.radians(_v[1]); zc = _v[2] if len(_v) > 2 else -1.0  # optional 3rd value: z sign (+1 = hinge up)
    B = tgt.pose.bones; W = tgt.matrix_world; pb = B[f"mixamorig:{s}Arm"]; mu, mf = Vector(), Vector()
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); a, el, h = (W @ B[f"mixamorig:{s}{k}"].head for k in ("Arm", "ForeArm", "Hand")); mu += (el - a).normalized(); mf += (h - el).normalized()
    u = mu.normalized(); flat = lambda v: (v - u * v.dot(u)).normalized(); p, q = flat(mf), flat(Vector((math.tan(sd), -math.tan(fw), zc)))
    ang = math.atan2(p.cross(q).dot(u), p.dot(q)); print("ARMTWIST", s, round(math.degrees(ang), 1))
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); t = W @ pb.head; ax = ((W @ B[f"mixamorig:{s}ForeArm"].head) - t).normalized()
        wm = W @ pb.matrix; pb.matrix = W.inverted() @ (Matrix.Translation(t) @ Matrix.Rotation(ang, 4, ax) @ Matrix.Translation(-t) @ wm); _unscale(pb); bpy.context.view_layer.update()
        pb.keyframe_insert("rotation_quaternion", frame=f)
_woffs("WOFFS2")  # same as WOFFS but after ARMSET/ELBOWSHIFT/ARMTWIST: wrist knobs in the FINAL arm frame (a pre-twist wrist pitch turns into a yaw)
def _wristprint(arm, tag):  # wrist flexion per side (angle forearm dir -> hand dir, degrees; a natural wrist stays under ~30) and the mean prop direction
    for s in ("Left", "Right"):
        B = arm.pose.bones; W = arm.matrix_world; v = []; m = Vector(); pb = B[f"mixamorig:{s}Hand"]; probes = dict(x.split(":") for x in os.environ.get("MPROBE", "").split(";") if x)
        loc = Vector([float(c) for c in probes[s].split(",")]) * W.to_scale().x if s in probes else None
        for f in range(f0, f1 + 1):
            sc.frame_set(f); bpy.context.view_layer.update(); e, h = (W @ B[f"mixamorig:{s}ForeArm"].head), (W @ B[f"mixamorig:{s}Hand"].head); v.append(math.degrees((h - e).angle((W @ pb.matrix).to_3x3() @ Vector((0, 1, 0)))))
            if loc is not None: m += ((W @ pb.matrix).to_3x3().normalized() @ loc).normalized()
        print("WRIST", tag, s, f"{round(min(v), 1)}/{round(sum(v) / len(v), 1)}/{round(max(v), 1)}", "prop mean", [round(c, 2) for c in m.normalized()] if loc is not None else "-")
for spec in filter(None, os.environ.get("MALLETSET", "").split(";")):  # Side:dx,dy,dz = turn the hand so the MEAN prop direction (hand head -> MPROBE point) points along this world vector, keeping the clip's swing about it
    # MALLETAXIS=fore: first pronate only (rotate about the forearm axis through the wrist), then correct the rest with a free rotation capped at MALLETMAX degrees (default 25) so the wrist never breaks; prints the residual aim error
    s, e = spec.split(":"); d = Vector([float(v) for v in e.split(",")]).normalized(); B = tgt.pose.bones; W = tgt.matrix_world; pb = B[f"mixamorig:{s}Hand"]
    loc = Vector([float(v) for v in dict(x.split(":") for x in os.environ["MPROBE"].split(";") if x)[s].split(",")]) * W.to_scale().x
    def _mean():
        m = Vector()
        for f in range(f0, f1 + 1):
            sc.frame_set(f); bpy.context.view_layer.update(); m += ((W @ pb.matrix).to_3x3().normalized() @ loc).normalized()
        return m.normalized()
    def _apply(R, axis_from_fore=False, ang=0.0):
        for f in range(f0, f1 + 1):
            sc.frame_set(f); bpy.context.view_layer.update()
            if axis_from_fore and os.environ.get("MALLETFORE"):  # MALLETFORE=1: do the pronation in the forearm (radius over ulna) instead of at the wrist, which cannot twist; the hand rides along
                fb = B[f"mixamorig:{s}ForeArm"]; fm = W @ fb.matrix; e = fm.translation.copy(); ax = ((W @ pb.head) - e).normalized()
                fb.matrix = W.inverted() @ (Matrix.Translation(e) @ Matrix.Rotation(ang, 4, ax) @ Matrix.Translation(-e) @ fm); _unscale(fb); bpy.context.view_layer.update()
                fb.keyframe_insert("rotation_quaternion", frame=f); pb.keyframe_insert("rotation_quaternion", frame=f); continue
            wm = W @ pb.matrix; t = wm.translation.copy()
            Rf = Matrix.Rotation(ang, 4, (t - (W @ B[f"mixamorig:{s}ForeArm"].head)).normalized()) if axis_from_fore else R
            pb.matrix = W.inverted() @ (Matrix.Translation(t) @ Rf @ Matrix.Translation(-t) @ wm); _unscale(pb); bpy.context.view_layer.update()
            pb.keyframe_insert("rotation_quaternion", frame=f)
    m = _mean(); print("MALLETSET", s, "mean", [round(c, 2) for c in m])
    if os.environ.get("MALLETAXIS") == "fore":
        u = Vector()
        for f in range(f0, f1 + 1):
            sc.frame_set(f); bpy.context.view_layer.update(); u += ((W @ pb.head) - (W @ B[f"mixamorig:{s}ForeArm"].head)).normalized()
        u.normalize(); flat = lambda v: (v - u * v.dot(u)).normalized(); p, q = flat(m), flat(d)
        ang = math.atan2(p.cross(q).dot(u), p.dot(q)); _apply(None, True, ang); m = _mean()
        print("MALLETSET", s, "pronate", round(math.degrees(ang), 1), "after", [round(c, 2) for c in m], "residual", round(math.degrees(m.angle(d)), 1))
    cap = math.radians(float(os.environ.get("MALLETMAX", "25" if os.environ.get("MALLETAXIS") == "fore" else "180")))
    q = m.rotation_difference(d); ax, a = q.axis, q.angle
    if a > cap: a = cap
    _apply(Matrix.Rotation(a, 4, ax)); m = _mean()
    print("MALLETSET", s, "free", round(math.degrees(a), 1), "final", [round(c, 2) for c in m], "residual", round(math.degrees(m.angle(d)), 1))
if os.environ.get("ELBOW"): _armprint(tgt, "tgt"); _wristprint(tgt, "tgt")
for spec in filter(None, os.environ.get("ABD", "").split(";")):  # world-Y abduction scaled by how far the bone hangs down
    bn, deg = spec.rsplit(":", 1); pb = tgt.pose.bones[bn]
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        wm = tgt.matrix_world @ pb.matrix; t = wm.translation.copy()
        d = ((tgt.matrix_world @ pb.tail) - t).normalized(); k = max(0.0, -d.z)
        R = Matrix.Rotation(math.radians(float(deg) * k), 4, [float(v) for v in os.environ.get("ABDAX", "0,1,0").split(",")])
        pb.matrix = tgt.matrix_world.inverted() @ (Matrix.Translation(t) @ R @ Matrix.Translation(-t) @ wm); _unscale(pb); bpy.context.view_layer.update()
        pb.keyframe_insert("rotation_quaternion", frame=f)
if os.environ.get("POSEOUT"):  # path;frame;bones = save these bones' local rotations at one clip frame (e.g. a guard pose), then exit
    import json; p, fr, bl = os.environ["POSEOUT"].split(";")
    sc.frame_set(f0 + int(fr)); json.dump({b: list(tgt.pose.bones["mixamorig:" + b].rotation_quaternion) for b in bl.split(",")}, open(p, "w")); print("POSEOUT", p); sys.exit(0)
if os.environ.get("POSEIN"):  # hold the saved bones in that pose on every frame (another clip's guard over this clip's legs)
    import json
    for b, q in json.load(open(os.environ["POSEIN"])).items():
        pb = tgt.pose.bones["mixamorig:" + b]
        for f in range(f0, f1 + 1): pb.rotation_quaternion = Quaternion(q); pb.keyframe_insert("rotation_quaternion", frame=f)
if os.environ.get("DIMS"):  # body measures in world units: torso (hips->neck height), arm length, shoulder x
    B = tgt.pose.bones; W = tgt.matrix_world; sc.frame_set(f0); bpy.context.view_layer.update(); h = W @ B[hips].head
    for s in ("Left", "Right"):
        a = W @ B[f"mixamorig:{s}Arm"].head; fa = W @ B[f"mixamorig:{s}ForeArm"].head; hd = W @ B[f"mixamorig:{s}Hand"].head
        print("DIM", s, "shoulder", [round(c, 3) for c in a - h], "upper", round((fa - a).length, 3), "fore", round((hd - fa).length, 3))
    print("DIM torso", round(((W @ B["mixamorig:Neck"].head) - h).z, 3), "facing", [round(c, 3) for c in (W.to_3x3() @ Vector((0, -1, 0)))])
if os.environ.get("ARMLEN"):  # k: stretch both arms' upper and forearm bones k x along their length (short-armed Tripo bodies can't hold a two-hand weapon clear of the torso); the hand keeps its size
    for s in ("Left", "Right"):
        for n in ("Arm", "ForeArm"): pb = tgt.pose.bones[f"mixamorig:{s}{n}"]; pb.scale = (1, float(os.environ["ARMLEN"]), 1); pb.bone.inherit_scale = "NONE" if n == "ForeArm" else pb.bone.inherit_scale
        tgt.pose.bones[f"mixamorig:{s}Hand"].bone.inherit_scale = "NONE"
    bpy.context.view_layer.update()
if os.environ.get("HANDIK"):  # Side:fwd,up,out;... hand targets from the hips in torso units (copied from a reference drawing), elbows toward POLE
    B = tgt.pose.bones; W = tgt.matrix_world; sc.frame_set(f0); bpy.context.view_layer.update()
    T = ((W @ B["mixamorig:Neck"].head) - (W @ B[hips].head)).z
    pole = dict(x.split(":") for x in os.environ.get("POLE", "").split(";") if x)
    cons = []
    for spec in os.environ["HANDIK"].split(";"):  # same start pose every frame (frame 0), so the IK solve can't flip between solutions
        for n in (f"mixamorig:{spec.split(':')[0]}{k}" for k in ("Shoulder", "Arm", "ForeArm")):
            sc.frame_set(f0); q0 = B[n].rotation_quaternion.copy()
            for f in range(f0, f1 + 1): B[n].rotation_quaternion = q0; B[n].keyframe_insert("rotation_quaternion", frame=f)
    for spec in os.environ["HANDIK"].split(";"):
        s, v = spec.split(":"); fw, up, ou = [float(c) * T for c in v.split(",")]; sx = -1 if s == "Right" else 1  # Tripo rig: character's left is +X, faces -Y
        tg = bpy.data.objects.new("ik_" + s, None); sc.collection.objects.link(tg)
        pp = [float(c) * T for c in pole.get(s, "0,0,1").split(",")]
        po = bpy.data.objects.new("pole_" + s, None); sc.collection.objects.link(po)
        for f in range(f0, f1 + 1):
            sc.frame_set(f); bpy.context.view_layer.update(); h = W @ B[hips].head
            tg.location = h + Vector((sx * ou, -fw, up))
            if os.environ.get("SPEARIK") and s == "Left":  # len,elev,yaw: left fist rides the haft, which leaves the right fist (clip arm) aimed forward, elev up, yaw toward +X
                ln, el, yw = [float(c) for c in os.environ["SPEARIK"].split(",")]; el, yw = math.radians(el), math.radians(yw)
                tg.location = bpy.data.objects["grip_r"].matrix_world.translation + ln * Vector((math.cos(el) * math.sin(yw), -math.cos(el) * math.cos(yw), math.sin(el)))
            tg.keyframe_insert("location", frame=f)
            po.location = h + Vector((sx * pp[2], -pp[0], pp[1])); po.keyframe_insert("location", frame=f)
        c = B[f"mixamorig:{s}ForeArm"].constraints.new("IK"); c.target = tg; c.pole_target = po; c.pole_angle = math.radians(float(os.environ.get("POLEANG", "-90"))); c.chain_count = 2
        cons.append((s, c))
    bk = {}
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        bk[f] = {n: B[n].matrix.copy() for s, _ in cons for n in (f"mixamorig:{s}Arm", f"mixamorig:{s}ForeArm")}
    for s, c in cons: B[f"mixamorig:{s}ForeArm"].constraints.remove(c)
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        for n, m in bk[f].items(): bpy.context.view_layer.update(); B[n].matrix = m; bpy.context.view_layer.update(); B[n].keyframe_insert("rotation_quaternion", frame=f)
if os.environ.get("ALIGN"):  # two-hand weapon: each frame, turn each hand so its fist hole (rest world dir) lies along the haft (grip_r -> grip_l)
    al = [(tgt.pose.bones["mixamorig:" + s + "Hand"], Vector([float(v) for v in d.split(",")])) for s, d in (x.split(":") for x in os.environ["ALIGN"].split(";"))]
    al = [(pb, ((tgt.matrix_world @ pb.bone.matrix_local).to_3x3().inverted() @ d).normalized()) for pb, d in al]
    gr = bpy.data.objects["grip_r"]; gl = bpy.data.objects["grip_l"]
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        for it in range(int(os.environ.get("ALIGNIT", "3"))):  # grips ride on the hands, so settle by iterating
            for pb, hole in al:
                bpy.context.view_layer.update()
                h = ((tgt.matrix_world @ pb.matrix).to_3x3().inverted() @ (gl.matrix_world.translation - gr.matrix_world.translation)).normalized()
                if os.environ.get("ALIGNSIGN"):  # haft runs grip_r -> grip_l on every frame: pick the hole's sign once, so the hand can't flip mid-clip
                    sg = globals().setdefault("_sg", {}); sg.setdefault(pb.name, 1 if h.dot(hole) >= 0 else -1); h = h * sg[pb.name]
                elif h.dot(hole) < 0: h = -h
                pb.rotation_quaternion = pb.rotation_quaternion @ hole.rotation_difference(h)
        for pb, _ in al: pb.keyframe_insert("rotation_quaternion", frame=f)
        if os.environ.get("HAFT") and (f - f0) % int(os.environ["HAFT"]) == 0:  # haft elevation (deg above level) and yaw off straight-ahead (-Y), grip_r -> grip_l
            bpy.context.view_layer.update(); d = gl.matrix_world.translation - gr.matrix_world.translation
            print("HAFT", f - f0, "elev", round(math.degrees(math.atan2(d.z, d.xy.length)), 1), "yaw", round(math.degrees(math.atan2(d.x, -d.y)), 1), "sep", round(d.length, 3))
if os.environ.get("WPNROT"):  # fwd,gf[,out]: one-hand weapon parented to the hand: at frame 0 stand it up, tip tilted fwd deg forward and out deg away from the body (character's right), about the fist, then slide so the fist sits at GF of its length from the butt
    sc.frame_set(f0); bpy.context.view_layer.update(); wp = next(o for o in bpy.data.objects if o.name.startswith("wpn_"))
    dg, gf, ot = ([float(c) for c in os.environ["WPNROT"].split(",")] + [0])[:3]
    hd = tgt.matrix_world @ tgt.pose.bones["mixamorig:RightHand"].head
    a0 = (wp.matrix_world.to_3x3() @ Vector((0, 1, 0))).normalized()  # deg = tip tilt forward from vertical
    q = a0.rotation_difference(Vector((-math.sin(math.radians(ot)), -math.sin(math.radians(dg)), math.cos(math.radians(dg)))).normalized())
    R = Matrix.Translation(hd) @ q.to_matrix().to_4x4() @ Matrix.Translation(-hd)
    wp.matrix_world = R @ wp.matrix_world; bpy.context.view_layer.update()
    V = [wp.matrix_world @ v.co for v in wp.data.vertices]; ax = (wp.matrix_world.to_3x3() @ Vector((0, 1, 0))).normalized()
    t = [v.dot(ax) for v in V]; L = max(t) - min(t); sh = (min(t) + gf * L) - hd.dot(ax)
    wp.matrix_world = Matrix.Translation(-sh * ax) @ wp.matrix_world; bpy.context.view_layer.update()
    print("WPN up", round(math.degrees(math.asin(max(-1, min(1, ax.z)))), 1), "L", round(L, 3))
def _fcs(act):  # fcurves of an action, legacy or layered (Blender 4.4+ slots/channelbags)
    if hasattr(act, "fcurves") and len(act.fcurves): return list(act.fcurves)
    return [fc for ly in getattr(act, "layers", []) for st in ly.strips for cb in st.channelbags for fc in cb.fcurves]
def NOCK():  # TB-203 NOCKFING=1: the nock sits between the index and middle fingertips (three-finger hook), else 40% past the hand bone
    pbs = tgt.pose.bones
    if os.environ.get("NOCKFING") and "mixamorig:RightHandIndex3" in pbs:
        return tgt.matrix_world @ ((pbs["mixamorig:RightHandIndex3"].head + pbs["mixamorig:RightHandMiddle3"].head) / 2) + Vector(map(float, os.environ.get("NOCKOFF", "0,0,0").split(",")))
    r_ = pbs["mixamorig:RightHand"]; return tgt.matrix_world @ (r_.tail + (r_.tail - r_.head) * 0.4)
if os.environ.get("BOWALIGN"):  # each frame turn the bow hand so the bow stands upright in the shot plane (limb axis
    # perpendicular to the arrow line draw hand -> bow hand, in its vertical plane) with the back away from the draw hand.
    # BOWALIGN=n takes the arrow line from clip frame n (-1 = last, full draw) for every frame: while the draw hand reaches
    # back for the arrow there is no arrow line, so the bow keeps facing the target like a real archer's
    w = bpy.data.objects["wpn_bow"]; ax = Vector(w["bow_ax"]); bk = Vector(w["bow_back"]); pb = tgt.pose.bones["mixamorig:LeftHand"]
    P = lambda n: tgt.matrix_world @ tgt.pose.bones["mixamorig:" + n].head
    if os.environ["BOWALIGN"] == "up":  # no draw in this clip (idle): bow upright, back facing the way the elf faces (-Y, INPLACE)
        ar, u = Vector((0, -1, 0)), Vector((0, 0, 1))
    else:
        n = int(os.environ["BOWALIGN"]); sc.frame_set(f1 if n < 0 else f0 + n); bpy.context.view_layer.update()
        ar = (P("LeftHand") - P("RightHand")).normalized(); u = Vector((0, 0, 1)); u = (u - ar * u.dot(ar)).normalized()
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); M3 = w.matrix_world.to_3x3()
        d = (M3 @ ax).normalized(); b = (M3 @ bk); b = (b - d * b.dot(d)).normalized()
        ar_, u_ = ar, u
        if os.environ.get("BOWALIGNF"):  # TB-203: from frame fa blend to the live shot line (nock -> bow hand) by fb, so the bow plane holds the nock at full draw (no roll)
            fa2, fb2 = map(float, os.environ["BOWALIGNF"].split(",")); k2 = min(1.0, max(0.0, (f - f0 - fa2) / max(1e-6, fb2 - fa2)))
            if k2 > 0:
                al = (P("LeftHand") - NOCK()).normalized(); ar_ = (ar * (1 - k2) + al * k2).normalized(); u_ = Vector((0, 0, 1)); u_ = (u_ - ar_ * u_.dot(ar_)).normalized()
        R =(Matrix((u_, ar_, u_.cross(ar_))).transposed() @ Matrix((d, b, d.cross(b))).transposed().inverted()).to_4x4()
        if os.environ.get("STRYAW"):  # TB-203: turn the braced bow about its limb axis so the string passes the inside of the
            # forearm (where a real archer's arm guard sits) while no arrow is on the string; full deg up to frame fa, back to 0 by fb
            dg_, fa_, fb_ = map(float, os.environ["STRYAW"].split(",")); k_ = f - f0
            yw = dg_ if k_ <= fa_ else (0.0 if k_ >= fb_ else dg_ * (fb_ - k_) / (fb_ - fa_))
            R = Matrix.Rotation(math.radians(yw), 4, u_) @ R
        wm = tgt.matrix_world @ pb.matrix; t = wm.translation.copy()
        pb.matrix = tgt.matrix_world.inverted() @ (Matrix.Translation(t) @ R @ Matrix.Translation(-t) @ wm); _unscale(pb); bpy.context.view_layer.update()
        pb.keyframe_insert("rotation_quaternion", frame=f)
print("ANIM frames", f0, f1)
if os.environ.get("QUIVER"):  # quiver on the back (Spine2) with arrows, and a nocked arrow from the draw fingers to the bow
    # hand from frame ARROWF to the end (the clip ends at full draw; the loop back to frame 0 is the release)
    import bmesh
    def mat(n, c):
        m = bpy.data.materials.get(n) or bpy.data.materials.new(n); m.use_nodes = True
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*c, 1); m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.8; return m
    LEA, WOOD, FLE, TIP = mat("q_leather", (0.13, 0.05, 0.015)), mat("q_wood", (0.45, 0.28, 0.1)), mat("q_fletch", (0.75, 0.73, 0.6)), mat("q_tip", (0.3, 0.3, 0.32))
    def cyl(name, r, L, m, verts=10):  # along local +Z from 0 to L
        me_ = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=L)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, L / 2)); bm.to_mesh(me_); bm.free(); me_.materials.append(m)
        o = bpy.data.objects.new(name, me_); sc.collection.objects.link(o); return o
    def arrow(name, L=0.62):  # nock at origin, tip along +Z
        sh_ = cyl(name, 0.0055, L, WOOD, 6)
        for i in range(3):  # three fletch vanes near the nock
            v = cyl(f"{name}_f{i}", 0.001, 0.06, FLE, 4); v.scale = (1, 4, 1); v.parent = sh_
            v.matrix_parent_inverse = Matrix(); v.location = (0, 0, 0.02); v.rotation_euler = (0, 0, i * 2.094)
            v.location = Matrix.Rotation(i * 2.094, 3, "Z") @ Vector((0, 0.008, 0.02))
        t = cyl(f"{name}_t", 0.012, 0.035, TIP, 4); t.parent = sh_; t.location = (0, 0, L - 0.005); t.data.vertices.foreach_set("co", [c for v in t.data.vertices for c in (v.co.x * (1 - v.co.z / 0.035), v.co.y * (1 - v.co.z / 0.035), v.co.z)])
        return sh_
    sc.frame_set(f0); bpy.context.view_layer.update(); W = tgt.matrix_world; sp2 = tgt.pose.bones["mixamorig:Spine2"]
    bo = max((o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith("wpn_")), key=lambda o: len(o.data.vertices))
    ev = bo.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh(); BV = [bo.matrix_world @ v.co for v in ev.vertices]
    sx = W @ tgt.pose.bones["mixamorig:RightShoulder"].head; hp_ = W @ tgt.pose.bones["mixamorig:Hips"].head
    ax_ = (sx + Vector((0, 0, 0.12)) - Vector((-sx.x * 0.2, 0, hp_.z + 0.05))).normalized()  # mouth over the right shoulder, foot toward the left hip
    mid = (sx + Vector((-sx.x * 0.2, 0, hp_.z + 0.05))) / 2
    ub = [v.y for v in BV if abs(v.x - mid.x) < 0.06 and abs(v.z - (sx.z - 0.08)) < 0.04]; back = max(ub)  # upper back (cloak on the shoulder blades), not the flared hem
    qa = Vector(map(float, os.environ.get("QOFF", "0,0,0").split(",")))
    print("QBACK", round(back, 3)); qc = Vector((mid.x, back + 0.045 + float(os.environ.get("QCLR", "0.0")), mid.z)) + qa  # QCLR m clear of the upper-back cloak (radius 4.5 cm)
    QL = float(os.environ.get("QLEN", "0.4")); Q = cyl("prop_quiver", 0.045, QL, LEA, 14); Q.matrix_world = Matrix.Translation(qc - ax_ * QL / 2) @ Vector((0, 0, 1)).rotation_difference(ax_).to_matrix().to_4x4()
    if os.environ.get("QFLOAT"):  # magic floating quiver (director, 2026-11-01): hangs in the air where the draw hand reaches at frame
        # ARROWF, mouth pointing along the hand's exit path (frames ARROWF -> ARROWF+4), so the arrow slides out along the hand's own
        # travel and never crosses the forearm or head. QFLOAT=dx,dy,dz world offset (m) of the mouth; it bobs QBOB m, one cycle per loop.
        rh_ = tgt.pose.bones["mixamorig:RightHand"]; af_ = int(os.environ.get("ARROWF", "6"))
        def HP(f):
            sc.frame_set(f0 + f); bpy.context.view_layer.update(); return W @ (rh_.tail + (rh_.tail - rh_.head) * 0.4)
        if os.environ.get("QPOSE"):  # QPOSE=mx,my,mz,ax,ay,az: the mouth and axis measured on the approved attack, so the other clips of the unit hang the quiver in the same spot
            qp = list(map(float, os.environ["QPOSE"].split(","))); mouth, ax_, h0 = Vector(qp[:3]), Vector(qp[3:]).normalized(), Vector(qp[:3])
        else:
            h0, h4 = HP(af_), HP(af_ + 4); ax_ = (h4 - h0).normalized()
            mouth = h0 - ax_ * 0.12 + Vector(map(float, os.environ["QFLOAT"].split(",")))  # fingertips 12 cm out of the mouth when the hand closes on the nock
        Q.matrix_world = Matrix.Translation(mouth - ax_ * QL) @ Vector((0, 0, 1)).rotation_difference(ax_).to_matrix().to_4x4()
        print("QFLOAT mouth", tuple(round(v, 3) for v in mouth), "axis", tuple(round(v, 2) for v in ax_), "hand f", af_, tuple(round(v, 3) for v in h0))
    for i, (dx, dy) in enumerate(((0.012, 0.01), (-0.014, 0.004), (0.002, -0.016), (-0.006, 0.02))):
        a_ = arrow(f"prop_qa{i}", min(0.5, QL + 0.15)); a_.matrix_world = Q.matrix_world @ Matrix.Translation((dx, dy, QL + 0.16)) @ Matrix.Rotation(math.pi, 4, "X")  # tips down in the quiver, nocks out
        a_.parent = Q; a_.matrix_parent_inverse = Q.matrix_world.inverted()
    if os.environ.get("QFLOAT"):
        base_ = Q.location.copy(); brot = Q.rotation_euler.copy(); bob = float(os.environ.get("QBOB", "0.04"))
        N_ = f1 + 1 - f0; cyc = max(1, round(N_ / 40))  # magic float: ~40-frame bob cycles, whole cycles per loop so it loops seamlessly
        ph = lambda f, k=1: 2 * math.pi * k * cyc * (f - f0 - (af_ if not os.environ.get("QPOSE") else 0)) / N_  # zero offset on the frame the hand takes the arrow
        for f in range(f0, f1 + 2):  # vertical bob + small drift and a slow wobble (sway lags the bob a quarter cycle, like hanging in a current)
            Q.location = base_ + Vector((0.25 * bob * math.sin(ph(f) + math.pi / 2) - 0.25 * bob, 0, bob * math.sin(ph(f)))); Q.keyframe_insert("location", frame=f)
            Q.rotation_euler = (brot.x + math.radians(4) * math.sin(ph(f) + math.pi / 2) - math.radians(4), brot.y + math.radians(3) * math.sin(ph(f)), brot.z); Q.keyframe_insert("rotation_euler", frame=f)
    else:
        mw = Q.matrix_world.copy(); Q.parent = tgt; Q.parent_type = "BONE"; Q.parent_bone = "mixamorig:Spine2"  # bone parent = tail of the posed bone
        Q.matrix_parent_inverse = (W @ sp2.matrix @ Matrix.Translation((0, sp2.bone.length, 0))).inverted(); Q.matrix_basis = mw
    mo = lambda: Q.matrix_world @ Vector((0, 0, QL)); md = []
    for f in range(f0, f1 + 1):  # the draw hand takes the arrow where it passes closest to the quiver mouth
        sc.frame_set(f); bpy.context.view_layer.update(); md.append(((W @ tgt.pose.bones["mixamorig:RightHand"].tail) - mo()).length)
    print("QMOUTH", [round(x, 2) for x in md])
    AL = float(os.environ.get("ARROWL", "0.62")); AR = arrow("prop_arrow", AL); af = int(os.environ["ARROWF"]) if "ARROWF" in os.environ else md.index(min(md)); print("ARROWF", af); rh, lh = tgt.pose.bones["mixamorig:RightHand"], tgt.pose.bones["mixamorig:LeftHand"]
    from mathutils.bvhtree import BVHTree
    from mathutils import Quaternion
    def hits(nk, d, rest_, L=None):  # body hits along the shaft (skip the draw fingers at the nock and the bow hand at the rest)
        L = L or AL
        dg = bpy.context.evaluated_depsgraph_get(); m_ = bo.evaluated_get(dg).to_mesh()
        bv = BVHTree.FromPolygons([bo.matrix_world @ v.co for v in m_.vertices], [p.vertices[:] for p in m_.polygons]); bo.evaluated_get(dg).to_mesh_clear()
        n_, o_, t_, dbg = 0, nk + d * 0.06, 0.06, []
        while t_ < L:
            loc, _, fi, _ = bv.ray_cast(o_, d, L - t_)
            if loc is None: break
            t_ = (loc - nk).length + 0.004; o_ = nk + d * t_
            if (loc - rest_).length > 0.07:
                n_ += 1; ws = {}
                for vi in bo.data.polygons[fi].vertices:
                    for g in bo.data.vertices[vi].groups: ws[bo.vertex_groups[g.group].name] = ws.get(bo.vertex_groups[g.group].name, 0) + g.weight
                dbg.append((round(t_, 2), max(ws, key=ws.get).replace("mixamorig:", "") if ws else "-"))
        if os.environ.get("ARROWDBG") and dbg: print("   hit", dbg)
        hit_bow.append(sum(1 for _, b in dbg if b.startswith("LeftHand")))  # bow-hand contact counted apart from body hits
        return n_ - hit_bow[-1]
    hit_bow, tot, shots, shown = [], [0, 0], [], []
    # The arrow comes out of the quiver tip-last. While part of it is still inside (nock closer to the mouth than its
    # length) it runs from the fingers through the mouth down the quiver axis. Once out it trails toward the mouth and
    # turns onto the shot line (draw hand -> bow hand) as far as body clearance allows, never back (s only grows), so an
    # archer's over-the-shoulder carry, never through the head. ARROWPATH=0 shows the shot line on every frame (probe).
    s_ = 0.0; modes = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        nk = NOCK(); rest_ = W @ (lh.tail + (lh.tail - lh.head) * 0.2)
        if os.environ.get("RESTUP"):  # the shaft rides on top of the bow fist, not through the wrist: raise the rest point by RESTUP m along the vertical perpendicular to the shot line
            d0 = (rest_ - nk).normalized(); up_ = (Vector((0, 0, 1)) - d0 * d0.z).normalized(); rest_ = rest_ + up_ * float(os.environ["RESTUP"])
        d_ = (rest_ - nk)
        sh, tr = d_.normalized(), (mo() - nk).normalized(); on = (f - f0) >= af
        hs = hits(nk, sh, rest_) if on else 0; bs = hit_bow[-1] if on else 0
        if on: tot[0] += hs; tot[1] += bs; shots.append(hs)
        if os.environ.get("NOCKPROBE") and f - f0 in map(int, os.environ["NOCKPROBE"].split(",")):  # how far must the nock move to clear?
            lat = sh.cross(Vector((0, 0, 1))).normalized(); up = lat.cross(sh).normalized()
            for nm, v in (("+lat", lat), ("-lat", -lat), ("up", up), ("down", -up)):
                print("NOCKPROBE", f - f0, nm, tuple(round(c, 2) for c in v), [hits(nk + v * c / 100, (rest_ - nk - v * c / 100).normalized(), rest_) for c in (2, 4, 6, 8, 10, 12)])
            print("NOCKPROBE", f - f0, "nock", tuple(round(c, 3) for c in nk), "head", tuple(round(c, 3) for c in W @ tgt.pose.bones["mixamorig:Head"].head))
        mode, dm = "shot", (mo() - nk).length
        if os.environ.get("ARROWPATH", "1") == "1" and on and s_ < 1:
            qax = (Q.matrix_world.to_3x3() @ Vector((0, 0, 1))).normalized()
            if dm < AL: d_, mode = (mo() - qax * min(AL - dm, 0.38)) - nk, "quiver"
            else:
                qd = tr.rotation_difference(sh); best = s_
                for k in range(10, 0, -1):
                    s = k / 10
                    if s <= s_: break
                    if hits(nk, Quaternion().slerp(qd, s) @ tr, rest_) == 0: best = s; break
                s_ = best; d_ = Quaternion().slerp(qd, s_) @ tr; mode = f"turn {s_:.1f}"
        sv = hits(nk, d_.normalized(), rest_) if on else 0; shown.append(sv) if on else None
        modes.append(mode if on else "off")
        print("ARROW", f - f0, "hands", round((rest_ - nk).length, 3), "shot hits", hs, "shown hits", sv, "->", mode)
        if os.environ.get("ANCHOR"):  # same measure as the clip probe: nock vs head centre, and the shot line's miss, in hip heights and head lengths
            hd_, tp_ = W @ tgt.pose.bones["mixamorig:Head"].head, W @ tgt.pose.bones["mixamorig:HeadTop_End"].head; hc = (hd_ + tp_) / 2; hl = (tp_ - hd_).length
            sx_ = (rest_ - nk).normalized(); tt = (hc - nk).dot(sx_); ms = (hc - (nk + sx_ * tt)).length; hz_ = (W @ tgt.pose.bones["mixamorig:Hips"].bone.head_local).z
            print("ANCHOR", f - f0, "nock-headc/hz", tuple(round(v, 3) for v in (nk - hc) / hz_), "rest-headc/hz", tuple(round(v, 3) for v in (rest_ - hc) / hz_), "dir", tuple(round(v, 2) for v in sx_), "miss/hz", round(ms / hz_, 3), "miss/headlen", round(ms / hl, 2), "headlen/hz", round(hl / hz_, 3))
        AR.matrix_world = Matrix.Translation(nk) @ Vector((0, 0, 1)).rotation_difference(d_.normalized()).to_matrix().to_4x4()
        AR.keyframe_insert("location", frame=f); AR.keyframe_insert("rotation_euler", frame=f)
        for o in [AR] + list(AR.children):
            o.hide_render = (f - f0) < af; o.keyframe_insert("hide_render", frame=f)
    for o in [AR] + list(AR.children):
        for fc in (o.animation_data.action.fcurves if hasattr(o.animation_data.action, "fcurves") else []):
            for k in fc.keyframe_points: k.interpolation = "CONSTANT"
    print("ARROWSUM shot-line body hits", tot[0], "bow-hand", tot[1], "per frame from", af, shots, "| shown arrow hits", sum(shown), shown)
    if os.environ.get("STRPROBE") or os.environ.get("STRDRAW"):  # bowstring (TB-203): STRDRAW pulls the string to the nock while the
        # arrow sits on the shot line (a real draw: tips -> nock V), STRPROBE prints per frame the string's clearance from the bow arm
        wb = bpy.data.objects["wpn_bow"]; A_ = Vector(wb["bow_ax"]).normalized(); Bk = Vector(wb["bow_back"]); Bk = (Bk - A_ * Bk.dot(A_)).normalized()
        co = [v.co.copy() for v in wb.data.vertices]; sv = [i for i, c in enumerate(co) if c.dot(Bk) < float(os.environ.get("STRS", "-0.075"))]
        it, ib = max(sv, key=lambda i: co[i].dot(A_)), min(sv, key=lambda i: co[i].dot(A_)); e0, e1 = co[ib].copy(), co[it].copy(); ln = e1 - e0
        # the string proper = the thin tube along tip-to-tip (<18 mm from that line); the raw s-cut also caught grip and limb-web
        # verts, which the draw key stretched into a sheet (v2 first render)
        uf = lambda c: (c - e0).dot(ln) / ln.length_squared
        sv = [i for i, c in enumerate(co) if 0.02 < uf(c) < 0.98 and (c - (e0 + ln * uf(c))).length < 0.018]
        U = {i: max(0.0, min(1.0, uf(co[i]))) for i in sv}; sS = e0.dot(Bk)
        print("STRING verts", len(sv), "len", round(ln.length, 3), "brace s", round(sS, 3))
        def _armclr(f, R=None):  # TB-203: min clearance (m) of the string from the bow forearm/hand at frame f (optionally bow turned by R)
            wb_ = bpy.data.objects["wpn_bow"]; sc.frame_set(f); bpy.context.view_layer.update(); em_ = wb_.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
            mw_ = wb_.matrix_world if R is None else wb_.matrix_world @ R; best = 9.0
            for bn_, r_ in (("LeftForeArm", 0.035), ("LeftHand", 0.03)):
                pb_ = tgt.pose.bones["mixamorig:" + bn_]; A0, A1 = W @ pb_.head, W @ pb_.tail; d_ = A1 - A0
                for i in sv:
                    P_ = mw_ @ em_.vertices[i].co; t_ = max(0.0, min(1.0, (P_ - A0).dot(d_) / d_.length_squared)); best = min(best, (P_ - (A0 + d_ * t_)).length - r_)
            return best
        def _turnraw(f, need, ax3):
            if _armclr(f) >= need: return 0.0
            for k in range(1, 19):
                for sg in (1, -1):
                    if _armclr(f, Matrix.Rotation(math.radians(sg * k * 5), 4, ax3)) >= need: return sg * k * 5
            return 90.0
        def _turnkey(wb_, B0, ax3, f, a_):
            wb_.matrix_basis = B0 @ Matrix.Rotation(math.radians(a_), 4, ax3); wb_.keyframe_insert("rotation_quaternion" if wb_.rotation_mode == "QUATERNION" else "rotation_euler", frame=f)
        if os.environ.get("STRTURN"):  # TB-203: turn the bow about its limb axis where the braced string would cut the bow forearm, by the
            # smallest angle giving STRTURN m clearance, eased STRTURNSTEP deg/frame; keyed BEFORE the draw keys so the pulled string follows
            wb_ = bpy.data.objects["wpn_bow"]; need_ = float(os.environ["STRTURN"]); B0_ = wb_.matrix_basis.copy(); ax3_ = Vector(wb_["bow_ax"]).normalized()
            st_ = float(os.environ.get("STRTURNSTEP", "15")); TS_ = float(os.environ.get("STRTURNTAIL", "45"))
            sm_ = [_turnraw(f, need_, ax3_) for f in range(f0, f1 + 1)] + [TS_] * 3
            for i in range(1, len(sm_)): sm_[i] = max(sm_[i], sm_[i - 1] - st_)
            for i in range(len(sm_) - 2, -1, -1): sm_[i] = max(sm_[i], sm_[i + 1] - st_)
            sm_ = sm_[:f1 - f0 + 1]
            for j, a_ in enumerate(sm_): _turnkey(wb_, B0_, ax3_, f0 + j, a_)
            print("STRTURN deg", [round(x) for x in sm_])
        if os.environ.get("STRDRAW"):
            if not wb.data.shape_keys: wb.shape_key_add(name="Basis")
            for f in range(f0, f1 + 1):
                if modes[f - f0] not in ("shot", "turn 1.0"): continue
                sc.frame_set(f); bpy.context.view_layer.update()
                nl = wb.matrix_world.inverted() @ NOCK()
                if nl.dot(Bk) >= sS: continue  # nock not behind the braced string: nothing to pull
                if os.environ.get("STRNEAR"):  # TB-203: no pull until the nock nears the face; ramps in between r0 and r1 m from the head
                    r0_, r1_ = map(float, os.environ["STRNEAR"].split(",")); dh_ = (NOCK() - W @ tgt.pose.bones["mixamorig:Head"].head).length
                    wn_ = max(0.0, min(1.0, (r1_ - dh_) / (r1_ - r0_)))
                    if wn_ <= 0: continue
                    nl = nl + Bk * (sS - nl.dot(Bk)) * (1 - wn_)
                um = max(0.05, min(0.95, (nl - e0).dot(ln) / ln.length_squared)); k_ = wb.shape_key_add(name=f"draw{f}", from_mix=False)
                # LIMBBEND (TB-203): both limbs flex toward the string by LIMBBEND x draw depth at the tips (symmetric about the grip,
                # quadratic from the riser out), and the string ends ride the bent tips, so the bow stays one plane and one arc
                tb_ = float(os.environ.get("LIMBBEND", "0")) * (sS - nl.dot(Bk)); svs_ = set(sv)
                ta_ = [c.dot(A_) for c in co]; a0_, a1_ = min(ta_), max(ta_)
                wf = lambda c: max(0.0, (abs((c.dot(A_) - a0_) / (a1_ - a0_) - 0.5) - 0.12) / 0.38) ** 2
                for i, c in enumerate(co):
                    if i not in svs_ and tb_: k_.data[i].co = c - Bk * tb_ * wf(c)
                E0, E1 = e0 - Bk * tb_ * wf(e0), e1 - Bk * tb_ * wf(e1)
                for i in sv:
                    u = U[i]; S_ = e0 + ln * u; V_ = E0 + (nl - E0) * (u / um) if u <= um else nl + (E1 - nl) * ((u - um) / (1 - um))
                    k_.data[i].co = co[i] - S_ + V_
                for g in range(f0, f1 + 2):
                    k_.value = 1.0 if g == f else 0.0; k_.keyframe_insert("value", frame=g)
            if wb.data.shape_keys.animation_data:
                for fc in _fcs(wb.data.shape_keys.animation_data.action):
                    for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
            print("STRKEYS", [k.name for k in wb.data.shape_keys.key_blocks][1:])
            print("STRDRAW frames", [f - f0 for f in range(f0, f1 + 1) if modes[f - f0] in ("shot", "turn 1.0")])
        if os.environ.get("STRPROBE"):
            own = []
            for p_ in bo.data.polygons:
                ws = {}
                for vi in p_.vertices:
                    for g in bo.data.vertices[vi].groups: n_ = bo.vertex_groups[g.group].name; ws[n_] = ws.get(n_, 0) + g.weight
                own.append(max(ws, key=ws.get).replace("mixamorig:", "") if ws else "-")
            ARMB = ("LeftForeArm", "LeftHand", "LeftArm"); res = []
            aidx = [i for i, o_ in enumerate(own) if o_.startswith(ARMB) and not any(k in o_ for k in ("Thumb", "Index", "Middle", "Ring", "Pinky"))]
            for f in range(f0, f1 + 1):
                sc.frame_set(f); bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
                m_ = bo.evaluated_get(dg).to_mesh(); P_ = [bo.matrix_world @ v.co for v in m_.vertices]
                ps = [m_.polygons[i].vertices[:] for i in aidx]
                bv = BVHTree.FromPolygons(P_, ps); bo.evaluated_get(dg).to_mesh_clear()
                wm_ = wb.evaluated_get(dg).to_mesh(); SW = [wb.matrix_world @ wm_.vertices[i].co for i in sv[::3]]; wb.evaluated_get(dg).to_mesh_clear()
                best = (9, "-")
                for p in SW:
                    loc, nrm, fi, dd = bv.find_nearest(p)
                    if loc is None: continue
                    sd = -dd if (dd < 0.05 and (p - loc).dot(nrm) < 0) else dd
                    if sd < best[0]: best = (sd, own[aidx[fi]])
                fa = tgt.pose.bones["mixamorig:LeftForeArm"]; a0, a1 = W @ fa.head, W @ fa.tail
                from mathutils.geometry import intersect_point_line
                cl = min(((p - intersect_point_line(p, a0, a1)[0]).length if 0 <= intersect_point_line(p, a0, a1)[1] <= 1 else min((p - a0).length, (p - a1).length)) for p in SW)
                res.append(round(best[0] * 100, 1)); print("STR", f - f0, "surf_cm", round(best[0] * 100, 1), best[1], "bone_cm", round(cl * 100, 1), modes[f - f0])
            print("STRSUM min surf cm", min(res), "frames inside", [i for i, r in enumerate(res) if r < 0])
    if os.environ.get("TBPY"): exec(open(os.environ["TBPY"], encoding="utf-8").read())  # TB-203 probes (file path)
    if os.environ.get("ARROWONLY"): sys.exit(0)  # probe only, no render
if os.environ.get("LHPROBE"):  # two-hand weapon: OFFS (local Euler XYZ, deg) that lays the left fist hole (env LHDIR, rest world) along the haft
    pb = tgt.pose.bones["mixamorig:" + os.environ.get("PSIDE", "Left") + "Hand"]; gr = bpy.data.objects["grip_r"]; gl = bpy.data.objects["grip_l"]
    hole = ((tgt.matrix_world @ pb.bone.matrix_local).to_3x3().inverted() @ Vector([float(v) for v in os.environ["LHPROBE"].split(",")])).normalized()
    acc = Vector()
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        h = ((tgt.matrix_world @ pb.matrix).to_3x3().inverted() @ (gl.matrix_world.translation - gr.matrix_world.translation)).normalized()
        if h.dot(hole) < 0: h = -h
        acc += h
        if (f - f0) % 10 == 0: print("LH", pb.name, f - f0, "angle", round(math.degrees(hole.angle(h)), 1))
    q = hole.rotation_difference(acc.normalized()); print("LHOFFS", ",".join(str(round(math.degrees(a), 1)) for a in q.to_euler("XYZ")))
_solid_faces = None
if os.environ.get("SOLID"):  # SOLID=x0,x1,y0,y1,z0,z1 (world, bind pose): the prop volume = every face of the target mesh whose verts all lie in the box; probed per frame on the evaluated mesh
    from mathutils.bvhtree import BVHTree
    _sb = [float(v) for v in os.environ["SOLID"].split(",")]; _sme = next(o for o in bpy.data.objects if o.type == "MESH" and o.find_armature() == tgt)
    _sin = [all(_sb[2 * i] <= c[i] <= _sb[2 * i + 1] for i in range(3)) for c in (_sme.matrix_world @ v.co for v in _sme.data.vertices)]
    _solid_faces = [list(pg.vertices) for pg in _sme.data.polygons if all(_sin[i] for i in pg.vertices)]
    print("SOLID faces", len(_solid_faces))
    def _solid_bvh():
        ev = _sme.evaluated_get(bpy.context.evaluated_depsgraph_get()); W = _sme.matrix_world
        return BVHTree.FromPolygons([W @ v.co for v in ev.data.vertices], _solid_faces, all_triangles=False)
    def _sd(bvh, p):
        loc, nrm, idx, dist = bvh.find_nearest(p)
        return dist if (p - loc).dot(nrm) >= 0 else -dist
for spec in filter(None, os.environ.get("MPROBE", "").split(";")):  # Side:x,y,z = a point welded to the hand (hand-bone local, armature units): its world position per frame
    s, e = spec.split(":"); loc = Vector([float(v) for v in e.split(",")]); pb = tgt.pose.bones[f"mixamorig:{s}Hand"]
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); M = tgt.matrix_world @ pb.matrix
        hp = M.translation + M.to_3x3().normalized() @ (loc * tgt.matrix_world.to_scale().x)
        print("MP", s, f - f0, *[round(c, 3) for c in hp], "| hand", *[round(c, 3) for c in (tgt.matrix_world @ pb.head)])
        if _solid_faces is not None:  # SOLID: signed distance (m, + outside) of the head, the hand and the hand->head / forearm segments to the prop volume
            bvh = _solid_bvh(); hb = tgt.matrix_world @ pb.head; fb = tgt.matrix_world @ tgt.pose.bones[f"mixamorig:{s}ForeArm"].head
            seg = min(_sd(bvh, hb.lerp(hp, k / 6)) for k in range(7)); fore = min(_sd(bvh, fb.lerp(hb, k / 4)) for k in range(5))
            print("SD", s, f - f0, round(_sd(bvh, hp), 3), round(_sd(bvh, hb), 3), round(seg, 3), round(fore, 3))
if os.environ.get("DBGV"):  # DBGV=group,group: per frame, the evaluated-mesh world bbox of the verts each group dominates (checks the deform against the bone probes)
    _me = next(o for o in bpy.data.objects if o.type == "MESH" and o.find_armature() == tgt); _gi = {g.index: g.name for g in _me.vertex_groups}
    _dom = lambda v: _gi[max(v.groups, key=lambda w: w.weight).group] if v.groups else None
    _sel = {g: [v.index for v in _me.data.vertices if _dom(v) == g] for g in os.environ["DBGV"].split(",")}
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); ev = _me.evaluated_get(bpy.context.evaluated_depsgraph_get()); W = _me.matrix_world
        for g, ids in _sel.items():
            P = [W @ ev.data.vertices[i].co for i in ids]
            print("DBGV", g, f - f0, len(P), *[round(fn(c[i] for c in P), 3) for i in range(3) for fn in (min, max)])
if os.environ.get("DBGN"):  # DBGN=group;x0,x1,y0,y1,z0,z1;zt = a prop's posed axis per frame: group verts whose BIND world pos lies in the box, axis = (centroid of those above bind z zt) - (centroid of all), world, normalised; a drum skin-up check (+Z = up, -Y = forward)
    _me = next(o for o in bpy.data.objects if o.type == "MESH" and o.find_armature() == tgt); _gi = {g.index: g.name for g in _me.vertex_groups}
    _dom = lambda v: _gi[max(v.groups, key=lambda w: w.weight).group] if v.groups else None
    _g, _bx, _zt = os.environ["DBGN"].split(";"); _b = [float(x) for x in _bx.split(",")]; _zt = float(_zt); W = _me.matrix_world
    _ids = [v.index for v in _me.data.vertices if _dom(v) == _g and _b[0] <= (W @ v.co).x <= _b[1] and _b[2] <= (W @ v.co).y <= _b[3] and _b[4] <= (W @ v.co).z <= _b[5]]
    _top = [i for i in _ids if (W @ _me.data.vertices[i].co).z >= _zt]; print("DBGN sel", len(_ids), "top", len(_top))
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); ev = _me.evaluated_get(bpy.context.evaluated_depsgraph_get())
        c = sum((W @ ev.data.vertices[i].co for i in _ids), Vector()) / len(_ids); t = sum((W @ ev.data.vertices[i].co for i in _top), Vector()) / len(_top); ax = (t - c).normalized()
        print("DBGN", f - f0, "c", *[round(x, 3) for x in c], "axis", *[round(x, 3) for x in ax], "tilt_fwd_deg", round(math.degrees(math.atan2(-ax.y, ax.z)), 1), "tilt_side_deg", round(math.degrees(math.atan2(ax.x, ax.z)), 1))
if os.environ.get("HPROBE"):  # both hands relative to the hips, per frame
    hp = tgt.pose.bones["mixamorig:Hips"]
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); h = tgt.matrix_world @ hp.head
        l = tgt.matrix_world @ tgt.pose.bones["mixamorig:LeftHand"].head - h; r = tgt.matrix_world @ tgt.pose.bones["mixamorig:RightHand"].head - h
        lf = tgt.matrix_world @ tgt.pose.bones["mixamorig:LeftFoot"].head - h
        print("HP", f - f0, *[round(c, 3) for c in l], "|", *[round(c, 3) for c in r], "|", round(lf.y, 3))
if os.environ.get("BOWPROBE"):  # per frame: CANT = bow limb axis out of the vertical plane through the arrow line
    # (draw hand -> bow hand), 0 = upright like a real archer at any aim height; STR = string toward the draw hand (+1)
    w = bpy.data.objects["wpn_bow"]; ax = Vector(w["bow_ax"]); bk = Vector(w["bow_back"]); cant = []; st = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); M3 = w.matrix_world.to_3x3()
        d = (M3 @ ax).normalized(); P = lambda n: tgt.matrix_world @ tgt.pose.bones["mixamorig:" + n].head
        ar = (P("LeftHand") - P("RightHand")).normalized(); sd = ar.cross(Vector((0, 0, 1))).normalized()
        cant.append(round(math.degrees(math.asin(min(1, abs(d.dot(sd))))))); st.append(1 if (M3 @ bk).dot(ar) > 0 else -1)
    print("CANT", cant); print("STR", st)
if os.environ.get("AIM"):  # fixed grip: at frame AIMF the haft (wpn local Z) points along world AIM, blade side (local X) toward world EDGE
    from mathutils import Vector
    w = bpy.data.objects["wpn_axe"]; sc.frame_set(f0 + int(os.environ.get("AIMF", "0"))); bpy.context.view_layer.update()
    mw = w.matrix_world.copy(); loc, rot, scl = mw.decompose()
    gp = mw @ Vector((0, 0, float(os.environ.get("GRIPZ", "0"))))  # grip point stays in the fist
    z = Vector([float(v) for v in os.environ["AIM"].split(",")]).normalized()
    if os.environ.get("GRIPAX"):  # haft through the fist: along index1 -> pinky1 knuckle line, sign GRIPAX
        pb_ = tgt.pose.bones; ki = tgt.matrix_world @ pb_["mixamorig:RightHandIndex1"].head; kp = tgt.matrix_world @ pb_["mixamorig:RightHandPinky1"].head
        z = (kp - ki).normalized() * float(os.environ["GRIPAX"]); print("GRIPAX", tuple(round(c, 2) for c in z))
    if os.environ.get("PROBE"):
        hp = tgt.pose.bones["mixamorig:Hips"]; lh = tgt.pose.bones["mixamorig:LeftHand"]
        for f in range(f0, f1 + 1):
            sc.frame_set(f); bpy.context.view_layer.update(); d = tgt.matrix_world @ lh.head - tgt.matrix_world @ hp.head
            r = tgt.matrix_world @ tgt.pose.bones["mixamorig:RightHand"].head - tgt.matrix_world @ hp.head
            print("LH", f - f0, round(d.x, 3), round(d.y, 3), round(d.z, 3), "RH", round(r.x, 3), round(r.y, 3), round(r.z, 3))
        sc.frame_set(f0 + int(os.environ.get("AIMF", "0"))); bpy.context.view_layer.update()
    x = Vector([float(v) for v in os.environ.get("EDGE", "0,0,-1").split(",")]); x = (x - z * x.dot(z)).normalized(); y = z.cross(x)
    R = Matrix((x, y, z)).transposed().to_4x4(); S = Matrix.Diagonal(scl.to_4d())
    nm = R @ S; nm.translation = gp - (R @ S).to_3x3() @ Vector((0, 0, float(os.environ.get("GRIPZ", "0"))))
    w.matrix_world = nm; bpy.context.view_layer.update(); print("AIM set")
if os.environ.get("STRETCH"):  # ratio: per frame, body edges stretched past ratio x their bind length (cloth dragged by a
    # wrongly skinned bone); STRDBG=<frame> prints bind position + top groups of those verts. Then exit
    import collections
    bo = max((o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith("wpn_")), key=lambda o: len(o.data.vertices))
    rt = float(os.environ["STRETCH"]); ed = [e.vertices[:] for e in bo.data.edges]; V0 = [v.co.copy() for v in bo.data.vertices]
    L0 = [(V0[a_] - V0[b_]).length for a_, b_ in ed]; gi = {g.index: g.name for g in bo.vertex_groups}; out = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get(); me = bo.evaluated_get(dg).to_mesh(); V = [v.co.copy() for v in me.vertices]
        bad = [i for i, (a_, b_) in enumerate(ed) if L0[i] > 1e-5 and (V[a_] - V[b_]).length > rt * L0[i]]; out.append(len(bad))
        if os.environ.get("STRDBG") and f - f0 == int(os.environ["STRDBG"]):
            vs = {v for i in bad for v in ed[i]}; c = collections.Counter()
            for v in vs:
                g = sorted(bo.data.vertices[v].groups, key=lambda g: -g.weight)[:2]
                c[(tuple(round(x, 2) for x in bo.matrix_world @ V0[v]), tuple((gi[x.group][10:], round(x.weight, 1)) for x in g))] += 1
            for k in list(c)[:60]: print("STRV", *k)
        bo.evaluated_get(dg).to_mesh_clear()
    if os.environ.get("STROUT"):  # every edge that ever stretched past ratio, as vertex pairs (cut_stretch.py deletes their faces)
        import json; allbad = set(); Lf = None  # measured against the clip's first frame, so seams already open at rest stay
        for f in range(f0, f1 + 1):
            sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get(); me = bo.evaluated_get(dg).to_mesh()
            Lc = [(me.vertices[a_].co - me.vertices[b_].co).length for a_, b_ in ed]; Lf = Lf or Lc
            allbad |= {ed[i] for i in range(len(ed)) if Lf[i] > 1e-5 and Lc[i] > rt * Lf[i]}
            bo.evaluated_get(dg).to_mesh_clear()
        json.dump(sorted(allbad), open(os.environ["STROUT"], "w")); print("STROUT", len(allbad), "edges")
    print("STRETCH", out); sys.exit(0)
if os.environ.get("CLIP"):  # per-frame axe/body triangle overlaps, then exit
    from mathutils.bvhtree import BVHTree
    def bvh(o):
        dg = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(dg); m = e.to_mesh()
        vs = [e.matrix_world @ v.co for v in m.vertices]; ps = [p.vertices[:] for p in m.polygons]
        cs = [sum((vs[i] for i in p), vs[0] * 0) / len(p) for p in ps]
        t = BVHTree.FromPolygons(vs, ps); e.to_mesh_clear(); return t, cs
    GS = os.environ.get("GRIPSIDE", "Right")  # the hand that holds the weapon (Left for the bow)
    hb = tgt.pose.bones["mixamorig:" + GS + "Hand"]; HR = float(os.environ.get("HANDR", "0.12"))
    G2 = bool(os.environ.get("GRIP2"))  # two-hand weapon: the left fist is a grip too, same exemption as the right
    grip = {}  # faces skinned mostly to the right hand/fingers: haft contact there is the grip, not clipping
    def gripset(b):
        if b.name not in grip:
            s = set()
            for p in b.data.polygons:
                tot = 0.0; hand = 0.0
                for vi in p.vertices:
                    for g in b.data.vertices[vi].groups:
                        gn = b.vertex_groups[g.group].name
                        tot += g.weight; hand += g.weight if GS + "Hand" in gn or (G2 and "LeftHand" in gn) else 0
                if tot and hand / tot > 0.5: s.add(p.index)
            grip[b.name] = s
        return grip[b.name]
    def hits(w, b):
        (tw, _), (tb, cb) = bvh(w), bvh(b); hp = tgt.matrix_world @ hb.head; gs = gripset(b) if not os.environ.get("CLIPW") else set()
        lp = tgt.matrix_world @ tgt.pose.bones["mixamorig:LeftHand"].head
        return sum(1 for i, j in tw.overlap(tb) if (cb[j] - hp).length > HR and j not in gs and not (G2 and (cb[j] - lp).length <= HR))
    wp = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith(os.environ.get("CLIPW", "wpn_"))]
    if os.environ.get("CLIPW"): hb = tgt.pose.bones["mixamorig:Spine2"]
    bd = [o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith(("wpn_", "prop_", "body_plug"))]  # the plug is an open inner patch: inside/outside tests on it are meaningless
    bad = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f); n = sum(hits(w, b) for w in wp for b in bd)
        if n: bad.append((f - f0, n))
        if n and os.environ.get("CLIPDBG") and f - f0 in (0, int(os.environ["CLIPDBG"])):  # which bone owns the hit faces
            from collections import Counter; cnt = Counter()
            for w in wp:
                for b in bd:
                    (tw, _), (tb, cb) = bvh(w), bvh(b); hp = tgt.matrix_world @ hb.head; mp = b.data.polygons
                    lp = tgt.matrix_world @ tgt.pose.bones["mixamorig:LeftHand"].head; gs0 = gripset(b) if not os.environ.get("CLIPW") else set()
                    for i, j in tw.overlap(tb):
                        if (cb[j] - hp).length <= HR or j in gs0 or (G2 and (cb[j] - lp).length <= HR): continue  # same exemptions as hits()
                        gs = Counter()
                        for vi in mp[j].vertices:
                            for g in b.data.vertices[vi].groups: gs[b.vertex_groups[g.group].name] += g.weight
                        cnt[w.name + ">" + (gs.most_common(1)[0][0] if gs else b.name)] += 1
            print("CLIPDBG", f - f0, cnt.most_common(6))
    print("CLIP", len(bad), bad)
    # fist inside the body (FIST=Left default; Right = the bow draw hand vs the head): hand/knuckle points tested against
    # body faces not skinned to that arm
    FS = os.environ.get("FIST", "Left"); arm = (FS + "Arm", FS + "ForeArm", FS + "Hand")
    pts = [n for n in (f"mixamorig:{FS}Hand", f"mixamorig:{FS}HandMiddle1", f"mixamorig:{FS}HandIndex1", f"mixamorig:{FS}HandPinky1") if n in tgt.pose.bones]
    lbad = []; lsurf = []  # lsurf: flagged by the nearest-face normal only (open shell), not inside any closed volume
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); worst = 0
        for b in bd:
            gi = {g.index for g in b.vertex_groups if any(a in g.name for a in arm)}
            own = {v.index for v in b.data.vertices if any(g.group in gi and g.weight > 0.3 for g in v.groups)}
            dg = bpy.context.evaluated_depsgraph_get(); e = b.evaluated_get(dg); m = e.to_mesh()
            vs = [e.matrix_world @ v.co for v in m.vertices]; ps = [p.vertices[:] for p in m.polygons if not own.intersection(p.vertices)]
            t = BVHTree.FromPolygons(vs, ps); e.to_mesh_clear()
            for pn in pts:
                p = tgt.matrix_world @ tgt.pose.bones[pn].head; loc, nrm, _, d = t.find_nearest(p)
                if loc is not None and (p - loc).dot(nrm) < 0:
                    # confirm by ray parity (+Z and -Y): an open garment shell (fur mantle, cape) has inward faces that flag a fist
                    # hanging in free air in front of it; a real hit sits inside a closed volume on both rays
                    ins = 0
                    for dr in (Vector((0, 0, 1)), Vector((0, -1, 0))):
                        q = p.copy(); n = 0
                        while True:
                            hl, hn, _, hd = t.ray_cast(q, dr)
                            if hl is None: break
                            n += 1; q = hl + dr * 1e-4
                        ins += n % 2
                    if ins == 2: worst = max(worst, round(d * 100, 1))
                    elif not lsurf or lsurf[-1][0] != f - f0: lsurf.append((f - f0, round(d * 100, 1)))
        if worst: lbad.append((f - f0, worst))
    print("LFIST", len(lbad), lbad); print("LFISTSURF", len(lsurf), lsurf[:12]); sys.exit(0)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
cam.location = (2.6, -2.6, 1.0); cam.rotation_euler = Euler((math.radians(82), 0, math.radians(45)))
sc.camera = cam; cam.data.type = "ORTHO"; cam.data.ortho_scale = float(os.environ.get("ORTHO", "1.4")); cam.location = (2.6, -2.6, 0.5 + 3.68 * math.cos(math.radians(82)))
from mathutils import Matrix as _M
_r = math.radians(float(os.environ.get("CAMROT", "0"))); cam.location = _M.Rotation(_r, 3, "Z") @ cam.location; cam.rotation_euler.z += _r
if os.environ.get("GAMECAM"):  # the field view (ART-STYLE asset pipeline): side-on from the character's right, facing screen-right, tilted GAMECAM deg top-down
    _t = math.radians(float(os.environ["GAMECAM"])); cam.location = (-3.7 * math.cos(_t), 0, 0.5 + 3.7 * math.sin(_t)); cam.rotation_euler = Euler((math.pi / 2 - _t, 0, -math.pi / 2))
    cam.location = _M.Rotation(_r, 3, "Z") @ cam.location; cam.rotation_euler.z += _r  # CAMROT turns the field view too: GAMECAM + CAMROT=90 = from the front, -90 = from behind (crosswise-weapon check)
sc.render.engine = "BLENDER_EEVEE"
sc.render.film_transparent = True
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.6, 0.65, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3.5; sun.data.color = (1, 0.93, 0.8); sun.rotation_euler = Euler((math.radians(40), 0, math.radians(20)))
rim = bpy.data.objects.new("rim", bpy.data.lights.new("rim", "SUN")); sc.collection.objects.link(rim); rim.data.energy = 1.5; rim.data.color = (0.8, 0.85, 1); rim.rotation_euler = Euler((math.radians(-60), 0, math.radians(200)))
sc.view_settings.view_transform = "Standard"
sc.eevee.taa_render_samples = 32
if os.environ.get("STABLESH"):  # TB-203: leg shading flickered frame to frame (virtual shadow map LOD/jitter): pin shadow resolution, no jitter, more samples
    for L_ in (sun, rim):
        for k_, v_ in (("shadow_maximum_resolution", 0.002), ("use_shadow_jitter", False), ("shadow_softness_factor", 1.0), ("shadow_filter_radius", 3.0), ("shadow_resolution_limit", 0.002)):
            if hasattr(L_.data, k_): setattr(L_.data, k_, v_)
    for k_, v_ in (("taa_render_samples", 128), ("shadow_resolution_scale", 1.0), ("shadow_ray_count", 4), ("shadow_step_count", 16), ("use_shadow_jitter_viewport", False)):
        if hasattr(sc.eevee, k_): setattr(sc.eevee, k_, v_)
    for o_ in bpy.data.objects:  # the moving bow/arrow/quiver cast shifting shadows over the legs: props cast none
        if o_.name.startswith(("wpn_", "prop_")): o_.visible_shadow = False
for mt in bpy.data.materials:
    if mt.use_nodes:
        for nd in mt.node_tree.nodes:
            if nd.type == "BSDF_PRINCIPLED":
                nd.inputs["Roughness"].default_value = 1.0; nd.inputs["Metallic"].default_value = 0.0
                for k in ("Specular IOR Level", "Specular"):
                    if k in nd.inputs: nd.inputs[k].default_value = 0.0
                for l in list(nd.inputs["Roughness"].links) + list(nd.inputs["Metallic"].links): mt.node_tree.links.remove(l)
for o in bpy.data.objects:
    if o.name in os.environ.get("HIDE","").split(","): o.hide_render = True
sc.render.resolution_x = sc.render.resolution_y = int(os.environ.get("RES", "360"))
if os.environ.get("ANCHOR"):  # sprite foot anchor: the ground point under the rig origin, in image pixels from the top-left
    from bpy_extras.object_utils import world_to_camera_view as _w2c
    bpy.context.view_layer.update(); _p = _w2c(sc, cam, tgt.matrix_world @ Vector((0, 0, 0))); print("ANCHOR", round(_p.x * sc.render.resolution_x, 2), round((1 - _p.y) * sc.render.resolution_y, 2))
if os.environ.get("ANGDBG"):  # print per frame: wrist bend (forearm vs hand, deg) per side, and each listed bone's world turn since the last frame (twitch = spikes), then exit
    def _wb(a, s):
        B = a.pose.bones; W = a.matrix_world; fa = (W @ B[f"mixamorig:{s}Hand"].head) - (W @ B[f"mixamorig:{s}ForeArm"].head); h = (W @ B[f"mixamorig:{s}Hand"].tail) - (W @ B[f"mixamorig:{s}Hand"].head)
        return math.degrees(fa.angle(h)) if h.length > 1e-6 else -1
    _bl = os.environ["ANGDBG"].split(","); _prev = {}
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); row = [f"ANGDBG {f - f0}", "wristL", round(_wb(tgt, "Left"), 1), "wristR", round(_wb(tgt, "Right"), 1)]
        for b in ("Hips", "LeftToeBase", "RightToeBase"): row += [b, tuple(round(c, 3) for c in tgt.matrix_world @ tgt.pose.bones["mixamorig:" + b].head)]  # world position: loop seam = frame 0 vs last
        for b in _bl:
            q = (tgt.matrix_world @ tgt.pose.bones["mixamorig:" + b].matrix).to_quaternion()
            row += [b, round(math.degrees(_prev[b].rotation_difference(q).angle), 1) if b in _prev else 0]; _prev[b] = q
        _n, _h = (tgt.matrix_world @ tgt.pose.bones["mixamorig:" + k].head for k in ("Neck", "Hips")); _v = _n - _h
        row += ["lean", round(math.degrees(math.atan2(-_v.y, _v.z)), 1)]  # torso pitch from vertical, + = forward (rig faces -Y)
        print(*row)
    # jitter: each bone's world rotation at f vs halfway between f-1 and f+1 (looped); smooth motion ~0, a twitch is a spike
    Q = {pb.name: [] for pb in tgt.pose.bones}
    for f in range(f0, f1):
        sc.frame_set(f); bpy.context.view_layer.update()
        for pb in tgt.pose.bones: Q[pb.name].append((tgt.matrix_world @ pb.matrix).to_quaternion())
    jit = []
    for b, qs in Q.items():
        n_ = len(qs); d = [math.degrees(qs[i].rotation_difference(qs[i - 1].slerp(qs[(i + 1) % n_], 0.5)).angle) for i in range(n_)]
        d = [min(x, 360 - x) for x in d]  # q and -q are the same turn
        jit.append((round(max(d), 1), d.index(max(d)), b.replace("mixamorig:", "")))
    print("JIT", sorted(jit, reverse=True)[:10])
    sys.exit(0)
def _pose(f):
    sc.frame_set(f); bpy.context.view_layer.update()
    return {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in tgt.pose.bones}
if os.environ.get("POSEDUMP"):  # TB-203: write this clip's frame-0 pose (basis quats + locs) for another clip to blend from/to
    import json; json.dump({k: (list(q), list(l)) for k, (q, l) in _pose(f0).items()}, open(os.environ["POSEDUMP"], "w"))
TAIL = 0
if os.environ.get("IDLEPOSE"):  # TB-203: BLENDIN frames ease out of the dumped pose into the clip, TAIL extra frames ease back into it
    import json; from mathutils import Quaternion
    PI_ = {k: (Quaternion(q), Vector(l)) for k, (q, l) in json.load(open(os.environ["IDLEPOSE"])).items()}
    BI, TAIL = int(os.environ.get("BLENDIN", "5")), int(os.environ.get("TAIL", "8"))
    sm = lambda x: x * x * (3 - 2 * x)
    keys = {f: _pose(f) for f in list(range(f0, f0 + BI)) + [f1]}
    for f, w in [(f0 + i, sm((i + 1) / (BI + 1))) for i in range(BI)] + [(f1 + j, 1 - sm(j / TAIL)) for j in range(1, TAIL + 1)]:
        src_ = keys[f] if f in keys else keys[f1]
        for pb in tgt.pose.bones:
            if pb.name not in PI_: continue
            qa, la = PI_[pb.name]; qb, lb = src_[pb.name]
            if qa.dot(qb) < 0: qb = -qb
            pb.rotation_quaternion = qa.slerp(qb, w); pb.location = la.lerp(lb, w)
            pb.keyframe_insert("rotation_quaternion", frame=f); pb.keyframe_insert("location", frame=f)
    for o_ in bpy.data.objects:  # the arrow is loosed: hidden on the tail
        if o_.name == "prop_arrow" or (o_.parent and o_.parent.name == "prop_arrow"):
            for j in range(1, TAIL + 1): o_.hide_render = True; o_.keyframe_insert("hide_render", frame=f1 + j)
    print("POSEIN blend", BI, "tail", TAIL)
    wbk_ = bpy.data.objects.get("wpn_bow")  # TB-203 release: the last draw key relaxes over RELEASE tail frames instead of snapping
    if wbk_ and wbk_.data.shape_keys and f"draw{f1}" in wbk_.data.shape_keys.key_blocks:
        k_ = wbk_.data.shape_keys.key_blocks[f"draw{f1}"]; RL = int(os.environ.get("RELEASE", "2"))
        for j in range(1, RL + 1): k_.value = 1 - j / (RL + 1); k_.keyframe_insert("value", frame=f1 + j)
        k_.value = 0.0; k_.keyframe_insert("value", frame=f1 + RL + 1)
        for fc in _fcs(wbk_.data.shape_keys.animation_data.action):
            for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
    if os.environ.get("TAILDBG"):
        wb_ = bpy.data.objects.get("wpn_bow")
        for f in range(f1 - 1, f1 + 3):
            sc.frame_set(f); bpy.context.view_layer.update(); lh_ = tgt.pose.bones["mixamorig:LeftHand"]
            print("TAILDBG", f - f0, "LHq", [round(x, 3) for x in lh_.rotation_quaternion], "bowq", [round(x, 3) for x in wb_.matrix_world.to_quaternion()], "par", wb_.parent and wb_.parent.name, wb_.parent_bone, bool(wb_.animation_data), [c.type for c in wb_.constraints])
n = f1 - f0 + 1 + TAIL
if os.environ.get("ARMCLR") and bpy.data.objects.get("wpn_bow") and os.environ.get("STRDRAW"):  # TB-203: string-to-bow-forearm clearance (cm) per frame
    wb_ = bpy.data.objects["wpn_bow"]; dg_ = bpy.context.evaluated_depsgraph_get(); out_ = []
    for f in range(f0, f0 + n):
        best = _armclr(f); out_.append(round(best * 100, 1))
    print("ARMCLR", out_)
RT = float(os.environ.get("RETIME", "1"))  # TB-203: resample the clip to RT x its frame count (5% slower = 1.05), subframe-exact
n2 = round(n * RT)
fl = [int(x) for x in os.environ["FR"].split(",")] if os.environ.get("FR") else range(n2)
for i in fl:
    t_ = i * n / n2; sc.frame_set(f0 + int(t_), subframe=t_ - int(t_))
    if os.environ.get("STRDBG") and bpy.data.objects.get("wpn_bow") and bpy.data.objects["wpn_bow"].data.shape_keys:
        wq_ = bpy.data.objects["wpn_bow"]; em_ = wq_.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
        print("STRDBG", i, [(k.name, round(k.value, 2)) for k in wq_.data.shape_keys.key_blocks if k.value > 0.01], "nockgap", round(min((wq_.matrix_world @ em_.vertices[j].co - NOCK()).length for j in sv), 3))
    if os.environ.get("FOCUS"):  # close-up: centre the ortho camera on this bone's head (e.g. LeftHand)
        _f = cam.matrix_world.to_3x3() @ Vector((0, 0, -1))
        cam.location = tgt.matrix_world @ tgt.pose.bones["mixamorig:" + os.environ["FOCUS"]].head - _f * 5
    sc.render.filepath = f"{out}_{i}.png"
    bpy.ops.render.render(write_still=True)

print("ANIM wrote", out)
















