import bpy, sys, os
a=sys.argv[sys.argv.index("--")+1:]; F=a[0]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=F)
b=bpy.data.objects["Bip001"]; A=bpy.data.objects["Armature"]; sc=bpy.context.scene
ac=b.animation_data.action; f0,f1=map(int,ac.frame_range)
for o in bpy.data.objects:
    if o.type=='MESH': print("MAT",o.name,o.parent_type,[ (m.name,[n.image.filepath for n in m.node_tree.nodes if n.type=='TEX_IMAGE']) for m in o.data.materials if m])
for f in range(f0,f1+1,5):
    sc.frame_set(f); P=b.pose.bones
    pw=b.matrix_world@P["Bip001 Pelvis"].head; hd=b.matrix_world@P["Bip001 Head"].head; rh=b.matrix_world@P["Bip001 R Hand"].head; lf=b.matrix_world@P["Bip001 L Foot"].head
    ax=A.matrix_world@A.pose.bones["Axe_1_Dummy"].head
    print("F",f,"pel",tuple(round(x,2) for x in pw),"head",tuple(round(x,2) for x in hd),"rh",tuple(round(x,2) for x in rh),"axe",tuple(round(x,2) for x in ax),"lf",tuple(round(x,2) for x in lf))
