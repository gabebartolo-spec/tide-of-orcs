import os
"""Render a front close-up of the head. Args: <in.fbx|.blend> <out.png>."""
import bpy, sys, mathutils
a = sys.argv[sys.argv.index("--") + 1:]
src, out = a[0], a[1]
if src.endswith(".fbx"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=src, use_image_search=False)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from relink import relink; relink(src)
else:
    bpy.ops.wm.open_mainfile(filepath=src)
sc = bpy.context.scene
meshes = [o for o in sc.objects if o.type == "MESH"]
pts = [o.matrix_world @ mathutils.Vector(c) for o in meshes for c in o.bound_box]
zmax = max(p.z for p in pts); zmin = min(p.z for p in pts)
h = zmax - zmin
head = None
for o in sc.objects:
    if o.type == "ARMATURE":
        for b in o.data.bones:
            if b.name.lower().endswith("head"):
                head = o.matrix_world @ b.head_local
# top of the head = highest vertex near the body's centre line (ignores spears and raised blades)
# same framing as face_copy.py (vertex mean), so pixel boxes measured here carry over
W = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
cx = sum(p.x for p in W) / len(W)
top = max(p.z for p in W if abs(p.x - cx) < 0.04 * h)
cz = top - 0.09 * h
print("HEAD", head, "h", h)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
import math, os
yaw = math.radians(float(os.environ.get("YAW", "0")))  # orbit around the head (env YAW deg)
if os.environ.get("FULL"):  # whole body instead of the head
    cz = (zmax + zmin) / 2; scale = 1.1 * h
else:
    scale = 0.22 * h
cam.data.type = "ORTHO"; cam.data.ortho_scale = scale
cam.location = (cx + 5 * math.sin(yaw), -5 * math.cos(yaw), cz); cam.rotation_euler = (1.5708, 0, yaw)
sc.camera = cam
l = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
l.data.energy = 3; l.rotation_euler = (0.9, 0, 0.3); sc.collection.objects.link(l)
sc.world = sc.world or bpy.data.worlds.new("w")
sc.world.color = (0.5, 0.5, 0.5)
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x = sc.render.resolution_y = 512
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
