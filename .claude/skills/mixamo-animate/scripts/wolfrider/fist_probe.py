# fist_probe.py <blend>: spear axis, fist centre at z=0.53, radial histograms around the corrected forearm and the upper arm
import bpy, sys, math
from mathutils import Vector
from collections import Counter
BLEND=sys.argv[sys.argv.index("--")+1]
bpy.ops.wm.open_mainfile(filepath=BLEND)
ob=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)][0]
co=[ob.matrix_world@v.co for v in ob.data.vertices]
U=[i for i,p in enumerate(co) if p.y>0.05 and p.x>0.12 and p.z>0.58]
top=max(U,key=lambda i:co[i].z); bot=min(U,key=lambda i:co[i].z)
ax=(co[top]-co[bot]).normalized(); a0=co[bot]
print("SPEAR top",tuple(round(c,3) for c in co[top]),"bot",tuple(round(c,3) for c in co[bot]),"axis",tuple(round(c,3) for c in ax))
for z in (0.50,0.53,0.56):
    t=(z-a0.z)/ax.z; P=a0+ax*t; print("AXIS at z=%.2f -> (%.3f,%.3f,%.3f)"%(z,*P))
FC=a0+ax*((0.53-a0.z)/ax.z)
# fist: verts within r of FC, by radius bin and by y
near=[(i,(co[i]-FC).length) for i in range(len(co)) if (co[i]-FC).length<0.10]
h=Counter(round(d/0.01)*0.01 for i,d in near); print("FIST radial", sorted(h.items()))
ys=Counter(round(co[i].y/0.02)*0.02 for i,d in near if d<0.06); print("FIST(<0.06) y bins", sorted(ys.items()))
def seg_dist(p,a,b):
    ab=b-a; t=max(0,min(1,(p-a).dot(ab)/ab.length_squared)); return (p-(a+ab*t)).length, t
for name,(A,Bp) in {"FOREARM elbow->FC":(Vector((-0.03,0.12,0.50)),FC),"UPPERARM":(Vector((-0.04,0.085,0.595)),Vector((-0.03,0.12,0.50)))}.items():
    print(name, "len %.3f"%(Bp-A).length)
    sec={}
    for i,p in enumerate(co):
        d,t=seg_dist(p,A,Bp)
        if d<0.12 and 0.0<t<1.0: sec.setdefault(round(t*4)/4,Counter())[round(d/0.01)*0.01]+=1
    for t in sorted(sec): print("  t=%.2f"%t, " ".join("%.2f:%d"%(k,v) for k,v in sorted(sec[t].items())))
