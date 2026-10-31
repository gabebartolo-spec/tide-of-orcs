# fist_probe2.py <blend>: z-profile of verts around the spear axis; per z bin: count by radial bin, y range, and is_rider/owner split
import bpy, sys
from mathutils import Vector
from collections import Counter, defaultdict
BLEND=sys.argv[sys.argv.index("--")+1]
bpy.ops.wm.open_mainfile(filepath=BLEND)
ob=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)][0]
me=ob.data; co=[ob.matrix_world@v.co for v in me.vertices]
a0=Vector((0.167,0.051,0.581)); ax=Vector((0.343,0.112,0.933)).normalized()
gn={g.index:g.name for g in ob.vertex_groups}
def owner(v):
    if not v.groups: return "-"
    g=max(v.groups,key=lambda g:g.weight); return gn[g.group]
rows=defaultdict(lambda: defaultdict(Counter)); yr={}
for i,p in enumerate(co):
    t=(p-a0).dot(ax); q=a0+ax*t; r=(p-q).length
    if r<0.10 and 0.40<p.z<0.66:
        zb=round(p.z/0.02)*0.02; rb=round(r/0.02)*0.02
        rows[zb][rb][owner(me.vertices[i])]+=1
        yr.setdefault((zb,rb),[]).append(round(p.y,2))
for zb in sorted(rows):
    print("z=%.2f"%zb)
    for rb in sorted(rows[zb]):
        c=rows[zb][rb]; ys=yr[(zb,rb)]
        print("   r=%.2f n=%3d y %.2f..%.2f  %s"%(rb,sum(c.values()),min(ys),max(ys)," ".join("%s:%d"%(k.replace("tripo::",""),v) for k,v in c.most_common(4))))
