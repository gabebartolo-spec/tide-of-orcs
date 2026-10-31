# Two-hand spear: grip point stays where the posed model's fist held it; the haft aims at the left hand each frame (copies the clip's rifle grip).
import bpy,sys,numpy as np
from mathutils import Vector, Matrix
rig,cut,out=sys.argv[-3:]
bpy.ops.wm.open_mainfile(filepath=rig)
with bpy.data.libraries.load(cut) as (src,dst): dst.objects=["spear"]
sp=dst.objects[0]; bpy.context.scene.collection.objects.link(sp); sp.name="wpn_spear"
arm=next(o for o in bpy.data.objects if o.type=="ARMATURE"); B=arm.data.bones; W=arm.matrix_world
V=np.array([(sp.matrix_world@v.co)[:] for v in sp.data.vertices]); c=V.mean(0)
ax=np.linalg.svd(V-c)[2][0]; t=(V-c)@ax
rad=lambda m: np.linalg.norm((V[m]-c)-np.outer(t[m],ax),axis=1).max()
L=t.max()-t.min()
if rad(t<t.min()+0.15*L)>rad(t>t.max()-0.15*L): ax=-ax; t=-t      # +ax toward the spearhead (wider end)
G=(W@B["mixamorig:RightHand"].head_local+W@B["mixamorig:RightHandMiddle1"].head_local)/2
P0=Vector(c)+Vector(ax)*float(np.dot(np.array(G[:])-c,ax))
print("LEN",L,"GRIP_FRAC_FROM_BUTT",(np.dot(np.array(G[:])-c,ax)-t.min())/L,"FIST_TO_AXIS",(G-P0).length)
y=Vector(ax); x=y.orthogonal().normalized(); z=x.cross(y)
import os; GF=float(os.environ.get("GF","-1"))
Pm=P0 if GF<0 else Vector(c)+Vector(ax)*float(t.min()+GF*L)   # haft point that sits in the right fist
R=Matrix((x,y,z)).transposed().to_4x4(); R.translation=Pm
sp.data.transform(R.inverted()@sp.matrix_world); sp.matrix_world=Matrix.Identity(4)
e=bpy.data.objects.new("grip_r",None); bpy.context.scene.collection.objects.link(e)
e.parent=arm; e.parent_type="BONE"; e.parent_bone="mixamorig:RightHand"; bpy.context.view_layer.update()
e.matrix_world=Matrix.Translation(P0)
cl=sp.constraints.new("COPY_LOCATION"); cl.target=e
gl=bpy.data.objects.new("grip_l",None); bpy.context.scene.collection.objects.link(gl)   # left fist centre, same rule as grip_r
gl.parent=arm; gl.parent_type="BONE"; gl.parent_bone="mixamorig:LeftHand"; bpy.context.view_layer.update()
CL=os.environ.get("CL")   # measured left fist hole (fist_hole SIDE=Left); Tripo's hand bones are ~1 mm long, so bone points sit in the wrist
gl.matrix_world=Matrix.Translation(Vector([float(v) for v in CL.split(",")]) if CL else (W@B["mixamorig:LeftHand"].head_local+W@B["mixamorig:LeftHandMiddle1"].head_local)/2)
dt=sp.constraints.new("DAMPED_TRACK"); dt.target=gl; dt.track_axis="TRACK_Y"
bpy.ops.wm.save_as_mainfile(filepath=out)

