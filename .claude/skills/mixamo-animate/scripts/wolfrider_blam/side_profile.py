# side_profile.py b <out> (inside a blam blend) | q <out> <Quaternius Wolf.fbx>: TB-210 pure-profile renders of every clip frame for the gallop comparison.
# side-view (pure profile, ortho) renders of a clip, every frame, for the gallop comparison sheet. No pose edits.
import bpy,sys,os,math
from mathutils import Vector,Euler
a=sys.argv[sys.argv.index("--")+1:]; mode,OUT=a[0],a[1]; os.makedirs(OUT,exist_ok=True)
if mode=="q":
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.wm.fbx_import(filepath=a[2])
sc=bpy.context.scene
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
if mode=="q":
    act=[x for x in bpy.data.actions if x.name.endswith("|Gallop")][0]; arm.animation_data.action=act
    if act.slots: arm.animation_data.action_slot=act.slots[0]
    f0,f1=act.frame_range
else: f0,f1=sc.frame_start,sc.frame_end
for o in list(bpy.data.objects):
    if o.type in('CAMERA','LIGHT'): bpy.data.objects.remove(o,do_unlink=True)
bpy.context.view_layer.update(); dg=bpy.context.evaluated_depsgraph_get(); p=[]
sc.frame_set(int(f0))
for o in bpy.data.objects:
    if o.type=='MESH':
        e=o.evaluated_get(dg); p+=[e.matrix_world@v.co for v in e.data.vertices]
lo=Vector([min(v[i] for v in p) for i in range(3)]); hi=Vector([max(v[i] for v in p) for i in range(3)]); c=(lo+hi)/2; ext=hi-lo
long_x=ext.x>ext.y; S=max(ext.x,ext.y,ext.z)*1.25
cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam; cam.data.type="ORTHO"; cam.data.ortho_scale=S
d=S*3
if long_x: cam.location=c+Vector((0,-d,0)); cam.rotation_euler=Euler((math.pi/2,0,0))
else: cam.location=c+Vector((d,0,0)); cam.rotation_euler=Euler((math.pi/2,0,math.pi/2))
cam.data.clip_end=d*3
L=bpy.data.objects.new("s",bpy.data.lights.new("s","SUN")); sc.collection.objects.link(L); L.data.energy=3; L.rotation_euler=(0.6,0.3,0.4)
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[1].default_value=0.8
sc.render.engine="BLENDER_EEVEE"; sc.render.film_transparent=True; sc.eevee.taa_render_samples=8; sc.view_settings.view_transform="Standard"
sc.render.resolution_x=sc.render.resolution_y=320
for F in range(int(f0),int(f1)):
    sc.frame_set(F); sc.render.filepath=f"{OUT}/{F:03d}.png"; bpy.ops.render.render(write_still=True)
print("SIDE",long_x,f0,f1)
