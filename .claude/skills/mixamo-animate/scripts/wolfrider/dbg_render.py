# dbg_render.py <blend> <outprefix>: bind pose, verts coloured by owning bone (arm bones by distance bin), 3 ortho views on the rider
import bpy, sys, math
from mathutils import Vector, Euler
a=sys.argv[sys.argv.index("--")+1:]; BLEND,OUT=a[0],a[1]
bpy.ops.wm.open_mainfile(filepath=BLEND)
sc=bpy.context.scene
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]; arm.data.pose_position='REST'
ob=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)][0]
me=ob.data; names={g.index:g.name for g in ob.vertex_groups}
def seg_dist(p,a,b):
    ab=b-a; t=max(0,min(1,(p-a).dot(ab)/ab.length_squared)); return (p-(a+ab*t)).length
B={n:(arm.matrix_world@arm.data.bones[n].head_local, arm.matrix_world@arm.data.bones[n].tail_local) for n in ("R_LArm","R_LForeArm","R_LHand")}
col=me.color_attributes.new("dbg",'FLOAT_COLOR','POINT')
for i,v in enumerate(me.vertices):
    p=ob.matrix_world@v.co
    gs=sorted(((g.weight,names[g.group]) for g in v.groups),reverse=True)
    own=gs[0][1] if gs else "-"
    c=(0.5,0.5,0.5)
    if own.startswith("tripo::") or own.startswith("bone_"): c=(0.25,0.25,0.25)
    elif own=="R_LArm": c=(1,0,0)
    elif own=="R_LForeArm":
        d=seg_dist(p,*B[own]); c=(0,1,0) if d<0.05 else ((1,1,0) if d<0.07 else (1,0,1))
    elif own=="R_LHand":
        if p.z>0.58 or p.z<0.50: c=(0.2,0.2,0.9)
        else:
            d=seg_dist(p,*B[own]); c=(0,0.6,1) if d<0.06 else (0,1,1)
    elif own=="R_LShoulder": c=(1,0.5,0)
    col.data[i].color=(*c,1)
mat=bpy.data.materials.new("dbg"); mat.use_nodes=True; nt=mat.node_tree
for n in list(nt.nodes): nt.nodes.remove(n)
at=nt.nodes.new("ShaderNodeAttribute"); at.attribute_name="dbg"
em=nt.nodes.new("ShaderNodeEmission"); out=nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(at.outputs["Color"],em.inputs["Color"]); nt.links.new(em.outputs[0],out.inputs[0])
me.materials.clear(); me.materials.append(mat)
for o in list(bpy.data.objects):
    if o.type in ('CAMERA','LIGHT'): bpy.data.objects.remove(o,do_unlink=True)
cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type="ORTHO"; cam.data.ortho_scale=0.45
sc.render.engine="BLENDER_EEVEE"; sc.render.film_transparent=False; sc.render.resolution_x=sc.render.resolution_y=600
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[0].default_value=(0,0,0,1)
sc.view_settings.view_transform="Standard"
C=Vector((0.06,0.06,0.55)); D=3
views={"front":(C+Vector((D,0,0)),Euler((math.pi/2,0,math.pi/2))),"side":(C+Vector((0,D,0)),Euler((math.pi/2,0,math.pi))),
       "top":(C+Vector((0,0,D)),Euler((0,0,-math.pi/2))),"back":(C+Vector((-D,0,0)),Euler((math.pi/2,0,-math.pi/2)))}
for vn,(loc,rot) in views.items():
    cam.location=loc; cam.rotation_euler=rot; sc.render.filepath=f"{OUT}_{vn}.png"; bpy.ops.render.render(write_still=True)
print("DBG done")
