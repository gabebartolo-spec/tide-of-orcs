# render_own.py <outprefix> (TB-214): render a model's OWN baked action (no retarget) from the field camera.
# blender -b --factory-startup <model.blend> --python render_own.py -- <prefix>   env ACT=<action> FR=a-b GAMECAM(20) CAMROT ORTHO CZ RES PROBE=1
# Camera, lights and flat materials copy apply_anim.py; prints ANCHOR x y (ground under the rig origin, image px) for anchors.json.
import bpy, sys, os, math
from mathutils import Euler, Vector, Matrix as _M
out = sys.argv[sys.argv.index("--") + 1]; sc = bpy.context.scene
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
arm.animation_data_create(); arm.animation_data.action = bpy.data.actions[os.environ["ACT"]]
if hasattr(arm.animation_data, "action_slot") and arm.animation_data.action.slots: arm.animation_data.action_slot = arm.animation_data.action.slots[0]
a, b = map(int, os.environ["FR"].split("-")); hips = arm.pose.bones["mixamorig:Hips"]
sc.frame_set(a); h0 = arm.matrix_world @ hips.head
if os.environ.get("PROBE"):
    for f in range(a, b + 1):
        sc.frame_set(f); h = arm.matrix_world @ hips.head
        zs = [ (o.matrix_world @ Vector(c)).z for o in bpy.data.objects if o.type=='MESH' and not o.hide_render for c in o.bound_box]
        print("P", f, tuple(round(x, 3) for x in h), "top", round(max(zs), 3), "bot", round(min(zs), 3))
    sys.exit(0)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = float(os.environ.get("ORTHO", "2.4"))
_r = math.radians(float(os.environ.get("CAMROT", "0"))); _t = math.radians(float(os.environ.get("GAMECAM", "20")))
CZ = float(os.environ.get("CZ", "0.5"))
cam.location = (-3.7 * math.cos(_t), 0, CZ + 3.7 * math.sin(_t)); cam.rotation_euler = Euler((math.pi / 2 - _t, 0, -math.pi / 2))
cam.location = _M.Rotation(_r, 3, "Z") @ cam.location; cam.rotation_euler.z += _r
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
for o in bpy.data.objects:
    if o.name in os.environ.get("HIDE", "").split(","): o.hide_render = True
sc.render.resolution_x = sc.render.resolution_y = int(os.environ.get("RES", "360"))
from bpy_extras.object_utils import world_to_camera_view as _w2c
bpy.context.view_layer.update(); _p = _w2c(sc, cam, arm.matrix_world @ Vector((0, 0, 0))); print("ANCHOR", round(_p.x * sc.render.resolution_x, 2), round((1 - _p.y) * sc.render.resolution_y, 2))
for i, f in enumerate(range(a, b + 1)):
    sc.frame_set(f)
    sc.render.filepath = f"{out}_{i}.png"; bpy.ops.render.render(write_still=True)
