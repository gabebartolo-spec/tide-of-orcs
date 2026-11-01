import bpy, sys, math, os
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
glb, outdir, tag = argv[0], argv[1], argv[2]
keep_tex = len(argv) > 3 and argv[3] == 'tex'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
tris = 0
for o in meshes:
    o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    for p in o.data.polygons: p.use_smooth = False
    if not keep_tex:
        mat = bpy.data.materials.new('flat'); mat.diffuse_color = (0.75, 0.70, 0.60, 1)
        o.data.materials.clear(); o.data.materials.append(mat)
# bounds
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
ctr = (lo + hi) / 2; size = max(hi - lo) * 1.15
print('TRIS', tris, 'DIMS', tuple(round(v, 3) for v in (hi - lo)), 'OBJECTS', len(meshes))
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'TEXTURE' if keep_tex else 'MATERIAL'
sc.display.shading.show_shadows = False; sc.display.shading.show_cavity = True
sc.render.resolution_x = sc.render.resolution_y = 512
sc.render.film_transparent = False
sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.9, 0.88, 0.82)
cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = size
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
views = {'front': (0, -1, 0, math.radians(90)), 'side': (1, 0, 0, math.radians(90)), 'top': (0, 0, 1, 0), 'game': (0, -math.cos(math.radians(20)), math.sin(math.radians(20)), math.radians(70))}
for name, (x, y, z, tilt) in views.items():
    d = Vector((x, y, z)).normalized()
    co.location = ctr + d * size * 3
    co.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(outdir, f'{tag}_{name}.png')
    bpy.ops.render.render(write_still=True)
    print('WROTE', sc.render.filepath)
