# weapon_options.py <Orc_LightCavalry.fbx> <outdir>: TB-210 renders every blam weapon on the rider (run f8, attack f20, axe-side game camera).
import bpy,sys,os,math
from mathutils import Vector,Matrix,Euler
a=sys.argv[sys.argv.index("--")+1:]; FBX,OUT=a[0],a[1]; os.makedirs(OUT,exist_ok=True)
BASE="ORC_Units_Body_A,ORC_Units_Head_A,ORC_Units_Arms_A,ORC_Units_Legs_A,ORC_Units_Shoulderpads_A,Wolf".split(",")
WEAP=["ORC_Units_Axe","ORC_Units_Hatchet","ORC_Units_Hammer","ORC_Units_Mace","ORC_Units_Sword","ORC_Units_Dagger","ORC_Units_Staff_A","ORC_Units_Staff_B","ORC_Units_Staff_C"]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.wm.fbx_import(filepath=FBX); sc=bpy.context.scene
for o in list(bpy.data.objects):
    if o.type=='MESH' and o.name not in BASE+WEAP: bpy.data.objects.remove(o,do_unlink=True)
for o in bpy.data.objects:
    if o.type=='MESH': print("PAR",o.name,o.parent.name if o.parent else None,o.parent_bone,[m.type for m in o.modifiers],len(o.vertex_groups))
acts={k:[x for x in bpy.data.actions if k in x.name][0] for k in ("03_run","07_attack_A")}
def setact(act):
    for o in bpy.data.objects:
        ad=o.animation_data
        if ad and ad.action:
            sl=ad.action_slot; ad.action=act; m=[x for x in act.slots if sl and x.identifier==sl.identifier]
            if m: ad.action_slot=m[0]
root=[o for o in bpy.data.objects if o.parent is None][0]
setact(acts["03_run"]); sc.frame_set(1)
root.matrix_world=Matrix.Rotation(math.radians(90),4,'Z')@Matrix.Scale(41.745,4)@root.matrix_world
bpy.context.view_layer.update()
dg=bpy.context.evaluated_depsgraph_get(); p=[]
for o in bpy.data.objects:
    if o.type=='MESH' and o.name in BASE:
        e=o.evaluated_get(dg); p+=[e.matrix_world@v.co for v in e.data.vertices]
lo=[min(v[i] for v in p) for i in range(3)]; hi=[max(v[i] for v in p) for i in range(3)]
root.matrix_world=Matrix.Translation(Vector((-(lo[0]+hi[0])/2,-(lo[1]+hi[1])/2,-lo[2])))@root.matrix_world
cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type="ORTHO"; cam.data.ortho_scale=1.8; T=math.radians(20); D=3.7; C=Vector((0,0,0.5)); Y=math.radians(180)
cam.location=C+Vector((-D*math.cos(T)*math.sin(Y),D*math.cos(T)*math.cos(Y),D*math.sin(T))); cam.rotation_euler=Euler((math.pi/2-T,0,math.pi+Y))
def sun(n,d,e,c):
    L=bpy.data.objects.new(n,bpy.data.lights.new(n,"SUN")); sc.collection.objects.link(L); L.data.energy=e; L.data.color=c
    L.rotation_euler=Vector(d).normalized().to_track_quat('-Z','Y').to_euler()
sun("sun",(-0.60,0.22,-0.77),3.5,(1,0.93,0.8)); sun("rim",(-0.82,0.30,-0.5),1.5,(0.8,0.85,1))
sc.render.engine="BLENDER_EEVEE"; sc.render.film_transparent=True; sc.view_settings.view_transform="Standard"; sc.eevee.taa_render_samples=16
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[0].default_value=(0.55,0.6,0.65,1); w.node_tree.nodes["Background"].inputs[1].default_value=0.6
sc.render.resolution_x=sc.render.resolution_y=512
for mt in bpy.data.materials:
    if mt.use_nodes:
        for nd in mt.node_tree.nodes:
            if nd.type=="BSDF_PRINCIPLED": nd.inputs["Roughness"].default_value=1.0; nd.inputs["Metallic"].default_value=0.0
        if "wolf" in mt.name.lower():
            nt=mt.node_tree
            for nd in [n for n in nt.nodes if n.type=="BSDF_PRINCIPLED"]:
                sk=nd.inputs["Base Color"]
                if sk.links:
                    src=sk.links[0].from_socket; hs=nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Value"].default_value=1.8
                    nt.links.new(src,hs.inputs["Color"]); nt.links.new(hs.outputs["Color"],sk)
for clip,F in (("03_run",8),("07_attack_A",20)):
    setact(acts[clip])
    for wpn in WEAP:
        for o in bpy.data.objects:
            if o.name in WEAP: o.hide_render=(o.name!=wpn)
        sc.frame_set(F); sc.render.filepath=f"{OUT}/{clip}_{wpn}.png"; bpy.ops.render.render(write_still=True)
print("DONE")
