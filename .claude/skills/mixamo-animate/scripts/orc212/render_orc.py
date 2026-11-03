# render_orc.py <clip.fbx> <textures dir> <frames dir> <key> : TB-212 Riltariki "Low-poly orc" (CC BY) rendered with its OWN clip
# (no retarget). Same field camera, lights and material flattening as apply_anim.py (GAMECAM 20 = side-on from the orc's right,
# facing screen-right; forward is -Y). The axe (polySurface34) is skinned to the clip's Axe_1_Dummy armature, which the clip keys.
# Env: ORTHO (3.0), CAMZ (0), TRACK=1 follows the pelvis on the ground plane (death), RES (512), GAMECAM (20), CAMROT (0; 90 = front), LOOP=1 drops the last frame (== first), STEP (1).
# Writes <dir>/<key>_<i>.png and prints "ANCHOR x y" (ground under the rig origin, image px from top-left).
import bpy, math, sys, os
from mathutils import Vector, Euler, Matrix
from bpy_extras.object_utils import world_to_camera_view
a = sys.argv[sys.argv.index("--") + 1:]; FBX, TEX, OUT, KEY = a[:4]
RES = int(os.environ.get("RES", "512")); ORTHO = float(os.environ.get("ORTHO", "3.0")); STEP = int(os.environ.get("STEP", "1"))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=FBX)
sc = bpy.context.scene; bip = bpy.data.objects["Bip001"]; axa = bpy.data.objects["Armature"]
for o in list(bpy.data.objects):
    if o.name.startswith("Box001"): bpy.data.objects.remove(o, do_unlink=True)
def mat(name, img):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(TEX, img)); nt.links.new(t.outputs[0], bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 1.0; bs.inputs["Metallic"].default_value = 0.0
    for k in ("Specular IOR Level", "Specular"):
        if k in bs.inputs: bs.inputs[k].default_value = 0.0
    return m
mb, ma = mat("orc_body", "Orc_Body_Diffuse.png"), mat("orc_axe", "Orc_Axe_Diffuse.png")
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    axe = o.name.startswith("polySurface34")
    o.data.materials.clear(); o.data.materials.append(ma if axe else mb)
    if not any(m.type == 'ARMATURE' for m in o.modifiers) and o.vertex_groups:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
        md = o.modifiers.new("arm", 'ARMATURE'); md.object = axa if axe else bip
ac = bip.animation_data.action; f0, f1 = map(int, ac.frame_range)
def fcs(act):  # Blender 5 layered actions: every fcurve with its channelbag
    for L in act.layers:
        for st in L.strips:
            for cb in st.channelbags:
                for fc in list(cb.fcurves): yield cb, fc
ARMFROM = os.environ.get("ARMFROM")  # walk (TB-212 critic: the clip carries the axe level like a rifle): both arms + axe from the model's own ANM_IDLE (axe hanging at the side), frame for frame
ARM = lambda b: b.startswith(("Bip001 R ", "Bip001 L ")) and not any(k in b for k in ("Thigh", "Calf", "Foot", "Toe"))
if ARMFROM:
    old = set(bpy.data.objects); bpy.ops.import_scene.fbx(filepath=ARMFROM); new = [o for o in bpy.data.objects if o not in old]
    b2 = next(o for o in new if o.name.startswith("Bip001")); a2 = next(o for o in new if o.name.startswith("Armature") and o.type == 'ARMATURE')
    i0, i1 = map(int, b2.animation_data.action.frame_range); IDLE = []
    for F in range(i0, i1):
        sc.frame_set(F); bpy.context.view_layer.update()
        hw = b2.matrix_world @ b2.pose.bones["Bip001 R Hand"].matrix; aw = a2.matrix_world @ a2.pose.bones["Axe_1_Dummy"].matrix
        IDLE.append(({pb.name: pb.matrix_basis.copy() for pb in b2.pose.bones if ARM(pb.name)}, hw.inverted() @ aw))
    for o in new: bpy.data.objects.remove(o, do_unlink=True)
    for cb, fc in fcs(ac):
        if any(f'"{b}"' in fc.data_path for b in IDLE[0][0]): cb.fcurves.remove(fc)
    axa.animation_data.action = None
    print("ARMFROM idle frames", len(IDLE), "arm bones", len(IDLE[0][0]))
MIX = os.environ.get("MIXAMO")  # death (TB-212 spec): retarget a Mixamo clip (Dying) onto Bip001. Torso/feet copy the world rotation change from rest; arms/legs aim
# each segment along the Mixamo segment (the girl_apose rest is an A-pose, Bip001 is a T-pose, so rest-delta rotations would bend the arms); hands keep their rest offset.
if MIX:
    sc.frame_set(f0); bpy.context.view_layer.update()
    hr = bip.matrix_world @ bip.pose.bones["Bip001 R Hand"].matrix; AXREL = hr.inverted() @ (axa.matrix_world @ axa.pose.bones["Axe_1_Dummy"].matrix)
    bip.animation_data.action = None; axa.animation_data.action = None
    for pb in bip.pose.bones: pb.matrix_basis = Matrix()
    old = set(bpy.data.objects); bpy.ops.import_scene.fbx(filepath=MIX); mixo = next(o for o in set(bpy.data.objects) - old if o.type == 'ARMATURE')
    for o in set(bpy.data.objects) - old:
        if o.type == 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    f0, f1 = map(int, mixo.animation_data.action.frame_range); bpy.context.view_layer.update()
    mr = lambda n: (mixo.matrix_world @ mixo.data.bones["mixamorig:" + n].matrix_local).to_quaternion()
    orr = lambda n: (bip.matrix_world @ bip.data.bones["Bip001 " + n].matrix_local).to_quaternion()
    MAP = [("Pelvis", "Hips"), ("Spine", "Spine"), ("Spine1", "Spine1"), ("Spine2", "Spine2"), ("Neck", "Neck"), ("Head", "Head")]
    for sd in ("Left", "Right"):
        L = sd[0]; MAP += [(L + " Clavicle", sd + "Shoulder"), (L + " UpperArm", sd + "Arm"), (L + " Forearm", sd + "ForeArm"), (L + " Hand", sd + "Hand"),
                           (L + " Thigh", sd + "UpLeg"), (L + " Calf", sd + "Leg"), (L + " Foot", sd + "Foot")]
    MAP.remove(("L Hand", "LeftHand")); MAP.append(("L Hand", "LeftHand"))  # L Hand is a child of R Hand (two-hand grip): pose it after R Hand or R Hand drags it off the left wrist
    CH = {"Clavicle": "UpperArm", "UpperArm": "Forearm", "Forearm": "Hand", "Thigh": "Calf", "Calf": "Foot"}
    MCH = {"Shoulder": "Arm", "Arm": "ForeArm", "ForeArm": "Hand", "UpLeg": "Leg", "Leg": "Foot"}
    mrest = lambda n: mixo.matrix_world @ mixo.data.bones["mixamorig:" + n].matrix_local
    K = (bip.matrix_world @ bip.data.bones["Bip001 Pelvis"].head_local).z / mrest("Hips").translation.z
    def mw(n): return mixo.matrix_world @ mixo.pose.bones["mixamorig:" + n].matrix
    # Riltariki parented Bip001 L Hand to R Hand (two-hand grip), so the left forearm's end is its rest offset to L Hand, carried by the forearm, not L Hand's posed head
    FOFF = bip.data.bones["Bip001 L Forearm"].matrix_local.inverted() @ bip.data.bones["Bip001 L Hand"].head_local
    def tip(n, child):
        if n == "L Forearm": return bip.matrix_world @ (bip.pose.bones["Bip001 L Forearm"].matrix @ FOFF)
        return bip.matrix_world @ bip.pose.bones["Bip001 " + child].head
    def setw(n, rot=None, loc=None, aim=None):
        pb = bip.pose.bones["Bip001 " + n]; W = bip.matrix_world @ pb.matrix; l, q, s = W.decompose()
        if n == "L Hand" and loc is None: loc = tip("L Forearm", None)  # keep the left wrist on the forearm, not wherever the right hand carries it
        if aim: q = (tip(n, aim[0]) - l).rotation_difference(aim[1]) @ q
        if rot: q = rot
        pb.matrix = bip.matrix_world.inverted() @ Matrix.LocRotScale(loc or l, q, s); bpy.context.view_layer.update()
    # matched rest: aim the Bip001 limbs along the Mixamo rest (A-pose) segments, then every mapped bone copies the full Mixamo world rotation change (twist included)
    for o, m in MAP:
        part = o.split(" ")[-1]; mp = m.replace("Left", "").replace("Right", "")
        if part in CH: setw(o, aim=(o[0] + " " + CH[part], mrest(m.replace(mp, MCH[mp])).translation - mrest(m).translation))
    OQ = {o: (bip.matrix_world @ bip.pose.bones["Bip001 " + o].matrix).to_quaternion() for o, m in MAP}; MQ = {m: mrest(m).to_quaternion() for o, m in MAP}
    def frame3(f, t):  # orthonormal frame from a finger direction and a thumb direction
        x = f.normalized(); z = x.cross(t).normalized(); return Matrix((x, z.cross(x), z)).transposed()
    def handframe(o, m, g, bn):  # TB-212 attack read as a thrust: copy the Mixamo hand's own frame (wrist->middle knuckle, then the knuckle line middle->pinky),
        sd = m[:-4]; hb = "Bip001 " + o; pre = "mixamorig:" + sd + "Hand"  # so the axe sits in the fist the way the clip's sword does
        mf = next((sd + "Hand" + k for k in ("Middle1", "Index1") if pre + k in bn), None)
        if not mf: return
        P = lambda n: bip.matrix_world @ bip.pose.bones[hb.replace("Hand", n)].head
        oh = P("Hand"); of = P("Finger2") - oh; mh = g(sd + "Hand").translation; mfv = g(mf).translation - mh
        if pre + "Pinky1" in bn and pre + "Middle1" in bn: R = frame3(mfv, g(sd + "HandPinky1").translation - g(sd + "HandMiddle1").translation) @ frame3(of, P("Finger4") - P("Finger2")).transposed()
        else: R = of.rotation_difference(mfv).to_matrix()
        l, q, sc_ = (bip.matrix_world @ bip.pose.bones[hb].matrix).decompose(); setw(o, rot=R.to_quaternion() @ q, loc=l)
    def pose(arm, F):  # apply Mixamo armature <arm> frame F to Bip001; return the resulting world rotation per bone and the pelvis position
        sc.frame_set(F); bpy.context.view_layer.update(); bn = set(arm.pose.bones.keys()); g = lambda n: arm.matrix_world @ arm.pose.bones["mixamorig:" + n].matrix
        for o, m in MAP:
            setw(o, rot=g(m).to_quaternion() @ MQ[m].inverted() @ OQ[o], loc=g("Hips").translation * K if o == "Pelvis" else None); part = o.split(" ")[-1]
            if part in CH:  # swing-correct each limb segment onto the Mixamo segment (the matched rest left Bip001 L Forearm 155 deg off)
                mp = m.replace("Left", "").replace("Right", ""); setw(o, aim=(o[0] + " " + CH[part], g(m.replace(mp, MCH[mp])).translation - g(m).translation))
            if part == "Hand": handframe(o, m, g, bn)
        return {o: (bip.matrix_world @ bip.pose.bones["Bip001 " + o].matrix).to_quaternion() for o, m in MAP}, g("Hips").translation * K
    LEAD = os.environ.get("LEADIN")  # attack (TB-212 critic: walk->attack popped): <walk.fbx>:<K> prepends K frames slerping from the walk's frame 1 to the attack's frame 1
    if LEAD:
        lf, LK = LEAD.rsplit(":", 1); LK = int(LK); o2 = set(bpy.data.objects); bpy.ops.import_scene.fbx(filepath=lf)
        wa = next(o for o in set(bpy.data.objects) - o2 if o.type == 'ARMATURE')
        for o in set(bpy.data.objects) - o2:
            if o.type == 'MESH': bpy.data.objects.remove(o, do_unlink=True)
        print("LEAD actions", wa.name, wa.animation_data.action.name, mixo.name, mixo.animation_data.action.name); WP = pose(wa, int(wa.animation_data.action.frame_range[0]))
        WP = (WP[0], Vector((0, 0, WP[1].z)) + (pose(mixo, f0)[1] * Vector((1, 1, 0))))  # walk height, attack ground position (the walk's root drift is tracked out in game)
        f0 -= LK
    GRIP = os.environ.get("GRIP")  # attack: <fbx>:<frame>:<in>:<out> slides the fist down the haft to that clip's grip (ANM_ATTACK_CRIT holds it from 1522), over the first <in>
    if GRIP:                        # frames, and back to the carry grip over the last <out>, like the model's own chop (1501->1522, 1546->1561); a fist under the head swung butt-first
        gf, gF, GIN, GOUT = GRIP.rsplit(":", 3); gF, GIN, GOUT = int(gF), int(GIN), int(GOUT); o3 = set(bpy.data.objects); bpy.ops.import_scene.fbx(filepath=gf); nw = set(bpy.data.objects) - o3
        b3 = next(o for o in nw if o.name.startswith("Bip001")); a3 = next(o for o in nw if o.type == 'ARMATURE' and o.name.startswith("Armature")); fs = sc.frame_current
        sc.frame_set(gF); bpy.context.view_layer.update(); AXHOLD = (b3.matrix_world @ b3.pose.bones["Bip001 R Hand"].matrix).inverted() @ (a3.matrix_world @ a3.pose.bones["Axe_1_Dummy"].matrix)
        for o in nw: bpy.data.objects.remove(o, do_unlink=True)
        _t = AXHOLD.translation.copy(); _t.z += float(os.environ.get("GRIPSLIDE", "0")); AXHOLD.translation = _t  # further down the haft, toward the butt (hand-local +z is the thumb side, where the head is)
        sc.frame_set(fs); print("GRIP carry", [round(x, 1) for x in AXREL.translation], "hold", [round(x, 1) for x in AXHOLD.translation])
    def grip(F):
        if not GRIP: return AXREL
        sm = lambda x: (lambda c: c * c * (3 - 2 * c))(min(1, max(0, x))); u = sm((F - f0) / GIN) * sm((f1 - F) / GOUT)
        l0, q0, s0 = AXREL.decompose(); return Matrix.LocRotScale(l0.lerp(AXHOLD.translation, u), q0, s0)
    def retarget(F):
        if LEAD and F < f0 + LK:
            t = (F - f0) / LK; t = t * t * (3 - 2 * t); A, B = WP, pose(mixo, f0 + LK)
            for o, m in MAP: setw(o, rot=A[0][o].slerp(B[0][o], t), loc=A[1].lerp(B[1], t) if o == "Pelvis" else None)
        else: pose(mixo, F)
        axa.pose.bones["Axe_1_Dummy"].matrix = axa.matrix_world.inverted() @ (bip.matrix_world @ bip.pose.bones["Bip001 R Hand"].matrix) @ grip(F); bpy.context.view_layer.update()
    print("MIXAMO", f0, f1, "K", round(K, 3))
FADE = os.environ.get("AXEFADE")  # death (TB-212 critic: the axe popped out between frames 2 and 3): fade it linearly over a:b instead
if FADE:
    fa, fb = map(int, FADE.split(":")); ma.surface_render_method = 'BLENDED'; abs_ = ma.node_tree.nodes["Principled BSDF"].inputs["Alpha"]
if os.environ.get("LOOP"): f1 -= 1
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = ORTHO
t = math.radians(float(os.environ.get("GAMECAM", "20"))); r = math.radians(float(os.environ.get("CAMROT", "0")))
cam.location = Matrix.Rotation(r, 3, "Z") @ Vector((-3.7 * math.cos(t), 0, 0.5 + 3.7 * math.sin(t))); cam.rotation_euler = Euler((math.pi / 2 - t, 0, -math.pi / 2 + r))
cam.location.z += float(os.environ.get("CAMZ", "0"))  # 0 = apply_anim's camera, so ANCHOR y = 256 + 240.56 / ORTHO like every actor
cam.location.y += float(os.environ.get("CAMY", "0"))  # attack (TB-212 critic fix): ANM_ATTACK_CRIT lunges ~1.1 m forward (-Y); shift the frame so the axe stays inside
sc.render.engine = "BLENDER_EEVEE"; sc.render.film_transparent = True
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.6, 0.65, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
for n, e, c, rot in (("sun", 3.5, (1, 0.93, 0.8), (40, 0, 20)), ("rim", 1.5, (0.8, 0.85, 1), (-60, 0, 200))):
    L = bpy.data.objects.new(n, bpy.data.lights.new(n, "SUN")); sc.collection.objects.link(L); L.data.energy = e; L.data.color = c; L.rotation_euler = Euler([math.radians(v) for v in rot])
sc.view_settings.view_transform = "Standard"; sc.eevee.taa_render_samples = 32
sc.render.resolution_x = sc.render.resolution_y = RES; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
os.makedirs(OUT, exist_ok=True); n = 0
TRACK = bool(os.environ.get("TRACK")); sc.frame_set(f0)
if MIX: retarget(f0)
bpy.context.view_layer.update(); bpy.context.view_layer.update(); P0 = bip.matrix_world @ bip.pose.bones["Bip001 Pelvis"].head; base = cam.location.copy()
DBGF = int(os.environ.get("DBGF", "0"))  # debug: render only the first DBGF frames
for i, F in enumerate(range(f0, f1 + 1)):
    if i % STEP or (DBGF and i >= DBGF): continue
    sc.frame_set(F)
    if MIX: retarget(F)
    if ARMFROM:
        pose, rel = IDLE[n % len(IDLE)]
        for b, m in pose.items(): bip.pose.bones[b].matrix_basis = m
        bpy.context.view_layer.update(); axa.pose.bones["Axe_1_Dummy"].matrix = axa.matrix_world.inverted() @ (bip.matrix_world @ bip.pose.bones["Bip001 R Hand"].matrix) @ rel
        bpy.context.view_layer.update()
    if FADE:
        al = min(1, max(0, (fb - n) / (fb - fa))); abs_.default_value = al
        for o in bpy.data.objects:
            if o.name.startswith("polySurface34"): o.hide_render = al <= 0
    if TRACK:  # death: the clip falls ~2 m backward; follow the pelvis along the ground so the body stays on its anchor
        c0 = cam.location.copy(); dv = bip.matrix_world @ bip.pose.bones["Bip001 Pelvis"].head - P0; cam.location = base + Vector((dv.x, dv.y, 0))
    if os.environ.get("GROUND"):  # death (TB-212 critic): the clip's knock-back lifts the whole body off the ground; drop the frame so the lowest point sits on it
        dg = bpy.context.evaluated_depsgraph_get(); lo = 1e9
        for o in bpy.data.objects:
            if o.type == 'MESH' and not o.name.startswith(("polySurface34", "Box001")) and not o.hide_render:  # body only: the axe haft can poke below; Box001 is a hidden helper pinned at z 0
                e = o.evaluated_get(dg); lo = min([lo] + [(e.matrix_world @ v.co).z for v in e.data.vertices])
        if lo > 0: cam.location.z = base.z + lo
        hz = (bip.matrix_world @ bip.pose.bones["Bip001 Head"].head).z - lo; pz = (bip.matrix_world @ bip.pose.bones["Bip001 Pelvis"].head).z - lo
        print("LO", n, round(lo, 3), "HEADZ", round(hz, 2), "PELZ", round(pz, 2))
    sc.render.filepath = f"{OUT}/{KEY}_{n}.png"; bpy.ops.render.render(write_still=True); n += 1
sc.frame_set(f0); cam.location = base; bpy.context.view_layer.update()
g = world_to_camera_view(sc, cam, Vector((0, 0, 0)))
print("ANCHOR %.2f %.2f" % (g.x * RES, (1 - g.y) * RES)); print("FRAMES", n, "range", f0, f1, "ortho", ORTHO)
