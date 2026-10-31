# Cover the spear's mid-haft seam (two mesh islands cut from the posed fist) with a haft-coloured sleeve, parented to the spear.
import bpy,sys,bmesh,numpy as np
from mathutils import Matrix
src,out=sys.argv[-2:]; bpy.ops.wm.open_mainfile(filepath=src)
sp=bpy.data.objects["wpn_spear"]; V=np.array([v.co[:] for v in sp.data.vertices]); y=V[:,1]; L=y.max()-y.min()
r=np.hypot(V[:,0],V[:,2]); band=lambda a,b:(y>y.min()+a*L)&(y<y.min()+b*L)
near=band(0.40,0.70); R=np.median(r[near])*1.15; cx,cz=np.median(V[near][:,0]),np.median(V[near][:,2])
# seam: the y with no vertex nearby inside the haft band -> largest gap in sorted y
ys=np.sort(y[near]); g=np.argmax(np.diff(ys)); ym=(ys[g]+ys[g+1])/2; print("SEAM",(ym-y.min())/L,"GAP",ys[g+1]-ys[g],"R",R)
me=bpy.data.meshes.new("sleeve"); bm=bmesh.new(); bmesh.ops.create_cone(bm,cap_ends=True,segments=12,radius1=R,radius2=R,depth=0.06); bm.to_mesh(me); bm.free()
sl=bpy.data.objects.new("wpn_sleeve",me); bpy.context.scene.collection.objects.link(sl)
f=next(p for p in sp.data.polygons if band(0.45,0.5)[p.vertices[0]]); me.materials.append(sp.data.materials[f.material_index]); [setattr(p,"use_smooth",True) for p in me.polygons]
uv=sp.data.uv_layers.active.data; loops=[l for p in sp.data.polygons if band(0.45,0.5)[p.vertices[0]] for l in p.loop_indices]; u=np.median([uv[i].uv[:] for i in loops],0)
me.uv_layers.new(); [setattr(d,"uv",u) for d in me.uv_layers[0].data]
sl.parent=sp; sl.matrix_parent_inverse=Matrix.Identity(4); sl.matrix_basis=Matrix.Translation((cx,ym,cz))@Matrix.Rotation(1.5708,4,"X")
bpy.ops.wm.save_as_mainfile(filepath=out)
