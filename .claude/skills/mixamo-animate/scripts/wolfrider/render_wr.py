# render_wr.py <blend> <outprefix> [RES] : game view (from +Y, GAMECAM 20 deg, to be mirrored) and front view (from +X)
import bpy, math, sys, os
from mathutils import Vector, Euler
a=sys.argv[sys.argv.index("--")+1:]
BLEND, OUT = a[0], a[1]; RES=int(a[2]) if len(a)>2 else 360
bpy.ops.wm.open_mainfile(filepath=BLEND)
sc=bpy.context.scene
for o in list(bpy.data.objects):
    if o.type in ('CAMERA','LIGHT'): bpy.data.objects.remove(o,do_unlink=True)
cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type="ORTHO"; cam.data.ortho_scale=float(os.environ.get("ORTHO","1.25"))
C=Vector((0.03,0,0.38)); T=math.radians(float(os.environ.get("GAMECAM","20"))); D=3.7
def sun(name,d,energy,color):
    L=bpy.data.objects.new(name,bpy.data.lights.new(name,"SUN")); sc.collection.objects.link(L); L.data.energy=energy; L.data.color=color
    L.rotation_euler=Vector(d).normalized().to_track_quat('-Z','Y').to_euler(); return L
sun("sun",(-0.60,0.22,-0.77),3.5,(1,0.93,0.8)); sun("rim",(-0.82,0.30,-0.5),1.5,(0.8,0.85,1))
sc.render.engine="BLENDER_EEVEE"; sc.render.film_transparent=True
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[0].default_value=(0.55,0.6,0.65,1); w.node_tree.nodes["Background"].inputs[1].default_value=0.6
sc.view_settings.view_transform="Standard"; sc.eevee.taa_render_samples=32
sc.render.resolution_x=sc.render.resolution_y=RES
for mt in bpy.data.materials:
    if mt.use_nodes:
        for nd in mt.node_tree.nodes:
            if nd.type=="BSDF_PRINCIPLED": nd.inputs["Roughness"].default_value=1.0; nd.inputs["Metallic"].default_value=0.0
views={"game":(C+Vector((0,D*math.cos(T),D*math.sin(T))),Euler((math.pi/2-T,0,math.pi))),
       "front":(C+Vector((D*math.cos(T),0,D*math.sin(T))),Euler((math.pi/2-T,0,math.pi/2)))}
only=os.environ.get("VIEWS","game,front").split(",")
FR=os.environ.get("FRAMES")  # optional comma list of 0-based frame indices
for vn,(loc,rot) in views.items():
    if vn not in only: continue
    cam.location=loc; cam.rotation_euler=rot
    for i,F in enumerate(range(sc.frame_start,sc.frame_end+1)):
        if FR and str(i) not in FR.split(","): continue
        sc.frame_set(F); sc.render.filepath=f"{OUT}_{vn}_{i}.png"; bpy.ops.render.render(write_still=True)
print("RENDERED", sc.frame_end-sc.frame_start+1, "frames per view", only)
