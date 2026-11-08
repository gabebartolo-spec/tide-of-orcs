# build_gallop.py <Orc_LightCavalry.fbx> <Quaternius Wolf.fbx> <out.blend> : TB-210 wolf rider run = Quaternius CC0 Wolf "Gallop" (17 frames)
# copied onto blam's Bip001 wolf; the rider (Bip002 subtree, child of the wolf's Spine) plays blam's own 03_run rider channels, retimed to
# the gallop's 17 frames, so the orc stays seated on the back the clip was authored for.
# Copy method (no invented pose): each mapped blam bone gets its 01_idle frame-1 world orientation, pitched about the wolf's lateral axis by
# the change of the matching Quaternius segment's sagittal angle from that wolf's Idle frame 1 to the Gallop frame. Both idles stand on four
# legs, so blam keeps its own anatomy and copies the gallop's angle changes exactly. Each frame is then lifted so the wolf's lowest vertex
# matches the Quaternius wolf's lowest vertex above its idle floor (scaled by the height ratio): the contact and flight phases are copied too.
# Env as build_blam.py (PARTS, HEIGHT, SCALE, YAW). RARM=<07_attack_A frame>: hold the rider's right arm (clavicle..hand, and the weapon it
# carries) at that frame of the model's own attack clip instead of the run's low hang. Prints SEG per segment and LIFT per frame.
import bpy, sys, os, math
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index("--") + 1:]
FBX, QFBX, OUT = a[0], a[1], a[2]
PARTS = os.environ.get("PARTS", "").split(","); HEIGHT = float(os.environ.get("HEIGHT", "0.82")); YAW = float(os.environ.get("YAW", "90"))
BOB = float(os.environ.get("BOB", "0"))
RARM = int(os.environ["RARM"]) if os.environ.get("RARM") else None

# Quaternius segments: blam bone -> (quat bone a, 'head'|'tail', quat bone b, 'head'|'tail')
SEG = {"Bip001 Pelvis": ("Back", "h", "Back", "t"), "Bip001 Spine": ("Torso", "h", "Neck1", "h"), "Bip001 Neck": ("Neck1", "h", "Head", "h"),
       "Bip001 Head": ("Head", "h", "Head", "t"), "Bip001 Tail": ("Tail1", "h", "Tail4", "h"), "Bip001 Tail1": ("Tail4", "h", "Tail8", "t")}
for s in "LR":
    SEG.update({f"Bip001 {s} Thigh": (f"BackLeg.{s}", "h", f"BackLeg.{s}", "t"), f"Bip001 {s} Calf": (f"BackUpperLeg.{s}", "h", f"BackUpperLeg.{s}", "t"),
                f"Bip001 {s} Foot": (f"BackLowerLeg.{s}", "h", f"BackLowerLeg.{s}", "t"), f"Bip001 {s} Toe0": (f"FFB.{s}", "h", f"FFB.{s}", "t"),
                f"Bip001 {s} UpperArm": (f"FrontUpperLeg.{s}", "h", f"FrontUpperLeg.{s}", "t"), f"Bip001 {s} Forearm": (f"FrontLowerLeg.{s}", "h", f"FrontLowerLeg.{s}", "t"),
                f"Bip001 {s} Hand": (f"FF.{s}", "h", f"FF.{s}", "t")})

def meshes_z(names=None):
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get(); p = []
    for o in bpy.data.objects:
        if o.type == 'MESH' and (names is None or o.name in names):
            e = o.evaluated_get(dg); mw = e.matrix_world; p += [mw @ v.co for v in e.data.vertices]
    return p

def setact(act, objs):
    for o in objs:
        ad = o.animation_data
        if ad and ad.action:
            sl = ad.action_slot; ad.action = act; m = [x for x in act.slots if sl and x.identifier == sl.identifier]
            if m: ad.action_slot = m[0]

# ---- 1. sample the Quaternius wolf: sagittal angle of every segment at Idle f1 and each Gallop frame, and the lowest vertex
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.wm.fbx_import(filepath=QFBX); sc = bpy.context.scene
qa = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
qact = lambda n: [x for x in bpy.data.actions if x.name.endswith("|" + n)][0]
def qset(act, F):
    qa.animation_data.action = act
    if act.slots: qa.animation_data.action_slot = act.slots[0]
    sc.frame_set(F); bpy.context.view_layer.update()
def qpt(b, e):
    pb = qa.pose.bones[b]; return qa.matrix_world @ (pb.head if e == "h" else pb.tail)
qset(qact("Idle"), 1)
QF = (qpt("Head", "h") - qpt("Back", "h")); QF.z = 0; QF.normalize(); QZ = Vector((0, 0, 1))
def qang(seg):
    v = qpt(seg[2], seg[3]) - qpt(seg[0], seg[1]); return math.atan2(v.dot(QZ), v.dot(QF))
q_idle = {k: qang(s) for k, s in SEG.items()}
pz = meshes_z(); q_floor = min(v.z for v in pz); q_h = max(v.z for v in pz) - q_floor
g = qact("Gallop"); GF = list(range(int(g.frame_range[0]), int(g.frame_range[1])))   # last frame == first, dropped
q_d, q_lift = [], []
for F in GF:
    qset(g, F); q_d.append({k: qang(s) - q_idle[k] for k, s in SEG.items()}); q_lift.append(min(v.z for v in meshes_z()) - q_floor)
print("QUAT frames", len(GF), "height", round(q_h, 3), "lift", [round(x / q_h, 3) for x in q_lift])

# ---- 2. blam model, scaled and placed exactly as build_blam.py does from the run clip's frame 1
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.wm.fbx_import(filepath=FBX); sc = bpy.context.scene
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name not in PARTS: bpy.data.objects.remove(o, do_unlink=True)
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]; objs = list(bpy.data.objects)
act = lambda n: [x for x in bpy.data.actions if n in x.name][0]
root = [o for o in bpy.data.objects if o.parent is None][0]
setact(act("03_run"), objs); sc.frame_set(1)
pz = meshes_z(); lo = [min(v[i] for v in pz) for i in range(3)]; hi = [max(v[i] for v in pz) for i in range(3)]
s = float(os.environ["SCALE"]) if os.environ.get("SCALE") else HEIGHT / (hi[2] - lo[2]); print("SCALE", s)
root.matrix_world = Matrix.Rotation(math.radians(YAW), 4, 'Z') @ Matrix.Scale(s, 4) @ root.matrix_world
pz = meshes_z(); lo = [min(v[i] for v in pz) for i in range(3)]; hi = [max(v[i] for v in pz) for i in range(3)]
root.matrix_world = Matrix.Translation(Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))) @ root.matrix_world
bpy.context.view_layer.update()
rider = [b.name for b in arm.data.bones if b.name == "Bip002" or any(p.name == "Bip002" for p in b.parent_recursive)]
rarm = ["Bip001 R Clavicle001", "Bip001 R UpperArm001", "Bip001 R Forearm001", "Bip001 R Hand001"]
n = len(GF); RUN0, RUN1 = act("03_run").frame_range
run_basis = []
for i in range(n):   # rider channels of the run, retimed: gallop frame i <- run frame RUN0 + i*(run length)/n
    t = RUN0 + i * (RUN1 - RUN0) / n; sc.frame_set(int(t), subframe=t - int(t))
    run_basis.append({b: arm.pose.bones[b].matrix_basis.copy() for b in rider})
if RARM is not None:
    setact(act("07_attack_A"), objs); sc.frame_set(RARM); arm_basis = {b: arm.pose.bones[b].matrix_basis.copy() for b in rarm}
setact(act("01_idle"), objs); sc.frame_set(1); bpy.context.view_layer.update()
idle_basis = {pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones}
idle_rot = {b: arm.pose.bones[b].matrix.to_3x3().normalized() for b in SEG}
wolf_names = [o.name for o in bpy.data.objects if o.type == 'MESH' and o.name == "Wolf"]
pz = meshes_z(wolf_names); b_floor = min(v.z for v in pz); b_h = max(v.z for v in pz) - b_floor
# blam's lateral axis: forward (pelvis -> head, horizontal) x up, in armature space
hd = arm.matrix_world @ arm.pose.bones["Bip001 Head"].head; pv = arm.matrix_world @ arm.pose.bones["Bip001 Pelvis"].head
BF = hd - pv; BF.z = 0; BF.normalize(); lat_w = BF.cross(Vector((0, 0, 1))).normalized()
lat = (arm.matrix_world.to_3x3().inverted() @ lat_w).normalized()
for o in objs:   # drop every clip: the bake below keys the armature and the root directly
    if o.animation_data: o.animation_data.action = None
order = [b.name for b in arm.data.bones]   # parents before children
root_loc0 = root.location.copy()
for i in range(n):
    F = i + 1
    for pb in arm.pose.bones: pb.matrix_basis = idle_basis[pb.name]
    for b in rider: arm.pose.bones[b].matrix_basis = run_basis[i][b]
    if RARM is not None:
        for b in rarm: arm.pose.bones[b].matrix_basis = arm_basis[b]
    root.location = root_loc0
    bpy.context.view_layer.update()
    for b in order:
        if b not in SEG: continue
        pb = arm.pose.bones[b]; head = pb.matrix.to_translation()
        R = Matrix.Rotation(q_d[i][b], 3, lat) @ idle_rot[b]
        pb.matrix = Matrix.Translation(head) @ R.to_4x4(); bpy.context.view_layer.update()
    if BOB:   # rider rides the gallop: he lags the wolf's vertical lift by one frame (sags when the wolf rises, lands late)
        dz = BOB * (q_lift[i - 1] - q_lift[i]) * b_h / q_h / arm.matrix_world.to_scale().z; pbr = arm.pose.bones["Bip002"]
        pbr.matrix = Matrix.Translation(Vector((0, 0, dz))) @ pbr.matrix; bpy.context.view_layer.update()
    lift = q_lift[i] * b_h / q_h; zmin = min(v.z for v in meshes_z(wolf_names))
    root.matrix_world = Matrix.Translation(Vector((0, 0, lift - zmin))) @ root.matrix_world; bpy.context.view_layer.update()
    root.keyframe_insert("location", frame=F)
    for pb in arm.pose.bones:
        pb.keyframe_insert("location", frame=F); pb.keyframe_insert("rotation_quaternion" if pb.rotation_mode == 'QUATERNION' else "rotation_euler", frame=F)
        pb.keyframe_insert("scale", frame=F)
    print("LIFT", F, round(lift, 4), "zmin", round(min(v.z for v in meshes_z(wolf_names)), 4))
sc.frame_start, sc.frame_end = 1, n + 1   # render_blam renders frame_start..frame_end-1
for b, sg in SEG.items(): print("SEG", b, "<-", sg[0], "range deg", round(math.degrees(min(d[b] for d in q_d)), 1), round(math.degrees(max(d[b] for d in q_d)), 1))
bpy.ops.file.pack_all(); bpy.ops.wm.save_as_mainfile(filepath=OUT); print("SAVED", OUT, n)
