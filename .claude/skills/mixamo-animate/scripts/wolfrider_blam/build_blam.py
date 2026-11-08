# build_blam.py <fbx> <out.blend> : TB-210 wolf rider from blam's CC BY "Orc animation" (Orc_LightCavalry.fbx, one Bip001 rig: wolf + rider).
# Keeps one variant per part (env PARTS, comma-joined mesh names; everything else is deleted), plays the model's own clip (env CLIP:
# substring of the armature action, e.g. 03_run / 07_attack_A) unchanged, then scales the whole rig (root empty) so it stands HEIGHT m
# tall at frame 1 and sits with the wolf centred over the world origin on the ground, facing +X (env YAW deg about Z if needed).
# Textures are packed into the blend. No pose is edited: the clip is copied exactly.
import bpy, sys, os, math
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index("--") + 1:]
FBX, OUT = a[0], a[1]
PARTS = os.environ.get("PARTS", "").split(","); CLIP = os.environ.get("CLIP", "03_run")
HEIGHT = float(os.environ.get("HEIGHT", "0.82")); YAW = float(os.environ.get("YAW", "0"))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.fbx_import(filepath=FBX)   # Blender's ufbx importer: the legacy import_scene.fbx scrambles this rig's bind pose
sc = bpy.context.scene
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name not in PARTS: bpy.data.objects.remove(o, do_unlink=True)
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
act = [ac for ac in bpy.data.actions if CLIP in ac.name][0]   # one action per take; its slots drive the armature (and any animated empties)
for o in bpy.data.objects:
    if o.animation_data and o.animation_data.action and o.animation_data.action != act:
        sl = o.animation_data.action_slot; o.animation_data.action = act
        m = [x for x in act.slots if sl and x.identifier == sl.identifier]
        if m: o.animation_data.action_slot = m[0]
        print("SLOT", o.name, o.animation_data.action_slot.identifier if o.animation_data.action_slot else None)
f0, f1 = act.frame_range; sc.frame_start = int(round(f0)); sc.frame_end = int(math.floor(f1))
print("CLIP", act.name, f0, f1, "fps", sc.render.fps, sc.render.fps_base)
root = [o for o in bpy.data.objects if o.parent is None][0]
print("ROOT", root.name, root.type, [o.name for o in bpy.data.objects if o.parent is None])
def bounds():
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get(); p = []
    for o in bpy.data.objects:
        if o.type == 'MESH':
            e = o.evaluated_get(dg); p += [e.matrix_world @ v.co for v in e.data.vertices]
    return [min(v[i] for v in p) for i in range(3)], [max(v[i] for v in p) for i in range(3)]
sc.frame_set(sc.frame_start)
lo, hi = bounds(); s = float(os.environ["SCALE"]) if os.environ.get("SCALE") else HEIGHT / (hi[2] - lo[2]); print("SCALE", s)   # SCALE: share the run clip scale across clips
root.matrix_world = Matrix.Rotation(math.radians(YAW), 4, 'Z') @ Matrix.Scale(s, 4) @ root.matrix_world
lo, hi = bounds()
root.matrix_world = Matrix.Translation(Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))) @ root.matrix_world
lo, hi = bounds(); print("BOUNDS", [round(v, 3) for v in lo], [round(v, 3) for v in hi])
hd = arm.matrix_world @ arm.pose.bones["Bip001 Head001"].head; tl = arm.matrix_world @ arm.pose.bones["Bip001 Tail1"].head
print("WOLF head", [round(v, 3) for v in hd], "tail", [round(v, 3) for v in tl])
for mt in bpy.data.materials: print("MAT", mt.name)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=OUT)
