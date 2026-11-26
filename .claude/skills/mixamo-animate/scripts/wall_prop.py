# TB-250 wall cosmetics: one Tripo prop (wall_lanterns, wall_skulls: tide-assets/cosmetics/<id>.glb, its front yaw in yaws.json)
# rendered on its own for the field's wall, at the wall art's pitch (WALL_VIEW, 30 degrees), ortho, under lit_render (the wall's
# upper-left sun), Cycles, no ground (it hangs on or sits on a wall post). Writes <out>/<name>.png and <out>/<name>.json: image size,
# the lowest point (`foot`: the skull's stake tip) and the highest point (`top`: the lantern bracket's top) in px, px per metre.
# LIT=1 NOGROUND=1 blender -b --factory-startup --python wall_prop.py -- <out dir> <name> [px]
import bpy, math, os, sys, json
from mathutils import Vector, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lit_render
from bpy_extras.object_utils import world_to_camera_view as w2c

a = sys.argv[sys.argv.index("--") + 1:]
out, name = a[0], a[1]; PX = int(a[2]) if len(a) > 2 else 1000
COSM = r"C:\Users\DANTE\Documents\tide-assets\cosmetics"
PITCH = 30.0
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(COSM, name + ".glb"))
yaw = float(os.environ.get("YAW", json.load(open(os.path.join(COSM, "yaws.json")))[name]))   # YAW=-90 for the lantern: its bracket behind it
roots = [o for o in sc.objects if o.parent is None]
piv = bpy.data.objects.new("piv", None); sc.collection.objects.link(piv)
for o in roots: o.parent = piv
piv.rotation_euler.z = math.radians(yaw)
for o in sc.objects:                                  # matte, like the wall and the camp props
    for sl in getattr(o, "material_slots", []):
        mt = sl.material
        for nd in (mt.node_tree.nodes if mt and mt.node_tree else []):
            if nd.type == "BSDF_PRINCIPLED":
                for l in list(nd.inputs["Roughness"].links) + list(nd.inputs["Metallic"].links): mt.node_tree.links.remove(l)
                nd.inputs["Roughness"].default_value = 0.9; nd.inputs["Metallic"].default_value = 0.0
bpy.context.view_layer.update()
ms = [o for o in sc.objects if o.type == "MESH"]
V = [o.matrix_world @ v.co for o in ms for v in o.data.vertices]
lo = min(V, key=lambda p: p.z); hi = max(V, key=lambda p: p.z)

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
t = math.radians(PITCH); cam.data.type = "ORTHO"; cam.data.clip_end = 100
cam.rotation_euler = Euler((math.pi / 2 - t, 0, -math.pi / 2)); bpy.context.view_layer.update()
R = cam.matrix_world.to_3x3(); L = [R.transposed() @ p for p in V]
x0, x1 = min(p.x for p in L), max(p.x for p in L); y0, y1 = min(p.y for p in L), max(p.y for p in L)
wv, hv = (x1 - x0) * 1.06, (y1 - y0) * 1.06
cam.location = R @ Vector(((x0 + x1) / 2, (y0 + y1) / 2, 30)); cam.data.ortho_scale = max(wv, hv)
cam.data.sensor_fit = "VERTICAL" if hv >= wv else "HORIZONTAL"
sc.render.resolution_y = PX; sc.render.resolution_x = max(8, round(PX * wv / hv))
w = bpy.data.worlds.new("sky"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.8, 0.85, 1)
lit_render.setup(sc, cam)
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
sc.render.filepath = os.path.join(out, name + ".png"); bpy.ops.render.render(write_still=True)
def px(v): q = w2c(sc, cam, v); return [q.x * sc.render.resolution_x, (1 - q.y) * sc.render.resolution_y]
json.dump({"w": sc.render.resolution_x, "h": sc.render.resolution_y, "foot": px(lo), "top": px(hi),
           "pxPerUnit": (sc.render.resolution_y if hv >= wv else sc.render.resolution_x) / cam.data.ortho_scale},
          open(os.path.join(out, name + ".json"), "w"))
print("DONE", name)
