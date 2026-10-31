# render_wr_sheet.py <blend> <frames dir> <key> : sprite-sheet frames for the baked wolf rider (apply_anim.py field-camera convention)
# Camera sits on +Y (the flank the director approved in the GIFs), GAMECAM deg above the ground plane, ortho ORTHO, RES px,
# then each frame is mirrored so the wolf faces screen-right like every other actor (pack_sprites mirrors orcs to march left).
# Writes <dir>/<key>_<i>.png for every STEP-th frame of frame_start..frame_end-1 (the last frame repeats the first) and
# prints "ANCHOR ax ay": the ground point under the rig origin in sheet pixels (x already mirrored), like apply_anim.py.
import bpy, math, sys, os
import numpy as np
from mathutils import Vector, Euler
from bpy_extras.object_utils import world_to_camera_view
a=sys.argv[sys.argv.index("--")+1:]
BLEND, OUTDIR, KEY = a[0], a[1], a[2]
RES=int(os.environ.get("RES","512")); ORTHO=float(os.environ.get("ORTHO","1.4")); STEP=int(os.environ.get("STEP","2"))
T=math.radians(float(os.environ.get("GAMECAM","20"))); D=3.7; C=Vector((0,0,0.5))   # same look-at height as apply_anim.py
bpy.ops.wm.open_mainfile(filepath=BLEND)
sc=bpy.context.scene
for o in list(bpy.data.objects):
    if o.type in ('CAMERA','LIGHT'): bpy.data.objects.remove(o,do_unlink=True)
cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type="ORTHO"; cam.data.ortho_scale=ORTHO
cam.location=C+Vector((0,D*math.cos(T),D*math.sin(T))); cam.rotation_euler=Euler((math.pi/2-T,0,math.pi))
def sun(name,d,energy,color):   # lighting copied from render_wr.py (the approved GIF look)
    L=bpy.data.objects.new(name,bpy.data.lights.new(name,"SUN")); sc.collection.objects.link(L); L.data.energy=energy; L.data.color=color
    L.rotation_euler=Vector(d).normalized().to_track_quat('-Z','Y').to_euler(); return L
sun("sun",(-0.60,0.22,-0.77),3.5,(1,0.93,0.8)); sun("rim",(-0.82,0.30,-0.5),1.5,(0.8,0.85,1))
sc.render.engine="BLENDER_EEVEE"; sc.render.film_transparent=True
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[0].default_value=(0.55,0.6,0.65,1); w.node_tree.nodes["Background"].inputs[1].default_value=0.6
sc.view_settings.view_transform="Standard"; sc.eevee.taa_render_samples=32
sc.render.resolution_x=sc.render.resolution_y=RES; sc.render.image_settings.file_format='PNG'; sc.render.image_settings.color_mode='RGBA'
for mt in bpy.data.materials:
    if mt.use_nodes:
        for nd in mt.node_tree.nodes:
            if nd.type=="BSDF_PRINCIPLED": nd.inputs["Roughness"].default_value=1.0; nd.inputs["Metallic"].default_value=0.0
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
os.makedirs(OUTDIR,exist_ok=True)
n=0
for i,F in enumerate(range(sc.frame_start, sc.frame_end)):   # frame_end == frame_start pose, dropped
    if i%STEP: continue
    sc.frame_set(F); path=f"{OUTDIR}/{KEY}_{n}.png"; sc.render.filepath=path; bpy.ops.render.render(write_still=True)
    img=bpy.data.images.load(path); px=np.array(img.pixels[:],dtype=np.float32).reshape(img.size[1],img.size[0],4)[:, ::-1, :]
    img.pixels.foreach_set(px.ravel()); img.filepath_raw=path; img.file_format='PNG'; img.save(); bpy.data.images.remove(img)
    n+=1
sc.frame_set(sc.frame_start)
g=world_to_camera_view(sc,cam,arm.matrix_world@Vector((0,0,0)))
print("ANCHOR %.2f %.2f"%(RES-g.x*RES,(1-g.y)*RES)); print("FRAMES",n,"ortho",ORTHO)
