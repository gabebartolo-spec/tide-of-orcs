# TB-208 check: play one elk clip and render frames from the camp camera angle (20 deg down, side) and from the front.
# blender -b --factory-startup --python elk_look.py -- <scene.gltf> <action> <out dir> <step>
import bpy, sys, math, os
from mathutils import Vector, Euler
a = sys.argv[sys.argv.index("--") + 1:]; p, act, out, step = a[0], a[1], a[2], int(a[3]); os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene; bpy.ops.import_scene.gltf(filepath=p)
for o in list(bpy.data.objects):
    if o.name == "Icosphere": bpy.data.objects.remove(o)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE"); ad = arm.animation_data
for t in ad.nla_tracks: t.mute = True
A = bpy.data.actions[act]; ad.action = A
if hasattr(ad, "action_suitable_slots") and ad.action_slot is None and len(ad.action_suitable_slots): ad.action_slot = ad.action_suitable_slots[0]
print("SLOT", getattr(ad, "action_slot", None))
f0, f1 = map(int, A.frame_range)
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = 3.2
sun = bpy.data.objects.new("s", bpy.data.lights.new("s", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3.5; sun.rotation_euler = Euler((0.6, 0, 0.5))
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
sc.render.engine = "BLENDER_EEVEE"; sc.render.resolution_x = 400; sc.render.resolution_y = 300; sc.render.film_transparent = False
views = {"game": Euler((math.pi/2 - math.radians(20), 0, -math.pi/2)), "front": Euler((math.pi/2, 0, math.pi))}
for f in range(f0, f1 + 1, step):
    sc.frame_set(f)
    for vn, e in views.items():
        cam.rotation_euler = e; d = e.to_matrix() @ Vector((0, 0, 1)); cam.location = Vector((0, 0, 0.8)) + d * 20
        sc.render.filepath = os.path.join(out, f"{vn}_{f:04d}.png"); bpy.ops.render.render(write_still=True)
print("DONE", f0, f1)
