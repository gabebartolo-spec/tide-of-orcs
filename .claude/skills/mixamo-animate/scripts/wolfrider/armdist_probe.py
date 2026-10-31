# armdist_probe.py <blend>: for verts owned by the arm bones, histogram of straight-line distance to the arm chain, by rest z
import bpy, sys
from mathutils import Vector
from collections import Counter
BLEND=sys.argv[sys.argv.index("--")+1]
bpy.ops.wm.open_mainfile(filepath=BLEND)
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
ob=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)][0]
def seg_dist(p,a,b):
    ab=b-a; t=max(0,min(1,(p-a).dot(ab)/ab.length_squared)); return (p-(a+ab*t)).length
B={n:(arm.matrix_world@arm.data.bones[n].head_local, arm.matrix_world@arm.data.bones[n].tail_local) for n in ("R_LArm","R_LForeArm","R_LHand","R_Hips","R_Spine","R_Spine1","R_Spine2")}
names={g.index:g.name for g in ob.vertex_groups}
rest=[ob.matrix_world@v.co for v in ob.data.vertices]
for n in ("R_LArm","R_LForeArm","R_LHand"):
    h,t=B[n]; c=Counter(); far=[]
    for i,v in enumerate(ob.data.vertices):
        gs={names[g.group]:g.weight for g in v.groups}
        if gs.get(n,0)<0.5: continue
        d=seg_dist(rest[i],h,t); p=rest[i]
        c[(round(d/0.02)*0.02, round(p.z/0.05)*0.05)]+=1
        if d>0.055 and not (n=="R_LHand" and (p.z>0.58 or p.z<0.50)): far.append((i,p,d,min((seg_dist(p,*B[m]),m) for m in ("R_Hips","R_Spine","R_Spine1","R_Spine2"))))
    print("OWNER",n,"n=",sum(c.values()))
    for (d,z),k in sorted(c.items()): print("   dist %.2f z %.2f : %d"%(d,z,k))
    print("   FAR(>0.055, not spear) n=%d"%len(far))
    for i,p,d,(hd,hm) in far[:12]: print("     v%d (%.2f,%.2f,%.2f) d=%.3f nearest torso %s %.3f"%(i,p.x,p.y,p.z,d,hm,hd))
    if far:
        xs=[f[1].x for f in far]; ys=[f[1].y for f in far]; zs=[f[1].z for f in far]
        print("   FAR bbox x %.2f..%.2f y %.2f..%.2f z %.2f..%.2f"%(min(xs),max(xs),min(ys),max(ys),min(zs),max(zs)))
