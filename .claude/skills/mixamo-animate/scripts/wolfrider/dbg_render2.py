# dbg_render2.py <blend> <outprefix>: bind pose zooms (fist, lap) textured + ownership colours; seam stats for capsule limits
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
co=[ob.matrix_world@v.co for v in me.vertices]
own=[]
for v in me.vertices:
    gs=sorted(((g.weight,names[g.group]) for g in v.groups),reverse=True); own.append(gs[0][1] if gs else "-")
col=me.color_attributes.new("dbg",'FLOAT_COLOR','POINT')
for i,v in enumerate(me.vertices):
    p=co[i]; o=own[i]; c=(0.5,0.5,0.5)
    if o.startswith("tripo::") or o.startswith("bone_"): c=(0.25,0.25,0.25)
    elif o=="R_LArm": c=(1,0,0)
    elif o=="R_LForeArm":
        d=seg_dist(p,*B[o]); c=(0,1,0) if d<0.05 else ((1,1,0) if d<0.07 else (1,0,1))
    elif o=="R_LHand":
        if p.z>0.58 or p.z<0.50: c=(0.2,0.2,0.9)
        else:
            d=seg_dist(p,*B[o]); c=(0,0.6,1) if d<0.06 else ((0,1,1) if d<0.075 else (1,0.3,1))
    elif o=="R_LShoulder": c=(1,0.5,0)
    col.data[i].color=(*c,1)
# seam stats under proposed capsule limits
for rf in (0.055,0.07):
    armv=set(i for i in range(len(co)) if (own[i]=="R_LForeArm" and seg_dist(co[i],*B["R_LForeArm"])<rf) or (own[i]=="R_LHand" and (co[i].z>0.58 or co[i].z<0.50 or seg_dist(co[i],*B["R_LHand"])<0.075)) or own[i]=="R_LArm")
    seam=[e for e in me.edges if (e.vertices[0] in armv)!=(e.vertices[1] in armv) and not any(own[e.vertices[k]].startswith(("tripo::","bone_")) for k in (0,1))]
    pts=[co[v] for e in seam for v in e.vertices if v not in armv]
    if pts: print("SEAM rf=%.3f edges=%d torso-side verts bbox x %.2f..%.2f y %.2f..%.2f z %.2f..%.2f"%(rf,len(seam),min(p.x for p in pts),max(p.x for p in pts),min(p.y for p in pts),max(p.y for p in pts),min(p.z for p in pts),max(p.z for p in pts)))
orig_mats=[m for m in me.materials]
mat=bpy.data.materials.new("dbg"); mat.use_nodes=True; nt=mat.node_tree
for n in list(nt.nodes): nt.nodes.remove(n)
at=nt.nodes.new("ShaderNodeAttribute"); at.attribute_name="dbg"
em=nt.nodes.new("ShaderNodeEmission"); out=nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(at.outputs["Color"],em.inputs["Color"]); nt.links.new(em.outputs[0],out.inputs[0])
for o in list(bpy.data.objects):
    if o.type in ('CAMERA','LIGHT'): bpy.data.objects.remove(o,do_unlink=True)
cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type="ORTHO"
def sun(name,d,energy):
    L=bpy.data.objects.new(name,bpy.data.lights.new(name,"SUN")); sc.collection.objects.link(L); L.data.energy=energy
    L.rotation_euler=Vector(d).normalized().to_track_quat('-Z','Y').to_euler()
sun("s1",(-0.6,0.3,-0.7),3); sun("s2",(0.6,-0.3,-0.7),2); sun("s3",(0,0,-1),1.5)
sc.render.engine="BLENDER_EEVEE"; sc.render.film_transparent=False; sc.render.resolution_x=sc.render.resolution_y=500
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[0].default_value=(0.1,0.1,0.1,1)
sc.view_settings.view_transform="Standard"
D=3
zooms={"fist":(Vector((0.16,0.08,0.55)),0.22),"lap":(Vector((0.05,0.08,0.52)),0.28)}
views={"front":(Vector((D,0,0)),Euler((math.pi/2,0,math.pi/2))),"side":(Vector((0,D,0)),Euler((math.pi/2,0,math.pi))),"top":(Vector((0,0,D)),Euler((0,0,-math.pi/2)))}
for zn,(C,osc) in zooms.items():
    cam.data.ortho_scale=osc
    for vn,(off,rot) in views.items():
        cam.location=C+off; cam.rotation_euler=rot
        for pn,mats in (("tex",orig_mats),("own",[mat]*len(orig_mats))):
            for k,m in enumerate(mats): me.materials[k]=m
            sc.render.filepath=f"{OUT}_{zn}_{vn}_{pn}.png"; bpy.ops.render.render(write_still=True)
print("DBG2 done")
