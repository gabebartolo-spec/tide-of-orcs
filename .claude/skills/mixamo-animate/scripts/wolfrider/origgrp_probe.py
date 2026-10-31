# origgrp_probe.py <blend>: for hand-owned verts far from the hand bone (not spear), which ORIGINAL tripo groups they belonged to (zero-weight entries survive REPLACE)
import bpy, sys
from collections import Counter
BLEND=sys.argv[sys.argv.index("--")+1]
bpy.ops.wm.open_mainfile(filepath=BLEND)
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
ob=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)][0]
names={g.index:g.name for g in ob.vertex_groups}
def seg_dist(p,a,b):
    ab=b-a; t=max(0,min(1,(p-a).dot(ab)/ab.length_squared)); return (p-(a+ab*t)).length
for n in ("R_LHand","R_LForeArm"):
    h,t=arm.matrix_world@arm.data.bones[n].head_local, arm.matrix_world@arm.data.bones[n].tail_local
    near=Counter(); far=Counter(); nn=nf=0
    for v in ob.data.vertices:
        gs={names[g.group]:g.weight for g in v.groups}
        if gs.get(n,0)<0.5: continue
        p=ob.matrix_world@v.co
        if n=="R_LHand" and (p.z>0.58 or p.z<0.50): continue
        orig=[g for g in gs if g.startswith("tripo::") or g.startswith("bone_")]
        key=",".join(sorted(orig)) or "(none)"
        if seg_dist(p,h,t)>(0.06 if n=="R_LHand" else 0.07): far[key]+=1; nf+=1
        else: near[key]+=1; nn+=1
    print("OWNER",n,"near",nn,dict(near.most_common(6)))
    print("OWNER",n,"far ",nf,dict(far.most_common(6)))
