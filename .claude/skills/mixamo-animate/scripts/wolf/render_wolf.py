# TB-160 companion wolf (blam's CC BY Sketchfab wolf, retextured from our Meshy wolf), moved into the repo for TB-253 from
# C:/Users/DANTE/meshy/20261102_172807_wolf_c071/render_wolf.py; camera, ortho and frames unchanged.
# Usage: blender -b --factory-startup --python render_wolf.py -- <clip run|attack> <game|front> <out prefix> [retex.glb]
#   env RES (512 for the sheet), WOLFGLTF (the Sketchfab scene.gltf), LIT etc. as lit_render.py. Writes <prefix>_<i>.png.
# Sheet: wolf = clip run (0-19, 20 frames), wolf.attack = clip attack (0-32, 33 frames); anchor printed as ANCHOR x y.
import bpy, sys, math, os, mathutils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); import lit_render  # TB-253 (env LIT)
args = sys.argv[sys.argv.index('--') + 1:]; clip, camk, out = args[:3]; retex = args[3] if len(args) > 3 else None
M = "C:/Users/DANTE/meshy/20261102_172807_wolf_c071"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.environ.get("WOLFGLTF", M + "/sketchfab_wolf/x/scene.gltf"))
bpy.data.objects.remove(bpy.data.objects["Icosphere"])
me = bpy.data.objects["Object_8"]; arm = bpy.data.objects["Object_5"]
if retex:
    bpy.ops.import_scene.gltf(filepath=retex)
    new = [o for o in bpy.context.selected_objects if o.type == 'MESH'][0]
    img = [n.image for n in new.active_material.node_tree.nodes if n.type == 'TEX_IMAGE'][0]
    for n in me.active_material.node_tree.nodes:
        if n.type == 'TEX_IMAGE' and 'base' in (n.image.name.lower() + n.label.lower()) or (n.type == 'TEX_IMAGE' and len([x for x in me.active_material.node_tree.nodes if x.type == 'TEX_IMAGE']) == 1): n.image = img
    for o in list(bpy.context.selected_objects): bpy.data.objects.remove(o)
act = bpy.data.actions[[a.name for a in bpy.data.actions if a.name.split('_')[0] == clip or a.name == clip][0]]
arm.animation_data.action = act
f0, f1 = [int(x) for x in act.frame_range]
sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x = sc.render.resolution_y = int(os.environ.get('RES', '512'))
sc.render.film_transparent = True
w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0x7c / 255, 0x96 / 255, 0x76 / 255)
sc.view_settings.view_transform = 'Standard'
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 0.07  # the gltf is 1/100 scale
bb = [me.matrix_world @ mathutils.Vector(c) for c in me.bound_box]; c = sum(bb, mathutils.Vector()) / 8
if os.environ.get("FACE") == "left":  # TB-253: the wolf turned to face screen-left under the same camera-space sun (never mirror a lit sheet)
    T = mathutils.Matrix.Translation(c) @ mathutils.Matrix.Rotation(math.pi, 4, 'Z') @ mathutils.Matrix.Translation(-c)
    for o in [o for o in bpy.data.objects if o.parent is None]: o.matrix_world = T @ o.matrix_world
    bpy.context.view_layer.update()
if camk == 'game': d = mathutils.Vector((-1, 0, math.tan(math.radians(20)))); cam.rotation_euler = (math.radians(70), 0, math.radians(-90))
else: d = mathutils.Vector((0, -1, 0)); cam.rotation_euler = (math.radians(90), 0, 0)
cam.location = c + d.normalized() * 1.0
L = bpy.data.objects.new("l", bpy.data.lights.new("l", 'SUN')); sc.collection.objects.link(L); L.rotation_euler = (0.9, 0, -1.2); L.data.energy = 3
sc.frame_set(f0); dg = bpy.context.evaluated_depsgraph_get(); ev = me.evaluated_get(dg); gz = min((ev.matrix_world @ v.co).z for v in ev.data.vertices)
if lit_render.on():  # TB-253: the actors' world and rim (apply_anim.py), ground catcher at the wolf's lowest vertex
    w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.6, 0.65, 1)
    rim = bpy.data.objects.new("rim", bpy.data.lights.new("rim", "SUN")); sc.collection.objects.link(rim); rim.data.energy = 1.5; rim.data.color = (0.8, 0.85, 1)
    rim.rotation_euler = mathutils.Euler((math.radians(-60), 0, math.radians(200)))
    os.environ.setdefault("LITZ", str(gz)); lit_render.setup(sc, cam)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
for i, f in enumerate(range(f0, f1 + 1)):
    sc.frame_set(f); p = f"{out}_{i}.png"; sc.render.filepath = p; bpy.ops.render.render(write_still=True); lit_render.mask(sc, p)
print("FRAMES", f0, f1, act.name)
from bpy_extras.object_utils import world_to_camera_view
g = world_to_camera_view(sc, cam, mathutils.Vector((c.x, c.y, gz))); R = sc.render.resolution_x
print("ANCHOR %.2f %.2f" % (g.x * R, (1 - g.y) * R))
