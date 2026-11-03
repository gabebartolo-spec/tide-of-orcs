import bpy, sys
a=sys.argv[sys.argv.index("--")+1:]; bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.fbx(filepath=a[0]); sc=bpy.context.scene
ms=[o for o in bpy.data.objects if o.type=='MESH']; print("MESH",[(o.name,len(o.data.vertices),[m.type for m in o.modifiers],o.parent and o.parent.name) for o in ms])
for F in range(1701,1732,3):
    sc.frame_set(F); dg=bpy.context.evaluated_depsgraph_get()
    print("F",F,[(o.name,round(min((o.evaluated_get(dg).matrix_world@v.co).z for v in o.evaluated_get(dg).data.vertices),2)) for o in ms])
