# angle_probe.py: Mixamo "Sitting Angry" right-arm raise timing, per source frame and per 41-frame sample
import bpy, math
from mathutils import Vector
SA=r"C:\Users\DANTE\Documents\tide-assets\mixamo\Sitting Angry AS100.fbx"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=SA,use_anim=True,use_image_search=False)
a=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
act=[x for x in bpy.data.actions if "mixamo" in x.name.lower()][0]
a.animation_data.action=act
if act.slots: a.animation_data.action_slot=act.slots[0]
print("ACTION frames", act.frame_range[:], "fps", bpy.context.scene.render.fps)
def wdir(pb):
    M=a.matrix_world@pb.matrix; return (M@Vector((0,pb.length,0))-M.translation).normalized()
rows=[]
for f in range(1,106):
    bpy.context.scene.frame_set(f); bpy.context.view_layer.update()
    ua=wdir(a.pose.bones['mixamorig:RightArm']); fa=wdir(a.pose.bones['mixamorig:RightForeArm'])
    rows.append((f, math.degrees(math.acos(max(-1,min(1,ua.z)))), math.degrees(math.acos(max(-1,min(1,ua.dot(fa))))), ua.copy()))
u0=rows[0][3]
print("SRC frame : upperarm angle-from-down, from-frame0, elbow bend")
for f,ang,el,u in rows:
    print("SRC %3d  down %5.1f  from0 %5.1f  elbow %5.1f"%(f,180-ang,math.degrees(math.acos(max(-1,min(1,u.dot(u0))))),el))
