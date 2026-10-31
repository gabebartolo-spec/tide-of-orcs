# Import a rigged Tripo FBX into an empty scene and save it as a .blend. Args: in.fbx out.blend
import bpy, sys
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=a[0])
for o in bpy.data.objects: print("OBJ", o.type, o.name, [round(x, 3) for x in o.dimensions])
bpy.ops.wm.save_as_mainfile(filepath=a[1])
