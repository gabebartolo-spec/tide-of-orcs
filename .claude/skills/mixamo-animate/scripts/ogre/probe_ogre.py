# TB-211 round 4 probe: per-frame face / thigh / seam numbers for an ogre frame sequence, from class renders (no guessing from a sheet).
# Each frame is drawn by Workbench (flat, no AA) with the body painted by its dominant bone: head (joint5 subtree + neck joint4, plus the hood: HEADR),
# weapon hand (forearm joint147 subtree), legs (both leg chains + the loincloth Rag), rest; the cleaver is its own colour. A second pass masks
# the body to the head alone, a third to the legs alone, so occlusion is measured against the whole head/leg silhouette.
# Per frame and view it prints: hc = % of the head silhouette covered by cleaver or weapon hand (in front of it), gap = 2D gap in cm from
# cleaver/hand to the head silhouette (0 = touching or over it), lc = % of the leg silhouette covered by the cleaver, ld = 3D gap in cm from
# the cleaver to the nearest leg vertex, and step = largest cleaver-vertex move in cm from the previous frame (frame 0 against the last = loop seam).
# Env: SEQS "name=tok,tok,...|name2=..." with tok = take frame "173", range "173-193", blend "193>220@0.5" (pose a slerped toward b by w),
# or arm layer "61~171@0.6" / "61-110~171@0.6" (take pose a, right arm joint145 subtree slerped toward take pose b by w, a's grip);
#      YAWS "330,300" (deg), VIEWS "game,front", RES 256, HEIGHT 2.0, ORTHO 4.2, FORTHO 5.2, GAMECAM 20, SAVE dir (keep the class renders)
# Usage: blender -b --factory-startup --python probe_ogre.py -- <Troll_Orc.fbx>
import bpy, math, sys, os
import numpy as np
from mathutils import Vector, Euler, Matrix
E = os.environ.get
SRC = sys.argv[sys.argv.index("--") + 1]
RES = int(E("RES", "256")); ORTHO = float(E("ORTHO", "4.2")); FORTHO = float(E("FORTHO", "5.2")); T = math.radians(float(E("GAMECAM", "20")))
VIEWS = E("VIEWS", "game,front").split(","); SAVE = E("SAVE")
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.fbx(filepath=SRC)
sc = bpy.context.scene; sc.frame_start, sc.frame_end = 1, 231
arm = next(o for o in sc.objects if o.type == 'ARMATURE'); WP = bpy.data.objects["weapon_LP_trian1"]; HB = arm.pose.bones["joint150"]
meshes = [o for o in sc.objects if o.type == 'MESH']; body = [o for o in meshes if o != WP]
def sub(n):
    out = set(); st = [arm.pose.bones[n]]
    while st:
        b = st.pop(); out.add(b.name); st += list(b.children)
    return out
CLS = [("head", sub("joint5") | {"joint4"}), ("hand", sub("joint147")), ("legs", sub("L_leg") | sub("R_Leg") | sub("Rag"))]
COL = {"rest": (0.5, 0.5, 0.5), "head": (1, 0, 0), "hand": (0, 0, 1), "legs": (1, 1, 0), "weapon": (0, 1, 0)}
legv = {}
# head zone = head bones plus every body vertex within HEADR (armature units, default 40) of the midpoint of the skull (joint5) and face (joint112) joints
AW = arm.matrix_world.inverted(); HC = (arm.data.bones["joint5"].head_local + arm.data.bones["joint112"].head_local) / 2; HR = float(E("HEADR", "40"))
for o in body:
    names = {g.index: g.name for g in o.vertex_groups}; cls = []
    for v in o.data.vertices:
        n = names.get(max(v.groups, key=lambda g: g.weight).group, "") if v.groups else ""
        k = next((k for k, s in CLS if n in s), "rest")
        if k == "rest" and ((AW @ (o.matrix_world @ v.co)) - HC).length < HR: k = "head"  # hood: skinned to the spine, but it is the head's outline
        cls.append(k)
    for k in ("head", "legs"):  # mask groups for the alone passes
        g = o.vertex_groups.new(name="CLS_" + k); g.add([i for i, c in enumerate(cls) if c == k], 1.0, 'REPLACE')
        m = o.modifiers.new("M_" + k, 'MASK'); m.vertex_group = g.name; m.show_render = m.show_viewport = False
    legv[o.name] = [i for i, c in enumerate(cls) if c == "legs"]
    ca = o.data.color_attributes.new("cls", 'FLOAT_COLOR', 'POINT')
    for i, c in enumerate(cls): ca.data[i].color = COL[c] + (1,)
    o.data.color_attributes.active_color = ca
ca = WP.data.color_attributes.new("cls", 'FLOAT_COLOR', 'POINT')
for d in ca.data: d.color = COL["weapon"] + (1,)
WP.data.color_attributes.active_color = ca
# fit/pivot exactly as render_ogre.py
piv = bpy.data.objects.new("piv", None); sc.collection.objects.link(piv)
for o in [o for o in sc.objects if o.parent is None and o != piv]:
    mw = o.matrix_world.copy(); o.parent = piv; o.matrix_world = mw
def bbox():
    dg = bpy.context.evaluated_depsgraph_get(); lo = Vector((1e9,) * 3); hi = -lo
    for o in meshes:
        e = o.evaluated_get(dg); m = e.to_mesh()
        for v in m.vertices:
            w = e.matrix_world @ v.co; lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
        e.to_mesh_clear()
    return lo, hi
sc.frame_set(1); bpy.context.view_layer.update(); lo, hi = bbox(); s = float(E("HEIGHT", "2.0")) / (hi.z - lo.z)
piv.scale = (s, s, s); bpy.context.view_layer.update(); lo, hi = bbox(); c = (lo + hi) / 2
piv.location = Vector((-c.x, -c.y, -lo.z)); bpy.context.view_layer.update(); P0 = piv.location.copy()
root = arm.pose.bones["Skeleton"]; rootw = lambda: arm.matrix_world @ root.head
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = "ORTHO"
sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "FLAT"; sc.display.shading.color_type = "VERTEX"; sc.display.render_aa = "OFF"
sc.view_settings.view_transform = "Standard"; sc.render.film_transparent = True; sc.render.resolution_x = sc.render.resolution_y = RES
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
TMP = SAVE or os.path.join(os.environ.get("TEMP", "."), "probe_ogre"); os.makedirs(TMP, exist_ok=True)
def place(view, yaw):
    C = Vector((0, 0, ORTHO / 2 - 0.15)); D = 6
    if view == "game": cam.location = C + Vector((0, -D * math.cos(T), D * math.sin(T))); cam.rotation_euler = Euler((math.pi / 2 - T, 0, 0)); cam.data.ortho_scale = ORTHO
    else:
        f = yaw - math.pi / 2; cam.location = C + Vector((D * math.cos(f), D * math.sin(f), 0)); cam.rotation_euler = Euler((math.pi / 2, 0, math.pi / 2 + f)); cam.data.ortho_scale = FORTHO
_REST = {}
def reset():
    ad = arm.animation_data
    if not _REST: _REST["act"] = ad.action; _REST["slot"] = getattr(ad, "action_slot", None); _REST["wp"] = WP.matrix_basis.copy(); _REST["b"] = {pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones}
    if ad.action is None:
        ad.action = _REST["act"]
        if _REST["slot"] is not None: ad.action_slot = _REST["slot"]
    WP.matrix_basis = _REST["wp"]
    for pb in arm.pose.bones: pb.matrix_basis = _REST["b"][pb.name]
def snap(f):
    reset(); sc.frame_set(f); bpy.context.view_layer.update()
    return {pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones}, (arm.matrix_world @ HB.matrix).inverted() @ WP.matrix_world
ARMSET = set(sub("joint145"))  # right arm (shoulder to fingers) for the "a~b@w" layer token
def pose(tok):  # same maths as splice.apply: bone local bases and the cleaver's hand grip slerped
    if "~" in tok:  # layer: take pose a, the right arm's local bases slerped toward take pose b by w; the cleaver keeps a's grip
        ab, w = tok.split("@"); a, b = (int(x) for x in ab.split("~")); w = float(w)
        PB, _ = snap(b); PA, RA = snap(a)
        arm.animation_data.action = None
        for pb in arm.pose.bones:
            if pb.name in ARMSET:
                l1, r1, s1 = PA[pb.name].decompose(); l2, r2, s2 = PB[pb.name].decompose(); pb.matrix_basis = Matrix.LocRotScale(l1.lerp(l2, w), r1.slerp(r2, w), s1.lerp(s2, w))
            else: pb.matrix_basis = PA[pb.name]
        bpy.context.view_layer.update(); WP.matrix_world = (arm.matrix_world @ HB.matrix) @ RA; bpy.context.view_layer.update(); return a
    if ">" not in tok: reset(); sc.frame_set(int(tok)); bpy.context.view_layer.update(); return int(tok)
    ab, w = tok.split("@"); a, b = (int(x) for x in ab.split(">")); w = float(w)
    PA, RA = snap(a); PB, RB = snap(b)
    def mix(m1, m2):
        l1, r1, s1 = m1.decompose(); l2, r2, s2 = m2.decompose(); return Matrix.LocRotScale(l1.lerp(l2, w), r1.slerp(r2, w), s1.lerp(s2, w))
    arm.animation_data.action = None
    for pb in arm.pose.bones: pb.matrix_basis = mix(PA[pb.name], PB[pb.name])
    bpy.context.view_layer.update(); WP.matrix_world = (arm.matrix_world @ HB.matrix) @ mix(RA, RB); bpy.context.view_layer.update(); return b
def toks(spec):
    out = []
    for t in spec.split(","):
        t = t.strip()
        if "~" in t and "-" in t: rg, rest = t.split("~"); a, b = (int(x) for x in rg.split("-")); out += [f"{f}~{rest}" for f in range(a, b + 1)]
        elif "-" in t and ">" not in t: a, b = (int(x) for x in t.split("-")); out += [str(f) for f in range(a, b + 1)]
        elif t: out.append(t)
    return out
def shot(mode):
    for o in body:
        for k in ("head", "legs"): o.modifiers["M_" + k].show_render = (mode == k)
    WP.hide_render = mode != "full"
    p = os.path.join(TMP, "_p.png"); sc.render.filepath = p; bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(p, check_existing=False); a = np.array(im.pixels[:], dtype=np.float32).reshape(RES, RES, 4)[::-1]; bpy.data.images.remove(im)
    if SAVE and mode == "full": import shutil; shutil.copy(p, os.path.join(TMP, f"{NAME}_{YAWD}_{VIEW}_{IDX}.png"))
    return a
def cls_of(a, k):
    c = COL[k]; return (a[..., 3] > 0.5) & (np.abs(a[..., 0] - c[0]) < 0.2) & (np.abs(a[..., 1] - c[1]) < 0.2) & (np.abs(a[..., 2] - c[2]) < 0.2)
def gap(A, B, px_m):
    if not A.any() or not B.any(): return 999
    if (A & B).any(): return 0
    ya, xa = np.nonzero(A); yb, xb = np.nonzero(B)
    if len(ya) > 4000: k = np.linspace(0, len(ya) - 1, 4000).astype(int); ya, xa = ya[k], xa[k]
    d = np.sqrt((ya[:, None] - yb[None, :]) ** 2 + (xa[:, None] - xb[None, :]) ** 2).min()
    return round(float(d) * px_m * 100)
wv = np.array([v.co[:] for v in WP.data.vertices])
for spec in E("SEQS").split("|"):
    NAME, body_spec = spec.split("="); seq = toks(body_spec)
    for yd in [float(y) for y in E("YAWS", "330").split(",")]:
        YAWD = int(yd); yaw = math.radians(yd); piv.rotation_euler.z = yaw; piv.location = P0; bpy.context.view_layer.update()
        reset(); sc.frame_set(int(seq[0].split(">")[0].split("~")[0])); bpy.context.view_layer.update(); r0 = rootw().copy()
        rows = []; prev = None; first = None
        for IDX, tok in enumerate(seq):
            pose(tok); d = rootw() - r0; piv.location = P0 - Vector((d.x, d.y, 0)); bpy.context.view_layer.update()
            M = np.array(WP.matrix_world); W = wv @ M[:3, :3].T + M[:3, 3]
            step = round(float(np.linalg.norm(W - prev, axis=1).max()) * 100) if prev is not None else None
            prev = W; first = W if first is None else first
            dg = bpy.context.evaluated_depsgraph_get(); L = []
            for o in body:
                if not legv[o.name]: continue
                e = o.evaluated_get(dg); m = e.to_mesh(); mw = e.matrix_world; L += [(mw @ m.vertices[i].co)[:] for i in legv[o.name]]; e.to_mesh_clear()
            L = np.array(L); ld = round(float(min(np.sqrt(((L - w) ** 2).sum(1)).min() for w in W[::3])) * 100)
            row = {"i": IDX, "tok": tok, "step": step, "ld": ld}
            for VIEW in VIEWS:
                place(VIEW, yaw); px_m = (ORTHO if VIEW == "game" else FORTHO) / RES
                full = shot("full"); head = shot("head")[..., 3] > 0.5; legs = shot("legs")[..., 3] > 0.5
                cov = cls_of(full, "weapon") | cls_of(full, "hand"); wpn = cls_of(full, "weapon")
                hc = round(100 * (head & cov).sum() / max(1, head.sum())); lc = round(100 * (legs & wpn).sum() / max(1, legs.sum()))
                row[VIEW] = (hc, gap(cov, head, px_m), lc)
            rows.append(row)
        seam = round(float(np.linalg.norm(first - prev, axis=1).max()) * 100)
        print(f"SEQ {NAME} yaw {YAWD} n {len(seq)} seam_cm {seam}", flush=True)
        for r in rows:
            print("  " + f"{r['i']:3d} {r['tok']:>12} step {r['step']} ld {r['ld']} " + " ".join(f"{v}: hc {r[v][0]} gap {r[v][1]} lc {r[v][2]}" for v in VIEWS), flush=True)
print("PROBE DONE")
