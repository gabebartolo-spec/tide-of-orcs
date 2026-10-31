"""Rig a full-detail mesh from a Mixamo-rigged low-poly copy of it.
Args: <rigged_lowpoly.fbx> <full.blend> <out.blend>
The low-poly copy only donates the armature and skin weights (nearest face, interpolated);
the full mesh keeps its own UVs and texture, so a baked face survives untouched."""
import bpy, sys, os
a = sys.argv[sys.argv.index("--") + 1:]
rig_fbx, full_blend, out = a
bpy.ops.wm.open_mainfile(filepath=full_blend)
full = [o for o in bpy.data.objects if o.type == "MESH"][0]
for o in list(bpy.data.objects):
    if o is not full: bpy.data.objects.remove(o)
bpy.ops.import_scene.fbx(filepath=rig_fbx, use_image_search=False)
arm = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
low = [o for o in bpy.data.objects if o.type == "MESH" and o is not full][0]
# Mixamo may return a different scale/orientation: match the full mesh onto the low one by bounds
bpy.context.view_layer.update()
def bounds(o):
    W = [o.matrix_world @ v.co for v in o.data.vertices]
    return [min(p[i] for p in W) for i in range(3)], [max(p[i] for p in W) for i in range(3)]
lo0, lo1 = bounds(low); fu0, fu1 = bounds(full)
print("LOW", lo0, lo1, "FULL", fu0, fu1)
for g in low.vertex_groups:
    full.vertex_groups.new(name=g.name)
dt = full.modifiers.new("dt", "DATA_TRANSFER")
dt.object = low; dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}
dt.vert_mapping = "POLYINTERP_NEAREST"
dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
bpy.context.view_layer.objects.active = full
bpy.ops.object.modifier_apply(modifier="dt")
full.parent = arm; full.matrix_parent_inverse = arm.matrix_world.inverted()
am = full.modifiers.new("Armature", "ARMATURE"); am.object = arm
bpy.data.objects.remove(low)
print("GROUPS", len(full.vertex_groups), "VERTS", len(full.data.vertices))
bpy.ops.wm.save_as_mainfile(filepath=out)
