# TB-188d: render one Tripo camp building GLB from the field camera (GAMECAM 20, side-on from -X) with apply_anim.py's
# lights, transparent film, RES px. The model is turned by YAW (default -90: glTF front -Y faces the camera at -X), sat on
# z=0, centred, and scaled so its widest ground extent is WIDTH metres (levels grow 1.0 / 1.3 / 1.6). ORTHO is the same
# for every building so all share one pixel scale. Prints "ANCHOR x y" = ground point under the centre, in px.
# blender -b --factory-startup --python render_camp.py -- <in.glb> <out.png>   env: WIDTH, YAW, YAWS, ORTHO (2.2), RES (512), CAMROT
import bpy, math, os, sys
from mathutils import Euler, Vector, Matrix
a = sys.argv[sys.argv.index("--") + 1:]; src, out = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in sc.objects if o.type == "MESH"]
root = bpy.data.objects.new("root", None); sc.collection.objects.link(root)
for o in list(sc.objects):
    if o.parent is None and o is not root: o.parent = root
root.rotation_euler = Euler((0, 0, math.radians(float(os.environ.get("YAW", "-90"))))); bpy.context.view_layer.update()
def bbox():
    P = [o.matrix_world @ Vector(c) for o in ms for c in o.bound_box]
    return Vector([min(p[i] for p in P) for i in range(3)]), Vector([max(p[i] for p in P) for i in range(3)])
lo, hi = bbox(); s = float(os.environ.get("WIDTH", "1.3")) / max(hi.x - lo.x, hi.y - lo.y)
root.scale = (s, s, s); bpy.context.view_layer.update(); lo, hi = bbox()
root.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z); bpy.context.view_layer.update(); lo, hi = bbox()
print("DIMS", tuple(round(v, 3) for v in hi - lo))
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = float(os.environ.get("ORTHO", "2.2"))
t = math.radians(20); cam.location = (-3.7 * math.cos(t), 0, 0.85 + 3.7 * math.sin(t)); cam.rotation_euler = Euler((math.pi / 2 - t, 0, -math.pi / 2))
r_ = math.radians(float(os.environ.get("CAMROT", "0"))); cam.location = Matrix.Rotation(r_, 3, "Z") @ cam.location; cam.rotation_euler.z += r_
sc.render.engine = "BLENDER_EEVEE"; sc.render.film_transparent = True
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.6, 0.65, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3.5; sun.data.color = (1, 0.93, 0.8); sun.rotation_euler = Euler((math.radians(40), 0, math.radians(20)))
rim = bpy.data.objects.new("rim", bpy.data.lights.new("rim", "SUN")); sc.collection.objects.link(rim); rim.data.energy = 1.5; rim.data.color = (0.8, 0.85, 1); rim.rotation_euler = Euler((math.radians(-60), 0, math.radians(200)))
sc.view_settings.view_transform = "Standard"; sc.eevee.taa_render_samples = 32
for mt in bpy.data.materials:
    if mt.use_nodes:
        for nd in mt.node_tree.nodes:
            if nd.type == "BSDF_PRINCIPLED":
                nd.inputs["Roughness"].default_value = 1.0; nd.inputs["Metallic"].default_value = 0.0
                for k in ("Specular IOR Level", "Specular"):
                    if k in nd.inputs: nd.inputs[k].default_value = 0.0
                for l in list(nd.inputs["Roughness"].links) + list(nd.inputs["Metallic"].links): mt.node_tree.links.remove(l)
r = int(os.environ.get("RES", "512")); sc.render.resolution_x = sc.render.resolution_y = r
from bpy_extras.object_utils import world_to_camera_view as w2c
bpy.context.view_layer.update(); p = w2c(sc, cam, Vector((0, 0, 0))); print("ANCHOR", round(p.x * r, 2), round((1 - p.y) * r, 2))
if os.environ.get("YAWS"):  # turntable probe: one render per extra yaw (deg) to <out>_<yaw>.png, to find the model's front
    for y in os.environ["YAWS"].split(","):
        root.rotation_euler.z = math.radians(float(y)); sc.render.filepath = out[:-4] + f"_{y}.png"; bpy.ops.render.render(write_still=True)
else:
    sc.render.filepath = out; bpy.ops.render.render(write_still=True)
