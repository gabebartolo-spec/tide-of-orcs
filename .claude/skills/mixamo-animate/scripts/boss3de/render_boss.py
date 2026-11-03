# TB-214 Warboss: 3DE_Study "Orc Model Rigged Packed Resources" (Sketchfab, CC BY). Plays the .blend's own actions
# (walking 1-35, punch 1-31, death 1-96) unchanged and renders each frame from the field camera (GAMECAM deg above the
# ground, ortho, camera on -Y so +X is screen-right). The model faces -Y; YAW 90 turns it to +X (pack_sprites mirrors orcs).
# Env: YAW (deg, default 90; death plays from a model turned a quarter so its first frame matches the walk), STEP (frame step), VIEW=game|front, GAMECAM, ORTHO, RES, CZ (camera aim height, m), CX (aim x).
# Usage: blender -b <blend> --python render_boss.py -- <action> <first> <last> <outdir> <key>
# Prints ANCHOR <x px> <y px> = the ground under the rig origin in the image (for anchors.json).
import bpy, math, sys, os
from mathutils import Vector, Euler
from bpy_extras.object_utils import world_to_camera_view
a = sys.argv[sys.argv.index("--") + 1:]
ACT, F0, F1, OUT, KEY = a[0], int(a[1]), int(a[2]), a[3], a[4]
VIEW = os.environ.get("VIEW", "game"); RES = int(os.environ.get("RES", "512")); ORTHO = float(os.environ.get("ORTHO", "2.6"))
T = math.radians(float(os.environ.get("GAMECAM", "20"))); CZ = float(os.environ.get("CZ", "0.75")); CX = float(os.environ.get("CX", "0"))
sc = bpy.context.scene
arm = bpy.data.objects["Armature"]
arm.animation_data.action = bpy.data.actions[ACT]
for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
piv = bpy.data.objects.new("piv", None); sc.collection.objects.link(piv); arm.parent = piv; piv.rotation_euler.z = math.radians(float(os.environ.get("YAW", "90")))
for o in list(sc.objects):
    if o.type in ("CAMERA", "LIGHT"): bpy.data.objects.remove(o)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = ORTHO; C = Vector((CX, 0, CZ)); D = 6
if VIEW == "game":
    cam.location = C + Vector((0, -D * math.cos(T), D * math.sin(T))); cam.rotation_euler = Euler((math.pi / 2 - T, 0, 0))
else:  # front: facing the orc's face (+X)
    cam.location = C + Vector((D, 0, 0)); cam.rotation_euler = Euler((math.pi / 2, 0, math.pi / 2))
def sun(name, d, energy, color):
    L = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); sc.collection.objects.link(L); L.data.energy = energy; L.data.color = color
    L.rotation_euler = Vector(d).normalized().to_track_quat('-Z', 'Y').to_euler()
sun("sun", (-0.60, 0.22, -0.77), 3.5, (1, 0.93, 0.8)); sun("rim", (-0.82, 0.30, -0.5), 1.5, (0.8, 0.85, 1))
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
sc.render.engine = "BLENDER_EEVEE"; sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = RES; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
sc.view_settings.view_transform = "Standard"
bpy.context.view_layer.update()
p = world_to_camera_view(sc, cam, Vector((0, 0, 0))); print(f"ANCHOR {p.x * RES:.2f} {(1 - p.y) * RES:.2f}")
os.makedirs(OUT, exist_ok=True)
STEP = int(os.environ.get("STEP", "1"))
for i, f in enumerate(range(F0, F1 + 1, STEP)):
    sc.frame_set(f); sc.render.filepath = os.path.join(OUT, f"{KEY}_{i}.png"); bpy.ops.render.render(write_still=True)
print("DONE", KEY, len(range(F0, F1 + 1, STEP)))
