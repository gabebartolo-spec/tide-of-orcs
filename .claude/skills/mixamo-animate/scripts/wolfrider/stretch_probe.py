import bpy, collections
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath="C:/Users/DANTE/AppData/Local/Temp/wr/wolfrider_anim.blend")
sc=bpy.context.scene; ob=bpy.data.objects["tripo_node_a80d9881"]
me=ob.data; Mo=ob.matrix_world; rest=[Mo@v.co for v in me.vertices]
names={g.index:g.name for g in ob.vertex_groups}
def G(i): return tuple(sorted((names[g.group],round(g.weight,1)) for g in me.vertices[i].groups if g.weight>0.05))
sc.frame_set(16); dg=bpy.context.evaluated_depsgraph_get(); ev=ob.evaluated_get(dg).data
cur=[Mo@v.co for v in ev.vertices]
bad=[]
for e in me.edges:
    a,b=e.vertices; r=(rest[a]-rest[b]).length; c=(cur[a]-cur[b]).length
    if c>0.06 and c>2.5*max(r,1e-4): bad.append((round(c,3),round(r,3),a,b))
bad.sort(reverse=True); print("stretched edges",len(bad))
H=collections.Counter()
for c,r,a,b in bad: H[(G(a),G(b))]+=1
for k,v in H.most_common(10): print(v,k)
for c,r,a,b in bad[:10]:
    print("cur %.3f rest %.3f"%(c,r),"A rest",tuple(round(x,3) for x in rest[a]),G(a),"B rest",tuple(round(x,3) for x in rest[b]),G(b))
