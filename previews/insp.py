import bpy, sys
bpy.ops.wm.open_mainfile(filepath=sys.argv[sys.argv.index("--")+1])
for o in bpy.data.objects:
    bb=[o.matrix_world@__import__('mathutils').Vector(c) for c in o.bound_box] if o.type=='MESH' else []
    mn=[round(min(v[i] for v in bb),3) for i in range(3)] if bb else None
    mx=[round(max(v[i] for v in bb),3) for i in range(3)] if bb else None
    print("OBJ",o.name,o.type,"parent",o.parent.name if o.parent else None,o.parent_type,o.parent_bone,"loc",tuple(round(x,3) for x in o.location),"rot",tuple(round(x,3) for x in o.rotation_euler),"scl",tuple(round(x,3) for x in o.scale),"bb",mn,mx, "verts",len(o.data.vertices) if o.type=='MESH' else '')
