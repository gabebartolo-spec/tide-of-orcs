# Cloth stretched to an arm that rested on the hip in the Tripo pose: the weights jump from arm to body across a few
# edges, so those edges tear when the arm pulls back. Smooth all weights (Blender's own Smooth Vertex Weights) only in
# the box where the forearm/hand touched the hip, then normalise. Args: in.blend out.blend
# Env: BOX=x0,x1,y0,y1,z0,z1 (world, bind pose), FAC (0.5), REP (5)
import bpy, sys, os
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
body = max((o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith("wpn_")), key=lambda o: len(o.data.vertices))
x0, x1, y0, y1, z0, z1 = map(float, os.environ.get("BOX", "-0.30,-0.04,-0.25,0.15,0.25,0.56").split(","))
M = body.matrix_world; n = 0
for v in body.data.vertices:
    p = M @ v.co; v.select = x0 < p.x < x1 and y0 < p.y < y1 and z0 < p.z < z1; n += v.select
bpy.context.view_layer.objects.active = body; body.select_set(True)
bpy.ops.object.mode_set(mode="WEIGHT_PAINT"); body.data.use_paint_mask_vertex = True
bpy.ops.object.vertex_group_smooth(group_select_mode="ALL", factor=float(os.environ.get("FAC", "0.5")), repeat=int(os.environ.get("REP", "5")))
bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
bpy.ops.object.mode_set(mode="OBJECT"); print("SMOOTHED", n, "verts")
bpy.ops.wm.save_as_mainfile(filepath=a[1])
