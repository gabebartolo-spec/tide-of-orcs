# build_wr.py: Tripo wolf-rider rig + Quaternius Wolf "Attack" (wolf bones) + Mixamo "Sitting Angry" mirrored (rider bones)
import bpy, math, sys, colorsys
from collections import Counter
from mathutils import Vector, Matrix, Quaternion, Euler
RIG=r"C:\Users\DANTE\Documents\tide-assets\wolf_rider\rig_ab012178\wolf_rider_rig.blend"
QW=r"C:\Users\DANTE\Documents\tide-assets\wolf_rider\ref_wolf\Wolf.fbx"
SA=r"C:\Users\DANTE\Documents\tide-assets\mixamo\Sitting Angry AS100.fbx"
OUT=r"C:\Users\DANTE\AppData\Local\Temp\wr\wolfrider_anim.blend"
DBG=r"C:\Users\DANTE\AppData\Local\Temp\wr\dbg"
NF=41; WSCALE=0.19; RSCALE=0.10   # rider hip shift damped: legs are pinned to the saddle
bpy.ops.wm.open_mainfile(filepath=RIG)
sc=bpy.context.scene
ob=bpy.data.objects["tripo_node_a80d9881"]; arm=bpy.data.objects["Armature"]
Mw=arm.matrix_world.copy(); Mwi=Mw.inverted()

# ---------- 1. rider bones ----------
RB={ # name: head, tail, parent   (world space; wolf and rider face +X, +Y = rider's left)
 'R_Hips':((-0.02,0,0.45),(-0.02,0,0.50),'tripo::Spine_2'),
 'R_Spine':((-0.02,0,0.50),(-0.01,0,0.54),'R_Hips'),
 'R_Spine1':((-0.01,0,0.54),(0.0,0,0.58),'R_Spine'),
 'R_Spine2':((0.0,0,0.58),(0.01,0,0.615),'R_Spine1'),
 'R_Neck':((0.01,0,0.615),(0.03,0,0.64),'R_Spine2'),
 'R_Head':((0.03,0,0.64),(0.06,0,0.71),'R_Neck'),
 'R_LShoulder':((0.0,0.02,0.59),(-0.04,0.085,0.595),'R_Spine2'),
 'R_LArm':((-0.04,0.085,0.595),(-0.03,0.12,0.50),'R_LShoulder'),
 'R_LForeArm':((-0.03,0.12,0.50),(0.14,0.11,0.53),'R_LArm'),
 'R_LHand':((0.14,0.11,0.53),(0.17,0.11,0.535),'R_LForeArm'),
 'R_RShoulder':((0.0,-0.02,0.59),(-0.04,-0.085,0.595),'R_Spine2'),
 'R_RArm':((-0.04,-0.085,0.595),(-0.03,-0.12,0.50),'R_RShoulder'),
 'R_RForeArm':((-0.03,-0.12,0.50),(0.10,-0.10,0.47),'R_RArm'),
 'R_RHand':((0.10,-0.10,0.47),(0.13,-0.10,0.465),'R_RForeArm'),
}
bpy.context.view_layer.objects.active=arm; arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb=arm.data.edit_bones
for n,(h,t,p) in RB.items():
    b=eb.new(n); b.head=Mwi@Vector(h); b.tail=Mwi@Vector(t); b.parent=eb[p]; b.use_connect=False; b.use_deform=True
bpy.ops.object.mode_set(mode='OBJECT')
print("RIDERBONES", len(RB), "total", len(arm.data.bones))

# ---------- 2. weights ----------
me=ob.data; Mo=ob.matrix_world
co=[Mo@v.co for v in me.vertices]
segs={n:(Vector(h),Vector(t)) for n,(h,t,p) in RB.items()}
def segd(p,a,b):
    ab=b-a; t=max(0.0,min(1.0,(p-a).dot(ab)/ab.length_squared)); return (p-(a+ab*t)).length
# spear axis from the isolated upper shaft (y>0.05, x>0.12, z>0.58)
U=[i for i,p in enumerate(co) if p.y>0.05 and p.x>0.12 and p.z>0.58]
top=max(U,key=lambda i:co[i].z); bot=min(U,key=lambda i:co[i].z)
ax=(co[top]-co[bot]).normalized(); a0=co[bot]
print("SPEAR upper n=%d top=%s bot=%s axis=%s"%(len(U),tuple(round(c,3) for c in co[top]),tuple(round(c,3) for c in co[bot]),tuple(round(c,3) for c in ax)))
def linedist(p):
    d=p-a0; return (d-ax*d.dot(ax)).length
def along(p): return (p-a0).dot(ax)
# shaft: within 0.022 of the axis; blade (above the grip, along>0.05): within 0.045 (blade half-width measured 0.04, nothing else up there)
spear=set(i for i,p in enumerate(co) if p.y>0.04 and 0.40<=p.z<=0.86 and (linedist(p)<0.022 or (along(p)>0.05 and linedist(p)<0.045)))
# lower shaft (below the grip, fused with fist and wolf mane): constrained flood along mesh edges, tube radius only
import collections as _c
_adj=_c.defaultdict(set)
for _e in me.edges: _adj[_e.vertices[0]].add(_e.vertices[1]); _adj[_e.vertices[1]].add(_e.vertices[0])
_fr=list(spear); _added=0
while _fr:
    _nf=[]
    for _i in _fr:
        for _j in _adj[_i]:
            _p=co[_j]
            if _j not in spear and _p.y>0.0 and -0.26<along(_p)<0.05 and linedist(_p)<0.02:
                spear.add(_j); _nf.append(_j); _added+=1
    _fr=_nf
print("SPEAR flood added", _added, "zmin %.3f"%min(co[i].z for i in spear))
low=[co[i] for i in spear if co[i].z<0.50]
print("SPEAR verts", len(spear), "low part n=%d"%len(low), "low bbox", [tuple(round(min(c[k] for c in low),3) for k in range(3)), tuple(round(max(c[k] for c in low),3) for k in range(3))] if low else None)
def is_rider(p):
    if p.z>0.56 and -0.06<along(p)<0.12 and linedist(p)<0.07: return True   # fist, thumb and shaft binding beside the grip (x>0.20)
    if p.z<=0.44 or p.x<-0.13 or p.x>0.20 or abs(p.y)>0.16: return False
    if p.x>0.13 and abs(p.y)<0.08 and p.z<0.58: return False   # wolf mane / neck ridge
    return True
cand=[i for i,p in enumerate(co) if is_rider(p)]
print("RIDER cand", len(cand))
vgs={n:ob.vertex_groups.new(name=n) for n in RB}
gidx={g.index:g for g in ob.vertex_groups}
assign={}
for i in cand+list(spear):
    p=co[i]
    if i in spear:
        new={'R_LHand':1.0}
    else:
        ds=sorted((segd(p,a,b),n) for n,(a,b) in segs.items())
        (d1,n1),(d2,n2)=ds[0],ds[1]
        if d2>1.6*d1 or d1<1e-6: new={n1:1.0}
        else:
            w1=1/d1**2; w2=1/d2**2; s=w1+w2; new={n1:w1/s,n2:w2/s}
    t=1.0 if i in spear else max(0.0,min(1.0,(p.z-0.44)/0.05))   # blend into the saddle weights near the seat
    old=[(g.group,g.weight) for g in me.vertices[i].groups]
    osum=sum(w for _,w in old) or 1.0
    for g,w in old: gidx[g].add([i],w/osum*(1-t),'REPLACE')
    for n,w in new.items(): vgs[n].add([i],w*t,'REPLACE')
    assign[i]=max(new,key=new.get)
print("ASSIGN", sorted(Counter(assign.values()).items()))

# ---------- 3. sample the source clips ----------
def import_fbx(path,name):
    before=set(bpy.data.objects); bpy.ops.import_scene.fbx(filepath=path,use_anim=True,use_image_search=False)
    new=[o for o in bpy.data.objects if o not in before]; a=[o for o in new if o.type=='ARMATURE'][0]; a.name=name; return a,new
def qof(a,pb): return (a.matrix_world@pb.matrix).to_3x3().normalized().to_quaternion()
def sample(a,act,frames,bones,root):
    a.animation_data.action=act
    if act.slots: a.animation_data.action_slot=act.slots[0]
    out=[]
    for f in frames:
        fi=int(math.floor(f)); sc.frame_set(fi,subframe=f-fi); bpy.context.view_layer.update()
        out.append(({b:qof(a,a.pose.bones[b]) for b in bones if b in a.pose.bones},(a.matrix_world@a.pose.bones[root].matrix).translation.copy()))
    return out
WMAP={ # tripo bone -> quaternius bone
 'tripo::Root':'Body','tripo::Spine_0':'Back','tripo::Spine_1':'Torso','tripo::Spine_2':'Torso2','tripo::Spine_3':'Torso3',
 'tripo::Spine_4':'Neck1','tripo::Spine_5':'Neck3','tripo::Head_0':'Head',
 'bone_11':'FrontUpperLeg.L','bone_12':'FrontLowerLeg.L','bone_13':'FrontLowerLeg.L_end',
 'bone_14':'FrontUpperLeg.R','bone_15':'FrontLowerLeg.R','bone_16':'FrontLowerLeg.R','bone_17':'FrontLowerLeg.R_end','bone_18':'FrontLowerLeg.R_end',
 'bone_24':'BackLeg.L','bone_25':'BackUpperLeg.L','bone_26':'BackLowerLeg.L','bone_27':'BackLowerLeg.L_end',
 'bone_3':'BackLeg.R','bone_4':'BackUpperLeg.R','bone_5':'BackLowerLeg.R','bone_6':'BackLowerLeg.R_end',
}
RMAP={ # rider bone -> mixamo bone (clip is MIRRORED: rider left arm takes the clip's right arm = the fist-shaking one)
 'R_Hips':'mixamorig:Hips','R_Spine':'mixamorig:Spine','R_Spine1':'mixamorig:Spine1','R_Spine2':'mixamorig:Spine2','R_Neck':'mixamorig:Neck','R_Head':'mixamorig:Head',
 'R_LShoulder':'mixamorig:RightShoulder','R_LArm':'mixamorig:RightArm','R_LForeArm':'mixamorig:RightForeArm','R_LHand':'mixamorig:RightHand',
 # right arm (reins) stays at rest
}
qa,qnew=import_fbx(QW,"SRC_WOLF")
acts=[a for a in bpy.data.actions if a.name.lower().endswith("attack")]
print("WOLF actions", [a.name for a in bpy.data.actions][:20], "->", [a.name for a in acts])
wolf_s=sample(qa,acts[0],[1+i for i in range(NF)],list(WMAP.values()),'Body')
sa,snew=import_fbx(SA,"SRC_RIDER")
sact=[a for a in bpy.data.actions if "mixamo" in a.name.lower()][0]
rider_s=sample(sa,sact,[1+i*(104/(NF-1)) for i in range(NF)],list(RMAP.values()),'mixamorig:Hips')
for o in qnew+snew: bpy.data.objects.remove(o,do_unlink=True)

# ---------- 4. retarget ----------
YAW=Matrix.Rotation(math.radians(90),3,'Z'); SX=Matrix.Diagonal((-1,1,1))
def delta(q,q0,mirror):
    D=q.to_matrix()@q0.to_matrix().transposed()
    if mirror: D=SX@D@SX
    return YAW@D@YAW.transposed()
def order():
    out=[]
    def rec(b):
        out.append(b); [rec(c) for c in b.children]
    [rec(b) for b in arm.data.bones if b.parent is None]; return out
BO=order(); Mw3=Mw.to_3x3().normalized(); expect={}
prevq={}
for i in range(NF):
    F=i+1; posemat={}
    for b in BO:
        pb=arm.pose.bones[b.name]; rest=b.matrix_local
        chain=(posemat[b.parent.name]@b.parent.matrix_local.inverted()@rest) if b.parent else rest.copy()
        if b.name in WMAP: src,samp,mir,scale,root=WMAP[b.name],wolf_s,False,WSCALE,b.name=='tripo::Root'
        elif b.name in RMAP: src,samp,mir,scale,root=RMAP[b.name],rider_s,True,RSCALE,b.name=='R_Hips'
        else: src=None
        if src is None or src not in samp[i][0]:
            D=chain.copy(); basis=Matrix.Identity(4)
        else:
            Dw=delta(samp[i][0][src],samp[0][0][src],mir)
            Rdes=Dw@(Mw3@rest.to_3x3().normalized())
            D=Matrix.Translation(chain.translation)@(Mw3.transposed()@Rdes).to_4x4()
            if root:
                t=samp[i][1]-samp[0][1]
                if mir: t=SX@t
                D.translation=D.translation+Mw3.transposed()@(YAW@t)*scale
            basis=chain.inverted()@D
            expect[(F,b.name)]=Rdes
        posemat[b.name]=D
        pb.rotation_mode='QUATERNION'; q=basis.to_quaternion()
        if b.name in prevq and q.dot(prevq[b.name])<0: q=-q
        prevq[b.name]=q; pb.rotation_quaternion=q; pb.keyframe_insert('rotation_quaternion',frame=F)
        if src is not None and root: pb.location=basis.translation; pb.keyframe_insert('location',frame=F)
sc.frame_start=1; sc.frame_end=NF
# verify
err=0; worst=None
for F in (1,11,21,31,41):
    sc.frame_set(F); bpy.context.view_layer.update()
    for (f,n),R in expect.items():
        if f!=F: continue
        got=(arm.matrix_world@arm.pose.bones[n].matrix).to_3x3().normalized()
        a=math.degrees((got@R.transposed()).to_quaternion().angle)
        if a>err: err=a; worst=(F,n)
print("VERIFY max rot err deg %.3f at %s"%(err,worst))
for F in (1,11,16,21,31,41):
    sc.frame_set(F); bpy.context.view_layer.update(); W=arm.matrix_world
    print("F%2d"%F, " ".join("%s=(%.2f,%.2f,%.2f)"%(k,*(W@arm.pose.bones[n].head)) for k,n in (("root","tripo::Root"),("head","tripo::Head_0"),("hips","R_Hips"),("Lhand","R_LHand"),("Rhand","R_RHand"),("rhead","R_Head"))))

# ---------- 4b. cut fused bridge faces ----------
# Tripo fused spear shaft, fist and wolf mane into one surface; faces that span rider- and wolf-driven verts
# stretch into planks when the arm lifts. Cut every face with an edge that stretches >2.5x rest (and >5 cm) in any frame.
rest=[v.co.copy() for v in me.vertices]
badE=set()
for F in range(sc.frame_start,sc.frame_end+1):
    sc.frame_set(F); dg=bpy.context.evaluated_depsgraph_get(); ev=ob.evaluated_get(dg).data
    for e in me.edges:
        a,b=e.vertices; r=(rest[a]-rest[b]).length; c=(ev.vertices[a].co-ev.vertices[b].co).length
        if c>0.05 and c>2.5*max(r,1e-4): badE.add(e.index)
import bmesh
bm=bmesh.new(); bm.from_mesh(me); bm.edges.ensure_lookup_table()
badF=set(f for ei in badE for f in bm.edges[ei].link_faces)
bz=[v.co.z for f in badF for v in f.verts]
print("CUT faces", len(badF), "of", len(bm.faces), "z %.2f..%.2f"%(min(bz),max(bz)) if bz else "")
bmesh.ops.delete(bm, geom=list(badF), context='FACES_ONLY')
# drop small face patches left floating by the cut (blended-weight slivers between arm and chest)
bm.faces.ensure_lookup_table(); _seen={}; _patches=[]
for _f0 in bm.faces:
    if _f0.index in _seen: continue
    _st=[_f0]; _seen[_f0.index]=1; _c=[]
    while _st:
        _f=_st.pop(); _c.append(_f)
        for _e in _f.edges:
            for _g in _e.link_faces:
                if _g.index not in _seen: _seen[_g.index]=1; _st.append(_g)
    _patches.append(_c)
_small=[f for c in _patches if len(c)<80 for f in c]
print("PATCHES", len(_patches), "dropped small faces", len(_small))
if _small: bmesh.ops.delete(bm, geom=_small, context='FACES_ONLY')
bm.to_mesh(me); bm.free(); me.update()

# ---------- 5. debug weight render (vertex colors) ----------
cols={n:((i*0.37)%1.0,0.5+0.5*((i*0.61)%1.0),0.9) for i,n in enumerate(RB)}
ca=me.color_attributes.new(name="dbg",type='BYTE_COLOR',domain='POINT')
for i in range(len(me.vertices)):
    if i in assign:
        n=assign[i]; h,s,v=cols[n]; r,g,b=colorsys.hsv_to_rgb(h,s,v)
        if i in spear: r,g,b=1,1,1
    else: r,g,b=0.35,0.35,0.35
    ca.data[i].color=(r,g,b,1)
sc.render.engine="BLENDER_WORKBENCH"; sc.display.shading.light="FLAT"; sc.display.shading.color_type="VERTEX"
sc.render.resolution_x=sc.render.resolution_y=600; sc.render.film_transparent=False
cam=bpy.data.objects.new("dbgcam",bpy.data.cameras.new("dbgcam")); sc.collection.objects.link(cam); sc.camera=cam; cam.data.type="ORTHO"; cam.data.ortho_scale=1.1
c=Vector((0,0,0.4))
for name,ang in (("L",0),("R",180)):
    r=math.radians(ang); cam.location=c+Vector((-5*math.sin(r),5*math.cos(r),0)); cam.rotation_euler=Euler((math.pi/2,0,math.pi-r))
    sc.frame_set(1); sc.render.filepath=f"{DBG}_w{name}.png"; bpy.ops.render.render(write_still=True)
me.color_attributes.remove(ca); bpy.data.objects.remove(cam,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("SAVED",OUT)
