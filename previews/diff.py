import bpy, sys, numpy as np
a=sys.argv[sys.argv.index("--")+1:]
def load(p):
    bpy.ops.wm.open_mainfile(filepath=p)
    o=[x for x in bpy.data.objects if x.type=='MESH'][0]
    M=np.array(o.matrix_world)
    co=np.array([v.co[:] for v in o.data.vertices]); w=(M[:3,:3]@co.T).T+M[:3,3]
    gi={g.index:g.name for g in o.vertex_groups}
    dom=[gi[max(v.groups,key=lambda x:x.weight).group] if v.groups else None for v in o.data.vertices]
    return w,dom
w0,d0=load(a[0]); w1,d1=load(a[1])
print("N",len(w0),len(w1))
mv=np.where(np.linalg.norm(w1-w0,axis=1)>1e-5)[0]
print("MOVED",len(mv), set(d1[i] for i in mv))
for nm,w in (("up",w0),("raised",w1)):
    p=w[mv]; c=p.mean(0); u,s,vt=np.linalg.svd(p-c)
    print(nm,"centre",c.round(3),"min",p.min(0).round(3),"max",p.max(0).round(3),"axes",vt.round(3).tolist(),"sv",(s/np.sqrt(len(p))).round(3))
np.save(a[2],mv)
