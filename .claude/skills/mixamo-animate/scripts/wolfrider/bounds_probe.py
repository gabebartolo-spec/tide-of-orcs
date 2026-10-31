# bounds_probe.py <blend> : armature origin + evaluated-mesh world bbox per even frame (to pick the sheet ORTHO and anchor)
import bpy, sys
from mathutils import Vector
a=sys.argv[sys.argv.index("--")+1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
sc=bpy.context.scene
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
print("ARM", arm.name, tuple(round(v,3) for v in arm.matrix_world.translation), "frames", sc.frame_start, sc.frame_end)
dg=bpy.context.evaluated_depsgraph_get()
for F in range(sc.frame_start, sc.frame_end+1, 2):
    sc.frame_set(F); dg=bpy.context.evaluated_depsgraph_get()
    lo=Vector((1e9,)*3); hi=Vector((-1e9,)*3)
    for o in sc.objects:
        if o.type!='MESH' or o.hide_render: continue
        ev=o.evaluated_get(dg); M=ev.matrix_world
        for v in ev.data.vertices:
            w=M@v.co
            for k in range(3): lo[k]=min(lo[k],w[k]); hi[k]=max(hi[k],w[k])
    print("BB", F-sc.frame_start, "x %.3f..%.3f y %.3f..%.3f z %.3f..%.3f"%(lo.x,hi.x,lo.y,hi.y,lo.z,hi.z))
