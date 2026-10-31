# island_probe.py: face-connected components of the cut mesh; small patches + where they go per frame
import bpy, sys, collections
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath="C:/Users/DANTE/AppData/Local/Temp/wr/wolfrider_anim.blend")
ob=bpy.data.objects["tripo_node_a80d9881"]; me=ob.data; sc=bpy.context.scene
import bmesh
bm=bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
seen={}; comps=[]
for f0 in bm.faces:
    if f0.index in seen: continue
    st=[f0]; seen[f0.index]=len(comps); c=[]
    while st:
        f=st.pop(); c.append(f)
        for e in f.edges:
            for g in e.link_faces:
                if g.index not in seen: seen[g.index]=len(comps); st.append(g)
    comps.append(c)
comps.sort(key=len, reverse=True)
print("FACE COMPONENTS", len(comps), "sizes", [len(c) for c in comps[:15]], "patches<80:", sum(1 for c in comps if len(c)<80))
gn={g.index:g.name for g in ob.vertex_groups}
def dom(idx):
    w=collections.Counter()
    for i in idx:
        for g in me.vertices[i].groups: w[gn[g.group]]+=g.weight
    return [f"{k}:{v/len(idx):.2f}" for k,v in w.most_common(3)]
rest=[v.co.copy() for v in me.vertices]
small=[(sorted(set(v.index for f in c for v in f.verts)),len(c)) for c in comps[1:] if len(c)<80]
for F in (1,17,25):
    sc.frame_set(F); dg=bpy.context.evaluated_depsgraph_get(); ev=ob.evaluated_get(dg).data
    print("--- frame",F)
    for vi,nf in small:
        rc=sum((rest[i] for i in vi),Vector())/len(vi); ec=sum((ev.vertices[i].co for i in vi),Vector())/len(vi)
        print(f"  faces={nf:3d} verts={len(vi):3d} rest=({rc.x:.2f},{rc.y:.2f},{rc.z:.2f}) now=({ec.x:.2f},{ec.y:.2f},{ec.z:.2f}) {dom(vi)}")
bm.free()
