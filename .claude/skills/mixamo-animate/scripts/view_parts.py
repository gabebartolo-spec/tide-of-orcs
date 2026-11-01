# Workbench renders of each mesh object alone (body / wpn_*) from the character's right (-X) and front (-Y). Args: in.blend out_prefix
import bpy, sys, os, math
from mathutils import Vector, Euler
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = os.environ.get("COL", "MATERIAL"); sc.render.resolution_x = sc.render.resolution_y = 600
sc.render.film_transparent = False; sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.49, 0.59, 0.46)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = "ORTHO"; cam.data.ortho_scale = float(os.environ.get("S", "1.15")); C = Vector([float(x) for x in os.environ.get("C", "0,0,0.49").split(",")])
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
for o in meshes:
    for p in meshes: p.hide_render = p is not o
    for name, ang in (("right", 90), ("front", 0)):
        r = math.radians(ang); cam.location = C + Vector((-5 * math.sin(r), -5 * math.cos(r), 0)); cam.rotation_euler = Euler((math.pi / 2, 0, -r))
        sc.render.filepath = f"{a[1]}_{o.name}_{name}.png"; bpy.ops.render.render(write_still=True)
