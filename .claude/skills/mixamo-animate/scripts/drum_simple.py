# drum_simple.py <out_prefix>   (TB-186c, director 4 Nov: "skin up, sticks neutral, arms just move up and down, no wrist wriggle")
# Run: blender -b --factory-startup <tide-assets\drummer\drummer_up.blend> --python drum_simple.py -- <out>   env: FR=0,6,12 N=24 VIEWS=game,front,side RES=512
# No Mixamo clip: the arms are hand-built forward kinematics. Per side the upper arm is fixed, the forearm hinges up and down in one
# vertical plane, the hand rides the forearm rigidly (same rotation as the forearm: no wrist motion), and a stick sits in the fist at a
# fixed angle to the forearm. Left and right hit half a cycle apart; the bottom of each stroke puts the stick head on the skin.
# The Tripo drum (welded into the body, Hips-weighted) is levelled so its skin faces straight up and raised to the stroke; a skin disc
# is laid on top so the head always exists. The welded mallets are cut out and replaced by two real stick objects.
import bpy, sys, os, math, bmesh
from mathutils import Vector, Matrix, Quaternion, Euler
out = sys.argv[sys.argv.index("--") + 1]
N = int(os.environ.get("N", "24")); PHI_B = math.radians(float(os.environ.get("PHIB", "-8"))); AMP = math.radians(float(os.environ.get("AMP", "38")))
ALPHA = math.radians(float(os.environ.get("ALPHA", "25")))  # stick this far below the forearm line (neutral matched-grip angle)
STICK_BACK, STICK_FWD, STICK_R, HEAD_R = 0.05, 0.19, 0.011, 0.022
TIPX = float(os.environ.get("TIPX", "0.075"))  # each stick head lands this far off the drum centre line
sc = bpy.context.scene
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE"); ob = next(o for o in bpy.data.objects if o.type == "MESH")
W = arm.matrix_world; Wi = W.inverted(); m = ob.data
for pb in arm.pose.bones: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
bpy.context.view_layer.update()
def bw(n, s): b = arm.data.bones[f"mixamorig:{s}{n}"]; return W @ b.head_local, W @ b.tail_local, (W @ b.matrix_local).to_3x3().normalized()
# ---- kinematics (world space) ----
LAM = lambda t: 0.5 - 0.5 * math.cos(2 * math.pi * t)  # 0 at the hit, 1 at the top of the lift
class Side:
    def __init__(s, name, sg, phase):
        s.n, s.sg, s.phase = name, sg, phase
        s.S, aT, s.Ra = bw("Arm", name); s.d0a = (aT - s.S).normalized(); s.La = (aT - s.S).length
        fH, fT, s.Rf = bw("ForeArm", name); s.d0f = (fT - fH).normalized(); s.Lf = (fT - fH).length
        hH, hT, s.Rh = bw("Hand", name); s.d0h = (hT - hH).normalized(); s.Lh = (hT - hH).length
        s.du = Vector((-sg * 0.05, -0.85, -0.5)).normalized(); s.psi = 0.0
        s.Da = s.d0a.rotation_difference(s.du)
    def hdir(s): return Vector((-s.sg * math.sin(s.psi), -math.cos(s.psi), 0))
    def dfore(s, phi): return s.hdir() * math.cos(phi) + Vector((0, 0, math.sin(phi)))
    def pose(s, phi):  # -> world frames for Arm, ForeArm, Hand, plus fist centre, fore frame
        E = s.S + s.du * s.La; df = s.dfore(phi); Df = s.d0f.rotation_difference(df)
        Wr = E + df * s.Lf
        Ra = (s.Da @ s.Ra.to_quaternion()).to_matrix(); Rf = (Df @ s.Rf.to_quaternion()).to_matrix(); Rh = (Df @ s.Rh.to_quaternion()).to_matrix()
        fist = Wr + (Df @ s.d0h) * s.Lh * 0.5
        return [(s.S, Ra), (E, Rf), (Wr, Rh)], fist, Rf
    def stick_dir(s, phi, Rf):  # stick fixed in the forearm frame: at PHI_B it lies ALPHA below the forearm line
        _, _, Rf0 = s.pose(PHI_B); d0 = s.hdir() * math.cos(PHI_B - ALPHA) + Vector((0, 0, math.sin(PHI_B - ALPHA)))
        return Rf @ (Rf0.inverted() @ d0)
    def tip(s, phi):
        _, fist, Rf = s.pose(phi); return fist + s.stick_dir(phi, Rf) * STICK_FWD
def solve_psi(s):  # yaw the forearm plane so the bottom-of-stroke stick head lands TIPX off the centre line
    lo, hi = -0.2, 1.4
    for _ in range(40):
        s.psi = (lo + hi) / 2; x = s.tip(PHI_B).x * s.sg
        if x > TIPX: lo = s.psi
        else: hi = s.psi
L, R = Side("Left", 1, 0.5), Side("Right", -1, 0.0)
for s in (L, R): solve_psi(s)
tL, tR = L.tip(PHI_B), R.tip(PHI_B); print("TIPS", tuple(round(v, 3) for v in tL), tuple(round(v, 3) for v in tR), "psi", round(L.psi, 3), round(R.psi, 3))
SKIN_Z = (tL.z + tR.z) / 2 - 0.004; SKIN_Y = (tL.y + tR.y) / 2 + float(os.environ.get("DY", "0.04"))  # head touches (just sinks into) the skin; centre a little behind the hits
# ---- mesh surgery: cut the welded mallets, level + raise the drum, add a skin disc ----
gi = {g.index: g.name for g in ob.vertex_groups}
def dom(v): return gi[max(v.groups, key=lambda g: g.weight).group] if v.groups else None
mt0 = m.materials[0]; bsdf = next(n for n in mt0.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
img = bsdf.inputs["Base Color"].links[0].from_node.image; IW, IH = img.size; px = img.pixels[:]
hv = [bool(dom(v)) and "Hand" in dom(v) for v in m.vertices]; uv = m.uv_layers[0].data; st = []
for p in m.polygons:
    if not all(hv[i] for i in p.vertices): continue
    u = sum(uv[l].uv.x for l in p.loop_indices) / p.loop_total; w = sum(uv[l].uv.y for l in p.loop_indices) / p.loop_total
    k = 4 * (min(IH - 1, max(0, int(w % 1 * IH))) * IW + min(IW - 1, max(0, int(u % 1 * IW))))
    if px[k] > px[k + 1]: st.append(p.index)  # cream (R>G) hand-weighted face = mallet
print("MALLET faces cut", len(st))
bm = bmesh.new(); bm.from_mesh(m); bm.faces.ensure_lookup_table(); bmesh.ops.delete(bm, geom=[bm.faces[i] for i in st], context="FACES"); bm.to_mesh(m); bm.free(); m.update()
gi = {g.index: g.name for g in ob.vertex_groups}; M = ob.matrix_world; Mi = M.inverted()
# drum = mkdrum.py's box selection on the untilted blend (drummer_up_pretilt.blend): every Hips-dominant vert in the drum box
def _box(v):
    p = M @ v.co; return dom(v) == "mixamorig:Hips" and -0.17 < p.x < 0.14 and -0.34 < p.y < float(os.environ.get("YMAX", "-0.04")) and 0.26 < p.z < float(os.environ.get("ZMAX", "0.54"))
ids = {v.index for v in m.vertices if _box(v)}
_adj = {i: [] for i in ids}  # keep only the largest edge-connected island in the box: the drum, not the belly/loincloth verts it touches
for e in m.edges:
    a_, b_ = e.vertices
    if a_ in ids and b_ in ids: _adj[a_].append(b_); _adj[b_].append(a_)
_seen, _isl = set(), []
for i0 in ids:
    if i0 in _seen: continue
    st_, comp = [i0], []; _seen.add(i0)
    while st_:
        i = st_.pop(); comp.append(i)
        for j in _adj[i]:
            if j not in _seen: _seen.add(j); st_.append(j)
    _isl.append(comp)
_isl.sort(key=len, reverse=True); print("ISLANDS", [len(c) for c in _isl[:8]], "of", len(_isl))
ids = set(_isl[0]) | {i for c in _isl[1:] if len(c) >= int(os.environ.get("MINISL", "40")) for i in c}
if os.environ.get("HIST"):
    import collections; print("YHIST", sorted(collections.Counter(round((M @ m.vertices[i].co).y, 2) for i in ids).items())); print("ZHIST", sorted(collections.Counter(round((M @ m.vertices[i].co).z, 2) for i in ids).items()))
bm = bmesh.new(); bm.from_mesh(m); bm.faces.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[f for f in bm.faces if any(v.index in ids for v in f.verts) and not all(v.index in ids for v in f.verts)], context="FACES_ONLY"); bm.to_mesh(m); bm.free(); m.update()
import numpy as np
P0 = np.array([(M @ m.vertices[i].co)[:] for i in ids]); C0 = P0.mean(0); ev, evec = np.linalg.eigh(np.cov((P0 - C0).T))
AX = Vector(evec[:, 0]); AX = AX if AX.z > 0 else -AX  # drum axis = least-spread direction (a drum is wider than tall), pointing up
print("DRUM axis", tuple(round(x, 3) for x in AX), "spread", tuple(round(float(x), 4) for x in ev))
nrm = [Vector(m.corner_normals[i].vector) for i in range(len(m.loops))]
Rq = AX.rotation_difference(Vector((0, 0, 1))); C0 = Vector(C0)
lev = [Rq @ ((M @ m.vertices[i].co) - C0) for i in ids]; top = max(q.z for q in lev); cx = (max(q.x for q in lev) + min(q.x for q in lev)) / 2; cy = (max(q.y for q in lev) + min(q.y for q in lev)) / 2
SKIN_RAD = (max(q.x for q in lev) - min(q.x for q in lev)) / 2 * 0.9
T = Vector((0, SKIN_Y, SKIN_Z)) - Vector((cx, cy, top))
for i, q in zip(ids, lev): m.vertices[i].co = Mi @ (q + T)
for li, l in enumerate(m.loops):
    if l.vertex_index in ids: nrm[li] = (Rq @ nrm[li]).normalized()
m.normals_split_custom_set([n[:] for n in nrm]); m.update()
dz = [(M @ m.vertices[i].co) for i in ids]; topz = max(p.z for p in dz if (p - Vector((0, SKIN_Y, 0))).xy.length < SKIN_RAD * 0.6)
print("DRUM verts", len(ids), "skin plane z", round(SKIN_Z, 3), "top z near axis", round(topz, 3), "rim z max", round(max(p.z for p in dz), 3))
if os.environ.get("PRINT"):
    for r0 in (0,.04,.08,.12,.16,.2,.3):
        zs=[q.z for q in dz if r0<=(q-Vector((0,SKIN_Y,0))).xy.length<r0+.04+(0.1 if r0==.2 else 0)]
        print("RADBIN",r0,len(zs),round(min(zs),3) if zs else None,round(max(zs),3) if zs else None)
def mat(name, col):
    mt = bpy.data.materials.new(name); mt.use_nodes = True; b = mt.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = col; b.inputs["Roughness"].default_value = 1.0
    for k in ("Specular IOR Level", "Specular"):
        if k in b.inputs: b.inputs[k].default_value = 0.0
    return mt
def mk(name, build, mats):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); build(bm); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    for mt in mats: me.materials.append(mt)
    return o
SKINM = mat("skin", (0.80, 0.68, 0.48, 1)); STICKM = mat("stick_wood", (0.30, 0.18, 0.09, 1)); HEADM = mat("stick_head", (0.85, 0.76, 0.58, 1))
def build_skin(bm): bmesh.ops.create_circle(bm, cap_ends=True, cap_tris=False, segments=40, radius=SKIN_RAD * 0.96)
skin = mk("prop_skin", build_skin, [SKINM]); skin.location = Vector((0, SKIN_Y, SKIN_Z + 0.004))
def build_stick(bm):  # shaft + ball head along local +Z (butt at -STICK_BACK, head centre at STICK_FWD)
    L_ = STICK_BACK + STICK_FWD - HEAD_R
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=STICK_R, radius2=STICK_R, depth=L_, matrix=Matrix.Translation((0, 0, -STICK_BACK + L_ / 2)))
    n0 = len(bm.faces); bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=8, radius=HEAD_R, matrix=Matrix.Translation((0, 0, STICK_FWD)))
    bm.faces.ensure_lookup_table()
    for f in list(bm.faces)[n0:]: f.material_index = 1
sticks = {s.n: mk("prop_stick_" + s.n, build_stick, [STICKM, HEADM]) for s in (L, R)}
for mt in bpy.data.materials:  # matte like the sprite pipeline
    if mt.use_nodes:
        for nd in mt.node_tree.nodes:
            if nd.type == "BSDF_PRINCIPLED":
                nd.inputs["Roughness"].default_value = 1.0; nd.inputs["Metallic"].default_value = 0.0
                for k in ("Specular IOR Level", "Specular"):
                    if k in nd.inputs: nd.inputs[k].default_value = 0.0
                for l in list(nd.inputs["Roughness"].links) + list(nd.inputs["Metallic"].links): mt.node_tree.links.remove(l)
# ---- camera, light (same as apply_anim.py GAMECAM) ----
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = "ORTHO"; cam.data.ortho_scale = float(os.environ.get("ORTHO", "2.0"))
def setcam(rot):
    t = math.radians(20); r = math.radians(rot); cam.location = Matrix.Rotation(r, 3, "Z") @ Vector((-3.7 * math.cos(t), 0, 0.5 + 3.7 * math.sin(t))); cam.rotation_euler = Euler((math.pi / 2 - t, 0, -math.pi / 2 + r))
sc.render.engine = "BLENDER_EEVEE"; sc.render.film_transparent = True
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.6, 0.65, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3.5; sun.data.color = (1, 0.93, 0.8); sun.rotation_euler = Euler((math.radians(40), 0, math.radians(20)))
rim = bpy.data.objects.new("rim", bpy.data.lights.new("rim", "SUN")); sc.collection.objects.link(rim); rim.data.energy = 1.5; rim.data.color = (0.8, 0.85, 1); rim.rotation_euler = Euler((math.radians(-60), 0, math.radians(200)))
sc.view_settings.view_transform = "Standard"; sc.eevee.taa_render_samples = 32
sc.render.resolution_x = sc.render.resolution_y = int(os.environ.get("RES", "512"))
from bpy_extras.object_utils import world_to_camera_view as w2c
import sys; sys.path.insert(0, os.path.dirname(__file__)); import lit_render  # TB-253
setcam(0); bpy.context.view_layer.update(); p = w2c(sc, cam, W @ Vector((0, 0, 0))); print("ANCHOR", round(p.x * sc.render.resolution_x, 2), round((1 - p.y) * sc.render.resolution_y, 2)); lit_render.setup(sc, cam)
def apply(i):
    for s in (L, R):
        u = (i / N - s.phase) % 1.0; phi = PHI_B + AMP * LAM(u)
        mats, fist, Rf = s.pose(phi)
        for nm, (H, Rr) in zip(("Arm", "ForeArm", "Hand"), mats):
            pb = arm.pose.bones[f"mixamorig:{s.n}{nm}"]; pb.matrix = Wi @ (Matrix.Translation(H) @ Rr.to_4x4() @ Matrix.Scale(0.01, 4)); bpy.context.view_layer.update()
        z = s.stick_dir(phi, Rf).normalized(); x = z.cross(Vector((0, 0, 1)))
        x = x.normalized() if x.length > 1e-6 else Vector((1, 0, 0)); y = z.cross(x)
        sticks[s.n].matrix_world = Matrix.Translation(fist) @ Matrix((x, y, z)).transposed().to_4x4()
    bpy.context.view_layer.update()
fl = [int(x) for x in os.environ["FR"].split(",")] if os.environ.get("FR") else range(N)
for i in fl:
    apply(i)
    for v in os.environ.get("VIEWS", "game").split(","):
        setcam({"game": 0, "front": 90, "side": -90, "top": 0}[v])
        if v == "top": cam.location = (0, SKIN_Y, 4); cam.rotation_euler = Euler((0, 0, 0))
        sc.render.filepath = f"{out}{'' if v == 'game' else '_' + v}_{i}.png"; bpy.ops.render.render(write_still=True)
        if v == "game": lit_render.mask(sc, sc.render.filepath)
if os.environ.get("SAVE"): bpy.ops.wm.save_as_mainfile(filepath=os.environ["SAVE"])
print("DONE")
