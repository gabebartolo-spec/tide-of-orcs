# wedge_probe.py <blend> : verts displaced a lot at frame 14 vs frame 0; where are they in rest, which group owns them
import bpy, sys
from mathutils import Vector
BLEND=sys.argv[sys.argv.index("--")+1]
bpy.ops.wm.open_mainfile(filepath=BLEND)
sc=bpy.context.scene
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
meshes=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
print("MESHES",[m.name for m in meshes], "bones", len(arm.data.bones))
def seg_dist(p,a,b):
    ab=b-a; t=max(0,min(1,(p-a).dot(ab)/ab.length_squared)); return (p-(a+ab*t)).length
bones={n:(arm.matrix_world@arm.data.bones[n].head_local, arm.matrix_world@arm.data.bones[n].tail_local) for n in ("R_LArm","R_LForeArm","R_LHand","R_LShoulder")}
for n,(h,t) in bones.items(): print("BONE",n,"head",tuple(round(v,3) for v in h),"tail",tuple(round(v,3) for v in t))
dg=bpy.context.evaluated_depsgraph_get()
for ob in meshes:
    sc.frame_set(sc.frame_start); dg.update()
    p0=[ob.matrix_world@v.co for v in ob.evaluated_get(dg).data.vertices]
    sc.frame_set(sc.frame_start+14); dg.update()
    p1=[ob.matrix_world@v.co for v in ob.evaluated_get(dg).data.vertices]
    rest=[ob.matrix_world@v.co for v in ob.data.vertices]
    names={g.index:g.name for g in ob.vertex_groups}
    rows=[]
    for i,v in enumerate(ob.data.vertices):
        d=(p1[i]-p0[i]).length
        if d<0.12: continue
        top=max(v.groups,key=lambda g:g.weight) if v.groups else None
        gn=names[top.group] if top else "-"; w=top.weight if top else 0
        dist=min(seg_dist(rest[i],h,t) for h,t in bones.values())
        rows.append((gn,round(w,2),d,rest[i],dist))
    print(ob.name,"moved>0.12:",len(rows))
    from collections import defaultdict
    byg=defaultdict(list)
    for r in rows: byg[r[0]].append(r)
    for g,rs in byg.items():
        far=[r for r in rs if r[4]>0.06]
        xs=[r[3].x for r in rs]; ys=[r[3].y for r in rs]; zs=[r[3].z for r in rs]
        print("GROUP %-12s n=%4d far(>0.06 from arm)=%4d  rest x %.2f..%.2f y %.2f..%.2f z %.2f..%.2f  maxdist %.3f"%(g,len(rs),len(far),min(xs),max(xs),min(ys),max(ys),min(zs),max(zs),max(r[4] for r in rs)))
        if far:
            fz=sorted(r[3].z for r in far); fd=sorted(r[4] for r in far)
            print("   far z %.2f..%.2f median %.2f ; dist median %.3f"%(fz[0],fz[-1],fz[len(fz)//2],fd[len(fd)//2]))
