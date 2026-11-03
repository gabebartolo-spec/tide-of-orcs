import bpy
from mathutils import Vector
arm=bpy.data.objects["Armature"]; sc=bpy.context.scene
print("ARMROT", tuple(arm.rotation_euler), tuple(arm.scale), tuple(arm.location))
print("BONES", len(arm.data.bones), [b.name for b in arm.data.bones if not b.parent])
meshes=[o for o in sc.objects if o.type=='MESH']
for an in ["walking","punch","death","idle"]:
  arm.animation_data.action=bpy.data.actions[an]
  a=bpy.data.actions[an]
  for f in range(int(a.frame_range[0]),int(a.frame_range[1])+1, 8 if an!="idle" else 50):
    sc.frame_set(f); dg=bpy.context.evaluated_depsgraph_get(); lo=Vector((1e9,)*3); hi=-lo
    for o in meshes:
      e=o.evaluated_get(dg); m=e.to_mesh()
      for v in m.vertices:
        w=e.matrix_world@v.co; lo=Vector(map(min,lo,w)); hi=Vector(map(max,hi,w))
      e.to_mesh_clear()
    print(an,f,tuple(round(x,2) for x in lo),tuple(round(x,2) for x in hi))
