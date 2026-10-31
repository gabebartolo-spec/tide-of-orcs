import re
s=open("build_wr.py",encoding="utf-8").read()
s=s.replace(r'wr\wolfrider_anim.blend', r'wr\wolfrider_anim2.blend')
i0=s.index("assign={}"); i1=s.index('print("ASSIGN"')
new='''# geodesic weights (v2): multi-source Dijkstra over mesh edges from each bone's core verts, rider verts only, spear excluded.
# Straight-line nearest-segment weights (v1) pulled chest verts beside the armpit up with the arm and tore the shoulder.
import heapq
RCORE={'R_Hips':0.07,'R_Spine':0.06,'R_Spine1':0.06,'R_Spine2':0.06,'R_Neck':0.035,'R_Head':0.06,
 'R_LShoulder':0.03,'R_LArm':0.035,'R_LForeArm':0.03,'R_LHand':0.03,'R_RShoulder':0.03,'R_RArm':0.035,'R_RForeArm':0.03,'R_RHand':0.03}
candset=set(cand)-spear
G={}
for n,(a,b) in segs.items():
    src=[i for i in candset if segd(co[i],a,b)<RCORE[n]]
    if len(src)<5: src=sorted(candset,key=lambda i:segd(co[i],a,b))[:20]
    dist={i:segd(co[i],a,b) for i in src}
    pq=[(d,i) for i,d in dist.items()]; heapq.heapify(pq)
    while pq:
        d,i=heapq.heappop(pq)
        if d>dist.get(i,1e9): continue
        for j in _adj[i]:
            if j not in candset: continue
            nd=d+(co[i]-co[j]).length
            if nd<dist.get(j,1e9): dist[j]=nd; heapq.heappush(pq,(nd,j))
    G[n]=dist; print("GEO",n,"core",len(src),"reached",len(dist))
SIG=float(os.environ.get("WSIG","0.02")); W={}; _unr=0
for i in candset:
    ds=sorted((G[n].get(i,1e9),n) for n in segs); d1=ds[0][0]
    if d1>1e8:
        _unr+=1; ds=sorted((segd(co[i],a,b),n) for n,(a,b) in segs.items()); d1=ds[0][0]
    ws={n:math.exp(-(d-d1)/SIG) for d,n in ds[:3] if d-d1<3*SIG}
    s_=sum(ws.values()); W[i]={n:w/s_ for n,w in ws.items()}
print("GEO unreached", _unr)
for _it in range(int(os.environ.get("WSMOOTH","4"))):
    W2={}
    for i in candset:
        nb=[j for j in _adj[i] if j in candset]; acc=_c.defaultdict(float)
        for n,w in W[i].items(): acc[n]+=0.5*w
        for j in nb:
            for n,w in W[j].items(): acc[n]+=0.5*w/len(nb)
        top=sorted(acc.items(),key=lambda kv:-kv[1])[:3]; s_=sum(w for _,w in top)
        W2[i]={n:w/s_ for n,w in top}
    W=W2
assign={}
for i in cand+list(spear):
    p=co[i]
    new={'R_LHand':1.0} if i in spear else W[i]
    t=1.0 if i in spear else max(0.0,min(1.0,(p.z-0.44)/0.05))   # blend into the saddle weights near the seat
    old=[(g.group,g.weight) for g in me.vertices[i].groups]
    osum=sum(w for _,w in old) or 1.0
    for g,w in old: gidx[g].add([i],w/osum*(1-t),'REPLACE')
    for n,w in new.items(): vgs[n].add([i],w*t,'REPLACE')
    assign[i]=max(new,key=new.get)
'''
s=s[:i0]+new+s[i1:]
old='        if c>0.05 and c>2.5*max(r,1e-4): badE.add(e.index)'
assert old in s
s=s.replace(old,'        if c>0.05 and c>2.5*max(r,1e-4) and not (a in candset and b in candset): badE.add(e.index)   # v2: never cut the rider\'s own faces')
s=s.replace("import heapq","import heapq, os",1)
open("build_wr2.py","w",encoding="utf-8",newline="\n").write(s); print("ok")
