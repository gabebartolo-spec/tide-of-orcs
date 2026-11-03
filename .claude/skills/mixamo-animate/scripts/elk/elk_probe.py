# TB-208: list the elk gltf's objects, armature and actions (frame ranges) so the graze/idle clips can be picked.
import bpy, sys
p = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=p)
for o in bpy.data.objects: print("OBJ", o.name, o.type, o.parent.name if o.parent else "-", tuple(round(v,3) for v in o.dimensions), o.animation_data.action.name if o.animation_data and o.animation_data.action else "")
for a in bpy.data.actions: print("ACT", a.name, tuple(a.frame_range), len(a.fcurves) if hasattr(a,"fcurves") else "")
arm = next((o for o in bpy.data.objects if o.type=="ARMATURE"), None)
if arm:
    print("BONES", len(arm.data.bones), [b.name for b in arm.data.bones][:80])
    ad = arm.animation_data; print("NLA", [(t.name, [(s.name, s.action.name, s.frame_start, s.frame_end) for s in t.strips]) for t in ad.nla_tracks] if ad else None)
print("FPS", bpy.context.scene.render.fps)
