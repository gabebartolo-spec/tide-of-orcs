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
TRACK = bool(os.environ.get("TRACK")); sc.frame_set(f0); bpy.context.view_layer.update(); P0 = bip.matrix_world @ bip.pose.bones["Bip001 Pelvis"].head; base = cam.location.copy()
for i, F in enumerate(range(f0, f1 + 1)):
    if i % STEP: continue
    sc.frame_set(F)
    if TRACK:  # death: the clip falls ~2 m backward; follow the pelvis along the ground so the body stays on its anchor
        c0 = cam.location.copy(); dv = bip.matrix_world @ bip.pose.bones["Bip001 Pelvis"].head - P0; cam.location = base + Vector((dv.x, dv.y, 0))
    if os.environ.get("GROUND"):  # death (TB-212 critic): the clip's knock-back lifts the whole body off the ground; drop the frame so the lowest point sits on it
        dg = bpy.context.evaluated_depsgraph_get(); lo = 1e9
        for o in bpy.data.objects:
            if o.type == 'MESH' and not o.name.startswith(("polySurface34", "Box001")) and not o.hide_render:  # body only: the axe haft can poke below; Box001 is a hidden helper pinned at z 0
                e = o.evaluated_get(dg); lo = min([lo] + [(e.matrix_world @ v.co).z for v in e.data.vertices])
        if lo > 0: cam.location.z = base.z + lo
        print("LO", n, round(lo, 3))
    if os.environ.get("AXEHIDE"):  # death (TB-212 critic): from this frame the clip throws the axe free and it stands through the body; drop it from the render
        for o in bpy.data.objects:
            if o.name.startswith("polySurface34"): o.hide_render = n >= int(os.environ["AXEHIDE"])
    sc.render.filepath = f"{OUT}/{KEY}_{n}.png"; bpy.ops.render.render(write_still=True); n += 1
sc.frame_set(f0); cam.location = base; bpy.context.view_layer.update()
g = world_to_camera_view(sc, cam, Vector((0, 0, 0)))
print("ANCHOR %.2f %.2f" % (g.x * RES, (1 - g.y) * RES)); print("FRAMES", n, "range", f0, f1, "ortho", ORTHO)
