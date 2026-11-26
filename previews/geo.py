import bpy, sys, numpy as np
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\DANTE\Documents\tide-assets\drummer\drummer_raised.blend")
arm=[x for x in bpy.data.objects if x.type=='ARMATURE'][0]; o=[x for x in bpy.data.objects if x.type=='MESH'][0]
M=o.matrix_world
print("OBJ",o.name,len(o.data.vertices),"scale",tuple(M.to_scale()), "armscale",tuple(arm.matrix_world.to_scale()))
W=r"C:\Users\DANTE\Documents\tide-assets\drummer_work"
d=np.load(r"C:\Users\DANTE\Documents\GitHub\tide-of-orcs-wt\tb-186b-drum-fix\previews\drumidx.npy")
P=np.array([list(M@v.co) for v in o.data.vertices])
print("DRUM n",len(d),"min",P[d].min(0).round(3),"max",P[d].max(0).round(3),"cen",P[d].mean(0).round(3))
for s in ("Left","Right"):
    ids=[int(x) for x in open(W+r"\mallet_%s.txt"%s).read().split()]
    a=P[ids]; print("MAL",s,len(ids),"min",a.min(0).round(3),"max",a.max(0).round(3))
    for n in ("Hand","ForeArm","Arm"):
        b=arm.data.bones["mixamorig:%s%s"%(s,n)]; print(" bone",n,"head",tuple(round(c,3) for c in arm.matrix_world@b.head_local),"tail",tuple(round(c,3) for c in arm.matrix_world@b.tail_local))
b=arm.data.bones["mixamorig:Hips"]; print("hips",tuple(round(c,3) for c in arm.matrix_world@b.head_local))
