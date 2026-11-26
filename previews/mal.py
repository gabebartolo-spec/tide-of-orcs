import bpy, sys, numpy as np
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=sys.argv[sys.argv.index("--")+1])
arm=[x for x in bpy.data.objects if x.type=='ARMATURE'][0]; o=[x for x in bpy.data.objects if x.type=='MESH'][0]
M=o.matrix_world; gi={g.index:g.name for g in o.vertex_groups}
best={}
for v in o.data.vertices:
    if not v.groups: continue
    g=max(v.groups,key=lambda x:x.weight); n=gi[g.group]
    for s in ("Left","Right"):
        if n.startswith("mixamorig:"+s+"Hand") or n==("mixamorig:"+s+"ForeArm"):
            p=M@v.co; best.setdefault(s,[]).append((p,n))
for s in ("Left","Right"):
    b=arm.data.bones["mixamorig:"+s+"Hand"]; hb=arm.matrix_world@b.head_local
    pts=[p for p,n in best[s]]
    far=max(pts,key=lambda p:(p-hb).length)
    print("MAL",s,"handhead",tuple(round(c,3) for c in hb),"far",tuple(round(c,3) for c in far),"len",round((far-hb).length,3))
    # local cm
    L=(arm.matrix_world@b.matrix_local).inverted()@far
    L2=b.matrix_local.inverted()@(arm.matrix_world.inverted()@far)
    print("MALLOC",s,"loc(cm)",tuple(round(c,2) for c in L2))
    # mallet head: points further than 0.2 from hand
    far2=[p for p in pts if (p-hb).length>0.2]
    if far2:
        a=np.array([list(p) for p in far2]); print("MALHEAD",s,len(far2),"cen",a.mean(0).round(3),"min",a.min(0).round(3),"max",a.max(0).round(3))
